// src/app/services/auth-pocketbase.service.ts
import { Injectable } from '@angular/core';
import PocketBase, { RecordModel } from 'pocketbase';
import { BehaviorSubject } from 'rxjs';
export type UserType = 'client' | 'professional';

export interface RegisterMinimalPayload {
  username: string;
  email: string;
  phone: string;
  type: UserType;
  dni?: string;
  avatar?: string | Blob;             
  password: string;           
  passwordConfirm: string;    
}

@Injectable({ providedIn: 'root' })
export class AuthPocketbaseService {
  public pb: PocketBase;
    public user$ = new BehaviorSubject<RecordModel | null>(null);

  constructor() {
    this.pb = new PocketBase('https://db.buckapi.site:8055');
    this.pb.authStore.onChange((token, model) => {
    this.user$.next(model as any);
  }, true);
  }

  public randomPassword(len = 18): string {
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*_-+=';
    return Array.from(bytes, b => chars[b % chars.length]).join('');
  }

  isLoggedIn(): boolean {
    return this.pb.authStore.isValid && !!this.pb.authStore.model;
  }

  currentUser(): RecordModel | null {
    return this.pb.authStore.model;
  }

  fileUrl(record: RecordModel | null | undefined, fileName?: string, thumb?: string): string | null {
    if (!record || !fileName) return null;
    return this.pb.files.getUrl(record, fileName, thumb ? { thumb } : undefined);
  }

  async registerMinimal(payload: RegisterMinimalPayload): Promise<RecordModel> {
  const password = (payload.password ?? '').trim();
  const passwordConfirm = (payload.passwordConfirm ?? '').trim();

  if (!password || password !== passwordConfirm) {
    throw new Error('La contraseña es obligatoria y debe coincidir.');
  }

  const rolwMap: Record<UserType, 'client' | 'professional'> = {
    client: 'client',
    professional: 'professional',
  };
  const rolwValue = rolwMap[payload.type];
  const isActive = payload.type === 'client';

  const data: any = {
    email: payload.email.trim().toLowerCase(),
    emailVisibility: true,
    password,
    passwordConfirm,
    username: payload.username, 
    name: payload.username,
    phone: payload.phone,
    dni: payload.dni ?? '',
    type: payload.type,
    rolw: rolwValue,
    status: isActive, // cliente activo, proveedor en revisión (si así lo quieres)
  };
  if (payload.avatar instanceof Blob) data['avatar'] = payload.avatar;
  const record = await this.pb.collection('users').create(data);
  // Puedes loguear automáticamente si quieres:
  await this.pb.collection('users').authWithPassword(data.email, password);
  // crear perfiles auxiliares...
  return record;
}


  async login(email: string, password: string) {
    const res = await this.pb.collection('users').authWithPassword(email, password);
    return res.record;
  }

  async requestPasswordReset(email: string) {
    await this.pb.collection('users').requestPasswordReset(email);
  }

  logout() {
    this.pb.authStore.clear();
  }
  getCurrentUserId(): string | null {
    return this.pb.authStore.model?.id ?? null;
  }
  async updateMyFields(patch: Partial<RecordModel>): Promise<RecordModel> {
    const id = this.getCurrentUserId();
    if (!id) throw new Error('No hay usuario autenticado.');
    const rec = await this.pb.collection('users').update(id, patch);
    this.pb.authStore.save(this.pb.authStore.token, rec as any);
    return rec;
  }
  async updateMyLocation(lat: number, long: number): Promise<RecordModel> {
    return this.updateMyFields({ lat, long });
  }
private ensureLoggedIn() {
  if (!this.pb.authStore.isValid || !this.pb.authStore.model) {
    throw new Error('No user is logged in');
  }
}

private toFormData(data: Record<string, any>): FormData {
  const fd = new FormData();
  Object.entries(data ?? {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) v.forEach(item => fd.append(k, item));
    else fd.append(k, v);
  });
  return fd;
} 

async updateProfile(data: any): Promise<RecordModel> {
  this.ensureLoggedIn();
  const id = this.pb.authStore.model!.id;
  const body = (data instanceof FormData) ? data : this.toFormData(data);
  // Opcional: refresca sesión antes, por si el token está viejo
  try { await this.pb.collection('users').authRefresh(); } catch {}
  const updated = await this.pb.collection('users').update(id, body);
  // ¡Clave! Mantén el token actual y solo reemplaza el modelo:
  this.pb.authStore.save(this.pb.authStore.token, updated);
  return updated;
}

async updateAvatar(file: File): Promise<RecordModel> {
  this.ensureLoggedIn();
  const fd = new FormData();
  fd.append('avatar', file);
  const updated = await this.pb.collection('users').update(this.pb.authStore.model!.id, fd);
  this.pb.authStore.save(this.pb.authStore.token, updated);
  return updated;
}
async fetchCurrentUser() {
    const id = this.pb.authStore.model?.id;
    if (!id) return null;
    return await this.pb.collection('users').getOne(id); // fuerza lectura desde servidor
  }
  async refreshAuth() {
  try {
    await this.pb.collection('users').authRefresh();
  } catch {
    const id = this.pb.authStore.model?.id;
    if (id) {
      const record = await this.pb.collection('users').getOne(id);
      // getOne NO devuelve token; conserva el token actual:
      this.pb.authStore.save(this.pb.authStore.token, record);
    } else {
      this.pb.authStore.clear();
    }
  }
}

}
