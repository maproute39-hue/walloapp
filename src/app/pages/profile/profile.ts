import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { ChangeDetectionStrategy } from '@angular/core';
import { WalletApiService } from '@app/services/wallet-api.service';

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
  private walletApi = inject(WalletApiService);
  balanceAvailable = 0;
professionalProfile: any = null;
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

// private async loadProfessionalProfile(): Promise<void> {
//   try {
//     if (!this.user?.id || this.role !== 'professional') {
//       this.professionalProfile = null;
//       this.balanceAvailable = 0;
//       return;
//     }

//     const profile = await this.auth.pb
//       .collection('professional_profiles')
//       .getFirstListItem(`userId="${this.user.id}"`);

//     this.professionalProfile = profile;
//     this.balanceAvailable = Number(profile?.['credit_balance'] || 0);
//     this.cdr.markForCheck();
//   } catch (error) {
//     console.error('❌ Error loading professional profile:', error);
//     this.professionalProfile = null;
//     this.balanceAvailable = 0;
//     this.cdr.markForCheck();
//   }
// }
private async loadProfessionalProfile(): Promise<void> {
  try {
    if (!this.user?.id || this.role !== 'professional') {
      this.professionalProfile = null;
      this.balanceAvailable = 0;
      this.cdr.markForCheck();
      return;
    }

    const profile = await this.auth.pb
      .collection('professional_profiles')
      .getFirstListItem(`userId="${this.user.id}"`);

    this.professionalProfile = profile;

    const creditsRes = await this.walletApi.getAvailableCredits(this.user.id);
    this.balanceAvailable = Number(creditsRes?.availableCredits || 0);

    this.cdr.markForCheck();
  } catch (error) {
    console.error('❌ Error loading professional profile:', error);
    this.professionalProfile = null;
    this.balanceAvailable = 0;
    this.cdr.markForCheck();
  }
}

async ngOnInit() {
  await this.checkAuthStatus();

  // 1) Reaccionar a cambios del usuario (updateProfile, login, logout)
  this.subs.add(
    this.auth.user$.subscribe(async (u) => {
      this.user = u;
      this.isLoggedIn = !!u;
      this.role = u?.['type'] === 'professional' ? 'professional' : 'client';
      this.avatarSrc.set(this.buildAvatarUrl(u));

      if (this.role === 'professional') {
        await this.loadProfessionalProfile();
      } else {
        this.balanceAvailable = 0;
      }

      this.cdr.markForCheck();
      // this.cdr.detectChanges();
    })
  );

  // 2) Al navegar (volver desde biografy), refresca y fuerza lectura
  this.subs.add(
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(async () => {
        if (!this.auth.isLoggedIn()) return;

        try {
          await this.auth.refreshAuth();
          const rec = await this.auth.fetchCurrentUser();

          if (rec) {
            this.auth.pb.authStore.save(this.auth.pb.authStore.token, rec as any);
          }
        } catch (error) {
          console.error('❌ Error refreshing auth/profile:', error);
        }
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
// private async checkAuthStatus() {
//   this.isLoggedIn = this.auth.isLoggedIn();

//   if (!this.isLoggedIn) {
//     await this.router.navigate(['/login'], { replaceUrl: true });
//     return;
//   }

//   try {
//     const freshUser = await this.auth.fetchCurrentUser();
//     if (freshUser) {
//       this.auth.pb.authStore.save(this.auth.pb.authStore.token, freshUser as any);
//       this.user = freshUser;
//     } else {
//       this.user = this.auth.currentUser();
//     }
//   } catch (error) {
//     console.error('❌ Error fetching user:', error);
//     this.user = this.auth.currentUser();
//   }

//   this.role = this.user?.['type'] === 'professional' ? 'professional' : 'client';
//   this.avatarSrc.set(this.buildAvatarUrl(this.user));

//   if (this.role === 'professional') {
//     await this.loadProfessionalProfile();
//   } else {
//     this.balanceAvailable = 0;
//   }
// this.cdr.markForCheck();
// // this.cdr.detectChanges();
// } 
private async checkAuthStatus() {
  this.isLoggedIn = this.auth.isLoggedIn();

  if (!this.isLoggedIn) {
    await this.router.navigate(['/login'], { replaceUrl: true });
    return;
  }

  try {
    const freshUser = await this.auth.fetchCurrentUser();

    if (freshUser) {
      this.auth.pb.authStore.save(this.auth.pb.authStore.token, freshUser as any);
      this.user = freshUser;
    } else {
      this.user = this.auth.currentUser();
    }
  } catch (error) {
    console.error('❌ Error fetching user:', error);
    this.user = this.auth.currentUser();
  }

  this.role = this.user?.['type'] === 'professional' ? 'professional' : 'client';
  this.avatarSrc.set(this.buildAvatarUrl(this.user));

  if (this.role === 'professional') {
    await this.loadProfessionalProfile();
  } else {
    this.balanceAvailable = 0;
  }

  this.cdr.markForCheck();
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
      title: 'Log out?',
      text: 'You are about to log out of Wallizo.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, log out',
      cancelButtonText: 'Cancel',
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


