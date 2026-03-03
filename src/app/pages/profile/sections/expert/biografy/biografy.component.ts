import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthPocketbaseService } from '../../../../../services/auth-pocketbase.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-biografy',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './biografy.component.html',
  styleUrl: './biografy.component.scss'
})
export class BiografyComponent {
  private auth = inject(AuthPocketbaseService);
  private fb = inject(FormBuilder);
  router = inject(Router);
  profileForm!: FormGroup;
  isLoading = false;
  user: any = null;
/*   avatarSrc: string | null = null;
 */  document = document; // Make document available in the template
  readonly defaultAvatar = 'assets/images/profile/profile2.png';
  avatarSrc = signal<string>(this.defaultAvatar);
  ngOnInit(): void {
    this.loadUserData();
    this.initForm();
  }

  private initForm() {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      location: [''],
      bio: [''],  
      dni: [''],
    });

    // Deshabilitar el campo de email si es necesario
    this.profileForm.get('email')?.disable();
  }

  private async loadUserData() {
    try {
      this.isLoading = true;
      this.user = await this.auth.currentUser();
      
      if (this.user) {
        console.log('User data:', this.user); // Debug log
        
        // Get avatar URL
        const url = this.auth.fileUrl(this.user, this.user.avatar, '128x128');
        console.log('Avatar URL:', url); // Debug log
        
        this.avatarSrc.set(url || this.defaultAvatar);
        
        this.profileForm.patchValue({
          name: this.user.name || '',
          email: this.user.email || '',
          phone: this.user.phone || '',
          location: this.user.location || '',
          bio: this.user.bio || '',
          dni: this.user.dni || '',
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async onSubmit() {
    if (this.profileForm.invalid) {
      return;
    }

    try {
      this.isLoading = true;
      const formValue = this.profileForm.getRawValue();
      
      const data = {
        name: formValue.name,
        phone: formValue.phone,
        location: formValue.location,
        bio: formValue.bio,
        dni: formValue.dni,
      };

      await this.auth.updateProfile(data);
      
      // Show success message
      await Swal.fire({
        icon: 'success',
        title: '¡Perfil actualizado!',
        text: 'Tus cambios se han guardado correctamente',
        showConfirmButton: false,
        timer: 2000
      });

      // Reload user data
      await this.loadUserData();
      
    } catch (error) {
      console.error('Error updating profile:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar el perfil. Por favor, inténtalo de nuevo.',
        confirmButtonText: 'Entendido'
      });
    } finally {
      this.isLoading = false;
    }
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;
  
    try {
      this.isLoading = true;
      console.log('Selected file:', file);
      
      // Show preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.avatarSrc.set(e.target.result);
      };
      reader.readAsDataURL(file);
  
      // Upload the file
      console.log('Uploading avatar...');
      const updatedUser = await this.auth.updateAvatar(file);
      console.log('Avatar updated:', updatedUser);
      
      // Update the user data with the new avatar
      this.user = updatedUser;
      
      await Swal.fire({
        icon: 'success',
        title: '¡Imagen actualizada!',
        text: 'La imagen de perfil se ha actualizado correctamente',
        showConfirmButton: false,
        timer: 1500
      });
  
    } catch (error) {
      console.error('Error uploading avatar:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar la imagen de perfil: ' + (error instanceof Error ? error.message : 'Error desconocido'),
        confirmButtonText: 'Entendido'
      });
    } finally {
      this.isLoading = false;
      // Reset the file input to allow selecting the same file again
      event.target.value = '';
    }
  }

  async removeAvatar() {
    try {
      this.isLoading = true;
      
      // Remove the avatar by setting it to null
      const updatedUser = await this.auth.updateProfile({ avatar: null });
      this.user = updatedUser;
      
      // Reset to default avatar
      this.avatarSrc.set(this.defaultAvatar);
      
      await Swal.fire({
        icon: 'success',
        title: '¡Foto eliminada!',
        showConfirmButton: false,
        timer: 1500
      });
      
    } catch (error) {
      console.error('Error removing avatar:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo eliminar la foto de perfil',
        confirmButtonText: 'Entendido'
      });
    } finally {
      this.isLoading = false;
    }
  }

  // Add this method to handle the file input click
  triggerFileInput() {
    const fileInput = document.getElementById('avatar') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }
}
