import { Injectable } from '@angular/core';
import PocketBase from 'pocketbase';

@Injectable({ providedIn: 'root' })
export class PocketbaseService {
  private pb: PocketBase;

  constructor() {
    // URL de tu instancia PocketBase
    this.pb = new PocketBase('http://0.0.0.0:8055/');
    
    // Auto-cancelar requests anteriores si el componente se destruye
    this.pb.autoCancellation(false);
  }

  getInstance(): PocketBase {
    return this.pb;
  }

  // Verificar si hay sesión activa
  isAuthenticated(): boolean {
    return this.pb.authStore.isValid;
  }

  // Obtener el usuario actual
  getCurrentUser() {
    return this.pb.authStore.model;
  }

  // Logout
  logout() {
    this.pb.authStore.clear();
  }
}