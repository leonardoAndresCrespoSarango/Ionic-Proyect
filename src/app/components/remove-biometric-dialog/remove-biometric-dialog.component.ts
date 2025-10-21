import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonText,
  IonIcon,
  IonButtons
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { warning, fingerPrint, close, trash } from 'ionicons/icons';

@Component({
  selector: 'app-remove-biometric-dialog',
  standalone: true,
  imports: [
    CommonModule,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonText,
    IonIcon,
    IonButtons
  ],
  template: `
    <ion-modal [isOpen]="isOpen" (didDismiss)="onCancel()">
      <ion-header>
        <ion-toolbar color="danger">
          <ion-title>Eliminar Huella</ion-title>
          <ion-buttons slot="end">
            <ion-button fill="clear" (click)="onCancel()">
              <ion-icon name="close"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="dialog-content">
        <div class="content-container">
          <div class="icon-section">
            <ion-icon name="warning" class="warning-icon"></ion-icon>
          </div>

          <div class="text-section">
            <h2>¿Eliminar Huella Dactilar?</h2>
            <p>
              Esta acción eliminará tu huella dactilar guardada y desactivará
              el inicio de sesión biométrico.
            </p>

            <div class="consequences">
              <div class="consequence-item">
                <ion-icon name="finger-print" color="danger"></ion-icon>
                <span>Se eliminará tu huella guardada</span>
              </div>
              <div class="consequence-item">
                <ion-icon name="close" color="danger"></ion-icon>
                <span>No podrás usar inicio rápido</span>
              </div>
              <div class="consequence-item">
                <ion-icon name="warning" color="warning"></ion-icon>
                <span>Tendrás que usar email y contraseña</span>
              </div>
            </div>

            <div class="note">
              <ion-text color="medium">
                <p><strong>Nota:</strong> Podrás volver a activar la biometría cuando quieras.</p>
              </ion-text>
            </div>
          </div>

          <div class="actions-section">
            <ion-button
              expand="full"
              color="danger"
              (click)="onConfirm()"
              [disabled]="loading"
              class="remove-btn">
              <ion-icon name="trash" slot="start"></ion-icon>
              {{ loading ? 'Eliminando...' : 'Sí, Eliminar Huella' }}
            </ion-button>

            <ion-button
              expand="full"
              fill="outline"
              color="medium"
              (click)="onCancel()"
              [disabled]="loading"
              class="cancel-btn">
              Cancelar
            </ion-button>
          </div>

          <div *ngIf="errorMessage" class="error-section">
            <ion-text color="danger">
              <p>{{ errorMessage }}</p>
            </ion-text>
          </div>
        </div>
      </ion-content>
    </ion-modal>
  `,
  styles: [`
    .dialog-content {
      --background: #fff;
    }
    .content-container {
      padding: 30px 20px;
      text-align: center;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .icon-section {
      margin-bottom: 25px;
    }
    .warning-icon {
      font-size: 70px;
      color: var(--ion-color-warning);
    }
    .text-section {
      margin-bottom: 30px;
    }
    .text-section h2 {
      margin: 0 0 15px 0;
      color: #333;
      font-size: 1.4rem;
      font-weight: 600;
    }
    .text-section p {
      margin: 0 0 20px 0;
      color: #666;
      line-height: 1.5;
      font-size: 1rem;
    }
    .consequences {
      display: flex;
      flex-direction: column;
      gap: 12px;
      text-align: left;
      max-width: 300px;
      margin: 0 auto 20px auto;
    }
    .consequence-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .consequence-item ion-icon {
      font-size: 18px;
      flex-shrink: 0;
    }
    .consequence-item span {
      color: #555;
      font-size: 0.9rem;
    }
    .note {
      background: rgba(var(--ion-color-medium-rgb), 0.1);
      border-radius: 8px;
      padding: 15px;
      margin-top: 15px;
    }
    .note p {
      margin: 0;
      font-size: 0.85rem;
    }
    .actions-section {
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin-bottom: 20px;
    }
    .remove-btn {
      --border-radius: 12px;
      font-weight: 600;
      height: 50px;
    }
    .cancel-btn {
      --border-radius: 12px;
      height: 45px;
    }
    .error-section {
      background: rgba(var(--ion-color-danger-rgb), 0.1);
      border-radius: 8px;
      padding: 15px;
      margin-top: 15px;
    }
    .error-section p {
      margin: 0;
      font-size: 0.9rem;
    }
  `]
})
export class RemoveBiometricDialogComponent {
  @Input() isOpen = false;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  loading = false;
  errorMessage = '';

  constructor() {
    addIcons({ warning, fingerPrint, close, trash });
  }

  async onConfirm() {
    this.loading = true;
    this.errorMessage = '';

    try {
      // Emitir evento de confirmación
      this.confirmed.emit();
    } catch (error: any) {
      console.error('Error removing biometric:', error);
      this.errorMessage = error.message || 'Error al eliminar la biometría';
    } finally {
      this.loading = false;
    }
  }

  onCancel() {
    this.cancelled.emit();
    this.onDismiss();
  }

  onDismiss() {
    this.isOpen = false;
    this.loading = false;
    this.errorMessage = '';
  }
}
