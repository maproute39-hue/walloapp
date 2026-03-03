// src/app/core/feature-flag.directive.ts
import { Directive, Input, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';
import { ConfigMobileService } from './config-mobile.service';

@Directive({
  selector: '[appFeatureFlag]',
  standalone: true,
})
export class FeatureFlagDirective {
  private vcr = inject(ViewContainerRef);
  private tpl = inject(TemplateRef<any>);
  private cfg = inject(ConfigMobileService);

  private _flag?: string;

  @Input() set appFeatureFlag(flag: string) {
    this._flag = flag;
    this.render();
  }

  constructor() {
    // Re-render cuando cambie la config por load() o realtime
    effect(() => {
      // lee signals para activar el tracking:
      void this.cfg.loaded();
      void this.cfg.cfg();
      this.render();
    });
  }

  private render() {
    if (!this._flag) return;

    this.vcr.clear();

    // Solo muestra cuando la config está cargada y la sección está ON
    if (this.cfg.isOn(this._flag as any)) {
      this.vcr.createEmbeddedView(this.tpl);
    }
  }
}
