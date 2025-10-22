import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonSearchbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonBadge,
  IonChip,
  IonGrid,
  IonRow,
  IonCol,
  IonInput,
  AlertController,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  peopleOutline,
  addCircleOutline,
  createOutline,
  trashOutline,
  lockClosedOutline,
  lockOpenOutline,
  searchOutline,
  refreshOutline,
  keyOutline,
  closeCircle,
  checkmarkCircle,
  shieldCheckmark,
  fingerPrint
} from 'ionicons/icons';
import { AdminService, UpdateCredentialsRequest } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { User, RegisterRequest } from '../../models/user.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonSearchbar,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonBadge,
    IonChip,
    IonGrid,
    IonRow,
    IonCol,
    IonInput],
})
export class AdminUsersComponent implements OnInit {
  private adminService = inject(AdminService);
  private authService = inject(AuthService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  users: User[] = [];
  filteredUsers: User[] = [];
  searchTerm: string = '';
  isLoading: boolean = false;

  // Formularios
  newUserForm: FormGroup;
  editCredentialsForm: FormGroup;

  // Estados
  showNewUserForm: boolean = false;

  constructor() {
    addIcons({
      peopleOutline,
      addCircleOutline,
      createOutline,
      trashOutline,
      lockClosedOutline,
      lockOpenOutline,
      searchOutline,
      refreshOutline,
      keyOutline,
      closeCircle,
      checkmarkCircle,
      shieldCheckmark,
      fingerPrint
    });

    // Inicializar formulario de nuevo usuario
    this.newUserForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      name: ['', Validators.required],
      lastname: ['', Validators.required]
    });

