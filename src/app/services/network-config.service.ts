import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NetworkConfigService {

  /**
   * Obtiene la URL del API desde el environment
   */
  getApiUrl(): string {
    return environment.apiUrl;
  }
}
