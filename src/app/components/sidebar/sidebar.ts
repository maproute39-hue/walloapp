import { AfterViewInit, Component, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, Subscription } from 'rxjs';
import Swal from 'sweetalert2';

import { AuthPocketbaseService } from '@app/services/auth-pocketbase.service';
import { ScriptLoaderService } from '@app/services/script-loader.service';

// Tipos globales para evitar TS errors con libs inyectadas por script
declare global {
  interface Window {
    iconsax?: (opts?: any) => void;
    SVGInject?: (elements: NodeListOf<Element> | Element[] | Element) => void;
  }
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink,CommonModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss'],
})
export class Sidebar implements AfterViewInit, OnDestroy {
  private navSub?: Subscription;

  constructor(
    private scriptLoaderService: ScriptLoaderService,
    private authService: AuthPocketbaseService,
    private router: Router
  ) {}

  get userName(): string {
    return this.authService.currentUser()?.['name'] || 'Usuario';
  }

  get userEmail(): string {
    return this.authService.currentUser()?.['email'] || '';
  }

  isLogged() {
    return this.authService.currentUser() !== null;
  }

  async logout() {
    const result = await Swal.fire({
      title: '¿Cerrar sesión?',
      text: 'Vas a salir de Wallo.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      focusCancel: true,
      customClass: {
        popup: 'dr-swal',
        confirmButton: 'dr-confirm',
        cancelButton: 'dr-cancel',
      },
    });

    if (!result.isConfirmed) return;

    try {
      // Cierra sesión en PocketBase
      this.authService.logout?.();
      await this.router.navigate(['/login']);

      await Swal.fire({
        icon: 'success',
        title: 'Sesión cerrada',
        showConfirmButton: false,
        timer: 1200,
      });
    } catch (e: any) {
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo cerrar sesión',
        text: e?.message ?? 'Intenta de nuevo.',
      });
    }
  }

  closeSidebar() {
    // Close the offcanvas sidebar using Bootstrap's API
    const sidebarElement = document.getElementById('sidebar');
    if (sidebarElement) {
      const bsOffcanvas = (window as any).bootstrap?.Offcanvas?.getInstance(sidebarElement);
      if (bsOffcanvas) {
        bsOffcanvas.hide();
      } else {
        // Fallback: manually hide by removing classes
        sidebarElement.classList.remove('show');
        sidebarElement.style.display = 'none';
      }
    }
    
    // Remove backdrop elements
    const backdrops = document.querySelectorAll('.offcanvas-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
  }

  async ngAfterViewInit() {
    // Re-inicializa iconsax en cada navegación (después del render)
    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        queueMicrotask(() => window.iconsax?.());
      });

    // Carga de scripts necesarios
    try {
      await this.scriptLoaderService.loadAll([
        { src: 'assets/js/swiper-bundle.min.js', attr: { defer: 'true' } },
        { src: 'assets/js/custom-swiper.js', attr: { defer: 'true' } },
        // No cargamos iconsax.js si ya lo inyecta tu layout/base
        { src: 'assets/js/bootstrap.bundle.min.js', attr: { defer: 'true' } },
        { src: 'assets/js/template-setting.js', attr: { defer: 'true' } },
        { src: 'assets/js/script.js', attr: { defer: 'true' } },
      ]);

      // Inyecta SVGs si la lib está disponible
      window.SVGInject?.(document.querySelectorAll('img.injectable'));
    } catch (err) {
      console.error('Error cargando scripts', err);
    }

    // Primera pasada al montar
    window.iconsax?.();
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }
}
