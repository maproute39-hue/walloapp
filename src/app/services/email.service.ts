import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class EmailService {
  private http = inject(HttpClient);
  private base = environment.apiEmailUrl;

  sendClientWelcome(dto: {
    toEmail: string;
    toName: string;
    templateId: number;
    params?: any;
  }) {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(`${this.base}/email/clientWelcome`, dto, { headers });
  }

  sendProfessionalWelcome(dto: {
    toEmail: string;
    toName: string;
    templateId: number;
    params?: any;
  }) {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(`${this.base}/email/professionalWelcome`, dto, { headers });
  }
}