import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // JSON parser with generous payload limit for base64 PDF
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // In-memory & disk-backed store of published invoices accessible to customers via direct link
  const publishedInvoices = new Map<string, any>();
  const DATA_DIR = path.resolve(__dirname, '.data');
  const INVOICES_FILE = path.join(DATA_DIR, 'published_invoices.json');

  // Load persisted invoices on startup
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(INVOICES_FILE)) {
      const raw = fs.readFileSync(INVOICES_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        data.forEach((inv: any) => {
          if (inv?.id) publishedInvoices.set(inv.id, inv);
          if (inv?.invoiceNumber) {
            publishedInvoices.set(inv.invoiceNumber, inv);
            publishedInvoices.set(inv.invoiceNumber.toUpperCase(), inv);
          }
        });
      }
    }
  } catch (err) {
    console.warn('Failed to load persisted invoices:', err);
  }

  function persistInvoicesToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      // Gather unique invoices by ID
      const unique = Array.from(new Set(Array.from(publishedInvoices.values())));
      fs.writeFileSync(INVOICES_FILE, JSON.stringify(unique, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to save invoices to disk:', err);
    }
  }

  // Endpoint to fetch invoice by invoice number or id (for external customers)
  app.get('/api/invoices/:id', (req, res) => {
    const key = req.params.id;
    const inv = publishedInvoices.get(key) || publishedInvoices.get(key.toUpperCase());
    if (inv) {
      return res.json({ success: true, invoice: inv });
    }
    return res.status(404).json({ success: false, error: 'Invoice not found on server' });
  });

  // Endpoint to store single invoice snapshot
  app.post('/api/invoices/publish', (req, res) => {
    const { invoice } = req.body;
    if (invoice && (invoice.id || invoice.invoiceNumber)) {
      if (invoice.id) publishedInvoices.set(invoice.id, invoice);
      if (invoice.invoiceNumber) {
        publishedInvoices.set(invoice.invoiceNumber, invoice);
        publishedInvoices.set(invoice.invoiceNumber.toUpperCase(), invoice);
      }
      persistInvoicesToDisk();
      return res.json({ success: true });
    }
    return res.status(400).json({ success: false, error: 'Invalid invoice payload' });
  });

  // Endpoint to bulk store invoices from client
  app.post('/api/invoices/bulk-publish', (req, res) => {
    const { invoices } = req.body;
    if (Array.isArray(invoices)) {
      invoices.forEach((inv: any) => {
        if (inv && (inv.id || inv.invoiceNumber)) {
          if (inv.id) publishedInvoices.set(inv.id, inv);
          if (inv.invoiceNumber) {
            publishedInvoices.set(inv.invoiceNumber, inv);
            publishedInvoices.set(inv.invoiceNumber.toUpperCase(), inv);
          }
        }
      });
      persistInvoicesToDisk();
      return res.json({ success: true, count: invoices.length });
    }
    return res.status(400).json({ success: false, error: 'Invalid invoices array' });
  });

  // SMS Gateway Configuration store
  const SMS_CONFIG_FILE = path.join(DATA_DIR, 'sms_gateway_config.json');
  interface SmsGatewayConfig {
    provider: 'taqnyat' | 'twilio' | 'none';
    taqnyatToken?: string;
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    twilioFrom?: string;
    senderId: string;
    enabled: boolean;
  }

  let smsGatewayConfig: SmsGatewayConfig = {
    provider: (process.env.TAQNYAT_BEARER_TOKEN || process.env.SMS_API_KEY) ? 'taqnyat' : (process.env.TWILIO_ACCOUNT_SID ? 'twilio' : 'none'),
    taqnyatToken: process.env.TAQNYAT_BEARER_TOKEN || process.env.SMS_API_KEY || '',
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
    twilioFrom: process.env.TWILIO_FROM || 'MarkazAlMalk',
    senderId: process.env.SMS_SENDER_ID || 'MarkazAlMalk',
    enabled: true,
  };

  try {
    if (fs.existsSync(SMS_CONFIG_FILE)) {
      const raw = fs.readFileSync(SMS_CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      smsGatewayConfig = { ...smsGatewayConfig, ...parsed };
    }
  } catch (e) {
    console.warn('Could not read SMS gateway config:', e);
  }

  const persistSmsConfig = () => {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(SMS_CONFIG_FILE, JSON.stringify(smsGatewayConfig, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to persist SMS config:', e);
    }
  };

  // Get SMS gateway status (masks secrets)
  app.get('/api/sms/config', (req, res) => {
    const hasTaqnyat = !!(smsGatewayConfig.taqnyatToken && smsGatewayConfig.taqnyatToken.trim());
    const hasTwilio = !!(smsGatewayConfig.twilioAccountSid && smsGatewayConfig.twilioAuthToken);
    res.json({
      configured: hasTaqnyat || hasTwilio,
      provider: smsGatewayConfig.provider,
      senderId: smsGatewayConfig.senderId || 'MarkazAlMalk',
      hasTaqnyatToken: hasTaqnyat,
      hasTwilio: hasTwilio,
      defaultBusinessName: 'مركز الملك للدهانات',
    });
  });

  // Save SMS gateway config
  app.post('/api/sms/config', (req, res) => {
    const { provider, taqnyatToken, twilioAccountSid, twilioAuthToken, twilioFrom, senderId } = req.body;
    if (provider) smsGatewayConfig.provider = provider;
    if (taqnyatToken !== undefined) smsGatewayConfig.taqnyatToken = taqnyatToken.trim();
    if (twilioAccountSid !== undefined) smsGatewayConfig.twilioAccountSid = twilioAccountSid.trim();
    if (twilioAuthToken !== undefined) smsGatewayConfig.twilioAuthToken = twilioAuthToken.trim();
    if (twilioFrom !== undefined) smsGatewayConfig.twilioFrom = twilioFrom.trim();
    if (senderId !== undefined) smsGatewayConfig.senderId = senderId.trim();
    persistSmsConfig();
    res.json({
      success: true,
      configured: !!(smsGatewayConfig.taqnyatToken || (smsGatewayConfig.twilioAccountSid && smsGatewayConfig.twilioAuthToken)),
    });
  });

  // Branded SMS endpoint: Dispatches real cellular SMS via Gateway (Taqnyat / Twilio)
  // Or returns direct native mobile SMS fallback if gateway is not linked yet
  app.post('/api/sms/send-branded', async (req, res) => {
    try {
      const {
        phone,
        invoiceNumber,
        customerName,
        grandTotal,
        senderId = smsGatewayConfig.senderId || 'MarkazAlMalk',
        businessName = 'مركز الملك للدهانات',
        publicInvoiceLink,
        invoiceData,
      } = req.body;

      if (!phone || !invoiceNumber) {
        return res.status(400).json({
          success: false,
          error: 'رقم هاتف العميل ورقم الفاتورة مطلوبان',
        });
      }

      // Cache invoice snapshot for instant customer link access
      if (invoiceData) {
        if (invoiceData.id) publishedInvoices.set(invoiceData.id, invoiceData);
        if (invoiceNumber) {
          publishedInvoices.set(invoiceNumber, invoiceData);
          publishedInvoices.set(invoiceNumber.toUpperCase(), invoiceData);
        }
        persistInvoicesToDisk();
      }

      // Format recipient phone number
      let cleanPhone = phone.trim().replace(/[^\d+]/g, '');
      if (cleanPhone.startsWith('+')) cleanPhone = cleanPhone.substring(1);
      if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2);
      if (cleanPhone.startsWith('05') && cleanPhone.length === 10) {
        cleanPhone = '966' + cleanPhone.substring(1);
      } else if (cleanPhone.startsWith('5') && cleanPhone.length === 9) {
        cleanPhone = '966' + cleanPhone;
      }

      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const appBase = process.env.APP_URL || `${protocol}://${host}`;
      const finalLink = publicInvoiceLink || `${appBase}/?inv=${encodeURIComponent(invoiceNumber)}`;

      const smsBody =
        `مركز الملك للدهانات (Markaz Al Malk Paint)\n` +
        `فاتورة ضريبية مبسطة رقم: ${invoiceNumber}\n` +
        `المبلغ المستحق: ${grandTotal} ريال سعودي\n\n` +
        `رابط عرض وتحميل الفاتورة PDF:\n` +
        `${finalLink}`;

      const directSmsUrl = `sms:+${cleanPhone}?body=${encodeURIComponent(smsBody)}`;

      // 1. Check Taqnyat Saudi SMS Gateway (api.taqnyat.sa)
      const taqnyatToken = smsGatewayConfig.taqnyatToken || process.env.TAQNYAT_BEARER_TOKEN || process.env.SMS_API_KEY;
      if (taqnyatToken && taqnyatToken.trim()) {
        try {
          const taqnyatRes = await fetch('https://api.taqnyat.sa/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${taqnyatToken.trim()}`,
            },
            body: JSON.stringify({
              recipients: [cleanPhone],
              body: smsBody,
              sender: senderId,
            }),
          });
          const taqnyatData = await taqnyatRes.json().catch(() => ({}));
          if (taqnyatRes.ok && taqnyatData.statusCode === 201) {
            return res.json({
              success: true,
              messageId: taqnyatData.msgId || `taq_${Date.now()}`,
              senderId: senderId,
              senderDisplayName: `${businessName} (${senderId})`,
              recipient: cleanPhone,
              status: 'DELIVERED',
              channel: 'Taqnyat Saudi Telecom SMS Gateway',
              personalNumberHidden: true,
              publicInvoiceLink: finalLink,
              smsText: smsBody,
              message: `تم إرسال رسالة SMS الحقيقية عبر شبكة تقنيات إلى شريحة العميل (+${cleanPhone}) باسم المرسل "${senderId}" بنجاح.`,
            });
          } else {
            console.warn('Taqnyat returned non-success:', taqnyatData);
            return res.status(400).json({
              success: false,
              gatewayConfigured: true,
              error: taqnyatData.message || 'خطأ في رصيد أو اسم مرسل بوابة تقنيات Taqnyat',
              directSmsUrl,
              publicInvoiceLink: finalLink,
              smsText: smsBody,
              recipient: cleanPhone,
            });
          }
        } catch (taqErr: any) {
          console.error('Taqnyat connection error:', taqErr);
        }
      }

      // 2. Check Twilio Gateway
      const twilioSid = smsGatewayConfig.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
      const twilioAuth = smsGatewayConfig.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
      if (twilioSid && twilioAuth) {
        try {
          const params = new URLSearchParams();
          params.append('To', '+' + cleanPhone);
          params.append('From', smsGatewayConfig.twilioFrom || senderId);
          params.append('Body', smsBody);

          const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64'),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params,
          });
          const twilioData = await twilioRes.json().catch(() => ({}));
          if (twilioRes.ok && twilioData.sid) {
            return res.json({
              success: true,
              messageId: twilioData.sid,
              senderId: smsGatewayConfig.twilioFrom || senderId,
              senderDisplayName: `${businessName} (${senderId})`,
              recipient: cleanPhone,
              status: 'DELIVERED',
              channel: 'Twilio Cellular Gateway',
              personalNumberHidden: true,
              publicInvoiceLink: finalLink,
              smsText: smsBody,
              message: `تم إرسال رسالة SMS بنجاح عبر Twilio إلى شريحة العميل (+${cleanPhone}) باسم "${senderId}".`,
            });
          } else {
            return res.status(400).json({
              success: false,
              gatewayConfigured: true,
              error: twilioData.message || 'خطأ من بوابة Twilio',
              directSmsUrl,
              publicInvoiceLink: finalLink,
              smsText: smsBody,
              recipient: cleanPhone,
            });
          }
        } catch (twErr: any) {
          console.error('Twilio connection error:', twErr);
        }
      }

      // 3. If no active gateway account is configured, return explicit notice and native fallback
      return res.json({
        success: false,
        gatewayConfigured: false,
        requiresGateway: true,
        directSmsUrl,
        senderId,
        senderDisplayName: `${businessName} (${senderId})`,
        recipient: cleanPhone,
        publicInvoiceLink: finalLink,
        smsText: smsBody,
        error: 'لم يتم ربط مفتاح بوابة الـ SMS (Taqnyat أو Twilio) لإرسال الرسائل لشبكات الاتصالات باسم "Markaz Al Malk Paint".',
        notice: 'تنبيه شبكات الاتصالات: لإرسال رسالة نصية يظهر فيها اسم "Markaz Al Malk Paint" بدلاً من رقم الهاتف، يلزم تفعيل حساب بوابة رسائل مثل Taqnyat.sa أو Twilio.',
      });
    } catch (err: any) {
      console.error('Branded SMS error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'فشل معالجة رسالة الـ SMS',
      });
    }
  });

  // WhatsApp Meta Cloud API Configuration store
  const WHATSAPP_CONFIG_FILE = path.join(DATA_DIR, 'whatsapp_config.json');
  const PDF_DIR = path.join(DATA_DIR, 'pdfs');
  if (!fs.existsSync(PDF_DIR)) {
    try {
      fs.mkdirSync(PDF_DIR, { recursive: true });
    } catch (e) {
      console.warn('Could not create pdf dir:', e);
    }
  }

  interface WhatsAppConfig {
    phoneNumberId?: string;
    accessToken?: string;
    businessName: string;
  }

  // Validates real Meta credentials and rejects dummy placeholders like '5752', '1234', etc.
  const isValidMetaCredentials = (pId?: string, tok?: string): boolean => {
    if (!pId || !tok) return false;
    const p = pId.trim();
    const t = tok.trim();
    // Valid Meta Phone ID is numeric and at least 10 digits
    if (p.length < 10 || !/^\d+$/.test(p)) return false;
    // Valid Meta Access Token starts with 'EAA' and has at least 30 characters
    if (t.length < 30 || !t.startsWith('EAA')) return false;
    return true;
  };

  let whatsappConfig: WhatsAppConfig = {
    phoneNumberId: isValidMetaCredentials(process.env.WHATSAPP_PHONE_NUMBER_ID, process.env.WHATSAPP_ACCESS_TOKEN)
      ? process.env.WHATSAPP_PHONE_NUMBER_ID
      : '',
    accessToken: isValidMetaCredentials(process.env.WHATSAPP_PHONE_NUMBER_ID, process.env.WHATSAPP_ACCESS_TOKEN)
      ? process.env.WHATSAPP_ACCESS_TOKEN
      : '',
    businessName: process.env.WHATSAPP_BUSINESS_NAME || 'مركز الملك للدهانات',
  };

  try {
    if (fs.existsSync(WHATSAPP_CONFIG_FILE)) {
      const raw = fs.readFileSync(WHATSAPP_CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (isValidMetaCredentials(parsed.phoneNumberId, parsed.accessToken)) {
        whatsappConfig = { ...whatsappConfig, ...parsed };
      } else if (parsed.businessName) {
        whatsappConfig.businessName = parsed.businessName;
      }
    }
  } catch (e) {
    console.warn('Could not read WhatsApp config:', e);
  }

  const persistWhatsConfig = () => {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(WHATSAPP_CONFIG_FILE, JSON.stringify(whatsappConfig, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Could not save WhatsApp config:', e);
    }
  };

  // Serve generated PDF files directly
  app.get('/api/pdf/:filename', (req, res) => {
    const safeFilename = path.basename(req.params.filename);
    const filePath = path.join(PDF_DIR, safeFilename);
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
      return res.sendFile(filePath);
    }
    return res.status(404).json({ error: 'PDF file not found' });
  });

  // WhatsApp Direct Business Cloud API Endpoint
  // Dispatches invoice PDF as a document via Meta WhatsApp Business API
  app.post('/api/whatsapp/send-pdf-direct', async (req, res) => {
    try {
      const {
        phone,
        invoiceNumber,
        customerName,
        grandTotal,
        issueDate,
        businessName = whatsappConfig.businessName || 'مركز الملك للدهانات',
        pdfBase64,
        filename,
        invoiceData,
        cloudApiConfig,
      } = req.body;

      if (!phone) {
        return res.status(400).json({
          success: false,
          error: 'Customer phone number is required (رقم هاتف العميل مطلوب)',
        });
      }

      // Cache invoice for direct link opening
      if (invoiceData) {
        if (invoiceData.id) publishedInvoices.set(invoiceData.id, invoiceData);
        if (invoiceNumber) {
          publishedInvoices.set(invoiceNumber, invoiceData);
          publishedInvoices.set(invoiceNumber.toUpperCase(), invoiceData);
        }
        persistInvoicesToDisk();
      }

      // Normalize phone number to international format (Saudi Arabia: 05xxxxxxxx -> 9665xxxxxxxx)
      let cleanPhone = phone.trim().replace(/[^\d+]/g, '');
      if (cleanPhone.startsWith('+')) cleanPhone = cleanPhone.substring(1);
      if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2);
      if (cleanPhone.startsWith('05') && cleanPhone.length === 10) {
        cleanPhone = '966' + cleanPhone.substring(1);
      } else if (cleanPhone.startsWith('5') && cleanPhone.length === 9) {
        cleanPhone = '966' + cleanPhone;
      }

      // Determine public invoice link and PDF link
      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const appBase = process.env.APP_URL || `${protocol}://${host}`;
      const publicInvoiceLink = `${appBase}/?inv=${encodeURIComponent(invoiceNumber)}`;

      const pdfFileName = filename || `Invoice-${invoiceNumber}.pdf`;
      const pdfFilePath = path.join(PDF_DIR, pdfFileName);
      let pdfBuffer: Buffer | null = null;

      if (pdfBase64 && typeof pdfBase64 === 'string') {
        try {
          const cleanB64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').replace(/^data:[^;]+;base64,/, '');
          pdfBuffer = Buffer.from(cleanB64, 'base64');
          fs.writeFileSync(pdfFilePath, pdfBuffer);
        } catch (e) {
          console.warn('Error saving PDF to disk:', e);
        }
      }

      const publicPdfUrl = `${appBase}/api/pdf/${encodeURIComponent(pdfFileName)}`;

      const resolvedPhoneId = (
        cloudApiConfig?.phoneNumberId ||
        invoiceData?.company?.whatsappPhoneNumberId ||
        whatsappConfig.phoneNumberId ||
        process.env.WHATSAPP_PHONE_NUMBER_ID ||
        ''
      ).trim();

      const resolvedToken = (
        cloudApiConfig?.accessToken ||
        invoiceData?.company?.whatsappAccessToken ||
        whatsappConfig.accessToken ||
        process.env.WHATSAPP_ACCESS_TOKEN ||
        ''
      ).trim();

      const hasValidMetaConfig = isValidMetaCredentials(resolvedPhoneId, resolvedToken);

      // Construct official No-Reply text with clickable PDF link
      const officialCaption =
        `📄 *فاتورة ضريبية مبسطة معتمدة (PDF)*\n` +
        `🏢 *المرسل:* ${businessName}\n` +
        `👤 *العميل:* ${customerName || 'عميل نقدي'}\n` +
        `🔢 *رقم الفاتورة:* ${invoiceNumber}\n` +
        `📅 *التاريخ:* ${issueDate}\n` +
        `💰 *الإجمالي المستحق:* ${grandTotal} ريال سعودي\n\n` +
        `🔗 *رابط العرض والتحقق:* ${publicInvoiceLink}\n\n` +
        `📢 *خدمة الإرسال الآلي (No-Reply Service):* تم إرسال هذه الفاتورة بصيغة مستند PDF رسمياً من نظام ${businessName}.`;

      // If valid Meta WhatsApp Business Cloud API credentials are configured
      if (hasValidMetaConfig) {
        try {
          // Step 1: Upload PDF buffer to Meta Media API if available
          let mediaId: string | null = null;
          if (pdfBuffer) {
            try {
              const formData = new FormData();
              formData.append('messaging_product', 'whatsapp');
              formData.append('type', 'application/pdf');
              const blob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });
              formData.append('file', blob, pdfFileName);

              const uploadRes = await fetch(
                `https://graph.facebook.com/v20.0/${resolvedPhoneId}/media`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${resolvedToken}`,
                  },
                  body: formData,
                }
              );

              if (uploadRes.ok) {
                const uploadJson: any = await uploadRes.json();
                if (uploadJson.id) {
                  mediaId = uploadJson.id;
                }
              } else {
                const uploadErr = await uploadRes.json().catch(() => ({}));
                console.info('Meta media upload failed, falling back to document link:', uploadErr);
              }
            } catch (uploadErr) {
              console.info('Meta media upload exception, falling back to document link:', uploadErr);
            }
          }

          // Step 2: Dispatch the invoice PDF as a DOCUMENT via Meta WhatsApp Business API
          const documentPayload: any = {
            caption: officialCaption,
            filename: pdfFileName,
          };
          if (mediaId) {
            documentPayload.id = mediaId;
          } else {
            documentPayload.link = publicPdfUrl;
          }

          const metaPayload: any = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'document',
            document: documentPayload,
          };

          const metaResponse = await fetch(
            `https://graph.facebook.com/v20.0/${resolvedPhoneId}/messages`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${resolvedToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(metaPayload),
            }
          );

          const metaResult = await metaResponse.json().catch(() => ({}));

          if (!metaResponse.ok) {
            const isOAuth = metaResult?.error?.type === 'OAuthException' || metaResult?.error?.code === 190;
            console.log(`[Meta Cloud Service] Notice: Response status ${metaResponse.status} (${isOAuth ? 'OAuth token refresh required' : 'API response'})`);
            return res.json({
              success: false,
              requiresMetaConfig: true,
              oauthException: isOAuth,
              directWhatsAppFallback: true,
              error: isOAuth
                ? 'تنبيه مصادقة Meta (OAuthException): رمز الوصول الدائم منتهي الصلاحية أو غير معتمد. يمكنك تحديث الرمز في الإعدادات، أو استخدام زر فتح محادثة العميل في واتساب للإرسال الفوري والمضمون 100%.'
                : (metaResult?.error?.message || 'تعذر استكمال الإرسال عبر Meta API. تحقق من صلاحية Access Token ومعرف الهاتف.'),
              publicInvoiceLink,
              publicPdfUrl,
            });
          } else {
            return res.json({
              success: true,
              messageId: metaResult?.messages?.[0]?.id || `wamid.HBgM${Date.now()}`,
              senderBusinessName: businessName,
              recipient: cleanPhone,
              status: 'DELIVERED',
              documentSent: true,
              filename: pdfFileName,
              mediaId: mediaId || undefined,
              noReply: true,
              metaLive: true,
              publicInvoiceLink,
              publicPdfUrl,
              timestamp: new Date().toISOString(),
              message: `تم إرسال الفاتورة كمستند PDF رسمي عبر Meta WhatsApp Business API إلى +${cleanPhone} باسم ${businessName}!`,
            });
          }
        } catch (metaError: any) {
          console.log('[Meta Cloud Service] Exception captured:', metaError?.message || 'Connection failed');
          return res.json({
            success: false,
            requiresMetaConfig: true,
            error: metaError?.message || 'خطأ في الاتصال بخوادم Meta WhatsApp',
            publicInvoiceLink,
            publicPdfUrl,
          });
        }
      }

      // Optional Demo Simulation Mode for testing PDF document dispatch without live Meta account
      if (req.body?.simulateDemo) {
        return res.json({
          success: true,
          messageId: `wamid.HBgM${Date.now()}_DEMO`,
          senderBusinessName: businessName,
          recipient: cleanPhone,
          status: 'DELIVERED',
          documentSent: true,
          filename: pdfFileName,
          noReply: true,
          metaLive: false,
          simulationMode: true,
          publicInvoiceLink,
          publicPdfUrl,
          timestamp: new Date().toISOString(),
          message: `[محاكاة Meta API] تم إرسال مستند الفاتورة PDF بنجاح إلى +${cleanPhone} باسم ${businessName}!`,
        });
      }

      // If Meta credentials are not valid or not yet configured
      return res.json({
        success: false,
        requiresMetaConfig: true,
        channel: 'Meta WhatsApp Business API',
        recipient: cleanPhone,
        status: 'SETUP_REQUIRED',
        publicInvoiceLink,
        publicPdfUrl,
        directWhatsAppFallback: true,
        error:
          'خدمة إرسال الفاتورة كمستند PDF عبر Meta WhatsApp Business API تتطلب إدخال معرف رقم هاتف صالح ورمز وصول دائم (يبدأ بـ EAA...). يمكنك إدخال البيانات في الإعدادات، أو استخدام زر "فتح محادثة العميل في واتساب" للإرسال الفوري والمؤكد.',
      });
    } catch (err: any) {
      console.error('WhatsApp direct send error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to dispatch WhatsApp document',
      });
    }
  });

  // WhatsApp Meta Cloud API Config endpoints
  app.get('/api/whatsapp/config', (_req, res) => {
    res.json({
      configured: !!(whatsappConfig.phoneNumberId && whatsappConfig.accessToken),
      phoneNumberId: whatsappConfig.phoneNumberId ? `${whatsappConfig.phoneNumberId.slice(0, 4)}...${whatsappConfig.phoneNumberId.slice(-4)}` : '',
      defaultBusinessName: whatsappConfig.businessName || 'مركز الملك للدهانات',
      noReplyEnabled: true,
    });
  });

  app.post('/api/whatsapp/config', (req, res) => {
    const { phoneNumberId, accessToken, businessName } = req.body;
    if (phoneNumberId !== undefined) whatsappConfig.phoneNumberId = phoneNumberId.trim();
    if (accessToken !== undefined) whatsappConfig.accessToken = accessToken.trim();
    if (businessName !== undefined) whatsappConfig.businessName = businessName.trim();
    persistWhatsConfig();
    res.json({
      success: true,
      configured: !!(whatsappConfig.phoneNumberId && whatsappConfig.accessToken),
      defaultBusinessName: whatsappConfig.businessName,
    });
  });

  // Mount Vite middlewares in development
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
