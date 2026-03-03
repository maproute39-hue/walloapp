/// <reference types="@types/google.maps" />
import { Injectable, OnDestroy, signal } from '@angular/core';
import { AuthPocketbaseService } from './auth-pocketbase.service';
import { environment } from '../environments/environment';

type LatLng = { lat: number; lng: number };

declare global {
  interface Window {
    initMapReady?: () => void; // callback opcional si lo quisieras
  }
}
type GeoPerm = 'granted' | 'prompt' | 'denied' | 'unknown';


@Injectable({ providedIn: 'root' })
export class LocationService implements OnDestroy {
  // ==== Señales públicas ====
  
  position     = signal<LatLng | null>(null);
  active       = signal<boolean>(true);
  locationText = signal<string>('Buscando ubicación…');

  // ==== Internos ====
  private watchId: number | null = null;
  private tickId: any = null;
  private lastSent: LatLng | null = null;

  private readonly INTERVAL_MS = 1000;
  private readonly MIN_MOVE_METERS = 5;

  private readonly QUEUE_KEY = 'loc_queue_v1';
  private lastGeocodeAt = 0;
  private lastGeocodePos: LatLng | null = null;
  private readonly GEOCODE_MIN_MS = 10_000;
  private readonly GEOCODE_MIN_MOVE = 30;

  private geocodeCache = new Map<string, string>();

  // ====== Google Maps ======
  private mapsReadyPromise?: Promise<void>;
  private geocoder?: google.maps.Geocoder;

  constructor(private auth: AuthPocketbaseService) {
    // Estado activo desde el modelo (si existe)
    const m = this.auth.pb.authStore.model as any;
    if (m && typeof m.status === 'boolean') this.active.set(!!m.status);

    window.addEventListener('online', this.flushQueue);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.commitIfNeeded();
    });
  }

  ngOnDestroy(): void {
    this.stop();
    window.removeEventListener('online', this.flushQueue);
  }
async checkPermission(): Promise<GeoPerm> {
  // Safari iOS puede no soportar navigator.permissions para geolocalización
  try {
    if (!('permissions' in navigator)) return 'unknown';
    // El literal 'geolocation' no está tipado en TS para algunos targets
    // por eso el cast a any
    const status = await (navigator as any).permissions.query({ name: 'geolocation' as any });
    const st = status.state as PermissionState; // 'granted' | 'prompt' | 'denied'
    // Escucha cambios (Chrome/Edge soportan addEventListener)
    if ((status as any).addEventListener) {
      (status as any).addEventListener('change', () => {
        const newState = (status.state as PermissionState);
        if (newState === 'granted') {
          // Arranca inmediatamente si el usuario lo habilitó
          this.start();
        }
      });
    }
    return st;
  } catch {
    return 'unknown';
  }
}

