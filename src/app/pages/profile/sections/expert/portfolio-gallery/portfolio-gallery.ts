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
  photos: PortfolioPhoto[] = [];
  profileId: string | null = null;

  // Lightbox
  lightboxOpen = false;
  activeIndex = 0;

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

  async onDeletePhoto(index: number, event: Event) {
    event.stopPropagation();
    
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Eliminar foto',
      text: '¿Eliminar esta foto de tu portfolio?',
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
}