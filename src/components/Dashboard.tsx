import React, { useState } from 'react';
import { Invoice, PurchaseInvoice } from '../types';
import { formatCurrency } from '../utils/vatCalculations';
import { storage } from '../utils/storage';
import { Language, translations } from '../utils/translations';
import {
  FileText,
  DollarSign,
  Receipt,
  CheckCircle,
  AlertCircle,
  FileEdit,
  Plus,
  Search,
  Eye,
  Calculator,
  Printer,
  Smartphone,
  Database,
  Building2,
  BarChart3,
  TrendingUp,
  CreditCard,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  X,
} from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import { SmsShareModal } from './SmsShareModal';
import { MonthlySalesChart } from './MonthlySalesChart';

interface DashboardProps {
  invoices: Invoice[];
  onNewInvoice: () => void;
  onViewInvoice: (invoice: Invoice) => void;
  onEditInvoice: (invoice: Invoice) => void;
  onOpenVatTests: () => void;
  onOpenSupabase?: () => void;
  lang: Language;
  onPrintInvoice?: (invoice: Invoice) => void;
  // Purchase Invoice Quick Actions
  onNewPurchaseInvoice?: () => void;
  onViewPurchaseInvoice?: (invoice: PurchaseInvoice) => void;
  onManageSuppliers?: () => void;
  onOpenReports?: () => void;
  onOpenInstallModal?: () => void;
  onOpenPlayStoreModal?: () => void;
  onDeleteInvoice?: (invoice: Invoice) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  invoices,
  onNewInvoice,
  onViewInvoice,
  onEditInvoice,
  onOpenVatTests,
  onOpenSupabase,
  lang,
  onPrintInvoice,
  onNewPurchaseInvoice,
  onViewPurchaseInvoice,
  onManageSuppliers,
  onOpenReports,
  onOpenInstallModal,
  onOpenPlayStoreModal,
  onDeleteInvoice,
}) => {
  const [dashboardTab, setDashboardTab] = useState<'PURCHASES' | 'SALES' | 'OVERVIEW'>('PURCHASES');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'MONTH' | 'YEAR'>('ALL');
  const [whatsAppModalInvoice, setWhatsAppModalInvoice] = useState<Invoice | null>(null);
  const [smsModalInvoice, setSmsModalInvoice] = useState<Invoice | null>(null);
  const [deletingSalesInvoice, setDeletingSalesInvoice] = useState<Invoice | null>(null);
  const t = translations[lang].dashboard;
  const isRtl = lang === 'ar';

  // Load Purchase Invoices & Metrics
  const purchaseInvoices = storage.getPurchaseInvoices();
  const purchaseMetrics = storage.getPurchaseMetrics();
  const suppliers = storage.getSuppliers();

  // Filter sales invoices
  const filteredInvoices = invoices.filter((inv) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(term) ||
      inv.customer.nameAr.toLowerCase().includes(term) ||
      (inv.customer.nameEn && inv.customer.nameEn.toLowerCase().includes(term)) ||
      (inv.customer.phone && inv.customer.phone.includes(term));

    if (!matchesSearch) return false;

    if (dateFilter === 'ALL') return true;

    const invDate = new Date(inv.issueDate);
    const now = new Date();

    if (dateFilter === 'TODAY') {
      return inv.issueDate === now.toISOString().split('T')[0];
    }
    if (dateFilter === 'MONTH') {
      return (
        invDate.getFullYear() === now.getFullYear() &&
        invDate.getMonth() === now.getMonth()
      );
    }
    if (dateFilter === 'YEAR') {
      return invDate.getFullYear() === now.getFullYear();
    }

    return true;
  });

  // Filter purchase invoices
  const filteredPurchaseInvoices = purchaseInvoices.filter((inv) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(term) ||
      (inv.supplierInvoiceNumber && inv.supplierInvoiceNumber.toLowerCase().includes(term)) ||
      inv.supplier.nameAr.toLowerCase().includes(term) ||
      (inv.supplier.nameEn && inv.supplier.nameEn.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (dateFilter === 'ALL') return true;

    const now = new Date();
    if (dateFilter === 'TODAY') {
      return inv.issueDate === now.toISOString().split('T')[0];
    }
    if (dateFilter === 'MONTH') {
      return inv.issueDate.startsWith(now.toISOString().substring(0, 7));
    }
    if (dateFilter === 'YEAR') {
      return inv.issueDate.startsWith(now.getFullYear().toString());
    }

    return true;
  });

  // Calculate sales metrics
  const totalInvoices = filteredInvoices.length;
  const totalSales = filteredInvoices.reduce((sum, i) => sum + (i.status !== 'CANCELLED' ? i.grandTotal : 0), 0);
  const totalVat = filteredInvoices.reduce((sum, i) => sum + (i.status !== 'CANCELLED' ? i.totalVat : 0), 0);

  const paidInvoices = filteredInvoices.filter((i) => i.paymentStatus === 'PAID');
  const paidAmount = paidInvoices.reduce((sum, i) => sum + i.grandTotal, 0);

  const unpaidInvoices = filteredInvoices.filter((i) => i.paymentStatus === 'UNPAID');
  const unpaidAmount = unpaidInvoices.reduce((sum, i) => sum + i.grandTotal, 0);

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Mode Switcher: Purchases vs Sales vs Overview */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="inline-flex rounded-xl p-1 bg-slate-100 font-bold text-xs">
          <button
            type="button"
            onClick={() => setDashboardTab('PURCHASES')}
            className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
              dashboardTab === 'PURCHASES'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>{isRtl ? '🛒 لوحة المشتريات والموردين' : 'Purchases & Suppliers'}</span>
          </button>

          <button
            type="button"
            onClick={() => setDashboardTab('SALES')}
            className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
              dashboardTab === 'SALES'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>{isRtl ? '💼 لوحة المبيعات والعملاء' : 'Sales & Customers'}</span>
          </button>

          <button
            type="button"
            onClick={() => setDashboardTab('OVERVIEW')}
            className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
              dashboardTab === 'OVERVIEW'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>{isRtl ? '📊 نظرة مالية شاملة للمحل' : 'Shop Pulse Overview'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onOpenPlayStoreModal && (
            <button
              type="button"
              onClick={onOpenPlayStoreModal}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-2xs active:scale-95"
              title={isRtl ? 'متطلبات نشر التطبيق على متجر Google Play' : 'Google Play Publishing Guide'}
            >
              <span className="text-sm">▶️</span>
              <span>{isRtl ? 'نشر Google Play' : 'Play Store'}</span>
            </button>
          )}

          {onOpenInstallModal && (
            <button
              type="button"
              onClick={onOpenInstallModal}
              className="px-3 py-1.5 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-xs active:scale-95"
              title={isRtl ? 'تثبيت التطبيق على آيفون وأندرويد' : 'Install on iPhone & Android'}
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-200" />
              <span>{isRtl ? '📲 تثبيت بالجوال' : 'Install App'}</span>
            </button>
          )}

          {onOpenSupabase && (
            <button
              type="button"
              onClick={onOpenSupabase}
              className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 border border-emerald-400/30"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isRtl ? 'سوبابيز' : 'Supabase'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenVatTests}
            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 border border-amber-400/30 active:scale-95"
            title="Vat 15%"
          >
            <Calculator className="w-3.5 h-3.5 text-amber-700" />
            <span>Vat 15%</span>
          </button>
        </div>
      </div>

      {/* Filter and Date Range Control */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setDateFilter('ALL')}
            className={`px-3 py-1.5 rounded-md transition ${
              dateFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.all}
          </button>
          <button
            type="button"
            onClick={() => setDateFilter('TODAY')}
            className={`px-3 py-1.5 rounded-md transition ${
              dateFilter === 'TODAY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.today}
          </button>
          <button
            type="button"
            onClick={() => setDateFilter('MONTH')}
            className={`px-3 py-1.5 rounded-md transition ${
              dateFilter === 'MONTH' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.thisMonth}
          </button>
          <button
            type="button"
            onClick={() => setDateFilter('YEAR')}
            className={`px-3 py-1.5 rounded-md transition ${
              dateFilter === 'YEAR' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.thisYear}
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className={`w-4 h-4 text-slate-400 absolute top-2.5 ${isRtl ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.searchPlaceholder}
            className={`w-full text-xs py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white ${
              isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'
            }`}
          />
        </div>
      </div>

      {/* CONDITIONAL DASHBOARD CONTENT */}

      {/* 1. PURCHASES DASHBOARD VIEW */}
      {dashboardTab === 'PURCHASES' && (
        <div className="space-y-6">
          {/* Purchase Banner with Quick Actions */}
          <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-wrap items-center justify-between gap-4 border border-emerald-800/40">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 mb-2">
                <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isRtl ? 'مركز المالك للدهانات - نظام المشتريات والموردين' : 'Markaz Al Malki Paint - Purchases & Suppliers'}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black">
                {isRtl ? 'إدارة مشتريات الدهانات والديكور' : 'Paint & Decoration Purchase Management'}
              </h1>
              <p className="text-emerald-100/80 text-xs sm:text-sm mt-1 max-w-xl">
                {isRtl
                  ? 'تسجيل فواتير الشراء، متابعة مستحقات المصانع والموردين، وحساب ضريبة المدخلات 15% بدقة تامة.'
                  : 'Track supplier invoices, paint materials batches, payments, and 15% VAT inputs.'}
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center flex-wrap gap-2.5">
              {onManageSuppliers && (
                <button
                  type="button"
                  onClick={onManageSuppliers}
                  className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 border border-white/20"
                >
                  <Building2 className="w-4 h-4 text-emerald-300" />
                  <span>{isRtl ? '👥 إدارة الموردين' : 'Manage Suppliers'}</span>
                </button>
              )}

              {onOpenReports && (
                <button
                  type="button"
                  onClick={onOpenReports}
                  className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 border border-white/20"
                >
                  <BarChart3 className="w-4 h-4 text-blue-300" />
                  <span>{isRtl ? '📊 تقارير المشتريات' : 'Purchase Reports'}</span>
                </button>
              )}

              {onNewPurchaseInvoice && (
                <button
                  type="button"
                  onClick={onNewPurchaseInvoice}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-950/40 transition inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isRtl ? '⚡ إنشاء فاتورة مشتريات' : 'Create Purchase Invoice'}</span>
                </button>
              )}
            </div>
          </div>

          {/* 6 Required Purchase Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Total Purchases Today */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 block">
                {isRtl ? 'مشتريات اليوم (Today)' : 'Total Purchases Today'}
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
                {formatCurrency(purchaseMetrics.totalPurchasesToday)}{' '}
                <span className="text-xs font-sans text-slate-500 font-normal">ر.س</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-semibold block">
                {isRtl ? 'فواتير التوريد المسجلة اليوم' : 'Supplied today'}
              </span>
            </div>

            {/* 2. Total Purchases This Month */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 block">
                {isRtl ? 'مشتريات هذا الشهر (This Month)' : 'Purchases This Month'}
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-950">
                {formatCurrency(purchaseMetrics.totalPurchasesMonth)}{' '}
                <span className="text-xs font-sans text-slate-500 font-normal">ر.س</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block">
                {isRtl ? 'إجمالي توريدات الشهر الحالي' : 'Current month total'}
              </span>
            </div>

            {/* 3. Total Outstanding Supplier Payments */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-rose-600 block">
                {isRtl ? 'مستحقات وأرصدة الموردين (المتبقي)' : 'Outstanding Supplier Payments'}
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono text-rose-600">
                {formatCurrency(purchaseMetrics.totalOutstandingSupplierPayments)}{' '}
                <span className="text-xs font-sans text-rose-400 font-normal">ر.س</span>
              </div>
              <span className="text-[10px] text-rose-500 font-semibold block">
                {isRtl ? 'مبالغ آجلة واجبة السداد للموردين' : 'Pending debts owed to suppliers'}
              </span>
            </div>

            {/* 4. Total Paid Purchases */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-emerald-700 block">
                {isRtl ? 'إجمالي المشتريات المسددة (Paid)' : 'Total Paid Purchases'}
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700">
                {formatCurrency(purchaseMetrics.totalPaidPurchases)}{' '}
                <span className="text-xs font-sans text-slate-500 font-normal">ر.س</span>
              </div>
              <span className="text-[10px] text-emerald-600/80 font-medium block">
                {isRtl ? 'حوالات بنكية ومسددات نقدية' : 'Paid in bank & cash'}
              </span>
            </div>

            {/* 5. Number of Purchase Invoices */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 block">
                {isRtl ? 'عدد فواتير المشتريات' : 'Purchase Invoices Count'}
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
                {purchaseMetrics.purchaseInvoicesCount}{' '}
                <span className="text-xs font-sans text-slate-500 font-normal">{isRtl ? 'فاتورة' : 'invoices'}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block">
                {isRtl ? `من ${suppliers.length} موردين معتمدين` : `From ${suppliers.length} suppliers`}
              </span>
            </div>

            {/* 6. VAT Input 15% */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-blue-700 block">
                {isRtl ? 'ضريبة المدخلات 15% (VAT Input)' : 'VAT Input (15%)'}
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono text-blue-700">
                {formatCurrency(purchaseMetrics.totalVatInput)}{' '}
                <span className="text-xs font-sans text-slate-500 font-normal">ر.س</span>
              </div>
              <span className="text-[10px] text-blue-600/80 font-medium block">
                {isRtl ? 'مستردة ومخصومة بإقرار ZATCA' : 'Eligible for ZATCA tax refund'}
              </span>
            </div>
          </div>

          {/* Recent Purchase Invoices Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  {isRtl ? 'أحدث فواتير المشتريات المسجلة' : 'Recent Purchase Invoices'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {isRtl ? 'عرض فواتير التوريد الحديثة من مصانع وموردي الدهانات' : 'Latest supplier purchase invoices'}
                </p>
              </div>

              {onNewPurchaseInvoice && (
                <button
                  type="button"
                  onClick={onNewPurchaseInvoice}
                  className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isRtl ? '+ فاتورة مشتريات' : '+ New Purchase'}</span>
                </button>
              )}
            </div>

            {filteredPurchaseInvoices.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs space-y-2">
                <Receipt className="w-8 h-8 mx-auto text-slate-300" />
                <p>{isRtl ? 'لا توجد فواتير مشتريات مسجلة تطابق التصفية.' : 'No purchase invoices found.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3 w-28">{isRtl ? 'رقم الفاتورة' : 'Invoice #'}</th>
                      <th className="p-3 w-24">{isRtl ? 'التاريخ' : 'Date'}</th>
                      <th className="p-3 min-w-[180px]">{isRtl ? 'المورد' : 'Supplier'}</th>
                      <th className="p-3 w-24">{isRtl ? 'الضريبة 15%' : 'VAT 15%'}</th>
                      <th className="p-3 w-28">{isRtl ? 'الإجمالي (ر.س)' : 'Total (SAR)'}</th>
                      <th className="p-3 w-24">{isRtl ? 'المدفوع' : 'Paid'}</th>
                      <th className="p-3 w-24">{isRtl ? 'المتبقي' : 'Remaining'}</th>
                      <th className="p-3 w-24">{isRtl ? 'حالة السداد' : 'Payment'}</th>
                      <th className="p-3 w-28 text-center">{isRtl ? 'معاينة' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPurchaseInvoices.slice(0, 10).map((pInv) => (
                      <tr key={pInv.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-mono font-bold text-emerald-900">
                          {pInv.invoiceNumber}
                        </td>
                        <td className="p-3 font-mono text-slate-600">{pInv.issueDate}</td>
                        <td className="p-3 font-bold text-slate-900">{pInv.supplier.nameAr}</td>
                        <td className="p-3 font-mono font-semibold text-emerald-800">
                          {formatCurrency(pInv.totalVat)}
                        </td>
                        <td className="p-3 font-mono font-black text-slate-900">
                          {formatCurrency(pInv.grandTotal)}
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-700">
                          {formatCurrency(pInv.amountPaid)}
                        </td>
                        <td className="p-3 font-mono font-bold text-rose-600">
                          {pInv.remainingBalance > 0 ? formatCurrency(pInv.remainingBalance) : '-'}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                              pInv.paymentStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : pInv.paymentStatus === 'PARTIALLY_PAID'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {pInv.paymentStatus === 'PAID'
                              ? 'مسددة'
                              : pInv.paymentStatus === 'PARTIALLY_PAID'
                              ? 'جزئي'
                              : 'آجل'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {onViewPurchaseInvoice && (
                            <button
                              type="button"
                              onClick={() => onViewPurchaseInvoice(pInv)}
                              className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-emerald-800 bg-slate-100 hover:bg-emerald-50 rounded-lg transition inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{isRtl ? 'عرض A4' : 'View'}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. SALES DASHBOARD VIEW */}
      {dashboardTab === 'SALES' && (
        <div className="space-y-6">
          {/* Top Banner & Quick Action */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 rounded-2xl p-6 text-white shadow-md flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black">
                {t.title}
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
                {t.subtitle}
              </p>
            </div>

            <button
              type="button"
              onClick={onNewInvoice}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-900/40 transition inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {translations[lang].nav.newInvoiceBtn}
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">{t.totalSales}</span>
              <div className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-1">
                {formatCurrency(totalSales)} <span className="text-xs text-slate-500">SAR</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">{t.invoicesCount}: {totalInvoices}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">{t.totalVat}</span>
              <div className="text-lg sm:text-xl font-black text-indigo-900 font-mono mt-1">
                {formatCurrency(totalVat)} <span className="text-xs text-indigo-400">SAR</span>
              </div>
              <div className="text-[11px] text-indigo-600 mt-1">{t.vatDueZatca}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">{t.paid}</span>
              <div className="text-lg sm:text-xl font-black text-emerald-700 font-mono mt-1">
                {formatCurrency(paidAmount)} <span className="text-xs text-slate-500">SAR</span>
              </div>
              <div className="text-[11px] text-emerald-600 mt-1">{paidInvoices.length} {t.paidInvoices}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">{t.unpaidPending}</span>
              <div className="text-lg sm:text-xl font-black text-rose-700 font-mono mt-1">
                {formatCurrency(unpaidAmount)} <span className="text-xs text-slate-500">SAR</span>
              </div>
              <div className="text-[11px] text-rose-600 mt-1">{unpaidInvoices.length} {t.pendingAndDrafts}</div>
            </div>
          </div>

          {/* Monthly Sales Revenue Recharts Bar Chart */}
          <MonthlySalesChart invoices={invoices} lang={lang} />

          {/* Recent Sales Invoices Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">{t.recentInvoices}</h3>
              <span className="text-xs text-slate-400">
                {t.totalShown}: {filteredInvoices.length}
              </span>
            </div>

            {filteredInvoices.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                {t.noInvoicesFound}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className={`w-full text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">{t.invNumber}</th>
                      <th className="p-3">{t.dateTime}</th>
                      <th className="p-3">{t.customer}</th>
                      <th className="p-3 text-center">{t.pricingMode}</th>
                      <th className="p-3 text-center">{t.vatAmount}</th>
                      <th className="p-3 text-center">{t.grandTotal}</th>
                      <th className="p-3 text-center">{t.paymentStatus}</th>
                      <th className="p-3 text-center">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices.slice(0, 10).map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                        <td className="p-3 font-mono text-slate-600">{inv.issueDate}</td>
                        <td className="p-3 font-medium text-slate-900">
                          {isRtl ? inv.customer.nameAr : (inv.customer.nameEn || inv.customer.nameAr)}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                            {inv.pricingMode === 'INCLUSIVE' ? t.inclusiveBadge : t.exclusiveBadge}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono text-indigo-700 font-semibold">
                          {formatCurrency(inv.totalVat)} SAR
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-900">
                          {formatCurrency(inv.grandTotal)} SAR
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-md ${
                              inv.paymentStatus === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {inv.paymentStatus === 'PAID' ? t.paidBadge : t.unpaidBadge}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onViewInvoice(inv)}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onPrintInvoice ? onPrintInvoice(inv) : onViewInvoice(inv)}
                              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              title="Print"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditInvoice(inv)}
                              className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              title="Edit"
                            >
                              <FileEdit className="w-4 h-4" />
                            </button>
                            {onDeleteInvoice && (
                              <button
                                type="button"
                                onClick={() => setDeletingSalesInvoice(inv)}
                                className="p-1.5 text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200 rounded-lg transition shadow-2xs"
                                title={isRtl ? 'حذف الفاتورة' : 'Delete Invoice'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. COMBINED SHOP PULSE OVERVIEW */}
      {dashboardTab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>{isRtl ? 'إجمالي المبيعات' : 'Total Sales'}</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-700">
                {formatCurrency(totalSales)} SAR
              </div>
              <span className="text-[11px] text-slate-400 block">{invoices.length} فواتير بيع</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>{isRtl ? 'إجمالي المشتريات' : 'Total Purchases'}</span>
                <ArrowDownLeft className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black font-mono text-blue-800">
                {formatCurrency(purchaseMetrics.totalPaidPurchases + purchaseMetrics.totalOutstandingSupplierPayments)} SAR
              </div>
              <span className="text-[11px] text-slate-400 block">{purchaseInvoices.length} فواتير توريد</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>{isRtl ? 'صافي الضريبة للهيئة ZATCA' : 'Net VAT Due'}</span>
                <Receipt className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black font-mono text-slate-900">
                {formatCurrency(Math.max(0, totalVat - purchaseMetrics.totalVatInput))} SAR
              </div>
              <span className="text-[10px] text-slate-500 block">ضريبة المخرجات مخصوم منها المدخلات</span>
            </div>
          </div>

          {/* Monthly Sales Revenue Recharts Bar Chart */}
          <MonthlySalesChart invoices={invoices} lang={lang} />
        </div>
      )}

      {/* WhatsApp Share Modal */}
      {whatsAppModalInvoice && (
        <WhatsAppShareModal
          isOpen={!!whatsAppModalInvoice}
          onClose={() => setWhatsAppModalInvoice(null)}
          invoice={whatsAppModalInvoice}
          lang={lang}
          containerId="printable-invoice-container"
        />
      )}

      {/* Branded SMS Send Modal (Markaz Al Malk Paint) */}
      {smsModalInvoice && (
        <SmsShareModal
          isOpen={!!smsModalInvoice}
          onClose={() => setSmsModalInvoice(null)}
          invoice={smsModalInvoice}
          lang={lang}
        />
      )}
      {/* In-App Delete Sales Invoice Confirmation Modal */}
      {deletingSalesInvoice && (
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
                onClick={() => setDeletingSalesInvoice(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-semibold">{isRtl ? 'رقم الفاتورة:' : 'Invoice No:'}</span>
                <span className="font-mono font-black text-rose-700 text-sm">{deletingSalesInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-semibold">{isRtl ? 'العميل:' : 'Customer:'}</span>
                <span className="font-bold text-slate-900">
                  {isRtl ? deletingSalesInvoice.customer.nameAr : (deletingSalesInvoice.customer.nameEn || deletingSalesInvoice.customer.nameAr)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-semibold">{isRtl ? 'المبلغ الإجمالي:' : 'Grand Total:'}</span>
                <span className="font-mono font-black text-slate-900">
                  {formatCurrency(deletingSalesInvoice.grandTotal)} SAR
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-semibold">{isRtl ? 'تاريخ الفاتورة:' : 'Date:'}</span>
                <span className="font-mono text-slate-600">{deletingSalesInvoice.issueDate}</span>
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
                onClick={() => setDeletingSalesInvoice(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition border border-slate-300"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteInvoice) {
                    onDeleteInvoice(deletingSalesInvoice);
                  }
                  setDeletingSalesInvoice(null);
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
