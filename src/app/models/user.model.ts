export interface User {
  uid: string;
  username: string;
  email: string;
  name: string;
  lastname: string;
  role: 'CUSTOMER' | 'ADMIN';
  biometricEnabled: boolean;
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
  token: string;
  user: User;
}

export interface BiometricPreferenceRequest {
  enabled: boolean;
}

export interface BiometricPreferenceResponse {
  enabled: boolean;
}

