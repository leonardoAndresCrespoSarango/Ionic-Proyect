export interface User {
  uid: string;
  username: string;
  email: string;
  name: string;
  lastname: string;
  role: 'CUSTOMER' | 'ADMIN';
  biometricEnabled: boolean;
  totpEnabled: boolean;
  disabled?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  name: string;
  lastname: string;
}

export interface LoginResponse {
  token?: string;
  user: User;
  totpRequired: boolean;
  tempSessionId?: string;
}

export interface BiometricPreferenceRequest {
  enabled: boolean;
}

export interface BiometricPreferenceResponse {
  enabled: boolean;
}

export interface TotpSetupResponse {
  secret: string;
  qrCodeDataUri: string;
}

export interface TotpVerifyRequest {
  code: string;
}

export interface TotpVerifyResponse {
  success: boolean;
  message: string;
}

export interface TotpStatusResponse {
  totpEnabled: boolean;
}

export interface TotpLoginRequest {
  code: string;
}

