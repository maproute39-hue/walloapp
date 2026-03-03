// experts.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import PocketBase, { RecordModel } from 'pocketbase';

export type Rolw = 'expert' | 'provider' | string;
export interface ExpertRecord extends RecordModel {
  name?: string; username?: string; avatar?: string; address?: string;
  rolw?: Rolw | Rolw[]; status?: boolean; verified?: boolean; rating?: number;
}
export interface ExpertView extends ExpertRecord { displayName: string; avatarUrl?: string; }

@Injectable({ providedIn: 'root' })
export class ExpertsService implements OnDestroy {
  private pb = new PocketBase('http://0.0.0.0:8090');
  private expertsMap = new Map<string, ExpertView>();
  private experts$ = new BehaviorSubject<ExpertView[]>([]);
  private subscribed = false;
  private perPage = 50;                // ajusta según tamaño esperado
  private lastTotalPages = 1;
private detailSubs = new Map<string, () => void>(); // para desuscribir por id
private detailStreams = new Map<string, BehaviorSubject<ExpertView | null>>();

  /** 🔎 Nuevo: observable de TODOS (sin filtro de servidor) */
  watchAllUnfiltered(): Observable<ExpertView[]> {
    if (!this.subscribed) this.startRealtimeUnfiltered();
    if (this.expertsMap.size === 0) this.reloadAllUnfiltered();
    return this.experts$.asObservable();
  }

  async reloadAllUnfiltered() {
    this.expertsMap.clear();
    const res = await this.pb.collection('users').getList<ExpertRecord>(1, this.perPage, {
      // 👈 sin filter
      fields: 'id,name,username,avatar,address,rolw,status,verified,collectionId,collectionName,rating,updated',
      sort: '-updated'
    });
    this.ingest(res.items); this.emit();
    this.lastTotalPages = res.totalPages;
  }

  async loadNextPageUnfiltered(currentPage: number) {
    const next = currentPage + 1;
    if (next > this.lastTotalPages) return { page: currentPage, hasMore: false };
    const res = await this.pb.collection('users').getList<ExpertRecord>(next, this.perPage, {
      fields: 'id,name,username,avatar,address,rolw,status,verified,collectionId,collectionName,rating,updated',
      sort: '-updated'
    });
    this.ingest(res.items); this.emit();
    this.lastTotalPages = res.totalPages;
    return { page: next, hasMore: next < res.totalPages };
  }

  ngOnDestroy(): void { this.stopRealtime(); }

  /** 🔔 Realtime: sin filtro, ingesta todo y filtras en el componente */
  private startRealtimeUnfiltered() {
    if (this.subscribed) return;
    this.subscribed = true;
    this.pb.collection('users').subscribe('*', (e) => {
      if (e.action === 'delete') {
        this.expertsMap.delete(e.record.id);
        this.emit();
        return;
      }
      this.ingest([e.record as ExpertRecord]);
      this.emit();
    });
  }

  private stopRealtime() {
    if (!this.subscribed) return;
    this.pb.collection('users').unsubscribe('*');
    this.subscribed = false;
  }

  private ingest(records: ExpertRecord[]) {
    for (const r of records) {
      const view: ExpertView = {
        ...r,
        displayName: r.name || r.username || 'Experto',
        avatarUrl: r.avatar ? this.pb.getFileUrl(r, r.avatar, { thumb: '100x100' }) : undefined
      };
      this.expertsMap.set(r.id, view);
    }
  }

  private emit() {
    this.experts$.next(Array.from(this.expertsMap.values()));
  }
  watchById(id: string): Observable<ExpertView | null> {
  if (!this.detailStreams.has(id)) {
    const subj = new BehaviorSubject<ExpertView | null>(null);
    this.detailStreams.set(id, subj);

    // carga inicial
    this.pb.collection('users').getOne<ExpertRecord>(id, {
      fields: 'id,name,username,avatar,address,rolw,status,verified,rating,updated,phone,email,bio'
    }).then(rec => {
      const view: ExpertView = {
        ...rec,
        displayName: rec.name || rec.username || 'Experto',
        avatarUrl: rec.avatar ? this.pb.getFileUrl(rec, rec.avatar, { thumb: '200x200' }) : undefined
      };
      subj.next(view);
    }).catch(() => subj.next(null));

    // realtime solo para este id
    this.pb.collection('users').subscribe(id, (e) => {
      if (e.action === 'delete') {
        subj.next(null);
        return;
      }
      const r = e.record as ExpertRecord;
      const view: ExpertView = {
        ...r,
        displayName: r.name || r.username || 'Experto',
        avatarUrl: r.avatar ? this.pb.getFileUrl(r, r.avatar, { thumb: '200x200' }) : undefined
      };
      subj.next(view);
    });

    // guardar cómo desuscribir
    this.detailSubs.set(id, () => this.pb.collection('users').unsubscribe(id));
  }
  return this.detailStreams.get(id)! as Observable<ExpertView | null>;
}

unwatchById(id: string) {
  this.detailSubs.get(id)?.();
  this.detailSubs.delete(id);
  this.detailStreams.delete(id);
}
  
}
