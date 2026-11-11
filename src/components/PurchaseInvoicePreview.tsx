import React, { useRef, useState } from 'react';
import { PurchaseInvoice, CompanyProfile } from '../types';
import { storage } from '../utils/storage';
import { formatCurrency } from '../utils/vatCalculations';
import { Language, translations } from '../utils/translations';
import { downloadInvoicePdf } from '../utils/pdfGenerator';
import { WhatsAppIcon } from './WhatsAppIcon';
import {
  Printer,
  Download,
  Share2,
  Edit,
  ArrowRight,
  Building2,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  FileText,
  BadgeCheck,
  Check,
  Copy,
  Smartphone,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Camera,
} from 'lucide-react';
import { captureInvoiceScreenshot } from '../utils/pdfGenerator';

interface PurchaseInvoicePreviewProps {
  invoice: PurchaseInvoice;
  onEdit: () => void;
  onBack?: () => void;
  lang: Language;
}

export const PurchaseInvoicePreview: React.FC<PurchaseInvoicePreviewProps> = ({
  invoice,
  onEdit,
  onBack,
  lang,
}) => {
  const isRtl = lang === 'ar';
  const company = storage.getCompany();
  const printContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [screenshotSuccess, setScreenshotSuccess] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsAppNotice, setWhatsAppNotice] = useState<string | null>(null);

  // Zoom and Responsive Scaling for Mobile Screens
  const [zoomMode, setZoomMode] = useState<'fit' | 'actual' | 'custom'>('fit');
  const [customZoom, setCustomZoom] = useState<number>(1);
  const [containerWidth, setContainerWidth] = useState<number>(850);
  const [sheetHeight, setSheetHeight] = useState<number>(1150);

  const A4_SHEET_WIDTH = 794; // Standard A4 width

  React.useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
      if (sheetRef.current) {
        setSheetHeight(sheetRef.current.offsetHeight || 1150);
      }
    };

    updateDimensions();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateDimensions();
      });

      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }
      if (sheetRef.current) {
        resizeObserver.observe(sheetRef.current);
      }
    }

    window.addEventListener('resize', updateDimensions);
    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Compute scale
  const availableWidth = Math.max(280, containerWidth - 16);
  const autoFitScale = Math.min(1, Math.max(0.35, Number((availableWidth / A4_SHEET_WIDTH).toFixed(3))));

  let currentScale = 1;
  if (zoomMode === 'fit') {
    currentScale = autoFitScale;
  } else if (zoomMode === 'actual') {
    currentScale = 1;
  } else {
    currentScale = customZoom;
  }

  const handlePrint = () => {
    window.print();
  };

  const handleTakeScreenshot = async () => {
    setIsCapturingScreenshot(true);
    setScreenshotSuccess(false);
    try {
      await captureInvoiceScreenshot('printable-purchase-invoice-container', `PurchaseInvoice-${invoice.invoiceNumber}`);
      setScreenshotSuccess(true);
      setTimeout(() => setScreenshotSuccess(false), 5000);
    } catch (err) {
      console.error('Screenshot capture error:', err);
    } finally {
      setIsCapturingScreenshot(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      await downloadInvoicePdf(
        'printable-purchase-invoice-container',
        `PurchaseInvoice-${invoice.invoiceNumber}`
      );
    } catch (e) {
      console.error('PDF export error:', e);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const handleWhatsAppSend = async () => {
    const cleanPhone = (invoice.supplier.phone || '').replace(/[^\d]/g, '');
    const supplierPhone = cleanPhone.startsWith('05') ? `966${cleanPhone.substring(1)}` : cleanPhone;

    const summaryText =
      `📄 *فاتورة مشتريات معتمدة - ${company.nameAr || 'مركز المالك للدهانات'}*\n` +
      `🔢 *رقم الفاتورة:* ${invoice.invoiceNumber}\n` +
      `🏢 *المورد:* ${invoice.supplier.nameAr}\n` +
      `📅 *التاريخ:* ${invoice.issueDate}\n` +
      `💰 *الإجمالي الكلي:* ${formatCurrency(invoice.grandTotal)} ر.س\n` +
      `💳 *المدفوع:* ${formatCurrency(invoice.amountPaid)} ر.س\n` +
      `⏳ *المتبقي للمورد:* ${formatCurrency(invoice.remainingBalance)} ر.س\n` +
      `📋 *الحالة:* ${invoice.paymentStatus === 'PAID' ? 'مسددة بالكامل' : invoice.paymentStatus === 'PARTIALLY_PAID' ? 'مسددة جزئياً' : 'غير مسددة'}`;

    if (supplierPhone) {
      window.open(`https://wa.me/${supplierPhone}?text=${encodeURIComponent(summaryText)}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(summaryText)}`, '_blank');
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `فاتورة مشتريات ${invoice.invoiceNumber}`,
          text: `فاتورة مشتريات رقم ${invoice.invoiceNumber} من المورد ${invoice.supplier.nameAr} بمبلغ ${formatCurrency(invoice.grandTotal)} ر.س`,
        });
      } catch {
        // ignore
      }
    } else {
      handleDownloadPdf();
    }
  };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Action Toolbar */}
      <div className="no-print bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              title="Back"
            >
              <ArrowRight className={`w-4 h-4 ${isRtl ? '' : 'rotate-180'}`} />
            </button>
          )}
          <div>
            <span className="font-mono text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-md">
              {invoice.invoiceNumber}
            </span>
            <span className="text-xs text-slate-500 font-medium mr-2 ml-2">
              {invoice.supplier.nameAr}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onEdit}
            className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition inline-flex items-center gap-1.5"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>{isRtl ? 'تعديل الفاتورة' : 'Edit'}</span>
          </button>

          <button
            type="button"
            onClick={handleNativeShare}
            className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition inline-flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{isRtl ? 'مشاركة' : 'Share'}</span>
          </button>

          <button
            type="button"
            onClick={handleWhatsAppSend}
            className="px-3.5 py-1.5 text-xs font-bold bg-[#25D366] hover:bg-[#20ba59] active:bg-[#1caa4f] text-white rounded-xl transition inline-flex items-center gap-1.5 shadow-xs"
          >
            <WhatsAppIcon className="w-4 h-4 text-white" />
            <span>{isRtl ? 'إرسال للمورد عبر واتساب' : 'WhatsApp'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-1.5 text-xs font-bold bg-slate-900 hover:bg-black text-white rounded-xl transition inline-flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isRtl ? 'طباعة A4' : 'Print'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="px-4 py-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl transition inline-flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? (isRtl ? 'جاري التصدير...' : 'Exporting...') : (isRtl ? 'تحميل PDF' : 'Download PDF')}</span>
          </button>
        </div>
      </div>

      {/* Mobile Screen Fit & Zoom Toolbar */}
      <div
        className="no-print bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs shadow-2xs"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center gap-2 text-slate-700">
          <span className="p-1 rounded bg-emerald-100 text-emerald-800">
            <Smartphone className="w-3.5 h-3.5" />
          </span>
          <span className="font-semibold text-slate-800 text-[11px] sm:text-xs">
            {isRtl ? 'عرض ورقة المشتريات A4:' : 'Purchase Sheet A4:'}
          </span>
          <span className="font-bold text-emerald-800 font-mono text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {zoomMode === 'fit'
              ? (isRtl ? `ملاءمة للشاشة (${Math.round(currentScale * 100)}%)` : `Fit Screen (${Math.round(currentScale * 100)}%)`)
              : `${Math.round(currentScale * 100)}%`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleTakeScreenshot}
            disabled={isCapturingScreenshot}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-50"
            title={isRtl ? 'التقاط صورة للفاتورة' : 'Screenshot'}
          >
            {isCapturingScreenshot ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="w-3 h-3" />
            )}
            <span>{isCapturingScreenshot ? (isRtl ? 'جاري التقاط...' : 'Capturing...') : (isRtl ? 'لقطة شاشة' : 'Screenshot')}</span>
          </button>

          <button
            type="button"
            onClick={() => setZoomMode('fit')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
              zoomMode === 'fit'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            <Maximize2 className="w-3 h-3" />
            <span>{isRtl ? 'ملاءمة للشاشة' : 'Fit Screen'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setZoomMode('actual');
              setCustomZoom(1);
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
              zoomMode === 'actual' || (zoomMode === 'custom' && customZoom === 1)
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            <span>100%</span>
          </button>

          <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setZoomMode('custom');
                setCustomZoom((prev) => Math.max(0.3, Number((prev - 0.1).toFixed(2))));
              }}
              className="p-1.5 hover:bg-slate-100 text-slate-700 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[10px] font-mono font-bold text-slate-600 select-none">
              {Math.round(currentScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => {
                setZoomMode('custom');
                setCustomZoom((prev) => Math.min(2.0, Number((prev + 0.1).toFixed(2))));
              }}
              className="p-1.5 hover:bg-slate-100 text-slate-700 transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {screenshotSuccess && (
        <div className="no-print p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{isRtl ? 'تم التقاط صورة الفاتورة وحفظها بنجاح!' : 'Invoice screenshot saved successfully!'}</span>
        </div>
      )}

      {/* A4 Sheet Container with responsive transform scaling */}
      <div
        ref={containerRef}
        className="w-full flex justify-center overflow-x-auto pb-12 transition-all"
      >
        <div
          style={{
            width: `${Math.round(A4_SHEET_WIDTH * currentScale)}px`,
            height: `${Math.round(sheetHeight * currentScale)}px`,
            position: 'relative',
            margin: '0 auto',
            transition: 'width 0.15s ease-out, height 0.15s ease-out',
          }}
        >
          <div
            id="printable-purchase-invoice-container"
            ref={(node) => {
              (printContainerRef as any).current = node;
              (sheetRef as any).current = node;
            }}
            className="print-invoice-sheet bg-white border border-slate-300 shadow-xl p-8 sm:p-12 w-full text-slate-900 flex flex-col justify-between font-sans relative overflow-hidden"
            style={{
              width: `${A4_SHEET_WIDTH}px`,
              minHeight: '1100px',
              transform: `scale(${currentScale})`,
              transformOrigin: 'top left',
              position: 'absolute',
              top: 0,
              left: 0,
              boxSizing: 'border-box',
            }}
          >
          {/* Watermark for Cancelled or Draft */}
          {invoice.status === 'CANCELLED' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
              <span className="text-red-500/20 text-7xl sm:text-8xl font-black rotate-[-25deg] border-8 border-red-500/20 px-8 py-3 rounded-3xl">
                مـلـغـاة - CANCELLED
              </span>
            </div>
          )}

          {invoice.status === 'DRAFT' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
              <span className="text-amber-500/15 text-7xl sm:text-8xl font-black rotate-[-25deg] border-8 border-amber-500/15 px-8 py-3 rounded-3xl">
                مـسـودة - DRAFT
              </span>
            </div>
          )}

          <div>
            {/* Header: Company Info + Purchase Invoice Title */}
            <div className="border-b-2 border-emerald-800 pb-6 mb-6">
              <div className="flex items-start justify-between gap-4">
                {/* Left (or Right in RTL): Company details */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-8 bg-emerald-700 rounded-sm inline-block"></span>
                    <h1 className="text-xl sm:text-2xl font-black text-emerald-950">
                      {company.nameAr || 'مركز المالك للدهانات'}
                    </h1>
                  </div>
                  <h2 className="text-xs font-bold text-slate-600 tracking-wider">
                    {company.nameEn || 'MARKAZ AL MALKI PAINT'}
                  </h2>
                  <p className="text-[11px] text-slate-500 max-w-sm">
                    {company.streetAr} - {company.cityAr} - {company.countryAr}
                  </p>
                  <div className="pt-1 text-[11px] text-slate-700 flex flex-wrap gap-x-4 font-medium">
                    <span>
                      <strong className="text-slate-900">الرقم الضريبي للمنشأة:</strong>{' '}
                      <span className="font-mono font-bold text-emerald-800">{company.vatNumber || '300123456700003'}</span>
                    </span>
                    <span>
                      <strong className="text-slate-900">س.ت:</strong>{' '}
                      <span className="font-mono">{company.crNumber || '1010456789'}</span>
                    </span>
                  </div>
                </div>

                {/* Right: Purchase Invoice Stamp & Badge */}
                <div className="text-right space-y-2">
                  <div className="bg-emerald-800 text-white px-4 py-2 rounded-xl text-center shadow-xs">
                    <span className="block text-xs font-black tracking-wider">فاتورة مشتريات مواد دهان</span>
                    <span className="block text-[9px] text-emerald-200 tracking-widest font-mono">
                      TAX PURCHASE INVOICE
                    </span>
                  </div>
                  <div className="text-[11px] space-y-0.5 text-right font-medium">
                    <div>
                      <span className="text-slate-500">رقم الفاتورة:</span>{' '}
                      <strong className="font-mono text-emerald-900 text-xs">{invoice.invoiceNumber}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">تاريخ الشراء:</span>{' '}
                      <strong className="font-mono text-slate-800">{invoice.issueDate}</strong>
                    </div>
                    {invoice.supplierInvoiceNumber && (
                      <div>
                        <span className="text-slate-500">فاتورة المورد:</span>{' '}
                        <strong className="font-mono text-slate-800">{invoice.supplierInvoiceNumber}</strong>
                      </div>
                    )}
                    {invoice.purchaseOrderNumber && (
                      <div>
                        <span className="text-slate-500">أمر الشراء:</span>{' '}
                        <strong className="font-mono text-slate-800">{invoice.purchaseOrderNumber}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Supplier & Purchaser Info Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Supplier Info */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold border-b border-slate-200 pb-1">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>بيانات المورد (Supplier Details)</span>
                </div>
                <div className="font-extrabold text-slate-900 text-sm">
                  {invoice.supplier.nameAr}
                </div>
                {invoice.supplier.nameEn && (
                  <div className="text-[10px] text-slate-500 font-medium">
                    {invoice.supplier.nameEn}
                  </div>
                )}
                {invoice.supplier.vatNumber && (
                  <div className="text-[11px]">
                    <span className="text-slate-500">الرقم الضريبي للمورد: </span>
                    <strong className="font-mono text-slate-800">{invoice.supplier.vatNumber}</strong>
                  </div>
                )}
                {invoice.supplier.phone && (
                  <div className="text-[11px]">
                    <span className="text-slate-500">هاتف المورد: </span>
                    <span className="font-mono" dir="ltr">{invoice.supplier.phone}</span>
                  </div>
                )}
                {invoice.supplier.addressAr && (
                  <div className="text-[11px] text-slate-600">
                    {invoice.supplier.addressAr}
                  </div>
                )}
              </div>

              {/* Purchaser Info & Payment Terms */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold border-b border-slate-200 pb-1">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>شروط الدفع والتسليم (Payment & Delivery)</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">طريقة السداد:</span>
                  <span className="font-bold text-slate-800">
                    {invoice.paymentMethod === 'BANK_TRANSFER'
                      ? 'تحويل بنكي (Bank Transfer)'
                      : invoice.paymentMethod === 'CASH'
                      ? 'نقدي (Cash)'
                      : invoice.paymentMethod === 'CREDIT'
                      ? 'آجل / على الحساب (Credit)'
                      : 'أخرى (Other)'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">حالة السداد:</span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      invoice.paymentStatus === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : invoice.paymentStatus === 'PARTIALLY_PAID'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {invoice.paymentStatus === 'PAID'
                      ? 'مسددة بالكامل'
                      : invoice.paymentStatus === 'PARTIALLY_PAID'
                      ? 'مسددة جزئياً'
                      : 'غير مسددة (آجل)'}
                  </span>
                </div>
                {invoice.dueDate && (
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">تاريخ الاستحقاق:</span>
                    <strong className="font-mono text-slate-800">{invoice.dueDate}</strong>
                  </div>
                )}
                {invoice.internalReference && (
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">المستودع / المرجع:</span>
                    <span className="font-medium text-slate-700">{invoice.internalReference}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table with Exact Proportions and No Text Overflow */}
            <div className="mb-6 border-2 border-emerald-900 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full table-fixed text-right text-xs border-collapse" dir="rtl">
                <thead>
                  <tr className="bg-emerald-900 text-white font-black text-center">
                    <th className="w-[5%] py-2.5 px-1 border-l border-emerald-800">#</th>
                    <th className="w-[36%] py-2.5 px-3 border-l border-emerald-800 text-right">
                      <div className="text-xs sm:text-sm">وصف المواد / الأصناف</div>
                      <div className="text-[10px] font-normal text-emerald-200">Item Description</div>
                    </th>
                    <th className="w-[8%] py-2.5 px-1 border-l border-emerald-800">
                      <div className="text-xs">الوحدة</div>
                      <div className="text-[9px] font-normal text-emerald-200">Unit</div>
                    </th>
                    <th className="w-[8%] py-2.5 px-1 border-l border-emerald-800">
                      <div className="text-xs">الكمية</div>
                      <div className="text-[9px] font-normal text-emerald-200">Qty</div>
                    </th>
                    <th className="w-[11%] py-2.5 px-1 border-l border-emerald-800">
                      <div className="text-xs">سعر الوحدة</div>
                      <div className="text-[9px] font-normal text-emerald-200">Unit Price</div>
                    </th>
                    <th className="w-[8%] py-2.5 px-1 border-l border-emerald-800">
                      <div className="text-xs">الخصم</div>
                      <div className="text-[9px] font-normal text-emerald-200">Disc</div>
                    </th>
                    <th className="w-[10%] py-2.5 px-1 border-l border-emerald-800">
                      <div className="text-xs">الضريبة 15%</div>
                      <div className="text-[9px] font-normal text-emerald-200">VAT</div>
                    </th>
                    <th className="w-[14%] py-2.5 px-1 text-center">
                      <div className="text-xs sm:text-sm">الإجمالي</div>
                      <div className="text-[10px] font-normal text-emerald-200">Total (SAR)</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invoice.items.map((it, idx) => (
                    <tr key={it.id || idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                      <td className="w-[5%] py-2.5 px-1 text-center font-mono text-slate-500 font-bold border-l border-slate-200 align-middle">
                        {idx + 1}
                      </td>
                      <td className="w-[36%] py-2.5 px-3 border-l border-slate-200 text-right align-middle">
                        <div className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug break-words">
                          {it.nameAr}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] mt-0.5">
                          {it.nameEn && <span className="text-slate-500 font-medium" dir="ltr">{it.nameEn}</span>}
                          {it.code && (
                            <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 text-[9px]">
                              #{it.code}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="w-[8%] py-2.5 px-1 text-center text-slate-700 font-bold border-l border-slate-200 text-xs align-middle">
                        {it.unitAr || it.unit}
                      </td>
                      <td className="w-[8%] py-2.5 px-1 text-center font-mono font-black text-slate-900 border-l border-slate-200 text-xs sm:text-sm align-middle">
                        {it.quantity}
                      </td>
                      <td className="w-[11%] py-2.5 px-1 text-center font-mono font-bold text-slate-800 border-l border-slate-200 text-xs align-middle">
                        {formatCurrency(it.unitPrice)}
                      </td>
                      <td className="w-[8%] py-2.5 px-1 text-center font-mono text-rose-600 border-l border-slate-200 text-xs align-middle">
                        {it.discountAmount > 0 ? `-${formatCurrency(it.discountAmount)}` : '-'}
                      </td>
                      <td className="w-[10%] py-2.5 px-1 text-center font-mono font-bold text-emerald-800 border-l border-slate-200 text-xs align-middle">
                        {formatCurrency(it.vatAmount)}
                      </td>
                      <td className="w-[14%] py-2.5 px-1 text-center font-mono font-black text-slate-900 border-l border-slate-200 text-xs sm:text-sm align-middle">
                        {formatCurrency(it.subtotalWithVat)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary & Payment Breakdown */}
            <div className="grid grid-cols-12 gap-6 mb-8">
              {/* Left/Middle: Notes & Payment details */}
              <div className="col-span-7 space-y-3">
                {invoice.notesAr && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <strong className="text-slate-800 block text-[11px]">ملاحظات الفاتورة والتوريد:</strong>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{invoice.notesAr}</p>
                  </div>
                )}

                {/* Payments History Box */}
                {invoice.payments && invoice.payments.length > 0 && (
                  <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs space-y-1.5">
                    <strong className="text-emerald-950 block text-[11px] font-bold">
                      سجل الدفعات المسددة للمورد:
                    </strong>
                    <div className="space-y-1 text-[11px]">
                      {invoice.payments.map((p, pIdx) => (
                        <div key={p.id || pIdx} className="flex justify-between items-center text-slate-700">
                          <span>
                            {p.date} - {p.notes || 'سداد دفعة'}
                          </span>
                          <span className="font-mono font-bold text-emerald-900">
                            {formatCurrency(p.amount)} ر.س
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Totals Box */}
              <div className="col-span-5 bg-slate-50 border border-slate-300 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>المجموع الخاضع للضريبة:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatCurrency(invoice.taxableAmount)} ر.س
                  </span>
                </div>

                {invoice.totalDiscount > 0 && (
                  <div className="flex justify-between items-center text-amber-700">
                    <span>إجمالي الخصم:</span>
                    <span className="font-mono font-bold">- {formatCurrency(invoice.totalDiscount)} ر.س</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-emerald-800 border-b border-slate-200 pb-2">
                  <span className="font-bold">ضريبة القيمة المضافة (15%):</span>
                  <span className="font-mono font-extrabold">+ {formatCurrency(invoice.totalVat)} ر.س</span>
                </div>

                <div className="flex justify-between items-center pt-1 text-slate-900 font-extrabold text-sm">
                  <span>إجمالي الفاتورة المطلوب:</span>
                  <span className="font-mono font-black text-emerald-800 text-base">
                    {formatCurrency(invoice.grandTotal)} ر.س
                  </span>
                </div>

                {/* Paid & Remaining */}
                <div className="border-t border-slate-200 pt-2 space-y-1 text-[11px]">
                  <div className="flex justify-between items-center text-slate-700">
                    <span>المبلغ المسدد للمورد:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {formatCurrency(invoice.amountPaid)} ر.س
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">المتبقي للمورد بذمتنا:</span>
                    <span
                      className={`font-mono font-black ${
                        invoice.remainingBalance > 0 ? 'text-rose-600 text-xs' : 'text-emerald-700'
                      }`}
                    >
                      {formatCurrency(invoice.remainingBalance)} ر.س
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Signatures & Footer Area */}
          <div className="border-t border-slate-300 pt-6 mt-6">
            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-10">
                <span className="font-bold text-slate-700 block">أمين المستودع / المستلم</span>
                <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
                <span className="text-[10px] text-slate-400">التوقيع والتاريخ</span>
              </div>

              <div className="space-y-10">
                <span className="font-bold text-slate-700 block">المحاسب المعتمد / الإدارة</span>
                <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
                <span className="text-[10px] text-slate-400">الختم والاعتماد</span>
              </div>

              <div className="space-y-10">
                <span className="font-bold text-slate-700 block">مندوب / سائق المورد</span>
                <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
                <span className="text-[10px] text-slate-400">توقيع تسليم المواد</span>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400 pt-6">
              تم إصدار هذه الفاتورة عبر نظام مركز المالك للدهانات - متطابق مع ضريبة القيمة المضافة 15% بالمملكة العربية السعودية
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};
