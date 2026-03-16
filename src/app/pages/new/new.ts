import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { 
  FormsModule, 
  ReactiveFormsModule, 
  FormGroup, 
  FormControl, 
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';

import { RequestService, CreateRequestDTO } from '../../services/request.service';
import { PocketbaseService } from '../../services/pocketbase.service';
import { PhoneAuthService } from '../../services/phone-auth.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-new',
  standalone:true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule,RouterLink],
  templateUrl: './new.html',
  styleUrl: './new.scss'
})
export class NewRequestComponent implements OnInit, OnDestroy {
   icons: { [key: string]: SafeHtml } = {};
   hasActiveRequest: boolean = false;
    // ========== NUEVO: Datos para autocomplete ==========
  zipCodesList: any[] = [];           // Lista completa de zip codes de PocketBase
  filteredCities: string[] = [];      // Ciudades filtradas para datalist
  filteredZips: string[] = [];        // Zip codes filtrados para datalist
  selectedCity: string = '';   
  // ========== CONTROL DE PASOS ==========
  step: number = 1; // 1: Proyecto, 2: Registro, 3: OTP, 4: Éxito
  otpId: string = '';
  
  // ========== ESTADOS DE UI ==========
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  // ========== FORMULARIO DE PROYECTO ==========
  projectForm!: FormGroup;
  // photos: File[] = [];

  photos: File[] = [];
photoPreviews: string[] = [];

  // ========== FORMULARIO DE AUTENTICACIÓN ==========
  phoneForm!: FormGroup;
  otpForm!: FormGroup;

  // ========== DATOS DEL USUARIO ==========
  fullPhone: string = '';
  // Usuario simulado para pruebas
  mockUserId: string = '' ;

  // Validadores personalizados
  static phoneValidator(control: AbstractControl): ValidationErrors | null {
    const phone = control.value;
    if (!phone) return null;
    
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.length < 7 || digits.length > 10) {
      return { invalidPhone: true };
    }
    return null;
  }

  static otpValidator(control: AbstractControl): ValidationErrors | null {
    const otp = control.value;
    if (!otp) return null;
    
    // Aceptamos cualquier código de 6 dígitos para pruebas
    if (!/^\d{6}$/.test(otp)) {
      return { invalidOtp: true };
    }
    return null;
  }

  constructor(
     private http: HttpClient,
    private sanitizer: DomSanitizer,
    private router: Router,
    private requestService: RequestService,
    private pbService: PocketbaseService,
    public phoneAuth: PhoneAuthService
  ) {}
private async checkActiveRequests(userId: string): Promise<boolean> {
  try {
    const pb = this.pbService.getInstance();

    const result = await pb.collection('requests').getList(1, 1, {
      filter: `client_id="${userId}" && (status="sent" || status="reviewing")`
    });

    return result.totalItems > 0;
  } catch (error) {
    console.error('Error checking active requests:', error);
    throw error;
  }
}
  ngOnInit(): void {
    this.initForms();
  this.loadZipCodesForAutocomplete();
  this.initializeIcons();
  this.preloadActiveRequestStatus();
  }

  ngOnDestroy(): void {
    // No hay timers que limpiar porque usamos el sistema nativo
      this.clearPhotoPreviews();

  }
  private rebuildPhotoPreviews(): void {
  this.clearPhotoPreviews(false);
  this.photoPreviews = this.photos.map(file => URL.createObjectURL(file));
}

