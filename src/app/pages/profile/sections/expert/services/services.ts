import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { CategoriesService } from '@app/services/categories.service';
import { Category } from '@app/interfaces/category.interface';
import { PbService } from '@app/services/pb.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './services.html',
  styleUrls: ['./services.scss']
})
export class Services {
  private svc = inject(CategoriesService);
  private pbSvc = inject(PbService);
  router = inject(Router);
toggleTag(categoryId: string, subId: string, event: Event) {
  event.stopPropagation();
  this.toggleSubcategory(categoryId, subId, !this.isSubSelected(categoryId, subId));
}
  @Input() categories: Category[] = [];

  // Datos que se guardan
  selected: Array<{ categoryId: string, selectedByUser: string[] }> = [];

  // UI state
  expandedIds = new Set<string>();
  saving = false;
  saveMessage = '';
  saveTimeoutRef: any;
  allExpanded = false;

  toggleExpandAll(event: Event) {
    event.preventDefault();
  
    this.allExpanded = !this.allExpanded;
  
    if (this.allExpanded) {
      // Expandir todas las categorías
      this.categories.forEach(cat => this.expandedIds.add(cat.id));
    } else {
      // Contraer todas
      this.expandedIds.clear();
    }
  }
  
  iconUrlFn = (c: Category) => this.svc.buildIconUrl(c);

  async ngOnInit() {
    // cargar categorías (service ya normaliza subs idealmente)
    if (this.categories.length === 0) {
      this.svc.listTop(100).subscribe(cats => {
        this.categories = cats;
        console.log('[services] cats loaded', this.categories.length);
        // después de cargar categorías, intentar mapear selecciones si ya estaban
        this.applySelectedToUI();
      });
      await this.svc.subscribe(async () => {
        this.svc.listTop(100).subscribe(cats => {
          this.categories = cats;
          this.applySelectedToUI();
        });
      });
    }

    // cargar selecciones desde PB
    await this.loadUserSelections();
  }

  private async loadUserSelections() {
    try {
      const user = this.pbSvc.pb.authStore.model as any;
      if (!user) return;
  
      // 1) intenta leer la estructura agrupada primero (tu formato actual)
      const rawGrouped = user.selectedByUser ?? user.subcategory;
      if (rawGrouped) {
        const parsed = typeof rawGrouped === 'string' ? JSON.parse(rawGrouped) : rawGrouped;
        if (Array.isArray(parsed)) {
          this.selected = parsed.map((p: any) => ({
            categoryId: String(p.categoryId),
            selectedByUser: Array.isArray(p.selectedByUser) ? p.selectedByUser.map((s:any)=>String(s)) : []
          }));
          // marcar expandidas
          for (const rel of this.selected) if (rel && rel.categoryId) this.expandedIds.add(rel.categoryId);
          this.applySelectedToUI();
          console.log('[services] loaded grouped selected', this.selected);
          return;
        }
      }
  
      // 2) fallback: si existe el campo plano subCategoryIds (JSON) reconstruimos selected
      const rawFlat = user.subCategoryIds ?? user.subcategoryIds ?? user.sub_category_ids;
      if (rawFlat) {
        const flat = typeof rawFlat === 'string' ? JSON.parse(rawFlat) : rawFlat;
        if (Array.isArray(flat)) {
          const flatSet = new Set(flat.map((s:any)=>String(s)));
          const rebuilt: Array<{categoryId:string, selectedByUser:string[]}> = [];
  
          // recorrer categorías y sus subs para agrupar los que estén en flatSet
          for (const cat of this.categories || []) {
            const matches = (cat.subs || []).filter((s:any) => flatSet.has(String(this.subId(s))));
            if (matches && matches.length) {
              rebuilt.push({
                categoryId: String(cat.id),
                selectedByUser: matches.map((s:any)=>String(this.subId(s)))
              });
              this.expandedIds.add(cat.id);
            }
          }
  
          // si no hemos tenido categories cargadas aún, guardamos temporalmente y applySelectedToUI se llamará después en ngOnInit
          this.selected = rebuilt;
          this.applySelectedToUI();
          console.log('[services] rebuilt selected from flat subCategoryIds', this.selected);
          return;
        }
      }
  
    } catch (err) {
      console.error('Error cargando selecciones', err);
    }
  }
  

