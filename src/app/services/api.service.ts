import { Injectable, inject } from '@angular/core';
import { from, map, Observable, shareReplay } from 'rxjs';
import { PbService } from './pb.service';

type PB = any;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private pb = inject(PbService).pb;
  private _fileUrl = inject(PbService).fileUrl.bind(inject(PbService));

  // ------- BANNERS -------
  getBanners(limit = 10): Observable<any[]> {
    return from(this.pb.collection('banners').getList(1, limit, { sort: '-created' }))
      .pipe(map(r => r.items.map((x: PB) => ({
        id: x.id,
        title: x.title,
        subtitle: x.subtitle,
        link: x.link,
        imageUrl: this._fileUrl(x, Array.isArray(x.image) ? x.image[0] : x.image),
      }))), shareReplay(1));
  }
  subscribeBanners(cb: (e:{action:string,record:any})=>void) {
    return this.pb.collection('banners').subscribe('*', (e:any)=>cb(e));
  }

  // ------- CATEGORIES -------
  getTopCategories(limit = 12): Observable<any[]> {
    return from(this.pb.collection('categories').getList(1, limit, { sort: 'name' }))
      .pipe(map(r => r.items.map((x: PB) => ({
        id: x.id,
        name: x.name,
        slug: x.slug,
        iconUrl: this._fileUrl(x, Array.isArray(x.icon) ? x.icon[0] : x.icon),
      }))), shareReplay(1));
  }
  getCategoryBySlug(slug: string): Observable<any> {
    return from(this.pb.collection('categories').getFirstListItem(`slug="${slug}"`))
      .pipe(map((x: PB) => ({
        id: x.id,
        name: x.name,
        slug: x.slug,
        iconUrl: this._fileUrl(x, Array.isArray(x.icon) ? x.icon[0] : x.icon),
      })));
  }
  subscribeCategories(cb: (e:{action:string,record:any})=>void) {
    return this.pb.collection('categories').subscribe('*', (e:any)=>cb(e));
  }

  // ------- PROVIDERS -------
  getTopProviders(limit = 10): Observable<any[]> {
    return from(this.pb.collection('providers').getList(1, limit, { sort: '-rating,-created' }))
      .pipe(map(r => r.items.map((x: PB) => ({
        id: x.id,
        name: x.name,
        slug: x.slug,
        rating: x.rating,
        specialties: x.specialties || [],
        avatarUrl: this._fileUrl(x, Array.isArray(x.avatar) ? x.avatar[0] : x.avatar),
      }))), shareReplay(1));
  }
  getProviderBySlug(slug: string): Observable<any> {
    return from(this.pb.collection('providers').getFirstListItem(`slug="${slug}"`))
      .pipe(map((x: PB) => ({
        id: x.id, name: x.name, slug: x.slug, rating: x.rating,
        specialties: x.specialties || [],
        avatarUrl: this._fileUrl(x, Array.isArray(x.avatar) ? x.avatar[0] : x.avatar),
      })));
  }
  subscribeProviders(cb: (e:{action:string,record:any})=>void) {
    return this.pb.collection('providers').subscribe('*', (e:any)=>cb(e));
  }
}
