import { CompanyProfile, Customer, Product, Invoice, InvoiceItem, PricingMode, PaymentMethod, PaymentStatus } from '../types';

const STORAGE_KEYS = {
  COMPANY: 'saudi_invoice_company_profile',
  CUSTOMERS: 'saudi_invoice_customers',
  PRODUCTS: 'saudi_invoice_products',
  INVOICES: 'saudi_invoice_invoices',
  COUNTER: 'saudi_invoice_number_counter',
  DEMO_CLEANED_FLAG: 'saudi_invoice_demo_cleaned_v5',
  AUTOSAVE: 'saudi_invoice_editor_autosave_v1',
};

export interface InvoiceAutoSaveData {
  targetInvoiceId: string | 'NEW';
  invoiceNumber: string;
  issueDate: string;
  issueTime: string;
  selectedCustomerId: string;
  deliveryAddressAr: string;
  deliveryAddressEn?: string;
  pricingMode: PricingMode;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  notesAr: string;
  items: InvoiceItem[];
  savedAt: string;
}

export const DEFAULT_COMPANY: CompanyProfile = {
  id: 'comp_default_king',
  nameAr: 'مركز الملك للدهانات',
  nameEn: 'King Paints Center',
  vatNumber: '300123456700003',
  crNumber: '1010456789',
  phone: '+966 50 123 4567',
  email: 'info@kingpaintscenter.sa',
  buildingNo: '101',
  streetAr: 'طريق الملك فهد',
  streetEn: 'King Fahd Road',
  districtAr: 'حي العليا',
  districtEn: 'Al Olaya District',
  cityAr: 'الرياض',
  cityEn: 'Riyadh',
  postalCode: '12214',
  countryAr: 'المملكة العربية السعودية',
  countryEn: 'Kingdom of Saudi Arabia',
  logoUrl: '',
  bankName: 'مصرف الراجحي - Al Rajhi Bank',
  bankIban: 'SA4480000456608010123456',
  footerNotesAr: 'شكراً لتعاملكم معنا. الفاتورة صالحة لأغراض الضريبة ومطابقة لهيئة الزكاة والضريبة والجمارك (ZATCA).',
  footerNotesEn: 'Thank you for your business. Valid tax invoice conforming to ZATCA e-invoicing standards.',
  defaultVatRate: 15,
  defaultPricingMode: 'INCLUSIVE',
  invoicePrefix: 'INV-2026-',
  whatsappBusinessName: 'مركز الملك للدهانات',
  whatsappNoReplyMessage: 'هذا الحساب مخصص لإرسال الفواتير بصيغة PDF آلياً فقط (No-Reply) ولا يستقبل الردود.',
  hidePhoneOnInvoice: false,
};

// Known demo IDs and predicates to strictly identify dummy sample entries
const DEMO_INVOICE_IDS = new Set(['inv_1001', 'inv_1002']);
const DEMO_CUSTOMER_IDS = new Set(['cust_1', 'cust_2', 'cust_3']);
const DEMO_PRODUCT_IDS = new Set(['prod_1', 'prod_2', 'prod_3', 'prod_4', 'prod_5', 'prod_6', 'prod_7']);

export const isDemoInvoice = (inv: Invoice): boolean => {
  if (!inv) return false;
  if (DEMO_INVOICE_IDS.has(inv.id)) return true;
  if (inv.invoiceNumber === 'INV-2026-0001' || inv.invoiceNumber === 'INV-2026-0002') return true;
  if (inv.id?.startsWith('demo_')) return true;
  if (inv.customer?.nameAr?.includes('البناء الحديث') || inv.customer?.nameAr?.includes('أفق التقنية')) return true;
  return false;
};

export const isDemoCustomer = (cust: Customer): boolean => {
  if (!cust) return false;
  if (DEMO_CUSTOMER_IDS.has(cust.id)) return true;
  if (cust.id?.startsWith('demo_')) return true;
  if (cust.vatNumber === '310987654300003' || cust.vatNumber === '300555444300003') return true;
  if (cust.nameAr?.includes('البناء الحديث') || cust.nameAr?.includes('أفق التقنية') || cust.nameAr?.includes('الدوسري')) return true;
  if (cust.nameEn?.includes('Modern Construction') || cust.nameEn?.includes('Tech Horizon') || cust.nameEn?.includes('Dossary')) return true;
  return false;
};

export const isDemoProduct = (prod: Product): boolean => {
  if (!prod) return false;
  if (DEMO_PRODUCT_IDS.has(prod.id)) return true;
  if (prod.id?.startsWith('demo_')) return true;
  if (prod.code?.startsWith('JAZ-')) return true;
  if (prod.nameAr?.includes('جوشن') || prod.nameAr?.includes('رويال جلوس') || prod.nameAr?.includes('مقاوم للرطوبة') || prod.nameAr?.includes('معجون دهان داخلي')) return true;
  if (prod.nameEn?.includes('Jowshan') || prod.nameEn?.includes('Royal Exterior') || prod.nameEn?.includes('Moisture-Resistant')) return true;
  return false;
};

