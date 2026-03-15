import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PocketbaseService } from '@app/services/pocketbase.service';
import Swal from 'sweetalert2';

interface PortfolioPhoto {
  id: string;
  url: string;
  filename: string;
}

@Component({
  selector: 'app-portfolio-gallery',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './portfolio-gallery.html',
  styleUrl: './portfolio-gallery.scss'
})
export class PortfolioGalleryComponent implements OnInit {
  router = inject(Router);
  pb = inject(PocketbaseService);

  isLoading = signal(false);
  isUploading = signal(false);
  uploadProgress = signal(0);
  
  photos: PortfolioPhoto[] = [];
  selectedFiles: File[] = [];
  filePreviews: string[] = [];
  profileId: string | null = null;

  // Lightbox
  lightboxOpen = false;
  activeIndex = 0;

  MAX_PHOTOS = 10;
  MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  async ngOnInit() {
    await this.loadPortfolio();
  }

  async loadPortfolio() {
    this.isLoading.set(true);
    try {
      const user = this.pb.getCurrentUser();
      const userId = user?.id;
      
      if (!userId) throw new Error('No autenticado');

      const profiles = await this.pb.getInstance()
        .collection('professional_profiles')
        .getList(1, 1, {
          filter: `userId = "${userId}"`
        });

      if (profiles.items.length === 0) {
        this.photos = [];
        return;
      }

      const profile = profiles.items[0];
      this.profileId = profile.id;

      const photoFiles: string[] = profile['portfolio_photos'] || [];
      
      this.photos = photoFiles.map((filename: string) => ({
        id: filename,
        url: `${this.pb.getInstance().baseUrl}/api/files/professional_profiles/${profile.id}/${filename}`,
        filename: filename
      }));

    } catch (err) {
      console.error('Error cargando portfolio:', err);
      Swal.fire('Error', 'No se pudo cargar el portfolio', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  // ========== UPLOAD METHODS ==========

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    
    if (!files || files.length === 0) return;

    // Calcular cuántas fotos podemos agregar
    const currentCount = this.photos.length + this.selectedFiles.length;
    const availableSlots = this.MAX_PHOTOS - currentCount;

    if (availableSlots <= 0) {
      Swal.fire('Límite alcanzado', 
        `Solo puedes tener máximo ${this.MAX_PHOTOS} fotos en tu portfolio`, 
        'warning');
      input.value = '';
      return;
    }

    // Validar y filtrar archivos
    const validFiles: File[] = [];
    
    for (let i = 0; i < Math.min(files.length, availableSlots); i++) {
      const file = files[i];
      
      // Validar tipo
      if (!file.type.startsWith('image/')) {
        Swal.fire('Archivo inválido', 
          `El archivo "${file.name}" no es una imagen válida`, 
          'error');
        continue;
      }

      // Validar tamaño
      if (file.size > this.MAX_FILE_SIZE) {
        Swal.fire('Archivo muy grande', 
          `La imagen "${file.name}" supera los 5MB`, 
          'error');
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      input.value = '';
      return;
    }

    // Agregar archivos seleccionados
    this.selectedFiles = [...this.selectedFiles, ...validFiles];
    
    // Crear previews
    validFiles.forEach(file => {
      this.filePreviews.push(URL.createObjectURL(file));
    });

    // Limpiar input
    input.value = '';

    // Mostrar mensaje si se excedió el límite
    if (files.length > availableSlots) {
      Swal.fire('Atención', 
        `Solo se agregaron ${availableSlots} foto(s). Límite máximo: ${this.MAX_PHOTOS}`, 
        'info');
    }
  }

  getFilePreview(index: number): string {
    return this.filePreviews[index];
  }

  getFileSize(file: File): string {
    const bytes = file.size;
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  removeSelectedFile(index: number) {
    // Revocar URL para liberar memoria
    URL.revokeObjectURL(this.filePreviews[index]);
    
    this.selectedFiles.splice(index, 1);
    this.filePreviews.splice(index, 1);
    
    this.selectedFiles = [...this.selectedFiles];
    this.filePreviews = [...this.filePreviews];
  }

  cancelUpload() {
    // Revocar todas las URLs
    this.filePreviews.forEach(url => URL.revokeObjectURL(url));
    
    this.selectedFiles = [];
    this.filePreviews = [];
    this.uploadProgress.set(0);
  }

  async uploadPhotos() {
    if (this.selectedFiles.length === 0 || !this.profileId) return;

    this.isUploading.set(true);
    this.uploadProgress.set(0);

    try {
      // Obtener las fotos actuales
      const currentPhotos = this.photos.map(p => p.filename);
      
      // Simular progreso (mientras se suben los archivos)
      const progressInterval = setInterval(() => {
        this.uploadProgress.update(val => Math.min(val + 10, 90));
      }, 200);

      // Preparar FormData con TODAS las fotos (existentes + nuevas)
      const formData = new FormData();
      
      // Agregar fotos existentes
      currentPhotos.forEach(filename => {
        formData.append('portfolio_photos', filename);
      });

      // Agregar nuevas fotos
      this.selectedFiles.forEach(file => {
        formData.append('portfolio_photos', file);
      });

      // Actualizar en PocketBase
      await this.pb.getInstance()
        .collection('professional_profiles')
        .update(this.profileId, formData);

      clearInterval(progressInterval);
      this.uploadProgress.set(100);

      // Esperar un momento para mostrar 100%
      await new Promise(resolve => setTimeout(resolve, 300));

      // Limpiar y recargar
      this.cancelUpload();
      await this.loadPortfolio();

      Swal.fire({
        icon: 'success',
        title: '¡Fotos agregadas!',
        text: `Se agregaron ${this.selectedFiles.length} foto(s) correctamente`,
        timer: 2000,
        showConfirmButton: false
      });

    } catch (err) {
      console.error('Error subiendo fotos:', err);
      Swal.fire('Error', 'No se pudieron subir las fotos. Intenta nuevamente.', 'error');
    } finally {
      this.isUploading.set(false);
    }
  }

  // ========== DELETE METHODS ==========

  async onDeletePhoto(index: number, event: Event) {
    event.stopPropagation();
    
    const photo = this.photos[index];
    
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Eliminar foto',
      text: `¿Eliminar "${photo.filename}" de tu portfolio?`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
      const newPhotos = this.photos
        .filter((_, i) => i !== index)
        .map(p => p.filename);

      await this.pb.getInstance()
        .collection('professional_profiles')
        .update(this.profileId!, {
          portfolio_photos: newPhotos
        });

      await this.loadPortfolio();
      
      Swal.fire({
        icon: 'success',
        title: 'Eliminada',
        timer: 1500,
        showConfirmButton: false
      });

    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo eliminar la foto', 'error');
    }
  }

  // ========== LIGHTBOX METHODS ==========

  openLightbox(index: number) {
    this.activeIndex = index;
    this.lightboxOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeLightbox() {
    this.lightboxOpen = false;
    document.body.style.overflow = '';
  }

  nextImage() {
    if (this.photos.length === 0) return;
    this.activeIndex = (this.activeIndex + 1) % this.photos.length;
  }

  prevImage() {
    if (this.photos.length === 0) return;
    this.activeIndex = (this.activeIndex - 1 + this.photos.length) % this.photos.length;
  }

  selectThumb(index: number) {
    this.activeIndex = index;
  }

  // ========== CLEANUP ==========

  ngOnDestroy() {
    // Limpiar previews para evitar memory leaks
    this.filePreviews.forEach(url => URL.revokeObjectURL(url));
  }
}