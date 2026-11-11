import React, { useState, useEffect, useRef } from 'react';
import { Invoice } from '../types';
import { formatCurrency } from '../utils/vatCalculations';
import { InvoiceBarcode } from './InvoiceBarcode';
import { InvoiceQrCode } from './InvoiceQrCode';
import { ZatcaValidatorModal } from './ZatcaValidatorModal';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import { SmsShareModal } from './SmsShareModal';
import { WhatsAppIcon } from './WhatsAppIcon';
import {
  Printer,
  Download,
  Share2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Smartphone,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Camera,
  Stamp,
  Trash2,
  X,
} from 'lucide-react';
import { downloadInvoicePdf, printInvoice, shareInvoice, captureInvoiceScreenshot } from '../utils/pdfGenerator';
import { Language, translations } from '../utils/translations';
import { storage } from '../utils/storage';

interface InvoicePreviewProps {
  invoice: Invoice;
  onEdit?: () => void;
  onDelete?: () => void;
  showToolbar?: boolean;
  showZoomBar?: boolean;
  lang?: Language;
  onPrint?: () => void;
  containerId?: string;
  defaultZoomMode?: 'fit' | 'actual' | 'custom';
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  invoice,
  onEdit,
  onDelete,
  showToolbar = true,
  showZoomBar = true,
  lang = 'ar',
  onPrint,
  containerId = 'printable-invoice-container',
  defaultZoomMode = 'fit',
}) => {
  const [isZatcaModalOpen, setIsZatcaModalOpen] = useState(false);
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [screenshotSuccess, setScreenshotSuccess] = useState(false);
  const [zoomMode, setZoomMode] = useState<'fit' | 'actual' | 'custom'>(defaultZoomMode);
  const [customZoom, setCustomZoom] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(850);
  const [sheetHeight, setSheetHeight] = useState<number>(1150);

  const t = translations[lang].preview;
  const isRtl = lang === 'ar';
  const { company, customer, items } = invoice;

  // Resolve effective company watermark settings
  const currentCompany = storage.getCompany();
  const effectiveCompany = {
    ...currentCompany,
    ...(company || {}),
    enableInvoiceWatermark:
      currentCompany.enableInvoiceWatermark ??
      company?.enableInvoiceWatermark ??
      true,
    watermarkType:
      currentCompany.watermarkType ||
      company?.watermarkType ||
      'AUTO',
  };

  const [watermarkOverride, setWatermarkOverride] = useState<boolean | null>(null);
  const isWatermarkActive =
    watermarkOverride !== null ? watermarkOverride : !!effectiveCompany.enableInvoiceWatermark;
  const activeWatermarkType = effectiveCompany.watermarkType || 'AUTO';

  const getWatermarkDetails = () => {
    if (!isWatermarkActive) {
      return { show: false, type: 'NONE' as const, textAr: '', textEn: '', subtext: '' };
    }

    if (activeWatermarkType === 'PAID') {
      return {
        show: true,
        type: 'PAID' as const,
        textAr: 'مـدفـوعـة',
        textEn: 'PAID IN FULL',
        subtext: 'ZATCA TAX INVOICE',
      };
    }

    if (activeWatermarkType === 'DRAFT') {
      return {
        show: true,
        type: 'DRAFT' as const,
        textAr: 'مـسـودة',
        textEn: 'DRAFT - NOT OFFICIAL',
        subtext: 'FOR REVIEW ONLY',
      };
    }

    // AUTO: Determine by invoice paymentStatus and status
    if (invoice.paymentStatus === 'PAID') {
      return {
        show: true,
        type: 'PAID' as const,
        textAr: 'مـدفـوعـة',
        textEn: 'PAID IN FULL',
        subtext: 'ZATCA TAX INVOICE',
      };
    }

    if (invoice.status === 'DRAFT') {
      return {
        show: true,
        type: 'DRAFT' as const,
        textAr: 'مـسـودة',
        textEn: 'DRAFT - NOT OFFICIAL',
        subtext: 'FOR REVIEW ONLY',
      };
    }

    if (invoice.status === 'CANCELLED') {
      return {
        show: true,
        type: 'DRAFT' as const,
        textAr: 'مـلـغـاة',
        textEn: 'CANCELLED',
        subtext: 'VOID INVOICE',
      };
    }

    return { show: false, type: 'NONE' as const, textAr: '', textEn: '', subtext: '' };
  };

  const watermark = getWatermarkDetails();

  const A4_SHEET_WIDTH = 794; // Standard A4 pixel width at 96 DPI

  useEffect(() => {
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
  // Available width accounting for minimal margins
  const availableWidth = Math.max(280, containerWidth - 16);
  // On mobile screens (<640px), keep minimum scale at 0.75 so all fields and texts remain sharp and readable
  const isSmallMobile = containerWidth < 640;
  const autoFitScale = isSmallMobile
    ? Math.max(0.75, Math.min(1, Number((availableWidth / A4_SHEET_WIDTH).toFixed(3))))
    : Math.min(1, Math.max(0.5, Number((availableWidth / A4_SHEET_WIDTH).toFixed(3))));

  let currentScale = 1;
  if (zoomMode === 'fit') {
    currentScale = autoFitScale;
  } else if (zoomMode === 'actual') {
    currentScale = 1;
  } else {
    currentScale = customZoom;
  }

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      await downloadInvoicePdf(containerId, `Invoice-${invoice.invoiceNumber}`);
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
      await captureInvoiceScreenshot(containerId, `Invoice-${invoice.invoiceNumber}`);
      setScreenshotSuccess(true);
      setTimeout(() => {
        setScreenshotSuccess(false);
      }, 5000);
    } catch (err) {
      console.error('Screenshot capture error:', err);
    } finally {
      setIsCapturingScreenshot(false);
    }
  };

  const handleShare = async () => {
    await shareInvoice(
      containerId,
      invoice.invoiceNumber,
      customer.nameAr || customer.nameEn
    );
  };

  const getStatusBadge = () => {
    switch (invoice.paymentStatus) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-md uppercase">
            <CheckCircle2 className="w-3.5 h-3.5" />
            مدفوع / PAID
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-md uppercase">
            <Clock className="w-3.5 h-3.5" />
            مدفوع جزئياً / PARTIAL
          </span>
        );
      case 'UNPAID':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-md uppercase">
            <AlertCircle className="w-3.5 h-3.5" />
            غير مدفوع / UNPAID
          </span>
        );
    }
  };

  const getPaymentMethodLabel = () => {
    switch (invoice.paymentMethod) {
      case 'CASH':
        return 'نقداً / Cash';
      case 'CARD':
        return 'مدى - بطاقة ائتمان / Mada - Card';
      case 'BANK_TRANSFER':
        return 'تحويل بنكي / Bank Transfer';
      case 'CREDIT':
        return 'آجل / Credit Account';
      default:
        return 'أخرى / Other';
    }
  };

  return (
    <div className="w-full">
      {/* Top Action Toolbar (Hidden during printing) */}
      {showToolbar && (
        <div className="no-print bg-white p-3.5 rounded-xl border border-slate-200 mb-3 shadow-xs flex flex-wrap items-center justify-between gap-3" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">
              {t.previewTitle} {invoice.invoiceNumber}
            </span>
            {getStatusBadge()}
            {invoice.status === 'DRAFT' && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium rounded">
                DRAFT / مسودة
              </span>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="px-3.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition"
              >
                {t.editInvoiceBtn}
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-3.5 py-1.5 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
                title={isRtl ? 'حذف هذه الفاتورة نهائياً' : 'Delete this invoice'}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>{isRtl ? 'حذف الفاتورة' : 'Delete Invoice'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsZatcaModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition"
            >
              {t.checkZatcaBtn}
            </button>

            {/* Quick Watermark Toggle */}
            <button
              type="button"
              onClick={() => {
                setWatermarkOverride(!isWatermarkActive);
              }}
              title={isRtl ? 'تبديل إظهار الختم المائي (مدفوعة / مسودة) على الفاتورة وملف الـ PDF' : 'Toggle Watermark on Invoice & PDF'}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition inline-flex items-center gap-1.5 ${
                watermark.show
                  ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200'
              }`}
            >
              <Stamp className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                {watermark.show
                  ? (isRtl ? `ختم مائي: ${watermark.textAr}` : `Watermark: ${watermark.textEn}`)
                  : (isRtl ? 'الختم المائي: معطل' : 'Watermark: Off')}
              </span>
            </button>

            <button
              type="button"
              onClick={handleTakeScreenshot}
              disabled={isCapturingScreenshot}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
              title={isRtl ? 'التقاط لقطة شاشة لمنطقة الفاتورة فقط وحفظها كصورة' : 'Take screenshot of invoice area only'}
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
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition inline-flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              {t.shareBtn}
            </button>

            <button
              type="button"
              onClick={() => setIsSmsModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-bold bg-blue-900 hover:bg-blue-950 active:bg-slate-900 text-white rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
              title={isRtl ? 'إرسال الفاتورة عبر رسالة SMS لشريحة العميل باسم Markaz Al Malk Paint وبدون إظهار رقمك الشخصي' : 'Send invoice via SMS to customer SIM as Markaz Al Malk Paint'}
            >
              <Smartphone className="w-4 h-4 text-blue-200" />
              <span>{t.sendSmsBtn || 'إرسال SMS (Markaz Al Malk)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-bold bg-[#25D366] hover:bg-[#20ba59] active:bg-[#1caa4f] text-white rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
              title={isRtl ? 'إرسال الفاتورة كمستند PDF عبر Meta WhatsApp Business API' : 'Send invoice PDF as document via Meta WhatsApp Business API'}
            >
              <WhatsAppIcon className="w-4 h-4 text-white" />
              <span>{isRtl ? 'إرسال عبر واتساب (Meta API)' : 'Send via WhatsApp'}</span>
            </button>

            <button
              type="button"
              onClick={onPrint ? onPrint : printInvoice}
              className="px-3.5 py-1.5 text-xs font-bold bg-slate-900 hover:bg-black text-white rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              {t.printBtn}
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting ? t.generatingPdf : t.downloadPdfBtn}
            </button>
          </div>
        </div>
      )}

      {/* Screen Zoom & Android Fit Toolbar */}
      {showZoomBar && (
        <div
          className="no-print bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 mb-3.5 flex flex-wrap items-center justify-between gap-2 text-xs shadow-2xs"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <div className="flex items-center gap-2 text-slate-700">
            <span className="p-1 rounded bg-blue-100 text-blue-700">
              <Smartphone className="w-3.5 h-3.5" />
            </span>
            <span className="font-semibold text-slate-800 text-[11px] sm:text-xs">
              {isRtl ? 'عرض الورقة A4 المقاس الكامل:' : 'Full Sheet A4 View:'}
            </span>
            <span className="font-bold text-blue-700 font-mono text-[11px] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {zoomMode === 'fit'
                ? (isRtl ? `ملاءمة للشاشة (${Math.round(currentScale * 100)}%)` : `Fit Screen (${Math.round(currentScale * 100)}%)`)
                : `${Math.round(currentScale * 100)}%`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Take Screenshot of Invoice Area Button */}
            <button
              type="button"
              onClick={handleTakeScreenshot}
              disabled={isCapturingScreenshot}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-50 active:scale-95"
              title={isRtl ? 'التقاط لقطة شاشة لمنطقة الفاتورة فقط وحفظها كصورة' : 'Take screenshot of invoice sheet only and save as image'}
            >
              {isCapturingScreenshot ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
              <span>
                {isCapturingScreenshot
                  ? (isRtl ? 'جاري الالتقاط...' : 'Capturing...')
                  : (isRtl ? 'التقاط صورة (Screenshot)' : 'Take Screenshot')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setZoomMode('fit')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                zoomMode === 'fit'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
              title={isRtl ? 'ملاءمة كامل الورقة لشاشة الجوال مثل ملف PDF بعد التنزيل' : 'Fit page to mobile screen like downloaded PDF'}
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
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
              title={isRtl ? 'الحجم الأصلي 100%' : '100% Actual Size'}
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
                title={isRtl ? 'تصغير' : 'Zoom Out'}
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
                title={isRtl ? 'تكبير' : 'Zoom In'}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification on Screenshot Success */}
      {screenshotSuccess && (
        <div
          className="no-print mb-3.5 px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between gap-2 shadow-xs"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">
              {isRtl
                ? 'تم التقاط لقطة شاشة لمنطقة الفاتورة فقط بنجاح وتنزيلها كصورة عالية الدقة (PNG)!'
                : 'Invoice area screenshot captured successfully and downloaded as high-res PNG!'}
            </span>
          </div>
          <span className="text-[11px] text-emerald-700 font-mono font-semibold bg-emerald-100/60 px-2 py-0.5 rounded">
            Invoice-{invoice.invoiceNumber}.png
          </span>
        </div>
      )}

      {/* Main Invoice Sheet Container (Responsively Scaled for Android / Mobile & Desktop) */}
      <div
        ref={containerRef}
        className="w-full flex justify-center overflow-x-auto pb-4 transition-all"
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
            ref={sheetRef}
            id={containerId}
            className="print-invoice-sheet bg-white border border-slate-300 shadow-md p-6 sm:p-8 rounded-sm text-slate-900 relative overflow-hidden"
            style={{
              width: `${A4_SHEET_WIDTH}px`,
              minHeight: '1120px',
              transform: `scale(${currentScale})`,
              transformOrigin: 'top left',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          >
          {/* Watermark Stamp Overlay (Paid / Draft) - Captured in Canvas & PDF */}
          {watermark.show && (
            <div
              className="pointer-events-none select-none absolute inset-x-0 z-20 flex items-center justify-center overflow-hidden"
              style={{
                top: '48%',
                transform: 'translateY(-50%)',
              }}
            >
              <div
                className={`transform -rotate-25 rounded-3xl border-6 border-dashed px-14 py-6 text-center shadow-2xs select-none backdrop-blur-[0.5px] ${
                  watermark.type === 'PAID'
                    ? 'border-emerald-600/35 bg-emerald-500/5 text-emerald-700/35'
                    : 'border-slate-500/30 bg-slate-500/5 text-slate-600/30'
                }`}
                style={{
                  letterSpacing: '0.15em',
                  minWidth: '400px',
                }}
              >
                <div className="font-black text-6xl leading-tight font-sans" dir="rtl">
                  {watermark.textAr}
                </div>
                <div className="font-extrabold text-2xl tracking-widest uppercase mt-1 font-mono">
                  {watermark.textEn}
                </div>
                {watermark.subtext && (
                  <div className="text-[10px] font-bold tracking-widest uppercase mt-1 text-slate-500/30 font-mono">
                    {watermark.subtext}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TOP SECTION: Header with Dual Language Branding */}
          <div className="border-b-2 border-slate-800 pb-4 mb-4">
            <div className="grid grid-cols-12 gap-3 items-center">
              {/* Left Column: English Details */}
              <div className="col-span-4 text-left text-xs leading-normal text-slate-700" dir="ltr">
                <h2 className="font-black text-sm sm:text-base text-slate-900 uppercase">
                  {company.nameEn || 'King Paints Center'}
                </h2>
                <p className="mt-0.5 text-slate-600 font-medium">{company.streetEn}, {company.districtEn}</p>
                <p className="text-slate-600 font-medium">{company.cityEn}, {company.countryEn}</p>
                <div className="mt-1 font-mono text-[11px] space-y-0.5">
                  <p><span className="text-slate-500 font-sans">CR No:</span> <strong className="font-mono text-slate-900">{company.crNumber}</strong></p>
                  <p><span className="text-slate-500 font-sans">VAT No:</span> <strong className="font-mono text-blue-900">{company.vatNumber}</strong></p>
                  {!company.hidePhoneOnInvoice && company.phone && <p><span className="text-slate-500 font-sans">Tel:</span> <span className="font-mono">{company.phone}</span></p>}
                </div>
              </div>

              {/* Center Column: Logo & Official Title */}
              <div className="col-span-4 flex flex-col items-center justify-center text-center px-1">
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt={company.nameAr}
                    className="max-h-14 max-w-[140px] object-contain mb-1.5"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-blue-900 text-white flex items-center justify-center font-black text-xl mb-1.5 shadow-xs">
                    MK
                  </div>
                )}
                <div className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-center w-full max-w-[250px] shadow-sm">
                  <h1
                    className="font-bold text-lg sm:text-xl text-white leading-normal tracking-normal"
                    dir="rtl"
                    lang="ar"
                    style={{ letterSpacing: 0, wordSpacing: 'normal' }}
                  >
                    فاتورة ضريبية مبسطة
                  </h1>
                  <p className="text-[11px] uppercase font-bold text-slate-200 mt-0.5 tracking-wider font-sans" dir="ltr">
                    SIMPLIFIED TAX INVOICE
                  </p>
                </div>
              </div>

              {/* Right Column: Arabic Details */}
              <div className="col-span-4 text-right text-xs leading-normal text-slate-800" dir="rtl" lang="ar" style={{ letterSpacing: 0 }}>
                <h2
                  className="font-bold text-lg sm:text-xl text-slate-900 leading-normal tracking-normal mb-1"
                  dir="rtl"
                  lang="ar"
                  style={{ letterSpacing: 0, wordSpacing: 'normal' }}
                >
                  {company.nameAr || 'مركز الملك للدهانات'}
                </h2>
                <p className="mt-0.5 text-slate-600 font-medium">{company.streetAr}، {company.districtAr}</p>
                <p className="text-slate-600 font-medium">{company.cityAr}، {company.countryAr}</p>
                <div className="mt-1 font-mono text-[11px] space-y-0.5">
                  <p><span className="text-slate-500 font-sans">سجل تجاري:</span> <strong className="font-mono text-slate-900">{company.crNumber}</strong></p>
                  <p><span className="text-slate-500 font-sans">الرقم الضريبي:</span> <strong className="font-mono text-blue-900">{company.vatNumber}</strong></p>
                  {!company.hidePhoneOnInvoice && company.phone && <p><span className="text-slate-500 font-sans">هاتف:</span> <span className="font-mono">{company.phone}</span></p>}
                </div>
              </div>
            </div>
          </div>

          {/* METADATA STRIP & CODES: Invoice Info + Barcode + ZATCA QR Code */}
          <div className="grid grid-cols-12 gap-3 p-4 bg-slate-50/90 rounded-xl border border-slate-300 mb-4 items-center">
            {/* QR Code Column */}
            <div className="col-span-3 flex flex-col items-center justify-center">
              <InvoiceQrCode
                value={invoice.zatcaQrBase64 || ''}
                size={120}
                onInspect={() => setIsZatcaModalOpen(true)}
                showInspectButton={true}
              />
              <span className="text-[10px] text-slate-600 mt-1 font-mono font-bold text-center">
                ZATCA E-Invoice QR
              </span>
            </div>

            {/* Central Details Grid */}
            <div className="col-span-6 grid grid-cols-2 gap-3 text-xs sm:text-sm border-x border-slate-200 px-3">
              <div className="space-y-2" dir="rtl">
                <div>
                  <span className="text-slate-500 block text-xs font-bold">تاريخ الإصدار / Issue Date</span>
                  <span className="font-black text-slate-900 font-mono text-sm sm:text-base">
                    {invoice.issueDate}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs font-bold">طريقة التسعير / Pricing Mode</span>
                  <span className="inline-block px-2 py-0.5 rounded-md text-xs font-black bg-blue-100 text-blue-900 border border-blue-200">
                    {invoice.pricingMode === 'INCLUSIVE'
                      ? 'شامل الضريبة (Mode A)'
                      : 'غير شامل الضريبة (Mode B)'}
                  </span>
                </div>
              </div>

              <div className="space-y-2" dir="rtl">
                <div>
                  <span className="text-slate-500 block text-xs font-bold">طريقة الدفع / Payment Method</span>
                  <span className="font-extrabold text-slate-900 text-xs sm:text-sm">{getPaymentMethodLabel()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs font-bold">حالة السداد / Payment Status</span>
                  {getStatusBadge()}
                </div>
              </div>
            </div>

            {/* Barcode & Number Column */}
            <div className="col-span-3 flex flex-col items-center justify-center text-center">
              <span className="text-xs text-slate-600 uppercase font-bold">
                رقم الفاتورة / Invoice No.
              </span>
              <span className="font-black text-base sm:text-lg font-mono text-slate-900 tracking-wider">
                {invoice.invoiceNumber}
              </span>
              <InvoiceBarcode value={invoice.invoiceNumber} height={36} displayValue={false} className="mt-1" />
            </div>
          </div>

          {/* CUSTOMER INFORMATION BAR (PROMINENT & CLEAR) */}
          <div className="px-4 py-3 border border-slate-300 rounded-xl bg-slate-50/80 mb-4 text-xs sm:text-sm" dir="rtl">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-black text-blue-950 text-sm">بيانات العميل / Customer:</span>
                <span className="font-black text-slate-900 text-base sm:text-lg">
                  {customer.nameAr}
                </span>
                {customer.nameEn && (
                  <span className="text-slate-600 font-bold text-xs" dir="ltr">
                    ({customer.nameEn})
                  </span>
                )}
                {customer.id && (
                  <span className="text-xs text-slate-400 font-mono font-bold">#{customer.id.slice(0, 8)}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-800 text-xs sm:text-sm">
                {customer.phone && (
                  <span>
                    <span className="text-slate-500 font-bold">الجوال:</span>{' '}
                    <strong className="font-mono font-black text-slate-900">{customer.phone}</strong>
                  </span>
                )}
                {customer.vatNumber && (
                  <span>
                    <span className="text-slate-500 font-bold">الرقم الضريبي:</span>{' '}
                    <strong className="font-mono font-black text-blue-900">{customer.vatNumber}</strong>
                  </span>
                )}
                {(customer.addressAr || customer.cityAr) && (
                  <span>
                    <span className="text-slate-500 font-bold">العنوان:</span>{' '}
                    <strong className="font-semibold text-slate-900">{customer.addressAr || ''} {customer.cityAr || ''}</strong>
                  </span>
                )}
              </div>
            </div>
            {invoice.deliveryAddressAr && (
              <div className="text-blue-900 bg-blue-100/70 border border-blue-200 px-2.5 py-1 rounded-md mt-2 text-xs inline-flex items-center gap-1.5 font-bold">
                <span>موقع التوصيل:</span> <span>{invoice.deliveryAddressAr}</span>
              </div>
            )}
          </div>

          {/* LINE ITEMS TABLE */}
          <div className="border-2 border-slate-300 rounded-xl overflow-hidden mb-4 shadow-2xs">
            <table className="w-full table-fixed text-right text-xs border-collapse" dir="rtl">
              <thead className="bg-slate-100 text-slate-900 font-black border-b-2 border-slate-300">
                <tr>
                  <th className="w-[5%] py-2.5 px-1 text-center border-l border-slate-200">#</th>
                  <th className="w-[35%] py-2.5 px-3 border-l border-slate-200 text-right">
                    <div className="text-xs sm:text-sm font-black">وصف السلعة أو الخدمة</div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase">Item Description</div>
                  </th>
                  <th className="w-[7%] py-2.5 px-1 text-center border-l border-slate-200">
                    <div className="text-xs sm:text-sm font-black">الكمية</div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase">Qty</div>
                  </th>
                  <th className="w-[8%] py-2.5 px-1 text-center border-l border-slate-200">
                    <div className="text-xs sm:text-sm font-black">الوحدة</div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase">Unit</div>
                  </th>
                  <th className="w-[11%] py-2.5 px-1 text-center border-l border-slate-200">
                    <div className="text-xs sm:text-sm font-black">سعر الوحدة</div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase">Unit Price</div>
                  </th>
                  <th className="w-[7%] py-2.5 px-1 text-center border-l border-slate-200">
                    <div className="text-xs sm:text-sm font-black">الخصم</div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase">Disc</div>
                  </th>
                  <th className="w-[7%] py-2.5 px-1 text-center border-l border-slate-200">
                    <div className="text-xs sm:text-sm font-black">الضريبة</div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase">VAT %</div>
                  </th>
                  <th className="w-[9%] py-2.5 px-1 text-center border-l border-slate-200">
                    <div className="text-xs sm:text-sm font-black">مبلغ الضريبة</div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase">VAT Amt</div>
                  </th>
                  <th className="w-[11%] py-2.5 px-1 text-center">
                    <div className="text-xs sm:text-sm font-black">الإجمالي</div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase">Total (SAR)</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {items.map((item, idx) => (
                  <tr key={item.id || idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                    <td className="w-[5%] py-2.5 px-1 text-center font-mono font-bold text-slate-600 border-l border-slate-200 align-middle">
                      {idx + 1}
                    </td>
                    <td className="w-[35%] py-2.5 px-3 border-l border-slate-200 text-right align-middle">
                      <div className="space-y-0.5">
                        <div className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug break-words">
                          {item.nameAr}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          {item.nameEn && (
                            <span className="text-slate-500 font-medium" dir="ltr">
                              {item.nameEn}
                            </span>
                          )}
                          {item.code && (
                            <span className="font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
                              #{item.code}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="w-[7%] py-2.5 px-1 text-center font-mono font-black text-xs sm:text-sm border-l border-slate-200 align-middle">
                      {item.quantity}
                    </td>
                    <td className="w-[8%] py-2.5 px-1 text-center font-bold text-slate-700 border-l border-slate-200 text-xs align-middle">
                      {item.unitAr || item.unitEn || 'حبة'}
                    </td>
                    <td className="w-[11%] py-2.5 px-1 text-center font-mono font-black text-slate-900 border-l border-slate-200 text-xs sm:text-sm align-middle">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="w-[7%] py-2.5 px-1 text-center font-mono font-bold text-rose-600 border-l border-slate-200 text-xs align-middle">
                      {item.discountAmount > 0 ? `-${formatCurrency(item.discountAmount)}` : '0.00'}
                    </td>
                    <td className="w-[7%] py-2.5 px-1 text-center font-mono font-bold border-l border-slate-200 text-xs align-middle">
                      {item.vatRate}%
                    </td>
                    <td className="w-[9%] py-2.5 px-1 text-center font-mono font-black text-blue-700 border-l border-slate-200 text-xs sm:text-sm align-middle">
                      {formatCurrency(item.vatAmount)}
                    </td>
                    <td className="w-[11%] py-2.5 px-1 text-center font-mono font-black text-slate-900 text-xs sm:text-sm align-middle">
                      {formatCurrency(item.subtotalWithVat)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TOTALS & FINANCIAL SUMMARY SECTION */}
          <div className="grid grid-cols-12 gap-4 mb-5 items-start">
            {/* Notes & Bank Details (Left side in RTL) */}
            <div className="col-span-12 sm:col-span-6 space-y-2.5 text-xs sm:text-sm" dir="rtl">
              {invoice.notesAr && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="font-extrabold text-slate-800 block text-xs mb-1">ملاحظات / Notes:</span>
                  <p className="text-slate-800 font-medium">{invoice.notesAr}</p>
                </div>
              )}
              {company.bankIban && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                  <span className="font-black text-blue-900 block text-xs mb-1">
                    البيانات البنكية للسداد / Bank Details for Transfer:
                  </span>
                  <p className="text-slate-800 font-semibold"><span className="text-slate-500 font-normal">البنك / Bank:</span> {company.bankName}</p>
                  <p className="font-mono font-black text-blue-900 mt-0.5"><span className="text-slate-500 font-sans font-normal">IBAN:</span> {company.bankIban}</p>
                </div>
              )}
            </div>

            {/* Calculations Breakdown (Right side in RTL) */}
            <div className="col-span-12 sm:col-span-6" dir="rtl">
              <div className="border-2 border-slate-300 rounded-xl overflow-hidden bg-slate-50/70 shadow-2xs">
                <table className="w-full text-xs sm:text-sm">
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2.5 text-slate-700 font-bold">
                        <div>الإجمالي غير شامل الضريبة</div>
                        <div className="text-[10px] text-slate-500">Total (Excluding VAT)</div>
                      </td>
                      <td className="p-2.5 text-left font-mono font-black text-sm sm:text-base text-slate-900">
                        {formatCurrency(invoice.subtotalBeforeVat)} <span className="text-xs font-normal">ر.س</span>
                      </td>
                    </tr>
                    {invoice.totalDiscount > 0 && (
                      <tr>
                        <td className="p-2.5 text-slate-700 font-bold">
                          <div>مجموع الخصومات</div>
                          <div className="text-[10px] text-slate-500">Total Discounts</div>
                        </td>
                        <td className="p-2.5 text-left font-mono font-black text-sm sm:text-base text-rose-600">
                          -{formatCurrency(invoice.totalDiscount)} <span className="text-xs font-normal">ر.س</span>
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="p-2.5 text-slate-700 font-bold">
                        <div>مجموع ضريبة القيمة المضافة (15%)</div>
                        <div className="text-[10px] text-slate-500">Total VAT (15%)</div>
                      </td>
                      <td className="p-2.5 text-left font-mono font-black text-sm sm:text-base text-blue-700">
                        {formatCurrency(invoice.totalVat)} <span className="text-xs font-normal">ر.س</span>
                      </td>
                    </tr>
                    <tr className="bg-slate-900 text-white">
                      <td className="p-3.5 font-black">
                        <div className="text-sm sm:text-base">إجمالي المبلغ المستحق</div>
                        <div className="text-xs font-semibold text-slate-300">TOTAL AMOUNT DUE</div>
                      </td>
                      <td className="p-3.5 text-left font-mono font-black text-lg sm:text-xl text-emerald-400">
                        {formatCurrency(invoice.grandTotal)} <span className="text-xs text-white">ر.س</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SIGNATURES AND STAMP SECTION */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 mb-4" dir="rtl">
            <div className="grid grid-cols-3 gap-4 text-center text-[10px] text-slate-700">
              {/* Seller Signature */}
              <div className="flex flex-col justify-between h-20 border-l border-slate-200 pl-2">
                <span className="font-bold text-slate-800">توقيع البائع / Seller Signature</span>
                <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto mb-1"></div>
                <span className="text-slate-400 text-[9px]">الموظف المسؤول</span>
              </div>

              {/* Recipient Signature */}
              <div className="flex flex-col justify-between h-20 border-l border-slate-200 pl-2">
                <span className="font-bold text-slate-800">توقيع المستلم / Recipient Signature</span>
                <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto mb-1"></div>
                <span className="text-slate-400 text-[9px]">استلمت البضاعة بحالة جيدة</span>
              </div>

              {/* Company Stamp */}
              <div className="flex flex-col justify-between h-20">
                <span className="font-bold text-slate-800">ختم المنشأة / Company Stamp</span>
                <div className="w-16 h-16 border-2 border-dashed border-blue-300 rounded-full mx-auto flex items-center justify-center text-[8px] text-blue-400 font-semibold rotate-[-12deg]">
                  ختم معتمد
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER & LEGAL DISCLAIMER */}
          <div className="border-t border-slate-200 pt-3 text-center text-[10px] text-slate-500 space-y-1">
            <p className="font-medium text-slate-700">
              {company.footerNotesAr || 'البضاعة المباعة لا ترد ولا تستبدل إلا بالفاتورة الأصلية وخلال 7 أيام.'}
            </p>
            {company.footerNotesEn && (
              <p className="text-[9px] text-slate-500 font-sans" dir="ltr">
                {company.footerNotesEn}
              </p>
            )}
            <div className="pt-2 text-[9px] text-slate-400 flex items-center justify-between border-t border-slate-100">
              <span>تم الإنشاء بواسطة: Saudi Invoice Maker Pro</span>
              <span className="font-mono">Page 1 of 1</span>
              <span>نظام الفاتورة الإلكترونية - هيئة الزكاة والضريبة والجمارك</span>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* ZATCA TLV Inspector Modal */}
      <ZatcaValidatorModal
        isOpen={isZatcaModalOpen}
        onClose={() => setIsZatcaModalOpen(false)}
        base64String={invoice.zatcaQrBase64 || ''}
      />

      {/* WhatsApp Send & Share Modal */}
      <WhatsAppShareModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        invoice={invoice}
        lang={lang}
        containerId={containerId}
      />

      {/* Branded SMS Send Modal (Markaz Al Malk Paint) */}
      <SmsShareModal
        isOpen={isSmsModalOpen}
        onClose={() => setIsSmsModalOpen(false)}
        invoice={invoice}
        lang={lang}
      />

      {/* In-App Delete Invoice Confirmation Modal (100% reliable inside iFrames) */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-rose-600 font-extrabold text-base">
                <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <span>{isRtl ? 'تأكيد حذف فاتورة المبيعات' : 'Confirm Invoice Deletion'}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-semibold">{isRtl ? 'رقم الفاتورة:' : 'Invoice No:'}</span>
                <span className="font-mono font-black text-rose-700 text-sm">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-semibold">{isRtl ? 'العميل:' : 'Customer:'}</span>
                <span className="font-bold text-slate-900">
                  {isRtl ? invoice.customer.nameAr : (invoice.customer.nameEn || invoice.customer.nameAr)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-semibold">{isRtl ? 'المبلغ الإجمالي:' : 'Grand Total:'}</span>
                <span className="font-mono font-black text-slate-900">
                  {formatCurrency(invoice.grandTotal)} SAR
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-semibold">{isRtl ? 'تاريخ الفاتورة:' : 'Date:'}</span>
                <span className="font-mono text-slate-600">{invoice.issueDate}</span>
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
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition border border-slate-300"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  storage.deleteInvoice(invoice.id);
                  setShowDeleteModal(false);
                  onDelete?.();
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
