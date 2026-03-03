import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { PbService } from '@app/services/pb.service';
import {
  Payment, PaymentType,
  YapePayment, PlinPayment, BankPayment
} from '@app/models/payment.models';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './payment.html',
  styleUrls: ['./payment.scss']
})
export class PaymentComponent {
  router = inject(Router);
  pb = inject(PbService);
  showForm = false;  // Controls form visibility

  payments: Payment[] = [];
  loading = true;
  userDni: string | undefined;
  userName: string | undefined;

  // formulario dinámico
  form: any = {
    type: 'yape' as PaymentType,
    alias: '',
    // yape/plin
    phone: '',
    documentType: undefined as ('DNI'|'CE'|'RUC'|undefined),
    documentNumber: '',
    // bank
    bankName: '',
    accountType: 'ahorro' as ('ahorro'|'corriente'),
    accountNumber: '',
    cci: '',
    holderName: '',
  };

  editId: string | null = null;
  qrFile?: File;
  qrPreview: string | null = null;

 async ngOnInit() {
  try {
    const uid = this.pb.currentUserId;
    if (!uid) throw new Error('Usuario no autenticado');

    const user = await this.pb.getUserExpanded(uid);
    this.userDni = user?.['dni'];
    this.userName = user?.['name'];

    // Usar setTimeout para asegurar la actualización de la UI
    setTimeout(() => {
      if (this.userName) {
        this.form.holderName = this.userName;
        console.log('Asignado form.holderName:', this.form.holderName);
      }
    });

    this.payments = await this.pb.getUserPayments(uid);

    if (this.userDni && !this.form.documentNumber) {
      this.form.documentType = 'DNI';
      this.form.documentNumber = this.userDni;
    }

  } catch (e) {
    console.error('Error en ngOnInit:', e);
    this.payments = [];
  } finally {
    this.loading = false;
  }
}


  trackByPayment = (_: number, p: Payment) => p.id;

  labelOf(p: Payment): string {
    if (p.alias) return p.alias;
    if (p.type === 'bank') return `${p.bankName} (${p.accountType})`;
    return p.type === 'yape' ? 'Yape' : 'Plin';
  }

  onTypeChange() {
    // limpia y re-aplica sugerencia de DNI si existe
    this.form.phone = '';
    this.form.bankName = '';
    this.form.accountType = 'ahorro';
    this.form.accountNumber = '';
    this.form.cci = '';
    this.form.holderName = '';
    this.qrFile = undefined;
    this.qrPreview = null;

    if (this.userDni) {
      this.form.documentType = 'DNI';
      this.form.documentNumber = this.userDni;
    } else {
      this.form.documentType = undefined;
      this.form.documentNumber = '';
    }
  }

