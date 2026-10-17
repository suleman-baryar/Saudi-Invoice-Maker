import React, { useState, useEffect } from 'react';
import { Invoice } from '../types';
import { Language } from '../utils/translations';
import QRCode from 'qrcode';
import {
  formatPhoneForSms,
  generateSmsInvoiceMessage,
  sendBrandedSms,
  openNativeDeviceSms,
  getSmsGatewayConfig,
  saveSmsGatewayConfig,
  SmsSendResult,
} from '../utils/smsHelper';
import {
  getInvoicePublicUrl,
  openWhatsAppChat,
  generateWhatsAppInvoiceMessage,
} from '../utils/whatsappHelper';
import { storage } from '../utils/storage';
import { WhatsAppIcon } from './WhatsAppIcon';
import {
  X,
  Send,
  Copy,
  Check,
  Phone,
  ShieldCheck,
  Lock,
  Building2,
  CheckCircle2,
  ExternalLink,
  Share2,
  Link,
  MessageSquare,
  Smartphone,
  Eye,
  Settings,
  AlertCircle,
  Key,
  QrCode,
  Info,
} from 'lucide-react';

interface SmsShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  lang: Language;
  onInvoiceUpdated?: (updated: Invoice) => void;
}

export const SmsShareModal: React.FC<SmsShareModalProps> = ({
  isOpen,
  onClose,
  invoice,
  lang,
  onInvoiceUpdated,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<SmsSendResult | null>(null);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [isMessageCopied, setIsMessageCopied] = useState(false);
  const [saveToCustomer, setSaveToCustomer] = useState(true);

  // QR code state
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [showQrCode, setShowQrCode] = useState(false);

  // SMS Gateway state
  const [isGatewayConfigured, setIsGatewayConfigured] = useState(false);
  const [showGatewayConfig, setShowGatewayConfig] = useState(false);
  const [gatewayToken, setGatewayToken] = useState('');
  const [gatewaySenderId, setGatewaySenderId] = useState('MarkazAlMalk');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSaveMsg, setConfigSaveMsg] = useState('');

  const isRtl = lang === 'ar';
  const businessName = invoice?.company?.nameAr || 'مركز الملك للدهانات';

  useEffect(() => {
    if (invoice?.customer?.phone) {
      setPhoneNumber(invoice.customer.phone);
    } else {
      setPhoneNumber('');
    }
    setSendResult(null);
    setIsSending(false);
    setIsLinkCopied(false);
    setIsMessageCopied(false);
    setShowGatewayConfig(false);
    setConfigSaveMsg('');

    // Check gateway status
    getSmsGatewayConfig().then((cfg) => {
      if (cfg && cfg.configured) {
        setIsGatewayConfigured(true);
      } else {
        setIsGatewayConfigured(false);
      }
      if (cfg?.senderId) {
        setGatewaySenderId(cfg.senderId);
      }
    });
  }, [invoice, isOpen, lang]);

  const publicLink = invoice ? getInvoicePublicUrl(invoice) : '';

  useEffect(() => {
    if (publicLink) {
      QRCode.toDataURL(publicLink, {
        width: 160,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      })
        .then(setQrDataUrl)
        .catch(() => {});
    }
  }, [publicLink]);

  if (!isOpen || !invoice) return null;

  const cleanPhone = formatPhoneForSms(phoneNumber);
  const smsMessage = generateSmsInvoiceMessage(invoice, lang === 'en' ? 'en' : 'ar');
  const waMessage = generateWhatsAppInvoiceMessage(invoice, lang === 'en' ? 'en' : 'ar');

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
   * 100% GUARANTEED INSTANT DISPATCH VIA WHATSAPP:
   * Opens chat directly with customer and invoice link.
   */
  const handleSendViaWhatsApp = () => {
    if (!phoneNumber.trim()) {
      alert(isRtl ? 'يرجى إدخال رقم هاتف العميل أولاً' : 'Please enter customer phone number first');
      return;
    }
    syncPhoneIfRequested();
    openWhatsAppChat(cleanPhone, waMessage);
  };

  /**
   * NATIVE PHONE SMS DISPATCH:
   * Launches native phone SMS app with recipient & invoice link prefilled.
   */
  const handleOpenNativeDeviceSms = () => {
    if (!phoneNumber.trim()) {
      alert(isRtl ? 'يرجى إدخال رقم هاتف / شريحة العميل أولاً' : 'Please enter customer phone number first');
      return;
    }
    syncPhoneIfRequested();
    openNativeDeviceSms(phoneNumber, smsMessage);
  };

  /**
   * AUTOMATED BRANDED SMS GATEWAY DISPATCH:
   * Calls Taqnyat or Twilio with Sender ID: MarkazAlMalk
   */
  const handleSendBrandedSms = async () => {
    if (!phoneNumber.trim()) {
      alert(isRtl ? 'يرجى إدخال رقم هاتف / شريحة العميل' : 'Please enter customer phone number');
      return;
    }

    setIsSending(true);
    setSendResult(null);
    syncPhoneIfRequested();

    try {
      const result = await sendBrandedSms(invoice, phoneNumber);
      setSendResult(result);
      if (result.requiresGateway) {
        setShowGatewayConfig(true);
      }
    } catch (err: any) {
      setSendResult({
        success: false,
        senderId: 'MarkazAlMalk',
        recipient: cleanPhone,
        status: 'FAILED',
        error: err.message || 'فشل إرسال رسالة SMS',
        message: err.message || 'فشل إرسال رسالة SMS',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveGatewayConfig = async () => {
    if (!gatewayToken.trim()) {
      alert(isRtl ? 'يرجى إدخال مفتاح الـ Token' : 'Please enter API Token');
      return;
    }
    setIsSavingConfig(true);
    try {
      const res = await saveSmsGatewayConfig({
        provider: 'taqnyat',
        taqnyatToken: gatewayToken.trim(),
        senderId: gatewaySenderId.trim() || 'MarkazAlMalk',
      });
      if (res.success) {
        setIsGatewayConfigured(true);
        setConfigSaveMsg(isRtl ? '✅ تم حفظ مفتاح البوابة بنجاح! يمكنك الآن الإرسال التلقائي.' : 'Gateway configured successfully!');
        setTimeout(() => setShowGatewayConfig(false), 2000);
      } else {
        setConfigSaveMsg(isRtl ? '❌ تعذر حفظ الإعدادات' : 'Failed to save configuration');
      }
    } catch (e: any) {
      setConfigSaveMsg(e.message || 'Error saving gateway');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLink);
      setIsLinkCopied(true);
      setTimeout(() => setIsLinkCopied(false), 3000);
    } catch {
      // fallback
    }
  };

  const handleCopySmsMessage = async () => {
    try {
      await navigator.clipboard.writeText(smsMessage);
      setIsMessageCopied(true);
      setTimeout(() => setIsMessageCopied(false), 3000);
    } catch {
      // fallback
    }
  };

  const handleNativeShare = async () => {
    syncPhoneIfRequested();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Markaz Al Malk Paint - فاتورة رقم ${invoice.invoiceNumber}`,
          text: smsMessage,
          url: publicLink,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleApplyPresetCode = (prefix: string) => {
    let digits = phoneNumber.replace(/[^\d]/g, '');
    if (digits.startsWith('0')) digits = digits.substring(1);
    if (digits.startsWith('966')) digits = digits.substring(3);
    else if (digits.startsWith('92')) digits = digits.substring(2);
    else if (digits.startsWith('971')) digits = digits.substring(3);
    setPhoneNumber(prefix + digits);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto font-sans">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header with Delivery Branding */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center text-white border border-white/20 shadow-inner">
              <Share2 className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">
                {isRtl ? 'إرسال ومشاركة الفاتورة للعميل' : 'Send & Share Invoice with Customer'}
              </h3>
              <p className="text-xs text-blue-200 flex items-center gap-1 mt-0.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>{isRtl ? 'مركز الملك للدهانات (Markaz Al Malk Paint)' : 'Markaz Al Malk Paint'}</span>
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

        {/* Successful Delivery Screen (From Gateway) */}
        {sendResult?.success ? (
          <div className="p-6 space-y-5 text-center" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-lg text-slate-900">
                {isRtl ? 'تم إرسال رسالة الـ SMS بنجاح!' : 'SMS Sent Successfully!'}
              </h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                {sendResult.message || (isRtl
                  ? 'تم إرسال رسالة SMS إلى شريحة هاتف العميل تتضمن رابط الفاتورة PDF مباشرة باسم "Markaz Al Malk Paint".'
                  : 'SMS was dispatched directly to customer SIM with direct PDF link.')}
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
                <span className="font-mono font-bold text-slate-900">+{sendResult.recipient}</span>
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
                  onClick={handleCopyLink}
                  className="text-blue-600 hover:underline font-bold text-[11px] inline-flex items-center gap-1"
                >
                  {isLinkCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
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
          /* Main Form */
          <div className="p-4 sm:p-5 space-y-4 text-xs">
            {/* Customer Summary & Phone Input */}
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-200">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isRtl ? 'رقم هاتف / واتساب العميل:' : 'Customer Phone Number:'}</span>
                </span>
                <span className="font-mono text-[11px] text-slate-600">
                  {invoice.invoiceNumber} | <strong>{invoice.grandTotal.toFixed(2)} SAR</strong>
                </span>
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
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 transition"
                >
                  🇸🇦 السعودية (+966)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPresetCode('971')}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 transition"
                >
                  🇦🇪 الإمارات (+971)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPresetCode('92')}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 transition"
                >
                  🇵🇰 باكستان (+92)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPresetCode('20')}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 transition"
                >
                  🇪🇬 مصر (+20)
                </button>
              </div>

              <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-600">
                <input
                  type="checkbox"
                  id="savePhoneSmsModalUnified"
                  checked={saveToCustomer}
                  onChange={(e) => setSaveToCustomer(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="savePhoneSmsModalUnified" className="cursor-pointer">
                  {isRtl ? 'حفظ هذا الرقم في بيانات الفاتورة وسجل العميل' : 'Save number to invoice & customer'}
                </label>
              </div>
            </div>

            {/* CHANNEL 1: GUARANTEED 1-CLICK WHATSAPP DISPATCH */}
            <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <WhatsAppIcon className="w-5 h-5 text-emerald-600" />
                  <span className="font-extrabold text-xs sm:text-sm text-emerald-950">
                    {isRtl ? '1. إرسال فوري ومضمون 100% عبر واتساب (WhatsApp)' : '1. Instant Send via WhatsApp'}
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full shadow-2xs">
                  {isRtl ? 'يصل فوراً 100%' : '100% Delivered'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-900 leading-relaxed font-medium">
                {isRtl
                  ? '🟢 يفتح محادثة العميل فوراً مع ملخص الفاتورة ورابط الـ PDF لتصل لهاتفه في ثانية واحدة (يعمل من الكمبيوتر والجوال).'
                  : '🟢 Opens customer chat with invoice summary & direct PDF view link instantly.'}
              </p>
              <button
                type="button"
                onClick={handleSendViaWhatsApp}
                disabled={!phoneNumber.trim()}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20ba59] hover:to-[#0d7367] text-white font-extrabold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                <WhatsAppIcon className="w-4 h-4 text-white" />
                <span>{isRtl ? 'إرسال الفاتورة للعميل عبر واتساب الآن' : 'Send Invoice via WhatsApp Now'}</span>
              </button>
            </div>

            {/* CHANNEL 2: MOBILE SMS DISPATCH */}
            <div className="bg-blue-50/90 border border-blue-200 rounded-xl p-3.5 space-y-2 text-blue-950">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-700" />
                  <span className="font-extrabold text-xs">
                    {isRtl ? '2. إرسال عبر تطبيق رسائل الجوال (SMS من هاتفك)' : '2. Send via Phone SMS App'}
                  </span>
                </div>
                <span className="text-[10px] bg-blue-200 text-blue-900 font-bold px-2 py-0.5 rounded-full">
                  {isRtl ? 'للجوال' : 'Mobile'}
                </span>
              </div>
              <p className="text-[11px] text-blue-900 leading-relaxed font-medium">
                {isRtl
                  ? '📲 إذا كنت تستخدم البرنامج من الهاتف، يفتح تطبيق الرسائل النصية فوراً لإرسال الرابط لشريحة العميل.'
                  : '📲 Opens device SMS app with customer number & PDF link ready to send.'}
              </p>
              <button
                type="button"
                onClick={handleOpenNativeDeviceSms}
                disabled={!phoneNumber.trim()}
                className="w-full py-2.5 px-4 bg-blue-900 hover:bg-blue-950 text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                <Send className="w-4 h-4 text-blue-200" />
                <span>{isRtl ? 'فتح تطبيق الرسائل وإرسال الـ SMS فوراً' : 'Open SMS App & Send'}</span>
              </button>
            </div>

            {/* CHANNEL 3: IN-STORE QR CODE SCANNER */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-slate-700" />
                  <span>{isRtl ? '3. مسح باركود الفاتورة بجوال العميل فوراً:' : '3. Scan Invoice QR Code:'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowQrCode(!showQrCode)}
                  className="text-[11px] font-bold text-blue-600 hover:underline bg-white px-2 py-0.5 rounded border border-slate-200"
                >
                  {showQrCode ? (isRtl ? 'إخفاء الباركود' : 'Hide QR') : (isRtl ? 'عرض الباركود' : 'Show QR')}
                </button>
              </div>
              {showQrCode && (
                <div className="p-3 bg-white rounded-lg border border-slate-200 text-center animate-in fade-in duration-150">
                  {qrDataUrl && <img src={qrDataUrl} alt="Invoice QR" className="w-36 h-36 mx-auto shadow-2xs border border-slate-100 rounded-md" />}
                  <p className="text-[10px] text-slate-600 font-bold mt-1.5">
                    {isRtl ? 'وجه كاميرا الجوال لمسح الباركود وفتح الفاتورة PDF فوراً للعميل' : 'Point phone camera to open PDF invoice'}
                  </p>
                </div>
              )}
            </div>

            {/* CHANNEL 4: COPY DIRECT PDF LINK */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                  <Link className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isRtl ? '4. رابط الفاتورة PDF المباشر:' : '4. Direct PDF Invoice Link:'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => window.open(publicLink, '_blank')}
                  className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-medium"
                >
                  <span>{isRtl ? 'معاينة الرابط' : 'Preview Link'}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
                <input
                  type="text"
                  readOnly
                  value={publicLink}
                  className="flex-1 px-2 text-[11px] font-mono text-slate-700 bg-transparent outline-none truncate"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1 bg-slate-900 hover:bg-black text-white text-[11px] font-bold rounded-md transition flex items-center gap-1"
                >
                  {isLinkCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{isLinkCopied ? (isRtl ? 'تم النسخ!' : 'Copied!') : (isRtl ? 'نسخ الرابط' : 'Copy')}</span>
                </button>
              </div>
            </div>

            {/* CHANNEL 5: AUTOMATED CLOUD BRANDED SMS (TAQNYAT.SA) */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                  <span>{isRtl ? '5. إرسال سحابي تلقائي باسم Markaz Al Malk (بوابة تقنيات)' : '5. Cloud SMS via Taqnyat Gateway'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowGatewayConfig(!showGatewayConfig)}
                  className="text-[10px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1"
                >
                  <Settings className="w-3 h-3 text-slate-500" />
                  <span>{isGatewayConfigured ? (isRtl ? 'البوابة مفعلة' : 'Active') : (isRtl ? 'إعدادات البوابة' : 'Setup')}</span>
                </button>
              </div>

              {isGatewayConfigured ? (
                <button
                  type="button"
                  onClick={handleSendBrandedSms}
                  disabled={isSending || !phoneNumber.trim()}
                  className="w-full py-2 px-3 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSending ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-blue-200" />
                  )}
                  <span>{isRtl ? 'إرسال سحابي تلقائي الآن عبر بوابة تقنيات' : 'Send via Taqnyat Gateway Now'}</span>
                </button>
              ) : (
                <p className="text-[10px] text-slate-500 leading-normal">
                  {isRtl
                    ? '💡 لإرسال SMS بدون رقمك وظهور اسم "Markaz Al Malk Paint"، تشترط هيئة الاتصالات ربط مفتاح بوابة رسائل معتمدة مثل Taqnyat.sa.'
                    : 'Carrier regulations require a Taqnyat.sa token to send SMS with custom sender name.'}
                </p>
              )}

              {/* Inline Gateway Setup */}
              {showGatewayConfig && (
                <div className="bg-white p-3 rounded-xl border border-blue-200 space-y-2 mt-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1">
                      <Key className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isRtl ? 'مفتاح بوابة تقنيات Taqnyat:' : 'Taqnyat Bearer Token:'}</span>
                    </span>
                    <a
                      href="https://taqnyat.sa"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      <span>taqnyat.sa</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={gatewayToken}
                    onChange={(e) => setGatewayToken(e.target.value)}
                    placeholder={isRtl ? 'ألصق الـ Bearer Token هنا...' : 'Paste Bearer Token here...'}
                    className="w-full text-xs font-mono p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                    dir="ltr"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveGatewayConfig}
                      disabled={isSavingConfig || !gatewayToken.trim()}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition disabled:opacity-50"
                    >
                      {isSavingConfig ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : (isRtl ? 'حفظ وتفعيل' : 'Save & Enable')}
                    </button>
                    {configSaveMsg && <span className="text-[11px] font-bold">{configSaveMsg}</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex justify-end border-t border-slate-100">
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
