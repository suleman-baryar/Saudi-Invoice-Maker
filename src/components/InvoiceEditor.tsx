import React, { useState } from 'react';
import {
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  PricingMode,
  PaymentMethod,
  PaymentStatus,
  Customer,
  Product,
  CompanyProfile,
} from '../types';
import {
  calculateLineItem,
  calculateInvoiceTotals,
  formatCurrency,
} from '../utils/vatCalculations';
import { generateZatcaTlvBase64 } from '../utils/zatcaTlv';
import { storage } from '../utils/storage';
import { Language, translations } from '../utils/translations';
import { WhatsAppIcon } from './WhatsAppIcon';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import { SmsShareModal } from './SmsShareModal';
import { SearchableProductSelect } from './SearchableProductSelect';
import { ItemAutocompleteInput } from './ItemAutocompleteInput';
import {
  Plus,
  Trash2,
  Save,
  CheckCircle,
  Eye,
  UserPlus,
  Info,
  Printer,
  Phone,
  Smartphone,
  Copy,
  ListPlus,
  Layers,
  Sparkles,
  Minus,
  X,
} from 'lucide-react';

interface InvoiceEditorProps {
  initialInvoice?: Invoice | null;
  onSaveSuccess: (savedInvoice: Invoice) => void;
  onCancel: () => void;
  onPreview: (invoice: Invoice) => void;
  onPrintPreview?: (invoice: Invoice) => void;
  onDelete?: (invoice: Invoice) => void;
  lang: Language;
}

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({
  initialInvoice,
  onSaveSuccess,
  onCancel,
  onPreview,
  onPrintPreview,
  onDelete,
  lang,
}) => {
  const company: CompanyProfile = storage.getCompany();
  const [customers, setCustomers] = useState<Customer[]>(storage.getCustomers());
  const [products, setProducts] = useState<Product[]>(storage.getProducts());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const t = translations[lang].editor;
  const isRtl = lang === 'ar';

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    initialInvoice?.invoiceNumber || storage.getNextInvoiceNumber(company.invoicePrefix || 'INV-2026-')
  );
  const [issueDate, setIssueDate] = useState<string>(
    initialInvoice?.issueDate || new Date().toISOString().split('T')[0]
  );
  const [issueTime, setIssueTime] = useState<string>(
    initialInvoice?.issueTime || new Date().toTimeString().split(' ')[0]
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialInvoice?.customer?.id || (customers[0]?.id || '')
  );
  const [customerPhone, setCustomerPhone] = useState<string>(() => {
    if (initialInvoice?.customer?.phone) return initialInvoice.customer.phone;
    const initialCust = customers.find(c => c.id === (initialInvoice?.customer?.id || customers[0]?.id));
    return initialCust?.phone || '';
  });
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppInvoice, setWhatsAppInvoice] = useState<Invoice | null>(null);
  const [deliveryAddressAr, setDeliveryAddressAr] = useState<string>(
    initialInvoice?.deliveryAddressAr || ''
  );
  const [pricingMode, setPricingMode] = useState<PricingMode>(
    initialInvoice?.pricingMode || company.defaultPricingMode || 'INCLUSIVE'
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initialInvoice?.paymentMethod || 'CASH'
  );
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    initialInvoice?.paymentStatus || 'PAID'
  );
  const [notesAr, setNotesAr] = useState<string>(
    initialInvoice?.notesAr || (isRtl ? 'شكراً لتعاملكم معنا.' : 'Thank you for your business.')
  );

  // Line Items
  const [items, setItems] = useState<InvoiceItem[]>(() => {
    if (initialInvoice && initialInvoice.items.length > 0) {
      return initialInvoice.items;
    }
    const firstProd = products[0];
    if (firstProd) {
      return [
        calculateLineItem(
          {
            id: 'item_' + Date.now(),
            productId: firstProd.id,
            code: firstProd.code,
            nameAr: firstProd.nameAr,
            nameEn: firstProd.nameEn,
            quantity: 1,
            unitPrice: firstProd.unitPrice,
            unitAr: firstProd.unitAr,
            unitEn: firstProd.unitEn,
            vatRate: firstProd.vatRate,
            discountPercent: 0,
            discountAmount: 0,
          },
          pricingMode
        ),
      ];
    }
    return [
      calculateLineItem(
        {
          id: 'item_' + Date.now(),
          code: '',
          nameAr: '',
          nameEn: '',
          quantity: 1,
          unitPrice: 0,
          unitAr: isRtl ? 'حبة' : 'Piece',
          unitEn: 'Piece',
          vatRate: 15,
          discountPercent: 0,
          discountAmount: 0,
        },
        pricingMode
      ),
    ];
  });

  // Quick Customer Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustNameAr, setNewCustNameAr] = useState('');
  const [newCustNameEn, setNewCustNameEn] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustVat, setNewCustVat] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Live recalculate items whenever pricingMode changes
  const handlePricingModeChange = (newMode: PricingMode) => {
    setPricingMode(newMode);
    setItems((prev) =>
      prev.map((item) =>
        calculateLineItem(
          {
            ...item,
            discountPercent: item.discountPercent,
            discountAmount: item.discountAmount,
          },
          newMode
        )
      )
    );
  };

  // Recalculate totals
  const totals = calculateInvoiceTotals(items, pricingMode, 0);

  // Update item field
  const updateItem = (index: number, updates: Partial<InvoiceItem>) => {
    setItems((prev) => {
      const copy = [...prev];
      const target = { ...copy[index], ...updates };
      copy[index] = calculateLineItem(target, pricingMode);
      return copy;
    });
  };

  // Add line item
  const addItem = (product?: Product) => {
    const newItem = calculateLineItem(
      {
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        productId: product?.id,
        code: product?.code || `ITM-${items.length + 1}`,
        nameAr: product?.nameAr || '',
        nameEn: product?.nameEn || '',
        quantity: 1,
        unitPrice: product ? product.unitPrice : 0,
        unitAr: product?.unitAr || (isRtl ? 'حبة' : 'Piece'),
        unitEn: product?.unitEn || 'Piece',
        vatRate: product ? product.vatRate : 15,
        discountPercent: 0,
        discountAmount: 0,
      },
      pricingMode
    );
    setItems((prev) => [...prev, newItem]);
  };

  // Add multiple blank items at once for rapid billing
  const addMultipleItems = (count: number) => {
    const newItems: InvoiceItem[] = [];
    for (let i = 0; i < count; i++) {
      newItems.push(
        calculateLineItem(
          {
            id: 'item_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substr(2, 4),
            code: `ITM-${items.length + i + 1}`,
            nameAr: '',
            nameEn: '',
            quantity: 1,
            unitPrice: 0,
            unitAr: isRtl ? 'سطل' : 'Bucket',
            unitEn: 'Bucket',
            vatRate: 15,
            discountPercent: 0,
            discountAmount: 0,
          },
          pricingMode
        )
      );
    }
    setItems((prev) => [...prev, ...newItems]);
  };

  // Duplicate an existing line item
  const duplicateItem = (index: number) => {
    const itemToClone = items[index];
    if (!itemToClone) return;
    const cloned = calculateLineItem(
      {
        ...itemToClone,
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        code: itemToClone.code ? `${itemToClone.code}-copy` : `ITM-${items.length + 1}`,
      },
      pricingMode
    );
    setItems((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, cloned);
      return copy;
    });
  };

  // Remove item
  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Quick Add Customer Handler
  const handleQuickAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustNameAr.trim() && !newCustNameEn.trim()) return;

    const created = storage.addCustomer({
      nameAr: newCustNameAr.trim() || newCustNameEn.trim(),
      nameEn: newCustNameEn.trim() || newCustNameAr.trim(),
      phone: newCustPhone.trim(),
      vatNumber: newCustVat.trim(),
      addressAr: newCustAddress.trim(),
      cityAr: 'الرياض',
    });

    const refreshed = storage.getCustomers();
    setCustomers(refreshed);
    setSelectedCustomerId(created.id);
    setCustomerPhone(created.phone);
    setShowAddCustomerModal(false);
    setNewCustNameAr('');
    setNewCustNameEn('');
    setNewCustPhone('');
    setNewCustVat('');
    setNewCustAddress('');
  };

  // Build Invoice Object
  const buildCurrentInvoice = (targetStatus: InvoiceStatus): Invoice => {
    const baseCust =
      customers.find((c) => c.id === selectedCustomerId) ||
      customers[0] || {
        id: 'cust_unknown',
        nameAr: 'عميل نقدي عام',
        nameEn: 'Cash Customer',
        phone: customerPhone,
        createdAt: new Date().toISOString(),
      };

    const cust: Customer = {
      ...baseCust,
      phone: customerPhone.trim(),
    };

    const calculatedTotals = calculateInvoiceTotals(items, pricingMode, 0);

    const timestampIso = `${issueDate}T${issueTime}Z`;
    const zatcaQr = generateZatcaTlvBase64({
      sellerName: company.nameAr,
      vatNumber: company.vatNumber,
      timestamp: timestampIso,
      grandTotal: calculatedTotals.grandTotal.toFixed(2),
      totalVat: calculatedTotals.totalVat.toFixed(2),
    });

    return {
      id: initialInvoice?.id || 'inv_' + Date.now(),
      invoiceNumber,
      issueDate,
      issueTime,
      status: targetStatus,
      pricingMode,
      company,
      customer: cust,
      deliveryAddressAr,
      items,
      subtotalBeforeVat: calculatedTotals.subtotalBeforeVat,
      totalDiscount: calculatedTotals.totalDiscount,
      taxableAmount: calculatedTotals.taxableAmount,
      totalVat: calculatedTotals.totalVat,
      grandTotal: calculatedTotals.grandTotal,
      paymentMethod,
      paymentStatus,
      amountPaid: paymentStatus === 'PAID' ? calculatedTotals.grandTotal : 0,
      notesAr,
      notesEn: '',
      termsAr: company.footerNotesAr,
      termsEn: company.footerNotesEn,
      zatcaQrBase64: zatcaQr,
      createdAt: initialInvoice?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const handleSave = (targetStatus: 'DRAFT' | 'FINALIZED') => {
    const inv = buildCurrentInvoice(targetStatus);
    storage.saveInvoice(inv);
    onSaveSuccess(inv);
  };

  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);

  const handleSaveAndSms = () => {
    const inv = buildCurrentInvoice('FINALIZED');
    storage.saveInvoice(inv);
    setWhatsAppInvoice(inv);
    setIsSmsModalOpen(true);
  };

  const handleSaveAndWhatsApp = () => {
    const inv = buildCurrentInvoice('FINALIZED');
    storage.saveInvoice(inv);
    setWhatsAppInvoice(inv);
    setIsWhatsAppModalOpen(true);
  };

  const handleTriggerPreview = () => {
    const inv = buildCurrentInvoice(initialInvoice?.status || 'DRAFT');
    onPreview(inv);
  };

  const handleTriggerPrintPreview = () => {
    const inv = buildCurrentInvoice(initialInvoice?.status || 'DRAFT');
    if (onPrintPreview) {
      onPrintPreview(inv);
    } else {
      onPreview(inv);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>{initialInvoice ? t.editTitle : t.newTitle}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-blue-50 text-blue-700 border border-blue-200">
              {invoiceNumber}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.zatcaCompliant}
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            {t.cancel}
          </button>

          <button
            type="button"
            onClick={handleTriggerPrintPreview}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
            title={isRtl ? 'معاينة وطباعة الفاتورة' : 'Print Preview Invoice'}
          >
            <Printer className="w-3.5 h-3.5 text-slate-700" />
            <span>{isRtl ? 'معاينة الطباعة' : 'Print Preview'}</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerPreview}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
          >
            <Eye className="w-3.5 h-3.5" />
            {t.livePreview}
          </button>

          <button
            type="button"
            onClick={() => handleSave('DRAFT')}
            className="px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            {t.saveDraft}
          </button>

          <button
            type="button"
            onClick={() => handleSave('FINALIZED')}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
          >
            <CheckCircle className="w-4 h-4" />
            {t.finalizeIssue}
          </button>

          <button
            type="button"
            onClick={handleSaveAndSms}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-950 active:bg-slate-900 rounded-lg transition inline-flex items-center gap-1.5 shadow-md"
            title={isRtl ? 'حفظ الفاتورة وإرسالها فوراً كرسالة SMS لشريحة العميل باسم Markaz Al Malk Paint وبدون إظهار رقمك الشخصي' : 'Save and send invoice via SMS as Markaz Al Malk Paint'}
          >
            <Smartphone className="w-4 h-4 text-blue-200" />
            <span>{isRtl ? 'إرسال SMS لشريحة العميل (Markaz Al Malk)' : 'Send SMS (Markaz Al Malk)'}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAndWhatsApp}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
            title={isRtl ? 'إرسال الفاتورة عبر واتساب إلى رقم العميل' : 'Send invoice via WhatsApp to customer'}
          >
            <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
            <span>{isRtl ? 'واتساب' : 'WhatsApp'}</span>
          </button>
        </div>
      </div>

      {/* Primary Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer & Delivery Section */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">{t.customerSection}</h3>
            <button
              type="button"
              onClick={() => setShowAddCustomerModal(true)}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {t.addNewCustomer}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                {t.selectCustomer}
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedCustomerId(id);
                  const found = customers.find((c) => c.id === id);
                  if (found && found.phone) {
                    setCustomerPhone(found.phone);
                  }
                }}
                className="w-full text-sm sm:text-base p-3 rounded-xl border border-slate-300 bg-white font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              >
                {customers.length === 0 ? (
                  <option value="">{isRtl ? 'عميل نقدي عام (اضغط "+ إضافة عميل جديد" للتسجيل)' : 'General Cash Client (Click "+ Add New Customer")'}</option>
                ) : (
                  customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {isRtl ? c.nameAr : (c.nameEn || c.nameAr)} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>{isRtl ? 'رقم جوال / واتساب العميل' : 'Customer Phone / WhatsApp'}</span>
                </span>
                <span className="text-xs text-emerald-800 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {isRtl ? 'مكتوب بالفاتورة' : 'On Invoice'}
                </span>
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder={isRtl ? 'مثال: 0501234567' : 'e.g. 0501234567'}
                className="w-full text-sm sm:text-base font-mono font-bold p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#25D366] bg-white text-slate-900 shadow-2xs"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                {t.deliveryAddress}
              </label>
              <input
                type="text"
                value={deliveryAddressAr}
                onChange={(e) => setDeliveryAddressAr(e.target.value)}
                placeholder={t.deliveryAddressPlaceholder}
                className="w-full text-sm sm:text-base p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900 shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Invoice Metadata & Pricing Mode Toggle */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3">
            {t.invoiceDetails}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">{t.invNumberLabel}</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full text-sm sm:text-base p-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">{t.issueDateLabel}</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full text-sm sm:text-base p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-900 shadow-2xs"
              />
            </div>
          </div>

          {/* PRICING MODE SELECTOR */}
          <div className="pt-2">
            <label className="block text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <span>{t.pricingMethodLabel}</span>
              <Info className="w-4 h-4 text-blue-600" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handlePricingModeChange('INCLUSIVE')}
                className={`p-3 rounded-xl text-sm font-bold border transition text-center ${
                  pricingMode === 'INCLUSIVE'
                    ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-xs ring-2 ring-blue-600/30'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="font-extrabold text-sm sm:text-base">{t.modeAInclusive}</div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">MODE A</div>
              </button>

              <button
                type="button"
                onClick={() => handlePricingModeChange('EXCLUSIVE')}
                className={`p-3 rounded-xl text-sm font-bold border transition text-center ${
                  pricingMode === 'EXCLUSIVE'
                    ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-xs ring-2 ring-blue-600/30'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="font-extrabold text-sm sm:text-base">{t.modeBExclusive}</div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">MODE B</div>
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              {pricingMode === 'INCLUSIVE' ? t.modeAExplain : t.modeBExplain}
            </p>
          </div>
        </div>
      </div>

      {/* LINE ITEMS SECTION */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>{t.itemsSection}</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  {items.length} {isRtl ? 'بنود' : 'Items'}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                {t.itemsSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Searchable Dropdown for Saved Items in Header */}
            <SearchableProductSelect
              products={products}
              onSelectProduct={(prod) => addItem(prod)}
              onProductCreated={(newProd) => {
                setProducts(storage.getProducts());
              }}
              lang={lang}
              variant="header"
              placeholder={isRtl ? '🔍 اختر من الأصناف المحفوظة في المخزن...' : '🔍 Pick from saved items...'}
            />

            <button
              type="button"
              onClick={() => addItem()}
              className="px-3.5 py-2 text-xs font-black bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl transition inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{isRtl ? '+ إضافة بند جديد' : '+ Add Item'}</span>
            </button>

            <button
              type="button"
              onClick={() => addMultipleItems(3)}
              className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-xl transition inline-flex items-center gap-1.5 border border-slate-200 shadow-2xs"
              title={isRtl ? 'إضافة 3 بنود فارغة دفعة واحدة' : 'Add 3 blank rows at once'}
            >
              <ListPlus className="w-3.5 h-3.5 text-blue-600" />
              <span>{isRtl ? '+ 3 بنود' : '+ 3 Items'}</span>
            </button>

            <button
              type="button"
              onClick={() => addMultipleItems(5)}
              className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-xl transition inline-flex items-center gap-1.5 border border-slate-200 shadow-2xs hidden sm:inline-flex"
              title={isRtl ? 'إضافة 5 بنود فارغة دفعة واحدة' : 'Add 5 blank rows at once'}
            >
              <ListPlus className="w-3.5 h-3.5 text-blue-600" />
              <span>{isRtl ? '+ 5 بنود' : '+ 5 Items'}</span>
            </button>
          </div>
        </div>

        {/* Mobile View: Dedicated Mistake-Proof Card Layout (Screen width < 768px) */}
        <div className="block md:hidden space-y-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="bg-white border-2 border-slate-200 rounded-2xl p-4 space-y-3.5 shadow-sm"
            >
              {/* Card Header: Item Number & Quick Actions */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                    #{index + 1}
                  </span>
                  <span className="font-extrabold text-sm text-slate-900 flex-1 leading-snug">
                    {item.nameAr ? item.nameAr : (isRtl ? 'بند جديد' : 'New Line Item')}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => duplicateItem(index)}
                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition border border-slate-200 bg-slate-50"
                    title={isRtl ? 'تكرار هذا البند' : 'Duplicate'}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={items.length <= 1}
                    onClick={() => removeItem(index)}
                    className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-slate-200 bg-slate-50 disabled:opacity-30"
                    title={isRtl ? 'حذف هذا البند' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Item Name / Autocomplete Search */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {isRtl ? 'اسم الصنف أو المادة *' : 'Item Description *'}
                </label>
                <ItemAutocompleteInput
                  value={item.nameAr}
                  onChange={(val) => updateItem(index, { nameAr: val })}
                  onSelectProduct={(prod) => {
                    updateItem(index, {
                      productId: prod.id,
                      nameAr: prod.nameAr,
                      nameEn: prod.nameEn || '',
                      code: prod.code,
                      unitPrice: prod.unitPrice,
                      unitAr: prod.unitAr,
                      unitEn: prod.unitEn || 'Piece',
                      vatRate: prod.vatRate || 15,
                    });
                  }}
                  onProductCreated={(newProd) => setProducts(storage.getProducts())}
                  products={products}
                  lang={lang}
                  placeholder={isRtl ? 'انقر لاختيار صنف من المخزن أو ابحث...' : t.itemNameArPlaceholder}
                  accentColor="blue"
                />
              </div>

              {/* SKU & English Name */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    {isRtl ? 'رمز الصنف / SKU' : 'SKU / Code'}
                  </label>
                  <input
                    type="text"
                    value={item.code}
                    onChange={(e) => updateItem(index, { code: e.target.value })}
                    placeholder="MLK-01"
                    className="w-full text-xs font-mono font-bold p-2.5 rounded-xl border border-slate-300 bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    {isRtl ? 'الاسم بالإنجليزي (اختياري)' : 'English Name'}
                  </label>
                  <input
                    type="text"
                    value={item.nameEn || ''}
                    onChange={(e) => updateItem(index, { nameEn: e.target.value })}
                    placeholder="Paint"
                    dir="ltr"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white text-slate-800"
                  />
                </div>
              </div>

              {/* Quantity with touch steppers and Unit Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {isRtl ? 'الكمية *' : 'Quantity *'}
                  </label>
                  <div className="flex items-center border-2 border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <button
                      type="button"
                      onClick={() => updateItem(index, { quantity: Math.max(1, Number((item.quantity - 1).toFixed(2))) })}
                      className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-black text-base select-none shrink-0"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full text-center font-mono font-black text-base p-1.5 focus:outline-none bg-transparent text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => updateItem(index, { quantity: Number((item.quantity + 1).toFixed(2)) })}
                      className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-black text-base select-none shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {isRtl ? 'الوحدة' : 'Unit'}
                  </label>
                  <select
                    value={item.unitAr}
                    onChange={(e) => updateItem(index, { unitAr: e.target.value, unitEn: e.target.value })}
                    className="w-full h-10 text-xs sm:text-sm font-bold p-2 rounded-xl border-2 border-slate-300 bg-white text-slate-900 shadow-2xs"
                  >
                    <option value="سطل">سطل (Bucket)</option>
                    <option value="جالون">جالون (Gallon)</option>
                    <option value="علبة">علبة (Can)</option>
                    <option value="كرتون">كرتون (Box)</option>
                    <option value="درزن">درزن (Dozen)</option>
                    <option value="لتر">لتر (Liter)</option>
                    <option value="حبة">حبة (Piece)</option>
                    <option value="رول">رول (Roll)</option>
                    <option value="متر">متر (Meter)</option>
                    <option value="كيس">كيس (Bag)</option>
                    <option value="خدمة">خدمة/مصنعية</option>
                  </select>
                </div>
              </div>

              {/* Price & Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {pricingMode === 'INCLUSIVE'
                      ? (isRtl ? 'سعر الوحدة (شامل الضريبة)' : 'Unit Price (Incl. VAT)')
                      : (isRtl ? 'سعر الوحدة (غير شامل)' : 'Unit Price (Excl. VAT)')}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full text-base font-mono font-black p-2.5 pe-10 rounded-xl border-2 border-slate-300 bg-white text-blue-900 shadow-2xs"
                    />
                    <span className="absolute top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-sans end-2.5">
                      ر.س
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {isRtl ? 'الخصم %' : 'Discount %'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={item.discountPercent || 0}
                      onChange={(e) => updateItem(index, { discountPercent: parseFloat(e.target.value) || 0 })}
                      className="w-full text-base font-mono font-bold p-2.5 pe-8 rounded-xl border-2 border-slate-300 bg-white text-rose-600 shadow-2xs"
                    />
                    <span className="absolute top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 end-2.5">
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Mobile Card Summary Strip */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-600 font-semibold block text-[11px]">
                    {isRtl ? 'ضريبة القيمة المضافة (15%):' : 'VAT (15%):'}
                  </span>
                  <span className="font-mono font-black text-blue-800 text-sm">
                    {formatCurrency(item.vatAmount)} ر.س
                  </span>
                </div>

                <div className="text-end">
                  <span className="text-slate-600 font-semibold block text-[11px]">
                    {isRtl ? 'إجمالي البند شامل الضريبة:' : 'Line Total (Inc. VAT):'}
                  </span>
                  <span className="font-mono font-black text-slate-900 text-base">
                    {formatCurrency(item.subtotalWithVat)} ر.س
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Full Items Table (Screen width >= 768px) */}
        <div className="hidden md:block overflow-x-auto border-2 border-slate-200 rounded-2xl shadow-2xs">
          <table className={`w-full text-sm ${isRtl ? 'text-right' : 'text-left'}`}>
            <thead className="bg-slate-100/90 text-slate-800 font-extrabold border-b border-slate-300">
              <tr>
                <th className="p-3 w-10 text-center shrink-0">{t.colIndex}</th>
                <th className="p-3 min-w-[500px] lg:min-w-[620px] w-auto text-right">{t.colDesc}</th>
                <th className="p-3 w-24 text-center shrink-0 whitespace-nowrap">{t.colQty}</th>
                <th className="p-3 w-28 text-center shrink-0 whitespace-nowrap">{t.colUnit}</th>
                <th className="p-3 w-32 text-center shrink-0 whitespace-nowrap">{t.colUnitPrice}</th>
                <th className="p-3 w-24 text-center shrink-0 whitespace-nowrap">{t.colDiscount}</th>
                <th className="p-3 w-24 text-center shrink-0 whitespace-nowrap">{t.colVatRate}</th>
                <th className="p-3 w-28 text-center shrink-0 whitespace-nowrap">{t.colVatAmount}</th>
                <th className="p-3 w-36 text-center shrink-0 whitespace-nowrap">{t.colTotal}</th>
                <th className="p-3 w-24 text-center shrink-0 whitespace-nowrap">{isRtl ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-3 text-center text-slate-500 font-mono font-bold text-sm shrink-0">{index + 1}</td>
                  
                  {/* Name Arabic & English & SKU on ONE horizontal straight line with maximum flexible space */}
                  <td className="px-4 py-3.5 min-w-[500px] lg:min-w-[620px]">
                    <div className="flex items-center gap-2.5 w-full ps-1 pe-1">
                      <div className="flex-1 min-w-[280px]">
                        <ItemAutocompleteInput
                          value={item.nameAr}
                          onChange={(val) => updateItem(index, { nameAr: val })}
                          onSelectProduct={(prod) => {
                            updateItem(index, {
                              productId: prod.id,
                              nameAr: prod.nameAr,
                              nameEn: prod.nameEn || '',
                              code: prod.code,
                              unitPrice: prod.unitPrice,
                              unitAr: prod.unitAr,
                              unitEn: prod.unitEn || 'Piece',
                              vatRate: prod.vatRate || 15,
                            });
                          }}
                          onProductCreated={(newProd) => {
                            setProducts(storage.getProducts());
                          }}
                          products={products}
                          lang={lang}
                          placeholder={isRtl ? 'انقر لعرض أصناف المخزن أو اكتب للبحث...' : t.itemNameArPlaceholder}
                          accentColor="blue"
                        />
                      </div>
                      <input
                        type="text"
                        value={item.code}
                        onChange={(e) => updateItem(index, { code: e.target.value })}
                        placeholder={isRtl ? 'رمز SKU' : 'SKU'}
                        title={isRtl ? 'رمز الصنف / SKU' : 'SKU / Code'}
                        className="w-24 text-xs font-mono font-bold p-2.5 border border-slate-300 rounded-xl text-slate-700 bg-white shrink-0 shadow-2xs"
                      />
                      <input
                        type="text"
                        value={item.nameEn || ''}
                        onChange={(e) => updateItem(index, { nameEn: e.target.value })}
                        placeholder={isRtl ? 'English name' : 'English'}
                        title={t.itemNameEnPlaceholder}
                        dir="ltr"
                        className="w-32 text-xs font-medium p-2.5 border border-slate-300 rounded-xl text-slate-700 bg-white shrink-0 shadow-2xs"
                      />
                    </div>
                  </td>

                  {/* Quantity */}
                  <td className="p-3">
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full text-sm sm:text-base p-2.5 border border-slate-300 rounded-xl text-center font-mono font-black text-slate-900 bg-white shadow-2xs"
                    />
                  </td>

                  {/* Unit */}
                  <td className="p-3">
                    <input
                      type="text"
                      list="common-units"
                      value={isRtl ? item.unitAr : (item.unitEn || item.unitAr)}
                      onChange={(e) => updateItem(index, { unitAr: e.target.value, unitEn: e.target.value })}
                      placeholder={isRtl ? 'سطل / علبة' : t.unitPlaceholder}
                      className="w-full text-sm sm:text-base p-2.5 border border-slate-300 rounded-xl text-center font-bold text-slate-800 bg-white shadow-2xs"
                    />
                  </td>

                  {/* Unit Price */}
                  <td className="p-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full text-sm sm:text-base p-2.5 border border-slate-300 rounded-xl text-center font-mono font-black text-blue-900 bg-white shadow-2xs"
                    />
                  </td>

                  {/* Discount % */}
                  <td className="p-3">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={item.discountPercent || 0}
                      onChange={(e) => updateItem(index, { discountPercent: parseFloat(e.target.value) || 0 })}
                      className="w-full text-sm sm:text-base p-2.5 border border-slate-300 rounded-xl text-center font-mono font-bold text-rose-600 bg-white shadow-2xs"
                    />
                  </td>

                  {/* VAT Rate % */}
                  <td className="p-3">
                    <select
                      value={item.vatRate}
                      onChange={(e) => updateItem(index, { vatRate: parseFloat(e.target.value) })}
                      className="w-full text-sm sm:text-base p-2.5 border border-slate-300 rounded-xl text-center font-mono font-black text-blue-900 bg-white shadow-2xs"
                    >
                      <option value="15">15%</option>
                      <option value="5">5%</option>
                      <option value="0">0%</option>
                    </select>
                  </td>

                  {/* Calculated VAT Amount */}
                  <td className="p-3 text-center font-mono font-bold text-sm sm:text-base text-blue-700 bg-slate-50/60">
                    {formatCurrency(item.vatAmount)}
                  </td>

                  {/* Calculated Total with VAT */}
                  <td className="p-3 text-center font-mono font-black text-sm sm:text-base text-slate-900 bg-slate-50/60">
                    {formatCurrency(item.subtotalWithVat)}
                  </td>

                  {/* Actions: Duplicate & Delete */}
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => duplicateItem(index)}
                        className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-xl transition border border-slate-200"
                        title={isRtl ? 'تكرار / نسخ هذا البند' : 'Duplicate row'}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={items.length <= 1}
                        onClick={() => removeItem(index)}
                        className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-20 p-2 rounded-xl transition border border-slate-200"
                        title={isRtl ? 'حذف هذا البند' : 'Delete row'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Rapid Multi-Item Addition Bar Below Table */}
        <div className="bg-slate-50/90 p-3.5 rounded-xl border border-dashed border-slate-300 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={() => addItem()}
              className="px-4 py-2 text-xs font-black bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl transition inline-flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{isRtl ? '+ إضافة بند / صنف آخر للفاتورة' : '+ Add Another Item to Invoice'}</span>
            </button>

            <button
              type="button"
              onClick={() => addMultipleItems(3)}
              className="px-3.5 py-2 text-xs font-bold bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 rounded-xl transition inline-flex items-center gap-1.5 border border-slate-300 shadow-2xs"
            >
              <ListPlus className="w-3.5 h-3.5 text-blue-600" />
              <span>{isRtl ? '+ إضافة 3 بنود معاً' : '+ Add 3 Items at once'}</span>
            </button>

            <button
              type="button"
              onClick={() => addMultipleItems(5)}
              className="px-3.5 py-2 text-xs font-bold bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 rounded-xl transition inline-flex items-center gap-1.5 border border-slate-300 shadow-2xs hidden sm:inline-flex"
            >
              <ListPlus className="w-3.5 h-3.5 text-blue-600" />
              <span>{isRtl ? '+ إضافة 5 بنود معاً' : '+ Add 5 Items'}</span>
            </button>

            {/* Quick Search Saved Items from Bottom Bar */}
            <SearchableProductSelect
              products={products}
              onSelectProduct={(prod) => addItem(prod)}
              onProductCreated={(newProd) => {
                setProducts(storage.getProducts());
              }}
              lang={lang}
              variant="compact"
            />
          </div>

          <div className="text-xs text-slate-600 font-semibold flex items-center gap-2">
            <span>{isRtl ? 'إجمالي عدد بنود الفاتورة:' : 'Total Invoice Lines:'}</span>
            <span className="font-mono font-black text-sm text-blue-900 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
              {items.length} {isRtl ? 'أصناف' : 'Items'}
            </span>
          </div>
        </div>

        {/* Paint & Hardware Quick Datalists for Rapid Item & Unit Entry */}
        <datalist id="paint-suggestions">
          <option value="سطل دهان داخلي مائي ناصع البياض" />
          <option value="سطل دهان خارجي بروفايل مقاوم للعوامل الجوية" />
          <option value="جالون أساس مائي عالي الالتصاق" />
          <option value="معجون دهان داخلي ناعم للتأسيس" />
          <option value="رول دهان 9 بوصة تركي أصلي" />
          <option value="شريط لاصق ورقي لحماية الأطراف والجبس" />
          <option value="جالون تينر حار للأعمال الزيتية" />
          <option value="علبة دهان زيتي نصف لمعة أبيض" />
          <option value="ورق صنفرة ناعم رقم 180" />
          <option value="فرشاة دهان 3 بوصة شعر طبيعي" />
          <option value="علبة صبغ ملون مركز" />
          <option value="سطل معجون شروخ ومطاطي" />
        </datalist>

        <datalist id="common-units">
          <option value="سطل" />
          <option value="جالون" />
          <option value="علبة" />
          <option value="كرتون" />
          <option value="درزن" />
          <option value="لتر" />
          <option value="حبة" />
          <option value="رول" />
          <option value="متر" />
          <option value="كيس" />
          <option value="خدمة/مصنعية" />
          <option value="Piece" />
          <option value="Bucket" />
          <option value="Gallon" />
          <option value="Box" />
          <option value="Liter" />
        </datalist>

        {/* Financial Summary & Payment Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Payment Details & Notes */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  {t.paymentMethodLabel}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full text-sm sm:text-base font-semibold p-3 rounded-xl border border-slate-300 bg-white text-slate-900 shadow-2xs"
                >
                  <option value="CASH">{t.cash}</option>
                  <option value="CARD">{t.card}</option>
                  <option value="BANK_TRANSFER">{t.bankTransfer}</option>
                  <option value="CREDIT">{t.credit}</option>
                  <option value="OTHER">{t.otherPayment}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  {t.paymentStatusLabel}
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full text-sm sm:text-base font-semibold p-3 rounded-xl border border-slate-300 bg-white text-slate-900 shadow-2xs"
                >
                  <option value="PAID">{t.paidFull}</option>
                  <option value="UNPAID">{t.unpaid}</option>
                  <option value="PARTIALLY_PAID">{t.partiallyPaid}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                {t.invoiceNotes}
              </label>
              <textarea
                rows={2}
                value={notesAr}
                onChange={(e) => setNotesAr(e.target.value)}
                placeholder={t.notesPlaceholder}
                className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 shadow-2xs"
              />
            </div>
          </div>

          {/* Grand Totals Box */}
          <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 shadow-2xs">
            <h4 className="font-black text-sm uppercase tracking-wider text-slate-700 mb-3 border-b border-slate-200 pb-2">
              {t.summaryTitle}
            </h4>
            <div className="space-y-2.5 text-sm sm:text-base">
              <div className="flex justify-between text-slate-700 font-medium">
                <span>{t.taxableSubtotal}</span>
                <span className="font-mono font-black text-slate-900">
                  {formatCurrency(totals.subtotalBeforeVat)} SAR
                </span>
              </div>

              {totals.totalDiscount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>{t.totalDiscounts}</span>
                  <span className="font-mono font-black">
                    -{formatCurrency(totals.totalDiscount)} SAR
                  </span>
                </div>
              )}

              <div className="flex justify-between text-blue-700 font-bold">
                <span>{t.totalVatLabel}</span>
                <span className="font-mono font-black">
                  {formatCurrency(totals.totalVat)} SAR
                </span>
              </div>

              <div className="pt-3 border-t-2 border-slate-300 flex justify-between items-center text-base sm:text-lg font-black text-slate-900">
                <span>{t.grandTotalLabel}</span>
                <span className="text-xl sm:text-2xl text-emerald-700 font-mono font-black">
                  {formatCurrency(totals.grandTotal)} SAR
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Bar (Fixed at bottom for easy access on mobile and desktop) */}
      <div className="sticky bottom-2 z-40 bg-white/95 backdrop-blur-md p-3.5 sm:p-5 rounded-2xl border-2 border-slate-300 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 text-xs sm:text-base">
              {isRtl ? 'المبلغ الإجمالي المستحق:' : 'Total Amount Due:'}
            </span>
            <span className="text-emerald-700 font-mono font-black text-lg sm:text-2xl">
              {formatCurrency(totals.grandTotal)} <span className="text-xs sm:text-sm font-sans font-bold">SAR</span>
            </span>
          </div>

          <div className="text-xs font-mono font-bold text-slate-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
            {items.length} {isRtl ? 'بنود' : 'Items'}
          </div>
        </div>

        {/* Buttons Row */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-center"
          >
            {t.cancel}
          </button>

          {initialInvoice && initialInvoice.id && onDelete && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-3.5 py-2.5 text-xs sm:text-sm font-bold text-rose-700 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200 rounded-xl transition inline-flex items-center justify-center gap-1.5 shadow-2xs"
              title={isRtl ? 'حذف هذه الفاتورة' : 'Delete Invoice'}
            >
              <Trash2 className="w-4 h-4" />
              <span>{isRtl ? 'حذف الفاتورة' : 'Delete'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleTriggerPrintPreview}
            className="px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition inline-flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Printer className="w-4 h-4 text-slate-700" />
            <span>{isRtl ? 'معاينة' : 'Preview'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave('DRAFT')}
            className="px-3.5 py-2.5 text-xs sm:text-sm font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition inline-flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Save className="w-4 h-4 text-amber-700" />
            <span>{t.saveDraft}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave('FINALIZED')}
            className="col-span-2 sm:col-span-1 px-4 py-3 text-sm sm:text-base font-black text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition inline-flex items-center justify-center gap-2 shadow-md"
          >
            <CheckCircle className="w-5 h-5" />
            <span>{t.finalizeIssue}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAndSms}
            className="px-3 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-950 rounded-xl transition inline-flex items-center justify-center gap-1.5 shadow-xs"
            title={isRtl ? 'حفظ الفاتورة وإرسالها فوراً كرسالة SMS' : 'Save and send SMS'}
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-200" />
            <span>SMS</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAndWhatsApp}
            className="px-3 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-xl transition inline-flex items-center justify-center gap-1.5 shadow-xs"
            title={isRtl ? 'إرسال الفاتورة عبر واتساب' : 'WhatsApp'}
          >
            <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
            <span>واتساب</span>
          </button>
        </div>
      </div>

      {/* QUICK ADD CUSTOMER MODAL */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 p-5" dir={isRtl ? 'rtl' : 'ltr'}>
            <h3 className="font-bold text-slate-900 text-sm mb-3">
              {translations[lang].customers.addModalTitle}
            </h3>
            <form onSubmit={handleQuickAddCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {translations[lang].customers.nameAr}
                </label>
                <input
                  type="text"
                  required
                  value={newCustNameAr}
                  onChange={(e) => setNewCustNameAr(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {translations[lang].customers.nameEn}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={newCustNameEn}
                  onChange={(e) => setNewCustNameEn(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {translations[lang].customers.phone}
                  </label>
                  <input
                    type="text"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {translations[lang].customers.vatNumber}
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={newCustVat}
                    onChange={(e) => setNewCustVat(e.target.value)}
                    placeholder="300000000000003"
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {translations[lang].customers.address}
                </label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  {translations[lang].customers.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  {translations[lang].customers.saveCustomer}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Share Modal */}
      {whatsAppInvoice && (
        <WhatsAppShareModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => {
            setIsWhatsAppModalOpen(false);
            if (whatsAppInvoice) {
              onSaveSuccess(whatsAppInvoice);
            }
          }}
          invoice={whatsAppInvoice}
          lang={lang}
          containerId="printable-invoice-container"
          onInvoiceUpdated={(updated) => {
            setWhatsAppInvoice(updated);
            onSaveSuccess(updated);
          }}
        />
      )}

      {/* Branded SMS Send Modal (Markaz Al Malk Paint) */}
      {whatsAppInvoice && (
        <SmsShareModal
          isOpen={isSmsModalOpen}
          onClose={() => {
            setIsSmsModalOpen(false);
            if (whatsAppInvoice) {
              onSaveSuccess(whatsAppInvoice);
            }
          }}
          invoice={whatsAppInvoice}
          lang={lang}
          onInvoiceUpdated={(updated) => {
            setWhatsAppInvoice(updated);
            onSaveSuccess(updated);
          }}
        />
      )}

      {/* In-App Delete Sales Invoice Confirmation Modal */}
      {showDeleteModal && initialInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-rose-600">
                <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900">
                  {isRtl ? 'تأكيد حذف فاتورة المبيعات' : 'Confirm Sales Invoice Deletion'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-semibold">{isRtl ? 'رقم الفاتورة:' : 'Invoice No:'}</span>
                <span className="font-mono font-black text-rose-700 text-sm">{initialInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-semibold">{isRtl ? 'المبلغ الإجمالي:' : 'Grand Total:'}</span>
                <span className="font-mono font-black text-slate-900">
                  {formatCurrency(initialInvoice.grandTotal || totals.grandTotal)} SAR
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {isRtl
                ? 'هل أنت متأكد من رغبتك في حذف هذه الفاتورة نهائياً؟ سيتم إزالتها من النظام وحسابات المبيعات فوراً.'
                : 'Are you sure you want to permanently delete this sales invoice? It will be removed from your records immediately.'}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition border border-slate-300"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  if (onDelete && initialInvoice) {
                    onDelete(initialInvoice);
                  }
                }}
                className="px-5 py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition shadow-md shadow-rose-600/30 inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isRtl ? 'نعم، احذف الفاتورة نهائياً' : 'Yes, Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
