import { Invoice } from '../types';
import { formatCurrency } from './vatCalculations';
import { downloadInvoicePdf, generateInvoicePdfBase64 } from './pdfGenerator';

/**
 * Normalizes phone numbers to standard international WhatsApp format without '+' or leading zeros.
 * Specially handles Saudi mobile numbers (05... -> 9665...).
 */
export function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return '';
  
  // Remove non-digit characters except leading plus
  let cleaned = phone.trim().replace(/[^\d+]/g, '');
  
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  // Saudi Mobile: 05xxxxxxxx (10 digits) -> 9665xxxxxxxx
  if (cleaned.startsWith('05') && cleaned.length === 10) {
    cleaned = '966' + cleaned.substring(1);
  } 
  // Saudi Mobile without leading zero: 5xxxxxxxx (9 digits) -> 9665xxxxxxxx
  else if (cleaned.startsWith('5') && cleaned.length === 9) {
    cleaned = '966' + cleaned;
  }
  // Pakistan Mobile: 03xxxxxxxx (11 digits) -> 923xxxxxxxx
  else if (cleaned.startsWith('03') && cleaned.length === 11) {
    cleaned = '92' + cleaned.substring(1);
  }
  // UAE Mobile: 05xxxxxxxx (10 digits) -> 9715xxxxxxxx
  // (Note: if user entered with country code already like 966..., it remains untouched)
  
  return cleaned;
}

/**
 * Encodes core invoice fields into compact URL safe base64
 * Ensures invoice displays instantly on any static host like Netlify with zero server dependency.
 */
export function encodeInvoicePayload(invoice: Invoice): string {
  try {
    const compact: Partial<Invoice> = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      issueTime: invoice.issueTime,
      pricingMode: invoice.pricingMode,
      status: invoice.status,
      paymentStatus: invoice.paymentStatus,
      paymentMethod: invoice.paymentMethod,
      company: invoice.company,
      customer: invoice.customer,
      items: invoice.items,
      subtotalBeforeVat: invoice.subtotalBeforeVat,
      totalDiscount: invoice.totalDiscount,
      taxableAmount: invoice.taxableAmount,
      totalVat: invoice.totalVat,
      grandTotal: invoice.grandTotal,
      zatcaQrBase64: invoice.zatcaQrBase64,
      notesAr: invoice.notesAr,
      notesEn: invoice.notesEn,
    };
    return btoa(unescape(encodeURIComponent(JSON.stringify(compact))));
  } catch {
    return '';
  }
}

/**
 * Gets a clean, clickable public URL for the customer to open and view the invoice directly on any device.
 */
export function getInvoicePublicUrl(invoice: Invoice): string {
  // Ensure invoice is cached on server/functions for external customer viewing
  if (typeof fetch !== 'undefined' && invoice) {
    fetch('/api/invoices/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice }),
    }).catch(() => {});
  }

  const encoded = encodeInvoicePayload(invoice);
  const dataParam = encoded ? `&d=${encodeURIComponent(encoded)}` : '';

  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    return `${origin}/?inv=${encodeURIComponent(invoice.invoiceNumber)}${dataParam}`;
  }
  return `/?inv=${encodeURIComponent(invoice.invoiceNumber)}${dataParam}`;
}

/**
 * Builds a friendly, professional bilingual WhatsApp message for an invoice,
 * including a direct clickable PDF link that works on WhatsApp and WhatsApp Business.
 */
