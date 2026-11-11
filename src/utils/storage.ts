import {
  CompanyProfile,
  Customer,
  Product,
  Invoice,
  InvoiceItem,
  PricingMode,
  PaymentMethod,
  PaymentStatus,
  Supplier,
  PurchaseInvoice,
  PurchaseDashboardMetrics,
  PurchasePaymentEntry,
} from '../types';
import { saveInvoiceToSupabase, deleteInvoiceFromSupabase } from './supabaseClient';

const STORAGE_KEYS = {
  COMPANY: 'saudi_invoice_company_profile',
  CUSTOMERS: 'saudi_invoice_customers',
  PRODUCTS: 'saudi_invoice_products',
  INVOICES: 'saudi_invoice_invoices',
  COUNTER: 'saudi_invoice_number_counter',
  DEMO_CLEANED_FLAG: 'saudi_invoice_demo_cleaned_v5',
  AUTOSAVE: 'saudi_invoice_editor_autosave_v1',
  SUPPLIERS: 'saudi_invoice_suppliers_v2',
  PURCHASE_INVOICES: 'saudi_invoice_purchase_invoices_v2',
  PURCHASE_COUNTER: 'saudi_purchase_invoice_counter_v1',
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
  nameAr: 'مركز المالك للدهانات',
  nameEn: 'Markaz Al Malki Paint',
  vatNumber: '300123456700003',
  crNumber: '1010456789',
  phone: '00966581409304',
  email: 'support@almalkipaint.sa',
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
  whatsappBusinessName: 'مركز المالك للدهانات',
  whatsappPhoneNumberId: '',
  whatsappAccessToken: '',
  whatsappNoReplyMessage: 'هذا الحساب مخصص لإرسال الفواتير بصيغة PDF آلياً فقط (No-Reply) ولا يستقبل الردود.',
  hidePhoneOnInvoice: false,
  enableInvoiceWatermark: true,
};

