import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { PocketbaseService } from '../../services/pocketbase.service';
import { AuthPocketbaseService } from '../../services/auth-pocketbase.service';

@Component({
  selector: 'app-complete-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './complete-profile.html',
  styleUrl: './complete-profile.scss'
})
export class CompleteProfile implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private pb = inject(PocketbaseService);
  private auth = inject(AuthPocketbaseService);
  selectedFiles: File[] = [];
  isUploading = signal(false);
  uploadProgress = signal(0);
  existingPhotos: string[] = []; // Para editar si ya tiene fotos

  // Estados reactivos
  isLoading = signal(false);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  // Tipo de usuario y datos OAuth
  userType: 'client' | 'professional' | null = null;
  oauthUserId: string | null = null;
  oauthUserName: string | null = null;
  oauthUserEmail: string | null = null;

  // Formularios
  clientForm!: FormGroup;
  professionalForm!: FormGroup;

  // ========== NUEVO: Datos para autocomplete de zip/city ==========
  zipCodesList: any[] = [];           // Lista completa de zip codes de PocketBase
  filteredCities: string[] = [];      // Ciudades filtradas para datalist
  filteredZips: string[] = [];        // Zip codes filtrados para datalist
  selectedCity: string = '';
  // ================================================================

  // Opciones para selects (se mantienen como fallback o para otros usos)
  wallpaperTypes = [
    { value: 'vinilo', label: 'Vinilo' },
    { value: 'wallpaper', label: 'Wallpaper' },
    { value: 'papel tapíz', label: 'Papel tapiz' },
  ];

  // cities ya no es necesario como array estático, se usa filteredCities

  // ========== VALIDADORES PERSONALIZADOS ==========

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    
    if (!files || files.length === 0) return;

    // Validar archivos
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.type.startsWith('image/')) {
        Swal.fire('Error', 'Solo se permiten imágenes', 'error');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        Swal.fire('Error', `La imagen "${file.name}" supera los 5MB`, 'error');
        return;
      }
    }

    // Agregar a la lista
    this.selectedFiles = [...this.selectedFiles, ...Array.from(files)];
    
    // Limitar a 10 fotos
    if (this.selectedFiles.length > 10) {
      this.selectedFiles = this.selectedFiles.slice(0, 10);
      Swal.fire('Límite alcanzado', 'Solo se permiten máximo 10 fotos', 'warning');
    }
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.selectedFiles = [...this.selectedFiles];
  }
  static phoneValidator(control: AbstractControl): ValidationErrors | null {
    const phone = control.value?.toString() || '';
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.length < 7 || digits.length > 10) {
      return { invalidPhone: true };
    }
    return null;
  }

  static experienceValidator(control: AbstractControl): ValidationErrors | null {
    const val = control.value;
    if (val === null || val === undefined || val === '') return { required: true };
    if (val < 0) return { min: true };
    if (val > 50) return { max: true };
    return null;
  }

  static zipCodeValidator(control: AbstractControl): ValidationErrors | null {
    const zip = control.value?.toString() || '';
    // Ajusta según el formato de tus zip codes (ej: 5 dígitos para US)
    if (zip && !/^\d{5}(-\d{4})?$/.test(zip)) {
      return { invalidZip: true };
    }
    return null;
  }

  // ========== INICIALIZACIÓN ==========

  async ngOnInit(): Promise<void> {
    this.loadOAuthData();
    this.initForms();
    await this.loadZipCodesForAutocomplete(); // ← NUEVO: Cargar datos al iniciar
    
    if (!this.oauthUserId) {
      this.showWarning('Sesión no válida. Por favor inicia sesión nuevamente.');
      setTimeout(() => this.router.navigate(['/login']), 1500);
    }
  }

  ngOnDestroy(): void {
    // Limpieza si es necesaria
  }

  private loadOAuthData(): void {
    this.oauthUserId = sessionStorage.getItem('oauth_user_id');
    this.userType = sessionStorage.getItem('oauth_user_type') as 'client' | 'professional' || 'client';
    this.oauthUserName = sessionStorage.getItem('oauth_user_name');
    this.oauthUserEmail = sessionStorage.getItem('oauth_user_email');
    
    console.log('🔍 OAuth data loaded:', {
      id: this.oauthUserId,
      type: this.userType,
      name: this.oauthUserName,
      email: this.oauthUserEmail
    });
  }

  private initForms(): void {
    // 🟢 FORMULARIO CLIENT: Solo phone
    this.clientForm = this.fb.group({
      phone: ['', [
        Validators.required,
        CompleteProfile.phoneValidator
      ]],
    });

    // 🔵 FORMULARIO PROFESSIONAL: Perfil completo con zip_code
    this.professionalForm = this.fb.group({
      phone: ['', [
        Validators.required,
        CompleteProfile.phoneValidator
      ]],
      full_name: ['', [Validators.required, Validators.minLength(3)]],
      experience_years: [null, [
        Validators.required,
        CompleteProfile.experienceValidator
      ]],
      bio: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(500)]],
      city: ['', Validators.required],
  service_zips: [[], [Validators.required, Validators.minLength(1)]], // ← CAMBIADO: array en lugar de string
      wallpaper_types: [[], [Validators.required, Validators.minLength(1)]],
    });
  }

