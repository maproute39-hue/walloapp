import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { RequestService, CreateRequestDTO } from '../../services/request.service';
import { PocketbaseService } from '../../services/pocketbase.service';

// @Component({
//   selector: 'app-new-request',
//   standalone: true,
//   imports: [CommonModule, FormsModule, RouterLink],
//   templateUrl: './new-request.component.html',
//   styleUrls: ['./new-request.component.scss']
// })
@Component({
  selector: 'app-new',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './new.html',
  styleUrl: './new.scss'
})
export class NewRequestComponent implements OnInit {
  // Control de pasos visuales
  step: number = 1; // 1: Formulario proyecto, 2: Registro/OTP, 3: Verificación, 4: Éxito
  
  // Estados de carga
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  // Datos del formulario de proyecto
  projectForm!: FormGroup;
  photos: File[] = [];

  // Datos de registro
  authForm = {
    phone: '',
    countryCode: '58', // Venezuela por defecto
    otp: '',
    rol:'client',
    email: '' // Se genera internamente
  };

  // Referencia al userId después del registro
  private userId: string | null = null;

  constructor(
    private router: Router,
    public authService: AuthService,
    private requestService: RequestService,
    private pbService: PocketbaseService
  ) {}

  ngOnInit(): void {
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
  }

  // ========== MÉTODOS DE NAVEGACIÓN ==========

  nextStep(): void {
    if (this.step === 1) {
      // Validar formulario de proyecto antes de avanzar
      if (!this.validateProjectForm()) return;
      this.step = 2;
    }
  }

  prevStep(): void {
    if (this.step > 1) this.step--;
  }

  // ========== VALIDACIONES ==========

  private validateProjectForm(): boolean {
    if (this.projectForm.invalid) {
      this.showError('Por favor completa todos los campos obligatorios');
      return false;
    }
    return true;
  }

  // ========== FLUJO DE REGISTRO CON TELÉFONO ==========

async onRegisterPhone(): Promise<void> {
  if (!this.authForm.phone) {
    this.showError('Ingresa tu número de teléfono');
    return;
  }

  this.isLoading = true;
  this.errorMessage = '';

  try {
    // 1️⃣ Normalizar teléfono PRIMERO (misma lógica que el backend)
    const fullPhone = `${this.authForm.countryCode}${this.authForm.phone}`;
    const phoneNormalized = fullPhone.replace(/[^0-9]/g, ''); // Solo dígitos
    
    // 2️⃣ Registrar teléfono en backend
    const response = await this.authService.registerWithPhone(fullPhone);

    // 3️⃣ Ajustar nombre de campo según respuesta real del backend
    this.userId = response.userId || response.userId; 
    
    // 4️⃣ Generar email sintético EXACTAMENTE como lo hace el backend
    // this.authForm.email = `${phoneNormalized}@wallo.usuario`;
    this.authForm.email = `${phoneNormalized}@wallo.app`;
    // 🔍 Debug: verificar que coinciden
    console.log('📧 Email para OTP:', this.authForm.email);
    console.log('👤 userId obtenido:', this.userId);

    // 5️⃣ Solicitar OTP con el email generado
    await this.authService.requestOTP(this.authForm.email);

    // 6️⃣ Avanzar a verificación
    this.step = 3;
    this.showSuccess('Código enviado a tu teléfono');

  } catch (error: any) {
    console.error('❌ Error en registro:', error);
    this.showError(error.message || 'Error en el registro');
  } finally {
    this.isLoading = false;
  }
}

  // ========== VERIFICACIÓN OTP Y CREACIÓN DE SOLICITUD ==========

  async onVerifyOTP(): Promise<void> {
    if (!this.authForm.otp || this.authForm.otp.length < 4) {
      this.showError('Ingresa el código de verificación');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      // 1️⃣ Verificar OTP y autenticar
      const isAuthenticated = await this.authService.verifyOTP(
        this.authForm.email, 
        this.authForm.otp
      );

      if (!isAuthenticated || !this.userId) {
        throw new Error('Verificación fallida');
      }

      // 2️⃣ AHORA crear la solicitud con el userId autenticado
      await this.submitRequestToBackend();

      // 3️⃣ Redirigir al panel de seguimiento
      this.router.navigate(['/tracking', this.userId]);

    } catch (error: any) {
      this.showError(error.message || 'Error en la verificación');
    } finally {
      this.isLoading = false;
    }
  }

  // ========== ENVÍO DE SOLICITUD AL BACKEND ==========

  private async submitRequestToBackend(): Promise<void> {
    if (!this.userId) {
      throw new Error('Usuario no autenticado');
    }

    const payload: CreateRequestDTO = {
      client_id: this.userId,
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

    await this.requestService.createRequest(payload);
  }

  // ========== MANEJO DE ARCHIVOS ==========

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      // Limitar a 5 fotos y 5MB cada una
      const files = Array.from(input.files).filter(file => 
        file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024
      );
      this.photos = files;
    }
  }

  // ========== UTILIDADES DE UI ==========

  private showError(message: string): void {
    this.errorMessage = message;
    this.successMessage = '';
    // Auto-ocultar después de 5 segundos
    setTimeout(() => this.errorMessage = '', 5000);
  }

  private showSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 5000);
  }

  // Helper para el template
  get isStep1(): boolean { return this.step === 1; }
  get isStep2(): boolean { return this.step === 2; }
  get isStep3(): boolean { return this.step === 3; }
}