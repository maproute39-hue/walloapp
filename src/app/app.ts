import { CommonModule } from '@angular/common';
import { AfterViewInit, Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { BottomNavbar } from './components/bottom-navbar/bottom-navbar';
import { Header } from './components/header/header';
import { Sidebar } from './components/sidebar/sidebar';
import { filter } from 'rxjs/operators';
import { NavigationEnd } from '@angular/router';
import { ConfigMobileService } from './core/config-mobile.service';
import { ScriptLoaderService } from './services/script-loader.service';
declare const iconsax: any;
declare global {
  interface Window {
    iconsax?: (opts?: any) => void;
  }
}
@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    CommonModule,
    BottomNavbar,
    Header,
    Sidebar
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  standalone: true
})
export class App implements AfterViewInit {
  hideHeader = false;
  
  constructor(
    public scriptLoaderService: ScriptLoaderService,
    public router: Router
  ) {}
  async ngAfterViewInit() {
    // Re-inicializa iconsax en cada navegación (después de que el DOM cambie)
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        // usa microtask o setTimeout(0) para esperar al render
        queueMicrotask(() => window.iconsax?.());
      });

    try {
      await this.scriptLoaderService.loadAll([
        { src: 'assets/js/swiper-bundle.min.js', attr: { defer: 'true' } },
        { src: 'assets/js/custom-swiper.js', attr: { defer: 'true' } },
        // { src: 'assets/js/iconsax.js', attr: { defer: 'true' } }, // ❌ eliminado
        { src: 'assets/js/bootstrap.bundle.min.js', attr: { defer: 'true' } },
        // { src: 'assets/js/template-setting.js', attr: { defer: 'true' } },
        { src: 'assets/js/script.js', attr: { defer: 'true' } },
      ]);

      (window as any).SVGInject?.(document.querySelectorAll('img.injectable'));
    } catch (err) {
      console.error('Error cargando scripts', err);
    }

    // Primera pasada al montar la app
    window.iconsax?.();
  }
  
}