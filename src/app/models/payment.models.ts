export type PaymentType = 'yape' | 'plin' | 'bank';

export interface BasePayment {
  id: string;                 // uuid local
  type: PaymentType;
  alias?: string;             // "Mi Yape", "BCP sueldo", etc.
  isDefault?: boolean;        // principal
  createdAt: string;          // ISO
  updatedAt?: string;         // ISO
}

export interface WalletQR {
  id: string;     // id del record en PB(images)
  url: string;    // url absoluta
  type?: string;  // 'qr'
}

export interface YapePayment extends BasePayment {
  type: 'yape';
  phone: string;          // 9 dígitos Perú
  documentType?: 'DNI' | 'CE' | 'RUC';
  documentNumber?: string;
  qr?: WalletQR;          // opcional
}

export interface PlinPayment extends BasePayment {
  type: 'plin';
  phone: string;
  documentType?: 'DNI' | 'CE' | 'RUC';
  documentNumber?: string;
  qr?: WalletQR;
}

export interface BankPayment extends BasePayment {
  type: 'bank';
  bankName: string;                 // BCP, BBVA, etc.
  accountType: 'ahorro' | 'corriente';
  accountNumber: string;
  cci?: string;                     // 20 dígitos
  holderName: string;
  documentType: 'DNI' | 'CE' | 'RUC';
  documentNumber: string;
}

export type Payment = YapePayment | PlinPayment | BankPayment;