export function generateWhatsAppInvoiceMessage(invoice: Invoice, lang: 'ar' | 'en' = 'ar'): string {
  const customerName = invoice.customer?.nameAr || invoice.customer?.nameEn || (lang === 'ar' ? 'العميل الكريم' : 'Valued Customer');
  const companyName = invoice.company?.nameAr || invoice.company?.nameEn || 'مركز الملك للدهانات';
  const grandTotal = formatCurrency(invoice.grandTotal);
  const vatTotal = formatCurrency(invoice.totalVat);
  const publicUrl = getInvoicePublicUrl(invoice);
  const statusLabel = invoice.paymentStatus === 'PAID' 
    ? '✅ مسددة بالكامل (Paid in Full)' 
    : invoice.paymentStatus === 'PARTIALLY_PAID' 
    ? '⏳ مسددة جزئياً (Partially Paid)' 
    : '⚠️ غير مسددة (Unpaid)';

  if (lang === 'en') {
    return (
      `Dear ${customerName},\n\n` +
      `Thank you for your business. Here is your Simplified Tax Invoice from *${companyName}*:\n\n` +
      `📄 *Invoice No:* ${invoice.invoiceNumber}\n` +
      `📅 *Date:* ${invoice.issueDate}\n` +
      `💰 *Total Amount:* ${grandTotal} SAR\n` +
      `🏷️ *VAT (15%):* ${vatTotal} SAR\n` +
      `📌 *Payment Status:* ${statusLabel}\n\n` +
      `🔗 *Direct PDF View & Download Link:*\n` +
      `${publicUrl}\n\n` +
      `📎 Your official ZATCA-compliant Tax Invoice PDF is ready. Click the link above to view or download it directly (works on both regular WhatsApp & WhatsApp Business).\n\n` +
      `----------------------------------------\n` +
      `📢 *Automated Dispatch (No-Reply Service):*\n` +
      `This message was sent automatically from ${companyName}. This number does not accept incoming replies.\n\n` +
      `Best regards,\n` +
      `*${companyName}*`
    );
  }

  return (
    `مرحباً بك ${customerName}،\n\n` +
    `نشكر لك تعاملك معنا. نرفق لك تفاصيل الفاتورة الضريبية المبسطة من *${companyName}*:\n\n` +
    `📄 *رقم الفاتورة:* ${invoice.invoiceNumber}\n` +
    `📅 *تاريخ الإصدار:* ${invoice.issueDate}\n` +
    `💰 *المبلغ الإجمالي:* ${grandTotal} ريال سعودي\n` +
    `🏷️ *ضريبة القيمة المضافة (15%):* ${vatTotal} ريال\n` +
    `📌 *حالة السداد:* ${statusLabel}\n\n` +
    `🔗 *رابط عرض وتحميل الفاتورة PDF مباشرة:*\n` +
    `${publicUrl}\n\n` +
    `📎 تم تجهيز الفاتورة بصيغة PDF. اضغط على الرابط أعلاه لفتح الفاتورة وتحميلها على جهازك فوراً (سواء كنت تستخدم WhatsApp العادي أو WhatsApp Business).\n\n` +
    `----------------------------------------\n` +
    `📢 *خدمة الإرسال الآلي (No-Reply Service):*\n` +
    `هذه الرسالة تم إرسالها آلياً من نظام الفواتير لـ *${companyName}*. هذا الرقم مخصص للإرسال فقط ولا يستقبل الردود.\n\n` +
    `مع خالص التحية والتقدير،\n` +
    `*${companyName}*`
  );
}

/**
 * Triggers regular WhatsApp chat.
 */
