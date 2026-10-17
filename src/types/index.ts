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
}

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
