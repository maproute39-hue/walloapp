import { Injectable } from '@angular/core';
import { PocketbaseService } from './pocketbase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private pbService: PocketbaseService) {}

  private get pb() {
    return this.pbService.getInstance();
  }

  /**
   * Registro con teléfono - llama al endpoint custom de PocketBase
   */
  async registerWithPhone(phone: string): Promise<{ success: boolean; userId: string; email: string; message: string }> {
    try {
      // Generar email sintético y password temporal
      const syntheticEmail = phone.replace(/[^0-9]/g, '') + '@wallo.usuario';
      const tempPassword = 'TempPass123!'; // Password temporal, cambiar después
      const role = 'client'; // Rol por defecto para clientes

      // Llama al hook custom que ya tienes en PocketBase
      const response = await this.pb.send('/api/registro-telefono', {
        method: 'POST',
        body: { 
          telefono: phone,
          email: syntheticEmail,
          password: tempPassword,
          rol: role
        }
      });

      return {
        success: response.success,
        userId: response.usuario_id,
        email: syntheticEmail,
        message: response.message
      };
      this.requestOTP(syntheticEmail);
    } catch (error: any) {
      console.error('❌ Error en registro:', error);
      throw new Error(error.data?.error || 'Error al registrar el teléfono');
    }
  }

  /**
   * Solicitar OTP para verificación
   */
async requestOTP(email: string): Promise<{ otp?: string }> {
  try {
    // Intentar endpoint debug primero
    const response = await this.pb.send('/api/otp-generate', {
      method: 'POST',
      body: { email }
    });
    
    // En desarrollo, retornar el OTP para que lo veas
    if (response.otp) {
      console.log('🔑 OTP PARA TESTING:', response.otp);
      return { otp: response.otp };
    }
    
    return {};
  } catch (error) {
    console.error('❌ Fallback a método nativo:', error);
    // Fallback al método nativo si el endpoint custom falla
    await this.pb.collection('users').requestOTP(email);
    return {};
  }
}

  /**
   * Verificar OTP y autenticar
   */
  async verifyOTP(email: string, otp: string): Promise<boolean> {
    try {
      await this.pb.collection('users').authWithOTP(email, otp);
      return this.pb.authStore.isValid;
    } catch (error: any) {
      console.error('❌ Error verificando OTP: para',+email, error);
      throw new Error('Código inválido o expirado');
    }
  }

  /**
   * Login con Google/Apple (si lo necesitas después)
   */
  async authWithOAuth(provider: 'google' | 'apple', redirectUrl?: string) {
    // PocketBase SDK maneja OAuth nativamente
    const authData = await this.pb.collection('users').authWithOAuth2({
      provider,
      redirectUrl: redirectUrl || window.location.origin
    });
    return authData;
  }
}