import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })

export class EmailService {
  private http = inject(HttpClient);
  private base = environment.apiEmailUrl; 
sendAdminNewProfessional(dto: {
  name: string;
  email: string;
  type: string;
  created: string;
  phone?: string;
}) {
  const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  return this.http.post(`${this.base}/email/adminNewProfessional`, {
    toEmail: 'admin@wallizo.com', // 🔴 CAMBIA ESTO
    toName: 'Admin',
    templateId: 3, // 🔴 ID del template en Brevo
    params: {
      nombre: dto.name,
      email: dto.email,
      type: dto.type,
      phone: dto.phone,
      created: dto.created
    }
  }, { headers });
}
 
  sendClientWelcome(dto: { toEmail: string; toName: string; templateId: 1; params?: any }) {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(`${this.base}/email/clientWelcome`, dto, { headers });
  }
  
  sendProfessionalWelcome(dto: { toEmail: string; toName: string; templateId: 2; params?: any }) {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(`${this.base}/email/professionalWelcome`, dto, { headers });
  }
}
