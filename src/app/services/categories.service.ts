// src/app/services/categories.service.ts
import { Injectable } from '@angular/core';
import { from, map, Observable } from 'rxjs';
import { pb } from '@app/core/pocketbase.client';
import { Category } from '@app/interfaces/category.interface';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private collection = 'categories';

  // ✅ Normaliza el campo subs (JSON, array, string, objeto, etc.)
 // helper normalizeSubs dentro del servicio
private normalizeSubs(raw: any): Array<{ id: string; name?: string }> {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.map((s: any) => {
      if (typeof s === 'string') return { id: s, name: s };
      if (typeof s === 'number') return { id: String(s), name: String(s) };
      if (s && typeof s === 'object') {
        return { id: (s.id ?? s.value ?? s.key ?? ''), name: s.name ?? s.label ?? undefined };
      }
      return { id: String(s) };
    }).filter(x => !!x.id);
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return this.normalizeSubs(parsed);
    } catch {
      // csv fallback "a,b,c"
      return raw.split(',').map((p: string) => ({ id: p.trim(), name: p.trim() })).filter(x => !!x.id);
    }
  }

  if (typeof raw === 'object') {
    // object map { key: 'label' }
    return Object.entries(raw).map(([k, v]) => ({ id: k, name: typeof v === 'string' ? v : undefined }));
  }

  return [];
}


  // ✅ Listar categorías principales con imagen y subcategorías normalizadas
  listTop(limit = 8) {
    return from(
      pb.collection(this.collection).getList(1, limit, {
        sort: 'order,name',
        expand: 'image',
        fields: 'id,collectionId,collectionName,name,slug,order,active,image,expand.image,subs'
      })
    ).pipe(
      map((res: any) => res.items.map((cat: any) => {
        cat.subs = this.normalizeSubs(cat.subs); // <- normalizamos aquí
        return cat as Category;
      }))
    );
  }
  

  // ✅ Obtener una sola categoría y normalizar subs
  async getOne(id: string) {
    const record = await pb.collection(this.collection).getOne(id, {
      expand: 'image',
      fields: 'id,name,subs,image,expand.image'
    });
    record['subs'] = this.normalizeSubs(record['subs']);
    return record;
  }

  // ✅ Icono de la categoría (nuevo método pb.files.getURL)
  buildIconUrl(cat: any): string {
    const rel = cat?.expand?.image;
    const imgRec = Array.isArray(rel) ? rel[0] : rel;
    const fileName = imgRec?.image;
    if (!imgRec || !fileName) return 'assets/img/placeholder-cat.png';
    return pb.files.getURL(imgRec, fileName, { thumb: '96x96' });
  }

  // ✅ Subscripciones en tiempo real
  async subscribe(onChange: () => void) {
    await pb.collection(this.collection).subscribe('*', onChange);
  }

  async unsubscribe() {
    await pb.collection(this.collection).unsubscribe('*');
  }
  
  
}
