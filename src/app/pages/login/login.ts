import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthPocketbaseService } from '../../services/auth-pocketbase.service';
import { PocketbaseService } from '../../services/pocketbase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthPocketbaseService);
  private router = inject(Router);
  private pbService = inject(PocketbaseService);

  loading = signal(false);
  submitted = signal(false);
  errorMsg = signal<string | null>(null);
  showPassword = signal(false);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  get f() { return this.form.controls; }

  togglePassword() {
    this.showPassword.set(!this.showPassword());
  }

  async login(emailOrUsername: string, password: string) {
    const id = (emailOrUsername || '').trim();
    const pass = (password || '').trim();

    // Si el id parece email, úsalo como tal. Si no, intenta igual (PB permite email o username).
    return (await this.auth.pb.collection('users').authWithPassword(id.toLowerCase(), pass)).record;
  }


  async onSubmit() {
    this.submitted.set(true);
    this.errorMsg.set(null);
    if (this.form.invalid) return;

    this.loading.set(true);
    try {
      const email = this.form.value.email!;
      const password = this.form.value.password!;

      const user = await this.auth.login(email, password); // 👈 PB authWithPassword

      // Lógica de post-login según rol/estado
      const rolw = (user as any)?.rolw as ('client' | 'professional' | undefined);
      const status = (user as any)?.status as boolean | undefined; // true=activo

      if (rolw === 'professional' && status === false) {
        await Swal.fire({
          icon: 'info',
          title: 'Cuenta en revisión',
          text: 'Tu cuenta de proveedor será revisada por el equipo antes de activarse.',
          confirmButtonText: 'Entendido'
        });
        // Redirige a perfil para completar docs, por ejemplo:
        await this.router.navigate(['/profile']);
        return;
      }

      // Cliente o proveedor activo
      await this.router.navigate(['/home']);

    } catch (e: any) {
      // Mapea errores comunes de PB
      const msg = this.mapLoginError(e);
      this.errorMsg.set(msg);
      await Swal.fire({ icon: 'error', title: 'Error de acceso', text: msg, confirmButtonText: 'Revisar' });
    } finally {
      this.loading.set(false);
    }
  }

  async onForgotPassword() {
    const email = this.form.value.email?.trim();
    if (!email) {
      this.errorMsg.set('Ingresa tu email para enviar el enlace de recuperación.');
      return;
    }
    this.loading.set(true);
    try {
      await this.auth.requestPasswordReset(email);
      await Swal.fire({
        icon: 'success',
        title: 'Revisa tu correo',
        text: 'Te enviamos un enlace para restablecer la contraseña.',
        confirmButtonText: 'OK'
      });
    } catch (e: any) {
      const msg = e?.response?.message ?? e?.message ?? 'No fue posible enviar el enlace.';
      this.errorMsg.set(msg);
    } finally {
      this.loading.set(false);
    }
  }

  async loginWithGoogle() {
    try {
      this.loading.set(true);
      this.errorMsg.set(null);

      const authData = await this.pbService.getInstance().collection('users').authWithOAuth2({
        provider: 'google',
      });

      let user = authData.record;
      console.log('✅ Login Google exitoso:', user);

      // 🎯 PASO 1: Si no tiene type, asignar 'client' por defecto
      if (!user['type'] || user['type'] === '') {
        await this.pbService.getInstance().collection('users').update(user.id, {
          type: 'client',
        });
        user['type'] = 'client';
        console.log('🔄 Type asignado por defecto: client');
      }

      // 🎯 PASO 2: Verificar completitud del perfil según el tipo de usuario
      const userType = user['type'] as 'client' | 'professional';
      const needsProfileCompletion = await this.checkProfileCompletion(user, userType);

      if (needsProfileCompletion) {
        // Guardar datos temporales para el formulario de completado
        sessionStorage.setItem('oauth_user_id', user.id);
        sessionStorage.setItem('oauth_user_type', userType); // ⭐ CLAVE: guardar el tipo
        sessionStorage.setItem('oauth_user_email', user['email'] || '');
        sessionStorage.setItem('oauth_user_name', user['name'] || user['username'] || '');

        Swal.fire({
          title: '¡Welcome!',
          text: 'Complete your profile to continue.',
          icon: 'info',
          timer: 2000,
          showConfirmButton: false
        });
        this.router.navigate(['/complete-profile']);
      } else {
        // Usuario completo, redirigir según tipo
        const redirectPath = this.getRedirectPath(userType);
        const userName = user['name'] || user['username'] || user['email'] || 'Usuario';

        Swal.fire({
          title: '¡Welcome!',
          text: userName,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        setTimeout(() => this.router.navigate([redirectPath]), 1500);
      }

    } catch (error: any) {
      console.error('❌ Error Google:', error);

      if (error?.message?.includes('popup')) {
        this.errorMsg.set('Allow pop-ups to continue with Google.');
      } else if (error?.message?.includes('cancelled')) {
        this.errorMsg.set('Google sign-in cancelled.');
      } else {
        this.errorMsg.set('Error with Google. Try again later.');
      }

      Swal.fire({
        title: 'Error',
        text: this.errorMsg() || 'Unknown error',
        icon: 'error',
        confirmButtonText: 'Retry'
      });
    } finally {
      this.loading.set(false);
    }
  }
  /**
   * Verifica si el usuario necesita completar su perfil según su tipo
   * - client: solo necesita 'phone' en la colección 'users'
   * - professional: necesita 'phone' en 'users' Y un registro en 'professional_profiles'
   */
  private async checkProfileCompletion(
    user: any,
    type: 'client' | 'professional'
  ): Promise<boolean> {

    // 🟢 CASO CLIENT: Solo verificamos que tenga phone en users
    if (type === 'client') {
      const hasPhone = user['phone'] && user['phone'].toString().trim() !== '';
      return !hasPhone; // true = necesita completar
    }

    // 🔵 CASO PROFESSIONAL: Verifica phone + perfil en professional_profiles
    if (type === 'professional') {

      // 1️⃣ Verificar phone en users
      const hasPhone = user['phone'] && user['phone'].toString().trim() !== '';
      if (!hasPhone) {
        console.log('📱 Professional without phone: needs to complete profile');
        return true;
      }

      // 2️⃣ Verificar si existe registro en professional_profiles
      try {
        const pb = this.pbService.getInstance();
        const result = await pb.collection('professional_profiles').getList(1, 1, {
          filter: `userId = "${user.id}"`,
        });

        const hasProfile = result.items.length > 0;
        console.log('🔍 Professional profile check:', {
          userId: user.id,
          hasProfile
        });

        return !hasProfile; // true = necesita crear perfil profesional

      } catch (error: any) {
        // 🚨 Manejo seguro: si falla la consulta, asumir que necesita completar
        console.warn('⚠️ Error verifying professional profiles:', error?.message || error);
        return true;
      }
    }

    // 🔴 Tipo desconocido: forzar completado por seguridad
    console.warn('⚠️ Unknown user type:', type);
    return true;
  }
  private getRedirectPath(type: string): string {
    switch (type) {
      case 'professional': return '/home';
      case 'client': return '/home';
      default: return '/home';
    }
  }

  private mapLoginError(e: any): string {
    const raw = e?.response || e;
    const msg = raw?.message ?? raw?.data?.message ?? e?.message ?? 'No se pudo iniciar sesión.';
    // Errores típicos:
    if (msg.toLowerCase().includes('failed to authenticate') || msg.toLowerCase().includes('invalid')) {
      return 'Incorrect email or password.';
    }
    if (msg.toLowerCase().includes('too many requests')) {
      return 'Too many attempts. Try again in a few minutes.';
    }
    return msg;
  }

}
