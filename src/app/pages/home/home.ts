import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BannerItem } from '../../interfaces/banner.interface';
import { Provider } from '../../interfaces/provider.interface';
import { SeoService } from '../../services/seo.service';

import { ConfigMobileService } from '@app/core/config-mobile.service';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl:   './home.html',
  styleUrl: './home.scss'

})    
export class HomeComponent implements OnInit {
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
      title: 'Don Reparador | Reparaciones y servicios a domicilio',
      description: 'Encuentra profesionales verificados de plomería, electricidad, pintura y más.',
      canonicalPath: '/'
    });
  }

  onSelectProvider(p: Provider) {
    // tracking o navegación avanzada si quieres
  }
}
