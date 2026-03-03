import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectorRef, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { PbService } from '../../../../../services/pb.service';
import { Gallery, GalleryImage } from '../../../../../models/gallery.models';
declare global {
  interface Window { iconsax?: (opts?: any) => void; }
}
@Component({
  selector: 'app-add-gallery',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ReactiveFormsModule],
  templateUrl: './add-gallery.html',
  styleUrl: './add-gallery.scss'
})
export class AddGallery implements OnInit, OnDestroy, AfterViewInit {
  router = inject(Router);
  route = inject(ActivatedRoute);
  cdr = inject(ChangeDetectorRef);
  pb = inject(PbService);

  // Campos del formulario
  title = '';
  description = '';

  // Manejo de imágenes
  selectedImages: File[] = [];
  imagePreviews: string[] = [];

  existingImages: GalleryImage[] = [];
  removedExistingIds: Set<string> = new Set();

  loading = false;
  isEdit = false;
  galleryId: string | null = null;

  constructor() {}
 ngOnInit() {
    this.route.queryParamMap.subscribe(async params => {
      const id = params.get('id');
      if (!id) {
        // modo crear
        this.isEdit = false;
        this.galleryId = null;
        return;
      }

      // modo editar
      this.isEdit = true;
      this.galleryId = id;

      const userId = this.pb.currentUserId;
      if (!userId) return;

      try {
        const g = await this.pb.getGalleryById(userId, id);
        if (!g) {
          Swal.fire({ icon: 'error', title: 'No encontrada', text: 'La galería no existe' });
          this.router.navigate(['../gallery'], { relativeTo: this.route });
          return;
        }
        this.title = g.title;
        this.description = g.description || '';
        this.existingImages = [...(g.images || [])];
        this.imagePreviews = []; // solo para nuevas
      } catch (err) {
        console.error(err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la galería' });
      }
    });
  }
  ngAfterViewInit() {
    // Protegido para no reventar SSR / tests
    if (typeof window !== 'undefined' && typeof window.iconsax === 'function') {
      window.iconsax();          // o window.iconsax({ /* options */ })
    }
  }
  ngOnDestroy() {
    // Protegido para no reventar SSR / tests
    if (typeof window !== 'undefined' && typeof window.iconsax === 'function') {
      window.iconsax();          // o window.iconsax({ /* options */ })
    }
  }
  onImageSelected(event: any) {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file.type.match('image.*')) {
        Swal.fire({ icon: 'error', title: 'Error', text: `El archivo ${file.name} no es una imagen válida`, timer: 3000 });
        continue;
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        Swal.fire({ icon: 'error', title: 'Error', text: `La imagen ${file.name} es demasiado grande (máx. 5MB)`, timer: 3000 });
        continue;
      }

      this.selectedImages.push(file);

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreviews.push(e.target.result);
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }

    event.target.value = '';
  }



  async onSubmit() {
    if (this.loading) return;
    if (!this.title.trim()) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'El nombre del trabajo es obligatorio', timer: 2500 });
      return;
    }

    this.loading = true;

    try {
      const userId = this.pb.currentUserId;
      if (!userId) throw new Error('Usuario no autenticado');

      // subir nuevas
      const uploaded: GalleryImage[] = [];
      for (const file of this.selectedImages) {
        const img = await this.pb.uploadImage(file, 'work');
        uploaded.push(img);
      }

      if (!this.isEdit) {
        // CREAR
        const newGallery: Gallery = {
          id: (crypto as any).randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
          title: this.title.trim(),
          description: this.description?.trim() ?? '',
          images: uploaded,
          createdAt: new Date().toISOString()
        };
        const galleries = await this.pb.getUserGalleries(userId);
        galleries.unshift(newGallery);
        await this.pb.setUserGalleries(userId, galleries);
        await Swal.fire({ icon: 'success', title: '¡Guardado!', text: 'Galería creada correctamente', timer: 1500, showConfirmButton: false });
      } else {
        // EDITAR
        if (!this.galleryId) throw new Error('ID de galería no válido');

        // 1) Borrar en servidor las imágenes existentes que marcaste para eliminar
        if (this.removedExistingIds.size > 0) {
          await Promise.allSettled(
            Array.from(this.removedExistingIds).map(id => this.pb.deleteImageRecord(id))
          );
        }

        // 2) Galería actual desde server (para conservar createdAt)
        const current = await this.pb.getGalleryById(userId, this.galleryId);
        if (!current) throw new Error('La galería ya no existe');

        // 3) Fusionar: las que quedaron + nuevas
        const finalImages = [...this.existingImages, ...uploaded];

        const updated: Gallery = {
          ...current,
          title: this.title.trim(),
          description: this.description?.trim() ?? '',
          images: finalImages
        };

        await this.pb.replaceGallery(userId, updated);
        await Swal.fire({ icon: 'success', title: 'Actualizada', text: 'Galería editada correctamente', timer: 1500, showConfirmButton: false });
      }

      // reset & volver
      this.title = '';
      this.description = '';
      this.selectedImages = [];
      this.imagePreviews = [];
      this.existingImages = [];
      this.removedExistingIds.clear();
      this.cdr.detectChanges();

      this.router.navigate(['../gallery'], { relativeTo: this.route });
    } catch (err: any) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'Error', text: err?.message || 'No se pudo guardar' });
    } finally {
      this.loading = false;
    }
  }

  removeImage(index: number) {
    this.selectedImages.splice(index, 1);
    this.imagePreviews.splice(index, 1);
  }

  // In add-gallery.ts
async removeExistingImage(img: GalleryImage, idx: number) {
  const confirm = await Swal.fire({
    title: '¿Eliminar imagen?',
    text: '¿Estás seguro de que quieres eliminar esta imagen?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  });

  if (confirm.isConfirmed) {
    this.removedExistingIds.add(img.id);
    this.existingImages.splice(idx, 1);
    this.cdr.detectChanges();
  }
}

// Also update the removeNewImage method for consistency
async removeNewImage(index: number) {
  const confirm = await Swal.fire({
    title: '¿Eliminar imagen?',
    text: '¿Estás seguro de que quieres eliminar esta imagen?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  });

  if (confirm.isConfirmed) {
    this.selectedImages.splice(index, 1);
    this.imagePreviews.splice(index, 1);
  }
}

// In add-gallery.ts
goBack() {
  this.router.navigate(['/profile/gallery']);
}

}
