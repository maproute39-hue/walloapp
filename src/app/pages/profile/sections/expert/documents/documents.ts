import { Component, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { PbService } from '@app/services/pb.service';
import { docsRequirement, CategoryLite, UserLike } from '@app/utils/doc-eligibility';

type DocKind = 'dni' | 'licence';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './documents.html',
  styleUrls: ['./documents.scss'],
})
export class Documents {
  router = inject(Router);
  pb = inject(PbService);

  // refs a inputs
  @ViewChild('dniInput') dniInput!: ElementRef<HTMLInputElement>;
  @ViewChild('licInput') licInput!: ElementRef<HTMLInputElement>;

  // estado base
  userId = '';
  dniNumber = '';

  // URLs existentes (servidor)
  existingDniUrl: string | null = null;
  existingLicenceUrl: string | null = null;

  // archivos nuevos seleccionados + previews
  fileDni: File | null = null;
  fileLicence: File | null = null;
  fileDniPreview: string | null = null;
  fileLicencePreview: string | null = null;

  // lógica de requisitos
  categories: CategoryLite[] = [];
  docReq!: ReturnType<typeof docsRequirement>;

  loading = true;

  // ===== Helpers internos =====
  private isPdfUrl(u?: string | null) {
    if (!u) return false;
    return u.toLowerCase().includes('.pdf') || u.toLowerCase().includes('application/pdf');
  }
  private isPdfFile(f?: File | null) {
    return !!f && f.type === 'application/pdf';
  }
  private thumb(url: string) {
    // PocketBase soporta ?thumb=WxH (o 0xH / Wx0)
    return url.includes('?') ? `${url}&thumb=0x300` : `${url}?thumb=0x300`;
  }

  // ===== Ciclo de vida =====
  async ngOnInit() {
    try {
      const uid = this.pb.currentUserId;
      if (!uid) throw new Error('Usuario no autenticado');
      this.userId = uid;

      const [cats, u] = await Promise.all([
        this.pb.getCategories(),
        this.pb.getUserExpanded(uid),
      ]);
      this.categories = cats as CategoryLite[];
      this.dniNumber = (u as any)?.dni || '';

      if (u?.expand?.['imageDni']) {
        const base = this.pb.fileUrl(u.expand['imageDni'], u.expand['imageDni'].image);
        this.existingDniUrl = this.thumb(base);
      }
      if (u?.expand?.['licence']) {
        const base = this.pb.fileUrl(u.expand['licence'], u.expand['licence'].image);
        this.existingLicenceUrl = this.thumb(base);
      }

      const userLikeInit: UserLike = {
        category: (u as any).category,
        selectedByUser: (u as any).selectedByUser,
        subCategoryIds: (u as any).subCategoryIds,
        imageDni: (u as any).imageDni,
        licence: (u as any).licence,
      };
      this.docReq = docsRequirement(this.categories, userLikeInit);
    } catch (e: any) {
      console.error(e);
      await Swal.fire({ icon: 'error', title: 'Error', text: e?.message || 'No se pudo cargar' });
    } finally {
      this.loading = false;
    }
  }

  // ===== Interacción =====
  openPicker(kind: DocKind) {
    if (kind === 'dni') this.dniInput?.nativeElement.click();
    else this.licInput?.nativeElement.click();
  }

  onPickFile(kind: DocKind, event: any) {
    const f: File = event?.target?.files?.[0];
    if (!f) return;

    const allowed = ['image/png','image/jpeg','image/jpg','image/webp','image/gif','application/pdf'];
    if (!allowed.includes(f.type)) {
      Swal.fire({ icon: 'error', title: 'Archivo no permitido', text: 'Sube JPG, PNG, WEBP o PDF.' });
      return;
    }
    const maxSize = 7 * 1024 * 1024;
    if (f.size > maxSize) {
      Swal.fire({ icon: 'error', title: 'Muy pesado', text: 'Máximo 7 MB.' });
      return;
    }

    const setPreview = (file: File, assign: (url: string|null)=>void) => {
      if (this.isPdfFile(file)) {
        assign('assets/images/document/pdf.png'); // ícono/preview genérico para PDF
      } else {
        const r = new FileReader();
        r.onload = (e: any) => assign(e.target.result as string);
        r.readAsDataURL(file);
      }
    };

    if (kind === 'dni') {
      this.fileDni = f;
      setPreview(f, (url) => this.fileDniPreview = url);
    } else {
      this.fileLicence = f;
      setPreview(f, (url) => this.fileLicencePreview = url);
    }

    event.target.value = '';
  }

