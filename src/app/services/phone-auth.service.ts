// services/phone-auth.service.ts
import { Injectable } from '@angular/core';
import { PocketbaseService } from './pocketbase.service';

@Injectable({ providedIn: 'root' })
export class PhoneAuthService {
  
  constructor(private pbService: PocketbaseService) {}
  
  /**
   * Solicitar OTP usando email basado en teléfono
   */

  
  /**
   * Verificar OTP - ¡ESTO AUTENTICA AUTOMÁTICAMENTE!
   */
  async requestOTP(phone: string): Promise<any> {
  const normalized = phone.replace(/[^0-9]/g, '');
  // Crear email único basado en el teléfono
  const email = `${normalized}@phone.auth.local`;
  
  try {
    const pb = this.pbService.getInstance();
    
    // IMPORTANTE: No enviar token de autenticación
    // request-otp es un endpoint público
    const result = await pb.collection('users').requestOTP(email);
    
    return {
      success: true,
      message: 'Código enviado',
      otpId: result.otpId,
      email: email
    };
  } catch (error: any) {
    console.error('Error requesting OTP:', error);
    
    // Si el error es 404, significa que el usuario no existe
    if (error.status === 404) {
      // Aquí puedes crear el usuario automáticamente
      await this.createUserWithPhone(phone, email);
      // Reintentar requestOTP
      return this.requestOTP(phone);
    }
    
    throw new Error(error.message || 'Error al solicitar código');
  }
}
  async verifyOTP(otpId: string, code: string): Promise<any> {
    try {
      const pb = this.pbService.getInstance();
      
      // Usar el método NATIVO de PocketBase - ¡esto guarda el token automáticamente!
      const authData = await pb.collection('users').authWithOTP(otpId, code);
      
      return {
        success: true,
        message: 'Autenticación exitosa',
        token: authData.token,
        user: authData.record
      };
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      throw new Error(error.message || 'Código incorrecto');
    }
  }
  async createUserWithPhone(phone: string, email: string): Promise<any> {
  const pb = this.pbService.getInstance();
  
  // Crear usuario con email basado en teléfono
  const data = {
    email: email,
    password: Math.random().toString(36).slice(-12),
    passwordConfirm: Math.random().toString(36).slice(-12),
    phone: phone,
    name: `Usuario ${phone.slice(-4)}`,
    emailVisibility: false
  };
  
  return await pb.collection('users').create(data);
}
  
  /**
   * Verificar si hay usuario autenticado
   */
  isAuthenticated(): boolean {
    return this.pbService.getInstance().authStore.isValid;
  }
  
  /**
   * Obtener usuario actual
   */
  getCurrentUser() {
    return this.pbService.getInstance().authStore.model;
  }
}