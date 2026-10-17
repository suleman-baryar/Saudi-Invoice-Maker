import React, { useState } from 'react';
import { Invoice, PaymentStatus } from '../types';
import { formatCurrency } from '../utils/vatCalculations';
import { storage } from '../utils/storage';
import { Language, translations } from '../utils/translations';
import {
  Search,
  Eye,
  FileEdit,
  Copy,
  Trash2,
  Plus,
  Printer,
  Smartphone,
} from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import { SmsShareModal } from './SmsShareModal';

interface InvoiceHistoryProps {
  invoices: Invoice[];
  onRefresh: () => void;
  onViewInvoice: (invoice: Invoice) => void;
  onEditInvoice: (invoice: Invoice) => void;
  onDuplicateInvoice: (invoice: Invoice) => void;
  onNewInvoice: () => void;
  lang: Language;
  onPrintInvoice?: (invoice: Invoice) => void;
}

export const InvoiceHistory: React.FC<InvoiceHistoryProps> = ({
  invoices,
  onRefresh,
  onViewInvoice,
  onEditInvoice,
  onDuplicateInvoice,
  onNewInvoice,
  lang,
  onPrintInvoice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [whatsAppModalInvoice, setWhatsAppModalInvoice] = useState<Invoice | null>(null);
  const [smsModalInvoice, setSmsModalInvoice] = useState<Invoice | null>(null);
  const t = translations[lang].history;
  const isRtl = lang === 'ar';

  // Handle Quick Payment Status Change
  const handleTogglePayment = (inv: Invoice, nextStatus: PaymentStatus) => {
    storage.updateInvoicePaymentStatus(inv.id, nextStatus);
    onRefresh();
  };

  // Handle Delete
  const handleDelete = (id: string, invoiceNum: string) => {
    if (window.confirm(`${t.deleteConfirm} ${invoiceNum}?`)) {
      storage.deleteInvoice(id);
      onRefresh();
    }
  };

  // Filtering
  const filteredInvoices = invoices.filter((inv) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(term) ||
      inv.customer.nameAr.toLowerCase().includes(term) ||
      (inv.customer.nameEn && inv.customer.nameEn.toLowerCase().includes(term)) ||
      (inv.customer.phone && inv.customer.phone.includes(term));

    if (!matchesSearch) return false;

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'PAID' && inv.paymentStatus !== 'PAID') return false;
      if (statusFilter === 'UNPAID' && inv.paymentStatus !== 'UNPAID') return false;
      if (statusFilter === 'DRAFT' && inv.status !== 'DRAFT') return false;
    }

    if (dateFrom && inv.issueDate < dateFrom) return false;
    if (dateTo && inv.issueDate > dateTo) return false;

    return true;
  });

  return (
    <div className="space-y-5" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Header & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{t.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={onNewInvoice}
          className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          {translations[lang].nav.newInvoiceBtn}
        </button>
      </div>

      {/* Filters Strip */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search */}
          <div className="sm:col-span-5 relative">
            <Search className={`w-4 h-4 text-slate-400 absolute top-2.5 ${isRtl ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.searchPlaceholder}
              className={`w-full text-xs py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'
              }`}
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
            >
              <option value="ALL">{t.allStatuses}</option>
              <option value="PAID">{t.paidOnly}</option>
              <option value="UNPAID">{t.unpaidOnly}</option>
              <option value="DRAFT">{t.draftsOnly}</option>
            </select>
          </div>

          {/* From Date */}
          <div className="sm:col-span-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300"
              title="From Date"
            />
          </div>

          {/* To Date */}
          <div className="sm:col-span-2">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300"
              title="To Date"
            />
          </div>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            {t.noInvoicesFound}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">{translations[lang].dashboard.invNumber}</th>
                  <th className="p-3">{translations[lang].dashboard.dateTime}</th>
                  <th className="p-3">{translations[lang].dashboard.customer}</th>
                  <th className="p-3 text-center">{translations[lang].dashboard.pricingMode}</th>
                  <th className="p-3 text-center">{t.itemsCount}</th>
                  <th className="p-3 text-center">{t.vatAmount}</th>
                  <th className="p-3 text-center">{t.totalDue}</th>
                  <th className="p-3 text-center">{t.paymentStatus}</th>
                  <th className="p-3 text-center min-w-[140px]">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {inv.invoiceNumber}
                      {inv.status === 'DRAFT' && (
                        <span className="mx-1.5 text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1 py-0.5 rounded font-sans">
                          {translations[lang].dashboard.draftBadge}
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-slate-600">
                      {inv.issueDate}
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">
                        {isRtl ? inv.customer.nameAr : (inv.customer.nameEn || inv.customer.nameAr)}
                      </div>
                      {inv.customer.phone && (
                        <div className="text-[10px] text-slate-400 font-mono">{inv.customer.phone}</div>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          inv.pricingMode === 'INCLUSIVE'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-purple-50 text-purple-700'
                        }`}
                      >
                        {inv.pricingMode === 'INCLUSIVE'
                          ? translations[lang].dashboard.inclusiveBadge
                          : translations[lang].dashboard.exclusiveBadge}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono">{inv.items.length}</td>
                    <td className="p-3 text-center font-mono font-semibold text-blue-700">
                      {formatCurrency(inv.totalVat)} SAR
                    </td>
                    <td className="p-3 text-center font-mono font-extrabold text-slate-900">
                      {formatCurrency(inv.grandTotal)} SAR
                    </td>
                    <td className="p-3 text-center">
                      <select
                        value={inv.paymentStatus}
                        onChange={(e) => handleTogglePayment(inv, e.target.value as PaymentStatus)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-md border cursor-pointer focus:outline-none ${
                          inv.paymentStatus === 'PAID'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : inv.paymentStatus === 'PARTIALLY_PAID'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        <option value="PAID">{translations[lang].editor.paidFull}</option>
                        <option value="UNPAID">{translations[lang].editor.unpaid}</option>
                        <option value="PARTIALLY_PAID">{translations[lang].editor.partiallyPaid}</option>
                      </select>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onViewInvoice(inv)}
                          title={isRtl ? 'معاينة' : 'View'}
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
                          title="Edit"
                          className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        >
                          <FileEdit className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDuplicateInvoice(inv)}
                          title="Duplicate"
                          className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(inv.id, inv.invoiceNumber)}
                          title="Delete"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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
          onInvoiceUpdated={() => {
            onRefresh();
          }}
        />
      )}

      {/* Branded SMS Send Modal (Markaz Al Malk Paint) */}
      {smsModalInvoice && (
        <SmsShareModal
          isOpen={!!smsModalInvoice}
          onClose={() => setSmsModalInvoice(null)}
          invoice={smsModalInvoice}
          lang={lang}
          onInvoiceUpdated={() => {
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
