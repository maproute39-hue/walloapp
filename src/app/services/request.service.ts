import { Injectable } from '@angular/core';
import { PocketbaseService } from './pocketbase.service';

export interface CreateRequestDTO {
  client_id: string;
  city: string;
  zip_code: string;
  space_type: string;
  size_sqm: number;
  height_m?: number;
  wallpaper_type: string;
  desired_date?: string;
  budget_range?: string;
  intention_level: 'low' | 'medium' | 'high';
  photos?: File[];
}

@Injectable({ providedIn: 'root' })
export class RequestService {
  constructor(private pbService: PocketbaseService) {}

  private get pb() {
    return this.pbService.getInstance();
  }

  /**
   * Crear una nueva solicitud de servicio
   */
  async createRequest(data: CreateRequestDTO): Promise<any> {
    try {
      // Validar que el usuario esté autenticado
      if (!this.pb.authStore.isValid) {
        throw new Error('Usuario no autenticado');
      }

      // Preparar el cuerpo de la solicitud
      const body: Record<string, any> = {
        client_id: data.client_id,
        city: data.city,
        zip_code: data.zip_code,
        space_type: data.space_type,
        size_sqm: data.size_sqm,
        wallpaper_type: data.wallpaper_type,
        intention_level: data.intention_level,
        status: 'sent',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 días
      };

      // Campos opcionales
      if (data.height_m) body['height_m'] = data.height_m;
      if (data.desired_date) body['desired_date'] = data.desired_date;
      if (data.budget_range) body['budget_range'] = data.budget_range;

      // Crear el registro en PocketBase
      const record = await this.pb.collection('requests').create(body);

      // Si hay fotos, subirlas después
      if (data.photos?.length) {
        await this.uploadRequestPhotos(record.id, data.photos);
      }

      return record;
    } catch (error: any) {
      console.error('❌ Error creando solicitud:', error);
      throw new Error(error.data?.error || 'Error al crear la solicitud');
    }
  }

  /**
   * Subir fotos para una solicitud
   */
  private async uploadRequestPhotos(requestId: string, files: File[]): Promise<void> {
    const formData = new FormData();
    files.forEach(file => formData.append('photos', file));

    // PocketBase maneja archivos en el campo 'photos' (multiple)
    await this.pb.collection('requests').update(requestId, formData);
  }

  /**
   * Obtener solicitudes del cliente actual
   */
  async getClientRequests(clientId: string) {
    return await this.pb.collection('requests').getList(1, 50, {
      filter: `client_id = "${clientId}"`,
      sort: '-created'
    });
  }
}