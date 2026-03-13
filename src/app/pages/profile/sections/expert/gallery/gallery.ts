import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PbService } from '../../../../../services/pb.service';
import { Gallery } from '../../../../../models/gallery.models';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './gallery.html',
  styleUrl: './gallery.scss'
})
export class GalleryComponent implements OnInit {
  router = inject(Router);
  route = inject(ActivatedRoute);
  pb = inject(PbService);

  galleries: Gallery[] = [];
  loading = true;

  // Lightbox state
  lightboxOpen = false;
  activeGallery: Gallery | null = null;
  activeIndex = 0;

  async ngOnInit() {
    try {
      const userId = this.pb.currentUserId;
      if (!userId) throw new Error('Usuario no autenticado');
      this.galleries = await this.pb.getUserGalleries(userId);
    } catch (err) {
      console.error('Error al cargar galerías:', err);
      this.galleries = [];
    } finally {
      this.loading = false;
    }
  }

  /** Devuelve la URL de portada (primera imagen) con fallback a un placeholder */
  coverOf(g: Gallery): string {
    const imgs = g?.images || [];
    return imgs.length ? imgs[0].url : 'assets/images/placeholder.jpg';
  }

  openLightbox(gallery: Gallery, index = 0) {
    if (!gallery?.images?.length) return;
    this.activeGallery = gallery;
    this.activeIndex = Math.min(Math.max(index, 0), gallery.images.length - 1);
    this.lightboxOpen = true;
    document.body.style.overflow = 'hidden'; // bloquea scroll del body
  }

  closeLightbox() {
    this.lightboxOpen = false;
    this.activeGallery = null;
    this.activeIndex = 0;
    document.body.style.overflow = '';
  }

  nextImage() {
    if (!this.activeGallery?.images?.length) return;
    const len = this.activeGallery.images.length;
    this.activeIndex = (this.activeIndex + 1) % len;
  }

  prevImage() {
    if (!this.activeGallery?.images?.length) return;
    const len = this.activeGallery.images.length;
    this.activeIndex = (this.activeIndex - 1 + len) % len;
  }

  selectThumb(i: number) {
    if (!this.activeGallery?.images?.length) return;
    this.activeIndex = Math.min(Math.max(i, 0), this.activeGallery.images.length - 1);
  }

  trackByGallery = (_: number, g: Gallery) => g.id;

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (!this.lightboxOpen) return;
    if (e.key === 'Escape') this.closeLightbox();
    if (e.key === 'ArrowRight') this.nextImage();
    if (e.key === 'ArrowLeft') this.prevImage();
  }
  async onDeleteGallery(g: Gallery) {
    const ok = await Swal.fire({
      icon: 'warning',
      title: 'Eliminar galería',
      text: `¿Eliminar "${g.title}" solo de tu perfil? `,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancel'
    });
  
    if (!ok.isConfirmed) return;
  
    const userId = this.pb.currentUserId;
    if (!userId) return;
  
    try {
      await this.pb.deleteGallery(userId, g.id, false); // ← solo quita del JSON "works"
      await Swal.fire({ icon: 'success', title: 'Eliminada', timer: 1200, showConfirmButton: false });
  
      // recargar lista
      this.galleries = await this.pb.getUserGalleries(userId);
    } catch (err:any) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'Error', text: err?.message || 'No se pudo eliminar' });
    }
  }
  

onEditGallery(g: Gallery) {
  this.router.navigate(
    ['/profile', { outlets: { panel: ['expert', 'add-gallery'] } }],
    { queryParams: { id: g.id } }
  );
}  

// In gallery.ts
navigateToAddGallery(gallery?: Gallery) {
  if (gallery) {
    // Edit mode
    this.router.navigate(['/profile/add-gallery'], { 
      queryParams: { id: gallery.id } 
    });
  } else {
    // Add new mode
    this.router.navigate(['/profile/add-gallery']);
  }
}
// gallery.ts
goToAddGallery(id?: string) {
  this.router.navigate(
    ['/profile', { outlets: { panel: ['add-gallery'] } }],
    { queryParams: id ? { id } : undefined }
  );
}

// Update your template to use this method:
// Replace the edit button with:

}
