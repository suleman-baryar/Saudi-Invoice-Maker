import React, { useState } from 'react';
import { storage } from '../utils/storage';
import { formatCurrency } from '../utils/vatCalculations';
import { Language, translations } from '../utils/translations';
import {
  BarChart3,
  Calendar,
  FileSpreadsheet,
  Printer,
  Download,
  Building2,
  Receipt,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Percent,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

interface ReportsViewProps {
  lang: Language;
}

type ReportTab =
  | 'PURCHASE_PERIOD'
  | 'SUPPLIER_WISE'
  | 'OUTSTANDING_DEBTS'
  | 'VAT_TAX_DECLARATION';

export const ReportsView: React.FC<ReportsViewProps> = ({ lang }) => {
  const isRtl = lang === 'ar';
  const [activeTab, setActiveTab] = useState<ReportTab>('PURCHASE_PERIOD');
  const [periodType, setPeriodType] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL'>('MONTHLY');

  const suppliers = storage.getSuppliers();
  const purchaseInvoices = storage.getPurchaseInvoices().filter((i) => i.status !== 'CANCELLED');
  const salesInvoices = storage.getInvoices().filter((i) => i.status !== 'CANCELLED');

  // Dates
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7);
  const thisYearStr = todayStr.substring(0, 4);

  // Period filtering for purchases
  const getPeriodFilteredPurchases = () => {
    return purchaseInvoices.filter((inv) => {
      const d = inv.issueDate || '';
      if (periodType === 'DAILY') return d === todayStr;
      if (periodType === 'MONTHLY') return d.startsWith(thisMonthStr);
      if (periodType === 'ANNUAL') return d.startsWith(thisYearStr);
      if (periodType === 'WEEKLY') {
        // Last 7 days
        const invDate = new Date(d);
        const diffDays = (now.getTime() - invDate.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }
      return true;
    });
  };

  const currentPeriodPurchases = getPeriodFilteredPurchases();
  const periodPurchasesTotal = currentPeriodPurchases.reduce((sum, i) => sum + i.grandTotal, 0);
  const periodPurchasesVat = currentPeriodPurchases.reduce((sum, i) => sum + i.totalVat, 0);
  const periodPurchasesPaid = currentPeriodPurchases.reduce((sum, i) => sum + i.amountPaid, 0);
  const periodPurchasesRemaining = currentPeriodPurchases.reduce((sum, i) => sum + i.remainingBalance, 0);

  // Tax declaration comparison
  const totalSalesTaxable = salesInvoices.reduce((sum, i) => sum + i.taxableAmount, 0);
  const totalSalesVatOutput = salesInvoices.reduce((sum, i) => sum + i.totalVat, 0);

  const totalPurchasesTaxable = purchaseInvoices.reduce((sum, i) => sum + i.taxableAmount, 0);
  const totalPurchasesVatInput = purchaseInvoices.reduce((sum, i) => sum + i.totalVat, 0);

  const netVatPayable = totalSalesVatOutput - totalPurchasesVatInput;

  // Export CSV
  const handleExportCsv = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (activeTab === 'PURCHASE_PERIOD') {
      csvContent += 'Invoice Number,Date,Supplier,Supplier Invoice,Subtotal,VAT 15%,Grand Total,Amount Paid,Remaining,Payment Status\n';
      currentPeriodPurchases.forEach((i) => {
        csvContent += `"${i.invoiceNumber}","${i.issueDate}","${i.supplier.nameAr}","${i.supplierInvoiceNumber || ''}",${i.taxableAmount},${i.totalVat},${i.grandTotal},${i.amountPaid},${i.remainingBalance},"${i.paymentStatus}"\n`;
      });
    } else if (activeTab === 'SUPPLIER_WISE' || activeTab === 'OUTSTANDING_DEBTS') {
      csvContent += 'Supplier Name,VAT Number,Phone,Total Purchases,Total Paid,Current Balance\n';
      suppliers.forEach((s) => {
        csvContent += `"${s.nameAr}","${s.vatNumber || ''}","${s.phone || ''}",${s.totalPurchases},${s.totalPaid},${s.currentBalance}\n`;
      });
    } else {
      csvContent += 'Type,Taxable Amount,VAT 15%\n';
      csvContent += `"Sales (Output Tax)",${totalSalesTaxable},${totalSalesVatOutput}\n`;
      csvContent += `"Purchases (Input Tax)",${totalPurchasesTaxable},${totalPurchasesVatInput}\n`;
      csvContent += `"Net VAT Payable",-,${netVatPayable}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MarkazAlMalki_Report_${activeTab}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-700" />
            <span>{isRtl ? 'تقارير المشتريات والمبيعات والضريبة' : 'Purchases & VAT Reports'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isRtl
              ? 'مركز المالك للدهانات - تقارير دورية، مديونيات الموردين، وتصفية ضريبة المدخلات والمخرجات للإقرار الضريبي'
              : 'Markaz Al Malki Paint - Periodic purchases, supplier debts, and ZATCA VAT declaration'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>{isRtl ? 'تصدير كـ CSV / Excel' : 'Export CSV'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>{isRtl ? 'طباعة التقرير' : 'Print Report'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {[
          { id: 'PURCHASE_PERIOD' as ReportTab, label: isRtl ? '📅 تقرير المشتريات الدوري' : 'Purchases by Period' },
          { id: 'SUPPLIER_WISE' as ReportTab, label: isRtl ? '🏢 تقرير المشتريات حسب المورد' : 'Supplier-wise Purchases' },
          { id: 'OUTSTANDING_DEBTS' as ReportTab, label: isRtl ? '⏳ أرصدة ومستحقات الموردين' : 'Outstanding Debts' },
          { id: 'VAT_TAX_DECLARATION' as ReportTab, label: isRtl ? '📋 إقرار ضريبة القيمة المضافة (ZATCA)' : 'VAT Declaration (15%)' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition ${
              activeTab === tab.id
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: PURCHASE PERIOD REPORT */}
      {activeTab === 'PURCHASE_PERIOD' && (
        <div className="space-y-4">
          {/* Period Selector */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-bold text-slate-800">
              {isRtl ? 'اختر الفترة الزمنية للتقرير:' : 'Select Report Timeframe:'}
            </span>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg font-semibold">
              {[
                { id: 'DAILY', label: isRtl ? 'اليوم' : 'Today' },
                { id: 'WEEKLY', label: isRtl ? 'آخر 7 أيام' : 'Last 7 Days' },
                { id: 'MONTHLY', label: isRtl ? 'هذا الشهر' : 'This Month' },
                { id: 'ANNUAL', label: isRtl ? 'هذا العام' : 'This Year' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodType(p.id as any)}
                  className={`px-3 py-1.5 rounded-md transition ${
                    periodType === p.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold block">{isRtl ? 'إجمالي المشتريات' : 'Purchases'}</span>
              <span className="text-lg font-black font-mono text-slate-900 mt-1 block">
                {formatCurrency(periodPurchasesTotal)} SAR
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] text-blue-700 font-semibold block">{isRtl ? 'ضريبة المدخلات 15%' : 'VAT Input'}</span>
              <span className="text-lg font-black font-mono text-blue-700 mt-1 block">
                {formatCurrency(periodPurchasesVat)} SAR
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] text-emerald-700 font-semibold block">{isRtl ? 'المسدد' : 'Paid'}</span>
              <span className="text-lg font-black font-mono text-emerald-700 mt-1 block">
                {formatCurrency(periodPurchasesPaid)} SAR
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] text-rose-600 font-semibold block">{isRtl ? 'المتبقي للموردين' : 'Remaining'}</span>
              <span className="text-lg font-black font-mono text-rose-600 mt-1 block">
                {formatCurrency(periodPurchasesRemaining)} SAR
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center text-xs">
              <h3 className="font-extrabold text-slate-900">
                {isRtl ? `فواتير المشتريات (${currentPeriodPurchases.length} فاتورة)` : `Invoices (${currentPeriodPurchases.length})`}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3">رقم الفاتورة</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">المورد</th>
                    <th className="p-3">المبلغ الخاضع للضريبة</th>
                    <th className="p-3">ضريبة 15%</th>
                    <th className="p-3">الإجمالي المطلوب</th>
                    <th className="p-3">المدفوع</th>
                    <th className="p-3">المتبقي</th>
                    <th className="p-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentPeriodPurchases.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-emerald-900">{inv.invoiceNumber}</td>
                      <td className="p-3 font-mono text-slate-600">{inv.issueDate}</td>
                      <td className="p-3 font-bold text-slate-800">{inv.supplier.nameAr}</td>
                      <td className="p-3 font-mono">{formatCurrency(inv.taxableAmount)}</td>
                      <td className="p-3 font-mono text-blue-700 font-bold">{formatCurrency(inv.totalVat)}</td>
                      <td className="p-3 font-mono font-black text-slate-900">{formatCurrency(inv.grandTotal)}</td>
                      <td className="p-3 font-mono text-emerald-700">{formatCurrency(inv.amountPaid)}</td>
                      <td className="p-3 font-mono text-rose-600 font-bold">{formatCurrency(inv.remainingBalance)}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                          {inv.paymentStatus === 'PAID' ? 'مسددة' : inv.paymentStatus === 'PARTIALLY_PAID' ? 'جزئي' : 'آجل'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUPPLIER-WISE REPORT */}
      {activeTab === 'SUPPLIER_WISE' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-extrabold text-sm text-slate-900">
              {isRtl ? 'كشف حساب ومشتريات الموردين التراكمي' : 'Cumulative Supplier Statement'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">اسم المورد</th>
                  <th className="p-3">الرقم الضريبي</th>
                  <th className="p-3">الجوال</th>
                  <th className="p-3">الرصيد الافتتاحي</th>
                  <th className="p-3">إجمالي المشتريات</th>
                  <th className="p-3">إجمالي المسدد</th>
                  <th className="p-3">الرصيد المستحق بذمتنا</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{s.nameAr}</td>
                    <td className="p-3 font-mono text-slate-600">{s.vatNumber || '-'}</td>
                    <td className="p-3 font-mono" dir="ltr">{s.phone}</td>
                    <td className="p-3 font-mono">{formatCurrency(s.openingBalance || 0)}</td>
                    <td className="p-3 font-mono font-bold text-slate-900">{formatCurrency(s.totalPurchases || 0)}</td>
                    <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(s.totalPaid || 0)}</td>
                    <td className="p-3 font-mono font-black text-rose-600 text-sm">
                      {formatCurrency(s.currentBalance || 0)} SAR
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: OUTSTANDING DEBTS REPORT */}
      {activeTab === 'OUTSTANDING_DEBTS' && (
        <div className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="font-bold text-sm text-rose-950 block">
                {isRtl ? 'إجمالي مستحقات وديون الموردين المتبقية:' : 'Total Outstanding Supplier Debts:'}
              </span>
              <span className="text-xs text-rose-800">
                {isRtl ? 'مجموع المبالغ الآجلة والجزئية الواجب سدادها لمصانع وموردي الدهانات' : 'Sum of credit amounts owed to paint suppliers'}
              </span>
            </div>
            <span className="text-xl sm:text-2xl font-black font-mono text-rose-700">
              {formatCurrency(suppliers.reduce((sum, s) => sum + (s.currentBalance || 0), 0))} SAR
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3">المورد</th>
                    <th className="p-3">المسؤول والجوال</th>
                    <th className="p-3">إجمالي المشتريات</th>
                    <th className="p-3">المسدد</th>
                    <th className="p-3">المبلغ المستحق (متبقي)</th>
                    <th className="p-3 text-center">حالة السداد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppliers
                    .filter((s) => s.currentBalance > 0)
                    .map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{s.nameAr}</td>
                        <td className="p-3 text-slate-600">
                          <div>{s.contactPerson || '-'}</div>
                          <div className="font-mono text-[10px]" dir="ltr">{s.phone}</div>
                        </td>
                        <td className="p-3 font-mono font-bold">{formatCurrency(s.totalPurchases || 0)}</td>
                        <td className="p-3 font-mono text-emerald-700">{formatCurrency(s.totalPaid || 0)}</td>
                        <td className="p-3 font-mono font-black text-rose-600 text-sm">
                          {formatCurrency(s.currentBalance || 0)} SAR
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            مستحق السداد
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ZATCA TAX DECLARATION COMPARISON */}
      {activeTab === 'VAT_TAX_DECLARATION' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-slate-900 to-emerald-950 text-white rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-800 pb-3">
              <div>
                <h3 className="font-black text-base">
                  {isRtl ? 'ملخص الإقرار الضريبي لضريبة القيمة المضافة (ZATCA 15%)' : 'ZATCA VAT Declaration Summary (15%)'}
                </h3>
                <p className="text-xs text-emerald-200 mt-0.5">
                  {isRtl
                    ? 'احتساب ضريبة المخرجات (المبيعات) وضريبة المدخلات (المشتريات) لتحديد صافي الضريبة المستحقة'
                    : 'Output VAT from Sales vs Input VAT from Purchases to determine net payable tax'}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                15% VAT
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/10 space-y-1">
                <span className="text-[11px] text-slate-300 block">
                  {isRtl ? 'ضريبة المخرجات (المبيعات المحصلة)' : 'Output VAT (Sales)'}
                </span>
                <span className="text-xl font-black font-mono text-emerald-400 block">
                  + {formatCurrency(totalSalesVatOutput)} SAR
                </span>
                <span className="text-[10px] text-slate-400 block">
                  من إجمالي مبيعات: {formatCurrency(totalSalesTaxable)} SAR
                </span>
              </div>

              <div className="bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/10 space-y-1">
                <span className="text-[11px] text-slate-300 block">
                  {isRtl ? 'ضريبة المدخلات (المشتريات المستردة)' : 'Input VAT (Purchases)'}
                </span>
                <span className="text-xl font-black font-mono text-blue-400 block">
                  - {formatCurrency(totalPurchasesVatInput)} SAR
                </span>
                <span className="text-[10px] text-slate-400 block">
                  من إجمالي مشتريات: {formatCurrency(totalPurchasesTaxable)} SAR
                </span>
              </div>

              <div className="bg-white/15 backdrop-blur-xs p-4 rounded-xl border border-emerald-400/30 space-y-1">
                <span className="text-[11px] text-emerald-200 block font-bold">
                  {netVatPayable >= 0
                    ? (isRtl ? 'صافي الضريبة المستحقة للهيئة (السداد)' : 'Net VAT Payable to ZATCA')
                    : (isRtl ? 'صافي رصيد الضريبة المسترد لك' : 'Net Tax Refund Claim')}
                </span>
                <span className="text-2xl font-black font-mono text-white block">
                  {formatCurrency(Math.abs(netVatPayable))} SAR
                </span>
                <span className="text-[10px] text-emerald-300 block">
                  {netVatPayable >= 0 ? 'مبلغ واجب السداد لإقرار الهيئة' : 'رصيد دائن مسترد في حسابك'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
