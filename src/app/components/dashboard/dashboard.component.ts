import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonMenu,
  IonMenuButton,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonMenuToggle,
  IonButtons,
  IonPopover,
  IonText
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { menu, ellipsisVertical, person, fingerPrint, logOut } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { BiometricService } from '../../services/biometric.service';
import { RemoveBiometricDialogComponent } from '../remove-biometric-dialog/remove-biometric-dialog.component';
import { BiometricSetupDialogComponent } from '../biometric-setup-dialog/biometric-setup-dialog.component';
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
    IonMenu,
    IonMenuButton,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonMenuToggle,
    IonButtons,
    IonPopover,
    IonText,
    RemoveBiometricDialogComponent,
    BiometricSetupDialogComponent
  ],
  template: `
    <!-- Sidebar Menu -->
    <ion-menu contentId="main-content" side="start">
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title>ETIKOS</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-list>
          <ion-menu-toggle>
            <ion-item [button]="true">
              <ion-icon name="person" slot="start"></ion-icon>
              <ion-label>Dashboard</ion-label>
            </ion-item>
          </ion-menu-toggle>
          <!-- Agregar más opciones del menú aquí -->
        </ion-list>
      </ion-content>
    </ion-menu>

    <!-- Main Content -->
    <div id="main-content">
      <!-- Header -->
      <ion-header>
        <ion-toolbar color="primary">
          <ion-buttons slot="start">
            <ion-menu-button></ion-menu-button>
          </ion-buttons>

          <ion-title>Dashboard</ion-title>

          <ion-buttons slot="end">
            <!-- User Info -->
            <div class="user-info">
              <ion-text>
                <p class="greeting">{{ greeting }}</p>
                <p class="username">{{ currentUser?.name || 'Usuario' }}</p>
              </ion-text>
            </div>

            <!-- Menu Button -->
            <ion-button fill="clear" id="options-trigger">
              <ion-icon name="ellipsis-vertical"></ion-icon>
            </ion-button>

            <!-- Options Popover -->
            <ion-popover trigger="options-trigger" triggerAction="click">
              <ng-template>
                <ion-content class="popover-content">
                  <ion-list>
                    <ion-item [button]="true" (click)="showRemoveBiometricDialog()" *ngIf="biometricState.hasStoredCredentials">
                      <ion-icon name="finger-print" slot="start" color="danger"></ion-icon>
                      <ion-label color="danger">Eliminar Huella</ion-label>
                    </ion-item>
                    <ion-item [button]="true" (click)="logout()">
                      <ion-icon name="log-out" slot="start"></ion-icon>
                      <ion-label>Cerrar Sesión</ion-label>
                    </ion-item>
                  </ion-list>
                </ion-content>
              </ng-template>
            </ion-popover>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <!-- Dashboard Content -->
      <ion-content class="dashboard-content">
        <div class="content-container">
          <div class="welcome-section">
            <h1>Bienvenido a ETIKOS</h1>
            <p>{{ greeting }}, {{ currentUser?.name }}!</p>
          </div>

          <div class="cards-section">
            <!-- Aquí irán las tarjetas del dashboard -->
            <div class="card">
              <h3>Panel Principal</h3>
              <p>Contenido del dashboard...</p>
            </div>
          </div>
        </div>
      </ion-content>
    </div>

    <!-- Diálogo de eliminación de biometría -->
    <app-remove-biometric-dialog
      [isOpen]="showRemoveDialog"
      (confirmed)="onRemoveBiometricConfirmed()"
      (cancelled)="onRemoveDialogCancelled()">
    </app-remove-biometric-dialog>

    <!-- Diálogo de configuración biométrica -->
    <app-biometric-setup-dialog
      [isOpen]="showBiometricSetupDialog"
      [userCredentials]="pendingCredentials"
      (biometricActivated)="onBiometricActivated()"
      (dialogDismissed)="onBiometricSetupDismissed()">
    </app-biometric-setup-dialog>
  `,
  styles: [`
    .user-info {
      text-align: right;
      margin-right: 10px;
    }
    .user-info p {
      margin: 0;
      font-size: 0.8rem;
      line-height: 1.2;
    }
    .greeting {
      opacity: 0.8;
    }
    .username {
      font-weight: bold;
    }
    .popover-content {
      --width: 200px;
    }
    .dashboard-content {
      --background: #f5f5f5;
    }
    .content-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .welcome-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .welcome-section h1 {
      margin: 0 0 10px 0;
      color: #333;
    }
    .welcome-section p {
      margin: 0;
      color: #666;
    }
    .cards-section {
      display: grid;
      gap: 20px;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .card h3 {
      margin: 0 0 10px 0;
      color: #333;
    }
    .card p {
      margin: 0;
      color: #666;
    }
  `]
})
export class DashboardComponent implements OnInit {
  // Usar inject() en lugar de constructor injection
  private authService = inject(AuthService);
  private biometricService = inject(BiometricService);
  private router = inject(Router);