// ========== NUEVO: Método para toggle de zip codes ==========
onZipCodeToggle(zipId: string, event: Event): void {
  const checkbox = event.target as HTMLInputElement;
  const current = this.professionalForm.get('service_zips')?.value || [];
  
  if (checkbox.checked) {
    this.professionalForm.patchValue({
      service_zips: [...current, zipId]
    });
  } else {
    this.professionalForm.patchValue({
      service_zips: current.filter((id: string) => id !== zipId)
    });
  }
}

// ========== NUEVO: Helper para verificar si está seleccionado ==========
isZipCodeSelected(zipId: string): boolean {
  const selected = this.professionalForm.get('service_zips')?.value || [];
  return selected.includes(zipId);
}

// ========== NUEVO: Obtener zip codes filtrados por ciudad ==========
getFilteredZipCodes(): any[] {
  const city = this.professionalForm.get('city')?.value;
  
  if (!city) return [];
  
  return this.zipCodesList.filter((z: any) => z.city === city);
}

  // ========== NUEVO: Cargar zip codes desde PocketBase ==========
  async loadZipCodesForAutocomplete(): Promise<void> {
    try {
      // Obtener zip codes activos (ajusta el filtro según tu colección)
      const records = await this.pb.getInstance()
        .collection('zipcodes')
        .getList(1, 2000, {
          filter: 'active = true', // Puedes agregar && state = "NC" si aplica
          sort: 'city,code'
        });

      this.zipCodesList = records.items;
      
      // Extraer ciudades únicas para el datalist
      const cities = [...new Set(
        this.zipCodesList.map((z: any) => z.city)
      )].sort();
      
      this.filteredCities = cities;
      
    } catch (error) {
      console.error('Error cargando zip codes:', error);
      // Fallback para que no falle la UI
      this.filteredCities = ['Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Maracay'];
    }
  }

  // ========== NUEVO: Filtrar ciudades mientras escribe ==========
  onCityInput(event: Event): void {
    const input = (event.target as HTMLInputElement).value.toLowerCase();
    
    if (input.length >= 2) {
      this.filteredCities = [...new Set(
        this.zipCodesList
          .filter((z: any) => z.city?.toLowerCase().includes(input))
          .map((z: any) => z.city)
      )].sort().slice(0, 10);
    } else {
      const cities = [...new Set(
        this.zipCodesList.map((z: any) => z.city)
      )].sort();
      this.filteredCities = cities;
    }
  }

  // ========== NUEVO: Cuando selecciona ciudad, filtrar zip codes ==========
  onCityChange(event: Event): void {
    const city = (event.target as HTMLInputElement).value;
    this.selectedCity = city;
    
    const zips = this.zipCodesList
      .filter((z: any) => z.city === city)
      .map((z: any) => z.code)
      .sort();
    
    this.filteredZips = zips;
    this.professionalForm.patchValue({ zip_code: '' });
  }

  // ========== NUEVO: Filtrar zip codes mientras escribe ==========
  onZipInput(event: Event): void {
    const input = (event.target as HTMLInputElement).value;
    
    if (this.selectedCity && input.length >= 1) {
      this.filteredZips = this.zipCodesList
        .filter((z: any) => 
          z.city === this.selectedCity && 
          z.code?.startsWith(input)
        )
        .map((z: any) => z.code)
        .sort()
        .slice(0, 10);
    } else if (!this.selectedCity && input.length >= 2) {
      this.filteredZips = this.zipCodesList
        .filter((z: any) => z.code?.startsWith(input))
        .map((z: any) => z.code)
        .sort()
        .slice(0, 10);
    } else {
      if (this.selectedCity) {
        this.filteredZips = this.zipCodesList
          .filter((z: any) => z.city === this.selectedCity)
          .map((z: any) => z.code)
          .sort();
      }
    }
  }

  // ========== NUEVO: Cuando selecciona zip, auto-completar ciudad ==========
  onZipChange(event: Event): void {
    const zipCode = (event.target as HTMLInputElement).value;
    const zipRecord = this.zipCodesList.find((z: any) => z.code === zipCode);
    
    if (zipRecord) {
      this.professionalForm.patchValue({
        city: zipRecord.city
      });
      this.selectedCity = zipRecord.city;
    }
  }

  // ========== GETTERS PARA EL TEMPLATE ==========

  get isClient(): boolean { return this.userType === 'client'; }
  get isProfessional(): boolean { return this.userType === 'professional'; }

  get clientFormControls() { return this.clientForm.controls; }
  get professionalFormControls() { return this.professionalForm.controls; }

  // Helpers para el autocomplete en el template
  get filteredCitiesList(): string[] { return this.filteredCities; }
  get filteredZipsList(): string[] { return this.filteredZips; }

  // ========== MANEJO DE UI ==========

  private showError(message: string): void {
    this.errorMsg.set(message);
    this.successMsg.set(null);
    setTimeout(() => this.errorMsg.set(null), 5000);
  }

  private showSuccess(message: string): void {
    this.successMsg.set(message);
    this.errorMsg.set(null);
    setTimeout(() => this.successMsg.set(null), 5000);
  }

  private showWarning(message: string): void {
    Swal.fire({
      title: 'Atención',
      text: message,
      icon: 'warning',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#ff6b35',
    });
  }

  // ========== SUBMIT PRINCIPAL ==========

  async onSubmit(): Promise<void> {
    if (!this.oauthUserId) {
      this.showError('Sesión no válida. Por favor inicia sesión nuevamente.');
      return;
    }

    this.isLoading.set(true);
    this.errorMsg.set(null);

    try {
      if (this.isClient) {
        await this.submitClientProfile();
      } else if (this.isProfessional) {
        await this.submitProfessionalProfile();
      } else {
        throw new Error('Tipo de usuario no válido');
      }

      this.clearOAuthSession();
      
      const redirectPath = this.getRedirectPath();
      await Swal.fire({
        title: '¡Perfil completado!',
        text: 'Ahora puedes comenzar a usar todas las funciones de la plataforma.',
        icon: 'success',
        confirmButtonText: 'Continuar',
        confirmButtonColor: '#ff6b35',
      });
      
      this.router.navigate([redirectPath]);

    } catch (error: any) {
      console.error('❌ Error al completar perfil:', error);
      const msg = error?.response?.message ?? error?.message ?? 'No se pudo completar tu perfil. Intenta nuevamente.';
      this.showError(msg);
      Swal.fire({
        title: 'Error',
        text: msg,
        icon: 'error',
        confirmButtonText: 'Reintentar',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  // ========== LÓGICA CLIENT ==========

  private async submitClientProfile(): Promise<void> {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      this.showError('Por favor ingresa un teléfono válido');
      return;
    }

    const { phone } = this.clientForm.value;
    
    await this.pb.getInstance().collection('users').update(this.oauthUserId!, {
      phone: phone,
    });

    console.log('✅ Client profile updated:', { userId: this.oauthUserId, phone });
  }

  // ========== LÓGICA PROFESSIONAL ==========
// ========== NUEVO: Método para seleccionar/deseleccionar todos los zip codes ==========
toggleAllZipCodes(event: Event): void {
  const checkbox = event.target as HTMLInputElement;
  const zipCodesForCity = this.getFilteredZipCodes();
  
  if (checkbox.checked) {
    // Seleccionar todos los zip codes de la ciudad
    const allZipIds = zipCodesForCity.map((z: any) => z.id);
    this.professionalForm.patchValue({
      service_zips: allZipIds
    });
  } else {
    // Deseleccionar todos
    this.professionalForm.patchValue({
      service_zips: []
    });
  }
}

// ========== NUEVO: Verificar si todos están seleccionados ==========
areAllZipCodesSelected(): boolean {
  const zipCodesForCity = this.getFilteredZipCodes();
  const selectedZips = this.professionalForm.get('service_zips')?.value || [];
  
  if (zipCodesForCity.length === 0) return false;
  
  return zipCodesForCity.every((z: any) => selectedZips.includes(z.id));
}

// ========== NUEVO: Verificar si algunos están seleccionados (indeterminate) ==========
areSomeZipCodesSelected(): boolean {
  const selectedZips = this.professionalForm.get('service_zips')?.value || [];
  return selectedZips.length > 0 && !this.areAllZipCodesSelected();
}

// ========== NUEVO: Obtener texto del botón Select All ==========
getSelectAllText(): string {
  const zipCodesForCity = this.getFilteredZipCodes();
  const selectedCount = (this.professionalForm.get('service_zips')?.value || []).length;
  
  if (selectedCount === 0) {
    return `Select All (${zipCodesForCity.length})`;
  } else if (selectedCount === zipCodesForCity.length) {
    return `Deselect All`;
  } else {
    return `Select All (${zipCodesForCity.length})`;
  }
}
  async submitProfessionalProfile(): Promise<void> {
    if (this.professionalForm.invalid) {
      this.professionalForm.markAllAsTouched();
      this.showError('Por favor completa todos los campos requeridos');
      return;
    }

    this.isUploading.set(true);
    const pb = this.pb.getInstance();
    const formValue = this.professionalForm.value;

    try {
      // 1️⃣ Actualizar phone en users
      await pb.collection('users').update(this.oauthUserId!, {
        phone: formValue.phone,
      });

      // 2️⃣ Preparar datos para professional_profiles
      const profileData: any = {
        userId: this.oauthUserId!,
        full_name: formValue.full_name,
        experience_years: Number(formValue.experience_years),
        bio: formValue.bio,
        city: formValue.city,
        service_zips: formValue.service_zips,
        wallpaper_types: formValue.wallpaper_types,
        is_verified: false, // Requiere aprobación
      };

      // 3️⃣ Si hay fotos seleccionadas, crear con FormData
      if (this.selectedFiles.length > 0) {
        const formData = new FormData();
        
        // Agregar todos los campos
        Object.keys(profileData).forEach(key => {
          const value = profileData[key];
          if (Array.isArray(value)) {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value.toString());
          }
        });

        // Agregar las fotos (PocketBase las guarda en el campo file)
        this.selectedFiles.forEach((file, index) => {
          formData.append('portfolio_photos', file);
        });

        // Crear perfil con las fotos
        await pb.collection('professional_profiles').create(formData);
      } else {
        // Crear sin fotos
        await pb.collection('professional_profiles').create(profileData);
      }

      console.log('✅ Professional profile created');
      
    } catch (error) {
      throw error;
    } finally {
      this.isUploading.set(false);
    }
  }
// En complete-profile.component.ts

getFilePreview(file: File): string {
  return URL.createObjectURL(file);
}

getFileSize(file: File): string {
  const bytes = file.size;
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Limpia las URLs cuando se elimina un archivo


  // ========== UTILIDADES ==========

  private getRedirectPath(): string {
    switch (this.userType) {
      case 'professional': return '/home';
      case 'client': return '/home';
      default: return '/home';
    }
  }

  private clearOAuthSession(): void {
    sessionStorage.removeItem('oauth_user_id');
    sessionStorage.removeItem('oauth_user_type');
    sessionStorage.removeItem('oauth_user_name');
    sessionStorage.removeItem('oauth_user_email');
  }

  // ========== HELPERS PARA EL TEMPLATE ==========

  onWallpaperTypeChange(type: string, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const current = this.professionalForm.get('wallpaper_types')?.value || [];
    
    if (checkbox.checked) {
      this.professionalForm.patchValue({
        wallpaper_types: [...current, type]
      });
    } else {
      this.professionalForm.patchValue({
        wallpaper_types: current.filter((t: string) => t !== type)
      });
    }
  }

  isWallpaperTypeSelected(type: string): boolean {
    const selected = this.professionalForm.get('wallpaper_types')?.value || [];
    return selected.includes(type);
  }

  getExperienceError(): string | null {
    const ctrl = this.professionalForm.get('experience_years');
    if (ctrl?.hasError('required')) return 'Los años de experiencia son requeridos';
    if (ctrl?.hasError('min')) return 'No puede ser negativo';
    if (ctrl?.hasError('max')) return 'Valor máximo: 50 años';
    return null;
  }

  // Helper para obtener ciudad desde zip (útil para mostrar en UI)
  getCityForZip(zipCode: string): string {
    const zipRecord = this.zipCodesList.find(z => z.code === zipCode);
    return zipRecord ? zipRecord.city : '';
  }
}