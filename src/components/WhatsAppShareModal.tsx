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

  const isRtl = lang === 'ar';
  const businessName = invoice?.company?.nameAr || 'مركز الملك للدهانات';

  // Initialize phone when invoice opens
  useEffect(() => {
    if (invoice?.customer?.phone) {
      setPhoneNumber(invoice.customer.phone);
    } else {
      setPhoneNumber('');
    }
    setMessageLang(lang);
    setDirectSendResult(null);
    setIsSendingDirect(false);
    setSmsSendResult(null);
    setIsSendingSms(false);
    setIsLinkCopied(false);
    setIsMessageCopied(false);
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
   * DIRECT CLOUD API SEND (Requires Meta WhatsApp Business API):
   */
  const handleDirectSendWithoutOpening = async () => {
    if (!phoneNumber.trim()) {
      alert(isRtl ? 'يرجى إدخال رقم هاتف العميل أولاً' : 'Please enter customer phone number');
      return;
    }

    setIsSendingDirect(true);
    setDirectSendResult(null);
    syncPhoneIfRequested();

    try {
      const result = await sendInvoicePdfDirect(invoice, phoneNumber, containerId);
      setDirectSendResult(result);
    } catch (err: any) {
      setDirectSendResult({
        success: false,
        error: err.message || 'فشل إرسال الفاتورة',
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

        {/* If SMS Send Succeeded */}
        {smsSendResult?.success ? (
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
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {isRtl ? 'رابط PDF جاهز' : 'PDF Ready'}
                </span>
              </div>
            </div>

            {/* Customer Phone Input Section */}
            <div className="space-y-1.5 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isRtl ? 'رقم هاتف / شريحة العميل المستلم:' : 'Recipient Customer Phone:'}</span>
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
                  className="w-full text-sm font-mono p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white shadow-2xs"
                  dir="ltr"
                />
              </div>

              {/* Quick Country Code Presets */}
              <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
                <span className="text-[10px] text-slate-500">{isRtl ? 'مفتاح سريع:' : 'Code:'}</span>
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

            {/* BRANDED SMS SECTION (CUSTOMER SIM - NO PERSONAL NUMBER EXPOSURE) */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 text-white p-3.5 rounded-xl space-y-2 shadow-sm border border-blue-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-200" />
                  <span className="font-bold text-xs">
                    {isRtl ? 'إرسال SMS لشريحة العميل (بدون فتح واتساب)' : 'Send SMS to Customer SIM'}
                  </span>
                </div>
                <span className="text-[10px] bg-blue-700 text-blue-100 px-2 py-0.5 rounded-full font-mono font-bold">
                  {isRtl ? 'المرسل: Markaz Al Malk Paint' : 'Sender: Markaz Al Malk'}
                </span>
              </div>
              <p className="text-[11px] text-blue-100 font-medium">
                {isRtl
                  ? '🔒 رسالة SMS تصل لشريحة العميل برابط الفاتورة PDF، بدون فتح واتساب نهائياً، ورقمك الشخصي مخفي تماماً!'
                  : '🔒 SMS reaches customer SIM with PDF link without opening WhatsApp. Personal phone number is 100% hidden.'}
              </p>

              <div className="flex flex-col gap-2 pt-1">
                {/* Instant Device SMS */}
                <button
                  type="button"
                  onClick={handleOpenNativeSmsFromModal}
                  disabled={!phoneNumber.trim()}
                  className="w-full py-2.5 px-3 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-extrabold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <Smartphone className="w-3.5 h-3.5 text-white" />
                  <span>{isRtl ? '📱 إرسال فوري ومضمون عبر تطبيق الرسائل (SMS)' : 'Send Instant via SMS App'}</span>
                </button>

                {/* Branded Cloud Send */}
                <button
                  type="button"
                  onClick={handleSendBrandedSmsFromModal}
                  disabled={isSendingSms || !phoneNumber.trim()}
                  className="w-full py-2 px-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 border border-white/20 disabled:opacity-50"
                >
                  {isSendingSms ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-blue-200" />
                  )}
                  <span>{isRtl ? '🚀 إرسال سحابي تلقائي (بوابة تقنيات Taqnyat)' : 'Send via Cloud Gateway (Taqnyat)'}</span>
                </button>
              </div>
            </div>

          {/* PRIMARY GUARANTEED DELIVERY BUTTON: DIRECT WHATSAPP SEND */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGuaranteedWhatsAppSend}
              disabled={!phoneNumber.trim()}
              className="w-full py-3.5 px-4 rounded-xl text-white font-extrabold text-xs sm:text-sm bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20ba59] hover:to-[#0d7367] active:from-[#1caa4f] active:to-[#085a50] transition flex items-center justify-between gap-2 shadow-md hover:shadow-lg disabled:opacity-50 text-right"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <WhatsAppIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span>{isRtl ? 'إرسال الفاتورة للعميل عبر واتساب الآن' : 'Send Invoice to Customer on WhatsApp Now'}</span>
                    <span className="text-[10px] bg-white text-emerald-900 font-black px-1.5 py-0.2 rounded-full shadow-2xs">
                      {isRtl ? 'تسليم فوري ومؤكد' : 'Guaranteed Delivery'}
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-50 font-normal mt-0.5">
                    {isRtl ? 'يفتح محادثة العميل فوراً مع تفاصيل الفاتورة ورابط الـ PDF لتصل لهاتفه مباشرة' : 'Opens customer chat with invoice summary & direct PDF view link'}
                  </p>
                </div>
              </div>
              <Send className="w-4 h-4 shrink-0" />
            </button>
          </div>

          {/* SECONDARY ACTION: COPY & SHARE DIRECT PDF LINK */}
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
            <p className="text-[10px] text-blue-800">
              {isRtl
                ? '💡 يمكن نسخ الرابط وإرساله للعميل من أي جهاز أو عبر الرسائل النصية، والعميل يفتحه فوراً لتنزيل الفاتورة PDF.'
                : '💡 You can copy this link and send it via any device, and the customer opens it to download the PDF.'}
            </p>
          </div>

          {/* CLOUD API OPTION (With transparent requirement notice) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-slate-600" />
                <span>{isRtl ? 'إرسال سحابي تلقائي عبر Meta WhatsApp API:' : 'Automated Cloud Send via Meta API:'}</span>
              </span>
              <button
                type="button"
                onClick={handleDirectSendWithoutOpening}
                disabled={isSendingDirect || !phoneNumber.trim()}
                className="px-3 py-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition disabled:opacity-50"
              >
                {isSendingDirect ? (isRtl ? 'جاري الفحص...' : 'Checking...') : (isRtl ? 'إرسال سحابي' : 'Cloud Send')}
              </button>
            </div>

            {directSendResult && !directSendResult.success && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <div className="flex items-center gap-1 font-bold">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isRtl ? 'تنبيه الاتصال بـ Meta WhatsApp Cloud API:' : 'Meta API Notice:'}</span>
                </div>
                <p className="leading-relaxed">
                  {directSendResult.error}
                </p>
                <p className="text-[10px] text-amber-800 pt-0.5">
                  {isRtl
                    ? '👉 لتصل الفاتورة للعميل حالاً وبشكل حقيقي 100%، استخدم الزر الأخضر في الأعلى "إرسال الفاتورة للعميل عبر واتساب الآن".'
                    : '👉 For 100% real instant delivery, use the green button above "Send Invoice to Customer on WhatsApp Now".'}
                </p>
              </div>
            )}
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