export const INITIAL_PAINT_PRODUCTS: Product[] = [
  {
    id: 'item_malki_01',
    code: 'MLK-PNT-01',
    nameAr: 'سطل دهان مائي داخلي مطفي ناصع البياض (18 لتر)',
    nameEn: 'Interior Matt Emulsion White (18L Bucket)',
    unitPrice: 180,
    unitAr: 'سطل',
    unitEn: 'Bucket',
    vatRate: 15,
    category: 'دهانات مائية',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item_malki_02',
    code: 'MLK-PNT-02',
    nameAr: 'سطل دهان مائي داخلي نصف لمعة قابل للغسيل (18 لتر)',
    nameEn: 'Interior Semi-Gloss Washable Paint (18L Bucket)',
    unitPrice: 220,
    unitAr: 'سطل',
    unitEn: 'Bucket',
    vatRate: 15,
    category: 'دهانات مائية',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item_malki_03',
    code: 'MLK-PNT-03',
    nameAr: 'سطل دهان خارجي بروفايل محبب عالي المقاومة (25 كجم)',
    nameEn: 'Exterior Profile Textured Paint (25kg)',
    unitPrice: 195,
    unitAr: 'سطل',
    unitEn: 'Bucket',
    vatRate: 15,
    category: 'دهانات خارجية',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item_malki_04',
    code: 'MLK-PRM-04',
    nameAr: 'جالون أساس مائي عالي الالتصاق والربط (3.6 لتر)',
    nameEn: 'Water-based Primer Sealer (3.6L Gallon)',
    unitPrice: 65,
    unitAr: 'جالون',
    unitEn: 'Gallon',
    vatRate: 15,
    category: 'أساس ومعجون',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item_malki_05',
    code: 'MLK-PUT-05',
    nameAr: 'معجون دهان داخلي لتسوية الجدران (بستلة 20 كجم)',
    nameEn: 'Interior Wall Putty Paste (20kg Bucket)',
    unitPrice: 48,
    unitAr: 'سطل',
    unitEn: 'Bucket',
    vatRate: 15,
    category: 'أساس ومعجون',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item_malki_06',
    code: 'MLK-TOL-06',
    nameAr: 'رول دهان 9 بوصة تركي شعر قصير احترافي',
    nameEn: 'Professional Paint Roller 9-inch',
    unitPrice: 22,
    unitAr: 'حبة',
    unitEn: 'Piece',
    vatRate: 15,
    category: 'أدوات ومعدات',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item_malki_07',
    code: 'MLK-TOL-07',
    nameAr: 'شريط لاصق ورقي لحماية الأطراف والجبس (درزن 12 حبة)',
    nameEn: 'Masking Tape Roll Pack (Dozen 12 pcs)',
    unitPrice: 36,
    unitAr: 'درزن',
    unitEn: 'Dozen',
    vatRate: 15,
    category: 'أدوات ومعدات',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item_malki_08',
    code: 'MLK-THN-08',
    nameAr: 'جالون تينر حار ممتاز للأعمال الزيتية (3.75 لتر)',
    nameEn: 'Premium Hot Thinner Gallon (3.75L)',
    unitPrice: 42,
    unitAr: 'جالون',
    unitEn: 'Gallon',
    vatRate: 15,
    category: 'مذيبات ومواد مساعدة',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item_malki_09',
    code: 'MLK-OIL-09',
    nameAr: 'علبة دهان زيتي لميع أبيض ديكور (1 لتر)',
    nameEn: 'Gloss Synthetic Enamel White (1L Can)',
    unitPrice: 32,
    unitAr: 'علبة',
    unitEn: 'Can',
    vatRate: 15,
    category: 'دهانات زيتية',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item_malki_10',
    code: 'MLK-OIL-10',
    nameAr: 'علبة دهان زيتي مطفي أبيض ناعم (1 لتر)',
    nameEn: 'Matt Synthetic Enamel White (1L Can)',
    unitPrice: 32,
    unitAr: 'علبة',
    unitEn: 'Can',
    vatRate: 15,
    category: 'دهانات زيتية',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item_malki_11',
    code: 'MLK-BRS-11',
    nameAr: 'فرشاة دهان 3 بوصة شعر طبيعي أصلي',
    nameEn: 'Paint Brush 3-inch Natural Bristles',
    unitPrice: 14,
    unitAr: 'حبة',
    unitEn: 'Piece',
    vatRate: 15,
    category: 'أدوات ومعدات',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item_malki_12',
    code: 'MLK-BRS-12',
    nameAr: 'فرشاة دهان 4 بوصة مقبض خشبي عريض',
    nameEn: 'Paint Brush 4-inch Wooden Handle',
    unitPrice: 18,
    unitAr: 'حبة',
    unitEn: 'Piece',
    vatRate: 15,
    category: 'أدوات ومعدات',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item_malki_13',
    code: 'MLK-SND-13',
    nameAr: 'ورق صنفرة رول ناعم وخشن للجدران (متر)',
    nameEn: 'Wall Sanding Paper Roll (Meter)',
    unitPrice: 5,
    unitAr: 'متر',
    unitEn: 'Meter',
    vatRate: 15,
    category: 'أدوات ومعدات',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item_malki_14',
    code: 'MLK-ISO-14',
    nameAr: 'عازل مائي مطاطي للأسطح والحمامات (20 كجم)',
    nameEn: 'Waterproof Roof & Bathroom Coating (20kg)',
    unitPrice: 145,
    unitAr: 'سطل',
    unitEn: 'Bucket',
    vatRate: 15,
    category: 'عوازل وبناء',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item_malki_15',
    code: 'MLK-EPX-15',
    nameAr: 'سطل دهان إيبوكسي صناعي للأرضيات والمواقف (20 كجم)',
    nameEn: 'Industrial Floor Epoxy Coating (20kg)',
    unitPrice: 360,
    unitAr: 'سطل',
    unitEn: 'Bucket',
    vatRate: 15,
    category: 'دهانات متخصصة',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item_malki_16',
    code: 'MLK-CLR-16',
    nameAr: 'صبغ ملون مركز تلوين دهانات (علبة 50 مل)',
    nameEn: 'Paint Color Tint Concentrate (50ml)',
    unitPrice: 10,
    unitAr: 'علبة',
    unitEn: 'Can',
    vatRate: 15,
    category: 'ألوان وصبغات',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item_malki_17',
    code: 'MLK-GPS-17',
    nameAr: 'شيكارة جبس بورد لاصق ومعجون فواصل (25 كجم)',
    nameEn: 'Gypsum Board Joint Compound Bag (25kg)',
    unitPrice: 38,
    unitAr: 'كيس',
    unitEn: 'Bag',
    vatRate: 15,
    category: 'أساس ومعجون',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item_malki_18',
    code: 'MLK-LDR-18',
    nameAr: 'سلم ألمنيوم مزدوج عالي المتانة 6 درجات',
    nameEn: 'Aluminum Step Ladder 6 Steps',
    unitPrice: 170,
    unitAr: 'حبة',
    unitEn: 'Piece',
    vatRate: 15,
    category: 'أدوات ومعدات',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item_malki_19',
    code: 'MLK-GUN-19',
    nameAr: 'مسدس رش دهان كهربائي احترافي 600 واط',
    nameEn: 'Electric Paint Spray Gun 600W',
    unitPrice: 285,
    unitAr: 'حبة',
    unitEn: 'Piece',
    vatRate: 15,
    category: 'أدوات ومعدات',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item_malki_20',
    code: 'MLK-KNF-20',
    nameAr: 'سكينة معجون ستانلس ستيل 6 بوصة',
    nameEn: 'Putty Knife Stainless Steel 6-inch',
    unitPrice: 12,
    unitAr: 'حبة',
    unitEn: 'Piece',
    vatRate: 15,
    category: 'أدوات ومعدات',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item_malki_21',
    code: 'MLK-MSH-21',
    nameAr: 'شبك فواصل جبس وبياض قماش ألياف 50 متر',
    nameEn: 'Fiberglass Joint Tape Mesh 50m',
    unitPrice: 16,
    unitAr: 'رول',
    unitEn: 'Roll',
    vatRate: 15,
    category: 'أدوات ومعدات',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'item_malki_22',
    code: 'MLK-SPR-22',
    nameAr: 'علبة دهان بخاخ سبريه سريع الجفاف (400 مل)',
    nameEn: 'Quick-dry Spray Paint Can (400ml)',
    unitPrice: 15,
    unitAr: 'علبة',
    unitEn: 'Can',
    vatRate: 15,
    category: 'دهانات متخصصة',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

// Known demo IDs and predicates to strictly identify dummy sample entries
const DEMO_INVOICE_IDS = new Set(['inv_1001', 'inv_1002', 'inv_test', 'inv_test_1']);
const DEMO_CUSTOMER_IDS = new Set(['cust_1', 'cust_2', 'cust_3']);
const DEMO_PRODUCT_IDS = new Set(['prod_1', 'prod_2', 'prod_3', 'prod_4', 'prod_5', 'prod_6', 'prod_7']);
const DEMO_SUPPLIER_IDS = new Set(['sup_jazeera', 'sup_jotun', 'sup_tools']);
const DEMO_PURCHASE_INVOICE_IDS = new Set(['pinv_1001', 'pinv_1002', 'pinv_1003']);

export const isDemoInvoice = (inv: Invoice): boolean => {
  if (!inv) return false;
  if (DEMO_INVOICE_IDS.has(inv.id)) return true;
  if (inv.invoiceNumber === 'INV-2026-0001' || inv.invoiceNumber === 'INV-2026-0002' || inv.invoiceNumber?.includes('TEST')) return true;
  if (inv.id?.startsWith('demo_') || inv.id?.includes('test')) return true;
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
  // Always preserve real shop catalog items and user created products
  if (prod.id?.startsWith('item_malki_') || prod.code?.startsWith('MLK-')) return false;
  if (DEMO_PRODUCT_IDS.has(prod.id)) return true;
  if (prod.id?.startsWith('demo_')) return true;
  if (prod.code?.startsWith('JAZ-')) return true;
  if (prod.nameAr?.includes('جوشن') || prod.nameAr?.includes('رويال جلوس')) return true;
  if (prod.nameEn?.includes('Jowshan') || prod.nameEn?.includes('Royal Exterior')) return true;
  return false;
};

export const isDemoSupplier = (sup: Supplier): boolean => {
  if (!sup) return false;
  if (DEMO_SUPPLIER_IDS.has(sup.id)) return true;
  if (sup.id?.startsWith('demo_')) return true;
  if (sup.vatNumber === '300987654300003' || sup.vatNumber === '300192837400003' || sup.vatNumber === '300456123400003') return true;
  if (
    sup.nameAr?.includes('مصنع دهانات الجزيرة') ||
    sup.nameAr?.includes('جوتن السعودية') ||
    sup.nameAr?.includes('الأدوات الاحترافية لمعدات الدهان')
  ) return true;
  if (
    sup.nameEn?.includes('Jazeera Paints') ||
    sup.nameEn?.includes('Jotun Saudia') ||
    sup.nameEn?.includes('Pro Tools Paint')
  ) return true;
  return false;
};

export const isDemoPurchaseInvoice = (inv: PurchaseInvoice): boolean => {
  if (!inv) return false;
  if (DEMO_PURCHASE_INVOICE_IDS.has(inv.id)) return true;
  if (inv.id?.startsWith('demo_')) return true;
  if (
    inv.invoiceNumber === 'PINV-2026-0001' ||
    inv.invoiceNumber === 'PINV-2026-0002' ||
    inv.invoiceNumber === 'PINV-2026-0003'
  ) {
    if (isDemoSupplier(inv.supplier)) return true;
  }
  return false;
};

class AppStorage {
  constructor() {
    this.purgeAllDemoData();
  }

  /**
   * Complete automated purge of all dummy/demo data:
   * Strips out dummy demo sales invoices, purchase invoices, suppliers, customers, and products
   * while STRICTLY PRESERVING any real customer, supplier, product, or invoice entered by the shop owner!
   */
  public purgeAllDemoData(): void {
    try {
      // 1. Invoices: Remove only demo invoices, keep everything the user added!
      const rawInvoices = localStorage.getItem(STORAGE_KEYS.INVOICES);
      if (rawInvoices) {
        try {
          const parsed: Invoice[] = JSON.parse(rawInvoices);
          const userOnly = parsed.filter((inv) => !isDemoInvoice(inv));
          localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(userOnly));
        } catch (e) {
          localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify([]));
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
          localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
        }
      } else {
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
      }

      // 3. Products: Remove demo products, preserve user products & guarantee shop catalog items
      const rawProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (rawProducts) {
        try {
          const parsed: Product[] = JSON.parse(rawProducts);
          const userOnly = parsed.filter((p) => !isDemoProduct(p));
          if (userOnly.length > 0) {
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(userOnly));
          } else {
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PAINT_PRODUCTS));
          }
        } catch (e) {
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PAINT_PRODUCTS));
        }
      } else {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PAINT_PRODUCTS));
      }

      // 4. Suppliers: Remove demo suppliers, keep user suppliers!
      const rawSuppliers = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
      if (rawSuppliers) {
        try {
          const parsed: Supplier[] = JSON.parse(rawSuppliers);
          const userOnly = parsed.filter((s) => !isDemoSupplier(s));
          localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(userOnly));
        } catch (e) {
          localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify([]));
        }
      } else {
        localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify([]));
      }

      // 5. Purchase Invoices: Remove demo purchase invoices, keep user purchase invoices!
      const rawPurchaseInvoices = localStorage.getItem(STORAGE_KEYS.PURCHASE_INVOICES);
      if (rawPurchaseInvoices) {
        try {
          const parsed: PurchaseInvoice[] = JSON.parse(rawPurchaseInvoices);
          const userOnly = parsed.filter((i) => !isDemoPurchaseInvoice(i));
          localStorage.setItem(STORAGE_KEYS.PURCHASE_INVOICES, JSON.stringify(userOnly));
        } catch (e) {
          localStorage.setItem(STORAGE_KEYS.PURCHASE_INVOICES, JSON.stringify([]));
        }
      } else {
        localStorage.setItem(STORAGE_KEYS.PURCHASE_INVOICES, JSON.stringify([]));
      }

      // 6. Company Profile: Ensure verified branding "مركز المالك للدهانات"
      const rawCompany = localStorage.getItem(STORAGE_KEYS.COMPANY);
      if (rawCompany) {
        try {
          const parsed: CompanyProfile = JSON.parse(rawCompany);
          if (
            parsed.nameAr === 'شركة الجزيرة للدهانات والحلول الإنشائية' ||
            parsed.nameAr === 'مركز الملك للدهانات' ||
            !parsed.nameAr
          ) {
            parsed.nameAr = 'مركز المالك للدهانات';
            parsed.nameEn = 'Markaz Al Malki Paint';
            parsed.phone = '00966581409304';
            localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(parsed));
          } else if (!parsed.phone || parsed.phone === '+966 50 123 4567') {
            parsed.phone = '00966581409304';
            localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(parsed));
          }
        } catch (e) {
          localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(DEFAULT_COMPANY));
        }
      } else {
        localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(DEFAULT_COMPANY));
      }

      localStorage.setItem(STORAGE_KEYS.DEMO_CLEANED_FLAG, 'true');
      localStorage.setItem('saudi_invoice_demo_purged_v7', 'true');
    } catch (err) {
      console.warn('Purge demo data failed:', err);
    }
  }

  private cleanDemoDataOnce(): void {
    this.purgeAllDemoData();
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

  updateCompanyProfile(partial: Partial<CompanyProfile>): CompanyProfile {
    const current = this.getCompany();
    const updated = { ...current, ...partial };
    this.saveCompany(updated);
    return updated;
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
        const filtered = parsed.filter((p) => !isDemoProduct(p));
        if (filtered.length > 0) {
          return filtered;
        }
      }
    } catch (e) {
      console.warn('Storage error:', e);
    }
    // Automatically seed and return standard paint shop catalog items
    this.saveProducts(INITIAL_PAINT_PRODUCTS);
    return INITIAL_PAINT_PRODUCTS;
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
    let updatedInv: Invoice;
    if (existingIdx >= 0) {
      updatedInv = { ...invoice, updatedAt: new Date().toISOString() };
      list[existingIdx] = updatedInv;
    } else {
      updatedInv = { ...invoice, createdAt: invoice.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
      list.unshift(updatedInv);
    }
    this.saveInvoices(list);

    // Asynchronously save to Supabase cloud database
    saveInvoiceToSupabase(updatedInv).catch(() => {});

    // Asynchronously sync to local server cache so customer links are immediately accessible
    if (typeof fetch !== 'undefined') {
      fetch('/api/invoices/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice: updatedInv }),
      }).catch(() => {});
    }

    return updatedInv;
  }

  deleteInvoice(id: string): boolean {
    const list = this.getInvoices();
    const filtered = list.filter((i) => i.id !== id);
    if (filtered.length !== list.length) {
      this.saveInvoices(filtered);
      deleteInvoiceFromSupabase(id).catch(() => {});
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
    saveInvoiceToSupabase(inv).catch(() => {});
    return inv;
  }

  // ==========================================
  // SUPPLIERS MANAGEMENT
  // ==========================================

  getSuppliers(): Supplier[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
      if (data) {
        const parsed: Supplier[] = JSON.parse(data);
        return parsed.filter((s) => !isDemoSupplier(s));
      }
    } catch (e) {
      console.warn('Failed to load suppliers:', e);
    }
    return [];
  }

  saveSuppliers(suppliers: Supplier[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
    } catch (e) {
      console.error('Failed to save suppliers:', e);
    }
  }

  saveSupplier(supplier: Supplier): Supplier {
    const list = this.getSuppliers();
    const existingIndex = list.findIndex((s) => s.id === supplier.id);
    const updated = {
      ...supplier,
      updatedAt: new Date().toISOString(),
    };
    if (existingIndex >= 0) {
      list[existingIndex] = updated;
    } else {
      list.unshift(updated);
    }
    this.saveSuppliers(list);
    return updated;
  }

  updateSupplier(id: string, partial: Partial<Supplier>): Supplier | null {
    const list = this.getSuppliers();
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    const updated: Supplier = {
      ...list[idx],
      ...partial,
      updatedAt: new Date().toISOString(),
    };
    list[idx] = updated;
    this.saveSuppliers(list);
    return updated;
  }

  deleteSupplier(id: string): boolean {
    const list = this.getSuppliers();
    const filtered = list.filter((s) => s.id !== id);
    if (filtered.length !== list.length) {
      this.saveSuppliers(filtered);
      return true;
    }
    return false;
  }

  getInitialSuppliers(): Supplier[] {
    return [
      {
        id: 'sup_jazeera',
        nameAr: 'شركة مصنع دهانات الجزيرة',
        nameEn: 'Jazeera Paints Factory Co.',
        companyNameAr: 'شركة مصنع دهانات الجزيرة المحدودة',
        companyNameEn: 'Al-Jazeera Paints Factory Co. Ltd.',
        contactPerson: 'المهندس أحمد الشهري',
        phone: '+966 50 987 6543',
        email: 'sales@jazeerapaints.com',
        vatNumber: '300987654300003',
        crNumber: '1010345678',
        addressAr: 'المنطقة الصناعية الثانية، الرياض',
        addressEn: 'Second Industrial Area, Riyadh',
        cityAr: 'الرياض',
        cityEn: 'Riyadh',
        openingBalance: 0,
        totalPurchases: 18450.0,
        totalPaid: 12000.0,
        currentBalance: 6450.0,
        notes: 'المورد الرئيسي لدهانات الأساس والواجهات الخارجية والمستودعات',
        createdAt: '2026-01-10T08:00:00.000Z',
      },
      {
        id: 'sup_jotun',
        nameAr: 'شركة جوتن السعودية للدهانات',
        nameEn: 'Jotun Saudia Co. Ltd.',
        companyNameAr: 'شركة جوتن لمواد الطلاء والديكور',
        companyNameEn: 'Jotun Paints & Coating Saudi Arabia',
        contactPerson: 'الأستاذ فيصل المطيري',
        phone: '+966 55 123 9876',
        email: 'order@jotun.sa',
        vatNumber: '300192837400003',
        crNumber: '1010567890',
        addressAr: 'طريق الخرج، المدينة الصناعية الأولى، الرياض',
        addressEn: 'Al Kharj Road, First Industrial City, Riyadh',
        cityAr: 'الرياض',
        cityEn: 'Riyadh',
        openingBalance: 2500,
        totalPurchases: 24725.0,
        totalPaid: 20000.0,
        currentBalance: 7225.0,
        notes: 'مورد دهانات فينوماستيك وليدي وورلد ومستلزمات الديكورات الراقية',
        createdAt: '2026-01-15T09:30:00.000Z',
      },
      {
        id: 'sup_tools',
        nameAr: 'مؤسسة الأدوات الاحترافية لمعدات الدهان',
        nameEn: 'Pro Tools Paint Equipment Est.',
        companyNameAr: 'مؤسسة الأدوات والمعدات الفنية للتجارة',
        companyNameEn: 'Pro Tools & Equipment Trading Est.',
        contactPerson: 'سلمان العتيبي',
        phone: '+966 54 876 5432',
        email: 'info@protools-paint.sa',
        vatNumber: '300456123400003',
        crNumber: '1010890123',
        addressAr: 'شارع الغرابي، الملز، الرياض',
        addressEn: 'Gharabi St, Al Malaz, Riyadh',
        cityAr: 'الرياض',
        cityEn: 'Riyadh',
        openingBalance: 0,
        totalPurchases: 4830.0,
        totalPaid: 4830.0,
        currentBalance: 0,
        notes: 'توريد رولات الدهان، فراشي، مسدسات رش، وسلالم الألمنيوم',
        createdAt: '2026-02-01T10:00:00.000Z',
      },
    ];
  }

  // ==========================================
  // PURCHASE INVOICES MANAGEMENT
  // ==========================================

  getPurchaseInvoices(): PurchaseInvoice[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PURCHASE_INVOICES);
      if (data) {
        const parsed: PurchaseInvoice[] = JSON.parse(data);
        return parsed.filter((i) => !isDemoPurchaseInvoice(i));
      }
    } catch (e) {
      console.warn('Failed to load purchase invoices:', e);
    }
    return [];
  }

  savePurchaseInvoices(invoices: PurchaseInvoice[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PURCHASE_INVOICES, JSON.stringify(invoices));
      this.updateSupplierBalances();
    } catch (e) {
      console.error('Failed to save purchase invoices:', e);
    }
  }

  savePurchaseInvoice(invoice: PurchaseInvoice): PurchaseInvoice {
    const list = this.getPurchaseInvoices();
    const existingIndex = list.findIndex((i) => i.id === invoice.id);
    const updated: PurchaseInvoice = {
      ...invoice,
      updatedAt: new Date().toISOString(),
    };
    if (existingIndex >= 0) {
      list[existingIndex] = updated;
    } else {
      list.unshift(updated);
    }
    this.savePurchaseInvoices(list);
    return updated;
  }

  deletePurchaseInvoice(id: string): boolean {
    const list = this.getPurchaseInvoices();
    const filtered = list.filter((i) => i.id !== id);
    if (filtered.length !== list.length) {
      this.savePurchaseInvoices(filtered);
      return true;
    }
    return false;
  }

  cancelPurchaseInvoice(id: string, reason?: string): PurchaseInvoice | null {
    const list = this.getPurchaseInvoices();
    const idx = list.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    const inv = list[idx];
    inv.status = 'CANCELLED';
    inv.cancellationReason = reason || 'تم إلغاء فاتورة الشراء بواسطة المستخدم';
    inv.cancelledAt = new Date().toISOString();
    inv.updatedAt = new Date().toISOString();
    list[idx] = inv;
    this.savePurchaseInvoices(list);
    return inv;
  }

  getNextPurchaseInvoiceNumber(): string {
    const invoices = this.getPurchaseInvoices();
    const currentYear = new Date().getFullYear();
    const prefix = `PINV-${currentYear}-`;

    let maxNum = 0;
    for (const inv of invoices) {
      if (inv.invoiceNumber && inv.invoiceNumber.startsWith(prefix)) {
        const numPart = parseInt(inv.invoiceNumber.replace(prefix, ''), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }

    const nextNum = maxNum + 1;
    return `${prefix}${nextNum.toString().padStart(4, '0')}`;
  }

  recordPurchasePayment(
    invoiceId: string,
    payment: Omit<PurchasePaymentEntry, 'id'>
  ): PurchaseInvoice | null {
    const list = this.getPurchaseInvoices();
    const idx = list.findIndex((i) => i.id === invoiceId);
    if (idx === -1) return null;

    const inv = list[idx];
    const newEntry: PurchasePaymentEntry = {
      ...payment,
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };

    const payments = [...(inv.payments || []), newEntry];
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, inv.grandTotal - totalPaid);

    inv.payments = payments;
    inv.amountPaid = totalPaid;
    inv.remainingBalance = remaining;

    if (remaining <= 0.01) {
      inv.paymentStatus = 'PAID';
    } else if (totalPaid > 0) {
      inv.paymentStatus = 'PARTIALLY_PAID';
    } else {
      inv.paymentStatus = 'UNPAID';
    }

    inv.updatedAt = new Date().toISOString();
    list[idx] = inv;
    this.savePurchaseInvoices(list);
    return inv;
  }

  updateSupplierBalances(): void {
    try {
      const suppliers = this.getSuppliers();
      const purchaseInvoices = this.getPurchaseInvoices();

      const updatedSuppliers = suppliers.map((sup) => {
        const activeInvoices = purchaseInvoices.filter(
          (inv) => inv.supplier.id === sup.id && inv.status !== 'CANCELLED'
        );
        const totalPurchases = activeInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
        const totalPaid = activeInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
        const currentBalance = (sup.openingBalance || 0) + totalPurchases - totalPaid;

        return {
          ...sup,
          totalPurchases,
          totalPaid,
          currentBalance: Math.max(0, currentBalance),
        };
      });

      localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(updatedSuppliers));
    } catch (e) {
      console.warn('Error recalculating supplier balances:', e);
    }
  }

  getPurchaseMetrics(): PurchaseDashboardMetrics {
    const list = this.getPurchaseInvoices().filter((i) => i.status !== 'CANCELLED');
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);

    let totalPurchasesToday = 0;
    let totalPurchasesMonth = 0;
    let totalPaidPurchases = 0;
    let totalOutstandingSupplierPayments = 0;
    let totalVatInput = 0;

    for (const inv of list) {
      const invDate = inv.issueDate || '';
      if (invDate.startsWith(todayStr)) {
        totalPurchasesToday += inv.grandTotal;
      }
      if (invDate.startsWith(currentMonthStr)) {
        totalPurchasesMonth += inv.grandTotal;
      }
      totalPaidPurchases += inv.amountPaid;
      totalOutstandingSupplierPayments += inv.remainingBalance;
      totalVatInput += inv.totalVat;
    }

    return {
      totalPurchasesToday,
      totalPurchasesMonth,
      totalOutstandingSupplierPayments,
      totalPaidPurchases,
      purchaseInvoicesCount: list.length,
      totalVatInput,
    };
  }

  getInitialPurchaseInvoices(): PurchaseInvoice[] {
    const suppliers = this.getInitialSuppliers();
    const supJazeera = suppliers[0];
    const supJotun = suppliers[1];
    const supTools = suppliers[2];

    const todayStr = new Date().toISOString().split('T')[0];

    return [
      {
        id: 'pinv_1001',
        invoiceNumber: 'PINV-2026-0001',
        supplierInvoiceNumber: 'JAZ-99882',
        purchaseOrderNumber: 'PO-2026-014',
        issueDate: todayStr,
        issueTime: '10:30:00',
        dueDate: '2026-11-18',
        status: 'FINALIZED',
        pricingMode: 'EXCLUSIVE',
        supplier: supJazeera,
        items: [
          {
            id: 'pitem_1',
            code: 'JAZ-EXT-01',
            nameAr: 'دهان أساس مائي خارجي (برايمر)',
            nameEn: 'Exterior Water-Based Primer',
            unit: 'BUCKET',
            unitAr: 'سطل',
            unitEn: 'Bucket',
            quantity: 30,
            unitPrice: 120.0,
            discountPercent: 5,
            discountAmount: 180.0,
            vatRate: 15,
            vatTreatment: 'EXCLUSIVE',
            subtotalBeforeVat: 3420.0,
            vatAmount: 513.0,
            subtotalWithVat: 3933.0,
            isVatRecoverable: true,
          },
          {
            id: 'pitem_2',
            code: 'JAZ-TEX-02',
            nameAr: 'معجون تكسير واجهات ناعم 20 كجم',
            nameEn: 'Smooth Facade Texture Putty 20kg',
            unit: 'BAG',
            unitAr: 'كيس',
            unitEn: 'Bag',
            quantity: 50,
            unitPrice: 45.0,
            discountPercent: 0,
            discountAmount: 0,
            vatRate: 15,
            vatTreatment: 'EXCLUSIVE',
            subtotalBeforeVat: 2250.0,
            vatAmount: 337.5,
            subtotalWithVat: 2587.5,
            isVatRecoverable: true,
          },
        ],
        subtotalBeforeVat: 5850.0,
        totalDiscount: 180.0,
        taxableAmount: 5670.0,
        totalVat: 850.5,
        grandTotal: 6520.5,
        paymentMethod: 'BANK_TRANSFER',
        paymentStatus: 'PARTIALLY_PAID',
        amountPaid: 3000.0,
        remainingBalance: 3520.5,
        payments: [
          {
            id: 'pay_1',
            date: todayStr,
            amount: 3000.0,
            paymentMethod: 'BANK_TRANSFER',
            referenceNumber: 'TRX-998811',
            notes: 'دفعة مقدمة من الحساب البنكي',
          },
        ],
        notesAr: 'توريد دفعة المرحلة الأولى لمشروع دهانات واجهات العليا',
        notesEn: 'Phase 1 supply batch for Al Olaya project',
        internalReference: 'REF-STORE-A',
        createdAt: `${todayStr}T10:30:00.000Z`,
        updatedAt: `${todayStr}T10:30:00.000Z`,
      },
      {
        id: 'pinv_1002',
        invoiceNumber: 'PINV-2026-0002',
        supplierInvoiceNumber: 'JOT-44512',
        purchaseOrderNumber: 'PO-2026-015',
        issueDate: todayStr,
        issueTime: '12:15:00',
        dueDate: '2026-11-05',
        status: 'FINALIZED',
        pricingMode: 'INCLUSIVE',
        supplier: supJotun,
        items: [
          {
            id: 'pitem_3',
            code: 'JOT-FENO-SILK',
            nameAr: 'دهان جوتن فينوماستيك حريري أبيض 18 لتر',
            nameEn: 'Jotun Fenomastic Silk White 18L',
            unit: 'BUCKET',
            unitAr: 'سطل',
            unitEn: 'Bucket',
            quantity: 25,
            unitPrice: 230.0,
            discountPercent: 0,
            discountAmount: 0,
            vatRate: 15,
            vatTreatment: 'INCLUSIVE',
            subtotalBeforeVat: 5000.0,
            vatAmount: 750.0,
            subtotalWithVat: 5750.0,
            isVatRecoverable: true,
          },
        ],
        subtotalBeforeVat: 5000.0,
        totalDiscount: 0,
        taxableAmount: 5000.0,
        totalVat: 750.0,
        grandTotal: 5750.0,
        paymentMethod: 'CASH',
        paymentStatus: 'PAID',
        amountPaid: 5750.0,
        remainingBalance: 0,
        payments: [
          {
            id: 'pay_2',
            date: todayStr,
            amount: 5750.0,
            paymentMethod: 'CASH',
            referenceNumber: 'CASH-REC-102',
            notes: 'سداد نقدي عند الاستلام في المستودع',
          },
        ],
        notesAr: 'استلام كامل بالمستودع بحالة ممتازة',
        internalReference: 'STORE-RECEIPT-40',
        createdAt: `${todayStr}T12:15:00.000Z`,
        updatedAt: `${todayStr}T12:15:00.000Z`,
      },
      {
        id: 'pinv_1003',
        invoiceNumber: 'PINV-2026-0003',
        supplierInvoiceNumber: 'TOOL-8812',
        purchaseOrderNumber: 'PO-2026-012',
        issueDate: '2026-10-10',
        issueTime: '14:00:00',
        dueDate: '2026-10-25',
        status: 'FINALIZED',
        pricingMode: 'EXCLUSIVE',
        supplier: supTools,
        items: [
          {
            id: 'pitem_4',
            code: 'TOOL-ROL-09',
            nameAr: 'رول دهان جدران احترافي 9 بوصة',
            nameEn: 'Pro Wall Paint Roller 9 Inch',
            unit: 'BOX',
            unitAr: 'كرتون',
            unitEn: 'Box',
            quantity: 20,
            unitPrice: 85.0,
            discountPercent: 0,
            discountAmount: 0,
            vatRate: 15,
            vatTreatment: 'EXCLUSIVE',
            subtotalBeforeVat: 1700.0,
            vatAmount: 255.0,
            subtotalWithVat: 1955.0,
            isVatRecoverable: true,
          },
          {
            id: 'pitem_5',
            code: 'TOOL-BRU-03',
            nameAr: 'فرشاة دهان مقاس 3 بوصة شعر طبيعي',
            nameEn: 'Paint Brush 3 Inch Natural Bristle',
            unit: 'BOX',
            unitAr: 'كرتون',
            unitEn: 'Box',
            quantity: 15,
            unitPrice: 60.0,
            discountPercent: 0,
            discountAmount: 0,
            vatRate: 15,
            vatTreatment: 'EXCLUSIVE',
            subtotalBeforeVat: 900.0,
            vatAmount: 135.0,
            subtotalWithVat: 1035.0,
            isVatRecoverable: true,
          },
        ],
        subtotalBeforeVat: 2600.0,
        totalDiscount: 0,
        taxableAmount: 2600.0,
        totalVat: 390.0,
        grandTotal: 2990.0,
        paymentMethod: 'CREDIT',
        paymentStatus: 'UNPAID',
        amountPaid: 0,
        remainingBalance: 2990.0,
        payments: [],
        notesAr: 'مشتريات عدد وأدوات دهان - أجل 15 يوم',
        notesEn: 'Paint tools credit purchase 15 days',
        internalReference: 'CREDIT-PO-88',
        createdAt: '2026-10-10T14:00:00.000Z',
        updatedAt: '2026-10-10T14:00:00.000Z',
      },
    ];
  }

  // Backup & Restore
  exportAllData(): string {
    const data = {
      company: this.getCompany(),
      customers: this.getCustomers(),
      suppliers: this.getSuppliers(),
      products: this.getProducts(),
      invoices: this.getInvoices(),
      purchaseInvoices: this.getPurchaseInvoices(),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }

  importAllData(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.company) this.saveCompany(parsed.company);
      if (parsed.customers) this.saveCustomers(parsed.customers);
      if (parsed.suppliers) this.saveSuppliers(parsed.suppliers);
      if (parsed.products) this.saveProducts(parsed.products);
      if (parsed.invoices) this.saveInvoices(parsed.invoices);
      if (parsed.purchaseInvoices) this.savePurchaseInvoices(parsed.purchaseInvoices);
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  resetToDefaultSampleData(): void {
    this.purgeAllDemoData();
  }

  clearAllDemoData(): void {
    this.purgeAllDemoData();
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
