import { Invoice } from '../types';
import { formatCurrency } from './vatCalculations';
import { getInvoicePublicUrl } from './whatsappHelper';

/**
 * Normalizes phone numbers to standard international format (e.g. +9665xxxxxxxx).
 */
export function formatPhoneForSms(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  // Saudi Mobile: 05xxxxxxxx -> 9665xxxxxxxx
  if (cleaned.startsWith('05') && cleaned.length === 10) {
    cleaned = '966' + cleaned.substring(1);
  } else if (cleaned.startsWith('5') && cleaned.length === 9) {
    cleaned = '966' + cleaned;
  } else if (cleaned.startsWith('03') && cleaned.length === 11) {
    cleaned = '92' + cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Builds the official SMS text with Markaz Al Malk Paint sender branding and clickable PDF invoice link.
 * Does NOT contain any personal phone number.
 */
export function generateSmsInvoiceMessage(invoice: Invoice, lang: 'ar' | 'en' = 'ar'): string {
  const businessName = invoice.company?.nameAr || 'مركز الملك للدهانات';
  const publicLink = getInvoicePublicUrl(invoice);
  const total = formatCurrency(invoice.grandTotal);

  if (lang === 'en') {
    return (
      `Markaz Al Malk Paint\n` +
      `Simplified Tax Invoice: ${invoice.invoiceNumber}\n` +
      `Total: ${total} SAR\n\n` +
      `Direct PDF View & Download Link:\n` +
      `${publicLink}\n\n` +
      `(Click the link to view and download your official invoice)`
    );
  }

  return (
    `مركز الملك للدهانات (Markaz Al Malk Paint)\n` +
    `فاتورة ضريبية مبسطة رقم: ${invoice.invoiceNumber}\n` +
    `المبلغ المستحق: ${total} ريال سعودي\n\n` +
    `رابط عرض وتحميل الفاتورة PDF مباشرة:\n` +
    `${publicLink}\n\n` +
    `(اضغط على الرابط أعلاه لفتح وتحميل الفاتورة PDF فوراً على هاتفك)`
  );
}

export interface SmsSendResult {
  success: boolean;
  senderId: string;
  recipient: string;
  messageId?: string;
  publicInvoiceLink?: string;
  status?: string;
  message?: string;
  error?: string;
  gatewayConfigured?: boolean;
  requiresGateway?: boolean;
  directSmsUrl?: string;
  notice?: string;
}

/**
 * Directly opens the mobile device's native SMS application (Messages) with
 * the customer SIM number in 'To:' and the invoice link pre-filled.
 * Works 100% reliably on Android, iOS, and PC.
 */
export function openNativeDeviceSms(phone: string, message: string): void {
  const cleanPhone = formatPhoneForSms(phone);
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const separator = isIOS ? '&' : '?';
  const url = `sms:+${cleanPhone}${separator}body=${encodeURIComponent(message)}`;
  if (typeof window !== 'undefined') {
    window.location.href = url;
  }
}

/**
 * Dispatches Branded SMS via Gateway with Alphanumeric Sender ID: "MarkazAlMalk".
 * Sender's personal number is NEVER used or revealed.
 */
export async function sendBrandedSms(
  invoice: Invoice,
  recipientPhone: string
): Promise<SmsSendResult> {
  const cleanPhone = formatPhoneForSms(recipientPhone);
  if (!cleanPhone) {
    throw new Error('رقم هاتف / شريحة العميل غير صحيح أو مفقود');
  }

  const publicLink = getInvoicePublicUrl(invoice);
  const businessName = invoice.company?.nameAr || 'مركز الملك للدهانات';

  const res = await fetch('/api/sms/send-branded', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone: cleanPhone,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customer?.nameAr || invoice.customer?.nameEn || 'عميل نقدي',
      grandTotal: formatCurrency(invoice.grandTotal),
      issueDate: invoice.issueDate,
      senderId: 'MarkazAlMalk',
      businessName,
      publicInvoiceLink: publicLink,
      invoiceData: invoice,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    return data;
  }

  return {
    success: false,
    senderId: 'MarkazAlMalk',
    recipient: cleanPhone,
    status: 'FAILED',
    error: data?.error || 'فشل إرسال رسالة SMS',
    message: data?.error || 'فشل إرسال رسالة SMS',
    directSmsUrl: data?.directSmsUrl,
    gatewayConfigured: data?.gatewayConfigured,
    requiresGateway: data?.requiresGateway,
  };
}

export async function getSmsGatewayConfig() {
  try {
    const res = await fetch('/api/sms/config');
    return await res.json();
  } catch {
    return { configured: false, provider: 'none', senderId: 'MarkazAlMalk' };
  }
}

export async function saveSmsGatewayConfig(config: {
  provider: 'taqnyat' | 'twilio' | 'none';
  taqnyatToken?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFrom?: string;
  senderId?: string;
}) {
  const res = await fetch('/api/sms/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  return await res.json();
}
