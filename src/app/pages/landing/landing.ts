import { Component, inject, } from '@angular/core';
import { Provider } from '../../interfaces/provider.interface';
import { RouterLink } from '@angular/router';

import { ConfigMobileService } from '@app/core/config-mobile.service';
import { BannerItem } from '@app/interfaces/banner.interface';
import { SeoService } from '@app/services/seo.service';
import { 
  FormsModule, 
  ReactiveFormsModule, 
  FormGroup, 
  FormControl, 
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
@Component({
  selector: 'app-landing',
  imports: [
    RouterLink
  ],
  templateUrl: './landing.html',
  styleUrl: './landing.scss'
})
export class Landing {
constructor(public cfg: ConfigMobileService){
    this.cfg.load();
  }
  private seo = inject(SeoService);

  banners: BannerItem[] = [
    { id: 'b1', title: 'Solicita tu reparación', subtitle: 'Plomería, electricidad y más', imageUrl: '/assets/banners/hero1.jpg', link: '/servicios' }
  ];



  providers: Provider[] = [
    { id: 'p1', name: 'Juan Pérez', rating: 4.8, specialties: ['Plomería'], avatarUrl: '/assets/avatars/jp.jpg', slug: 'juan-perez' },
    { id: 'p2', name: 'Ana Gómez', rating: 4.7, specialties: ['Electricidad'], avatarUrl: '/assets/avatars/ag.jpg', slug: 'ana-gomez' }
  ];

  ngOnInit() {
    this.seo.updateTags({
      title: 'Wallo | Reparaciones y servicios a domicilio',
      description: 'Encuentra profesionales verificados de plomería, electricidad, pintura y más.',
      canonicalPath: '/'
    });
  }

  onSelectProvider(p: Provider) {
    // tracking o navegación avanzada si quieres
  }
}