private clearPhotoPreviews(clearArray: boolean = true): void {
  this.photoPreviews.forEach(url => URL.revokeObjectURL(url));
  if (clearArray) {
    this.photoPreviews = [];
  }
}
  async loadIcons(iconNames: string[]) {
    for (const name of iconNames) {
      try {
        const svg = await this.http
          .get(`assets/iconsax/iconsax-${name}.svg`, { responseType: 'text' })
          .toPromise();
        if (svg) {
          this.icons[name] = this.sanitizer.bypassSecurityTrustHtml(svg);
        }
      } catch (error) {
        console.error(`Error loading icon ${name}:`, error);
      }
    }
  }

  private initializeIcons(): void {
    // Initialize iconsax library after component loads
    setTimeout(() => {
      if (typeof window !== 'undefined' && (window as any).iconsax) {
        (window as any).iconsax();
      }
    }, 100);
  }
    // ========== NUEVO: Cargar zip codes desde PocketBase ==========
  async loadZipCodesForAutocomplete(): Promise<void> {
    try {
      // Obtener zip codes activos de NC (ajusta el filtro según necesites)
      const records = await this.pbService.getInstance()
        .collection('zipcodes')
        .getList(1, 2000, {
          filter: 'active = true && state = "NC"',
          sort: 'city,code'
        });

      this.zipCodesList = records.items;
      
      // Extraer ciudades únicas para el datalist de ciudad
      const cities = [...new Set(
        this.zipCodesList.map((z: any) => z.city)
      )].sort();
      
      this.filteredCities = cities;
      
    } catch (error) {
      console.error('Error cargando zip codes:', error);
      // Fallback: lista mínima para que no falle la UI
      this.filteredCities = ['Raleigh', 'Charlotte', 'Durham'];
    }
  }

  // ========== NUEVO: Filtrar ciudades mientras escribe ==========
  onCityInput(event: Event): void {
    const input = (event.target as HTMLInputElement).value.toLowerCase();
    
    if (input.length >= 2) {
      this.filteredCities = [...new Set(
        this.zipCodesList
          .filter((z: any) => z.city.toLowerCase().includes(input))
          .map((z: any) => z.city)
      )].sort().slice(0, 10); // Limitar a 10 sugerencias
    } else {
      // Recargar todas las ciudades si borra
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
    
    // Filtrar zip codes de esa ciudad
    const zips = this.zipCodesList
      .filter((z: any) => z.city === city)
      .map((z: any) => z.code)
      .sort();
    
    this.filteredZips = zips;
    
    // Actualizar el campo de zip_code en el formulario
    this.projectForm.patchValue({ zip_code: '' });
  }

  // ========== NUEVO: Filtrar zip codes mientras escribe ==========
  onZipInput(event: Event): void {
    const input = (event.target as HTMLInputElement).value;
    
    if (this.selectedCity && input.length >= 1) {
      this.filteredZips = this.zipCodesList
        .filter((z: any) => 
          z.city === this.selectedCity && 
          z.code.startsWith(input)
        )
        .map((z: any) => z.code)
        .sort()
        .slice(0, 10);
    } else if (!this.selectedCity && input.length >= 3) {
      // Si no hay ciudad seleccionada, buscar por código en todo NC
      this.filteredZips = this.zipCodesList
        .filter((z: any) => z.code.startsWith(input))
        .map((z: any) => z.code)
        .sort()
        .slice(0, 10);
    } else {
      // Mostrar todos los zips de la ciudad seleccionada
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
    
    // Buscar el registro completo en nuestra lista local
    const zipRecord = this.zipCodesList.find((z: any) => z.code === zipCode);
    
    if (zipRecord) {
      // Auto-completar ciudad y estado si están en el formulario
      this.projectForm.patchValue({
        city: zipRecord.city
        // Si tienes campo de estado: state: zipRecord.state
      });
      this.selectedCity = zipRecord.city;
    }
  }

  private initForms(): void {
    // Formulario de proyecto
    this.projectForm = new FormGroup({
      city: new FormControl('', Validators.required),
      zip_code: new FormControl('', Validators.required),
      space_type: new FormControl('', Validators.required),
         client_phone: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[0-9+\-\s()]{7,15}$/)
    ]),
      size_sqm: new FormControl(null, [Validators.required, Validators.min(1)]),
      height_m: new FormControl(null),
      wallpaper_type: new FormControl('', Validators.required),
      desired_date: new FormControl(''),
      budget_range: new FormControl(''),
      intention_level: new FormControl('', Validators.required),
    });

    // Formulario de teléfono (paso 2)
    this.phoneForm = new FormGroup({
      countryCode: new FormControl('58', Validators.required),
      phone: new FormControl('', [
        Validators.required,
        NewRequestComponent.phoneValidator
      ])
    });

    // Formulario de OTP (paso 3)
    this.otpForm = new FormGroup({
      otp: new FormControl('', [
        Validators.required,
        NewRequestComponent.otpValidator
      ])
    });
  }

  // ========== GETTERS PARA EL TEMPLATE ==========
  get isStep1(): boolean { return this.step === 1; }
  get isStep2(): boolean { return this.step === 2; }
  get isStep3(): boolean { return this.step === 3; }

  // ========== NAVEGACIÓN ENTRE PASOS ==========
