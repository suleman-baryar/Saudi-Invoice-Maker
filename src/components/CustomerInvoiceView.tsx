import React, { useState, useEffect } from 'react';
import { Invoice } from '../types';
import { Language } from '../utils/translations';
import { InvoicePreview } from './InvoicePreview';
import { downloadInvoicePdf, printInvoice } from '../utils/pdfGenerator';
import {
  Download,
  Printer,
  ShieldCheck,
  Building2,
  ArrowRight,
  ExternalLink,
  FileText,
} from 'lucide-react';

interface CustomerInvoiceViewProps {
  invoice: Invoice;
  lang: Language;
  onExitToPortal?: () => void;
}

export const CustomerInvoiceView: React.FC<CustomerInvoiceViewProps> = ({
  invoice,
  lang = 'ar',
  onExitToPortal,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const isRtl = lang === 'ar';
  const companyName = invoice.company?.nameAr || 'مركز الملك للدهانات';

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadInvoicePdf(
        'customer-view-printable-container',
        `Invoice-${invoice.invoiceNumber}`
      );
    } catch (e) {
      console.error('Customer PDF download error:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Official Top Customer Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-xs">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Building2 className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="font-extrabold text-sm sm:text-base text-slate-900">
                  {companyName}
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  {isRtl ? 'فاتورة ضريبية مبسطة معتمدة' : 'Official Tax Invoice'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                {isRtl ? 'رقم الفاتورة:' : 'Invoice No:'} {invoice.invoiceNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 rounded-xl transition inline-flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloading ? (isRtl ? 'جاري التحميل...' : 'Downloading...') : (isRtl ? 'تحميل الفاتورة PDF' : 'Download PDF')}</span>
            </button>

            <button
              type="button"
              onClick={() => printInvoice()}
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition inline-flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>{isRtl ? 'طباعة' : 'Print'}</span>
            </button>

            {onExitToPortal && (
              <button
                type="button"
                onClick={onExitToPortal}
                className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition inline-flex items-center gap-1 border border-slate-200"
                title={isRtl ? 'الدخول للوحة التحكم' : 'Go to Admin Portal'}
              >
                <span>{isRtl ? 'لوحة التحكم' : 'Admin Portal'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Customer Notice Strip */}
      <div className="bg-emerald-50 border-b border-emerald-200/80 px-4 py-2 text-center text-xs text-emerald-900 font-medium">
        <span>
          {isRtl
            ? 'مرحباً بك! يمكنك معاينة وتنزيل فاتورتك الضريبية المعتمدة الصادرة من مركز الملك للدهانات في أي وقت.'
            : 'Welcome! You can view and download your official tax invoice from Markaz Al Malk at any time.'}
        </span>
      </div>

      {/* Invoice Canvas Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-2 sm:p-6 flex flex-col items-center">
        <div className="w-full">
          <InvoicePreview
            invoice={invoice}
            lang={lang}
            showToolbar={false}
            showZoomBar={true}
            defaultZoomMode="fit"
            containerId="customer-view-printable-container"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500">
        <p>{companyName} — {isRtl ? 'نظام الفاتورة الإلكترونية المعتمد من هيئة الزكاة والضريبة والجمارك (ZATCA)' : 'ZATCA Compliant E-Invoicing System'}</p>
      </footer>
    </div>
  );
};
