import React, { useState } from 'react';
import { Invoice } from '../types';
import { Language, translations } from '../utils/translations';
import { InvoicePreview } from './InvoicePreview';
import { WhatsAppIcon } from './WhatsAppIcon';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import { SmsShareModal } from './SmsShareModal';
import { Printer, Download, Share2, X, Eye, CheckCircle2, Camera, Smartphone } from 'lucide-react';
import { downloadInvoicePdf, printInvoice, shareInvoice, captureInvoiceScreenshot } from '../utils/pdfGenerator';

interface PrintPreviewModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  lang: Language;
  onEdit?: (invoice: Invoice) => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  invoice,
  onClose,
  lang,
  onEdit,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [screenshotSuccess, setScreenshotSuccess] = useState(false);
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const isRtl = lang === 'ar';

  if (!isOpen || !invoice) return null;

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      await downloadInvoicePdf('modal-printable-invoice-container', `Invoice-${invoice.invoiceNumber}`);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleTakeScreenshot = async () => {
    setIsCapturingScreenshot(true);
    setScreenshotSuccess(false);
    try {
      await captureInvoiceScreenshot('modal-printable-invoice-container', `Invoice-${invoice.invoiceNumber}`);
      setScreenshotSuccess(true);
      setTimeout(() => setScreenshotSuccess(false), 5000);
    } catch (err) {
      console.error('Screenshot capture error:', err);
    } finally {
      setIsCapturingScreenshot(false);
    }
  };

  const handleShare = async () => {
    await shareInvoice(
      'modal-printable-invoice-container',
      invoice.invoiceNumber,
      invoice.customer.nameAr || invoice.customer.nameEn
    );
  };

  const handleTriggerPrint = () => {
    printInvoice();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div
        className="bg-slate-100 sm:rounded-2xl rounded-none shadow-2xl max-w-4xl w-full h-full sm:h-auto sm:max-h-[96vh] flex flex-col border border-slate-300 overflow-hidden"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Top Floating Control Bar */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-200 shrink-0 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Eye className="w-4 h-4" />
              </div>
              <div className="truncate">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-1.5 flex-wrap">
                  <span>{isRtl ? 'معاينة الفاتورة قبل الطباعة' : 'Invoice Print Preview'}</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {invoice.invoiceNumber}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  {isRtl ? 'فاتورة ضريبية مبسطة معتمدة وجاهزة للطباعة أو التصدير' : 'Approved Simplified Tax Invoice ready for print or export'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition shrink-0"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center flex-wrap gap-2 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={handleTriggerPrint}
              className="px-3.5 sm:px-4 py-1.5 text-xs font-extrabold text-white bg-slate-900 hover:bg-black rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>{isRtl ? 'طباعة الآن (Print)' : 'Print Now'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? translations[lang].preview.generatingPdf : translations[lang].preview.downloadPdfBtn}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSmsModalOpen(true)}
              className="px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-950 active:bg-slate-900 rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
              title={isRtl ? 'إرسال الفاتورة عبر رسالة SMS لشريحة العميل باسم Markaz Al Malk Paint بدون رقمك' : 'Send invoice via SMS to customer SIM as Markaz Al Malk Paint'}
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-200" />
              <span>{translations[lang].preview.sendSmsBtn || 'إرسال SMS (Markaz Al Malk)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-[#25D366] hover:bg-[#20ba59] active:bg-[#1caa4f] rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
              title={isRtl ? 'إرسال الفاتورة عبر واتساب إلى رقم العميل المكتوب في الفاتورة' : 'Send invoice via WhatsApp to customer number'}
            >
              <WhatsAppIcon className="w-4 h-4 text-white" />
              <span>{translations[lang].preview.sendWhatsAppBtn}</span>
            </button>

            <button
              type="button"
              onClick={handleTakeScreenshot}
              disabled={isCapturingScreenshot}
              className="px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
              title={isRtl ? 'التقاط لقطة شاشة لمنطقة الفاتورة فقط وحفظها كصورة' : 'Take screenshot of invoice sheet only'}
            >
              {isCapturingScreenshot ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
              <span>
                {isCapturingScreenshot
                  ? (isRtl ? 'جاري الالتقاط...' : 'Capturing...')
                  : (isRtl ? 'لقطة شاشة (Screenshot)' : 'Screenshot')}
              </span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition inline-flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{translations[lang].preview.shareBtn}</span>
            </button>

            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(invoice);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                {translations[lang].preview.editInvoiceBtn}
              </button>
            )}
          </div>

          {/* Toast Notification on Screenshot Success */}
          {screenshotSuccess && (
            <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">
                  {isRtl
                    ? 'تم التقاط لقطة شاشة لمنطقة الفاتورة فقط بنجاح وتنزيلها كصورة (PNG)!'
                    : 'Invoice area screenshot captured successfully and saved as PNG!'}
                </span>
              </div>
              <span className="text-[11px] text-emerald-700 font-mono font-semibold bg-emerald-100/60 px-2 py-0.5 rounded">
                Invoice-{invoice.invoiceNumber}.png
              </span>
            </div>
          )}
        </div>

        {/* Modal Scrollable Canvas for A4 Paper Preview */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-5 bg-slate-200/70 flex justify-center items-start">
          <div className="w-full max-w-[850px]">
            <InvoicePreview
              invoice={invoice}
              showToolbar={false}
              showZoomBar={true}
              defaultZoomMode="fit"
              lang={lang}
              containerId="modal-printable-invoice-container"
            />
          </div>
        </div>

        {/* Bottom Helper Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isRtl ? 'المعاينة مطابقة لمقاس ورق A4 ولشروط ZATCA' : 'Preview conforms to standard A4 paper and ZATCA standards'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md text-xs transition"
          >
            {isRtl ? 'إغلاق المعاينة' : 'Close Preview'}
          </button>
        </div>
      </div>

      {/* WhatsApp Share Modal */}
      <WhatsAppShareModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        invoice={invoice}
        lang={lang}
        containerId="modal-printable-invoice-container"
      />

      {/* Branded SMS Send Modal (Markaz Al Malk Paint) */}
      <SmsShareModal
        isOpen={isSmsModalOpen}
        onClose={() => setIsSmsModalOpen(false)}
        invoice={invoice}
        lang={lang}
      />
    </div>
  );
};
