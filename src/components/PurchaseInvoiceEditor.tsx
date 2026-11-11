import React, { useState, useEffect } from 'react';
import {
  PurchaseInvoice,
  PurchaseItem,
  Supplier,
  PricingMode,
  PaymentMethod,
  PaymentStatus,
  PurchaseUnitType,
  Product,
} from '../types';
import { storage } from '../utils/storage';
import { calculatePurchaseLineItem, calculatePurchaseInvoiceTotals, formatCurrency } from '../utils/vatCalculations';
import { Language, translations } from '../utils/translations';
import { SearchableProductSelect } from './SearchableProductSelect';
import { ItemAutocompleteInput } from './ItemAutocompleteInput';
import {
  Plus,
  Minus,
  Trash2,
  Copy,
  Save,
  Eye,
  X,
  FileText,
  UserPlus,
  Building2,
  Calendar,
  CreditCard,
  Percent,
  CheckCircle,
  AlertCircle,
  Receipt,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface PurchaseInvoiceEditorProps {
  initialInvoice?: PurchaseInvoice | null;
  onSaveSuccess: (invoice: PurchaseInvoice) => void;
  onCancel: () => void;
  onPreview: (invoice: PurchaseInvoice) => void;
  lang: Language;
}

const PAINT_UNITS: { type: PurchaseUnitType; ar: string; en: string }[] = [
  { type: 'BUCKET', ar: 'سطل', en: 'Bucket' },
  { type: 'CAN', ar: 'علبة', en: 'Can' },
  { type: 'BOX', ar: 'كرتون', en: 'Box' },
  { type: 'ROLL', ar: 'رول', en: 'Roll' },
  { type: 'LITER', ar: 'لتر', en: 'Liter' },
  { type: 'BAG', ar: 'كيس', en: 'Bag' },
  { type: 'PIECE', ar: 'حبة', en: 'Piece' },
  { type: 'METER', ar: 'متر', en: 'Meter' },
  { type: 'OTHER', ar: 'أخرى', en: 'Other' },
];

export const PurchaseInvoiceEditor: React.FC<PurchaseInvoiceEditorProps> = ({
  initialInvoice,
  onSaveSuccess,
  onCancel,
  onPreview,
  lang,
}) => {
  const isRtl = lang === 'ar';
  const suppliers = storage.getSuppliers();
  const [products, setProducts] = useState<Product[]>(storage.getProducts());

  // Invoice Meta
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    initialInvoice?.invoiceNumber || storage.getNextPurchaseInvoiceNumber()
  );
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState<string>(
    initialInvoice?.supplierInvoiceNumber || ''
  );
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState<string>(
    initialInvoice?.purchaseOrderNumber || ''
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const [issueDate, setIssueDate] = useState<string>(initialInvoice?.issueDate || todayStr);
  const [dueDate, setDueDate] = useState<string>(initialInvoice?.dueDate || '');

  // Supplier
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    initialInvoice?.supplier?.id || suppliers[0]?.id || ''
  );
  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);

  // New Supplier Form State
  const [newSupNameAr, setNewSupNameAr] = useState('');
  const [newSupNameEn, setNewSupNameEn] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupVat, setNewSupVat] = useState('');
  const [newSupAddress, setNewSupAddress] = useState('');

  // Pricing & Items
  const [pricingMode, setPricingMode] = useState<PricingMode>(
    initialInvoice?.pricingMode || 'EXCLUSIVE'
  );

  const defaultItems: PurchaseItem[] = [
    {
      id: `pitem_${Date.now()}_1`,
      code: 'PNT-EXT-01',
      nameAr: 'دهان مائي خارجي مقاوم للعوامل الجوية',
      nameEn: 'Weatherproof Exterior Water Paint',
      unit: 'BUCKET',
      unitAr: 'سطل',
      unitEn: 'Bucket',
      quantity: 10,
      unitPrice: 140,
      discountPercent: 0,
      discountAmount: 0,
      vatRate: 15,
      vatTreatment: 'EXCLUSIVE',
      subtotalBeforeVat: 1400,
      vatAmount: 210,
      subtotalWithVat: 1610,
      isVatRecoverable: true,
    },
  ];

  const [items, setItems] = useState<PurchaseItem[]>(
    initialInvoice?.items?.length ? initialInvoice.items : defaultItems
  );

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initialInvoice?.paymentMethod || 'BANK_TRANSFER'
  );
  const [amountPaid, setAmountPaid] = useState<number>(initialInvoice?.amountPaid ?? 0);
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Notes & Reference
  const [notesAr, setNotesAr] = useState<string>(initialInvoice?.notesAr || '');
  const [internalReference, setInternalReference] = useState<string>(
    initialInvoice?.internalReference || ''
  );

  // Recalculate totals
  const totals = calculatePurchaseInvoiceTotals(items, pricingMode, 0);
  const remainingBalance = Math.max(0, totals.grandTotal - (amountPaid || 0));

  // Determine auto payment status
  const resolvedPaymentStatus: PaymentStatus =
    remainingBalance <= 0.01 && totals.grandTotal > 0
      ? 'PAID'
      : (amountPaid || 0) > 0
      ? 'PARTIALLY_PAID'
      : 'UNPAID';

  // Handle supplier change
  const currentSupplier = suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0];

  // Item management
  const handleAddItem = () => {
    const newItem: PurchaseItem = {
      id: `pitem_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      code: `PNT-SKU-${items.length + 1}`,
      nameAr: '',
      nameEn: '',
      unit: 'BUCKET',
      unitAr: 'سطل',
      unitEn: 'Bucket',
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
      discountAmount: 0,
      vatRate: 15,
      vatTreatment: pricingMode,
      subtotalBeforeVat: 0,
      vatAmount: 0,
      subtotalWithVat: 0,
      isVatRecoverable: true,
    };
    setItems([...items, newItem]);
  };

  const handleSelectSavedProductForPurchase = (prod: Product) => {
    const newItem: PurchaseItem = {
      id: `pitem_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      productId: prod.id,
      code: prod.code || `PNT-SKU-${items.length + 1}`,
      nameAr: prod.nameAr,
      nameEn: prod.nameEn || '',
      unit: 'BUCKET',
      unitAr: prod.unitAr || 'سطل',
      unitEn: prod.unitEn || 'Bucket',
      quantity: 1,
      unitPrice: prod.unitPrice,
      discountPercent: 0,
      discountAmount: 0,
      vatRate: prod.vatRate || 15,
      vatTreatment: pricingMode,
      subtotalBeforeVat: 0,
      vatAmount: 0,
      subtotalWithVat: 0,
      isVatRecoverable: true,
    };
    setItems([...items, calculatePurchaseLineItem(newItem, pricingMode)]);
  };

  const handleUpdateItem = (index: number, updates: Partial<PurchaseItem>) => {
    const updated = [...items];
    const item = { ...updated[index], ...updates };

    // Update Arabic/English unit label if unit type changed
    if (updates.unit) {
      const match = PAINT_UNITS.find((u) => u.type === updates.unit);
      if (match) {
        item.unitAr = match.ar;
        item.unitEn = match.en;
      }
    }

    const calculated = calculatePurchaseLineItem(item, pricingMode);
    updated[index] = calculated;
    setItems(updated);
  };

  const handleDeleteItem = (index: number) => {
    if (items.length <= 1) {
      alert(isRtl ? 'يجب أن تحتوي فاتورة الشراء على صنف واحد على الأقل.' : 'Purchase invoice must have at least one item.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleDuplicateItem = (index: number) => {
    const itemToCopy = items[index];
    if (!itemToCopy) return;
    const copied: PurchaseItem = {
      ...itemToCopy,
      id: `pitem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    const updated = [...items];
    updated.splice(index + 1, 0, copied);
    setItems(updated);
  };

  const handlePricingModeChange = (newMode: PricingMode) => {
    setPricingMode(newMode);
    const updated = items.map((it) =>
      calculatePurchaseLineItem({ ...it, vatTreatment: newMode }, newMode)
    );
    setItems(updated);
  };

  // Quick Add Supplier
  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupNameAr.trim()) {
      alert(isRtl ? 'يرجى إدخال اسم المورد' : 'Please enter supplier name');
      return;
    }

    const newSup: Supplier = {
      id: `sup_${Date.now()}`,
      nameAr: newSupNameAr.trim(),
      nameEn: newSupNameEn.trim() || newSupNameAr.trim(),
      phone: newSupPhone.trim() || '+966 50 000 0000',
      vatNumber: newSupVat.trim(),
      addressAr: newSupAddress.trim(),
      openingBalance: 0,
      totalPurchases: 0,
      totalPaid: 0,
      currentBalance: 0,
      createdAt: new Date().toISOString(),
    };

    storage.saveSupplier(newSup);
    setSelectedSupplierId(newSup.id);
    setIsNewSupplierModalOpen(false);

    // Reset form
    setNewSupNameAr('');
    setNewSupNameEn('');
    setNewSupPhone('');
    setNewSupVat('');
    setNewSupAddress('');
  };

  const buildPurchaseInvoiceObject = (status: 'FINALIZED' | 'DRAFT'): PurchaseInvoice => {
    const resolvedSupplier = suppliers.find((s) => s.id === selectedSupplierId) || currentSupplier;

    return {
      id: initialInvoice?.id || `pinv_${Date.now()}`,
      invoiceNumber: invoiceNumber.trim() || storage.getNextPurchaseInvoiceNumber(),
      supplierInvoiceNumber: supplierInvoiceNumber.trim(),
      purchaseOrderNumber: purchaseOrderNumber.trim(),
      issueDate,
      issueTime: initialInvoice?.issueTime || new Date().toTimeString().split(' ')[0],
      dueDate: dueDate || undefined,
      status,
      pricingMode,
      supplier: resolvedSupplier,
      items,
      subtotalBeforeVat: totals.subtotalBeforeVat,
      totalDiscount: totals.totalDiscount,
      taxableAmount: totals.taxableAmount,
      totalVat: totals.totalVat,
      grandTotal: totals.grandTotal,
      paymentMethod,
      paymentStatus: resolvedPaymentStatus,
      amountPaid: Math.min(totals.grandTotal, Math.max(0, amountPaid || 0)),
      remainingBalance,
      payments:
        (amountPaid || 0) > 0
          ? [
              ...(initialInvoice?.payments || []),
              {
                id: `pay_${Date.now()}`,
                date: issueDate,
                amount: Math.min(totals.grandTotal, amountPaid),
                paymentMethod,
                notes: paymentNotes || 'دفعة مسجلة عند إنشاء فاتورة الشراء',
              },
            ]
          : initialInvoice?.payments || [],
      notesAr: notesAr.trim(),
      internalReference: internalReference.trim(),
      createdAt: initialInvoice?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const handleSave = (status: 'FINALIZED' | 'DRAFT') => {
    if (!currentSupplier) {
      alert(isRtl ? 'يرجى اختيار المورد أولاً' : 'Please select a supplier first');
      return;
    }

    if (items.some((i) => !i.nameAr.trim() && !i.nameEn.trim())) {
      alert(isRtl ? 'يرجى إدخال اسم الصنف لجميع البنود' : 'Please enter item name for all rows');
      return;
    }

    if (items.some((i) => i.quantity <= 0)) {
      alert(isRtl ? 'يجب أن تكون الكمية أكبر من صفر لجميع الأصناف' : 'Quantity must be greater than zero');
      return;
    }

    const invoiceObj = buildPurchaseInvoiceObject(status);
    storage.savePurchaseInvoice(invoiceObj);
    onSaveSuccess(invoiceObj);
  };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <Receipt className="w-5 h-5 text-emerald-700" />
            </span>
            <div>
              <h1 className="text-xl font-black text-slate-900">
                {initialInvoice
                  ? (isRtl ? 'تعديل فاتورة مشتريات' : 'Edit Purchase Invoice')
                  : (isRtl ? 'إنشاء فاتورة مشتريات جديدة' : 'New Purchase Invoice')}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {isRtl
                  ? 'مركز المالك للدهانات - تسجيل مشتريات ومواد الديكور من الموردين وحساب الضريبة 15%'
                  : 'Markaz Al Malki Paint - Supplier Purchases & 15% VAT Tracking'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            {isRtl ? 'إلغاء' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={() => onPreview(buildPurchaseInvoiceObject('DRAFT'))}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Eye className="w-4 h-4 text-slate-500" />
            <span>{isRtl ? 'معاينة فورية (A4 PDF)' : 'Live Preview'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave('DRAFT')}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl transition"
          >
            {isRtl ? 'حفظ كمسودة' : 'Save Draft'}
          </button>

          <button
            type="button"
            onClick={() => handleSave('FINALIZED')}
            className="px-5 py-2.5 text-xs sm:text-sm font-black text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded-xl transition shadow-md shadow-emerald-900/20 inline-flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{isRtl ? 'اعتماد وحفظ الفاتورة' : 'Finalize & Save Invoice'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Form Left/Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Invoice Meta & Supplier & Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Supplier Selection & Details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span>{isRtl ? 'بيانات المورد (Supplier Information)' : 'Supplier Details'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewSupplierModalOpen(true)}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-bold inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isRtl ? '+ إضافة مورد جديد' : '+ New Supplier'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRtl ? 'اختيار المورد *' : 'Select Supplier *'}
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {isRtl ? s.nameAr : s.nameEn} {s.vatNumber ? `(ض.ق.م: ${s.vatNumber})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRtl ? 'رقم فاتورة المورد الأصلية' : 'Supplier Invoice Number'}
                </label>
                <input
                  type="text"
                  value={supplierInvoiceNumber}
                  onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                  placeholder={isRtl ? 'مثال: JAZ-99882 أو رقم إشعار المورد' : 'e.g. JAZ-99882'}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            {/* Supplier Details Preview Card */}
            {currentSupplier && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-500 block text-[10px]">{isRtl ? 'الرقم الضريبي للمورد:' : 'Supplier VAT #:'}</span>
                  <span className="font-mono font-bold text-slate-800">
                    {currentSupplier.vatNumber || (isRtl ? 'غير متوفر' : 'N/A')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{isRtl ? 'رقم هاتف المورد:' : 'Phone:'}</span>
                  <span className="font-mono font-bold text-slate-800" dir="ltr">
                    {currentSupplier.phone || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{isRtl ? 'رصيد المورد المستحق حالياً:' : 'Current Balance:'}</span>
                  <span className="font-mono font-bold text-amber-700">
                    {formatCurrency(currentSupplier.currentBalance || 0)} SAR
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Invoice Basic Information */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>{isRtl ? 'بيانات فاتورة الشراء وطريقة التسعير' : 'Invoice Details & Pricing Mode'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRtl ? 'رقم فاتورة الشراء' : 'Purchase Invoice #'}
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full text-xs font-mono font-bold p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-slate-50"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRtl ? 'تاريخ الشراء' : 'Purchase Date'}
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRtl ? 'تاريخ الاستحقاق (أجل)' : 'Due Date'}
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRtl ? 'رقم أمر الشراء (PO)' : 'Purchase Order (PO)'}
                </label>
                <input
                  type="text"
                  value={purchaseOrderNumber}
                  onChange={(e) => setPurchaseOrderNumber(e.target.value)}
                  placeholder="PO-2026-..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Pricing Mode Toggle: Inclusive vs Exclusive */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-bold text-xs text-emerald-950 block">
                  {isRtl ? 'طريقة معالجة ضريبة القيمة المضافة (15%):' : 'VAT Treatment:'}
                </span>
                <span className="text-[11px] text-emerald-800 block mt-0.5">
                  {pricingMode === 'INCLUSIVE'
                    ? (isRtl
                        ? 'الأسعار المدخلة شاملة الضريبة (يتم استخراج الضريبة بالمعادلة: السعر × 15 / 115 دون زيادة المبلغ).'
                        : 'Entered prices already include 15% VAT (formula: price × 15 / 115).')
                    : (isRtl
                        ? 'الأسعار المدخلة غير شاملة للضريبة (تُحسب الضريبة 15% وتُضاف على سعر الشراء).'
                        : 'Entered prices exclude VAT (15% added on top).')}
                </span>
              </div>

              <div className="inline-flex rounded-xl p-1 bg-white border border-emerald-300 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handlePricingModeChange('EXCLUSIVE')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    pricingMode === 'EXCLUSIVE'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isRtl ? 'غير شامل الضريبة (Exclusive)' : 'VAT Exclusive'}
                </button>
                <button
                  type="button"
                  onClick={() => handlePricingModeChange('INCLUSIVE')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    pricingMode === 'INCLUSIVE'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isRtl ? 'شامل الضريبة (Inclusive)' : 'VAT Inclusive'}
                </button>
              </div>
            </div>
          </div>

          {/* Items Table Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-700" />
                  <span>{isRtl ? 'جدول بنود ومواد الشراء (Purchase Items Table)' : 'Purchase Items'}</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isRtl ? 'أدخل المواد مع تحديد الوحدة (سطل، علبة، رول، كرتون...) والكمية وسعر الشراء' : 'Add paint materials with units, quantity, and cost price'}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <SearchableProductSelect
                  products={products}
                  onSelectProduct={handleSelectSavedProductForPurchase}
                  onProductCreated={(newProd) => setProducts(storage.getProducts())}
                  lang={lang}
                  variant="header"
                  placeholder={isRtl ? '🔍 اختر من الأصناف المحفوظة في المخزن...' : '🔍 Pick from saved items...'}
                />

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3.5 py-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl transition inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isRtl ? '+ إضافة صنف جديد' : '+ Add Item'}</span>
                </button>
              </div>
            </div>

            {/* Mobile View: Mistake-Proof Card Layout (Screen width < 768px) */}
            <div className="block md:hidden space-y-4">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="bg-white border-2 border-slate-200 rounded-2xl p-4 space-y-3.5 shadow-sm"
                >
                  {/* Card Header: Item Number & Quick Actions */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                        #{idx + 1}
                      </span>
                      <span className="font-extrabold text-sm text-slate-900 flex-1 leading-snug">
                        {item.nameAr ? item.nameAr : (isRtl ? 'صنف شراء جديد' : 'New Purchase Item')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDuplicateItem(idx)}
                        className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition border border-slate-200 bg-slate-50"
                        title={isRtl ? 'تكرار هذا البند' : 'Duplicate'}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={items.length <= 1}
                        onClick={() => handleDeleteItem(idx)}
                        className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-slate-200 bg-slate-50 disabled:opacity-30"
                        title={isRtl ? 'حذف هذا البند' : 'Delete'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Item Description Autocomplete */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      {isRtl ? 'اسم المادة أو دهان الشراء *' : 'Item Description *'}
                    </label>
                    <ItemAutocompleteInput
                      value={item.nameAr}
                      onChange={(val) => handleUpdateItem(idx, { nameAr: val })}
                      onSelectProduct={(prod) => {
                        handleUpdateItem(idx, {
                          productId: prod.id,
                          nameAr: prod.nameAr,
                          nameEn: prod.nameEn || '',
                          code: prod.code,
                          unitAr: prod.unitAr || 'سطل',
                          unitPrice: prod.unitPrice,
                        });
                      }}
                      onProductCreated={(newProd) => setProducts(storage.getProducts())}
                      products={products}
                      lang={lang}
                      placeholder={isRtl ? 'انقر لاختيار صنف من المخزن أو ابحث...' : 'Item description...'}
                      accentColor="emerald"
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
                        onChange={(e) => handleUpdateItem(idx, { code: e.target.value })}
                        placeholder="PNT-EXT-01"
                        className="w-full text-xs font-mono font-bold p-2.5 rounded-xl border border-slate-300 bg-white text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        {isRtl ? 'الاسم بالإنجليزي (اختياري)' : 'English Name'}
                      </label>
                      <input
                        type="text"
                        value={item.nameEn}
                        onChange={(e) => handleUpdateItem(idx, { nameEn: e.target.value })}
                        placeholder="Exterior Paint"
                        dir="ltr"
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Quantity with touch steppers and Unit Selection */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        {isRtl ? 'الكمية المشتراة *' : 'Quantity *'}
                      </label>
                      <div className="flex items-center border-2 border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleUpdateItem(idx, { quantity: Math.max(0.1, Number(((item.quantity || 1) - 1).toFixed(2))) })}
                          className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-black text-base select-none shrink-0"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                          className="w-full text-center font-mono font-black text-base p-1.5 focus:outline-none bg-transparent text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateItem(idx, { quantity: Number(((item.quantity || 0) + 1).toFixed(2)) })}
                          className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-black text-base select-none shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        {isRtl ? 'الوحدة القياسية' : 'Unit'}
                      </label>
                      <select
                        value={item.unit}
                        onChange={(e) => handleUpdateItem(idx, { unit: e.target.value as PurchaseUnitType })}
                        className="w-full p-2.5 rounded-xl border-2 border-slate-300 text-sm font-bold bg-white text-slate-800 shadow-2xs focus:border-emerald-600 focus:outline-none h-[44px]"
                      >
                        {PAINT_UNITS.map((u) => (
                          <option key={u.type} value={u.type}>
                            {isRtl ? u.ar : u.en}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Price & Discount */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        {isRtl ? 'سعر الشراء (ر.س) *' : 'Unit Cost (SAR) *'}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                          className="w-full p-2.5 rounded-xl border-2 border-slate-300 text-base font-mono font-black text-slate-900 bg-white text-left pl-10 focus:border-emerald-600 focus:outline-none shadow-2xs"
                          dir="ltr"
                        />
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                          SAR
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
                          value={item.discountPercent}
                          onChange={(e) => handleUpdateItem(idx, { discountPercent: parseFloat(e.target.value) || 0 })}
                          className="w-full p-2.5 rounded-xl border-2 border-slate-300 text-base font-mono font-bold text-slate-900 bg-white text-left pl-8 focus:border-emerald-600 focus:outline-none shadow-2xs"
                          dir="ltr"
                        />
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Line Total Calculation Banner in Card */}
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-emerald-800 font-semibold">
                        {isRtl ? 'ضريبة القيمة المضافة (15%):' : 'VAT (15%):'}{' '}
                        <span className="font-mono font-bold">{formatCurrency(item.vatAmount)} ر.س</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {isRtl ? 'قبل الضريبة: ' : 'Before VAT: '}
                        {formatCurrency(item.subtotalBeforeVat)} SAR
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] uppercase font-bold text-emerald-900 tracking-wider">
                        {isRtl ? 'إجمالي البند شاملاً الضريبة' : 'Line Total (Inc. VAT)'}
                      </span>
                      <span className="text-base font-mono font-black text-emerald-950">
                        {formatCurrency(item.subtotalWithVat)}{' '}
                        <span className="text-xs font-semibold text-emerald-800">ر.س</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (Screen width >= 768px) */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-2.5 w-8 shrink-0">#</th>
                    <th className="p-2.5 min-w-[500px] lg:min-w-[620px] w-auto text-right">{isRtl ? 'اسم المادة / الصنف' : 'Item Description'}</th>
                    <th className="p-2.5 w-24 shrink-0 whitespace-nowrap">{isRtl ? 'الوحدة' : 'Unit'}</th>
                    <th className="p-2.5 w-20 shrink-0 whitespace-nowrap">{isRtl ? 'الكمية' : 'Qty'}</th>
                    <th className="p-2.5 w-28 shrink-0 whitespace-nowrap">{isRtl ? 'سعر الشراء' : 'Unit Price'}</th>
                    <th className="p-2.5 w-20 shrink-0 whitespace-nowrap">{isRtl ? 'الخصم %' : 'Disc %'}</th>
                    <th className="p-2.5 w-20 shrink-0 whitespace-nowrap">{isRtl ? 'الضريبة' : 'VAT'}</th>
                    <th className="p-2.5 w-24 shrink-0 whitespace-nowrap">{isRtl ? 'قيمة الضريبة' : 'VAT Amt'}</th>
                    <th className="p-2.5 w-28 shrink-0 whitespace-nowrap">{isRtl ? 'الإجمالي (ر.س)' : 'Total (SAR)'}</th>
                    <th className="p-2.5 w-10 text-center shrink-0"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="p-2.5 font-mono text-slate-400 font-bold shrink-0">{idx + 1}</td>
                      <td className="px-4 py-3.5 min-w-[500px] lg:min-w-[620px]">
                        <div className="flex items-center gap-2.5 w-full ps-1 pe-1">
                          <div className="flex-1 min-w-[280px]">
                            <ItemAutocompleteInput
                              value={item.nameAr}
                              onChange={(val) => handleUpdateItem(idx, { nameAr: val })}
                              onSelectProduct={(prod) => {
                                handleUpdateItem(idx, {
                                  productId: prod.id,
                                  nameAr: prod.nameAr,
                                  nameEn: prod.nameEn || '',
                                  code: prod.code,
                                  unitAr: prod.unitAr || 'سطل',
                                  unitPrice: prod.unitPrice,
                                });
                              }}
                              onProductCreated={(newProd) => setProducts(storage.getProducts())}
                              products={products}
                              lang={lang}
                              placeholder={isRtl ? 'انقر لعرض أصناف المخزن أو اكتب للبحث...' : 'Item description...'}
                              accentColor="emerald"
                            />
                          </div>
                          <input
                            type="text"
                            value={item.code}
                            onChange={(e) => handleUpdateItem(idx, { code: e.target.value })}
                            placeholder={isRtl ? 'رمز SKU' : 'SKU'}
                            title={isRtl ? 'رمز الصنف / SKU' : 'SKU / Code'}
                            className="w-24 text-xs font-mono font-bold p-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 shrink-0 shadow-2xs"
                          />
                          <input
                            type="text"
                            value={item.nameEn}
                            onChange={(e) => handleUpdateItem(idx, { nameEn: e.target.value })}
                            placeholder={isRtl ? 'English name' : 'English'}
                            title={isRtl ? 'الاسم بالإنجليزي (اختياري)' : 'English name'}
                            className="w-32 text-xs font-medium p-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 shrink-0 shadow-2xs"
                            dir="ltr"
                          />
                        </div>
                      </td>

                      {/* Unit Select */}
                      <td className="p-2.5">
                        <select
                          value={item.unit}
                          onChange={(e) => handleUpdateItem(idx, { unit: e.target.value as PurchaseUnitType })}
                          className="w-full p-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                        >
                          {PAINT_UNITS.map((u) => (
                            <option key={u.type} value={u.type}>
                              {isRtl ? u.ar : u.en}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Quantity */}
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                          className="w-full p-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold text-center bg-white"
                        />
                      </td>

                      {/* Unit Price */}
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                          className="w-full p-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold text-center bg-white"
                        />
                      </td>

                      {/* Discount % */}
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercent}
                          onChange={(e) => handleUpdateItem(idx, { discountPercent: parseFloat(e.target.value) || 0 })}
                          className="w-full p-1.5 rounded-lg border border-slate-200 text-xs font-mono text-center bg-white"
                        />
                      </td>

                      {/* VAT Rate Select */}
                      <td className="p-2.5">
                        <select
                          value={item.vatRate}
                          onChange={(e) => handleUpdateItem(idx, { vatRate: parseFloat(e.target.value) || 0 })}
                          className="w-full p-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold text-emerald-800 bg-white"
                        >
                          <option value="15">15%</option>
                          <option value="5">5%</option>
                          <option value="0">0%</option>
                        </select>
                      </td>

                      {/* VAT Amount display */}
                      <td className="p-2.5 font-mono text-xs font-semibold text-slate-700">
                        {formatCurrency(item.vatAmount)}
                      </td>

                      {/* Subtotal With VAT */}
                      <td className="p-2.5 font-mono text-xs font-black text-emerald-900">
                        {formatCurrency(item.subtotalWithVat)}
                      </td>

                      {/* Delete */}
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                          title="Delete row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-bold inline-flex items-center gap-1.5 pt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isRtl ? '+ إضافة بند شراء آخر' : '+ Add another item'}</span>
            </button>
          </div>
        </div>

        {/* Right Column (1 Col): Payment Tracking & Totals Summary */}
        <div className="space-y-6">
          {/* Totals Summary Card */}
          <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="font-extrabold text-sm border-b border-emerald-800/60 pb-3 flex items-center justify-between">
              <span>{isRtl ? 'ملخص مبالغ الفاتورة (SAR)' : 'Financial Summary'}</span>
              <span className="text-[10px] bg-emerald-800/80 px-2.5 py-0.5 rounded-full font-mono text-emerald-200">
                15% VAT
              </span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>{isRtl ? 'المجموع الخاضع للضريبة:' : 'Taxable Subtotal:'}</span>
                <span className="font-mono font-bold text-sm text-white">
                  {formatCurrency(totals.taxableAmount)}
                </span>
              </div>

              {totals.totalDiscount > 0 && (
                <div className="flex justify-between items-center text-amber-300">
                  <span>{isRtl ? 'إجمالي الخصم الممنوح:' : 'Total Discount:'}</span>
                  <span className="font-mono font-bold">- {formatCurrency(totals.totalDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-emerald-300 border-b border-emerald-800/50 pb-2.5">
                <span>{isRtl ? 'ضريبة القيمة المضافة (15%):' : 'Total VAT (15%):'}</span>
                <span className="font-mono font-extrabold text-sm text-emerald-300">
                  + {formatCurrency(totals.totalVat)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-1 text-white">
                <span className="font-bold text-sm">{isRtl ? 'الإجمالي النهائي المطلوب:' : 'Grand Total:'}</span>
                <span className="font-mono font-black text-xl text-emerald-400">
                  {formatCurrency(totals.grandTotal)} <span className="text-xs font-normal">ر.س</span>
                </span>
              </div>
            </div>

            {/* Payment Status Pill */}
            <div className="pt-2 border-t border-emerald-800/50 flex items-center justify-between text-xs">
              <span className="text-slate-300">{isRtl ? 'حالة السداد للمورد:' : 'Payment Status:'}</span>
              <span
                className={`px-3 py-1 rounded-full font-bold text-[11px] ${
                  resolvedPaymentStatus === 'PAID'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                    : resolvedPaymentStatus === 'PARTIALLY_PAID'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                }`}
              >
                {resolvedPaymentStatus === 'PAID'
                  ? (isRtl ? 'مسددة بالكامل' : 'Paid in Full')
                  : resolvedPaymentStatus === 'PARTIALLY_PAID'
                  ? (isRtl ? 'مسددة جزئياً' : 'Partially Paid')
                  : (isRtl ? 'غير مسددة (آجل)' : 'Unpaid (Credit)')}
              </span>
            </div>
          </div>

          {/* Payment Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-700" />
              <span>{isRtl ? 'سداد المشتريات وتتبع المتبقي' : 'Payment Tracking'}</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRtl ? 'طريقة السداد' : 'Payment Method'}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                >
                  <option value="BANK_TRANSFER">{isRtl ? 'تحويل بنكي (Bank Transfer)' : 'Bank Transfer'}</option>
                  <option value="CASH">{isRtl ? 'نقدي (Cash)' : 'Cash'}</option>
                  <option value="CREDIT">{isRtl ? 'آجل / على الحساب (Credit)' : 'Credit'}</option>
                  <option value="CARD">{isRtl ? 'مدى / بطاقة مصرفية (Card)' : 'Card'}</option>
                  <option value="OTHER">{isRtl ? 'أخرى (شيك / سند)' : 'Other'}</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {isRtl ? 'المبلغ المدفوع للمورد حالياً (ر.س)' : 'Amount Paid (SAR)'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setAmountPaid(totals.grandTotal)}
                    className="text-[10px] text-emerald-700 font-bold hover:underline"
                  >
                    {isRtl ? 'سداد كامل المبلغ' : 'Pay Full'}
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  max={totals.grandTotal}
                  step="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  className="w-full text-sm font-mono font-bold p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                />
              </div>

              {/* Remaining Balance Display */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">{isRtl ? 'المتبقي للمورد بذمتنا:' : 'Remaining Balance:'}</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {formatCurrency(remainingBalance)} SAR
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRtl ? 'ملاحظات السداد / رقم الحوالة' : 'Payment Notes / Transfer Ref'}
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder={isRtl ? 'مثال: حوالة مصرف الراجحي رقم 88102' : 'e.g. Bank transfer ref #88102'}
                  className="w-full text-xs p-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Additional Notes & Internal Ref */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-xs text-slate-900 border-b border-slate-100 pb-2">
              {isRtl ? 'ملاحظات داخلية واعتماد' : 'Internal Notes'}
            </h3>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {isRtl ? 'المرجع الداخلي / المستودع' : 'Internal Ref / Warehouse'}
              </label>
              <input
                type="text"
                value={internalReference}
                onChange={(e) => setInternalReference(e.target.value)}
                placeholder={isRtl ? 'مثال: مستودع رقم 2 - رف الدهانات' : 'e.g. Warehouse 2'}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {isRtl ? 'ملاحظات الفاتورة' : 'Invoice Notes'}
              </label>
              <textarea
                rows={2}
                value={notesAr}
                onChange={(e) => setNotesAr(e.target.value)}
                placeholder={isRtl ? 'أي شروط أو تفاصيل توريد...' : 'Any terms or notes...'}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar for Mobile & Desktop Convenience */}
      <div className="sticky bottom-2 z-40 bg-white/95 backdrop-blur-md border-2 border-slate-300 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">
              {isRtl ? 'إجمالي فاتورة الشراء' : 'Total Amount Due'}
            </div>
            <div className="text-lg sm:text-2xl font-mono font-black text-slate-900 leading-tight">
              {formatCurrency(totals.grandTotal)} <span className="text-xs font-semibold text-emerald-800">ر.س</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap ml-auto">
          <button
            type="button"
            onClick={() => onPreview(buildPurchaseInvoiceObject('DRAFT'))}
            className="px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition inline-flex items-center gap-1.5 border border-slate-300"
          >
            <Eye className="w-4 h-4 text-slate-600" />
            <span>{isRtl ? 'معاينة' : 'Preview'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave('DRAFT')}
            className="px-3.5 py-2.5 text-xs sm:text-sm font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 active:bg-amber-300 rounded-xl transition border border-amber-300"
          >
            {isRtl ? 'مسودة' : 'Draft'}
          </button>

          <button
            type="button"
            onClick={() => handleSave('FINALIZED')}
            className="px-5 py-2.5 text-xs sm:text-sm font-black text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded-xl transition shadow-lg shadow-emerald-900/20 inline-flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{isRtl ? 'اعتماد وحفظ الفاتورة' : 'Save Invoice'}</span>
          </button>
        </div>
      </div>

      {/* Modal: Add New Supplier */}
      {isNewSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-700" />
                <span>{isRtl ? 'إضافة مورد جديد' : 'Add New Supplier'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewSupplierModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isRtl ? 'اسم المورد بالعربي *' : 'Supplier Name (Arabic) *'}
                </label>
                <input
                  type="text"
                  required
                  value={newSupNameAr}
                  onChange={(e) => setNewSupNameAr(e.target.value)}
                  placeholder={isRtl ? 'مثال: شركة مصنع الدهانات المتقدمة' : 'Supplier Arabic Name'}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isRtl ? 'اسم المورد بالإنجليزية (اختياري)' : 'Supplier Name (English)'}
                </label>
                <input
                  type="text"
                  value={newSupNameEn}
                  onChange={(e) => setNewSupNameEn(e.target.value)}
                  placeholder="e.g. Advanced Paints Co."
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isRtl ? 'الرقم الضريبي (15 رقم)' : 'VAT Number (15 digits)'}
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={newSupVat}
                    onChange={(e) => setNewSupVat(e.target.value.replace(/\D/g, ''))}
                    placeholder="300XXXXXXXXXXXX"
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isRtl ? 'رقم الجوال / الهاتف' : 'Phone Number'}
                  </label>
                  <input
                    type="tel"
                    value={newSupPhone}
                    onChange={(e) => setNewSupPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isRtl ? 'العنوان / المدينة' : 'Address / City'}
                </label>
                <input
                  type="text"
                  value={newSupAddress}
                  onChange={(e) => setNewSupAddress(e.target.value)}
                  placeholder={isRtl ? 'مثال: الرياض - المدينة الصناعية' : 'e.g. Riyadh - Industrial City'}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsNewSupplierModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition shadow-sm"
                >
                  {isRtl ? 'حفظ واختيار المورد' : 'Save & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
