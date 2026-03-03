import { Component, AfterViewInit, Input } from '@angular/core';
import { AuthPocketbaseService } from '@app/services/auth-pocketbase.service';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RouterOutlet } from "@angular/router";
import { docsRequirement, CategoryLite } from '@app/utils/doc-eligibility';

@Component({
  selector: 'app-expert',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, RouterModule],
  templateUrl: './expert.html',
  styleUrl: './expert.scss'
})
export class Expert implements AfterViewInit {
  @Input() user: any;  // 👈 recibimos el usuario desde el padre
  @Input() categories: CategoryLite[] = []; // 👈 necesario

  currentRoute: string = '';

  constructor(
    private authService: AuthPocketbaseService,
    private router: Router,
    
  ) {}
  ngOnInit() {
    this.router.events.subscribe(() => {
      this.currentRoute = this.router.url;
    });
  }
  ngAfterViewInit(): void {
  
  }
  isSubCategoryIncomplete(): boolean {
    const subs = this.user?.subCategoryIds;
    // Consideramos incompleto si no hay subcategorías o solo hay una
    return !subs || (Array.isArray(subs) && subs.length <= 1);
  }

  isUserIncomplete(): boolean {
    const u = this.user;
    return !u?.name || !u?.email || !u?.phone || !u?.dni || !u?.bio;
  }
  
  // ===== Documentos requeridos según categoría =====
  get docReq() {
    return docsRequirement(this.categories || [], this.user || {});
  }



  async logout() {
    const result = await Swal.fire({
      title: '¿Cerrar sesión?',
      text: 'Vas a salir de Don Reparador.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      focusCancel: true,
    });

    if (!result.isConfirmed) return;

    try {
      this.authService.logout?.();
      await this.router.navigate(['/login']);
      await Swal.fire({ icon: 'success', title: 'Sesión cerrada', showConfirmButton: false, timer: 1200 });
    } catch (e) {
      await Swal.fire({ icon: 'error', title: 'No se pudo cerrar sesión', text: (e as any)?.message ?? 'Intenta de nuevo.' });
    }
  }

  shouldShowMenu(): boolean {
    const currentUrl = this.router.url;
    const galleryRoutes = ['/gallery', 'add-gallery', 'edit-gallery', 'gallery/edit', 'gallery/add'];
    return !galleryRoutes.some(route => currentUrl.includes(route));
  }

}
