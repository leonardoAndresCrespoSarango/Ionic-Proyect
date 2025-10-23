import { Injectable } from '@angular/core';
import { NativeBiometric } from 'capacitor-native-biometric';
import { AuthService } from './auth.service';

export interface BiometricCredentials {
  email: string;
  password: string;
}

export interface BiometricState {
  deviceAvailable: boolean;
  backendEnabled: boolean;
  hasStoredCredentials: boolean;
  canSaveCredentials: boolean;
  canUseForLogin: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BiometricService {
  private readonly BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';

  constructor(private authService: AuthService) {}

  /**
   * Obtener estado completo de biometría (dispositivo + backend + credenciales)
   */
  async getBiometricState(): Promise<BiometricState> {
    try {
      console.log('🔍 Obteniendo estado completo de biometría...');

      const isWeb = this.isWeb();
      const deviceAvailable = isWeb ? false : await this.isBiometricAvailable();
      const backendEnabled = await this.authService.getBiometricPreferenceFromBackend();
      const hasStoredCredentials = deviceAvailable ? await this.hasStoredCredentials() : false;

      const state: BiometricState = {
        deviceAvailable,
        backendEnabled,
        hasStoredCredentials,
        canSaveCredentials: deviceAvailable && !hasStoredCredentials,
        canUseForLogin: deviceAvailable && backendEnabled && hasStoredCredentials
      };

      console.log(' Estado biométrico completo:', state);
      return state;
    } catch (error) {
      console.error(' Error obteniendo estado biométrico:', error);
      return {
        deviceAvailable: false,
        backendEnabled: false,
        hasStoredCredentials: false,
        canSaveCredentials: false,
        canUseForLogin: false
      };
    }
  }

  /**
   * Activar biometría completa (guardar credenciales + activar en backend)
   */
  async enableBiometrics(email: string, password: string): Promise<boolean> {
    try {
      console.log(' Activando biometría completa...');

      // 1. Verificar que el dispositivo soporte biometría
      if (!await this.isBiometricAvailable()) {
        throw new Error('Biometría no disponible en este dispositivo');
      }

      // 2. Guardar credenciales localmente (incluye verificación biométrica)
      await this.saveCredentials(email, password);
      console.log(' Credenciales guardadas localmente');

      // 3. Activar en el backend
      const backendUpdated = await this.authService.updateBiometricPreference(true);
      if (!backendUpdated) {
        // Si falla el backend, eliminar credenciales locales
        await this.deleteCredentials();
        throw new Error('Error activando biometría en el servidor');
      }

      console.log(' Biometría activada completamente');
      return true;
    } catch (error) {
      console.error(' Error activando biometría:', error);
      throw error;
    }
  }

  /**
   * Desactivar biometría completa (eliminar credenciales + desactivar en backend)
   */
  async disableBiometrics(): Promise<boolean> {
    try {
      console.log(' Desactivando biometría completa...');

      // 1. Eliminar credenciales locales
      await this.deleteCredentials();
      console.log(' Credenciales locales eliminadas');

      // 2. Desactivar en el backend
      const backendUpdated = await this.authService.updateBiometricPreference(false);
      if (!backendUpdated) {
        console.warn(' Error desactivando biometría en el servidor, pero credenciales locales eliminadas');
      }

      console.log(' Biometría desactivada completamente');
      return true;
    } catch (error) {
      console.error(' Error desactivando biometría:', error);
      return false;
    }
  }

  /**
   * Login completo con biometría (verificar backend + obtener credenciales)
   */
  async loginWithBiometrics(): Promise<BiometricCredentials> {
    try {
      console.log(' Iniciando login biométrico completo...');

      // 1. Verificar que esté habilitado en el backend
      const backendEnabled = await this.authService.getBiometricPreferenceFromBackend();
      if (!backendEnabled) {
        throw new Error('Biometría deshabilitada en el servidor');
      }

      // 2. Obtener credenciales con verificación biométrica
      const credentials = await this.getCredentialsWithBiometric();
      if (!credentials) {
        throw new Error('No se encontraron credenciales guardadas');
      }

      console.log(' Login biométrico completo exitoso');
      return credentials;
    } catch (error) {
      console.error(' Error en login biométrico:', error);
      throw error;
    }
  }

  /**
   * Verificar si la biometría está disponible en el dispositivo
   */
  async isBiometricAvailable(): Promise<boolean> {
    try {
      if (this.isWeb()) {
        console.log(' Ejecutándose en web - biometría no disponible');
        return false;
      }

      console.log(' Verificando biometría en dispositivo móvil...');
      const result = await NativeBiometric.isAvailable();
      console.log(' Resultado biometría:', result);
      return result.isAvailable;
    } catch (error) {
      console.error(' Error checking biometric availability:', error);
      return false;
    }
  }

  /**
   * Verificar si estamos ejecutando en web
   */
  private isWeb(): boolean {
    return !(window as any).Capacitor;
  }

  /**
   * Verificar huella dactilar - Método principal de autenticación
   */
  async verifyIdentity(): Promise<boolean> {
    try {
      console.log(' Iniciando verificación biométrica...');

      const result = await NativeBiometric.verifyIdentity({
        reason: 'Usa tu huella dactilar para iniciar sesión',
        title: 'Autenticación Biométrica',
        subtitle: 'Iniciar Sesión',
        description: 'Coloca tu dedo en el sensor para acceder',
        maxAttempts: 3,
        useFallback: true,
      });

      console.log(' Verificación biométrica exitosa:', result);
      return true;
    } catch (error) {
      console.error(' Error en verificación biométrica:', error);
      throw error;
    }
  }

  /**
   * Guardar credenciales con biometría
   */
  async saveCredentials(email: string, password: string): Promise<boolean> {
    try {
      console.log(' Guardando credenciales biométricas...');

      // Primero verificar que la biometría funciona
      await this.verifyIdentity();

      const credentials: BiometricCredentials = { email, password };

      await NativeBiometric.setCredentials({
        username: email,
        password: JSON.stringify(credentials),
        server: this.BIOMETRIC_CREDENTIALS_KEY,
      });

      console.log(' Credenciales guardadas con biometría');
      return true;
    } catch (error) {
      console.error(' Error saving biometric credentials:', error);
      throw error;
    }
  }

  /**
   * Obtener credenciales usando biometría
   */
  async getCredentialsWithBiometric(): Promise<BiometricCredentials | null> {
    try {
      console.log(' Obteniendo credenciales con biometría...');

      // Primero verificar la identidad biométrica
      await this.verifyIdentity();

      // Luego obtener las credenciales
      const result = await NativeBiometric.getCredentials({
        server: this.BIOMETRIC_CREDENTIALS_KEY,
      });

      const credentials: BiometricCredentials = JSON.parse(result.password);
      console.log(' Credenciales obtenidas con biometría');
      return credentials;
    } catch (error) {
      console.error(' Error getting biometric credentials:', error);
      throw error;
    }
  }

  /**
   * Verificar si hay credenciales guardadas (sin activar biometría)
   */
  async hasStoredCredentials(): Promise<boolean> {
    try {
      if (this.isWeb()) {
        return false;
      }

      // Intentar obtener credenciales sin verificación biométrica
      const result = await NativeBiometric.getCredentials({
        server: this.BIOMETRIC_CREDENTIALS_KEY,
      });

      return result !== null && result.password !== null;
    } catch (error) {
      // Si no hay credenciales o hay error, retornar false
      console.log(' No hay credenciales biométricas guardadas');
      return false;
    }
  }

  /**
   * Eliminar credenciales biométricas guardadas
   */
  async deleteCredentials(): Promise<boolean> {
    try {
      await NativeBiometric.deleteCredentials({
        server: this.BIOMETRIC_CREDENTIALS_KEY,
      });
      console.log(' Credenciales biométricas eliminadas');
      return true;
    } catch (error) {
      console.error(' Error deleting biometric credentials:', error);
      return false;
    }
  }
}
