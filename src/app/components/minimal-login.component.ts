import {Component, inject} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-minimal-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './minimal-login.component.html',
  styleUrls: ['./minimal-login.component.scss']
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