class AppStorage {
  constructor() {
    this.cleanDemoDataOnce();
  }

  /**
   * One-time automated purge of demo data:
   * Strips out dummy demo items while STRICTLY PRESERVING any customer, product, invoice,
   * or setting the user entered!
   */
  private cleanDemoDataOnce(): void {
    try {
      const alreadyCleaned = localStorage.getItem(STORAGE_KEYS.DEMO_CLEANED_FLAG);
      if (alreadyCleaned === 'true') {
        return;
      }

      // 1. Invoices: Remove only demo invoices, keep everything the user added!
      const rawInvoices = localStorage.getItem(STORAGE_KEYS.INVOICES);
      if (rawInvoices) {
        try {
          const parsed: Invoice[] = JSON.parse(rawInvoices);
          const userOnly = parsed.filter((inv) => !isDemoInvoice(inv));
          localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(userOnly));
        } catch (e) {
          console.warn('Error cleaning invoices:', e);
        }
      } else {
        localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify([]));
      }

      // 2. Customers: Remove demo customers, keep user customers!
      const rawCustomers = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      if (rawCustomers) {
        try {
          const parsed: Customer[] = JSON.parse(rawCustomers);
          const userOnly = parsed.filter((c) => !isDemoCustomer(c));
          localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(userOnly));
        } catch (e) {
          console.warn('Error cleaning customers:', e);
        }
      } else {
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
      }

      // 3. Products: Remove demo products, keep user products!
      const rawProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (rawProducts) {
        try {
          const parsed: Product[] = JSON.parse(rawProducts);
          const userOnly = parsed.filter((p) => !isDemoProduct(p));
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(userOnly));
        } catch (e) {
          console.warn('Error cleaning products:', e);
        }
      } else {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
      }

      // 4. Company Profile: If still having old demo name, update to "مركز الملك للدهانات"
      const rawCompany = localStorage.getItem(STORAGE_KEYS.COMPANY);
      if (rawCompany) {
        try {
          const parsed: CompanyProfile = JSON.parse(rawCompany);
          if (parsed.nameAr === 'شركة الجزيرة للدهانات والحلول الإنشائية' || !parsed.nameAr) {
            parsed.nameAr = 'مركز الملك للدهانات';
            parsed.nameEn = 'King Paints Center';
            localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(parsed));
          }
        } catch (e) {
          console.warn('Error updating company profile:', e);
        }
      } else {
        localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(DEFAULT_COMPANY));
      }

      localStorage.setItem(STORAGE_KEYS.DEMO_CLEANED_FLAG, 'true');
    } catch (err) {
      console.warn('Clean demo data check failed:', err);
    }
  }

  // Company Profile
  getCompany(): CompanyProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COMPANY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.nameAr === 'شركة الجزيرة للدهانات والحلول الإنشائية') {
          parsed.nameAr = 'مركز الملك للدهانات';
          parsed.nameEn = 'King Paints Center';
          this.saveCompany(parsed);
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Storage error:', e);
    }
    this.saveCompany(DEFAULT_COMPANY);
    return DEFAULT_COMPANY;
  }

  saveCompany(company: CompanyProfile): void {
    localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(company));
  }

  // Customers
  getCustomers(): Customer[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      if (data) {
        const parsed: Customer[] = JSON.parse(data);
        // Strictly exclude any demo customers while keeping user customers
        return parsed.filter((c) => !isDemoCustomer(c));
      }
    } catch (e) {
      console.warn('Storage error:', e);
    }
    return [];
  }

  saveCustomers(customers: Customer[]): void {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }

  addCustomer(customer: Omit<Customer, 'id' | 'createdAt'>): Customer {
    const list = this.getCustomers();
    const newCust: Customer = {
      ...customer,
      id: 'cust_' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    list.unshift(newCust);
    this.saveCustomers(list);
    return newCust;
  }

  updateCustomer(id: string, updates: Partial<Customer>): Customer | null {
    const list = this.getCustomers();
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates };
    this.saveCustomers(list);
    return list[idx];
  }

  deleteCustomer(id: string): boolean {
    const list = this.getCustomers();
    const filtered = list.filter((c) => c.id !== id);
    if (filtered.length !== list.length) {
      this.saveCustomers(filtered);
      return true;
    }
    return false;
  }

  // Products
  getProducts(): Product[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (data) {
        const parsed: Product[] = JSON.parse(data);
        // Strictly exclude any demo products while keeping user products
        return parsed.filter((p) => !isDemoProduct(p));
      }
    } catch (e) {
      console.warn('Storage error:', e);
    }
    return [];
  }

  saveProducts(products: Product[]): void {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }

  addProduct(product: Omit<Product, 'id' | 'createdAt'>): Product {
    const list = this.getProducts();
    const newProd: Product = {
      ...product,
      id: 'prod_' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    list.unshift(newProd);
    this.saveProducts(list);
    return newProd;
  }

  updateProduct(id: string, updates: Partial<Product>): Product | null {
    const list = this.getProducts();
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates };
    this.saveProducts(list);
    return list[idx];
  }

  deleteProduct(id: string): boolean {
    const list = this.getProducts();
    const filtered = list.filter((p) => p.id !== id);
    if (filtered.length !== list.length) {
      this.saveProducts(filtered);
      return true;
    }
    return false;
  }

  // Invoices
  getInvoices(): Invoice[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
      if (data) {
        const parsed: Invoice[] = JSON.parse(data);
        // Strictly exclude any demo invoices while keeping user invoices
        return parsed.filter((inv) => !isDemoInvoice(inv));
      }
    } catch (e) {
      console.warn('Storage error:', e);
    }
    return [];
  }

  saveInvoices(invoices: Invoice[]): void {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  }

  getNextInvoiceNumber(prefix: string = 'INV-2026-'): string {
    const invoices = this.getInvoices();
    let highest = 0;
    invoices.forEach((inv) => {
      if (inv.invoiceNumber && inv.invoiceNumber.startsWith(prefix)) {
        const numPart = parseInt(inv.invoiceNumber.replace(prefix, ''), 10);
        if (!isNaN(numPart) && numPart > highest) {
          highest = numPart;
        }
      }
    });
    const next = highest + 1;
    return `${prefix}${String(next).padStart(4, '0')}`;
  }

  saveInvoice(invoice: Invoice): Invoice {
    const list = this.getInvoices();
    const existingIdx = list.findIndex((i) => i.id === invoice.id);
    if (existingIdx >= 0) {
      list[existingIdx] = { ...invoice, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ ...invoice, createdAt: invoice.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.saveInvoices(list);

    // Asynchronously sync to server so customer links are immediately accessible on mobile/WhatsApp
    if (typeof fetch !== 'undefined') {
      fetch('/api/invoices/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice }),
      }).catch(() => {});
    }

    return invoice;
  }

  deleteInvoice(id: string): boolean {
    const list = this.getInvoices();
    const filtered = list.filter((i) => i.id !== id);
    if (filtered.length !== list.length) {
      this.saveInvoices(filtered);
      return true;
    }
    return false;
  }

  updateInvoicePaymentStatus(id: string, paymentStatus: Invoice['paymentStatus'], amountPaid?: number): Invoice | null {
    const list = this.getInvoices();
    const idx = list.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    const inv = list[idx];
    inv.paymentStatus = paymentStatus;
    if (paymentStatus === 'PAID') {
      inv.amountPaid = inv.grandTotal;
    } else if (paymentStatus === 'UNPAID') {
      inv.amountPaid = 0;
    } else if (amountPaid !== undefined) {
      inv.amountPaid = amountPaid;
    }
    inv.updatedAt = new Date().toISOString();
    list[idx] = inv;
    this.saveInvoices(list);
    return inv;
  }

  // Backup & Restore
  exportAllData(): string {
    const data = {
      company: this.getCompany(),
      customers: this.getCustomers(),
      products: this.getProducts(),
      invoices: this.getInvoices(),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }

  importAllData(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.company) this.saveCompany(parsed.company);
      if (parsed.customers) this.saveCustomers(parsed.customers);
      if (parsed.products) this.saveProducts(parsed.products);
      if (parsed.invoices) this.saveInvoices(parsed.invoices);
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  resetToDefaultSampleData(): void {
    localStorage.removeItem(STORAGE_KEYS.COMPANY);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.INVOICES);
    localStorage.removeItem(STORAGE_KEYS.DEMO_CLEANED_FLAG);
    localStorage.removeItem(STORAGE_KEYS.AUTOSAVE);
  }

  // Invoice Editor Auto-Save
  getInvoiceAutoSave(): InvoiceAutoSaveData | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUTOSAVE);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to load invoice autosave:', e);
    }
    return null;
  }

  saveInvoiceAutoSave(draft: InvoiceAutoSaveData): void {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTOSAVE, JSON.stringify(draft));
    } catch (e) {
      console.warn('Failed to save invoice autosave:', e);
    }
  }

  clearInvoiceAutoSave(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.AUTOSAVE);
    } catch (e) {
      console.warn('Failed to clear invoice autosave:', e);
    }
  }
}

export const storage = new AppStorage();
