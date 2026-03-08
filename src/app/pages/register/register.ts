import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';
import { AuthPocketbaseService, UserType, RegisterMinimalPayload } from '../../services/auth-pocketbase.service';
import Swal from 'sweetalert2';
import { Router, RouterLink } from '@angular/router';
import { EmailService } from '../../services/email.service';
import { PocketbaseService } from '../../services/pocketbase.service';

function matchPasswordsValidator(a: string, b: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const va = group.get(a)?.value;
    const vb = group.get(b)?.value;
    if (!va || !vb) return null;
    return va === vb ? null : { passwordsMismatch: true };
  };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
})
export class Register {
  private fb = inject(FormBuilder);
  private auth = inject(AuthPocketbaseService);
  private router = inject(Router);
  private email = inject(EmailService);
  private pbService = inject(PocketbaseService);

  loading = signal(false);
  submitted = signal(false);
  errorMsg = signal<string | null>(null);
  success = signal(false);

  // preview del avatar
  avatarPreview = signal<string | null>(null);

  // Validador de archivo (tipo y tamaño); valida solo si el valor es un File
  private fileValidator = (control: AbstractControl): ValidationErrors | null => {
    const val = control.value as unknown;
    const file = val instanceof File ? val : null;
    if (!file) return null; // si no hay archivo (o no es File), otros validators decidirán (required condicional)
    const okType = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type);
    if (!okType) return { fileType: true };
    const maxBytes = 2 * 1024 * 1024; // 2MB
    if (file.size > maxBytes) return { fileSize: true };
    return null;
  };

  form = this.fb.group({
    type: ['client' as UserType, [Validators.required]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [
      '',
      [
        Validators.required,
        Validators.pattern(/^\+?\d[\d\s-]{6,19}\d$/), // E.164 flexible
      ],
    ],
    dni: [
      '',
      [
        // requerido solo si proveedor (se aplica en setType)
        Validators.minLength(5),
        Validators.maxLength(20),
        Validators.pattern(/^[A-Za-z0-9.-]+$/), // letras, números, punto y guion
      ],
    ],
    // usar undefined para encajar con el tipo del servicio
    avatar: [undefined as File | string | undefined, [this.fileValidator]],

    password: ['', [Validators.required, Validators.minLength(6)]],
    passwordConfirm: ['', [Validators.required, Validators.minLength(6)]],
  }, {
    validators: [matchPasswordsValidator('password', 'passwordConfirm')]
  });

  get f() { return this.form.controls; }
  get passwordsMismatch() { return this.form.errors?.['passwordsMismatch']; }

  // Imagen seleccionada
  onFileSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];

    this.form.get('avatar')?.setValue(file ?? undefined);
    this.form.get('avatar')?.updateValueAndValidity();

    if (file) {
      const reader = new FileReader();
      reader.onload = () => this.avatarPreview.set(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      this.avatarPreview.set(null);
    }
  }

  async onSubmit() {
    this.submitted.set(true);
    this.errorMsg.set(null);

    if (this.form.invalid) return;

    this.loading.set(true);
    try {
      const v = this.form.value;

      const payload: RegisterMinimalPayload = {
        username: v.username!,
        email: v.email!,
        phone: v.phone!,
        type: v.type!,
        dni: v.dni || undefined,
        avatar: (v.avatar ?? undefined) as string | Blob | undefined,
        password: v.password!,                 // ← usar las del form
        passwordConfirm: v.passwordConfirm!,   // ← usar las del form
      };

      await this.auth.registerMinimal(payload);

      this.success.set(true);

      // Emails
      const createdAt = new Date().toISOString();
      try {
        if (v.type === 'client') {
          await this.email.sendBienvenidaClient(v.email!, v.username!, {
            name: v.username!,
            email: v.email!,
            type: v.type!,
            phone: v.phone!,
            created: createdAt,
          });
        } else {
          await this.email.sendBienvenidaProfessional(v.email!, v.username!, {
            name: v.username!,
            email: v.email!,
            type: v.type!,
            phone: v.phone!,
            created: createdAt,
          });
          await this.email.notifyAdminNuevoProfessional({
            name: v.username!,
            email: v.email!,
            type: v.type!,
            created: createdAt,
            phone: v.phone!,
          });
        }
      } catch (mailErr: any) {
        console.error('Fallo envío de email:', mailErr?.message || mailErr);
      }

      if (v.type === 'client') {
        await Swal.fire({
          title: '¡Cuenta creada!',
          text: `Bienvenido ${v.username}, tu cuenta de client fue activada correctamente.`,
          icon: 'success',
          confirmButtonText: 'Ir al inicio',
        });
        this.router.navigate(['/home']);
      } else {
        await Swal.fire({
          title: 'Cuenta en revisión',
          text: `Gracias ${v.username}. Tu cuenta de proveedor será revisada por el equipo antes de activarse.`,
          icon: 'info',
          confirmButtonText: 'Entendido',
        });
        // decide si rediriges o lo dejas en la misma pantalla
      }
    } catch (e: any) {
      const msg = e?.response?.message ?? e?.message ?? 'No se pudo crear la cuenta.';
      this.errorMsg.set(msg);
      Swal.fire({ title: 'Error', text: msg, icon: 'error', confirmButtonText: 'Revisar' });
    } finally {
      this.loading.set(false);
    }
  }

  // Selector visual de tipo
  setType(t: UserType) {
    this.form.get('type')?.setValue(t);

    // Reglas condicionales para proveedor
    const dniCtrl = this.form.get('dni')!;
    const avatarCtrl = this.form.get('avatar')!;

    if (t === 'professional') {
      dniCtrl.addValidators([Validators.required]);
      avatarCtrl.addValidators([Validators.required, this.fileValidator]);
    } else {
      dniCtrl.removeValidators([Validators.required]);
      avatarCtrl.removeValidators([Validators.required]);
    }

    dniCtrl.updateValueAndValidity();
    avatarCtrl.updateValueAndValidity();
  }

  isType(t: UserType) {
    return this.form.get('type')?.value === t;
  }

  private getRedirectPath(type: string): string {
    switch(type) {
      case 'professional': return '/provider-dashboard';
      case 'client': return '/home';
      default: return '/home';
    }
  }

  private showSuccess(message: string) {
    Swal.fire({
      title: '¡Éxito!',
      text: message,
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });
  }

  // ========== LOGIN CON GOOGLE ==========