  currentUser: any = null;
  greeting = '';
  biometricState = {
    hasStoredCredentials: false
  };
  showRemoveDialog = false;

  // Propiedades para el diálogo de configuración biométrica
  showBiometricSetupDialog = false;
  pendingCredentials: { email: string; password: string } | null = null;

  constructor() {
    addIcons({ menu, ellipsisVertical, person, fingerPrint, logOut });
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
      // Usar el método correcto que existe en el servicio
      const hasCredentials = await this.biometricService.hasStoredCredentials();
      this.biometricState = {
        hasStoredCredentials: hasCredentials
      };
    } catch (error) {
      console.error('Error updating biometric state:', error);
    }
  }

  showRemoveBiometricDialog() {
    console.log('Mostrando diálogo de eliminación de biometría');
    this.showRemoveDialog = true;
  }

  async onRemoveBiometricConfirmed() {
    try {
      console.log('🔒 Eliminando biometría desde dashboard...');
      // Usar disableBiometrics que elimina localmente Y actualiza el backend
      await this.biometricService.disableBiometrics();
      await this.updateBiometricState();
      console.log('✅ Biometría eliminada exitosamente (local + backend)');
      this.showRemoveDialog = false;
    } catch (error) {
      console.error('❌ Error eliminando biometría:', error);
    }
  }

  onRemoveDialogCancelled() {
    console.log('ℹ️ Eliminación de biometría cancelada');
    this.showRemoveDialog = false;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  /**
   * Verificar si debe mostrar el diálogo biométrico automáticamente
   */
  async checkForBiometricSetup() {
    try {
      // Verificar si el dispositivo soporta biometría y no tiene credenciales guardadas
      const deviceAvailable = await this.biometricService.isBiometricAvailable();
      const hasCredentials = await this.biometricService.hasStoredCredentials();

      if (deviceAvailable && !hasCredentials) {
        console.log('💡 Usuario puede activar biometría, pero no hay credenciales del último login');
        console.log('ℹ️ El diálogo biométrico se mostrará en el próximo login exitoso');
        // No mostramos el diálogo aquí porque no tenemos las credenciales
        // El diálogo se mostrará en el login después de autenticarse
      }
    } catch (error) {
      console.error('Error checking biometric setup:', error);
    }
  }

  /**
   * Callback cuando se activa la biometría desde el dashboard
   */
  async onBiometricActivated() {
    console.log('✅ Biometría activada desde dashboard');
    this.showBiometricSetupDialog = false;
    await this.updateBiometricState();
  }

  /**
   * Callback cuando se cierra el diálogo sin activar
   */
  onBiometricSetupDismissed() {
    console.log('ℹ️ Diálogo de biometría cerrado desde dashboard');
    this.showBiometricSetupDialog = false;
    this.pendingCredentials = null;
  }
}