  // ===== Guardar =====
  async saveAll(): Promise<void> {
    if (!this.docReq) this.docReq = docsRequirement(this.categories, this.pb.currentUser || {});

    // si la cat lo exige, validamos obligatoriedad
    if (this.docReq.needDni && !this.fileDni && !this.existingDniUrl) {
      await Swal.fire({ icon: 'error', title: 'Falta DNI', text: 'Sube tu DNI.' });
      return;
    }
    if (this.docReq.needLicence && !this.fileLicence && !this.existingLicenceUrl) {
      await Swal.fire({ icon: 'error', title: 'Falta licencia', text: 'Sube tu licencia.' });
      return;
    }

    // si no hay nada que subir (y no era obligatorio)
    if (!this.fileDni && !this.fileLicence) {
      await Swal.fire({ icon: 'info', title: 'Sin cambios', text: 'No seleccionaste archivos para subir.' });
      return;
    }

    this.loading = true;
    try {
      let imageDniId: string | undefined;
      let licenceId: string | undefined;

      // 1) subir imágenes a 'images'
      if (this.fileDni) {
        const img = await this.pb.uploadImage(this.fileDni, 'id'); // type: 'id'
        imageDniId = img.id;
      }
      if (this.fileLicence) {
        const img = await this.pb.uploadImage(this.fileLicence, 'licence'); // type: 'licence'
        licenceId = img.id;
      }

      // 2) actualizar relaciones en 'users'
      const payload: any = {};
      if (imageDniId) payload.imageDni = imageDniId;
      if (licenceId) payload.licence = licenceId;

      if (Object.keys(payload).length) {
        await this.pb.updateUser(this.userId, payload);
      }

      // 3) refrescar URLs y limpiar previews locales
      if (imageDniId) {
        const rec = await this.pb.getImageById(imageDniId);
        const base = this.pb.fileUrl(rec, rec['image']);
        this.existingDniUrl = this.thumb(base);
        this.fileDni = null;
        this.fileDniPreview = null;
      }
      if (licenceId) {
        const rec = await this.pb.getImageById(licenceId);
        const base = this.pb.fileUrl(rec, rec['image']);
        this.existingLicenceUrl = this.thumb(base);
        this.fileLicence = null;
        this.fileLicencePreview = null;
      }

      // 4) recomputar requisitos con UserLike
      const u = await this.pb.getUserExpanded(this.userId);
      const userLike: UserLike = {
        category: (u as any).category,
        selectedByUser: (u as any).selectedByUser,
        subCategoryIds: (u as any).subCategoryIds,
        imageDni: (u as any).imageDni,
        licence: (u as any).licence,
      };
      this.docReq = docsRequirement(this.categories, userLike);

      await Swal.fire({ icon: 'success', title: 'Guardado', timer: 1200, showConfirmButton: false });
    } catch (e: any) {
      console.error(e);
      await Swal.fire({ icon: 'error', title: 'Error', text: e?.message || 'No se pudo guardar' });
    } finally {
      this.loading = false;
    }
  }

  // ===== Listas para la vista =====
  submittedList() {
    const list: { title: string; url: string; icon: string }[] = [];
    if (this.existingDniUrl) {
      list.push({ title: 'DNI', url: this.existingDniUrl, icon: 'assets/images/document/1.png' });
    }
    if (this.existingLicenceUrl) {
      list.push({ title: 'Licencia de conducir', url: this.existingLicenceUrl, icon: 'assets/images/document/2.png' });
    }
    return list;
  }

  pendingList() {
    // siempre permitir DNI (opcional si la cat NO lo exige)
    const items: { title: string; kind: DocKind }[] = [];
    if (!this.existingDniUrl) {
      const optional = !this.docReq?.needDni;
      items.push({ title: optional ? 'DNI' : 'DNI', kind: 'dni' });
    }
    // licencia solo si la regla la exige (ej. Logística)
    if (this.docReq?.needLicence && !this.existingLicenceUrl) {
      items.push({ title: 'Licencia de conducir', kind: 'licence' });
    }
    return items;
  }

  // Exponer helpers a la plantilla si los usas en [src]
  isPdf(url?: string | null) { return this.isPdfUrl(url); }
}
