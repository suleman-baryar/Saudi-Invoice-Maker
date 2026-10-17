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
} from 'lucide-react';

interface InvoiceEditorProps {
  initialInvoice?: Invoice | null;
  onSaveSuccess: (savedInvoice: Invoice) => void;
  onCancel: () => void;
  onPreview: (invoice: Invoice) => void;
  onPrintPreview?: (invoice: Invoice) => void;
  lang: Language;
}

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({
  initialInvoice,
  onSaveSuccess,
  onCancel,
  onPreview,
  onPrintPreview,
  lang,
}) => {
  const company: CompanyProfile = storage.getCompany();
  const [customers, setCustomers] = useState<Customer[]>(storage.getCustomers());
  const [products] = useState<Product[]>(storage.getProducts());
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
        code: product?.code || '',
        nameAr: product?.nameAr || 'صنف جديد / خدمة جديدة',
        nameEn: product?.nameEn || 'New Item / Service',
        quantity: 1,
        unitPrice: product ? product.unitPrice : 50,
        unitAr: product?.unitAr || 'حبة',
        unitEn: product?.unitEn || 'Piece',
        vatRate: product ? product.vatRate : 15,
        discountPercent: 0,
        discountAmount: 0,
      },
      pricingMode
    );
    setItems((prev) => [...prev, newItem]);
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isRtl ? 'رقم جوال / واتساب العميل' : 'Customer Phone / WhatsApp'}</span>
                </span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  {isRtl ? 'مكتوب بالفاتورة' : 'On Invoice'}
                </span>
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder={isRtl ? 'مثال: 0501234567' : 'e.g. 0501234567'}
                className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#25D366] bg-white"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.deliveryAddress}
              </label>
              <input
                type="text"
                value={deliveryAddressAr}
                onChange={(e) => setDeliveryAddressAr(e.target.value)}
                placeholder={t.deliveryAddressPlaceholder}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Invoice Metadata & Pricing Mode Toggle */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
            {t.invoiceDetails}
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.invNumberLabel}</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.issueDateLabel}</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          {/* PRICING MODE SELECTOR */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <span>{t.pricingMethodLabel}</span>
              <Info className="w-3.5 h-3.5 text-blue-600" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handlePricingModeChange('INCLUSIVE')}
                className={`p-2.5 rounded-lg text-xs font-bold border transition text-center ${
                  pricingMode === 'INCLUSIVE'
                    ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-xs ring-1 ring-blue-600'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div>{t.modeAInclusive}</div>
                <div className="text-[10px] font-normal text-slate-500 mt-0.5">MODE A</div>
              </button>

              <button
                type="button"
                onClick={() => handlePricingModeChange('EXCLUSIVE')}
                className={`p-2.5 rounded-lg text-xs font-bold border transition text-center ${
                  pricingMode === 'EXCLUSIVE'
                    ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-xs ring-1 ring-blue-600'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div>{t.modeBExclusive}</div>
                <div className="text-[10px] font-normal text-slate-500 mt-0.5">MODE B</div>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              {pricingMode === 'INCLUSIVE' ? t.modeAExplain : t.modeBExplain}
            </p>
          </div>
        </div>
      </div>

      {/* LINE ITEMS SECTION */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">{t.itemsSection}</h3>
            <p className="text-xs text-slate-500">
              {t.itemsSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              onChange={(e) => {
                const prod = products.find((p) => p.id === e.target.value);
                if (prod) {
                  addItem(prod);
                  e.target.value = '';
                }
              }}
              defaultValue=""
              className="text-xs p-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 font-medium cursor-pointer"
            >
              <option value="" disabled>
                {t.addProductFromList}
              </option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {isRtl ? p.nameAr : (p.nameEn || p.nameAr)} - {p.unitPrice} SAR
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => addItem()}
              className="px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition inline-flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              {t.customItemBtn}
            </button>
          </div>
        </div>

        {/* Items Table Responsive */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className={`w-full text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-2.5 w-8 text-center">{t.colIndex}</th>
                <th className="p-2.5 min-w-[200px]">{t.colDesc}</th>
                <th className="p-2.5 w-20 text-center">{t.colQty}</th>
                <th className="p-2.5 w-20 text-center">{t.colUnit}</th>
                <th className="p-2.5 w-24 text-center">{t.colUnitPrice}</th>
                <th className="p-2.5 w-20 text-center">{t.colDiscount}</th>
                <th className="p-2.5 w-20 text-center">{t.colVatRate}</th>
                <th className="p-2.5 w-24 text-center">{t.colVatAmount}</th>
                <th className="p-2.5 w-28 text-center">{t.colTotal}</th>
                <th className="p-2.5 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="p-2.5 text-center text-slate-400 font-mono">{index + 1}</td>
                  
                  {/* Name Arabic & English */}
                  <td className="p-2.5 space-y-1">
                    <input
                      type="text"
                      value={item.nameAr}
                      onChange={(e) => updateItem(index, { nameAr: e.target.value })}
                      placeholder={t.itemNameArPlaceholder}
                      className="w-full text-xs p-1.5 border border-slate-200 rounded font-medium focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={item.nameEn || ''}
                      onChange={(e) => updateItem(index, { nameEn: e.target.value })}
                      placeholder={t.itemNameEnPlaceholder}
                      dir="ltr"
                      className="w-full text-[11px] p-1 border border-slate-200 rounded text-slate-600 focus:ring-1 focus:ring-blue-500"
                    />
                  </td>

                  {/* Quantity */}
                  <td className="p-2.5">
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs p-1.5 border border-slate-200 rounded text-center font-mono font-bold"
                    />
                  </td>

                  {/* Unit */}
                  <td className="p-2.5">
                    <input
                      type="text"
                      value={isRtl ? item.unitAr : (item.unitEn || item.unitAr)}
                      onChange={(e) => updateItem(index, { unitAr: e.target.value, unitEn: e.target.value })}
                      placeholder={t.unitPlaceholder}
                      className="w-full text-xs p-1.5 border border-slate-200 rounded text-center"
                    />
                  </td>

                  {/* Unit Price */}
                  <td className="p-2.5">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs p-1.5 border border-slate-200 rounded text-center font-mono font-bold text-blue-900"
                    />
                  </td>

                  {/* Discount % */}
                  <td className="p-2.5">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={item.discountPercent || 0}
                      onChange={(e) => updateItem(index, { discountPercent: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs p-1.5 border border-slate-200 rounded text-center font-mono text-rose-600"
                    />
                  </td>

                  {/* VAT Rate % */}
                  <td className="p-2.5">
                    <select
                      value={item.vatRate}
                      onChange={(e) => updateItem(index, { vatRate: parseFloat(e.target.value) })}
                      className="w-full text-xs p-1.5 border border-slate-200 rounded text-center font-mono bg-white"
                    >
                      <option value="15">15%</option>
                      <option value="0">0%</option>
                    </select>
                  </td>

                  {/* Calculated VAT Amount */}
                  <td className="p-2.5 text-center font-mono font-semibold text-blue-700 bg-slate-50/50">
                    {formatCurrency(item.vatAmount)}
                  </td>

                  {/* Calculated Total with VAT */}
                  <td className="p-2.5 text-center font-mono font-bold text-slate-900 bg-slate-50/50">
                    {formatCurrency(item.subtotalWithVat)}
                  </td>

                  {/* Delete Item */}
                  <td className="p-2.5 text-center">
                    <button
                      type="button"
                      disabled={items.length <= 1}
                      onClick={() => removeItem(index)}
                      className="text-slate-400 hover:text-rose-600 disabled:opacity-30 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Payment Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Payment Details & Notes */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.paymentMethodLabel}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="CASH">{t.cash}</option>
                  <option value="CARD">{t.card}</option>
                  <option value="BANK_TRANSFER">{t.bankTransfer}</option>
                  <option value="CREDIT">{t.credit}</option>
                  <option value="OTHER">{t.otherPayment}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.paymentStatusLabel}
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="PAID">{t.paidFull}</option>
                  <option value="UNPAID">{t.unpaid}</option>
                  <option value="PARTIALLY_PAID">{t.partiallyPaid}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.invoiceNotes}
              </label>
              <textarea
                rows={2}
                value={notesAr}
                onChange={(e) => setNotesAr(e.target.value)}
                placeholder={t.notesPlaceholder}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Grand Totals Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">
              {t.summaryTitle}
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>{t.taxableSubtotal}</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(totals.subtotalBeforeVat)} SAR
                </span>
              </div>

              {totals.totalDiscount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>{t.totalDiscounts}</span>
                  <span className="font-mono font-bold">
                    -{formatCurrency(totals.totalDiscount)} SAR
                  </span>
                </div>
              )}

              <div className="flex justify-between text-blue-700">
                <span>{t.totalVatLabel}</span>
                <span className="font-mono font-bold">
                  {formatCurrency(totals.totalVat)} SAR
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-extrabold text-slate-900">
                <span>{t.grandTotalLabel}</span>
                <span className="text-base text-emerald-700 font-mono">
                  {formatCurrency(totals.grandTotal)} SAR
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          <span className="font-semibold text-slate-700">
            {isRtl ? 'المبلغ الإجمالي المستحق:' : 'Total Amount Due:'}
          </span>{' '}
          <strong className="text-slate-900 font-mono text-sm">
            {formatCurrency(totals.grandTotal)} SAR
          </strong>
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
          >
            <Printer className="w-3.5 h-3.5 text-slate-700" />
            <span>{isRtl ? 'معاينة الطباعة' : 'Print Preview'}</span>
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
    </div>
  );
};
