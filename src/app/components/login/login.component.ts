import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BiometricService } from '../../services/biometric.service';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonText,
  IonSpinner,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { fingerPrint } from 'ionicons/icons';
import { BiometricSetupDialogComponent } from '../biometric-setup-dialog/biometric-setup-dialog.component';
import { TotpVerificationComponent } from '../totp-verification/totp-verification.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonText,
    IonSpinner,
    BiometricSetupDialogComponent
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  @ViewChild(BiometricSetupDialogComponent) biometricDialog!: BiometricSetupDialogComponent;

  // Usar inject() en lugar de constructor injection
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private modalCtrl = inject(ModalController);
  private biometricService = inject(BiometricService);
  private router = inject(Router);

  loginForm: FormGroup;
  loading = false;
  errorMessage = '';

  // Propiedades para biometría integrada
  biometricState = {
    deviceAvailable: false,
    backendEnabled: false,
    hasStoredCredentials: false,
    canSaveCredentials: false,
    canUseForLogin: false
  };

  // Propiedades para el diálogo
  showBiometricDialog = false;
  pendingCredentials: { email: string; password: string } | null = null;

  constructor() {
    // Registrar iconos necesarios
    addIcons({ fingerPrint });

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  async ngOnInit() {
    await this.updateBiometricState();
  }

  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }

  /**
   * Actualizar estado biométrico completo
   */
  async updateBiometricState() {
    try {
      console.log(' Actualizando estado biométrico...');

      // Usar métodos que realmente existen en el BiometricService
      const deviceAvailable = await this.biometricService.isBiometricAvailable();
      const hasStoredCredentials = await this.biometricService.hasStoredCredentials();

      this.biometricState = {
        deviceAvailable,
        backendEnabled: false, // Se actualizará con integración backend
        hasStoredCredentials,
        canSaveCredentials: deviceAvailable && !hasStoredCredentials,
        canUseForLogin: deviceAvailable && hasStoredCredentials
      };

      console.log('📊 Estado actual:', {
        dispositivo: this.biometricState.deviceAvailable ? '✅' : '❌',
        backend: this.biometricState.backendEnabled ? '✅' : '❌',
        credenciales: this.biometricState.hasStoredCredentials ? '✅' : '❌',
        puedeGuardar: this.biometricState.canSaveCredentials ? '✅' : '❌',
        puedeUsar: this.biometricState.canUseForLogin ? '✅' : '❌'
      });
    } catch (error) {
      console.error(' Error actualizando estado biométrico:', error);
    }
  }

  /**
   * Login tradicional con email y contraseña
   */
  async onSubmit() {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.errorMessage = '';

    try {
      const loginData = this.loginForm.value;
      console.log(' Intentando login tradicional...');

      // Hacer login
      const response = await this.authService.login(loginData).toPromise();

      // Verificar si requiere TOTP
      if (response && response.totpRequired && response.tempSessionId) {
        console.log(' TOTP requerido, abriendo modal de verificación...');
        this.loading = false;

        // Abrir modal de verificación TOTP
        const modal = await this.modalCtrl.create({
          component: TotpVerificationComponent,
          componentProps: {
            tempSessionId: response.tempSessionId
          },
          backdropDismiss: false
        });

        await modal.present();

        const { data } = await modal.onWillDismiss();

        if (data && data.success) {
          console.log(' Verificación TOTP exitosa');
          // Actualizar estado biométrico
          await this.updateBiometricState();

          // Verificar si debe mostrar el diálogo biométrico
          if (this.biometricState.canSaveCredentials) {
            console.log(' Mostrando diálogo de configuración biométrica...');
            this.pendingCredentials = {
              email: loginData.email,
              password: loginData.password
            };
            this.showBiometricDialog = true;
          } else {
            console.log(' Redirigiendo al dashboard...');
            this.router.navigate(['/dashboard']);
          }
        } else {
          this.errorMessage = 'Verificación TOTP cancelada';
        }
        return;
      }

      console.log(' Login exitoso sin TOTP');

      // Actualizar estado biométrico
      await this.updateBiometricState();

      // Verificar si debe mostrar el diálogo biométrico
      if (this.biometricState.canSaveCredentials) {
        console.log(' Mostrando diálogo de configuración biométrica...');
        this.pendingCredentials = {
          email: loginData.email,
          password: loginData.password
        };
        this.showBiometricDialog = true;
      } else {
        console.log(' Redirigiendo al dashboard...');
        this.router.navigate(['/dashboard']);
      }

    } catch (error: any) {
      console.error(' Error en login:', error);
      this.errorMessage = error.error?.message || 'Credenciales inválidas';
    } finally {
      this.loading = false;
    }
  }

  /**
   * Login con biometría integrado
   */
  async loginWithBiometric() {
    if (!this.biometricState.canUseForLogin) {
      this.errorMessage = 'Login biométrico no disponible';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      console.log(' Iniciando login biométrico integrado...');

      // Obtener credenciales con verificación biométrica
      const credentials = await this.biometricService.getCredentialsWithBiometric();

      if (!credentials) {
        this.errorMessage = 'No se encontraron credenciales guardadas';
        this.loading = false;
        return;
      }

      console.log(' Haciendo login con credenciales biométricas...');

      // Hacer login con las credenciales obtenidas
      const response = await this.authService.login(credentials).toPromise();

      // Verificar si requiere TOTP
      if (response && response.totpRequired && response.tempSessionId) {
        console.log(' TOTP requerido después de biometría, abriendo modal...');
        this.loading = false;

        // Abrir modal de verificación TOTP
        const modal = await this.modalCtrl.create({
          component: TotpVerificationComponent,
          componentProps: {
            tempSessionId: response.tempSessionId
          },
          backdropDismiss: false
        });

        await modal.present();

        const { data } = await modal.onWillDismiss();

        if (data && data.success) {
          console.log(' Verificación TOTP exitosa después de biometría');
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = 'Verificación TOTP cancelada';
        }
        return;
      }

      console.log(' Login biométrico integrado exitoso');
      this.router.navigate(['/dashboard']);

    } catch (error: any) {
      console.error(' Error en login biométrico:', error);

      // Manejar errores específicos
      if (error.message && error.message.includes('User canceled')) {
        this.errorMessage = 'Autenticación cancelada por el usuario';
      } else if (error.message && error.message.includes('Too many attempts')) {
        this.errorMessage = 'Demasiados intentos fallidos';
      } else if (error.message && error.message.includes('deshabilitada en el servidor')) {
        this.errorMessage = 'Biometría deshabilitada en el servidor';
        // Actualizar estado
        await this.updateBiometricState();
      } else {
        this.errorMessage = 'Error en autenticación biométrica';
      }
    } finally {
      this.loading = false;
    }
  }

  /**
   * Callback cuando se activa la biometría desde el diálogo
   */
  async onBiometricActivated() {
    console.log(' Biometría activada desde diálogo');
    this.showBiometricDialog = false;
    await this.updateBiometricState();
    this.router.navigate(['/dashboard']);
  }

  /**
   * Callback cuando se cierra el diálogo sin activar
   */
  onBiometricDialogDismissed() {
    console.log(' Diálogo de biometría cerrado');
    this.showBiometricDialog = false;
    this.pendingCredentials = null;
    this.router.navigate(['/dashboard']);
  }
}

