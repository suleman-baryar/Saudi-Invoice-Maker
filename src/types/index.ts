export type PricingMode = 'INCLUSIVE' | 'EXCLUSIVE';

export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CREDIT' | 'OTHER';

export type PaymentStatus = 'PAID' | 'UNPAID' | 'PARTIALLY_PAID';

export type InvoiceStatus = 'DRAFT' | 'FINALIZED' | 'CANCELLED';

export interface CompanyProfile {
  id: string;
  nameAr: string;
  nameEn: string;
  vatNumber: string; // 15 digits
  crNumber: string;  // Commercial Registration 10 digits
  phone: string;
  email: string;
  buildingNo: string;
  streetAr: string;
  streetEn: string;
  districtAr: string;
  districtEn: string;
  cityAr: string;
  cityEn: string;
  postalCode: string;
  countryAr: string;
  countryEn: string;
  logoUrl: string;
  bankName: string;
  bankIban: string;
  footerNotesAr: string;
  footerNotesEn: string;
  defaultVatRate: number; // 15
  defaultPricingMode: PricingMode;
  invoicePrefix: string;
  whatsappBusinessName?: string;
  whatsappPhoneNumberId?: string;
  whatsappAccessToken?: string;
  whatsappNoReplyMessage?: string;
  hidePhoneOnInvoice?: boolean;
  enableInvoiceWatermark?: boolean;
  watermarkType?: 'AUTO' | 'PAID' | 'DRAFT';
}

export type WatermarkType = 'AUTO' | 'PAID' | 'DRAFT';

export interface Customer {
  id: string;
  nameAr: string;
  nameEn: string;
  phone: string;
  email?: string;
  vatNumber?: string;
  crNumber?: string;
  addressAr?: string;
  addressEn?: string;
  cityAr?: string;
  cityEn?: string;
  notes?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  unitPrice: number;
  unitAr: string;
  unitEn: string;
  vatRate: number; // default 15
  category?: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  productId?: string;
  code: string;
  nameAr: string;
  nameEn: string;
  quantity: number;
  unitPrice: number; // base unit price entered
  unitAr: string;
  unitEn: string;
  vatRate: number; // e.g. 15
  discountPercent: number; // 0-100
  discountAmount: number;  // absolute discount per line
  
  // Calculated values
  subtotalBeforeVat: number; // taxable amount
  vatAmount: number;         // VAT value
  subtotalWithVat: number;   // subtotal including VAT
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string; // YYYY-MM-DD
  issueTime: string; // HH:mm:ss
  status: InvoiceStatus;
  pricingMode: PricingMode;
  
  // Company Snapshot at issuance
  company: CompanyProfile;
  
  // Customer Info
  customer: Customer;
  deliveryAddressAr?: string;
  deliveryAddressEn?: string;
  
  // Items
  items: InvoiceItem[];
  
  // Overall Financials
  subtotalBeforeVat: number;
  totalDiscount: number;
  taxableAmount: number;
  totalVat: number;
  grandTotal: number;
  
  // Payment
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  
  // Extra
  notesAr?: string;
  notesEn?: string;
  termsAr?: string;
  termsEn?: string;
  
  // ZATCA & Barcode Data
  zatcaQrBase64?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface DashboardMetrics {
  totalInvoices: number;
  totalSales: number;
  totalVat: number;
  paidCount: number;
  paidAmount: number;
  unpaidCount: number;
  unpaidAmount: number;
  draftCount: number;
  draftAmount: number;
}

// ==========================================
// SUPPLIER & PURCHASE INVOICE TYPES
// ==========================================

export interface Supplier {
  id: string;
  nameAr: string;
  nameEn: string;
  companyNameAr?: string;
  companyNameEn?: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  vatNumber?: string; // 15 digits
  crNumber?: string;
  addressAr?: string;
  addressEn?: string;
  cityAr?: string;
  cityEn?: string;
  openingBalance: number;
  totalPurchases: number;
  totalPaid: number;
  currentBalance: number; // outstanding amount owed to supplier
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type PurchaseUnitType =
  | 'PIECE'
  | 'BUCKET'
  | 'CAN'
  | 'BOX'
  | 'ROLL'
  | 'LITER'
  | 'METER'
  | 'BAG'
  | 'OTHER';

export interface PurchaseItem {
  id: string;
  productId?: string;
  code: string; // SKU / Code
  nameAr: string;
  nameEn: string;
  unit: PurchaseUnitType;
  unitAr: string;
  unitEn: string;
  quantity: number;
  unitPrice: number; // entered purchase price
  discountPercent: number; // 0-100
  discountAmount: number; // line discount
  vatRate: number; // 0, 5, 15, or Custom
  vatTreatment: PricingMode; // INCLUSIVE or EXCLUSIVE
  subtotalBeforeVat: number; // taxable amount
  vatAmount: number; // VAT value
  subtotalWithVat: number; // line total
  isVatRecoverable?: boolean; // eligible for recovery under Saudi tax rules
}

export interface PurchasePaymentEntry {
  id: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  recordedBy?: string;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string; // PINV-2026-0001
  supplierInvoiceNumber?: string; // Original invoice # from supplier
  purchaseOrderNumber?: string; // PO reference
  issueDate: string; // YYYY-MM-DD
  issueTime?: string; // HH:mm:ss
  dueDate?: string; // YYYY-MM-DD
  status: InvoiceStatus; // FINALIZED | DRAFT | CANCELLED
  pricingMode: PricingMode; // INCLUSIVE | EXCLUSIVE

  // Supplier Snapshot
  supplier: Supplier;

  // Items
  items: PurchaseItem[];

  // Financials
  subtotalBeforeVat: number;
  totalDiscount: number;
  taxableAmount: number;
  totalVat: number;
  grandTotal: number;

  // Payment Tracking
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus; // PAID | PARTIALLY_PAID | UNPAID
  amountPaid: number;
  remainingBalance: number;
  payments: PurchasePaymentEntry[];

  // Notes & Reference
  notesAr?: string;
  notesEn?: string;
  internalReference?: string;
  cancellationReason?: string;
  cancelledAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface PurchaseDashboardMetrics {
  totalPurchasesToday: number;
  totalPurchasesMonth: number;
  totalOutstandingSupplierPayments: number;
  totalPaidPurchases: number;
  purchaseInvoicesCount: number;
  totalVatInput: number;
}