/** Pide permiso de la forma correcta según estado actual */
async ensurePermissionAndStart(): Promise<GeoPerm> {
  const perm = await this.checkPermission();

  if (perm === 'granted') {
    this.start();
    return perm;
  }

  if (perm === 'prompt' || perm === 'unknown') {
    // Esto dispara el prompt nativo si aún no decidió
    return await new Promise<GeoPerm>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const pos = { lat: coords.latitude, lng: coords.longitude };
          this.position.set(pos);
          this.start(); // ya activa watch + commit + geocode
          resolve('granted');
        },
        (_err) => {
          // Puede ser timeout, bloqueo temporal, o denied en el acto
          // No sabemos con certeza; mantenemos el texto amigable
          this.locationText.set('Permite acceso a tu ubicación');
          resolve('denied');
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
      );
    });
  }

  // Si está denied no podemos re-preguntar, hay que guiar al usuario
  if (perm === 'denied') {
    this.locationText.set('Ubicación bloqueada en el navegador');
  }
  return perm;
}
  /** Alterna estado y persiste en DB (optimista) */
  async toggleAndPersist(): Promise<void> {
    const prev = this.active();
    const next = !prev;
    this.active.set(next);
    try {
      await this.auth.updateMyFields({ status: next });
      if (next) void this.commitIfNeeded();
    } catch (e) {
      this.active.set(prev);
      throw e;
    }
  }

  /** Inicia tracking */
  start(): void {
    const m = this.auth.pb.authStore.model as any;
    if (m && typeof m.status === 'boolean') this.active.set(!!m.status);

    if (!('geolocation' in navigator)) {
      console.warn('[LocationService] Geolocation no soportado');
      this.startCommitInterval();
      this.locationText.set('Geolocalización no soportada');
      return;
    }

    // Carga Google Maps (perezoso)
    void this.ensureGoogleReady();

    // Seed inicial rápido
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const pos = { lat: coords.latitude, lng: coords.longitude };
        this.position.set(pos);
        void this.commitIfNeeded();
        void this.maybeReverseGeocode(pos);
      },
      (err) => {
        console.warn('[LocationService] getCurrentPosition error:', err);
        this.locationText.set('Permite acceso a tu ubicación');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
    );

    // Seguimiento continuo
    this.watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const pos = { lat: coords.latitude, lng: coords.longitude };
        this.position.set(pos);
        void this.commitIfNeeded();
        void this.maybeReverseGeocode(pos);
      },
      (err) => console.warn('[LocationService] watchPosition error:', err),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 8000 }
    );

    this.startCommitInterval();
  }

  stop(): void {
    if (this.watchId != null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.tickId) { clearInterval(this.tickId); this.tickId = null; }
  }

  private startCommitInterval() {
    if (this.tickId) clearInterval(this.tickId);
    this.tickId = setInterval(() => this.commitIfNeeded(), this.INTERVAL_MS);
  }

  /** Empuja a PB si corresponde */
  private async commitIfNeeded(): Promise<void> {
    const pos = this.position();
    const userId = this.auth.getCurrentUserId();
    if (!pos || !userId) return;
    if (!this.active()) return;

    if (!navigator.onLine) { this.enqueue(pos); return; }
    if (this.lastSent && this.distanceMeters(this.lastSent, pos) < this.MIN_MOVE_METERS) return;

    try {
      await this.auth.updateMyLocation(pos.lat, pos.lng);
      this.lastSent = { ...pos };
      await this.flushQueue();
    } catch {
      this.enqueue(pos);
    }
  }

  // ==== Cola offline ====
  private enqueue(p: LatLng) {
    const q = this.readQueue();
    q.push({ ...p, at: Date.now() });
    localStorage.setItem(this.QUEUE_KEY, JSON.stringify(q.slice(-10)));
  }

  private flushQueue = async () => {
    if (!navigator.onLine || !this.active()) return;
    const q = this.readQueue();
    if (!q.length) return;
    const last = q[q.length - 1];
    try {
      await this.auth.updateMyLocation(last.lat, last.lng);
      this.lastSent = { lat: last.lat, lng: last.lng };
      localStorage.removeItem(this.QUEUE_KEY);
    } catch { /* queda en cola */ }
  };

  private readQueue(): Array<LatLng & { at: number }> {
    try { return JSON.parse(localStorage.getItem(this.QUEUE_KEY) ?? '[]'); }
    catch { return []; }
  }

  // ====== Carga de Google Maps (sin @googlemaps/js-api-loader) ======
  private ensureGoogleReady(): Promise<void> {
    if (this.mapsReadyPromise) return this.mapsReadyPromise;

    // Ya cargado
    if (typeof google !== 'undefined' && (google as any).maps) {
      this.geocoder = new google.maps.Geocoder();
      this.mapsReadyPromise = Promise.resolve();
      return this.mapsReadyPromise;
    }

    // ¿Ya hay <script> inyectado?
    const EXISTING_ID = 'gmaps-js';
    if (document.getElementById(EXISTING_ID)) {
      this.mapsReadyPromise = new Promise<void>((resolve, reject) => {
        const check = () => {
          if ((window as any).google?.maps) {
            this.geocoder = new google.maps.Geocoder();
            resolve();
          } else {
            setTimeout(check, 150);
          }
        };
        setTimeout(check, 150);
        // opcional: timeout de seguridad
        setTimeout(() => reject(new Error('Timeout cargando Google Maps')), 15000);
      });
      return this.mapsReadyPromise;
    }

    // Inyecta el script
    this.mapsReadyPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.id = EXISTING_ID;
      script.async = true;
      script.defer = true;
      const params = new URLSearchParams({
        key: environment.googleMapsApiKey,
        libraries: 'places',
        language: 'es',
        region: 'PE',
      });
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;

      script.onload = () => {
        try {
          this.geocoder = new google.maps.Geocoder();
          resolve();
        } catch (e) {
          reject(e);
        }
      };
      script.onerror = () => reject(new Error('No se pudo cargar Google Maps JS API'));
      document.head.appendChild(script);
    });

    // Manejo de error visible
    this.mapsReadyPromise.catch((err) => {
      console.error('[LocationService] Error cargando Google Maps JS API:', err);
      this.locationText.set('No se pudo cargar Google Maps');
    });

    return this.mapsReadyPromise;
  }

  // ==== Reverse geocoding con Google ====
  private async maybeReverseGeocode(pos: LatLng): Promise<void> {
    const now = Date.now();
    if (now - this.lastGeocodeAt < this.GEOCODE_MIN_MS) return;
    if (this.lastGeocodePos && this.distanceMeters(this.lastGeocodePos, pos) < this.GEOCODE_MIN_MOVE) return;

    this.lastGeocodeAt = now;
    this.lastGeocodePos = { ...pos };

    const key = this.cacheKey(pos);
    const cached = this.geocodeCache.get(key);
    if (cached) {
      this.locationText.set(cached);
      return;
    }

    const text = await this.getAddressFromCoords(pos.lat, pos.lng);
    this.geocodeCache.set(key, text);
    this.locationText.set(text);
  }

  private cacheKey(p: LatLng): string {
    const r2 = (n: number) => Math.round(n * 100) / 100;
    return `${r2(p.lat)},${r2(p.lng)}`;
  }

  private async getAddressFromCoords(lat: number, lng: number): Promise<string> {
    try {
      await this.ensureGoogleReady();
      if (!this.geocoder) throw new Error('Geocoder no disponible');
      const { results } = await this.geocoder.geocode({ location: { lat, lng } });
      return results?.[0]?.formatted_address ?? 'Ubicación no disponible';
    } catch (e) {
      console.debug('[Geocoding] fallo Google JS API:', e);
      return 'Ubicación no disponible';
    }
  }

  // ==== Utilidades ====
  private distanceMeters(a: LatLng, b: LatLng): number {
    const R = 6371000;
    const dLat = this.deg2rad(b.lat - a.lat);
    const dLng = this.deg2rad(b.lng - a.lng);
    const lat1 = this.deg2rad(a.lat), lat2 = this.deg2rad(b.lat);
    const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  private deg2rad(d: number) { return d * (Math.PI / 180); }
}
