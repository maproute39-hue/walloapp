import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthPocketbaseService } from '../../../../../services/auth-pocketbase.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-client-biografy',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './biografy.html',
  styleUrls: ['./biografy.scss']
})
export class BiografyComponent {
  private auth = inject(AuthPocketbaseService);
  private fb = inject(FormBuilder);
  router = inject(Router);

  profileForm!: FormGroup;
  isLoading = false;
  user: any = null;
  defaultAvatar = 'assets/images/profile/profile2.png';
  avatarSrc = signal<string>(this.defaultAvatar);
  existingDniUrl: string | null = null;

  constructor() {
    this.initForm();
  }

  async ngOnInit(): Promise<void> {
    await this.loadUserData();
  }

  private initForm() {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      address: [''],
      bio: [''],
      dni: ['']
    });
    this.profileForm.get('email')?.disable();
  }

  private async loadUserData() {
    try {
      this.isLoading = true;
      this.user = await this.auth.currentUser();

      if (!this.user) {
        // Sin sesión válida → redirige o muestra alerta
        await Swal.fire({
          icon: 'info',
          title: 'Inicia sesión',
          text: 'Tu sesión ha expirado. Vuelve a iniciar sesión para editar tu perfil.',
          confirmButtonText: 'Ir a iniciar sesión'
        });
        this.router.navigate(['/auth/login']);
        return;
      }

      // Avatar (solo si existe campo/archivo)
      const avatarName = this.user.avatar;
      const url = avatarName ? this.auth.fileUrl(this.user, avatarName, '128x128') : null;
      this.avatarSrc.set(url || this.defaultAvatar);

      // Form values
      this.profileForm.patchValue({
        name: this.user.name ?? '',
        email: this.user.email ?? '',
        phone: this.user.phone ?? '',
        address: this.user.address ?? '',
        bio: this.user.bio ?? '',
        dni: this.user.dni ?? ''
      });

      // DNI doc
      if (this.user.dni_document) {
        this.existingDniUrl = this.auth.fileUrl(this.user, this.user.dni_document);
      } else {
        this.existingDniUrl = null;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async onSubmit() {
    if (this.profileForm.invalid) return;

    // Bloquea si no hay sesión
    if (!this.user) {
      await Swal.fire({
        icon: 'info',
        title: 'Inicia sesión',
        text: 'Tu sesión ha expirado. Vuelve a iniciar sesión para continuar.'
      });
      this.router.navigate(['/auth/login']);
      return;
    }

    try {
      this.isLoading = true;
      const formValue = this.profileForm.getRawValue();

      // Enviar como objeto (el servicio lo convierte a FormData)
      await this.auth.updateProfile({
        name: formValue.name,
        phone: formValue.phone,
        address: formValue.address,
        bio: formValue.bio,
        dni: formValue.dni,
      });

      await Swal.fire({
        icon: 'success',
        title: '¡Perfil actualizado!',
        text: 'Tus cambios se han guardado correctamente',
        showConfirmButton: false,
        timer: 1800
      });

      await this.loadUserData();
      this.router.navigate(['/profile', { outlets: { panel: ['client-biografy'] } }]);
    } catch (error) {
      console.error('Error updating profile:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar el perfil. Por favor, inténtalo de nuevo.'
      });
    } finally {
      this.isLoading = false;
    }
  }

  onFileSelected(event: any) {
    const file = event.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.avatarSrc.set(e.target.result);
    };
    reader.readAsDataURL(file);

    this.uploadAvatar(file);
  }

  private async uploadAvatar(file: File) {
    if (!this.user) {
      await Swal.fire({ icon: 'info', title: 'Inicia sesión', text: 'Tu sesión ha expirado.' });
      this.router.navigate(['/auth/login']);
      return;
    }
    try {
      this.isLoading = true;
      const fd = new FormData();
      fd.append('avatar', file);               // ← FormData directo
      await this.auth.updateProfile(fd);       // ← NO { avatar: fd }
      await this.loadUserData();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      this.avatarSrc.set(this.defaultAvatar);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar la foto de perfil. Por favor, inténtalo de nuevo.'
      });
    } finally {
      this.isLoading = false;
    }
  }

  async removeAvatar() {
    if (!this.user) {
      await Swal.fire({ icon: 'info', title: 'Inicia sesión', text: 'Tu sesión ha expirado.' });
      this.router.navigate(['/auth/login']);
      return;
    }
    try {
      this.isLoading = true;
      const fd = new FormData();
      fd.append('avatar', '');                 // ← vaciar archivo en PB
      await this.auth.updateProfile(fd);
      this.avatarSrc.set(this.defaultAvatar);
      await this.loadUserData();
    } catch (error) {
      console.error('Error removing avatar:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo eliminar la foto de perfil. Por favor, inténtalo de nuevo.'
      });
    } finally {
      this.isLoading = false;
    }
  }

  triggerFileInput() {
    (document.getElementById('avatar') as HTMLInputElement)?.click();
  }

  isPdf(url: string): boolean {
    return !!url && url.toLowerCase().endsWith('.pdf');
  }

  openPicker(type: 'dni') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) await this.uploadDocument(file, type);
    };
    input.click();
  }

  private async uploadDocument(file: File, type: 'dni') {
    if (!this.user) {
      await Swal.fire({ icon: 'info', title: 'Inicia sesión', text: 'Tu sesión ha expirado.' });
      this.router.navigate(['/auth/login']);
      return;
    }
    try {
      this.isLoading = true;
      const fd = new FormData();
      fd.append('dni_document', file);         // ← FormData directo
      await this.auth.updateProfile(fd);       // ← NO { dni_document: fd }
      await this.loadUserData();
      Swal.fire({ icon: 'success', title: '¡Documento actualizado!', showConfirmButton: false, timer: 1500 });
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo subir el documento. Por favor, inténtalo de nuevo.' });
    } finally {
      this.isLoading = false;
    }
  }
}