  onQrSelected(ev: any) {
    const file = ev?.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      Swal.fire({ icon: 'error', title: 'Archivo no válido', text: 'Debe ser una imagen' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({ icon: 'error', title: 'Muy grande', text: 'Máximo 5MB' });
      return;
    }
    this.qrFile = file;
    const r = new FileReader();
    r.onload = (e: any) => this.qrPreview = e.target.result;
    r.readAsDataURL(file);
    ev.target.value = '';
  }

  removeQr() {
    this.qrFile = undefined;
    this.qrPreview = null;
  }

  edit(p: Payment) {
    this.editId = p.id;
    this.showForm = true;  // Ensure form is visible when editing
    this.form.type = p.type;
    this.form.alias = p.alias ?? '';

    if (this.isWallet(p)) {
      this.form.phone = p.phone;
      this.form.documentType = p.documentType ?? (this.userDni ? 'DNI' : undefined);
      this.form.documentNumber = p.documentNumber ?? (this.userDni ?? '');
      this.qrPreview = p.qr?.url ?? null;
      this.qrFile = undefined;
    } else {
      this.form.bankName = p.bankName;
      this.form.accountType = p.accountType;
      this.form.accountNumber = p.accountNumber;
      this.form.cci = p.cci ?? '';
      this.form.holderName = p.holderName;
      this.form.documentType = p.documentType ?? (this.userDni ? 'DNI' : undefined);
      this.form.documentNumber = p.documentNumber ?? (this.userDni ?? '');
      this.qrFile = undefined;
      this.qrPreview = null;
    }
  }

  cancelEdit() {
    this.editId = null;
    this.showForm = false;  // Hide the form
    this.qrFile = undefined;
    this.qrPreview = null;
    this.form = {
      type: 'yape',
      alias: '',
      phone: '',
      documentType: this.userDni ? 'DNI' : undefined,
      documentNumber: this.userDni || '',
      bankName: '',
      accountType: 'ahorro',
      accountNumber: '',
      cci: '',
      holderName: ''
    };
  }

  async save() {
    try {
      const uid = this.pb.currentUserId;
      if (!uid) throw new Error('Usuario no autenticado');

      // completar doc con DNI del perfil si falta
      if (!this.form.documentNumber && this.userDni) {
        this.form.documentType = 'DNI';
        this.form.documentNumber = this.userDni;
      }

      // Validaciones Perú
      if (this.form.type === 'yape' || this.form.type === 'plin') {
        if (!/^\d{9}$/.test(this.form.phone)) {
          throw new Error('El teléfono debe tener 9 dígitos.');
        }
      }
      if (this.form.type === 'bank') {
        if (!this.form.bankName) throw new Error('Selecciona un banco.');
        if (!this.form.accountNumber?.trim()) throw new Error('Ingresa el número de cuenta.');
        if (this.form.cci && !/^\d{20}$/.test(this.form.cci)) throw new Error('El CCI debe tener 20 dígitos.');
        if (!this.form.holderName?.trim()) throw new Error('Ingresa el titular de la cuenta.');
        if (!this.form.documentType || !this.form.documentNumber?.trim()) throw new Error('Documento del titular es requerido.');
        if (this.form.documentType === 'DNI' && !/^\d{8}$/.test(this.form.documentNumber)) throw new Error('DNI inválido (8 dígitos).');
        if (this.form.documentType === 'RUC' && !/^\d{11}$/.test(this.form.documentNumber)) throw new Error('RUC inválido (11 dígitos).');
      }

      // Subir QR si corresponde
      let newQr: any = null;
      if ((this.form.type === 'yape' || this.form.type === 'plin') && this.qrFile) {
        newQr = await this.pb.uploadImage(this.qrFile, 'qr');
      }

      const now = new Date().toISOString();
      const base = {
        id: this.editId ?? ((crypto as any).randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2,8)}`),
        alias: this.form.alias?.trim() || undefined,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      };

      let toSave: Payment;
      if (this.form.type === 'yape' || this.form.type === 'plin') {
        toSave = {
          ...base,
          type: this.form.type,
          phone: this.form.phone,
          documentType: this.form.documentType,
          documentNumber: this.form.documentNumber?.trim() || undefined,
          qr: newQr ? newQr : (this.editId ? (this.payments.find(p => p.id === this.editId) as any)?.qr : undefined),
        };
      } else {
        toSave = {
          ...base,
          type: 'bank',
          bankName: this.form.bankName,
          accountType: this.form.accountType,
          accountNumber: this.form.accountNumber?.trim(),
          cci: this.form.cci?.trim() || undefined,
          holderName: this.form.holderName?.trim(),
          documentType: this.form.documentType,
          documentNumber: this.form.documentNumber?.trim(),
        };
      }

      await this.pb.upsertPayment(uid, toSave);
      this.payments = await this.pb.getUserPayments(uid);

      await Swal.fire({ icon: 'success', title: this.editId ? 'Actualizado' : 'Guardado', timer: 1200, showConfirmButton: false });
      this.cancelEdit();
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err?.message || 'No se pudo guardar' });
    }
  }

  async remove(p: Payment) {
    const ok = await Swal.fire({
      icon: 'warning',
      title: 'Eliminar medio de pago',
      text: `¿Eliminar "${this.labelOf(p)}" solo de tu perfil?`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!ok.isConfirmed) return;

    const uid = this.pb.currentUserId;
    if (!uid) return;

    await this.pb.deletePayment(uid, p.id, false);
    this.payments = await this.pb.getUserPayments(uid);
  }

  async setDefault(p: Payment) {
    const uid = this.pb.currentUserId;
    if (!uid) return;
    await this.pb.setDefaultPayment(uid, p.id);
    this.payments = await this.pb.getUserPayments(uid);
  }

  // type guards
  isWallet(p: Payment): p is YapePayment | PlinPayment {
    return p.type === 'yape' || p.type === 'plin';
  }
  isBank(p: Payment): p is BankPayment {
    return p.type === 'bank';
  }
}