  // Si categories cambian después de cargar selected, esta función asegura que labels se resuelvan
  private applySelectedToUI() {
    // ya hicimos expandedIds en loadUserSelections; aquí podemos forzar re-render si necesitamos.
  }

  // ----------------- UI helpers -----------------
  isSelected(cat: Category) {
    return this.selected.some(s => s.categoryId === cat.id);
  }

  isExpanded(cat: Category) {
    return this.expandedIds.has(cat.id);
  }

  isSubSelected(categoryId: string, subId: string) {
    const rel = this.selected.find(s => s.categoryId === categoryId);
    return !!rel && rel.selectedByUser.includes(subId);
  }

  expandCategory(cat: Category, event?: Event) {
    event?.stopPropagation?.();
    if (this.expandedIds.has(cat.id)) {
      this.expandedIds.delete(cat.id);
    } else {
      this.expandedIds.add(cat.id);
    }
    // NOTE: no creamos una entrada vacía en `selected` al expandir,
    // de modo que solo se guardarán categorías si tienen subcategorías seleccionadas.
  }


  // expandCategory(cat: Category, event?: Event) {
  //   event?.stopPropagation?.();
  //   if (this.expandedIds.has(cat.id)) this.expandedIds.delete(cat.id);
  //   else this.expandedIds.add(cat.id);

  //   // si no existe relation en selected, la creamos vacía para que la categoría quede guardable
  //   if (this.expandedIds.has(cat.id) && !this.selected.find(s => s.categoryId === cat.id)) {
  //     this.selected.push({ categoryId: cat.id, selectedByUser: [] });
  //   }
  // }

  toggleSubcategory(categoryId: string, subId: string, checked: boolean) {
    const cat = this.categories.find(c => c.id === categoryId);
    if (!cat) return;

    // asegurar relación
    let rel = this.selected.find(s => s.categoryId === categoryId);
    if (!rel) {
      rel = { categoryId, selectedByUser: [] };
      this.selected.push(rel);
    }

    if (checked) {
      if (!rel.selectedByUser.includes(subId)) rel.selectedByUser.push(subId);
    } else {
      rel.selectedByUser = rel.selectedByUser.filter(id => id !== subId);
    }
  }

  // ----------------- eliminar chips / categorias -----------------
  removeSub(categoryId: string, subId: string) {
    const rel = this.selected.find(s => s.categoryId === categoryId);
    if (!rel) return;
    rel.selectedByUser = rel.selectedByUser.filter(s => s !== subId);
    // si quieres eliminar la categoría si quedó sin subcats, descomenta:
    // if (rel.selectedByUser.length === 0) this.selected = this.selected.filter(s => s.categoryId !== categoryId);
  }

  removeCategory(categoryId: string) {
    this.selected = this.selected.filter(s => s.categoryId !== categoryId);
    this.expandedIds.delete(categoryId);
  }

  // buscar label de sub por id (busca en categories)
  getSubLabelById(categoryId: string, subId: string) {
    const cat = this.categories.find(c => c.id === categoryId);
    if (!cat || !cat.subs) return subId;
    const found = (cat.subs as any[]).find(s => String(this.subId(s)) === String(subId));
    return this.subLabel(found ?? subId);
  }

  getCategoryName(categoryId: string) {
    return this.categories.find(c => c.id === categoryId)?.name ?? categoryId;
  }

