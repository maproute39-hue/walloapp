import { Injectable } from '@angular/core';
import PocketBase from 'pocketbase';

@Injectable({ providedIn: 'root' })
export class PocketbaseService {
  private pb: PocketBase;

  constructor() {
    // URL de tu instancia PocketBase
    this.pb = new PocketBase('https://db.buckapi.site:8055/');
    
    // Auto-cancelar requests anteriores si el componente se destruye
    this.pb.autoCancellation(false);
  }
 get client(): PocketBase {
    return this.pb;
  }

  getInstance(): PocketBase {
    return this.pb;
  }

create(): PocketBase {
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