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
  IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { fingerPrint } from 'ionicons/icons';
import { BiometricSetupDialogComponent } from '../biometric-setup-dialog/biometric-setup-dialog.component';

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
  template: `
    <ion-content class="login-content">
      <div class="login-container">
        <div class="logo-section">
          <h1>ETIKOS</h1>
          <p>Iniciar Sesión</p>
        </div>

        <!-- Login biométrico -->
        <div class="biometric-section" *ngIf="biometricState.canUseForLogin">
          <ion-button
            expand="full"
            color="primary"
            (click)="loginWithBiometric()"
            [disabled]="loading"
            class="biometric-btn">
            <ion-icon name="finger-print" slot="start"></ion-icon>
            Iniciar con Huella
          </ion-button>
          <div class="divider">
            <span>o</span>
          </div>
        </div>

        <!-- Login tradicional -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <ion-item>
            <ion-label position="stacked">Email</ion-label>
            <ion-input
              type="email"
              formControlName="email"
              placeholder="Ingresa tu email">
            </ion-input>
          </ion-item>
          <div *ngIf="email?.invalid && email?.touched" class="error-message">
            <ion-text color="danger">Email es requerido</ion-text>
          </div>

          <ion-item>
            <ion-label position="stacked">Contraseña</ion-label>
            <ion-input
              type="password"
              formControlName="password"
              placeholder="Ingresa tu contraseña">
            </ion-input>
          </ion-item>
          <div *ngIf="password?.invalid && password?.touched" class="error-message">
            <ion-text color="danger">Contraseña es requerida</ion-text>
          </div>

          <div *ngIf="errorMessage" class="error-alert">
            <ion-text color="danger">{{ errorMessage }}</ion-text>
          </div>

          <ion-button
            type="submit"
            expand="full"
            [disabled]="loginForm.invalid || loading"
            class="login-btn">
            <ion-spinner *ngIf="loading" name="crescent"></ion-spinner>
            {{ loading ? 'Cargando...' : 'Iniciar Sesión' }}
          </ion-button>
        </form>
      </div>

      <!-- Diálogo de configuración biométrica -->
      <app-biometric-setup-dialog
        [isOpen]="showBiometricDialog"
        [userCredentials]="pendingCredentials"
        (biometricActivated)="onBiometricActivated()"
        (dialogDismissed)="onBiometricDialogDismissed()">
      </app-biometric-setup-dialog>
    </ion-content>
  `,
  styles: [`
    .login-content {
      --background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .login-container {
      max-width: 400px;
      margin: 0 auto;
      padding: 20px;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .logo-section {
      text-align: center;
      margin-bottom: 40px;
    }
    .logo-section h1 {
      color: white;
      font-size: 2.5rem;
      font-weight: bold;
      margin: 0;
    }
    .logo-section p {
      color: rgba(255,255,255,0.8);
      font-size: 1.1rem;
      margin: 5px 0 0 0;
    }
    .biometric-section {
      margin-bottom: 20px;
    }
    .biometric-btn {
      --background: rgba(255,255,255,0.1);
      --border-radius: 12px;
      --color: white;
      margin-bottom: 10px;
    }
    .divider {
      text-align: center;
      position: relative;
      margin: 20px 0;
    }
    .divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: rgba(255,255,255,0.3);
    }
    .divider span {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: rgba(255,255,255,0.8);
      padding: 0 15px;
      position: relative;
    }
    ion-item {
      --background: rgba(255,255,255,0.1);
      --border-radius: 12px;
      --color: white;
      margin-bottom: 15px;
    }
    ion-label {
      --color: rgba(255,255,255,0.9) !important;
    }
    ion-input {
      --color: white !important;
      --placeholder-color: rgba(255,255,255,0.6) !important;
    }
    .error-message {
      margin: -10px 0 15px 15px;
    }
    .error-alert {
      background: rgba(244, 67, 54, 0.1);
      border: 1px solid rgba(244, 67, 54, 0.3);
      border-radius: 8px;
      padding: 10px;
      margin: 15px 0;
      text-align: center;
    }
    .login-btn {
      --background: rgba(255,255,255,0.2);
      --border-radius: 12px;
      --color: white;
      margin-top: 20px;
      font-weight: bold;
    }
    .checkbox-label {
      margin-left: 10px;
      font-size: 0.9rem;
    }
    .additional-options {
      text-align: center;
      margin-top: 20px;
    }
  `]
})
export class LoginComponent implements OnInit {
  @ViewChild(BiometricSetupDialogComponent) biometricDialog!: BiometricSetupDialogComponent;

  // Usar inject() en lugar de constructor injection
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
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
      console.log('🔄 Actualizando estado biométrico...');

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
      console.error('❌ Error actualizando estado biométrico:', error);
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
      console.log('🔐 Intentando login tradicional...');

      // Hacer login
      await this.authService.login(loginData).toPromise();
      console.log('✅ Login exitoso');

      // Actualizar estado biométrico
      await this.updateBiometricState();

      // Verificar si debe mostrar el diálogo biométrico
      if (this.biometricState.canSaveCredentials) {
        console.log('💡 Mostrando diálogo de configuración biométrica...');
        this.pendingCredentials = {
          email: loginData.email,
          password: loginData.password
        };
        this.showBiometricDialog = true;
      } else {
        // Si no puede o no debe mostrar el diálogo, redirigir directamente
        console.log('🚀 Redirigiendo al dashboard...');
        this.router.navigate(['/dashboard']);
      }
      if (this.biometricState.canSaveCredentials) {
        console.log('💡 Mostrando diálogo de configuración biométrica...');
        this.pendingCredentials = {
          email: loginData.email,
          password: loginData.password
        };
        this.showBiometricDialog = true;
      } else {
        // Si no puede o no debe mostrar el diálogo, redirigir directamente
        console.log('🚀 Redirigiendo al dashboard...');
        this.router.navigate(['/dashboard']);
      }

    } catch (error: any) {
      console.error('❌ Error en login:', error);
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
      console.log('👆 Iniciando login biométrico integrado...');

      // Obtener credenciales con verificación biométrica
      const credentials = await this.biometricService.getCredentialsWithBiometric();

      if (!credentials) {
        this.errorMessage = 'No se encontraron credenciales guardadas';
        this.loading = false;
        return;
      }

      console.log('🔐 Haciendo login con credenciales biométricas...');

      // Hacer login con las credenciales obtenidas
      await this.authService.login(credentials).toPromise();

      console.log('✅ Login biométrico integrado exitoso');
      this.router.navigate(['/dashboard']);

    } catch (error: any) {
      console.error('❌ Error en login biométrico:', error);

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
    console.log('✅ Biometría activada desde diálogo');
    this.showBiometricDialog = false;
    await this.updateBiometricState();
    this.router.navigate(['/dashboard']);
  }

  /**
   * Callback cuando se cierra el diálogo sin activar
   */
  onBiometricDialogDismissed() {
    console.log('ℹ️ Diálogo de biometría cerrado');
    this.showBiometricDialog = false;
    this.pendingCredentials = null;
    this.router.navigate(['/dashboard']);
  }
}