    // Inicializar formulario de edición de credenciales
    this.editCredentialsForm = this.fb.group({
      newEmail: ['', Validators.email],
      newPassword: ['', Validators.minLength(6)]
    });
  }

  async ngOnInit() {
    // Verificar que el usuario actual sea ADMIN
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      await this.showToast('Acceso denegado: Solo administradores', 'danger');
      this.router.navigate(['/dashboard']);
      return;
    }

    await this.loadUsers();
  }

  /**
   * Cargar todos los usuarios
   */
  async loadUsers() {
    this.isLoading = true;
    const loading = await this.loadingCtrl.create({
      message: 'Cargando usuarios...'
    });
    await loading.present();

    try {
      const response = await this.adminService.getAllUsers();
      console.log('📦 Respuesta del backend:', response);
      console.log('📦 Tipo de respuesta:', typeof response);
      console.log('📦 Es array:', Array.isArray(response));

      // Asegurar que siempre sea un array
      if (Array.isArray(response)) {
        this.users = response;
        this.filteredUsers = [...this.users];
        console.log(`✅ ${this.users.length} usuario(s) cargado(s) correctamente`);
        console.log('👥 Usuarios:', this.users);
      } else {
        console.error('❌ La respuesta no es un array:', response);
        this.users = [];
        this.filteredUsers = [];
        await this.showToast('Error: Respuesta inválida del servidor', 'danger');
      }
    } catch (error: any) {
      console.error('❌ Error cargando usuarios:', error);
      this.users = [];
      this.filteredUsers = [];
      const message = error?.error?.message || error?.message || 'Error al cargar usuarios';
      await this.showToast(message, 'danger');
    } finally {
      await loading.dismiss();
      this.isLoading = false;
    }
  }

  /**
   * Filtrar usuarios por búsqueda
   */
  filterUsers(event: any) {
    const searchTerm = event.target.value?.toLowerCase() || '';
    this.searchTerm = searchTerm;

    if (!searchTerm) {
      this.filteredUsers = [...this.users];
      return;
    }

    this.filteredUsers = this.users.filter(user =>
      user.username.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm) ||
      user.name.toLowerCase().includes(searchTerm) ||
      user.lastname.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Mostrar formulario de nuevo usuario
   */
  toggleNewUserForm() {
    this.showNewUserForm = !this.showNewUserForm;
    if (!this.showNewUserForm) {
      this.newUserForm.reset();
    }
  }

  /**
   * Registrar nuevo usuario
   */
  async registerNewUser() {
    if (this.newUserForm.invalid) {
      await this.showToast('Por favor completa todos los campos correctamente', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Registrando usuario...'
    });
    await loading.present();

    try {
      const request: RegisterRequest = this.newUserForm.value;
      await this.adminService.registerUser(request);
      await this.showToast('Usuario registrado exitosamente', 'success');
      this.newUserForm.reset();
      this.showNewUserForm = false;
      await this.loadUsers();
    } catch (error: any) {
      console.error('Error registrando usuario:', error);
      const message = error?.error?.message || 'Error al registrar usuario';
      await this.showToast(message, 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Editar credenciales de usuario
   */
  async editUserCredentials(user: User) {
    const alert = await this.alertCtrl.create({
      header: 'Editar Credenciales',
      subHeader: `Usuario: ${user.username}`,
      inputs: [
        {
          name: 'newEmail',
          type: 'email',
          placeholder: 'Nuevo email (opcional)',
          value: user.email
        },
        {
          name: 'newPassword',
          type: 'password',
          placeholder: 'Nueva contraseña (opcional)',
          attributes: {
            minlength: 6
          }
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Actualizar',
          handler: async (data) => {
            if (!data.newEmail && !data.newPassword) {
              await this.showToast('Debes proporcionar al menos un campo para actualizar', 'warning');
              return false;
            }

            const loading = await this.loadingCtrl.create({
              message: 'Actualizando credenciales...'
            });
            await loading.present();

            try {
              const request: UpdateCredentialsRequest = {};
              if (data.newEmail && data.newEmail !== user.email) {
                request.newEmail = data.newEmail;
              }
              if (data.newPassword) {
                request.newPassword = data.newPassword;
              }

              await this.adminService.updateCredentials(user.uid, request);
              await this.showToast('Credenciales actualizadas exitosamente', 'success');
              await this.loadUsers();
            } catch (error: any) {
              console.error('Error actualizando credenciales:', error);
              const message = error?.error?.message || 'Error al actualizar credenciales';
              await this.showToast(message, 'danger');
            } finally {
              await loading.dismiss();
            }

            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Bloquear o desbloquear usuario
   */
  async toggleUserBlock(user: User) {
    const action = user.disabled ? 'desbloquear' : 'bloquear';
    const alert = await this.alertCtrl.create({
      header: `¿${action.charAt(0).toUpperCase() + action.slice(1)} Usuario?`,
      message: `¿Estás seguro de que deseas ${action} a ${user.username}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          handler: async () => {
            const loading = await this.loadingCtrl.create({
              message: `${action.charAt(0).toUpperCase() + action.slice(1)}ando usuario...`
            });
            await loading.present();

            try {
              await this.adminService.setUserBlock(user.uid, !user.disabled);
              await this.showToast(`Usuario ${action}ado exitosamente`, 'success');
              await this.loadUsers();
            } catch (error: any) {
              console.error(`Error ${action}ando usuario:`, error);
              const message = error?.error?.message || `Error al ${action} usuario`;
              await this.showToast(message, 'danger');
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Eliminar usuario
   */
  async deleteUser(user: User) {
    const alert = await this.alertCtrl.create({
      header: '⚠️ Eliminar Usuario',
      message: `¿Estás seguro de que deseas eliminar permanentemente a <strong>${user.username}</strong>? Esta acción no se puede deshacer.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingCtrl.create({
              message: 'Eliminando usuario...'
            });
            await loading.present();

            try {
              await this.adminService.deleteUser(user.uid);
              await this.showToast('Usuario eliminado exitosamente', 'success');
              await this.loadUsers();
            } catch (error: any) {
              console.error('Error eliminando usuario:', error);
              const message = error?.error?.message || 'Error al eliminar usuario';
              await this.showToast(message, 'danger');
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Recuperar acceso (solicitar reset de contraseña)
   */
  async recoverUserAccess(user: User) {
    const alert = await this.alertCtrl.create({
      header: 'Recuperar Acceso',
      message: `Se enviará un enlace de recuperación de contraseña a <strong>${user.email}</strong>`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Enviar',
          handler: async () => {
            const loading = await this.loadingCtrl.create({
              message: 'Enviando enlace de recuperación...'
            });
            await loading.present();

            try {
              await this.adminService.requestPasswordReset(user.email);
              await this.showToast('Enlace de recuperación enviado exitosamente', 'success');
            } catch (error: any) {
              console.error('Error enviando recuperación:', error);
              const message = error?.error?.message || 'Error al enviar enlace de recuperación';
              await this.showToast(message, 'danger');
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Mostrar detalles del usuario
   */
  async showUserDetails(user: User) {
    const alert = await this.alertCtrl.create({
      header: 'Detalles del Usuario',
      message: `
        <div style="text-align: left; padding: 10px;">
          <p><strong>ID:</strong> ${user.uid}</p>
          <p><strong>Usuario:</strong> ${user.username}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Nombre:</strong> ${user.name} ${user.lastname}</p>
          <p><strong>Rol:</strong> ${user.role}</p>
          <p><strong>Estado:</strong> ${user.disabled ? '🔒 Bloqueado' : '✅ Activo'}</p>
          <p><strong>Biometría:</strong> ${user.biometricEnabled ? '✅ Habilitada' : '❌ Deshabilitada'}</p>
          <p><strong>TOTP (2FA):</strong> ${user.totpEnabled ? '✅ Habilitado' : '❌ Deshabilitado'}</p>
        </div>
      `,
      buttons: ['Cerrar']
    });

    await alert.present();
  }

  /**
   * Refrescar lista de usuarios
   */
  async refreshUsers(event?: any) {
    await this.loadUsers();
    if (event) {
      event.target.complete();
    }
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

  /**
   * Obtener color del badge según el rol
   */
  getRoleBadgeColor(role: string): string {
    return role === 'ADMIN' ? 'danger' : 'primary';
  }

  /**
   * Obtener color del estado
   */
  getStatusColor(disabled: boolean | undefined): string {
    return disabled ? 'danger' : 'success';
  }

  /**
   * Contar usuarios activos
   */
  getActiveUsersCount(): number {
    if (!this.users || !Array.isArray(this.users)) {
      return 0;
    }
    return this.users.filter(user => !user.disabled).length;
  }

  /**
   * Contar usuarios bloqueados
   */
  getBlockedUsersCount(): number {
    if (!this.users || !Array.isArray(this.users)) {
      return 0;
    }
    return this.users.filter(user => user.disabled === true).length;
  }
}

