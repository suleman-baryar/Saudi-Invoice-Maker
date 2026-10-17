import React, { useState } from 'react';
import { Invoice } from '../types';
import { formatCurrency } from '../utils/vatCalculations';
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
} from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import { SmsShareModal } from './SmsShareModal';

interface DashboardProps {
  invoices: Invoice[];
  onNewInvoice: () => void;
  onViewInvoice: (invoice: Invoice) => void;
  onEditInvoice: (invoice: Invoice) => void;
  onOpenVatTests: () => void;
  lang: Language;
  onPrintInvoice?: (invoice: Invoice) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  invoices,
  onNewInvoice,
  onViewInvoice,
  onEditInvoice,
  onOpenVatTests,
  lang,
  onPrintInvoice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'MONTH' | 'YEAR'>('ALL');
  const [whatsAppModalInvoice, setWhatsAppModalInvoice] = useState<Invoice | null>(null);
  const [smsModalInvoice, setSmsModalInvoice] = useState<Invoice | null>(null);
  const t = translations[lang].dashboard;
  const isRtl = lang === 'ar';

  // Filter invoices based on date
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

  // Calculate metrics
  const totalInvoices = filteredInvoices.length;
  const totalSales = filteredInvoices.reduce((sum, i) => sum + (i.status !== 'CANCELLED' ? i.grandTotal : 0), 0);
  const totalVat = filteredInvoices.reduce((sum, i) => sum + (i.status !== 'CANCELLED' ? i.totalVat : 0), 0);

  const paidInvoices = filteredInvoices.filter((i) => i.paymentStatus === 'PAID');
  const paidAmount = paidInvoices.reduce((sum, i) => sum + i.grandTotal, 0);

  const unpaidInvoices = filteredInvoices.filter((i) => i.paymentStatus === 'UNPAID');
  const unpaidAmount = unpaidInvoices.reduce((sum, i) => sum + i.grandTotal, 0);

  const draftInvoices = filteredInvoices.filter((i) => i.status === 'DRAFT');

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
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

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            type="button"
            onClick={onOpenVatTests}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-xs transition inline-flex items-center gap-1.5 border border-white/10"
          >
            <Calculator className="w-4 h-4 text-amber-300" />
            {translations[lang].nav.vatTests}
          </button>

          <button
            type="button"
            onClick={onNewInvoice}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-900/40 transition inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {translations[lang].nav.newInvoiceBtn}
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

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">{t.totalSales}</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 font-mono">
            {formatCurrency(totalSales)}{' '}
            <span className="text-xs font-sans text-slate-500 font-medium">SAR</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {t.invoicesCount}: {totalInvoices}
          </div>
        </div>

        {/* Total VAT */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">{t.totalVat}</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-indigo-900 font-mono">
            {formatCurrency(totalVat)}{' '}
            <span className="text-xs font-sans text-indigo-400 font-medium">SAR</span>
          </div>
          <div className="text-[11px] text-indigo-600 mt-1">{t.vatDueZatca}</div>
        </div>

        {/* Paid Invoices */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">{t.paid}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-700 font-mono">
            {formatCurrency(paidAmount)}{' '}
            <span className="text-xs font-sans text-slate-500 font-medium">SAR</span>
          </div>
          <div className="text-[11px] text-emerald-600 mt-1">
            {paidInvoices.length} {t.paidInvoices}
          </div>
        </div>

        {/* Unpaid / Pending */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">{t.unpaidPending}</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-700 font-mono">
            {formatCurrency(unpaidAmount)}{' '}
            <span className="text-xs font-sans text-slate-500 font-medium">SAR</span>
          </div>
          <div className="text-[11px] text-rose-600 mt-1">
            {unpaidInvoices.length + draftInvoices.length} {t.pendingAndDrafts}
          </div>
        </div>
      </div>

      {/* RECENT INVOICES TABLE */}
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
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {inv.invoiceNumber}
                      {inv.status === 'DRAFT' && (
                        <span className="mx-1 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-sans">
                          {t.draftBadge}
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-slate-600">
                      {inv.issueDate}
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-slate-900">
                        {isRtl ? inv.customer.nameAr : (inv.customer.nameEn || inv.customer.nameAr)}
                      </div>
                      {inv.customer.phone && (
                        <div className="text-[10px] text-slate-400 font-mono">{inv.customer.phone}</div>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.pricingMode === 'INCLUSIVE'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-purple-50 text-purple-700'
                        }`}
                      >
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
                      {inv.paymentStatus === 'PAID' ? (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-md">
                          {t.paidBadge}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold rounded-md">
                          {t.unpaidBadge}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewInvoice(inv)}
                          title={isRtl ? 'معاينة' : 'Preview'}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSmsModalInvoice(inv)}
                          title={isRtl ? 'إرسال الفاتورة عبر رسالة SMS لشريحة العميل باسم Markaz Al Malk Paint وبدون إظهار رقمك الشخصي' : 'Send invoice via SMS as Markaz Al Malk Paint'}
                          className="p-1.5 text-blue-800 hover:text-blue-950 hover:bg-blue-100 rounded-lg transition bg-blue-50 border border-blue-200"
                        >
                          <Smartphone className="w-4 h-4 text-blue-700" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setWhatsAppModalInvoice(inv)}
                          title={isRtl ? 'إرسال الفاتورة عبر واتساب إلى رقم العميل' : 'Send via WhatsApp to customer'}
                          className="p-1.5 text-[#25D366] hover:bg-emerald-50 rounded-lg transition"
                        >
                          <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onPrintInvoice ? onPrintInvoice(inv) : onViewInvoice(inv)}
                          title={isRtl ? 'معاينة وطباعة الفاتورة' : 'Print Preview'}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditInvoice(inv)}
                          title={isRtl ? 'تعديل' : 'Edit'}
                          className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        >
                          <FileEdit className="w-4 h-4" />
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
    </div>
  );
};
