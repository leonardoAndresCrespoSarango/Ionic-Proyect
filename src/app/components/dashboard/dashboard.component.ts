import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonButtons,
  IonPopover,
  IonText,
  PopoverController,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { menu, ellipsisVertical, person, fingerPrint, logOut, chevronBack, chevronForward, peopleOutline, shieldCheckmark } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { BiometricService } from '../../services/biometric.service';
import { RemoveBiometricDialogComponent } from '../remove-biometric-dialog/remove-biometric-dialog.component';
import { BiometricSetupDialogComponent } from '../biometric-setup-dialog/biometric-setup-dialog.component';
import { TotpSetupComponent } from '../totp-setup/totp-setup.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonButtons,
    IonPopover,
    IonText,
    RemoveBiometricDialogComponent,
    BiometricSetupDialogComponent,
    TotpSetupComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  // Usar inject() en lugar de constructor injection
  private authService = inject(AuthService);
  private biometricService = inject(BiometricService);
  private modalController = inject(ModalController);
  private router = inject(Router);
  private popoverController = inject(PopoverController);

  currentUser: any = null;
  greeting = '';
  biometricState = {
    hasStoredCredentials: false
  };
  showRemoveDialog = false;
  sidebarCollapsed = false;

  // Propiedades para el diálogo de configuración biométrica
  showBiometricSetupDialog = false;
  pendingCredentials: { email: string; password: string } | null = null;

  constructor() {
    addIcons({ menu, ellipsisVertical, person, fingerPrint, logOut, chevronBack, chevronForward, peopleOutline, shieldCheckmark });
  }

  async ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.setGreeting();
    await this.updateBiometricState();

    // Verificar si debe mostrar el diálogo biométrico automáticamente
    await this.checkForBiometricSetup();
  }

  setGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) {
      this.greeting = 'Buenos días';
    } else if (hour < 18) {
      this.greeting = 'Buenas tardes';
    } else {
      this.greeting = 'Buenas noches';
    }
  }

  async updateBiometricState() {
    try {
      const hasCredentials = await this.biometricService.hasStoredCredentials();
      this.biometricState = {
        hasStoredCredentials: hasCredentials
      };
    } catch (error) {
      console.error('Error updating biometric state:', error);
    }
  }

  async showRemoveBiometricDialog() {
    console.log('Mostrando diálogo de eliminación de biometría');
    await this.popoverController.dismiss();
    this.showRemoveDialog = true;
  }

  async onRemoveBiometricConfirmed() {
    try {
      console.log(' Eliminando biometría desde dashboard...');
      await this.biometricService.disableBiometrics();
      await this.updateBiometricState();
      console.log(' Biometría eliminada exitosamente (local + backend)');
      this.showRemoveDialog = false;
    } catch (error) {
      console.error(' Error eliminando biometría:', error);
    }
  }

  onRemoveDialogCancelled() {
    console.log('ℹEliminación de biometría cancelada');
    this.showRemoveDialog = false;
  }

  async logout() {
    await this.popoverController.dismiss();
    await this.authService.logout();
    this.router.navigate(['/login']);
  }

  async checkForBiometricSetup() {
    try {
      const deviceAvailable = await this.biometricService.isBiometricAvailable();
      const hasCredentials = await this.biometricService.hasStoredCredentials();

      if (deviceAvailable && !hasCredentials) {
        console.log(' Usuario puede activar biometría, pero no hay credenciales del último login');
        console.log(' El diálogo biométrico se mostrará en el próximo login exitoso');
      }
    } catch (error) {
      console.error('Error checking biometric setup:', error);
    }
  }

  async onBiometricActivated() {
    console.log(' Biometría activada desde dashboard');
    this.showBiometricSetupDialog = false;
    await this.updateBiometricState();
  }

  onBiometricSetupDismissed() {
    console.log(' Diálogo de biometría cerrado desde dashboard');
    this.showBiometricSetupDialog = false;
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  /**
   * Abrir modal de configuración TOTP
   */
  async openTotpSetup() {
    // Si venimos desde el popover, lo cerramos; en otros contextos puede no existir
    try {
      await this.popoverController.dismiss();
    } catch {
      // No hay popover activo, continuar sin bloquear la acción
    }

    const modal = await this.modalController.create({
      component: TotpSetupComponent,
      backdropDismiss: true
    });

    await modal.present();
  }

  /**
   * Navegar al panel de administración de usuarios (solo ADMIN)
   */
  navigateToAdminUsers() {
    if (this.currentUser?.role === 'ADMIN') {
      this.router.navigate(['/admin/users']);
    }
  }
}

