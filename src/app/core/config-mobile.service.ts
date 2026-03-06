// src/app/core/config-mobile.service.ts
import { Injectable, signal } from '@angular/core';
import PocketBase from 'pocketbase';
import type { RecordModel, RecordSubscription } from 'pocketbase';

export type AppSections = {
  bannerCarousel?: boolean;
  featuredServices?: boolean;
  packages?: boolean;
  topCategories?: boolean;
  topProviders?: boolean;
};

export type AppConfigRecord = RecordModel & {
  sections: AppSections;
  maintenance?: boolean;
  appMinVersion?: string | null;
  rolloutPercent?: number | null;
};

@Injectable({ providedIn: 'root' })
export class ConfigMobileService {
  private pb = new PocketBase((window as any).PB_URL || 'http://0.0.0.0:8055');

  /** estado reactivo */
  readonly cfg = signal<AppConfigRecord | null>(null);
  readonly loaded = signal<boolean>(false);

  private _subscribedId?: string;
  private _loading = false;

  /** Cargar una vez y suscribirse */
  async load(): Promise<AppConfigRecord> {
    if (this.cfg()) return this.cfg()!;
    if (this._loading) {
      return await new Promise<AppConfigRecord>((resolve) => {
        const t = setInterval(() => {
          if (this.cfg()) { clearInterval(t); resolve(this.cfg()!); }
        }, 40);
      });
    }
    this._loading = true;

    // Si no usas _key, toma el más reciente
    const list = await this.pb.collection('config')
      .getList<AppConfigRecord>(1, 1, { sort: '-updated' });
    const rec = list.items?.[0];
    if (!rec) throw new Error('No hay registros en la colección config.');

    this.cfg.set(rec);
    this.loaded.set(true);

    // Realtime: 1 sola suscripción al id actual
    if (this._subscribedId !== rec.id) {
      if (this._subscribedId) await this.pb.collection('config').unsubscribe(this._subscribedId);
      await this.pb.collection('config').subscribe(
        rec.id,
        (e: RecordSubscription<AppConfigRecord>) => this.cfg.set(e.record)
      );
      this._subscribedId = rec.id;
    }

    this._loading = false;
    return rec;
  }

  /** true si la sección está ON (solo cuando loaded=true) */
  isOn<K extends keyof AppSections>(key: K): boolean {
    const c = this.cfg();
    if (!this.loaded() || !c) return false; // evita parpadeo
    const v = c.sections?.[key];
    return v === undefined ? true : !!v;     // default: visible si existe config pero falta la clave
  }
}
