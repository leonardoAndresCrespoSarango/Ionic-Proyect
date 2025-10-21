import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { MinimalLoginComponent } from './components/minimal-login.component';
import { MinimalDashboardComponent } from './components/minimal-dashboard.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: 'minimal-login',
    component: MinimalLoginComponent,
  },
  {
    path: 'minimal-dashboard',
    component: MinimalDashboardComponent,
    canActivate: [authGuard],
  },
];
