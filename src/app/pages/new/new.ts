import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
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
import { RouterLink } from '@angular/router';

import { RequestService, CreateRequestDTO } from '../../services/request.service';
import { PocketbaseService } from '../../services/pocketbase.service';
import { PhoneAuthService } from '../../services/phone-auth.service';

@Component({
  selector: 'app-new',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './new.html',
  styleUrl: './new.scss'
})
export class NewRequestComponent implements OnInit, OnDestroy {
  // ========== CONTROL DE PASOS ==========
  step: number = 1; // 1: Proyecto, 2: Registro, 3: OTP, 4: Éxito
  otpId: string = '';
  
  // ========== ESTADOS DE UI ==========
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  // ========== FORMULARIO DE PROYECTO ==========
  projectForm!: FormGroup;
  photos: File[] = [];

  // ========== FORMULARIO DE AUTENTICACIÓN ==========
  phoneForm!: FormGroup;
  otpForm!: FormGroup;

  // ========== DATOS DEL USUARIO ==========
  fullPhone: string = '';
  // Usuario simulado para pruebas
  mockUserId: string = 'alvekaoo07856t0' ;

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
    private router: Router,
    private requestService: RequestService,
    private pbService: PocketbaseService,
    public phoneAuth: PhoneAuthService
  ) {}

  ngOnInit(): void {
    this.initForms();
  }

  ngOnDestroy(): void {
    // No hay timers que limpiar porque usamos el sistema nativo
  }

  private initForms(): void {
    // Formulario de proyecto
    this.projectForm = new FormGroup({
      city: new FormControl('', Validators.required),
      zip_code: new FormControl('', Validators.required),
      space_type: new FormControl('', Validators.required),
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

  nextStep(): void {
    if (this.step === 1) {
      if (!this.validateProjectForm()) return;
      this.step = 2;
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
      this.showError('Por favor completa todos los campos obligatorios');
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
        this.showSuccess('¡Solicitud creada con éxito! Redirigiendo...');
        
        // Redirigir después de 2 segundos
        setTimeout(() => {
          this.router.navigate(['/tracking', this.mockUserId]);
        }, 2000);
      } else {
        throw new Error('Código inválido. Debe ser un número de 6 dígitos');
      }
      
    } catch (error: any) {
      this.showError(error.message);
    } finally {
      this.isLoading = false;
    }
  }

  // ========== ENVÍO DE SOLICITUD AL BACKEND ==========

  private async submitRequestToBackend(userId: string): Promise<void> {
    try {
      const payload: CreateRequestDTO = {
        client_id: userId,
        city: this.projectForm.value.city,
        zip_code: this.projectForm.value.zip_code,
        space_type: this.projectForm.value.space_type,
        size_sqm: this.projectForm.value.size_sqm!,
        height_m: this.projectForm.value.height_m || undefined,
        wallpaper_type: this.projectForm.value.wallpaper_type,
        desired_date: this.projectForm.value.desired_date || undefined,
        budget_range: this.projectForm.value.budget_range || undefined,
        intention_level: this.projectForm.value.intention_level as 'low' | 'medium' | 'high',
        photos: this.photos
      };

      console.log('📦 Enviando solicitud:', payload);
      await this.requestService.createRequest(payload);
      console.log('✅ Solicitud creada exitosamente');
      
    } catch (error) {
      console.error('Error al crear solicitud:', error);
      throw error;
    }
  }

  // ========== MANEJO DE ARCHIVOS ==========

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    
    if (input.files?.length) {
      // Limitar a 5 fotos y 5MB cada una
      const files = Array.from(input.files).filter(file => 
        file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024
      );
      
      if (files.length > 5) {
        this.showError('Máximo 5 fotos permitidas');
        return;
      }
      
      if (files.length === 0) {
        this.showError('Solo se permiten imágenes (máx. 5MB)');
        return;
      }
      
      this.photos = files;
      this.showSuccess(`${files.length} foto(s) seleccionada(s)`);
    }
  }

  removePhoto(index: number): void {
    this.photos.splice(index, 1);
    this.showSuccess('Foto eliminada');
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

  /**
   * Cancelar y volver al inicio  
   */
  cancelFlow(): void {
    this.phoneForm.reset();
    this.otpForm.reset();
    this.projectForm.reset();
    this.photos = [];
    this.step = 1;
    this.clearMessages();
  }

  /**
   * Obtener mensaje de ayuda para el OTP según el modo
   */
  getOtpHelperText(): string {
    return 'Introduce cualquier código de 6 dígitos (modo simulación)';
  }
}