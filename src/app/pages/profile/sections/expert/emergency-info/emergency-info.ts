import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthPocketbaseService } from '@app/services/auth-pocketbase.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-emergency-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './emergency-info.html',
  styleUrls: ['./emergency-info.scss'] // <-- plural
})
export class EmergencyInfo {
  router = inject(Router);
  private auth = inject(AuthPocketbaseService);
  private fb = inject(FormBuilder);

  emergencyForm!: FormGroup;
  isLoading = false;
  user: any = null;

  ngOnInit(): void {
    this.initForm();
    this.loadUserData();
  }

  private initForm() {
    this.emergencyForm = this.fb.group({
      emergencyContact1Name: [''],
      emergencyContact1Phone: [''], // llegará string desde el input
      emergencyContact2Name: [''],
      emergencyContact2Phone: [''],
      bloodType: [''],
      rhFactor: [''],
      preexistingConditions: [''],
      allergies: [''],
      currentMedication: [''],
      medicalNotes: ['']
    });
  }

  private async loadUserData() {
    try {
      this.isLoading = true;
      // fuerza leer desde servidor para ver datos realmente guardados:
      this.user = await this.auth.fetchCurrentUser() ?? this.auth.currentUser();

      if (this.user) {
        this.emergencyForm.patchValue({
          emergencyContact1Name: this.user.emergencyContact1Name ?? '',
          emergencyContact1Phone: this.user.emergencyContact1Phone ?? '',
          emergencyContact2Name: this.user.emergencyContact2Name ?? '',
          emergencyContact2Phone: this.user.emergencyContact2Phone ?? '',
          bloodType: this.user.bloodType ?? '',
          rhFactor: this.user.rhFactor ?? '',
          preexistingConditions: this.user.preexistingConditions ?? '',
          allergies: this.user.allergies ?? '',
          currentMedication: this.user.currentMedication ?? '',
          medicalNotes: this.user.medicalNotes ?? ''
        });
      }
    } catch (error) {
      console.error('Error al cargar los datos del usuario:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los datos de emergencia. Inténtalo de nuevo.'
      });
    } finally {
      this.isLoading = false;
    }
  }

  private toNumberOrNull(v: unknown): number | null {
    const s = (v ?? '').toString().trim();
    if (!s) return null;
    const n = Number(s.replace(/[^\d]/g, '')); // solo dígitos
    return Number.isFinite(n) ? n : null;
  }

  async onSubmit() {
    if (this.emergencyForm.invalid) return;

    try {
      this.isLoading = true;
      const formValue = this.emergencyForm.getRawValue();

      // Normaliza tipos para el schema de PocketBase
      const data = {
        emergencyContact1Name: formValue.emergencyContact1Name?.trim() || '',
        emergencyContact1Phone: this.toNumberOrNull(formValue.emergencyContact1Phone),
        emergencyContact2Name: formValue.emergencyContact2Name?.trim() || '',
        emergencyContact2Phone: this.toNumberOrNull(formValue.emergencyContact2Phone),
        bloodType: formValue.bloodType || '',
        rhFactor: formValue.rhFactor || '',
        preexistingConditions: formValue.preexistingConditions?.trim() || '',
        allergies: formValue.allergies?.trim() || '',
        currentMedication: formValue.currentMedication?.trim() || '',
        medicalNotes: formValue.medicalNotes?.trim() || ''
      };

      const record = await this.auth.updateProfile(data);

      // MUY IMPORTANTE: refrescar el modelo auth para que la app vea los cambios
      await this.auth.refreshAuth();

      await Swal.fire({
        icon: 'success',
        title: '¡Datos de emergencia actualizados!',
        text: 'Tus datos de emergencia se han guardado correctamente',
        showConfirmButton: false,
        timer: 1800
      });

      this.router.navigate(['/profile']);
    } catch (error) {
      console.error('Error al guardar los datos de emergencia:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron guardar los cambios. Por favor, inténtalo de nuevo.'
      });
    } finally {
      this.isLoading = false;
    }
  }
}
