import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-minimal-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="max-width:400px;margin:60px auto;padding:24px;border-radius:8px;box-shadow:0 2px 8px #eee;background:#fff;text-align:center;">
      <h2>Bienvenido</h2>
      <p>Has iniciado sesión correctamente.</p>
      <div *ngIf="user">
        <p><strong>Usuario:</strong> {{ user.name }} {{ user.lastname }}</p>
        <p><strong>Email:</strong> {{ user.email }}</p>
        <p><strong>Rol:</strong> {{ user.role }}</p>
      </div>
      <button (click)="logout()" style="margin-top:24px;padding:10px 24px;border:none;border-radius:4px;background:#d00;color:#fff;font-weight:bold;">Cerrar sesión</button>
    </div>
  `
})
export class MinimalDashboardComponent {
  private authService = inject(AuthService);
  user = this.authService.getCurrentUser();

  logout() {
    this.authService.logout();
    window.location.href = '/login';
  }
}
