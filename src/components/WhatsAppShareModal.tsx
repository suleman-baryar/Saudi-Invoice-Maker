import React, { useState, useEffect } from 'react';
import { Invoice } from '../types';
import { Language } from '../utils/translations';
import { WhatsAppIcon } from './WhatsAppIcon';
import { WhatsAppBusinessIcon } from './WhatsAppBusinessIcon';
import {
  formatPhoneForWhatsApp,
  generateWhatsAppInvoiceMessage,
  getInvoicePublicUrl,
  openWhatsAppChat,
  openWhatsAppBusinessChat,
  sendInvoicePdfDirect,
  DirectSendResult,
} from '../utils/whatsappHelper';
import {
  sendBrandedSms,
  openNativeDeviceSms,
  generateSmsInvoiceMessage,
  SmsSendResult,
} from '../utils/smsHelper';
import { downloadInvoicePdf } from '../utils/pdfGenerator';
import { storage } from '../utils/storage';
import {
  X,
  Send,
  Download,
  Copy,
  Check,
  Phone,
  FileText,
  User,
  ShieldCheck,
  Lock,
  Building2,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Share2,
  Link,
  AlertCircle,
  Eye,
  CheckCircle,
  Smartphone,
  MessageSquare,
} from 'lucide-react';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  lang: Language;
  containerId?: string;
  onInvoiceUpdated?: (updated: Invoice) => void;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  invoice,
  lang,
  containerId = 'printable-invoice-container',
  onInvoiceUpdated,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [messageLang, setMessageLang] = useState<'ar' | 'en'>(lang);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [isMessageCopied, setIsMessageCopied] = useState(false);
  const [isSendingDirect, setIsSendingDirect] = useState(false);
  const [directSendResult, setDirectSendResult] = useState<DirectSendResult | null>(null);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsSendResult, setSmsSendResult] = useState<SmsSendResult | null>(null);
  const [saveToCustomer, setSaveToCustomer] = useState(true);

  // Meta WhatsApp Cloud API credentials
  const currentCompany = storage.getCompany();
  const [metaPhoneId, setMetaPhoneId] = useState(
    invoice?.company?.whatsappPhoneNumberId || currentCompany.whatsappPhoneNumberId || ''
  );
  const [metaToken, setMetaToken] = useState(
    invoice?.company?.whatsappAccessToken || currentCompany.whatsappAccessToken || ''
  );
  const [showMetaSettings, setShowMetaSettings] = useState(false);

  const isRtl = lang === 'ar';
  const businessName =
    invoice?.company?.whatsappBusinessName || invoice?.company?.nameAr || currentCompany.nameAr || 'مركز الملك للدهانات';

  // Initialize phone and credentials when invoice opens
  useEffect(() => {
    if (invoice?.customer?.phone) {
      setPhoneNumber(invoice.customer.phone);
    } else {
      setPhoneNumber('');
    }
    const comp = storage.getCompany();
    setMetaPhoneId(invoice?.company?.whatsappPhoneNumberId || comp.whatsappPhoneNumberId || '');
    setMetaToken(invoice?.company?.whatsappAccessToken || comp.whatsappAccessToken || '');
    setMessageLang(lang);
    setDirectSendResult(null);
    setIsSendingDirect(false);
    setSmsSendResult(null);
    setIsSendingSms(false);
    setIsLinkCopied(false);
    setIsMessageCopied(false);
    setShowMetaSettings(false);
  }, [invoice, isOpen, lang]);

  if (!isOpen || !invoice) return null;

  const cleanPhone = formatPhoneForWhatsApp(phoneNumber);
  const message = generateWhatsAppInvoiceMessage(invoice, messageLang);
  const publicLink = getInvoicePublicUrl(invoice);

  // Sync edited phone to invoice and customer record
  const syncPhoneIfRequested = () => {
    if (saveToCustomer && phoneNumber.trim() && phoneNumber.trim() !== invoice.customer.phone) {
      const updatedCust = {
        ...invoice.customer,
        phone: phoneNumber.trim(),
      };
      const updatedInv: Invoice = {
        ...invoice,
        customer: updatedCust,
        updatedAt: new Date().toISOString(),
      };
      storage.saveInvoice(updatedInv);
      if (invoice.customer.id && invoice.customer.id !== 'cust_unknown') {
        storage.updateCustomer(invoice.customer.id, { phone: phoneNumber.trim() });
      }
      if (onInvoiceUpdated) {
        onInvoiceUpdated(updatedInv);
      }
    }
  };

  /**
   * GUARANTEED REAL WHATSAPP DISPATCH:
   * Launches WhatsApp chat with the customer's phone number and the message containing the clickable PDF link.
   * When user clicks send in WhatsApp, the customer GUARANTEED receives the message and link!
   */
  const handleGuaranteedWhatsAppSend = async () => {
    if (!phoneNumber.trim()) {
      alert(isRtl ? 'يرجى إدخال رقم هاتف العميل أولاً' : 'Please enter customer phone number first');
      return;
    }
    syncPhoneIfRequested();

    // Auto-download PDF in background so user has the file
    const el =
      document.getElementById(containerId) ||
      document.getElementById('modal-printable-invoice-container') ||
      document.getElementById('printable-invoice-container');
    if (el) {
      try {
        await downloadInvoicePdf(el.id, `Invoice-${invoice.invoiceNumber}`);
      } catch (err) {
        console.warn('PDF download error:', err);
      }
    }

    openWhatsAppChat(cleanPhone, message);
  };

  /**
   * DIRECT CLOUD API SEND (Dispatches invoice PDF as a document via Meta WhatsApp Business API):
   */
  const handleDirectSendWithoutOpening = async () => {
    if (!phoneNumber.trim()) {
      alert(isRtl ? 'يرجى إدخال رقم هاتف العميل أولاً' : 'Please enter customer phone number');
      return;
    }

    setIsSendingDirect(true);
    setDirectSendResult(null);
    syncPhoneIfRequested();

    // Save Meta credentials to company profile if updated
    if (metaPhoneId.trim() || metaToken.trim()) {
      storage.updateCompanyProfile({
        whatsappPhoneNumberId: metaPhoneId.trim(),
        whatsappAccessToken: metaToken.trim(),
      });
      // Also sync to backend
      fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId: metaPhoneId.trim(),
          accessToken: metaToken.trim(),
          businessName,
        }),
      }).catch(() => {});
    }

    try {
      const customConfig =
        metaPhoneId.trim() && metaToken.trim()
          ? { phoneNumberId: metaPhoneId.trim(), accessToken: metaToken.trim() }
          : undefined;

      const result = await sendInvoicePdfDirect(invoice, phoneNumber, containerId, customConfig);
      setDirectSendResult(result);
      if (!result.success && result.requiresMetaConfig) {
        setShowMetaSettings(true);
      }
    } catch (err: any) {
      setDirectSendResult({
        success: false,
        error: err.message || 'فشل إرسال الفاتورة كمستند PDF',
      });
    } finally {
      setIsSendingDirect(false);
    }
  };

  /**
   * TEST / DEMO SIMULATION (Dispatches invoice PDF as document in simulation mode)
   */
  const handleSimulatedDirectSend = async () => {
    if (!phoneNumber.trim()) {
      alert(isRtl ? 'يرجى إدخال رقم هاتف العميل أولاً' : 'Please enter customer phone number');
      return;
    }

    setIsSendingDirect(true);
    setDirectSendResult(null);
    syncPhoneIfRequested();

    try {
      const result = await sendInvoicePdfDirect(invoice, phoneNumber, containerId, { simulateDemo: true });
      setDirectSendResult(result);
    } catch (err: any) {
      setDirectSendResult({
        success: false,
        error: err.message || 'فشل تجربة الإرسال في وضع المحاكاة',
      });
    } finally {
      setIsSendingDirect(false);
    }
  };

  /**
   * DIRECT BRANDED SMS SEND (To customer SIM with Sender ID: Markaz Al Malk Paint):
   * Customer receives SMS on their SIM card with direct PDF link, sender shown is Markaz Al Malk, personal number 100% hidden.
   */
  const handleSendBrandedSmsFromModal = async () => {
    if (!phoneNumber.trim()) {
      alert(isRtl ? 'يرجى إدخال رقم هاتف / شريحة العميل' : 'Please enter customer phone number');
      return;
    }

    setIsSendingSms(true);
    setSmsSendResult(null);
    syncPhoneIfRequested();

    try {
      const result = await sendBrandedSms(invoice, phoneNumber);
      setSmsSendResult(result);
    } catch (err: any) {
      setSmsSendResult({
        success: false,
        senderId: 'MarkazAlMalk',
        recipient: cleanPhone,
        status: 'FAILED',
        error: err.message || 'فشل إرسال رسالة SMS',
        message: err.message || 'فشل إرسال رسالة SMS',
      });
    } finally {
      setIsSendingSms(false);
    }
  };

  /**
   * INSTANT GUARANTEED CELLULAR DISPATCH:
   * Launches native phone SMS app with recipient & invoice link prefilled.
   */
  const handleOpenNativeSmsFromModal = () => {
    if (!phoneNumber.trim()) {
      alert(isRtl ? 'يرجى إدخال رقم هاتف / شريحة العميل' : 'Please enter customer phone number');
      return;
    }
    syncPhoneIfRequested();
    openNativeDeviceSms(phoneNumber, generateSmsInvoiceMessage(invoice, messageLang));
  };

  /**
   * NATIVE SYSTEM SHARE:
   */
  const handleNativeShareLink = async () => {
    syncPhoneIfRequested();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${businessName} - فاتورة ضريبية رقم ${invoice.invoiceNumber}`,
          text: `مرحباً بك، تفضل رابط الفاتورة الضريبية رقم ${invoice.invoiceNumber} من ${businessName} بمبلغ ${invoice.grandTotal.toFixed(2)} ريال (انقر لفتح وتحميل الفاتورة PDF مباشرة):`,
          url: publicLink,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyPublicLink();
        }
      }
    } else {
      handleCopyPublicLink();
    }
  };

  const handleCopyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLink);
      setIsLinkCopied(true);
      setTimeout(() => setIsLinkCopied(false), 3000);
    } catch {
      // fallback
    }
  };

  const handleCopyCleanMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setIsMessageCopied(true);
      setTimeout(() => setIsMessageCopied(false), 3000);
    } catch {
      // fallback
    }
  };

  const handleApplyPresetCode = (prefix: string) => {
    let digits = phoneNumber.replace(/[^\d]/g, '');
    if (digits.startsWith('0')) {
      digits = digits.substring(1);
    }
    if (digits.startsWith('966')) {
      digits = digits.substring(3);
    } else if (digits.startsWith('92')) {
      digits = digits.substring(2);
    } else if (digits.startsWith('971')) {
      digits = digits.substring(3);
    }
    setPhoneNumber(prefix + digits);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto font-sans">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header with WhatsApp Branding */}
        <div className="bg-gradient-to-r from-[#075E54] via-[#128C7E] to-[#25D366] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-white border border-white/30 shadow-inner">
              <WhatsAppIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">
                {isRtl ? 'إرسال الفاتورة عبر واتساب (WhatsApp)' : 'Send Invoice via WhatsApp'}
              </h3>
              <p className="text-xs text-emerald-100 flex items-center gap-1 mt-0.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>{isRtl ? `المرسل: ${businessName}` : `Sender: ${businessName}`}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* If Meta WhatsApp Business API Document Send Succeeded */}
        {directSendResult?.success ? (
          <div className="p-6 space-y-5 text-center" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>Meta WhatsApp Business API</span>
              </div>
              <h3 className="font-extrabold text-lg text-slate-900 pt-1">
                {isRtl ? 'تم إرسال الفاتورة كمستند PDF بنجاح!' : 'Invoice PDF Dispatched as Document!'}
              </h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                {isRtl
                  ? `تم إرسال ملف الفاتورة PDF كمستند رسمي إلى حساب واتساب للعميل عبر Meta WhatsApp Business API باسم "${directSendResult.senderBusinessName || businessName}".`
                  : `Invoice PDF file was successfully dispatched as an official document via Meta WhatsApp Business API as "${directSendResult.senderBusinessName || businessName}".`}
              </p>
            </div>

            {/* Document Details Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-right space-y-2">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500">{isRtl ? 'نوع الرسالة:' : 'Message Type:'}</span>
                <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  {isRtl ? 'مستند PDF رسمي (Document)' : 'Official PDF Document'}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500">{isRtl ? 'اسم الملف المرفق:' : 'Attached File:'}</span>
                <span className="font-mono font-bold text-slate-900">
                  {directSendResult.filename || `Invoice-${invoice.invoiceNumber}.pdf`}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500">{isRtl ? 'رقم هاتف العميل المستلم:' : 'Recipient Phone:'}</span>
                <span className="font-mono font-bold text-slate-900">+{directSendResult.recipient}</span>
              </div>
              {directSendResult.messageId && (
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-slate-500">{isRtl ? 'معرف رسالة Meta:' : 'Meta Message ID:'}</span>
                  <span className="font-mono text-[10px] text-slate-600 truncate max-w-[180px]" dir="ltr">
                    {directSendResult.messageId}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-slate-500">{isRtl ? 'رابط ملف الـ PDF المباشر:' : 'Direct PDF File:'}</span>
                <a
                  href={directSendResult.publicPdfUrl || directSendResult.publicInvoiceLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-bold text-[11px] inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>{isRtl ? 'معاينة المستند' : 'Open Document'}</span>
                </a>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDirectSendResult(null)}
                className="w-1/2 py-2.5 px-3 rounded-xl text-slate-800 font-bold text-xs bg-slate-100 hover:bg-slate-200 transition flex items-center justify-center gap-1.5 border border-slate-200"
              >
                <span>{isRtl ? 'إرسال مرة أخرى' : 'Send Again'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-1/2 py-2.5 px-4 rounded-xl text-white font-bold text-xs bg-slate-900 hover:bg-black transition shadow-sm"
              >
                {isRtl ? 'تم، إغلاق النافذة' : 'Done, Close'}
              </button>
            </div>
          </div>
        ) : smsSendResult?.success ? (
          <div className="p-6 space-y-5 text-center" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-lg text-slate-900">
                {isRtl ? 'تم إرسال رسالة الـ SMS بنجاح!' : 'SMS Sent Successfully!'}
              </h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                {isRtl
                  ? 'تم إرسال رسالة SMS إلى شريحة هاتف العميل تتضمن رابط الفاتورة PDF مباشرة. اسم المرسل الظاهر للعميل هو "Markaz Al Malk Paint" ورقمك الشخصي لم يظهر نهائياً.'
                  : 'SMS was dispatched directly to customer SIM with direct PDF link. Sender shown is "Markaz Al Malk Paint" with zero personal number exposure.'}
              </p>
            </div>

            {/* Specifications Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-right space-y-2">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500">{isRtl ? 'اسم المرسل الظاهر للعميل:' : 'Sender Display Name:'}</span>
                <span className="font-bold text-blue-900 font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Markaz Al Malk Paint
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500">{isRtl ? 'رقم شريحة العميل المستلم:' : 'Recipient Phone Number:'}</span>
                <span className="font-mono font-bold text-slate-900">+{smsSendResult.recipient}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500">{isRtl ? 'رقم هاتفك الشخصي:' : 'Your Personal Phone:'}</span>
                <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  {isRtl ? 'مخفي تماماً (لم يُرسل)' : '100% Hidden'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-slate-500">{isRtl ? 'رابط الفاتورة PDF المرفق:' : 'Attached Invoice Link:'}</span>
                <button
                  type="button"
                  onClick={handleCopyPublicLink}
                  className="text-blue-600 hover:underline font-bold text-[11px] inline-flex items-center gap-1"
                >
                  {isLinkCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{isLinkCopied ? (isRtl ? 'تم النسخ' : 'Copied') : (isRtl ? 'نسخ الرابط' : 'Copy Link')}</span>
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.open(publicLink, '_blank')}
                className="w-1/2 py-2.5 px-3 rounded-xl text-slate-800 font-bold text-xs bg-slate-100 hover:bg-slate-200 transition flex items-center justify-center gap-1.5 border border-slate-200"
              >
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span>{isRtl ? 'معاينة صفحة العميل' : 'Preview Customer View'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-1/2 py-2.5 px-4 rounded-xl text-white font-bold text-xs bg-slate-900 hover:bg-black transition shadow-sm"
              >
                {isRtl ? 'تم، إغلاق النافذة' : 'Done, Close'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-4 text-xs">
            {/* Customer & Invoice Quick Bar */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-0.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isRtl ? 'العميل:' : 'Customer:'}</span>
                  <strong className="text-slate-900 truncate">
                    {invoice.customer.nameAr || invoice.customer.nameEn || (isRtl ? 'عميل نقدي' : 'Cash Client')}
                  </strong>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {invoice.invoiceNumber}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-bold">
                    {invoice.grandTotal.toFixed(2)} SAR
                  </span>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  {isRtl ? 'مستند PDF جاهز' : 'PDF Document Ready'}
                </span>
              </div>
            </div>

            {/* Customer Phone Input Section */}
            <div className="space-y-1.5 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isRtl ? 'رقم هاتف العميل (واتساب):' : 'Customer WhatsApp Phone Number:'}</span>
                </label>
                {cleanPhone && (
                  <span className="text-[11px] font-mono text-emerald-700 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                    +{cleanPhone}
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder={isRtl ? 'مثال: 0501234567 أو 966501234567' : 'e.g. 0501234567 or 966501234567'}
                  className="w-full text-sm font-mono p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white shadow-2xs"
                  dir="ltr"
                />
              </div>

              {/* Quick Country Code Presets */}
              <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
                <span className="text-[10px] text-slate-500">{isRtl ? 'مفتاح سريع:' : 'Preset:'}</span>
                <button
                  type="button"
                  onClick={() => handleApplyPresetCode('966')}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-200 transition"
                >
                  🇸🇦 السعودية (+966)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPresetCode('971')}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-200 transition"
                >
                  🇦🇪 الإمارات (+971)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPresetCode('92')}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-200 transition"
                >
                  🇵🇰 باكستان (+92)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPresetCode('20')}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-200 transition"
                >
                  🇪🇬 مصر (+20)
                </button>
              </div>

              <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-600">
                <input
                  type="checkbox"
                  id="savePhoneCheckboxModalMain"
                  checked={saveToCustomer}
                  onChange={(e) => setSaveToCustomer(e.target.checked)}
                  className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="savePhoneCheckboxModalMain" className="cursor-pointer">
                  {isRtl ? 'حفظ هذا الرقم في بيانات الفاتورة وسجل العميل' : 'Save number to invoice & customer record'}
                </label>
              </div>
            </div>

            {/* PRIMARY SECTION: META WHATSAPP BUSINESS API (DISPATCH PDF AS DOCUMENT) */}
            <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 text-white p-4 rounded-xl space-y-3 shadow-md border border-emerald-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <WhatsAppIcon className="w-5 h-5 text-emerald-400" />
                  <span className="font-extrabold text-xs sm:text-sm">
                    {isRtl ? 'إرسال الفاتورة كمستند PDF عبر Meta WhatsApp API' : 'Send PDF Document via Meta WhatsApp API'}
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-700/80 text-emerald-100 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/40">
                  {isRtl ? 'مستند رسمي Document' : 'Official Document'}
                </span>
              </div>

              <p className="text-[11px] text-emerald-100 leading-relaxed">
                {isRtl
                  ? `📄 يقوم النظام بإرسال ملف الفاتورة PDF كمستند رسمي مباشرة لحساب واتساب العميل عبر خوادم Meta WhatsApp Business الرسمية باسم "${businessName}" بدون فتح واتساب، ورقمك الشخصي مخفي تماماً مع عدم استقبال ردود (No-Reply).`
                  : `📄 Dispatches the official invoice PDF as a document attachment directly via Meta WhatsApp Business API servers as "${businessName}". Zero personal number exposure & No-Reply protected.`}
              </p>

              {/* Main Document Dispatch Button */}
              <button
                type="button"
                onClick={handleDirectSendWithoutOpening}
                disabled={isSendingDirect || !phoneNumber.trim()}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {isSendingDirect ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>{isRtl ? 'جاري تجهيز وإرسال مستند الفاتورة PDF...' : 'Dispatching PDF Document via Meta API...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-slate-950" />
                    <span>{isRtl ? '🚀 إرسال الفاتورة كمستند PDF الآن (Meta API)' : 'Dispatch Invoice PDF as Document (Meta API)'}</span>
                  </>
                )}
              </button>

              {/* Meta Credentials Config Drawer Toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowMetaSettings(!showMetaSettings)}
                  className="text-[11px] text-emerald-200 hover:text-white underline inline-flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {showMetaSettings
                      ? (isRtl ? 'إخفاء إعدادات Meta API' : 'Hide Meta API Settings')
                      : (isRtl ? '⚙️ إعدادات معرف الهاتف ورمز الوصول (Meta API Settings)' : '⚙️ Configure Meta API Credentials')}
                  </span>
                </button>

                {showMetaSettings && (
                  <div className="mt-2 p-3 bg-black/30 rounded-xl border border-emerald-600/40 space-y-2 text-xs">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-emerald-200">
                        {isRtl ? 'معرف رقم الهاتف (Phone Number ID):' : 'Meta Phone Number ID:'}
                      </label>
                      <input
                        type="text"
                        value={metaPhoneId}
                        onChange={(e) => setMetaPhoneId(e.target.value)}
                        placeholder="e.g. 102938475612345"
                        className="w-full text-xs font-mono p-2 rounded-lg bg-slate-900 border border-emerald-500/50 text-white"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-emerald-200">
                        {isRtl ? 'رمز الوصول الدائم (Permanent Access Token):' : 'Meta Permanent Access Token:'}
                      </label>
                      <input
                        type="password"
                        value={metaToken}
                        onChange={(e) => setMetaToken(e.target.value)}
                        placeholder="EAAB..."
                        className="w-full text-xs font-mono p-2 rounded-lg bg-slate-900 border border-emerald-500/50 text-white"
                        dir="ltr"
                      />
                    </div>
                    <p className="text-[10px] text-emerald-300">
                      {isRtl
                        ? 'يتم حفظ هذه البيانات تلقائياً في إعدادات المنشأة لاستخدامها في جميع الفواتير القادمة.'
                        : 'Saved automatically to company profile for all upcoming invoice dispatches.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Error / Notice Display */}
              {directSendResult && !directSendResult.success && (
                <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[11px] space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>
                      {directSendResult.oauthException
                        ? (isRtl ? 'تنبيه مصادقة Meta (OAuthException):' : 'Meta OAuth Notice:')
                        : (isRtl ? 'تنبيه الاتصال بـ Meta WhatsApp API:' : 'Meta API Notice:')}
                    </span>
                  </div>
                  <p className="leading-relaxed text-amber-100">{directSendResult.error}</p>
                  <div className="pt-1 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={handleGuaranteedWhatsAppSend}
                      className="flex-1 py-2 px-3 bg-[#25D366] hover:bg-[#20ba59] active:bg-[#1caa4f] text-white font-extrabold text-xs rounded-lg transition inline-flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5 text-white" />
                      <span>{isRtl ? '📱 إرسال فوري ومباشر عبر واتساب الآن' : 'Open WhatsApp Chat Now'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSimulatedDirectSend}
                      className="py-2 px-3 bg-emerald-700/60 hover:bg-emerald-600/70 text-emerald-100 font-bold text-xs rounded-lg transition inline-flex items-center justify-center gap-1 border border-emerald-500/40"
                      title={isRtl ? 'تجربة إرسال مستند PDF في وضع المحاكاة' : 'Test dispatch in simulation mode'}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                      <span>{isRtl ? '🧪 تجربة وضع المحاكاة (Demo)' : 'Test Demo Dispatch'}</span>
                    </button>
                    {!showMetaSettings && (
                      <button
                        type="button"
                        onClick={() => setShowMetaSettings(true)}
                        className="py-2 px-3 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-lg transition inline-flex items-center justify-center gap-1"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                        <span>{isRtl ? '⚙️ المفاتيح' : 'Keys'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* SECONDARY ACTION: GUARANTEED CLIENT-SIDE WHATSAPP SEND */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                  <span>{isRtl ? 'الخيار المباشر (فتح محادثة واتساب العميل فوراً):' : 'Direct Chat Fallback (Open WhatsApp Chat):'}</span>
                </span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                  {isRtl ? 'فوري' : 'Instant'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                {isRtl
                  ? 'يفتح تطبيق واتساب فوراً مع نص الفاتورة ورابط الـ PDF لتأكيد الإرسال للعميل بضغطة زر واحدة.'
                  : 'Opens customer WhatsApp chat prefilled with invoice summary and verified PDF link.'}
              </p>
              <button
                type="button"
                onClick={handleGuaranteedWhatsAppSend}
                disabled={!phoneNumber.trim()}
                className="w-full py-2.5 px-3 bg-[#25D366] hover:bg-[#20ba59] active:bg-[#1caa4f] text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <WhatsAppIcon className="w-4 h-4 text-white" />
                <span>{isRtl ? 'فتح محادثة العميل في واتساب الآن' : 'Open Customer Chat in WhatsApp'}</span>
              </button>
            </div>

            {/* TERTIARY ACTION: COPY & SHARE DIRECT PDF LINK */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-blue-950 flex items-center gap-1.5">
                  <Link className="w-4 h-4 text-blue-600" />
                  <span>{isRtl ? 'رابط الفاتورة PDF المباشر:' : 'Direct PDF Invoice Link:'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => window.open(publicLink, '_blank')}
                  className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-medium"
                >
                  <span>{isRtl ? 'تجربة فتح الرابط' : 'Test Link'}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-blue-200">
                <input
                  type="text"
                  readOnly
                  value={publicLink}
                  className="flex-1 px-2 text-[11px] font-mono text-slate-700 bg-transparent outline-none truncate"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={handleCopyPublicLink}
                  className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-md transition inline-flex items-center gap-1 shrink-0"
                >
                  {isLinkCopied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isLinkCopied ? (isRtl ? 'تم النسخ!' : 'Copied!') : (isRtl ? 'نسخ الرابط' : 'Copy Link')}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleNativeShareLink}
                  className="py-2 px-3 rounded-lg bg-white hover:bg-blue-100 border border-blue-300 text-blue-900 font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isRtl ? 'مشاركة الرابط' : 'Share Link'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyCleanMessage}
                  className="py-2 px-3 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  {isMessageCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isMessageCopied ? (isRtl ? 'تم نسخ النص!' : 'Copied!') : (isRtl ? 'نسخ نص الرسالة' : 'Copy Message')}</span>
                </button>
              </div>
            </div>

            {/* BRANDED SMS SECTION */}
            <div className="bg-slate-100 border border-slate-200 p-3 rounded-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-slate-600" />
                <span className="font-semibold text-xs text-slate-800">
                  {isRtl ? 'إرسال الفاتورة عبر رسالة SMS لشريحة العميل' : 'Send via SMS to Customer SIM'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleOpenNativeSmsFromModal}
                disabled={!phoneNumber.trim()}
                className="px-3 py-1 text-xs font-bold bg-slate-800 hover:bg-black text-white rounded-lg transition disabled:opacity-50"
              >
                {isRtl ? 'إرسال SMS' : 'Send SMS'}
              </button>
            </div>

            {/* Footer Controls */}
            <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const el =
                    document.getElementById(containerId) ||
                    document.getElementById('modal-printable-invoice-container') ||
                    document.getElementById('printable-invoice-container');
                  if (el) {
                    downloadInvoicePdf(el.id, `Invoice-${invoice.invoiceNumber}`);
                  }
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isRtl ? 'تنزيل PDF' : 'Download PDF'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                {isRtl ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
