import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WalletApiService {
  private http = inject(HttpClient);

  // ajusta esto a tu environment
  private apiUrl = 'https://db.wallizo.com:3500';

  createCheckout(payload: {
    userId: string;
    professionalProfileId?: string | null;
    customer: { name: string; email: string };
    packageId?: string;
    credits: number;
    amountTotal: number; // centavos
    currency?: string;
  }) {
    return firstValueFrom(
      this.http.post<{
        ok: boolean;
        url: string;
        sessionId: string;
      }>(`${this.apiUrl}/payments/checkout`, payload)
    );
  }

  getSessionStatus(sessionId: string) {
    return firstValueFrom(
      this.http.get<any>(`${this.apiUrl}/payments/status/${sessionId}`)
    );
  }

  getAvailableCredits(userId: string) {
    return firstValueFrom(
      this.http.get<{ ok: boolean; userId: string; availableCredits: number }>(
        `${this.apiUrl}/payments/credits/${userId}`
      )
    );
  }
}