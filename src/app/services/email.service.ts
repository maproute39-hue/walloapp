import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, catchError, timeout, throwError } from 'rxjs';
import { environment } from '../environments/environment';

interface BrevoBody {
  toEmail: string;
  toName: string;
  templateId: number;
  params?: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class EmailService {
  private http = inject(HttpClient);
  private base = environment.brevoApiBaseUrl; 

  private TEMPLATE_CLIENTE   = 1;
  private TEMPLATE_PROVEEDOR = 2;
  private TEMPLATE_ADMIN     = 3;

  private post<T>(path: string, body: any) {
    return this.http.post<T>(`${this.base}${path}`, body).pipe(
      timeout(10000),
      catchError((err: HttpErrorResponse) => {
        const msg = err?.error?.message || err?.message || 'Error enviando email';
        return throwError(() => new Error(msg));
      })
    );
  }

  async sendBienvenidaCliente(toEmail: string, toName: string, params?: Record<string, any>) {
    const body: BrevoBody = { toEmail, toName, templateId: this.TEMPLATE_CLIENTE, params };
    await firstValueFrom(this.post(`/bienvenidacliente`, body));
  }

  async sendBienvenidaProveedor(toEmail: string, toName: string, params?: Record<string, any>) {
    const body: BrevoBody = { toEmail, toName, templateId: this.TEMPLATE_PROVEEDOR, params };
    await firstValueFrom(this.post(`/bienvenidaexperto`, body));
  }

  async notifyAdminNuevoProveedor(params: { 
    name: string; 
    email: string; 
    type: string; 
    created: string;
    phone?: string;
  }) {
    const body = {
      toEmail: 'donreparador.com@gmail.com',
      toName: 'Equipo',
      templateId: this.TEMPLATE_ADMIN,
      params
    };
    await firstValueFrom(this.post(`/nuevoregistroadministrador`, body));
  }
}
