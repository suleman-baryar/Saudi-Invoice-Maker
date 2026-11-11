import React, { useState } from 'react';
import { PurchaseInvoice, PaymentStatus, PaymentMethod } from '../types';
import { storage } from '../utils/storage';
import { formatCurrency } from '../utils/vatCalculations';
import { Language, translations } from '../utils/translations';
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  Ban,
  Copy,
  CreditCard,
  Building2,
  Calendar,
  Download,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  X,
  Check,
} from 'lucide-react';

interface PurchaseHistoryProps {
  onNewInvoice: () => void;
  onViewInvoice: (invoice: PurchaseInvoice) => void;
  onEditInvoice: (invoice: PurchaseInvoice) => void;
  lang: Language;
}

export const PurchaseHistory: React.FC<PurchaseHistoryProps> = ({
  onNewInvoice,
  onViewInvoice,
  onEditInvoice,
  lang,
}) => {
  const isRtl = lang === 'ar';
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>(storage.getPurchaseInvoices());
  const suppliers = storage.getSuppliers();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');

  // Cancel Modal
  const [cancellingInvoice, setCancellingInvoice] = useState<PurchaseInvoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Payment Recording Modal
  const [paymentInvoice, setPaymentInvoice] = useState<PurchaseInvoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const refreshList = () => {
    setInvoices(storage.getPurchaseInvoices());
  };

  const handleDuplicate = (inv: PurchaseInvoice) => {
    const nextNum = storage.getNextPurchaseInvoiceNumber();
    const duplicated: PurchaseInvoice = {
      ...inv,
      id: `pinv_${Date.now()}`,
      invoiceNumber: nextNum,
      supplierInvoiceNumber: '',
      issueDate: new Date().toISOString().split('T')[0],
      status: 'DRAFT',
      amountPaid: 0,
      remainingBalance: inv.grandTotal,
      payments: [],
      paymentStatus: 'UNPAID',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    storage.savePurchaseInvoice(duplicated);
    refreshList();
    onEditInvoice(duplicated);
  };

  const handleConfirmCancel = () => {
    if (!cancellingInvoice) return;
    storage.cancelPurchaseInvoice(cancellingInvoice.id, cancelReason);
    setCancellingInvoice(null);
    setCancelReason('');
    refreshList();
  };

  const handleDelete = (id: string) => {
    if (confirm(isRtl ? 'هل أنت متأكد من حذف فاتورة الشراء هذه نهائياً؟' : 'Are you sure you want to delete this invoice?')) {
      storage.deletePurchaseInvoice(id);
      refreshList();
    }
  };

  const handleOpenRecordPayment = (inv: PurchaseInvoice) => {
    setPaymentInvoice(inv);
    setPayAmount(inv.remainingBalance);
    setPayMethod('BANK_TRANSFER');
    setPayRef('');
    setPayNotes('');
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice || payAmount <= 0) return;

    storage.recordPurchasePayment(paymentInvoice.id, {
      date: new Date().toISOString().split('T')[0],
      amount: Math.min(paymentInvoice.remainingBalance, payAmount),
      paymentMethod: payMethod,
      referenceNumber: payRef,
      notes: payNotes || 'سداد دفعة للمورد',
    });

    setPaymentInvoice(null);
    refreshList();
  };

  // Filter logic
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7);
  const thisYearStr = todayStr.substring(0, 4);

  const filteredInvoices = invoices.filter((inv) => {
    // Search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchNum = inv.invoiceNumber.toLowerCase().includes(term);
      const matchSupInv = (inv.supplierInvoiceNumber || '').toLowerCase().includes(term);
      const matchSupName = (inv.supplier.nameAr || '').toLowerCase().includes(term) || (inv.supplier.nameEn || '').toLowerCase().includes(term);
      const matchPo = (inv.purchaseOrderNumber || '').toLowerCase().includes(term);
      if (!matchNum && !matchSupInv && !matchSupName && !matchPo) return false;
    }

    // Status
    if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;

    // Payment Status
    if (paymentStatusFilter !== 'ALL' && inv.paymentStatus !== paymentStatusFilter) return false;

    // Supplier
    if (supplierFilter !== 'ALL' && inv.supplier.id !== supplierFilter) return false;

    // Date
    if (dateFilter === 'TODAY' && !inv.issueDate.startsWith(todayStr)) return false;
    if (dateFilter === 'MONTH' && !inv.issueDate.startsWith(thisMonthStr)) return false;
    if (dateFilter === 'YEAR' && !inv.issueDate.startsWith(thisYearStr)) return false;

    return true;
  });

  // Calculate stats from filtered active invoices
  const activeInvoices = filteredInvoices.filter((i) => i.status !== 'CANCELLED');
  const totalPurchases = activeInvoices.reduce((sum, i) => sum + i.grandTotal, 0);
  const totalPaid = activeInvoices.reduce((sum, i) => sum + i.amountPaid, 0);
  const totalRemaining = activeInvoices.reduce((sum, i) => sum + i.remainingBalance, 0);
  const totalVatInput = activeInvoices.reduce((sum, i) => sum + i.totalVat, 0);

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-700" />
            <span>{isRtl ? 'سجل فواتير المشتريات (Purchase Invoices Register)' : 'Purchase Invoices Register'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isRtl
              ? 'إدارة مشتريات محل الدهانات من الموردين، متابعة الدفعات والمستحقات، وحساب مدخلات ضريبة القيمة المضافة 15%'
              : 'Manage supplier purchases, track payments and balances, and compute 15% VAT input'}
          </p>
        </div>

        <button
          type="button"
          onClick={onNewInvoice}
          className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-900/20 transition inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>{isRtl ? '+ فاتورة مشتريات جديدة' : '+ New Purchase Invoice'}</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-semibold block">
            {isRtl ? 'إجمالي المشتريات (شامل الضريبة)' : 'Total Purchases'}
          </span>
          <span className="text-base sm:text-lg font-black font-mono text-slate-900 mt-1 block">
            {formatCurrency(totalPurchases)} <span className="text-xs font-normal">ر.س</span>
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {activeInvoices.length} {isRtl ? 'فاتورة معتمدة' : 'invoices'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-emerald-700 font-semibold block">
            {isRtl ? 'المسدد للموردين (Paid)' : 'Total Paid'}
          </span>
          <span className="text-base sm:text-lg font-black font-mono text-emerald-700 mt-1 block">
            {formatCurrency(totalPaid)} <span className="text-xs font-normal">ر.س</span>
          </span>
          <span className="text-[10px] text-emerald-600/70 mt-0.5 block">
            {isRtl ? 'دفعات مسددة بنكياً ونقداً' : 'Settled to suppliers'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-rose-600 font-semibold block">
            {isRtl ? 'المستحق للموردين (متبقي بذمتنا)' : 'Outstanding Balances'}
          </span>
          <span className="text-base sm:text-lg font-black font-mono text-rose-600 mt-1 block">
            {formatCurrency(totalRemaining)} <span className="text-xs font-normal">ر.س</span>
          </span>
          <span className="text-[10px] text-rose-400 mt-0.5 block">
            {isRtl ? 'فواتير غير مسددة أو جزئية' : 'Pending supplier debts'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-blue-700 font-semibold block">
            {isRtl ? 'ضريبة المدخلات 15% (VAT Input)' : 'VAT Input (15%)'}
          </span>
          <span className="text-base sm:text-lg font-black font-mono text-blue-700 mt-1 block">
            {formatCurrency(totalVatInput)} <span className="text-xs font-normal">ر.س</span>
          </span>
          <span className="text-[10px] text-blue-600/70 mt-0.5 block">
            {isRtl ? 'مستردة في إقرار ZATCA' : 'Recoverable tax input'}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute top-3 right-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isRtl ? 'بحث برقم الفاتورة، اسم المورد، رقم فاتورة المورد، أمر الشراء...' : 'Search invoices, suppliers, PO...'}
              className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
            />
          </div>

          {/* Quick Date Filters */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'ALL', label: isRtl ? 'الكل' : 'All' },
              { id: 'TODAY', label: isRtl ? 'اليوم' : 'Today' },
              { id: 'MONTH', label: isRtl ? 'هذا الشهر' : 'Month' },
              { id: 'YEAR', label: isRtl ? 'هذا العام' : 'Year' },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDateFilter(d.id)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  dateFilter === d.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          {/* Supplier Filter */}
          <div>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 text-xs font-medium bg-white"
            >
              <option value="ALL">{isRtl ? 'جميع الموردين' : 'All Suppliers'}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {isRtl ? s.nameAr : s.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 text-xs font-medium bg-white"
            >
              <option value="ALL">{isRtl ? 'جميع حالات السداد' : 'All Payment Statuses'}</option>
              <option value="PAID">{isRtl ? 'مسددة بالكامل (Paid)' : 'Paid'}</option>
              <option value="PARTIALLY_PAID">{isRtl ? 'مسددة جزئياً (Partially Paid)' : 'Partially Paid'}</option>
              <option value="UNPAID">{isRtl ? 'غير مسددة (آجل / Unpaid)' : 'Unpaid'}</option>
            </select>
          </div>

          {/* Invoice Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 text-xs font-medium bg-white"
            >
              <option value="ALL">{isRtl ? 'جميع الحالات (معتمدة، مسودات، ملغاة)' : 'All Statuses'}</option>
              <option value="FINALIZED">{isRtl ? 'معتمدة فقط' : 'Finalized Only'}</option>
              <option value="DRAFT">{isRtl ? 'مسودات فقط' : 'Drafts Only'}</option>
              <option value="CANCELLED">{isRtl ? 'ملغاة (سجل التدقيق)' : 'Cancelled (Audit)'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">
              {isRtl ? 'لا توجد فواتير مشتريات تطابق البحث' : 'No purchase invoices found'}
            </h3>
            <p className="text-xs text-slate-400">
              {isRtl ? 'يمكنك إنشاء فاتورة مشتريات جديدة الآن لتسجيل مواد الدهان والموردين.' : 'Create a purchase invoice to record paint purchases.'}
            </p>
            <button
              type="button"
              onClick={onNewInvoice}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isRtl ? 'إنشاء فاتورة مشتريات' : 'Create Purchase Invoice'}</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3 w-28">{isRtl ? 'رقم الفاتورة' : 'Invoice #'}</th>
                  <th className="p-3 w-24">{isRtl ? 'التاريخ' : 'Date'}</th>
                  <th className="p-3 min-w-[180px]">{isRtl ? 'المورد' : 'Supplier'}</th>
                  <th className="p-3 w-24">{isRtl ? 'فاتورة المورد' : 'Supplier Inv'}</th>
                  <th className="p-3 w-24">{isRtl ? 'الضريبة 15%' : 'VAT 15%'}</th>
                  <th className="p-3 w-28">{isRtl ? 'الإجمالي (ر.س)' : 'Total (SAR)'}</th>
                  <th className="p-3 w-24">{isRtl ? 'المدفوع' : 'Paid'}</th>
                  <th className="p-3 w-24">{isRtl ? 'المتبقي' : 'Remaining'}</th>
                  <th className="p-3 w-24">{isRtl ? 'حالة السداد' : 'Payment'}</th>
                  <th className="p-3 w-20 text-center">{isRtl ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 w-32 text-center">{isRtl ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className={`hover:bg-slate-50/80 transition ${
                      inv.status === 'CANCELLED' ? 'opacity-60 bg-slate-50/30' : ''
                    }`}
                  >
                    <td className="p-3 font-mono font-bold text-emerald-900">
                      {inv.invoiceNumber}
                    </td>

                    <td className="p-3 font-mono text-slate-600">
                      {inv.issueDate}
                    </td>

                    <td className="p-3 font-bold text-slate-800">
                      <div>{inv.supplier.nameAr}</div>
                      {inv.supplier.vatNumber && (
                        <div className="text-[10px] font-mono text-slate-400">
                          ض: {inv.supplier.vatNumber}
                        </div>
                      )}
                    </td>

                    <td className="p-3 font-mono text-slate-600">
                      {inv.supplierInvoiceNumber || '-'}
                    </td>

                    <td className="p-3 font-mono text-emerald-800 font-semibold">
                      {formatCurrency(inv.totalVat)}
                    </td>

                    <td className="p-3 font-mono font-black text-slate-900 text-sm">
                      {formatCurrency(inv.grandTotal)}
                    </td>

                    <td className="p-3 font-mono text-emerald-700 font-bold">
                      {formatCurrency(inv.amountPaid)}
                    </td>

                    <td className="p-3 font-mono font-bold text-rose-600">
                      {inv.remainingBalance > 0 ? `${formatCurrency(inv.remainingBalance)}` : '-'}
                    </td>

                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                          inv.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.paymentStatus === 'PARTIALLY_PAID'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {inv.paymentStatus === 'PAID'
                          ? (isRtl ? 'مسددة' : 'Paid')
                          : inv.paymentStatus === 'PARTIALLY_PAID'
                          ? (isRtl ? 'جزئي' : 'Partial')
                          : (isRtl ? 'غير مسددة' : 'Unpaid')}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
                          inv.status === 'FINALIZED'
                            ? 'bg-slate-100 text-slate-700'
                            : inv.status === 'DRAFT'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-700 line-through'
                        }`}
                      >
                        {inv.status === 'FINALIZED'
                          ? (isRtl ? 'معتمدة' : 'Final')
                          : inv.status === 'DRAFT'
                          ? (isRtl ? 'مسودة' : 'Draft')
                          : (isRtl ? 'ملغاة' : 'Cancelled')}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onViewInvoice(inv)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                          title={isRtl ? 'معاينة وطباعة الفاتورة' : 'View'}
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {inv.status !== 'CANCELLED' && (
                          <>
                            <button
                              type="button"
                              onClick={() => onEditInvoice(inv)}
                              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                              title={isRtl ? 'تعديل الفاتورة' : 'Edit'}
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {inv.remainingBalance > 0 && (
                              <button
                                type="button"
                                onClick={() => handleOpenRecordPayment(inv)}
                                className="p-1.5 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition font-bold text-xs"
                                title={isRtl ? 'تسجيل دفعة سداد للمورد' : 'Record Payment'}
                              >
                                <CreditCard className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDuplicate(inv)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                              title={isRtl ? 'تكرار الفاتورة' : 'Duplicate'}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setCancellingInvoice(inv)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              title={isRtl ? 'إلغاء الفاتورة (مع الحفظ في التدقيق)' : 'Cancel'}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDelete(inv.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title={isRtl ? 'حذف نهائي' : 'Delete'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Record Payment to Supplier */}
      {paymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-700" />
                <span>{isRtl ? 'تسجيل دفعة سداد للمورد' : 'Record Supplier Payment'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setPaymentInvoice(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">فاتورة رقم:</span>
                <span className="font-mono font-bold text-slate-900">{paymentInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">المورد:</span>
                <span className="font-bold text-slate-900">{paymentInvoice.supplier.nameAr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">إجمالي الفاتورة:</span>
                <span className="font-mono">{formatCurrency(paymentInvoice.grandTotal)} SAR</span>
              </div>
              <div className="flex justify-between text-rose-600 font-bold border-t border-slate-200 pt-1">
                <span>المتبقي حالياً:</span>
                <span className="font-mono">{formatCurrency(paymentInvoice.remainingBalance)} SAR</span>
              </div>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isRtl ? 'المبلغ المراد سداده للمورد (ر.س) *' : 'Amount to Pay (SAR) *'}
                </label>
                <input
                  type="number"
                  min="0.01"
                  max={paymentInvoice.remainingBalance}
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isRtl ? 'طريقة السداد' : 'Payment Method'}
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
                >
                  <option value="BANK_TRANSFER">{isRtl ? 'تحويل بنكي (Bank Transfer)' : 'Bank Transfer'}</option>
                  <option value="CASH">{isRtl ? 'نقدي (Cash)' : 'Cash'}</option>
                  <option value="CARD">{isRtl ? 'مدى / بطاقة مصرفية' : 'Card'}</option>
                  <option value="OTHER">{isRtl ? 'أخرى (شيك / سند)' : 'Other'}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isRtl ? 'رقم الحوالة / المرجع البنكي' : 'Reference / Transfer #'}
                </label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder={isRtl ? 'مثال: TRX-88419' : 'e.g. TRX-88419'}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isRtl ? 'ملاحظات الدفعة' : 'Notes'}
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder={isRtl ? 'مثال: دفعة مسددة عبر الراجحي' : 'e.g. Paid via Al Rajhi'}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setPaymentInvoice(null)}
                  className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition shadow-sm"
                >
                  {isRtl ? 'تأكيد وحفظ الدفعة' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cancel Invoice Confirmation */}
      {cancellingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  {isRtl ? 'إلغاء فاتورة المشتريات' : 'Cancel Purchase Invoice'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isRtl ? `الفاتورة رقم ${cancellingInvoice.invoiceNumber}` : `Invoice ${cancellingInvoice.invoiceNumber}`}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {isRtl
                ? 'وفق متطلبات التدقيق والمحاسبة، لن يتم حذف الفاتورة وإنما تصنيفها كـ "ملغاة" واستبعاد مبالغها وضريبتها من الإجماليات النشطة مع الحفاظ عليها في سجل التدقيق.'
                : 'The invoice will be marked as Cancelled and excluded from active financial totals while remaining in the audit trail.'}
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isRtl ? 'سبب الإلغاء:' : 'Cancellation Reason:'}
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={isRtl ? 'مثال: خطأ في الكميات أو إرجاع البضاعة للمورد' : 'e.g. Return of goods to supplier'}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setCancellingInvoice(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                {isRtl ? 'تراجع' : 'Back'}
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition shadow-xs"
              >
                {isRtl ? 'تأكيد إلغاء الفاتورة' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
