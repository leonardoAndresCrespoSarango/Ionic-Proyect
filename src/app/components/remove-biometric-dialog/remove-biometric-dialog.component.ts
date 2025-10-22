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
  templateUrl: './remove-biometric-dialog.component.html',
  styleUrls: ['./remove-biometric-dialog.component.scss']
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
