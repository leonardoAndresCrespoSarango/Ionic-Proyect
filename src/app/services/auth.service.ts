import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, from } from 'rxjs';
import { LoginRequest, LoginResponse, RegisterRequest, User, BiometricPreferenceRequest, BiometricPreferenceResponse } from '../models/user.model';
import { environment } from '../../environments/environment';
import { CapacitorHttp, HttpOptions } from '@capacitor/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private readonly TOKEN_KEY = 'jwt_token';
  private readonly USER_KEY = 'current_user';

  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  private isLoggingOut = false;

  constructor(private http: HttpClient) {}

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
        this.setToken(response.token);
        this.setUser(response.user);
        this.currentUserSubject.next(response.user);
        this.isAuthenticatedSubject.next(true);
        this.isLoggingOut = false;
      })
    );
  }

  logout(): void {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;
    if (this.hasToken()) {
      // Usar la función que maneja tanto móvil como web
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
}
