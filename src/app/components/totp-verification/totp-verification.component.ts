import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonInput,
  IonSpinner,
  ModalController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close, shieldCheckmark } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-totp-verification',
  templateUrl: './totp-verification.component.html',
  styleUrls: ['./totp-verification.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    IonItem,
    IonInput,
    IonSpinner
  ]
})
export class TotpVerificationComponent {
  private modalCtrl = inject(ModalController);
  private authService = inject(AuthService);
  private toastCtrl = inject(ToastController);

  totpCode: string = '';
  tempSessionId: string = '';
  isLoading: boolean = false;

  constructor() {
    addIcons({ close, shieldCheckmark });
  }

  async verifyCode() {
    if (!this.totpCode || this.totpCode.length !== 6) {
      await this.showToast('Por favor ingresa un código de 6 dígitos', 'warning');
      return;
    }

    this.isLoading = true;

    try {
      const response = await this.authService.loginWithTotp(this.tempSessionId, this.totpCode);

      if (response.token) {
        await this.showToast('Autenticación exitosa', 'success');
        await this.modalCtrl.dismiss({ success: true });
      } else {
        await this.showToast('Error en la autenticación', 'danger');
      }
    } catch (error: any) {
      console.error('Error verificando código TOTP:', error);
      const message = error?.error?.message || 'Código TOTP inválido';
      await this.showToast(message, 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  cancel() {
    this.modalCtrl.dismiss({ success: false });
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
    this.totpCode = event.target.value.replace(/\D/g, '').substring(0, 6);
  }
}

