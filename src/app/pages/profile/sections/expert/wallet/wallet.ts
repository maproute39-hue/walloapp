import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { PbService } from '@app/services/pb.service';
import { WalletApiService } from '@app/services/wallet-api.service';

type CreditPackage = {
  id: string;
  credits: number;
  priceUsd: number;
};

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './wallet.html',
  styleUrls: ['./wallet.scss']
})
export class Wallet {
  router = inject(Router);
  route = inject(ActivatedRoute);
  pb = inject(PbService);
  walletApi = inject(WalletApiService);

  availableBalance = 0;
  pendingBalance = 0;
  transactions: any[] = [];
  loading = false;
  processingSession = false;

  packages: CreditPackage[] = [
    { id: 'pkg_5', credits: 5, priceUsd: 5 },
    { id: 'pkg_10', credits: 10, priceUsd: 10 },
    { id: 'pkg_20', credits: 20, priceUsd: 20 }
  ];

  async ngOnInit() {
    await this.handleStripeReturn();
    await this.loadWallet();
    await this.loadBalances();
  }

  async handleStripeReturn() {
    const payment = this.route.snapshot.queryParamMap.get('payment');
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');

    if (payment !== 'success' || !sessionId) return;

    try {
      this.processingSession = true;

      const result = await this.walletApi.getSessionStatus(sessionId);

      if (result?.ok && result?.wallet_transaction?.status === 'approved') {
        await Swal.fire({
          icon: 'success',
          title: 'Recharge successful',
          text: `You now have ${result.wallet_transaction.balance_after} credits available.`
        });
      } else if (result?.ok && result?.payment_status === 'paid') {
        await Swal.fire({
          icon: 'info',
          title: 'Payment received',
          text: 'Your payment was received. We are updating your credits.'
        });
      } else {
        await Swal.fire({
          icon: 'warning',
          title: 'Payment verification pending',
          text: 'We could not confirm the recharge yet.'
        });
      }

      // limpia query params
      await this.router.navigate([], {
        queryParams: {},
        replaceUrl: true
      });
    } catch (error) {
      console.error('Error confirming Stripe session', error);
      await Swal.fire('Error', 'Could not validate the payment session.', 'error');
    } finally {
      this.processingSession = false;
    }
  }

  async loadWallet() {
    try {
      const user = this.pb.currentUser;
      if (!user?.id) throw new Error('Usuario no autenticado');

      const list = await this.pb.listProfessionalWalletHistory(user.id);
      this.transactions = list.items || [];
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'No se pudo cargar el historial.', 'error');
    }
  }

  async loadBalances() {
    try {
      const user = this.pb.currentUser;
      if (!user?.id) return;

      const credits = await this.walletApi.getAvailableCredits(user.id);
      this.availableBalance = Number(credits.availableCredits || 0);

      const pendingPage = await this.pb.listMyWalletEntries(user.id, 'pending');
      this.pendingBalance = (pendingPage.items || [])
        .filter((it: any) => it.kind === 'credit_purchase')
        .reduce((sum: number, it: any) => sum + Number(it['credits_delta'] || 0), 0);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo cargar el saldo.', 'error');
    }
  }

  async recharge(pkg: CreditPackage) {
    try {
      this.loading = true;

      const user = this.pb.currentUser;
      if (!user?.id) throw new Error('Usuario no autenticado');

      // ajusta según tu estructura real
      const professionalProfile = await this.pb.getProfessionalProfileByUserId(user.id);

      const checkout = await this.walletApi.createCheckout({
        userId: user.id,
        professionalProfileId: professionalProfile?.id || null,
        customer: {
          name: professionalProfile?.['full_name'] || user.name || 'Professional',
          email: user.email
        },
        packageId: pkg.id,
        credits: pkg.credits,
        amountTotal: Math.round(pkg.priceUsd * 100),
        currency: 'usd'
      });

      if (!checkout?.ok || !checkout.url) {
        throw new Error('No se pudo crear la sesión de pago');
      }

      window.location.href = checkout.url;
    } catch (error: any) {
      console.error(error);
      Swal.fire('Error', error?.message || 'No se pudo iniciar la recarga.', 'error');
    } finally {
      this.loading = false;
    }
  }

  trackByTxId(_: number, tx: any) {
    return tx.id;
  }

  txLabel(tx: any): string {
    switch (tx.kind) {
      case 'credit_purchase':
        return 'Recharge';
      case 'lead_purchase':
        return 'Lead Purchase';
      case 'lead_refund':
        return 'Lead Refund';
      default:
        return tx.kind || 'Transaction';
    }
  }

  txCredits(tx: any): string {
    const credits = Number(tx.credits_delta || 0);
    return credits > 0 ? `+${credits}` : `${credits}`;
  }
}