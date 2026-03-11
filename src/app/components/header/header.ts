import { Component, OnDestroy, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import Swal from 'sweetalert2';

import { AuthPocketbaseService } from '@app/services/auth-pocketbase.service';
import { LocationService } from '@app/services/localization.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.html',
  styleUrls: ['./header.scss'],
})
export class Header implements OnDestroy {
  // Rutas donde ocultamos el header
  private readonly HIDDEN_ROUTES = new Set(['/login', '/register']);

  // Inyecciones
  // private router = inject(Router);
  public  auth   = inject(AuthPocketbaseService);
  private loc    = inject(LocationService);

  // Estado UI
  hideHeader = false;
  private navSub?: Subscription;

  // Señales derivadas para la vista
  locationText   = computed(() => this.loc.locationText());
  locationActive = computed(() => this.loc.active());

  constructor(
    public router: Router,
    
  ) {
    // Ocultar/mostrar header según ruta
    this.navSub = this.router.events
      .pipe(filter((ev): ev is NavigationEnd => ev instanceof NavigationEnd))
      .subscribe((ev) => {
        const path = ev.urlAfterRedirects.split('?')[0];
        this.hideHeader = this.HIDDEN_ROUTES.has(path);
      });

    // Si ya hay sesión, inicia el tracker
    if (this.auth.isLoggedIn()) {
      // this.loc.start();
    }
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  // Alternar el tracking de ubicación y persistir en PB
  toggleGeo() {
    void this.loc.toggleAndPersist();
  }

  // Cuando el usuario toca el texto de ubicación:
  // - Si no hay coordenadas aún o el tracking está OFF -> intenta solicitar permisos (start)
  // - Si el navegador bloquea, mostramos un aviso
async onLocationClick() {
  const perm = await this.loc.ensurePermissionAndStart();

  if (perm === 'denied') {
    // Detecta de forma simple plataforma/navegador para mostrar instrucciones
    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = ua.includes('android');
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isChrome = ua.includes('chrome') && !ua.includes('edge') && !ua.includes('opr');
    const isSafari = ua.includes('safari') && !ua.includes('chrome');

    let steps = 'Abre los ajustes del navegador y permite “Ubicación” para este sitio.';
    if (isAndroid && isChrome) {
      steps = 'Toca el ícono del candado/escudo → Permisos → Ubicación → Permitir.';
    } else if (isIOS && isSafari) {
      steps = 'Ajustes del iPhone/iPad → Safari → Ubicación → “Preguntar” o “Al usar la app”. Si está instalada como PWA: Ajustes → [Nombre de tu app] → Ubicación → “Al usar la app”.';
    } else if (ua.includes('firefox')) {
      steps = 'Toca el ícono de candado → Permisos → Ubicación → Permitir.';
    } else if (ua.includes('edg')) {
      steps = 'Ícono de candado → Permisos del sitio → Ubicación → Permitir.';
    }

    Swal.fire({
      icon: 'info',
      title: 'Ubicación deshabilitada',
      text: steps,
      confirmButtonText: 'Entendido',
    });
  } else if (perm === 'prompt' || perm === 'unknown') {
    // Damos un pequeño tiempo para que el prompt aparezca o falle
    setTimeout(() => {
      if (!this.loc.position()) {
        Swal.fire({
          icon: 'info',
          title: 'Permiso de ubicación',
          text: 'Concede acceso a tu ubicación para mostrarte tu zona y mejores recomendaciones.',
          confirmButtonText: 'OK',
        });
      }
    }, 1200);
  }
}

}
