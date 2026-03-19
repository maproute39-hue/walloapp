import { CommonModule, ViewportScroller } from '@angular/common';
import { AfterViewInit, Component, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd, ActivatedRoute } from '@angular/router';
import { BottomNavbar } from './components/bottom-navbar/bottom-navbar';
import { Header } from './components/header/header';
import { Sidebar } from './components/sidebar/sidebar';
import { filter } from 'rxjs/operators';
import { ScriptLoaderService } from './services/script-loader.service';
import Swal from 'sweetalert2';

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

  private viewportScroller = inject(ViewportScroller);
  private route = inject(ActivatedRoute);

  constructor(
    public scriptLoaderService: ScriptLoaderService,
    public router: Router
  ) {}

  async ngAfterViewInit() {
    // ✅ Manejo del retorno de Stripe al cargar la app
    await this.handleStripeReturn();

    // ✅ Re-inicializa iconsax en cada navegación
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        this.viewportScroller.scrollToPosition([0, 0]);

        queueMicrotask(() => window.iconsax?.());
      });

    try {
      await this.scriptLoaderService.loadAll([
        { src: 'assets/js/swiper-bundle.min.js', attr: { defer: 'true' } },
        { src: 'assets/js/custom-swiper.js', attr: { defer: 'true' } },
        { src: 'assets/js/iconsax.js', attr: { defer: 'true' } },
        { src: 'assets/js/bootstrap.bundle.min.js', attr: { defer: 'true' } },
        { src: 'assets/js/script.js', attr: { defer: 'true' } },
      ]);

      (window as any).SVGInject?.(document.querySelectorAll('img.injectable'));
    } catch (err) {
      console.error('Error cargando scripts', err);
    }

    // ✅ Primera inicialización de íconos
    window.iconsax?.();
  }

  private async handleStripeReturn(): Promise<void> {
    const url = new URL(window.location.href);
    const payment = url.searchParams.get('payment');
    const sessionId = url.searchParams.get('session_id');

    if (payment === 'success' && sessionId) {
      await Swal.fire({
        icon: 'success',
        title: 'Payment successful',
        text: 'Your credits were added successfully.',
        confirmButtonText: 'Go to Home'
      });

      await this.router.navigate(['/home'], { replaceUrl: true });
      return;
    }

    if (payment === 'cancel') {
      await Swal.fire({
        icon: 'info',
        title: 'Payment canceled',
        text: 'The purchase was not completed.',
        confirmButtonText: 'Go to Home'
      });

      await this.router.navigate(['/home'], { replaceUrl: true });
      return;
    }
  }
}