// ========== LOGIN CON GOOGLE ==========
async loginWithGoogle() {
  try {
    this.loading.set(true);
    this.errorMsg.set(null);

    const authData = await this.pbService.getInstance().collection('users').authWithOAuth2({
      provider: 'google',
    });

    const user = authData.record;
        // Si no tiene type, asignarlo
    if (!user['type']) {
      await this.pbService.getInstance().collection('users').update(user.id, {
        type: 'professional', // o 'client'
        phone: user['phone'] || '', // opcional
      });
      
      // Actualizar el objeto user localmente
      user['rol'] = 'professional';
    }
    
    // Verificar si el usuario necesita completar el perfil
    // (mismo criterio que usas para Apple)
    const needsProfileCompletion = !user['type'] || !user['phone'];
    
    if (needsProfileCompletion) {
      // Guardar datos temporales para el formulario de completado
      sessionStorage.setItem('oauth_user_id', user.id);
      sessionStorage.setItem('oauth_user_name', user['name'] || user['username'] || '');
      sessionStorage.setItem('oauth_user_email', user['email'] || '');
      
      this.showSuccess('¡Bienvenido! Completa tu perfil para continuar.');
      this.router.navigate(['/complete-profile']);
    } else {
      // Usuario completo, redirigir según su rol
      this.success.set(true);
      this.showSuccess('¡Bienvenido! ' + (user['name'] || user['username'] || user['email']));
      
      const redirectPath = this.getRedirectPath(user['type']);
      setTimeout(() => this.router.navigate([redirectPath]), 1500);
    }

  } catch (error: any) {
    console.error('❌ Error Google:', error);
    
    // Manejo de errores específicos de OAuth
    if (error?.message?.includes('popup')) {
      this.errorMsg.set('Permite las ventanas emergentes para continuar con Google.');
    } else if (error?.message?.includes('cancelled')) {
      this.errorMsg.set('Inicio con Google cancelado.');
    } else {
      this.errorMsg.set('Error con Google. Intenta con email.');
    }
  } finally {
    this.loading.set(false);
  }
}

  // ========== LOGIN CON APPLE ==========
  async loginWithApple() {
    try {
      this.loading.set(true);
      this.errorMsg.set(null);

      const authData = await this.pbService.getInstance().collection('users').authWithOAuth2({
        provider: 'apple',
      });

      const user = authData.record;
      
      // Misma lógica que Google
      const needsProfileCompletion = !user['type'] || !user['phone'];
      
      if (needsProfileCompletion) {
        sessionStorage.setItem('oauth_user_id', user.id);
        sessionStorage.setItem('oauth_user_name', user['name'] || user['username'] || '');
        this.showSuccess('¡Bienvenido! Completa tu perfil.');
        this.router.navigate(['/complete-profile']);
      } else {
        this.success.set(true);
        this.showSuccess('¡Bienvenido! ' + (user['name'] || user['username'] || user['email']));
        const redirectPath = this.getRedirectPath(user['type']);
        setTimeout(() => this.router.navigate([redirectPath]), 1500);
      }

    } catch (error: any) {
      console.error('❌ Error Apple:', error);
      this.errorMsg.set('Error con Apple. Intenta con email.');
    } finally {
      this.loading.set(false);
    }
  }
}
