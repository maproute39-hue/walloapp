import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { PbService } from '@app/services/pb.service';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './wallet.html',
  styleUrls: ['./wallet.scss']
})
export class Wallet {
  router = inject(Router);
  pb = inject(PbService);

  availableBalance: number = 0;
  pendingBalance: number = 0;
  // Estado
  file: File | null = null;
  previewUrl: string | ArrayBuffer | null = null;

  balance: number = 0;
  transactions: any[] = [];

  deposito = {
    method: '' as 'agente' | 'yape' | 'plin' | '',
    amount: null as number | null,
    note: ''
  };

  loading = false;

  // ===== Ciclo de vida =====
  async ngOnInit() {
    await this.loadWallet();
      await this.loadWallet();
  await this.loadBalances();  
  }

 

  // ===== Cargar archivo comprobante =====
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0] || null;
    this.file = null;

    if (!file) return;

    const maxBytes = 5 * 1024 * 1024;
    const okType = /^image\/(png|jpe?g|webp)$/i.test(file.type);

    if (!okType) {
      Swal.fire('Formato inválido', 'Solo se permiten JPG, PNG o WEBP.', 'error');
      return;
    }
    if (file.size > maxBytes) {
      Swal.fire('Archivo muy grande', 'El comprobante debe ser menor a 5MB.', 'error');
      return;
    }

    this.file = file;
    const reader = new FileReader();
    reader.onload = () => (this.previewUrl = reader.result);
    reader.readAsDataURL(file);
  }

  // ===== Enviar depósito =====
  async submitDeposit(): Promise<void> {
    if (!this.deposito.method) {
      Swal.fire('Campo obligatorio', 'Selecciona un método de pago.', 'warning');
      return;
    }
    if (!this.deposito.amount || this.deposito.amount < 20 || this.deposito.amount > 500) {
      Swal.fire('Monto inválido', 'Debe ser entre S/20 y S/500.', 'warning');
      return;
    }
    if (!this.file) {
      Swal.fire('Falta comprobante', 'Debes subir una imagen del pago.', 'warning');
      return;
    }

    try {
      this.loading = true;
      const user = this.pb.currentUser;
      if (!user?.id) throw new Error('Usuario no autenticado');

      // 1️⃣ Subir comprobante a `images`
      const img = await this.pb.uploadImage(this.file, 'wallet-proof');

      // 2️⃣ Crear depósito usando el método del servicio
      await this.pb.createWalletDeposit({
        userId: user.id,
        amount: this.deposito.amount!,
        currency: 'pen',
        method: this.deposito.method,
        note: this.deposito.note || '',
        receiptId: img.id
      });

      Swal.fire('Enviado', 'Tu comprobante fue cargado y está pendiente de aprobación.', 'success');

      // 3️⃣ Reset UI
      this.deposito = { method: '', amount: null, note: '' };
      this.file = null;
      this.previewUrl = null;

      // 4️⃣ Recargar cartera
      await this.loadWallet();
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'No se pudo enviar el depósito.', 'error');
    } finally {
      this.loading = false;
    }
  }
   // ===== Cargar saldo e historial =====

 async loadWallet() {
  try {
    const user = this.pb.currentUser;
    if (!user?.id) throw new Error('Usuario no autenticado');

    const list = await this.pb.listMyWalletEntries(user.id); // sin status = todo el historial
    this.transactions = list.items || [];

    // Si quieres mantener balance “disponible” antiguo:
    this.balance = await this.pb.computeBalance(user.id); // approved
  } catch (e) {
    console.error(e);
    Swal.fire('Error', 'No se pudo cargar tu cartera', 'error');
  }
}

async loadBalances() {
  const userId = this.pb.currentUserId;
  if (!userId) return;

  const approvedPage = await this.pb.listMyWalletEntries(userId, 'approved');
  const pendingPage  = await this.pb.listMyWalletEntries(userId, 'pending');

  this.availableBalance = approvedPage.items.reduce((sum, it) => sum + Number(it['amount'] || 0), 0);
  this.pendingBalance   = pendingPage.items.reduce((sum, it) => sum + Number(it['amount'] || 0), 0);
}

}