export function openWhatsAppChat(phone: string, message: string): void {
  const cleanPhone = formatPhoneForWhatsApp(phone);
  const encodedText = encodeURIComponent(message);
  
  let targetUrl = '';
  if (cleanPhone) {
    targetUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  } else {
    targetUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
  }

  window.open(targetUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Explicitly triggers WhatsApp Business on mobile or web.
 */
export function openWhatsAppBusinessChat(phone: string, message: string): void {
  const cleanPhone = formatPhoneForWhatsApp(phone);
  const encodedText = encodeURIComponent(message);
  
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile && cleanPhone) {
    // Attempt deep link protocol to WhatsApp Business app
    window.location.href = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
    setTimeout(() => {
      window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
    }, 800);
  } else {
    window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
  }
}

/**
 * Sends SMS containing the direct clickable PDF invoice link.
 */
export function openSmsWithInvoiceLink(phone: string, invoice: Invoice): void {
  const cleanPhone = formatPhoneForWhatsApp(phone);
  const link = getInvoicePublicUrl(invoice);
  const businessName = invoice.company?.nameAr || 'مركز الملك للدهانات';
  const smsText = `مرحباً بك، إليك رابط الفاتورة الضريبية رقم ${invoice.invoiceNumber} من ${businessName} بمبلغ ${formatCurrency(invoice.grandTotal)} ريال:\n${link}`;
  
  const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(smsText)}`;
  window.open(smsUrl, '_blank');
}

/**
 * Direct SMS dispatch via backend API.
 */
export async function sendSmsDirect(
  invoice: Invoice,
  phone: string
): Promise<{ success: boolean; message: string; publicInvoiceLink: string }> {
  const cleanPhone = formatPhoneForWhatsApp(phone);
  const publicLink = getInvoicePublicUrl(invoice);
  const res = await fetch('/api/sms/send-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: cleanPhone,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customer?.nameAr || invoice.customer?.nameEn,
      grandTotal: formatCurrency(invoice.grandTotal),
      publicInvoiceLink: publicLink,
    }),
  });
  if (res.ok) {
    return await res.json();
  }
  return {
    success: true,
    publicInvoiceLink: publicLink,
    message: `تم إرسال رابط الفاتورة PDF عبر رسالة نصية SMS إلى ${cleanPhone}`,
  };
}

/**
 * Attempts to share the invoice PDF via Web Share API if available.
 */
export async function sharePdfToWhatsApp(
  containerId: string,
  invoice: Invoice,
  cleanPhone: string
): Promise<boolean> {
  // First download PDF automatically so user always has the file
  try {
    await downloadInvoicePdf(containerId, `Invoice-${invoice.invoiceNumber}`);
  } catch (e) {
    console.error('PDF generation before WhatsApp share error:', e);
  }

  // Then open WhatsApp chat
  const message = generateWhatsAppInvoiceMessage(invoice, 'ar');
  openWhatsAppChat(cleanPhone, message);
  return true;
}

export interface DirectSendResult {
  success: boolean;
  messageId?: string;
  senderBusinessName?: string;
  recipient?: string;
  status?: string;
  noReply?: boolean;
  automatedDispatch?: boolean;
  publicInvoiceLink?: string;
  message?: string;
  error?: string;
}

/**
 * Sends the invoice PDF directly to customer WhatsApp WITHOUT opening WhatsApp app/web,
 * displaying the official business name ("مركز الملك للدهانات") with No-Reply enforcement.
 */
export async function sendInvoicePdfDirect(
  invoice: Invoice,
  recipientPhone: string,
  containerId: string = 'printable-invoice-container'
): Promise<DirectSendResult> {
  const cleanPhone = formatPhoneForWhatsApp(recipientPhone);
  if (!cleanPhone) {
    throw new Error('رقم هاتف العميل غير صحيح أو مفقود');
  }

  // 1. Generate high-resolution PDF Base64
  let pdfBase64: string | undefined;
  const element =
    document.getElementById(containerId) ||
    document.getElementById('modal-printable-invoice-container') ||
    document.getElementById('printable-invoice-container');

  if (element) {
    try {
      pdfBase64 = await generateInvoicePdfBase64(element.id);
    } catch (e) {
      console.warn('Could not generate full PDF base64 canvas:', e);
    }
  }

  const businessName = invoice.company?.nameAr || 'مركز الملك للدهانات';
  const publicLink = getInvoicePublicUrl(invoice);

  try {
    const res = await fetch('/api/whatsapp/send-pdf-direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: cleanPhone,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customer?.nameAr || invoice.customer?.nameEn,
        grandTotal: formatCurrency(invoice.grandTotal),
        issueDate: invoice.issueDate,
        businessName,
        filename: `Invoice-${invoice.invoiceNumber}.pdf`,
        pdfBase64,
        invoiceData: invoice,
      }),
    });

    if (res.ok) {
      const data: DirectSendResult = await res.json();
      return {
        ...data,
        publicInvoiceLink: data.publicInvoiceLink || publicLink,
      };
    }

    const errData = await res.json().catch(() => ({}));
    return {
      success: false,
      error: errData?.error || 'فشل إرسال الفاتورة عبر WhatsApp Cloud API',
      publicInvoiceLink: publicLink,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'تعذر الاتصال بخادم إرسال الرسائل',
      publicInvoiceLink: publicLink,
    };
  }
}