private async preloadActiveRequestStatus(): Promise<void> {
  try {
    const currentUser = this.pbService.getInstance().authStore.model;

    if (!currentUser?.id) {
      this.hasActiveRequest = false;
      return;
    }

    this.hasActiveRequest = await this.checkActiveRequests(currentUser.id);
  } catch (error) {
    console.error('Error preloading active request status:', error);
    this.hasActiveRequest = false;
  }
}
async nextStep(): Promise<void> {
  if (this.step === 1) {
    if (!this.validateProjectForm()) return;

    const currentUser = this.pbService.getCurrentUser?.() || this.pbService.getInstance().authStore.model;

    if (currentUser?.id) {
      try {
        const hasActiveRequest = await this.checkActiveRequests(currentUser.id);

        if (hasActiveRequest) {
          this.showError('You already have an active request with status sent or reviewing. You can create a new one only when it is closed.');
          return;
        }
      } catch (error) {
        this.showError('Could not validate your current requests. Please try again.');
        return;
      }
    }

    this.step = 2;
  }
}
// ========== LOGIN CON APPLE ==========
async loginWithApple() {
  try {
    this.isLoading = true;
    this.errorMessage = '';

    const pb = this.pbService.getInstance();

    const authData = await pb.collection('users').authWithOAuth2({
      provider: 'apple',
    });

    const user = authData.record;

    if (!this.projectForm.valid) {
      this.showError('Please complete the project form first.');
      return;
    }

    // 🔎 Verificar si el usuario ya tiene solicitudes activas
    const activeRequests = await pb.collection('requests').getList(1, 1, {
      filter: `client_id="${user.id}" && (status="sent" || status="reviewing")`
    });

    if (activeRequests.totalItems > 0) {
      this.showError(
        'You already have an active request. You can create a new one only when the current request is closed.'
      );
      this.step = 1;
      return;
    }

    // ✅ Crear solicitud
    await this.submitRequestToBackend(user.id);

    this.step = 4;
    this.showSuccess('Request created successfully!');

    setTimeout(() => {
      this.router.navigate(['/home']);
    }, 2000);

  } catch (error: any) {
    console.error('❌ Error Apple:', error);
    this.showError('Error with Apple. Try with Google or phone.');
  } finally {
    this.isLoading = false;
  }
}
  prevStep(): void {
    if (this.step > 1) {
      this.step--;
      this.clearMessages();
      
      // Si retrocedemos al paso 2, resetear OTP
      if (this.step === 2) {
        this.otpForm.reset();
      }
    }
  }

  // ========== VALIDACIONES ==========

  private validateProjectForm(): boolean {
    if (this.projectForm.invalid) {
      this.showError('Please complete all required fields.');
      this.projectForm.markAllAsTouched();
      return false;
    }
    return true;
  }

  // ========== FLUJO DE REGISTRO CON TELÉFONO ==========

  async onRegisterPhone() {
    try {
      this.isLoading = true;
      const { countryCode, phone } = this.phoneForm.value;
      const fullPhone = `${countryCode}${phone}`;
      
      try {
        // Intentamos usar el servicio real primero
        const response = await this.phoneAuth.requestOTP(fullPhone);
        this.otpId = response.otpId;
      } catch (error) {
        // Si falla el servicio real, simulamos un otpId para pruebas
        console.log('Usando modo simulación para OTP');
        this.otpId = 'mock-otp-id-' + Date.now();
      }
      
      // Guardar el teléfono y avanzar al paso 3
      this.fullPhone = fullPhone;
      this.step = 3;
      this.showSuccess('Código enviado a tu teléfono 📱 (Modo simulación: cualquier código de 6 dígitos funciona)');
      
    } catch (error: any) {
      this.showError(error.message);
    } finally {
      this.isLoading = false;
    }
  }

  // ========== VERIFICACIÓN OTP SIMULADA + CREAR SOLICITUD ==========

  async onVerifyOTP() {
    try {
      this.isLoading = true;
      const { otp } = this.otpForm.value;
      
      // SIMULACIÓN: Cualquier código de 6 dígitos es válido
      if (otp && otp.length === 6 && /^\d+$/.test(otp)) {
        console.log('✅ Código OTP válido (simulación):', otp);
        
        try {
          // Intentamos verificar con el servicio real (probablemente fallará)
          await this.phoneAuth.verifyOTP(this.otpId, otp);
        } catch (error) {
          console.log('Usando autenticación simulada');
          // En modo simulación, creamos un usuario mock en el authStore
          // Esto es solo para que el flujo continúe
        }
        
        // Crear solicitud con el usuario mock
        await this.submitRequestToBackend(this.mockUserId);
        
        // Mostrar paso de éxito
        this.step = 4;
        this.showSuccess('¡Request created successfully! Redirecting...');
        
        // Redirigir después de 2 segundos
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 2000);
      } else {
        throw new Error('Invalid code. Must be a 6-digit number.');
      }
      
    } catch (error: any) {
      this.showError(error.message);
    } finally {
      this.isLoading = false;
    }
  }

  // ========== ENVÍO DE SOLICITUD AL BACKEND ==========
