import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CapacitorHttp, HttpOptions } from '@capacitor/core';
import { NetworkConfigService } from './network-config.service';
import { User, RegisterRequest } from '../models/user.model';

export interface UpdateCredentialsRequest {
  newEmail?: string;
  newPassword?: string;
}

export interface BlockUserRequest {
  disabled: boolean;
}

export interface BiometricStatus {
  uid: string;
  email: string;
  username: string;
  biometricEnabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private networkConfig = inject(NetworkConfigService);
  private http = inject(HttpClient);
  private API_URL = environment.apiUrl;

  constructor() {
    this.API_URL = this.networkConfig.getApiUrl();
  }

  /**
   * Verificar si estamos en un dispositivo móvil
   */
  private isMobile(): boolean {
    return !!(window as any).Capacitor;
  }

  /**
   * Obtener token de autenticación
   */
  private getToken(): string | null {
    return localStorage.getItem('jwt_token');
  }

  /**
   * Hacer petición HTTP autenticada
   */
  private async makeAuthRequest(method: string, url: string, data?: any): Promise<any> {
    const token = this.getToken();

    if (this.isMobile()) {
      const options: HttpOptions = {
        url,
        method: method as any,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        data: data ? JSON.stringify(data) : undefined
      };
      const response = await CapacitorHttp.request(options);
      return response.data;
    } else {
      // En web, el interceptor maneja el token automáticamente
      switch (method.toLowerCase()) {
        case 'get':
          return this.http.get(url).toPromise();
        case 'post':
          return this.http.post(url, data).toPromise();
        case 'put':
          return this.http.put(url, data).toPromise();
        case 'delete':
          return this.http.delete(url).toPromise();
        default:
          throw new Error(`Método HTTP no soportado: ${method}`);
      }
    }
  }

  // ==================== GESTIÓN DE USUARIOS ====================

  /**
   * Listar todos los usuarios (solo ADMIN)
   */
  async getAllUsers(): Promise<User[]> {
    try {
      console.log('📋 Obteniendo lista de usuarios...');
      const baseUrl = this.API_URL.replace('/users', '');
      const url = `${baseUrl}/users`;
      const response = await this.makeAuthRequest('GET', url);

      // Validar que la respuesta sea un array
      if (!Array.isArray(response)) {
        console.error('❌ Respuesta no es un array:', response);
        return [];
      }

      console.log(`✅ ${response.length} usuario(s) obtenido(s) del backend`);
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo usuarios:', error);
      throw error;
    }
  }

  /**
   * Obtener usuario por ID (solo ADMIN)
   */
  async getUserById(uid: string): Promise<User> {
    try {
      console.log(`📋 Obteniendo usuario: ${uid}`);
      const baseUrl = this.API_URL.replace('/users', '');
      const url = `${baseUrl}/users/${uid}`;
      return await this.makeAuthRequest('GET', url);
    } catch (error) {
      console.error('❌ Error obteniendo usuario:', error);
      throw error;
    }
  }

  /**
   * Registrar nuevo usuario (solo ADMIN)
   */
  async registerUser(request: RegisterRequest): Promise<User> {
    try {
      console.log('➕ Registrando nuevo usuario...');
      const baseUrl = this.API_URL.replace('/users', '');
      const url = `${baseUrl}/users/register`;
      return await this.makeAuthRequest('POST', url, request);
    } catch (error) {
      console.error('❌ Error registrando usuario:', error);
      throw error;
    }
  }

  /**
   * Actualizar credenciales de un usuario (solo ADMIN)
   */
  async updateCredentials(uid: string, request: UpdateCredentialsRequest): Promise<void> {
    try {
      console.log(`🔧 Actualizando credenciales del usuario: ${uid}`);
      const baseUrl = this.API_URL.replace('/users', '');
      const url = `${baseUrl}/users/${uid}/credentials`;
      await this.makeAuthRequest('PUT', url, request);
      console.log('✅ Credenciales actualizadas exitosamente');
    } catch (error) {
      console.error('❌ Error actualizando credenciales:', error);
      throw error;
    }
  }

  /**
   * Bloquear o desbloquear usuario (solo ADMIN)
   */
  async setUserBlock(uid: string, disabled: boolean): Promise<void> {
    try {
      console.log(`${disabled ? '🔒' : '🔓'} ${disabled ? 'Bloqueando' : 'Desbloqueando'} usuario: ${uid}`);
      const baseUrl = this.API_URL.replace('/users', '');
      const url = `${baseUrl}/users/${uid}/block`;
      const request: BlockUserRequest = { disabled };
      await this.makeAuthRequest('PUT', url, request);
      console.log(`✅ Usuario ${disabled ? 'bloqueado' : 'desbloqueado'} exitosamente`);
    } catch (error) {
      console.error('❌ Error bloqueando/desbloqueando usuario:', error);
      throw error;
    }
  }

  /**
   * Eliminar usuario (solo ADMIN)
   */
  async deleteUser(uid: string): Promise<void> {
    try {
      console.log(`🗑️ Eliminando usuario: ${uid}`);
      const baseUrl = this.API_URL.replace('/users', '');
      const url = `${baseUrl}/users/${uid}`;
      await this.makeAuthRequest('DELETE', url);
      console.log('✅ Usuario eliminado exitosamente');
    } catch (error) {
      console.error('❌ Error eliminando usuario:', error);
      throw error;
    }
  }

  /**
   * Solicitar recuperación de contraseña (solo ADMIN puede hacer esto por cualquier usuario)
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      console.log(`🔑 Solicitando recuperación de contraseña para: ${email}`);
      const baseUrl = this.API_URL.replace('/users', '');
      const url = `${baseUrl}/users/password-reset?email=${encodeURIComponent(email)}`;
      await this.makeAuthRequest('POST', url);
      console.log('✅ Solicitud de recuperación enviada');
    } catch (error) {
      console.error('❌ Error solicitando recuperación:', error);
      throw error;
    }
  }

  /**
   * Obtener estado biométrico de todos los usuarios (solo ADMIN)
   */
  async getAllBiometricStatus(): Promise<BiometricStatus[]> {
    try {
      console.log('📋 Obteniendo estado biométrico de todos los usuarios...');
      const baseUrl = this.API_URL.replace('/users', '');
      const url = `${baseUrl}/users/biometric-status`;
      return await this.makeAuthRequest('GET', url);
    } catch (error) {
      console.error('❌ Error obteniendo estado biométrico:', error);
      throw error;
    }
  }
}

