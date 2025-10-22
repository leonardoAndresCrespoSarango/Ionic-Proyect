import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, from } from 'rxjs';
import { LoginRequest, LoginResponse, RegisterRequest, User, BiometricPreferenceRequest, BiometricPreferenceResponse, TotpSetupResponse, TotpVerifyRequest, TotpVerifyResponse, TotpStatusResponse, TotpLoginRequest } from '../models/user.model';
import { environment } from '../../environments/environment';
import { CapacitorHttp, HttpOptions } from '@capacitor/core';
import { NetworkConfigService } from './network-config.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private networkConfig = inject(NetworkConfigService);
  private http = inject(HttpClient);
  private API_URL = environment.apiUrl;
  private readonly TOKEN_KEY = 'jwt_token';
  private readonly USER_KEY = 'current_user';

  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  private isLoggingOut = false;

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
   * Hacer petición HTTP usando Capacitor o Angular HttpClient
   */
  private async makeHttpRequest(method: string, url: string, data?: any): Promise<any> {
    if (this.isMobile()) {
      // Usar CapacitorHttp en móvil
      const options: HttpOptions = {
        url,
        method: method as any,
        headers: {
          'Content-Type': 'application/json'
        },
        data: data ? JSON.stringify(data) : undefined
      };

      const response = await CapacitorHttp.request(options);
      return response.data;
    } else {
      // Usar HttpClient en web
      switch (method.toLowerCase()) {
        case 'post':
          return this.http.post(url, data).toPromise();
        case 'get':
          return this.http.get(url).toPromise();
        default:
          throw new Error(`Método HTTP no soportado: ${method}`);
      }
    }
  }



  register(request: RegisterRequest): Observable<User> {
    return from(this.makeHttpRequest('POST', `${this.API_URL}/register`, request));
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return from(this.makeHttpRequest('POST', `${this.API_URL}/login`, request)).pipe(
      tap(response => {
        // Si TOTP es requerido, NO guardamos el token todavía
        if (!response.totpRequired && response.token) {
          this.setToken(response.token);
          this.setUser(response.user);
          this.currentUserSubject.next(response.user);
          this.isAuthenticatedSubject.next(true);
          this.isLoggingOut = false;
        }
        // Si totpRequired es true, el componente manejará el flujo de TOTP
      })
    );
  }

  logout(): void {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;
    if (this.hasToken()) {
      // Intentar logout en servidor, pero no bloquear si falla
      this.makeHttpRequest('POST', `${this.API_URL}/audit/logout`, {}).catch((err) => {
        console.warn('Error logging out:', err);
      });
    }
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  hasToken(): boolean {
    return this.getToken() !== null;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'ADMIN';
  }

  isAuthenticated(): boolean {
    return this.hasToken();
  }

  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private getUserFromStorage(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  /**
   * Actualizar preferencia biométrica en el backend
   */
  async updateBiometricPreference(enabled: boolean): Promise<boolean> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      console.log(`🔧 Actualizando preferencia biométrica a: ${enabled}`);

      const request: BiometricPreferenceRequest = { enabled };
      const token = this.getToken();

      // Construir URL base correctamente
      const baseUrl = this.API_URL.replace('/users', '');
      const url = `${baseUrl}/users/biometric`;

      console.log(`📡 Enviando PUT a: ${url}`);

      if (this.isMobile()) {
        // Usar CapacitorHttp en móvil con token de autorización
        const options: HttpOptions = {
          url,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          data: request
        };
        await CapacitorHttp.request(options);
      } else {
        // En web, el interceptor maneja el token
        await this.http.put(url, request).toPromise();
      }

      // Actualizar el usuario local
      const updatedUser = { ...user, biometricEnabled: enabled };
      this.setUser(updatedUser);
      this.currentUserSubject.next(updatedUser);

      console.log('✅ Preferencia biométrica actualizada en backend');
      return true;
    } catch (error) {
      console.error('❌ Error actualizando preferencia biométrica:', error);
      return false;
    }
  }

  /**
   * Obtener preferencia biométrica del backend
   */
  async getBiometricPreferenceFromBackend(): Promise<boolean> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        return false;
      }

      const response: BiometricPreferenceResponse = await this.makeHttpRequest(
        'GET',
        `${this.API_URL.replace('/users', '')}/users/${user.uid}/biometric`
      );

      console.log(`📋 Preferencia biométrica del backend: ${response.enabled}`);
      return response.enabled;
    } catch (error) {
      console.error('❌ Error obteniendo preferencia biométrica:', error);
      return false;
    }
  }

  /**
   * Sincronizar estado biométrico completo (dispositivo + backend)
   */
  async syncBiometricState(): Promise<{deviceAvailable: boolean, backendEnabled: boolean, hasCredentials: boolean}> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        return { deviceAvailable: false, backendEnabled: false, hasCredentials: false };
      }

      // Verificar estado en paralelo
      const [deviceAvailable, backendEnabled, hasCredentials] = await Promise.all([
        this.isMobile() ? true : false, // En móvil, asumimos que puede estar disponible
        this.getBiometricPreferenceFromBackend(),
        false // Se actualizará después
      ]);

      console.log(`🔄 Estado biométrico sincronizado:`, {
        deviceAvailable,
        backendEnabled,
        hasCredentials
      });

      return { deviceAvailable, backendEnabled, hasCredentials };
    } catch (error) {
      console.error('❌ Error sincronizando estado biométrico:', error);
      return { deviceAvailable: false, backendEnabled: false, hasCredentials: false };
    }
  }

  // ==================== MÉTODOS TOTP ====================

  /**
   * Configurar TOTP - Obtener QR code y secreto
   */
  async setupTotp(): Promise<TotpSetupResponse> {
    try {
      const token = this.getToken();
      const baseUrl = this.API_URL.replace('/users', '');
      const url = `${baseUrl}/users/totp/setup`;

      console.log('🔐 Iniciando configuración TOTP...');

      if (this.isMobile()) {
        const options: HttpOptions = {
          url,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        };
        const response = await CapacitorHttp.request(options);
        return response.data;
      } else {
        return await this.http.post<TotpSetupResponse>(url, {}).toPromise() as TotpSetupResponse;
      }
    } catch (error) {
      console.error('❌ Error configurando TOTP:', error);
      throw error;
    }
  }

  /**
   * Verificar y habilitar TOTP
   */
  async verifyAndEnableTotp(code: string): Promise<TotpVerifyResponse> {
    try {
      const token = this.getToken();
      const baseUrl = this.API_URL.replace('/users', '');
      const url = `${baseUrl}/users/totp/verify`;

      console.log('✅ Verificando código TOTP...');

      const request: TotpVerifyRequest = { code };

      if (this.isMobile()) {
        const options: HttpOptions = {
          url,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          data: request
        };
        const response = await CapacitorHttp.request(options);

        // Actualizar usuario local
        const user = this.getCurrentUser();
        if (user) {
          const updatedUser = { ...user, totpEnabled: true };
          this.setUser(updatedUser);
          this.currentUserSubject.next(updatedUser);
        }

        return response.data;
      } else {
        const response = await this.http.post<TotpVerifyResponse>(url, request).toPromise() as TotpVerifyResponse;

        // Actualizar usuario local
        const user = this.getCurrentUser();
        if (user) {
          const updatedUser = { ...user, totpEnabled: true };
          this.setUser(updatedUser);
          this.currentUserSubject.next(updatedUser);
        }

        return response;
      }
    } catch (error) {
      console.error('❌ Error verificando TOTP:', error);
      throw error;
    }
  }

  /**
   * Deshabilitar TOTP
   */
  async disableTotp(code: string): Promise<TotpVerifyResponse> {
    try {
      const token = this.getToken();
      const baseUrl = this.API_URL.replace('/users', '');
      const url = `${baseUrl}/users/totp/disable`;

      console.log('🔓 Deshabilitando TOTP...');

      const request: TotpVerifyRequest = { code };

      if (this.isMobile()) {
        const options: HttpOptions = {
          url,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          data: request
        };
        const response = await CapacitorHttp.request(options);

        // Actualizar usuario local
        const user = this.getCurrentUser();
        if (user) {
          const updatedUser = { ...user, totpEnabled: false };
          this.setUser(updatedUser);
          this.currentUserSubject.next(updatedUser);
        }

        return response.data;
      } else {
        const response = await this.http.post<TotpVerifyResponse>(url, request).toPromise() as TotpVerifyResponse;

        // Actualizar usuario local
        const user = this.getCurrentUser();
        if (user) {
          const updatedUser = { ...user, totpEnabled: false };
          this.setUser(updatedUser);
          this.currentUserSubject.next(updatedUser);
        }

        return response;
      }
    } catch (error) {
      console.error('❌ Error deshabilitando TOTP:', error);
      throw error;
    }
  }

  /**
   * Login con código TOTP (segunda etapa del login)
   */
  async loginWithTotp(uid: string, code: string): Promise<LoginResponse> {
    try {
      const baseUrl = this.API_URL.replace('/users', '');
      const url = `${baseUrl}/users/login/totp?uid=${uid}`;

      console.log('🔑 Verificando código TOTP para login...');

      const request: TotpLoginRequest = { code };

      let response: LoginResponse;

      if (this.isMobile()) {
        const options: HttpOptions = {
          url,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          data: request
        };
        const httpResponse = await CapacitorHttp.request(options);
        response = httpResponse.data;
      } else {
        response = await this.http.post<LoginResponse>(url, request).toPromise() as LoginResponse;
      }

      // Guardar token y usuario después de verificar TOTP
      if (response.token) {
        this.setToken(response.token);
        this.setUser(response.user);
        this.currentUserSubject.next(response.user);
        this.isAuthenticatedSubject.next(true);
        this.isLoggingOut = false;
        console.log('✅ Login con TOTP exitoso');
      }

      return response;
    } catch (error) {
      console.error('❌ Error en login con TOTP:', error);
      throw error;
    }
  }

  /**
   * Obtener estado TOTP del usuario
   */
  async getTotpStatus(): Promise<TotpStatusResponse> {
    try {
      const token = this.getToken();
      const baseUrl = this.API_URL.replace('/users', '');
      const url = `${baseUrl}/users/totp/status`;

      console.log('📋 Obteniendo estado TOTP...');

      if (this.isMobile()) {
        const options: HttpOptions = {
          url,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        };
        const response = await CapacitorHttp.request(options);
        return response.data;
      } else {
        return await this.http.get<TotpStatusResponse>(url).toPromise() as TotpStatusResponse;
      }
    } catch (error) {
      console.error('❌ Error obteniendo estado TOTP:', error);
      throw error;
    }
  }
}