private normalizePhone(phone: string): string {
  return (phone || '').replace(/[^\d+]/g, '').trim();
}

// private normalizePhone(phone: string): string {
//   return (phone || '').replace(/\D/g, '');
// }

// ========== LOGIN CON GOOGLE ==========



async loginWithGoogle() {
  try {
    this.isLoading = true;
    this.errorMessage = '';

    const pb = this.pbService.getInstance();

    const authData = await pb.collection('users').authWithOAuth2({
      provider: 'google',
    });

    let user = authData.record;
    console.log('✅ Login Google exitoso:', user);

    const clientPhone = this.normalizePhone(this.projectForm.value.client_phone || '');

    // Preparar actualización del usuario
    const updatePayload: any = {};

    if (!user['type'] || user['type'] === '') {
      updatePayload.type = 'client';
    }

    if (clientPhone) {
      updatePayload.phone = clientPhone;
    }

    // Actualizar usuario si hace falta
    if (Object.keys(updatePayload).length > 0) {
      try {
        user = await pb.collection('users').update(user.id, updatePayload);
        console.log('🔄 Usuario actualizado:', updatePayload);
      } catch (updateError: any) {
        console.warn('⚠️ No se pudo actualizar el usuario:', updateError?.message);
      }
    }

    // Solo crear request si viene del flujo de creación
    if (this.step === 2) {
      if (!this.projectForm.valid) {
        this.showError('Please complete the project form first.');
        this.step = 1;
        return;
      }

      // Verificar si ya tiene una request activa
      const activeRequests = await pb.collection('requests').getList(1, 1, {
        filter: `client_id="${user.id}" && (status="sent" || status="reviewing")`
      });

   if (activeRequests.totalItems > 0) {
  this.hasActiveRequest = true;

  await Swal.fire({
    icon: 'warning',
    title: 'Active request found',
    text: 'You already have an active request. You can create a new one only when the current request is closed.',
    confirmButtonText: 'OK',
    confirmButtonColor: '#3085d6'
  });

  this.step = 1;
  return;
}

      // Crear request
      await this.submitRequestToBackend(user.id);

      this.hasActiveRequest = false;
      this.step = 4;
      this.showSuccess('¡Request created successfully! Redirecting...');

      setTimeout(() => {
        this.router.navigate(['/home']);
      }, 2000);
    } else {
      this.showSuccess('Welcome! ' + (user['name'] || user['email']));
    }

  } catch (error: any) {
    console.error('❌ Error en login Google:', error);

    if (error?.message?.includes('popup')) {
      this.showError('The popup was blocked. Allow pop-ups to continue.');
    } else if (error?.message?.includes('cancelled')) {
      this.showError('Login cancelled by user');
    } else {
      this.showError('Error signing in with Google. Try again.');
    }
  } finally {
    this.isLoading = false;
  }
}
onClientPhoneInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  const cleanValue = input.value.replace(/[^0-9]/g, '');
  this.projectForm.patchValue(
    { client_phone: cleanValue },
    { emitEvent: false }
  );
}
// new.ts - Método submitRequestToBackend
private async submitRequestToBackend(userId: string): Promise<void> {
  try {
    const pb = this.pbService.getInstance();

    const hasActiveRequest = await this.checkActiveRequests(userId);
    if (hasActiveRequest) {
      throw new Error('You already have an active request. Close it before creating a new one.');
    }

    const user = await pb.collection('users').getOne(userId);

    const clientPhone = this.normalizePhone(this.projectForm.value.client_phone || '');

    const requestData: any = {
      client_id: userId,
      client_name: user['name'] || user['email'] || '',
      client_phone: clientPhone,
      city: this.projectForm.value.city,
      zip_code: this.projectForm.value.zip_code,
      space_type: this.projectForm.value.space_type,
      size_sqm: this.projectForm.value.size_sqm!,
      height_m: this.projectForm.value.height_m || undefined,
      wallpaper_type: this.projectForm.value.wallpaper_type,
      desired_date: this.projectForm.value.desired_date || undefined,
      budget_range: this.projectForm.value.budget_range || undefined,
      intention_level: this.projectForm.value.intention_level,
      status: 'sent',
      sold_leads: 0,
      max_leads: 3
    };

    const request = await pb.collection('requests').create(requestData);
    console.log('✅ Request creado:', request.id);

    if (this.photos.length > 0) {
      const photoIds: string[] = [];

      for (let i = 0; i < this.photos.length; i++) {
        const photo = this.photos[i];

        const formData = new FormData();
        formData.append('request_id', request.id);
        formData.append('file', photo);
        formData.append('sort_order', i.toString());
        formData.append('is_primary', (i === 0).toString());

        const photoRecord = await pb.collection('request_photos').create(formData);
        photoIds.push(photoRecord.id);
        console.log(`📸 Foto ${i + 1} subida:`, photoRecord.id);
      }

      await pb.collection('requests').update(request.id, {
        photos: photoIds
      });

      console.log('✅ Fotos relacionadas:', photoIds);
    }

  } catch (error) {
    console.error('❌ Error creating request:', error);
    throw error;
  }
}
  // ========== MANEJO DE ARCHIVOS ==========

onFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement;

  if (!input.files?.length) return;

  const selectedFiles = Array.from(input.files).filter(file =>
    file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024
  );

  if (selectedFiles.length === 0) {
    this.showError('Only images are allowed (max. 5MB)');
    input.value = '';
    return;
  }

  // Combinar con las fotos ya seleccionadas
  const combined = [...this.photos, ...selectedFiles];

  if (combined.length > 5) {
    this.showError('Maximum 5 photos allowed');
    input.value = '';
    return;
  }

  this.photos = combined;
  this.rebuildPhotoPreviews();

  this.showSuccess(`${this.photos.length} photo(s) selected`);

  // Permite volver a escoger el mismo archivo si el usuario quiere
  input.value = '';
}
removePhoto(index: number): void {
  if (index < 0 || index >= this.photos.length) return;

  this.photos.splice(index, 1);
  this.rebuildPhotoPreviews();

  this.showSuccess('Photo deleted');
}

  // ========== UTILIDADES DE UI ==========

  private showError(message: string): void {
    console.error('Error:', message);
    this.errorMessage = message;
    this.successMessage = '';
    setTimeout(() => this.errorMessage = '', 5000);
  }

  private showSuccess(message: string): void {
    console.log('Success:', message);
    this.successMessage = message;
    this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 5000);
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  // ========== HELPER METHODS FOR TEMPLATE ==========

  getCityForZip(zipCode: string): string {
    const zipRecord = this.zipCodesList.find(z => z.code === zipCode);
    return zipRecord ? zipRecord.city : '';
  }

  /**
   * Cancelar y volver al inicio  
   */
cancelFlow(): void {
  this.phoneForm.reset();
  this.otpForm.reset();
  this.projectForm.reset();

  this.photos = [];
  this.clearPhotoPreviews();

  this.step = 1;
  this.clearMessages();
}

  /**
   * Obtener mensaje de ayuda para el OTP según el modo
   */
  getOtpHelperText(): string {
    return 'Enter any 6-digit code (simulation mode)';
  }
}