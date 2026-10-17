/**
 * Saudi Arabia ZATCA (Zakat, Tax and Customs Authority)
 * Simplified Tax Invoice (فاتورة ضريبية مبسطة) TLV QR Code Generator & Decoder.
 *
 * Implements the official Tag-Length-Value (TLV) encoding standard:
 * Tag 1: Seller's Name (UTF-8)
 * Tag 2: Seller's VAT Registration Number (15 digits)
 * Tag 3: Invoice Timestamp (ISO 8601 string)
 * Tag 4: Invoice Total (with VAT) string e.g. "156.00"
 * Tag 5: Total VAT Amount string e.g. "20.35"
 */

export interface ZatcaQrFields {
  sellerName: string;
  vatNumber: string;
  timestamp: string; // ISO 8601 e.g. 2026-10-14T10:30:00Z
  grandTotal: string; // formatted e.g. "156.00"
  totalVat: string; // formatted e.g. "20.35"
}

export interface DecodedTlvTag {
  tag: number;
  tagName: string;
  length: number;
  value: string;
}

const TAG_NAMES: Record<number, string> = {
  1: "Seller Name (اسم المورد)",
  2: "VAT Registration Number (الرقم الضريبي)",
  3: "Invoice Timestamp (تاريخ ووقت الفاتورة)",
  4: "Invoice Total with VAT (إجمالي الفاتورة مع الضريبة)",
  5: "Total VAT (مجموع ضريبة القيمة المضافة)",
  6: "Invoice Hash (تجزئة الفاتورة)",
  7: "ECDSA Signature (توقيع التشفير)",
  8: "Public Key (المفتاح العام)",
  9: "Cryptographic Stamp (الختم الرقمي)",
};

/**
 * Encodes a string into a TLV Uint8Array block for a given tag number.
 */
function encodeTag(tagNumber: number, value: string): Uint8Array {
  const encoder = new TextEncoder();
  const valueBytes = encoder.encode(value);
  const length = valueBytes.length;

  // Single-byte tag + single-byte length (ZATCA phase 1/2 standard for tags 1-5 < 256 bytes)
  const tlv = new Uint8Array(2 + length);
  tlv[0] = tagNumber;
  tlv[1] = length;
  tlv.set(valueBytes, 2);

  return tlv;
}

/**
 * Converts a Uint8Array into a Base64 string
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts a Base64 string back into Uint8Array
 */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates the official ZATCA TLV Base64 string for Simplified Tax Invoices
 */
export function generateZatcaTlvBase64(fields: ZatcaQrFields): string {
  const t1 = encodeTag(1, fields.sellerName || '');
  const t2 = encodeTag(2, fields.vatNumber || '');
  const t3 = encodeTag(3, fields.timestamp || new Date().toISOString());
  const t4 = encodeTag(4, fields.grandTotal || '0.00');
  const t5 = encodeTag(5, fields.totalVat || '0.00');

  const totalLength = t1.length + t2.length + t3.length + t4.length + t5.length;
  const combined = new Uint8Array(totalLength);

  let offset = 0;
  [t1, t2, t3, t4, t5].forEach((tagBytes) => {
    combined.set(tagBytes, offset);
    offset += tagBytes.length;
  });

  return bytesToBase64(combined);
}

/**
 * Decodes a ZATCA TLV Base64 string to verify compliance and inspect individual tags
 */
export function decodeZatcaTlvBase64(base64: string): DecodedTlvTag[] {
  const results: DecodedTlvTag[] = [];
  try {
    const bytes = base64ToBytes(base64);
    const decoder = new TextDecoder('utf-8');
    let i = 0;

    while (i < bytes.length) {
      const tag = bytes[i];
      const length = bytes[i + 1];
      if (length === undefined || i + 2 + length > bytes.length) {
        break;
      }
      const valBytes = bytes.slice(i + 2, i + 2 + length);
      const value = decoder.decode(valBytes);

      results.push({
        tag,
        tagName: TAG_NAMES[tag] || `Tag ${tag}`,
        length,
        value,
      });

      i += 2 + length;
    }
  } catch (err) {
    console.error('Failed to decode ZATCA TLV:', err);
  }
  return results;
}