  // ----------------- guardado (usa tu saveSelections actualizado) -----------------
  async saveSelections() {
    if (this.saving) return;
    this.saving = true;
    this.saveMessage = '';
  
    try {
      const user = this.pbSvc.pb.authStore.model;
      if (!user) throw new Error('Usuario no autenticado');
  
      // Normalizar selected para el payload: asegurar strings
      const payloadSelected = this.selected.map(s => ({
        categoryId: String(s.categoryId),
        selectedByUser: Array.isArray(s.selectedByUser) ? s.selectedByUser.map((x: any) => String(x)) : []
      }));
  
      // FILTRAR: solo relaciones que tengan al menos 1 subcategoria seleccionada
      const selectedWithSubs = payloadSelected.filter(p => Array.isArray(p.selectedByUser) && p.selectedByUser.length > 0);
  
      // Construir categoryIds únicamente desde selectedWithSubs
      const categoryIds = Array.from(new Set(selectedWithSubs.map(p => String(p.categoryId))));
  
      // VALIDACIÓN: revisa que todas las subcats pertenecen a su categoría
      // (si tu validateBeforeSave usa this.selected, puedes adaptar; aquí validamos selectedWithSubs)
      for (const rel of selectedWithSubs) {
        const cat = this.categories.find(c => c.id === rel.categoryId);
        if (!cat) {
          this.saveMessage = 'Categoría inválida detectada.';
          this.saving = false;
          this.clearMessageAfter(3000);
          return;
        }
        for (const sub of rel.selectedByUser) {
          if (!Array.isArray(cat.subs) || !cat.subs.find((s: any) => String(this.subId(s)) === String(sub))) {
            this.saveMessage = 'Hay subcategorías inválidas. Revisa tu selección.';
            this.saving = false;
            this.clearMessageAfter(3000);
            return;
          }
        }
      }
  
      // build flat array with unique ids (desde selectedWithSubs)
      const flatSubCatIds = Array.from(new Set(selectedWithSubs.flatMap(p => p.selectedByUser || [])));
  
      // preparar data a enviar
      const data: any = {
        // categories que realmente tienen subs seleccionadas
        category: categoryIds,
        // campo plano para búsquedas (JSON)
        subCategoryIds: JSON.stringify(flatSubCatIds),
        // mantener la estructura agrupada para UI (opcional). Puedes guardar solo selectedWithSubs si prefieres.
        selectedByUser: JSON.stringify(selectedWithSubs),
        subcategorias: JSON.stringify(selectedWithSubs),
      };
  
      console.log('[DEBUG] selectedWithSubs:', JSON.stringify(selectedWithSubs, null, 2));
      console.log('[DEBUG] flatSubCatIds:', flatSubCatIds);
      console.log('[DEBUG] categoryIds to send:', categoryIds);
      console.log('[DEBUG] final data to send:', data);
  
      // llamar a PocketBase
      const record = await this.pbSvc.pb.collection('users').update((user as any).id, data);
      console.log('[DEBUG] PB update response:', record);
  
      // sincronizar authStore.model si aplicable
      try {
        const token = this.pbSvc.pb.authStore.token;
        if (token) this.pbSvc.pb.authStore.save(token as string, record as any);
      } catch (e) {
        console.warn('AuthStore sync failed', e);
      }
  
      this.saveMessage = 'Guardado correctamente';
      this.clearMessageAfter(2500);
    } catch (err: any) {
      console.error('Error guardando selecciones', err);
      this.saveMessage = err?.message || 'Error al guardar. Intenta de nuevo.';
      this.clearMessageAfter(4000);
    } finally {
      this.saving = false;
    }
  }
  
  

  private clearMessageAfter(ms = 2000) {
    clearTimeout(this.saveTimeoutRef);
    this.saveTimeoutRef = setTimeout(() => this.saveMessage = '', ms);
  }

  private validateBeforeSave(): boolean {
    for (const rel of this.selected) {
      const cat = this.categories.find(c => c.id === rel.categoryId);
      if (!cat) return false;
      for (const sub of rel.selectedByUser) {
        if (!Array.isArray(cat.subs) || !cat.subs.find((s: any) => String(this.subId(s)) === String(sub))) {
          console.warn('[validateBeforeSave] invalid sub', sub, 'for cat', rel.categoryId);
          return false;
        }
      }
    }
    return true;
  }

  // helpers para distintos formatos de subs
  subId(sub: any): string {
    if (!sub && sub !== 0) return '';
    if (typeof sub === 'string' || typeof sub === 'number') return String(sub);
    if (sub.id) return String(sub.id);
    if (typeof sub === 'object') {
      const keys = Object.keys(sub);
      if (keys.length === 1 && typeof sub[keys[0]] === 'string') return keys[0];
    }
    return JSON.stringify(sub);
  }

  subLabel(sub: any): string {
    if (!sub && sub !== 0) return '';
    if (typeof sub === 'string' || typeof sub === 'number') return String(sub);
    if (sub.name) return String(sub.name);
    if (sub.label) return String(sub.label);
    if (sub.id) return String(sub.id);
    if (typeof sub === 'object') {
      const keys = Object.keys(sub);
      if (keys.length === 1 && typeof sub[keys[0]] === 'string') return String(sub[keys[0]]);
    }
    return String(sub);
  }
}
