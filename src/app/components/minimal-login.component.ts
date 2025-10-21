import {Component, inject} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-minimal-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div style="max-width:320px;margin:60px auto;padding:24px;border-radius:8px;box-shadow:0 2px 8px #eee;background:#fff;">
      <h3 style="text-align:center;margin-bottom:24px;">Login</h3>
      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
        <input type="email" formControlName="email" placeholder="Email" style="width:100%;margin-bottom:12px;padding:8px;border-radius:4px;border:1px solid #ccc;">
        <input type="password" formControlName="password" placeholder="Contraseña" style="width:100%;margin-bottom:12px;padding:8px;border-radius:4px;border:1px solid #ccc;">
        <div *ngIf="errorMessage" style="color:#d00;font-size:13px;margin-bottom:8px;">{{ errorMessage }}</div>
        <button type="submit" [disabled]="loginForm.invalid || loading" style="width:100%;padding:10px;border:none;border-radius:4px;background:#007bff;color:#fff;font-weight:bold;">
          {{ loading ? 'Cargando...' : 'Entrar' }}
        </button>
      </form>
    </div>
  `
})
export class MinimalLoginComponent {
  loginForm: FormGroup;
  loading = false;
  errorMessage = '';
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  constructor(
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) return;
    this.loading = true;
    this.errorMessage = '';
    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Credenciales inválidas';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}

