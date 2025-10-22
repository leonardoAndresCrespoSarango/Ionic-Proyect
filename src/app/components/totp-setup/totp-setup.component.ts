import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonItem,
  IonLabel,
  IonInput,
  IonList,
  ToastController,
  AlertController,
  LoadingController,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  shieldCheckmark,
  addCircle,
  closeCircle,
  copy,
  checkmarkCircle,
  logoGoogle,
  logoMicrosoft,
  shield,
  close
} from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-totp-setup',
  templateUrl: './totp-setup.component.html',
  styleUrls: ['./totp-setup.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonItem,
    IonLabel,
    IonInput,
    IonList
  ]
})
export class TotpSetupComponent implements OnInit {
  private authService = inject(AuthService);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private loadingCtrl = inject(LoadingController);
  private modalCtrl = inject(ModalController);

  totpEnabled: boolean = false;

  // Datos de configuración
  qrCodeDataUri: string = '';
  secretKey: string = '';
  verificationCode: string = '';

  // Etapas del proceso
  isConfiguringTotp: boolean = false;

  constructor() {
    addIcons({
      shieldCheckmark,
      addCircle,
      closeCircle,
      copy,
      checkmarkCircle,
      logoGoogle,
      logoMicrosoft,
      shield,
      close
    });
  }

  async ngOnInit() {
    await this.loadTotpStatus();
  }

  /**
   * Cargar estado TOTP del usuario
   */
  async loadTotpStatus() {
    try {
      const user = this.authService.getCurrentUser();
      if (user) {
        this.totpEnabled = user.totpEnabled || false;
      }
    } catch (error) {
      console.error('Error cargando estado TOTP:', error);
    }
  }

  /**
   * Iniciar configuración de TOTP
   */
  async startTotpSetup() {
    const loading = await this.loadingCtrl.create({
      message: 'Generando código QR...'
    });
    await loading.present();

    try {
      const response = await this.authService.setupTotp();

      this.qrCodeDataUri = response.qrCodeDataUri;
      this.secretKey = response.secret;
      this.isConfiguringTotp = true;

      await loading.dismiss();
      await this.showToast('Escanea el código QR con tu aplicación de autenticación', 'success');
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error iniciando configuración TOTP:', error);
      await this.showToast('Error al generar código QR', 'danger');
    }
  }

  /**
   * Verificar y habilitar TOTP
   */
  async verifyAndEnableTotp() {
    if (!this.verificationCode || this.verificationCode.length !== 6) {
      await this.showToast('Por favor ingresa un código de 6 dígitos', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Verificando código...'
    });
    await loading.present();

    try {
      const response = await this.authService.verifyAndEnableTotp(this.verificationCode);

      if (response.success) {
        this.totpEnabled = true;
        this.isConfiguringTotp = false;
        this.verificationCode = '';
        this.qrCodeDataUri = '';
        this.secretKey = '';

        await loading.dismiss();
        await this.showToast('¡Autenticación de dos factores habilitada exitosamente!', 'success');
      } else {
        await loading.dismiss();
        await this.showToast('Código inválido, intenta nuevamente', 'danger');
      }
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error verificando código TOTP:', error);
      const message = error?.error?.message || 'Código TOTP inválido';
      await this.showToast(message, 'danger');
    }
  }

  /**
   * Cancelar configuración
   */
  cancelSetup() {
    this.isConfiguringTotp = false;
    this.verificationCode = '';
    this.qrCodeDataUri = '';
    this.secretKey = '';
  }

  /**
   * Deshabilitar TOTP
   */
  async disableTotp() {
    const alert = await this.alertCtrl.create({
      header: 'Deshabilitar Autenticación de Dos Factores',
      message: 'Para deshabilitar TOTP, ingresa el código actual de tu aplicación de autenticación.',
      inputs: [
        {
          name: 'code',
          type: 'text',
          placeholder: '000000',
          attributes: {
            maxlength: 6,
            inputmode: 'numeric'
          }
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Deshabilitar',
          handler: async (data) => {
            if (!data.code || data.code.length !== 6) {
              await this.showToast('Por favor ingresa un código de 6 dígitos', 'warning');
              return false;
            }
            await this.performDisableTotp(data.code);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Realizar deshabilitación de TOTP
   */
  private async performDisableTotp(code: string) {
    const loading = await this.loadingCtrl.create({
      message: 'Deshabilitando TOTP...'
    });
    await loading.present();

    try {
      const response = await this.authService.disableTotp(code);

      if (response.success) {
        this.totpEnabled = false;
        await loading.dismiss();
        await this.showToast('Autenticación de dos factores deshabilitada', 'success');
      } else {
        await loading.dismiss();
        await this.showToast('Código inválido', 'danger');
      }
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error deshabilitando TOTP:', error);
      const message = error?.error?.message || 'Error al deshabilitar TOTP';
      await this.showToast(message, 'danger');
    }
  }

  /**
   * Copiar secreto al portapapeles
   */
  async copySecret() {
    try {
      await navigator.clipboard.writeText(this.secretKey);
      await this.showToast('Clave secreta copiada al portapapeles', 'success');
    } catch (error) {
      console.error('Error copiando al portapapeles:', error);
      await this.showToast('No se pudo copiar al portapapeles', 'danger');
    }
  }

  /**
   * Cerrar modal
   */
  closeModal() {
    this.modalCtrl.dismiss();
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  // Formato automático del código
  onCodeInput(event: any) {
    this.verificationCode = event.target.value.replace(/\D/g, '').substring(0, 6);
  }
}

