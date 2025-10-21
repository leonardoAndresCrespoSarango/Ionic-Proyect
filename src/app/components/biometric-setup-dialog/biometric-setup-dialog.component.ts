import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertController } from '@ionic/angular/standalone';
import { BiometricService } from '../../services/biometric.service';

@Component({
  selector: 'app-biometric-setup-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `<!-- Diálogo manejado programáticamente con AlertController -->`,
  styles: []
})
export class BiometricSetupDialogComponent {
  private biometricService = inject(BiometricService);
  private alertController = inject(AlertController);

  @Input() set isOpen(value: boolean) {
    if (value && !this._isShowing) {
      this.presentAlert();
    }
  }

  @Input() userCredentials: { email: string; password: string } | null = null;
  @Output() biometricActivated = new EventEmitter<void>();
  @Output() dialogDismissed = new EventEmitter<void>();

  private _isShowing = false;

  async presentAlert() {
    if (this._isShowing) return;
    this._isShowing = true;

    const alert = await this.alertController.create({
      header: '🔐 Inicio Rápido',
      subHeader: '¿Activar autenticación biométrica?',
      message: `
        <div style="text-align: center; padding: 10px;">
          <div style="font-size: 3rem; margin-bottom: 15px;">👆</div>
          <p>Usa tu huella dactilar para acceder de forma rápida y segura sin necesidad de ingresar tu contraseña.</p>
          <div style="margin-top: 15px;">
            <p><strong>✓ Acceso instantáneo</strong></p>
            <p><strong>✓ Mayor seguridad</strong></p>
            <p><strong>✓ Sin contraseñas</strong></p>
          </div>
        </div>
      `,
      buttons: [
        {
          text: 'Tal vez después',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            this.onSkip();
          }
        },
        {
          text: '👆 Sí, Activar',
          cssClass: 'primary',
          handler: () => {
            this.onActivate();
          }
        }
      ],
      cssClass: 'biometric-alert'
    });

    await alert.present();
  }

  async onActivate() {
    if (!this.userCredentials) {
      console.error('❌ No se encontraron credenciales para configurar biometría');
      this.onDismiss();
      return;
    }

    try {
      console.log('🔐 Activando biometría desde diálogo...');

      // Usar enableBiometrics que guarda localmente Y actualiza el backend
      await this.biometricService.enableBiometrics(
        this.userCredentials.email,
        this.userCredentials.password
      );

      console.log('✅ Biometría activada exitosamente desde diálogo (local + backend)');
      this.biometricActivated.emit();
      this.onDismiss();

    } catch (error: any) {
      console.error('❌ Error activando biometría desde diálogo:', error);

      // Mostrar error al usuario
      const errorAlert = await this.alertController.create({
        header: 'Error',
        message: error.message?.includes('User canceled')
          ? 'Autenticación cancelada por el usuario'
          : 'Error al configurar la biometría. Inténtalo de nuevo.',
        buttons: ['OK']
      });
      await errorAlert.present();
      this.onDismiss();
    }
  }

  onSkip() {
    console.log('ℹ️ Usuario omitió configuración biométrica');
    this.dialogDismissed.emit();
    this.onDismiss();
  }

  private onDismiss() {
    this._isShowing = false;
    this.dialogDismissed.emit();
  }
}
