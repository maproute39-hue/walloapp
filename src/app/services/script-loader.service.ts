import { Injectable } from '@angular/core';

interface ScriptItem { src: string; loaded?: boolean; attr?: { [k:string]: string } }

@Injectable({ providedIn: 'root' })
export class ScriptLoaderService {
  private scripts: { [key: string]: ScriptItem } = {};

  load(script: ScriptItem): Promise<void> {
    // si ya cargado
    if (this.scripts[script.src]?.loaded) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.type = 'text/javascript';
      s.src = script.src;
      // permitir atributos como defer/async
      if (script.attr) {
        Object.keys(script.attr).forEach(k => s.setAttribute(k, script.attr![k]));
      }
      s.onload = () => { this.scripts[script.src] = { ...script, loaded: true }; resolve(); };
      s.onerror = (e) => reject(new Error(`Error cargando ${script.src}`));
      document.body.appendChild(s);
    });
  }

  loadAll(list: ScriptItem[]): Promise<void[]> {
    return Promise.all(list.map(s => this.load(s)));
  }
}
