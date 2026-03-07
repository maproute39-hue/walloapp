import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import PocketBase from 'pocketbase';
import { environment } from '../environments/environment';
import { PocketbaseService } from './pocketbase.service';

// Interfaces para tipado seguro
export interface RegisterPhoneResponse {
  success: boolean;
  message: string;
  usuario_id: string;
  email: string;
  telefono: string;
  temp_password?: string; // Solo para desarrollo
}

export interface OtpGenerateResponse {
  success: boolean;
  message: string;
  usuario_id: string;
  expires_in: number;
}

export interface OtpVerifyResponse {
  success: boolean;
  message: string;
  token: string;        // ← Nuevo
  record: {             // ← Nuevo
    id: string;
    email: string;
    phone: string;
    role: string;
    verified: boolean;
    [key: string]: any;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  // 🔥 Usamos HttpClient para los endpoints personalizados
  // (pb.send() no funciona bien con hooks custom en algunas versiones)
  private readonly API_URL = `${environment.pbUrl}/api`;

  constructor(
    private http: HttpClient,
    private pbService: PocketbaseService
  ) {}

  private get pb(): PocketBase {
    return this.pbService.getInstance();
  }

  // ========== PASO 1: REGISTRO POR TELÉFONO ==========

  /**
   * Crea usuario nuevo o confirma existencia por teléfono
   * Retorna: usuario_id, email generado y (opcional) contraseña temporal
   */
  async registerPhone(phone: string): Promise<RegisterPhoneResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<RegisterPhoneResponse>(
          `${this.API_URL}/registro-telefono`,  // ✅ Endpoint correcto
          { telefono: phone }  // ✅ El backend espera "telefono"
        )
      );
      return response;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // ========== PASO 2: GENERAR OTP ==========

  /**
   * Genera código OTP y lo "envía" al usuario
   * Requiere usuario_id obtenido del registro previo
   */
  async generateOTP(usuario_id: string): Promise<OtpGenerateResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<OtpGenerateResponse>(
          `${this.API_URL}/otp-generate`,  // ✅ Endpoint correcto
          { usuario_id }
        )
      );
      return response;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // ========== PASO 3: VERIFICAR OTP ==========

  /**
   * Valida el código OTP ingresado por el usuario
   * ⚠️ NO autentica todavía, solo marca verified: true en el usuario
   */
  async verifyOTP(usuario_id: string, otp: string): Promise<OtpVerifyResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<OtpVerifyResponse>(
          `${this.API_URL}/otp-verify-custom`,  // ✅ Endpoint correcto
          { usuario_id, otp }  // ✅ Parámetros que espera el hook
        )
      );
      return response;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // ========== PASO 4: LOGIN CON SDK (AUTENTICACIÓN REAL) ==========

  /**
   * Autentica al usuario con el SDK oficial de PocketBase
   * Usa el email generado + contraseña para obtener token JWT válido
   */
  async loginWithCredentials(email: string, password: string): Promise<any> {
    try {
      // ✅ Esto SÍ llena correctamente pb.authStore
      const authData = await this.pb.collection('users').authWithPassword(email, password);
      return authData;
    } catch (error: any) {
      console.error('❌ Error en login con SDK:', error);
      throw new Error('No se pudo iniciar sesión. Verifica tus credenciales.');
    }
  }

  // ========== MÉTODOS AUXILIARES ==========

  /**
   * Logout: limpia la sesión actual
   */
  logout(): void {
    this.pb.authStore.clear();
  }

  /**
   * Verifica si hay una sesión activa y válida
   */
  isAuthenticated(): boolean {
    return this.pb.authStore.isValid;
  }

  /**
   * Obtiene el usuario actual autenticado (o null)
   */
  getCurrentUser(): any | null {
    return this.pb.authStore.model;
  }

  /**
   * Manejo centralizado de errores HTTP
   */
  private handleError(error: HttpErrorResponse | any): Error {
    console.error('❌ AuthService error:', error);
    
    // Error con mensaje del backend
    if (error.error?.error) {
      return new Error(error.error.error);
    }
    // Error con mensaje genérico
    if (error.message) {
      return new Error(error.message);
    }
    // Error de red/conexión
    return new Error('Error de conexión con el servidor');
  }
}