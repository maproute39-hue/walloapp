import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthPocketbaseService } from '@app/services/auth-pocketbase.service';
import { PbService } from '@app/services/pb.service';

type SubStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'expired';

@Component({
  selector: 'app-suscription-plan',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './suscription-plan.html',
  styleUrls: ['./suscription-plan.scss'],
})
export class SuscriptionPlan implements OnInit, OnDestroy {
  private pollId: any;

  copied = false;
  previewUrl: string | ArrayBuffer | null = null;
  statusMsg = '';
  statusOk = false;

  // estado de suscripción
  subStatus: SubStatus = 'none';
  subscription: any | null = null;   // último registro (para endDate, etc.)
  subLoading = false;

  form = {
    paymentMethod: '' as 'yape' | 'plin' | '',
    note: '',
    agree: false,
  };

  file: File | null = null;

  constructor(
    private pb: PbService,
    private authService: AuthPocketbaseService
  ) {}

  async ngOnInit() {
    await this.loadSubscriptionStatus();
    // polling liviano cada 15s para reflejar aprobación del admin
    this.pollId = setInterval(() => this.loadSubscriptionStatus(), 15000);
  }

  ngOnDestroy() {
    if (this.pollId) clearInterval(this.pollId);
  }

  get canSubmit(): boolean {
    return !!this.form.paymentMethod && this.form.agree;
  }

  async copyText(text: string | null | undefined) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text.trim());
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0] || null;
    this.file = null;

    if (!file) return;

    const maxBytes = 5 * 1024 * 1024; // 5MB
    const okType = /^image\/(png|jpe?g|webp)$/i.test(file.type);
    if (!okType) {
      this.statusMsg = 'Formato no permitido. Usa JPG/PNG/WEBP.';
      this.statusOk = false;
      return;
    }
    if (file.size > maxBytes) {
      this.statusMsg = 'El archivo supera 5MB.';
      this.statusOk = false;
      return;
    }

    this.file = file;

    const reader = new FileReader();
    reader.onload = () => (this.previewUrl = reader.result);
    reader.readAsDataURL(file);
  }

  async submitProof(): Promise<void> {
    if (!this.canSubmit || !this.file) {
      this.statusMsg = 'Completa método, aceptación y agrega el comprobante.';
      this.statusOk = false;
      return;
    }

    try {
      const currentUser = this.authService.currentUser();
      if (!currentUser?.id) {
        this.statusMsg = 'No se obtuvo el usuario. Inicia sesión.';
        this.statusOk = false;
        return;
      }

      // 1) Subir imagen a `images`
      const imgRec = await this.pb.uploadImage(this.file, 'subscription-proof'); // { id, url, type }

      // 2) Fechas: inicia hoy, termina en 30 días
      const start = new Date();
      const end = new Date(start);
      end.setDate(end.getDate() + 30);

      // 3) Crear registro en `subscriptions` (FormData para fechas)
      const subFd = new FormData();
      subFd.append('userId', currentUser.id);
      subFd.append('status', 'pending');
      subFd.append('paymentMethod', this.form.paymentMethod);
      if (this.form.note) subFd.append('note', this.form.note);

      // Si `paymentProof` es relación a images => usar id
      subFd.append('paymentProof', imgRec.id);

      // Guardar fechas (asegúrate de tener startDate/endDate en PB)
      subFd.append('startDate', start.toISOString());
      subFd.append('endDate', end.toISOString());

      await this.pb.createRecord('subscriptions', subFd);

      // Reset UI
      this.statusMsg = 'Comprobante enviado correctamente. Tu plan está en revisión.';
      this.statusOk = true;
      this.form = { paymentMethod: '', note: '', agree: false };
      this.previewUrl = null;
      this.file = null;

      // refrescar estado
      await this.loadSubscriptionStatus();
    } catch (error: any) {
      console.error('Error al enviar el comprobante:', error);
      if (error?.data) console.error('Detalle PB:', JSON.stringify(error.data, null, 2));
      this.statusMsg = 'Error al enviar el comprobante. Revisa permisos y formatos.';
      this.statusOk = false;
    } finally {
      setTimeout(() => (this.statusMsg = ''), 5000);
    }
  }

  private async loadSubscriptionStatus() {
    try {
      this.subLoading = true;
      const user = this.authService.currentUser();
      if (!user?.id) {
        this.subStatus = 'none';
        this.subscription = null;
        return;
      }

      // obtener la última suscripción del usuario
      const res = await this.pb.pb.collection('subscriptions').getList(1, 1, {
        filter: `userId="${user.id}"`,
        sort: '-created',
      });

      const last = res.items?.[0];
      this.subscription = last ?? null;

      let s: SubStatus = (last?.['status'] as SubStatus) ?? 'none';

      // si está aprobada pero endDate ya pasó, marcar como expired en la UI
      const end = last?.['endDate'] ? new Date(last['endDate']) : null;
      if (s === 'approved' && end && end.getTime() < Date.now()) {
        s = 'expired';
      }

      this.subStatus = s;
    } catch (e) {
      console.error('loadSubscriptionStatus error', e);
      this.subStatus = 'none';
      this.subscription = null;
    } finally {
      this.subLoading = false;
    }
  }
}
