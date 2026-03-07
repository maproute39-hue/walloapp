import { Injectable } from '@angular/core';
import { PbService } from './pb.service';

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

@Injectable({
  providedIn: 'root'
})
export class RequestService {
  
  constructor(private pbService: PbService) {}

  async createRequest(data: CreateRequestDTO): Promise<any> {
    try {
      // Preparar datos básicos
      const requestData: any = {
        client_id: data.client_id,
        city: data.city,
        zip_code: data.zip_code,
        space_type: data.space_type,
        size_sqm: data.size_sqm,
        wallpaper_type: data.wallpaper_type,
        intention_level: data.intention_level,
        status: 'sent'
      };

      // Campos opcionales
      if (data.height_m) requestData.height_m = data.height_m;
      if (data.desired_date) requestData.desired_date = data.desired_date;
      if (data.budget_range) requestData.budget_range = data.budget_range;

      // Crear en PocketBase
      const record = await this.pbService.createRecord('requests', requestData);
      
      // Si hay fotos, subirlas y asociarlas
      if (data.photos && data.photos.length > 0) {
        for (const photo of data.photos) {
          const formData = new FormData();
          formData.append('request_id', record.id);
          formData.append('photo', photo);
          
          await this.pbService.createRecord('request_photos', formData);
        }
      }
      
      return record;
    } catch (error) {
      console.error('Error creating request:', error);
      throw error;
    }
  }
}