import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { ChangeDetectionStrategy } from '@angular/core';


import { AuthPocketbaseService } from '../../services/auth-pocketbase.service';
import { Client } from './sections/client/client';
import { Expert } from './sections/expert/expert';
import { Subscription } from 'rxjs';

type Role = 'client' | 'professional';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, Expert, Client],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush, 

})
export class Profile implements OnInit, OnDestroy {
  private auth = inject(AuthPocketbaseService);
   router = inject(Router);

  // estado
  isLoggedIn = false;
  user: any = null;
  role: Role = 'client';

  // avatar
  readonly defaultAvatar = 'assets/images/profile/profile2.png';
  avatarSrc = signal<string>(this.defaultAvatar);

   private subs = new Subscription();
    private cdr = inject(ChangeDetectorRef);


async ngOnInit() {
    await this.checkAuthStatus();

    // 1) Reaccionar a cambios del usuario (updateProfile, login, logout)
    this.subs.add(
      this.auth.user$.subscribe((u) => {
        this.user = u;
        this.isLoggedIn = !!u;
        this.role = u?.['type'] === 'professional' ? 'professional' : 'client';
        this.avatarSrc.set(this.buildAvatarUrl(u));
        this.cdr.markForCheck();
        this.cdr.detectChanges();

      })
    );

    // 2) Al navegar (volver desde biografy), refresca y fuerza lectura
    this.subs.add(
      this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(async () => {
        if (!this.auth.isLoggedIn()) return;
        try {
          await this.auth.refreshAuth();               // intenta renovar
          const rec = await this.auth.fetchCurrentUser(); // fuerza lectura desde servidor
          if (rec) {
            // conserva token actual y actualiza modelo → disparará user$
            this.auth.pb.authStore.save(this.auth.pb.authStore.token, rec as any);
          }
        } catch {}
      })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  // private async checkAuthStatus() {
  //   this.isLoggedIn = this.auth.isLoggedIn();
  //   if (!this.isLoggedIn) {
  //     await this.router.navigate(['/login'], { replaceUrl: true });
  //     return;
  //   }
  //   this.user = this.auth.currentUser();
  //   this.role = this.user?.['type'] === 'professional' ? 'professional' : 'client';
  //   this.avatarSrc.set(this.buildAvatarUrl(this.user));
  // }
  private async checkAuthStatus() {
  this.isLoggedIn = this.auth.isLoggedIn();
  
  if (!this.isLoggedIn) {
    await this.router.navigate(['/login'], { replaceUrl: true });
    return;
  }

  // 🔁 Intenta obtener usuario fresco SIEMPRE al entrar a Profile
  try {
    const freshUser = await this.auth.fetchCurrentUser();
    if (freshUser) {
      // Actualiza authStore para que user$ emita
      this.auth.pb.authStore.save(this.auth.pb.authStore.token, freshUser as any);
      this.user = freshUser;
    } else {
      this.user = this.auth.currentUser();
    }
  } catch (error) {
    console.error('❌ Error fetching user:', error);
    this.user = this.auth.currentUser(); // fallback
  }
  
  // Ahora calcula el role con el usuario más actualizado posible
  this.role = this.user?.['type'] === 'professional' ? 'professional' : 'client';
  this.avatarSrc.set(this.buildAvatarUrl(this.user));
  this.cdr.detectChanges(); // ← Fuerza renderizado
}

  private buildAvatarUrl(rec: any): string {
    const name = rec?.avatar;
    if (!name) return this.defaultAvatar;

    const base = this.auth.fileUrl(rec, name, '128x128') || this.auth.fileUrl(rec, name);
    if (!base) return this.defaultAvatar;

    const ver = encodeURIComponent(rec?.updated || Date.now());
    return `${base}${base.includes('?') ? '&' : '?'}v=${ver}`;
  }

  get userName(): string {
    return this.user?.name || 'Usuario';
  }
  get userEmail(): string {
    return this.user?.email || '';
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
    });

    if (!result.isConfirmed) return;

    try {
      this.auth.logout();
      await this.router.navigate(['/login'], { replaceUrl: true });
    } catch (e: any) {
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo cerrar sesión',
        text: e?.message ?? 'Intenta de nuevo.',
      });
    }
  }
  isGalleryRoute(): boolean {
    const currentUrl = this.router.url;
    const galleryRoutes = ['/gallery', 'add-gallery', 'edit-gallery', 'gallery/edit', 'gallery/add'];
    return galleryRoutes.some(route => currentUrl.includes(route));
  }

  navigateToBiography() {
    if (this.role === 'professional') {
      this.router.navigate(['/profile', { outlets: { panel: ['biografy'] } }]);
    } else {
      this.router.navigate(['/profile', { outlets: { panel: ['client-biografy'] } }]);
    }
  }
   navigateToReview() {
    if (this.role === 'professional') {
      this.router.navigate(['/profile', { outlets: { panel: ['biografy'] } }]);
    } else {
      this.router.navigate(['/profile', { outlets: { panel: ['client-reviews'] } }]);
    }
  }
}


