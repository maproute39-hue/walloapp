import { CommonModule } from '@angular/common';
import { Component,AfterViewInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ScriptLoaderService } from '@app/services/script-loader.service';
import { filter } from 'rxjs/operators';
import { NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-bottom-navbar',
  imports: [
    CommonModule,
    RouterLink,
  ],
  templateUrl: './bottom-navbar.html',
  styleUrls: ['./bottom-navbar.scss'],
  standalone: true
})
export class BottomNavbar implements AfterViewInit{
  hideHeader = false;
  
  constructor(public router: Router,
    private scriptLoaderService: ScriptLoaderService) {
    this.router.events.subscribe(() => {
      this.hideHeader = this.router.url === '/register';
    });
  }

  // Función para verificar si la ruta está activa
  isActive(route: string): boolean {
    return this.router.url === route || 
           (route === '/profile' && this.router.url.startsWith('/profile'));
  }

  async ngAfterViewInit() {
    try {
      await this.scriptLoaderService.loadAll([
        // { src: 'assets/js/swiper-bundle.min.js', attr: { defer: 'true' } },
        // { src: 'assets/js/custom-swiper.js', attr: { defer: 'true' } },
        // { src: 'assets/js/bootstrap.bundle.min.js', attr: { defer: 'true' } },
        // { src: 'assets/js/template-setting.js', attr: { defer: 'true' } },
        // { src: 'assets/js/script.js', attr: { defer: 'true' } },
      ]);

      (window as any).SVGInject?.(document.querySelectorAll('img.injectable'));
    } catch (err) {
      console.error('Error cargando scripts', err);
    }

    // Primera pasada al montar la app
    window.iconsax?.();
  }
}