import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthPocketbaseService } from '../services/auth-pocketbase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private auth: AuthPocketbaseService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (this.auth.isLoggedIn()) {
      return true;
    } else {
      this.router.navigate(['/landing']);
      return false;
    }
  }
}
