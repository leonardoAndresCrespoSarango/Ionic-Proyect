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
import { IonModal, IonNote } from '@ionic/angular/standalone';

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
    IonInput,
    IonModal,
    IonNote],
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
  isEditModalOpen: boolean = false;
  selectedUserForEdit: User | null = null;

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
  async loadUsers(options: { silent?: boolean } = {}) {
    const { silent = false } = options;
    this.isLoading = true;
    let loading: HTMLIonLoadingElement | undefined;

    if (!silent) {
      loading = await this.loadingCtrl.create({
        message: 'Cargando usuarios...'
      });
      await loading.present();
    }

    try {
      const response = await this.adminService.getAllUsers();
      console.log(' Respuesta del backend:', response);
      console.log('Tipo de respuesta:', typeof response);
      console.log('Es array:', Array.isArray(response));

      // Asegurar que siempre sea un array
      if (Array.isArray(response)) {
        this.users = response.map(user => this.normalizeUser(user));
        this.refreshFilteredUsers();
        console.log(`${this.users.length} usuario(s) cargado(s) correctamente`);
        console.log('👥 Usuarios:', this.users);
      } else {
        console.error(' La respuesta no es un array:', response);
        await this.showToast('Error: Respuesta inválida del servidor', 'danger');
      }
    } catch (error: any) {
      console.error(' Error cargando usuarios:', error);
      const message = error?.error?.message || error?.message || 'Error al cargar usuarios';
      await this.showToast(message, 'danger');
    } finally {
      if (loading) {
        await loading.dismiss();
      }
      this.isLoading = false;
    }
  }

  /**
   * Filtrar usuarios por búsqueda
   */
  filterUsers(event: any) {
    this.searchTerm = event?.target?.value || '';
    this.refreshFilteredUsers();
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
      await this.loadUsers({ silent: true });
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
    this.selectedUserForEdit = user;
    this.editCredentialsForm.reset({
      newEmail: user.email || '',
      newPassword: ''
    });
    this.isEditModalOpen = true;
  }

  /**
   * Cerrar modal de edición
   */
  closeEditModal() {
    this.isEditModalOpen = false;
  }

  /**
   * Limpiar estado cuando el modal termina de cerrarse
   */
  onEditModalDidDismiss() {
    this.selectedUserForEdit = null;
    this.editCredentialsForm.reset();
  }

  /**
   * Guardar cambios de credenciales desde el modal
   */
  async submitEditCredentials() {
    if (!this.selectedUserForEdit) {
      return;
    }

    const previousEmail = this.selectedUserForEdit.email;
    const rawEmail: string = this.editCredentialsForm.value.newEmail || '';
    const trimmedEmail = rawEmail.trim();
    const newPassword: string = this.editCredentialsForm.value.newPassword || '';

    const emailChanged = trimmedEmail && trimmedEmail !== previousEmail;
    const passwordChanged = !!newPassword;

    if (!emailChanged && !passwordChanged) {
      await this.showToast('Debes actualizar el correo o la contraseña.', 'warning');
      return;
    }

    if (trimmedEmail && this.editCredentialsForm.get('newEmail')?.invalid) {
      this.editCredentialsForm.get('newEmail')?.markAsTouched();
      await this.showToast('Ingresa un email válido.', 'warning');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      this.editCredentialsForm.get('newPassword')?.markAsTouched();
      await this.showToast('La contraseña debe tener al menos 6 caracteres.', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Actualizando credenciales...'
    });
    await loading.present();

    try {
      const request: UpdateCredentialsRequest = {};
      if (emailChanged) {
        request.newEmail = trimmedEmail;
      }
      if (passwordChanged) {
        request.newPassword = newPassword;
      }

      await this.adminService.updateCredentials(this.selectedUserForEdit.uid, request);

      if (request.newEmail) {
        const search = this.searchTerm.trim().toLowerCase();
        const oldEmailMatches = previousEmail?.toLowerCase?.().includes(search);
        const newEmailMatches = request.newEmail.toLowerCase().includes(search);
        if (search && oldEmailMatches && !newEmailMatches) {
          this.searchTerm = request.newEmail;
        }
        this.patchLocalUser(this.selectedUserForEdit.uid, { email: request.newEmail });
      }

      await this.showToast('Credenciales actualizadas exitosamente', 'success');
      await this.loadUsers({ silent: true });
      this.closeEditModal();
    } catch (error: any) {
      console.error('Error actualizando credenciales:', error);
      const message = error?.error?.message || 'Error al actualizar credenciales';
      await this.showToast(message, 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Bloquear o desbloquear usuario
   */
  async toggleUserBlock(user: User) {
    const currentStatus = !!user.disabled;
    const action = currentStatus ? 'desbloquear' : 'bloquear';
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
              const newStatus = !currentStatus;
              await this.adminService.setUserBlock(user.uid, newStatus);
              this.patchLocalUser(user.uid, { disabled: newStatus });
              await this.loadUsers({ silent: true });
              await this.showToast(`Usuario ${action}ado exitosamente`, 'success');
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
      header: ' Eliminar Usuario',
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
              await this.loadUsers({ silent: true });
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
      message: this.buildUserDetailsMessage(user),
      cssClass: 'user-details-alert',
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

  /**
   * Obtener el resumen de autenticación del usuario
   */
  getAuthenticationSummary(user: User): string {
    const methods: string[] = [];

    methods.push('Contraseña');

    if (user.totpEnabled) {
      methods.push('TOTP (2FA)');
    }

    if (user.biometricEnabled) {
      methods.push('Biometría');
    }

    return methods.join(' + ');
  }

  /**
   * Normalizar datos del usuario para evitar valores undefined
   */
  private normalizeUser(user: User): User {
    return {
      ...user,
      disabled: !!user.disabled,
      biometricEnabled: !!user.biometricEnabled,
      totpEnabled: !!user.totpEnabled
    };
  }

  /**
   * Actualizar búsqueda actual aplicando el filtro almacenado
   */
  private refreshFilteredUsers(): void {
    const normalizedTerm = this.searchTerm.trim().toLowerCase();

    if (!normalizedTerm) {
      this.filteredUsers = [...this.users];
      return;
    }

    this.filteredUsers = this.users.filter(user =>
      user.username.toLowerCase().includes(normalizedTerm) ||
      user.email.toLowerCase().includes(normalizedTerm) ||
      user.name.toLowerCase().includes(normalizedTerm) ||
      user.lastname.toLowerCase().includes(normalizedTerm)
    );
  }

  /**
   * Actualizar parcialmente un usuario en la lista local
   */
  private patchLocalUser(uid: string, changes: Partial<User>): void {
    let updated = false;

    this.users = this.users.map(existing => {
      if (existing.uid === uid) {
        updated = true;
        return this.normalizeUser({ ...existing, ...changes });
      }
      return existing;
    });

    if (updated) {
      this.refreshFilteredUsers();
    }
  }

  /**
   * Construir mensaje de detalles del usuario para diálogos
   */
  private buildUserDetailsMessage(user: User): string {
    const lines = [
      `ID: ${user.uid}`,
      `Usuario: ${user.username}`,
      `Email: ${user.email}`,
      `Nombre: ${user.name} ${user.lastname}`,
      `Rol: ${user.role}`,
      `Estado: ${user.disabled ? 'Bloqueado' : 'Activo'}`,
      `Autenticación: ${this.getAuthenticationSummary(user)}`,
      `Biometría: ${user.biometricEnabled ? 'Habilitada' : 'Deshabilitada'}`,
      `TOTP (2FA): ${user.totpEnabled ? 'Habilitado' : 'Deshabilitado'}`
    ];

    return lines.join('\n');
  }
}
