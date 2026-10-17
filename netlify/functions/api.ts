// Netlify Serverless Function for API routes
// Handles /api/invoices/:id, /api/invoices/publish, /api/sms/*, /api/whatsapp/*

const publishedInvoices = new Map<string, any>();

export const handler = async (event: any, context: any) => {
  const method = event.httpMethod || 'GET';
  const path = event.path || '';

  // Extract relative sub-path after /api/ or /.netlify/functions/api/
  let subpath = path.replace('/.netlify/functions/api', '').replace('/api', '');
  if (!subpath.startsWith('/')) subpath = '/' + subpath;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    let body: any = {};
    if (event.body) {
      try {
        body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf-8') : event.body);
      } catch {
        body = {};
      }
    }

    // 1. GET /invoices/:id
    if (method === 'GET' && subpath.startsWith('/invoices/')) {
      const id = decodeURIComponent(subpath.replace('/invoices/', '')).trim();
      const inv = publishedInvoices.get(id) || publishedInvoices.get(id.toUpperCase());
      if (inv) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, invoice: inv }),
        };
      }
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'Invoice not found on server' }),
      };
    }

    // 2. POST /invoices/publish
    if (method === 'POST' && subpath === '/invoices/publish') {
      const { invoice } = body;
      if (invoice && (invoice.id || invoice.invoiceNumber)) {
        if (invoice.id) publishedInvoices.set(invoice.id, invoice);
        if (invoice.invoiceNumber) {
          publishedInvoices.set(invoice.invoiceNumber, invoice);
          publishedInvoices.set(invoice.invoiceNumber.toUpperCase(), invoice);
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true }),
        };
      }
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid invoice payload' }),
      };
    }

    // 3. POST /invoices/bulk-publish
    if (method === 'POST' && subpath === '/invoices/bulk-publish') {
      const { invoices } = body;
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
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, count: invoices.length }),
        };
      }
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid invoices array' }),
      };
    }

    // 4. GET /sms/config
    if (method === 'GET' && subpath === '/sms/config') {
      const hasTaqnyat = !!(process.env.TAQNYAT_BEARER_TOKEN || process.env.SMS_API_KEY);
      const hasTwilio = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          configured: hasTaqnyat || hasTwilio,
          provider: hasTaqnyat ? 'taqnyat' : hasTwilio ? 'twilio' : 'none',
          senderId: process.env.SMS_SENDER_ID || 'MarkazAlMalk',
          hasTaqnyatToken: hasTaqnyat,
          hasTwilio,
          defaultBusinessName: 'مركز الملك للدهانات',
        }),
      };
    }

    // 5. POST /sms/send-branded
    if (method === 'POST' && subpath === '/sms/send-branded') {
      const { phone, invoiceNumber, grandTotal, senderId = 'MarkazAlMalk', businessName = 'مركز الملك للدهانات', publicInvoiceLink, invoiceData } = body;

      if (!phone || !invoiceNumber) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'رقم هاتف العميل ورقم الفاتورة مطلوبان' }),
        };
      }

      if (invoiceData) {
        if (invoiceData.id) publishedInvoices.set(invoiceData.id, invoiceData);
        if (invoiceNumber) {
          publishedInvoices.set(invoiceNumber, invoiceData);
          publishedInvoices.set(invoiceNumber.toUpperCase(), invoiceData);
        }
      }

      let cleanPhone = phone.trim().replace(/[^\d+]/g, '');
      if (cleanPhone.startsWith('+')) cleanPhone = cleanPhone.substring(1);
      if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2);
      if (cleanPhone.startsWith('05') && cleanPhone.length === 10) cleanPhone = '966' + cleanPhone.substring(1);
      else if (cleanPhone.startsWith('5') && cleanPhone.length === 9) cleanPhone = '966' + cleanPhone;

      const appBase = process.env.URL || process.env.DEPLOY_URL || 'https://' + (event.headers?.host || 'localhost:3000');
      const finalLink = publicInvoiceLink || `${appBase}/?inv=${encodeURIComponent(invoiceNumber)}`;

      const smsBody =
        `مركز الملك للدهانات (Markaz Al Malk Paint)\n` +
        `فاتورة ضريبية مبسطة رقم: ${invoiceNumber}\n` +
        `المبلغ المستحق: ${grandTotal} ريال سعودي\n\n` +
        `رابط عرض وتحميل الفاتورة PDF:\n` +
        `${finalLink}`;

      const directSmsUrl = `sms:+${cleanPhone}?body=${encodeURIComponent(smsBody)}`;

      // Try Taqnyat if token is in environment
      const taqnyatToken = process.env.TAQNYAT_BEARER_TOKEN || process.env.SMS_API_KEY;
      if (taqnyatToken && taqnyatToken.trim()) {
        try {
          const taqRes = await fetch('https://api.taqnyat.sa/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${taqnyatToken.trim()}`,
            },
            body: JSON.stringify({
              recipients: [cleanPhone],
              body: smsBody,
              sender: senderId,
            }),
          });
          const taqData = await taqRes.json().catch(() => ({}));
          if (taqRes.ok && taqData.statusCode === 201) {
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: true,
                messageId: taqData.msgId || `taq_${Date.now()}`,
                senderId,
                senderDisplayName: `${businessName} (${senderId})`,
                recipient: cleanPhone,
                status: 'DELIVERED',
                channel: 'Taqnyat Saudi Telecom SMS Gateway',
                personalNumberHidden: true,
                publicInvoiceLink: finalLink,
                smsText: smsBody,
                message: `تم إرسال رسالة SMS عبر تقنيات إلى شريحة العميل (+${cleanPhone}) باسم المرسل "${senderId}".`,
              }),
            };
          }
        } catch (e: any) {
          console.error('Netlify Taqnyat error:', e);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          gatewayConfigured: false,
          requiresGateway: true,
          directSmsUrl,
          senderId,
          senderDisplayName: `${businessName} (${senderId})`,
          recipient: cleanPhone,
          publicInvoiceLink: finalLink,
          smsText: smsBody,
          error: 'لم يتم ربط مفتاح بوابة الـ SMS (Taqnyat أو Twilio) بعد في إعدادات Netlify Environment Variables.',
        }),
      };
    }

    // 6. GET /whatsapp/config
    if (method === 'GET' && subpath === '/whatsapp/config') {
      const configured = !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          configured,
          defaultBusinessName: 'مركز الملك للدهانات',
          noReplyEnabled: true,
        }),
      };
    }

    // Fallback 404
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: `Not Found: ${method} ${subpath}` }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
    };
  }
};
