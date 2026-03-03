import { Injectable, inject } from '@angular/core';
import { Meta, Title, DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private meta = inject(Meta);
  private title = inject(Title);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  updateTags(opts: {
    title?: string;
    description?: string;
    canonicalPath?: string;   // ej: '/servicio/tal-cosa'
    image?: string;           // URL absoluta si puedes
  }) {
    if (opts.title) this.title.setTitle(opts.title);
    if (opts.description) {
      this.meta.updateTag({ name: 'description', content: opts.description });
      this.meta.updateTag({ property: 'og:description', content: opts.description });
      this.meta.updateTag({ name: 'twitter:description', content: opts.description });
    }
    const absUrl = this.absoluteUrl(opts.canonicalPath ?? this.router.url);
    this.setCanonical(absUrl);

    if (opts.image) {
      this.meta.updateTag({ property: 'og:image', content: opts.image });
      this.meta.updateTag({ name: 'twitter:image', content: opts.image });
    }
    this.meta.updateTag({ property: 'og:title', content: this.title.getTitle() });
    this.meta.updateTag({ property: 'og:url', content: absUrl });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
  }

  /** Inserta/actualiza <link rel="canonical"> */
  private setCanonical(url: string) {
    let link: HTMLLinkElement | null =
      document.querySelector("link[rel='canonical']");
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private absoluteUrl(path: string): string {
    const base = typeof window !== 'undefined'
      ? `${window.location.origin}` : '';
    return path.startsWith('http') ? path : `${base}${path}`;
  }

  /** Inserta JSON-LD (ej. Organization, Breadcrumb, Service) */
  setJsonLd(schema: object) {
    let script = document.getElementById('jsonld-script') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'jsonld-script';
      document.head.appendChild(script);
    }
    script.text = JSON.stringify(schema);
  }
}
