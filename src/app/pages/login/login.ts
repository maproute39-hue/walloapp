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
      const rolw = (user as any)?.rolw as ('client'|'provider'|undefined);
      const status = (user as any)?.status as boolean | undefined; // true=activo

      if (rolw === 'provider' && status === false) {
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

  // ========== LOGIN CON GOOGLE ==========
  async loginWithGoogle() {
    try {
      this.loading.set(true);
      this.errorMsg.set(null);

      const authData = await this.pbService.getInstance().collection('users').authWithOAuth2({
        provider: 'google',
      });

      const user = authData.record;
      console.log('✅ Login Google exitoso:', user);

      // Lógica similar al registro: verificar si necesita completar perfil
      const needsProfileCompletion = !user['type'] || !user['phone'];

      if (needsProfileCompletion) {
        // Guardar datos temporales
        sessionStorage.setItem('oauth_user_id', user.id);
        sessionStorage.setItem('oauth_user_email', user['email']);
        sessionStorage.setItem('oauth_user_name', user['name'] || user['username'] || '');

        Swal.fire({
          title: '¡Bienvenido!',
          text: 'Completa tu perfil para continuar.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        this.router.navigate(['/complete-profile']);
      } else {
        // Usuario completo, redirigir según tipo
        const redirectPath = this.getRedirectPath(user['type']);
        Swal.fire({
          title: '¡Bienvenido!',
          text: user['name'] || user['username'] || user['email'],
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        setTimeout(() => this.router.navigate([redirectPath]), 1500);
      }

    } catch (error: any) {
      console.error('❌ Error Google:', error);

      if (error?.message?.includes('popup')) {
        this.errorMsg.set('Permite las ventanas emergentes para continuar con Google.');
      } else if (error?.message?.includes('cancelled')) {
        this.errorMsg.set('Inicio con Google cancelado.');
      } else {
        this.errorMsg.set('Error con Google. Intenta más tarde.');
      }

      Swal.fire('Error', this.errorMsg() || 'Error desconocido', 'error');
    } finally {
      this.loading.set(false);
    }
  }

  private getRedirectPath(type: string): string {
    switch(type) {
      case 'provider': return '/provider-dashboard';
      case 'client': return '/home';
      default: return '/home';
    }
  }

  private mapLoginError(e: any): string {
    const raw = e?.response || e;
    const msg = raw?.message ?? raw?.data?.message ?? e?.message ?? 'No se pudo iniciar sesión.';
    // Errores típicos:
    if (msg.toLowerCase().includes('failed to authenticate') || msg.toLowerCase().includes('invalid')) {
      return 'Email o contraseña incorrectos.';
    }
    if (msg.toLowerCase().includes('too many requests')) {
      return 'Demasiados intentos. Intenta en unos minutos.';
    }
    return msg;
    }
  
}
