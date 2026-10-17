import { InvoiceItem, PricingMode } from '../types';

/**
 * Decimal-safe rounding to two decimal places
 */
export function round2(value: number): number {
  if (isNaN(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Format currency number to two decimal places string e.g. "156.00"
 */
export function formatCurrency(amount: number): string {
  const rounded = round2(amount);
  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Calculates a single invoice line item according to Saudi VAT regulations and chosen pricing mode.
 *
 * MODE A: INCLUSIVE (The entered unitPrice already includes VAT)
 *  - Line Gross with VAT = quantity * unitPrice
 *  - If discount percent given, discountAmount = Gross * (percent / 100)
 *  - Effective Gross after discount = Gross - discountAmount
 *  - VAT Amount = Effective Gross * (vatRate / (100 + vatRate))
 *  - Subtotal Before VAT = Effective Gross - VAT Amount
 *  - Subtotal With VAT = Effective Gross
 *
 * MODE B: EXCLUSIVE (The entered unitPrice excludes VAT)
 *  - Line Gross before VAT = quantity * unitPrice
 *  - If discount percent given, discountAmount = Gross * (percent / 100)
 *  - Subtotal Before VAT (Taxable) = Gross - discountAmount
 *  - VAT Amount = Subtotal Before VAT * (vatRate / 100)
 *  - Subtotal With VAT = Subtotal Before VAT + VAT Amount
 */
export function calculateLineItem(
  item: Omit<InvoiceItem, 'subtotalBeforeVat' | 'vatAmount' | 'subtotalWithVat'>,
  pricingMode: PricingMode
): InvoiceItem {
  const qty = Math.max(0, item.quantity || 0);
  const price = Math.max(0, item.unitPrice || 0);
  const vatRate = Math.max(0, item.vatRate ?? 15);
  
  let lineGross = qty * price;
  
  // Calculate discount
  let discountAmount = item.discountAmount || 0;
  if (item.discountPercent && item.discountPercent > 0) {
    discountAmount = (lineGross * Math.min(100, item.discountPercent)) / 100;
  }
  discountAmount = Math.min(lineGross, discountAmount);
  
  const effectiveAmount = Math.max(0, lineGross - discountAmount);

  let subtotalBeforeVat = 0;
  let vatAmount = 0;
  let subtotalWithVat = 0;

  if (vatRate === 0) {
    // Zero-rated / exempt
    subtotalBeforeVat = round2(effectiveAmount);
    vatAmount = 0;
    subtotalWithVat = round2(effectiveAmount);
  } else if (pricingMode === 'INCLUSIVE') {
    // MODE A — VAT INCLUDED
    // Effective amount already includes VAT.
    // Formula: VAT Amount = VAT-Inclusive Price * vatRate / (100 + vatRate)
    vatAmount = round2((effectiveAmount * vatRate) / (100 + vatRate));
    subtotalBeforeVat = round2(effectiveAmount - vatAmount);
    subtotalWithVat = round2(effectiveAmount);
  } else {
    // MODE B — VAT EXCLUDED
    // Effective amount is before VAT.
    // Formula: VAT Amount = Price Before VAT * vatRate / 100
    subtotalBeforeVat = round2(effectiveAmount);
    vatAmount = round2((subtotalBeforeVat * vatRate) / 100);
    subtotalWithVat = round2(subtotalBeforeVat + vatAmount);
  }

  return {
    ...item,
    quantity: qty,
    unitPrice: price,
    vatRate,
    discountPercent: item.discountPercent || 0,
    discountAmount: round2(discountAmount),
    subtotalBeforeVat,
    vatAmount,
    subtotalWithVat,
  };
}

export interface InvoiceCalculatedTotals {
  subtotalBeforeVat: number; // total before VAT & before invoice-level discount
  totalDiscount: number;      // sum of all discounts
  taxableAmount: number;      // net taxable amount
  totalVat: number;           // total VAT collected
  grandTotal: number;         // final invoice amount payable
}

/**
 * Aggregates all line items to calculate invoice totals.
 */
export function calculateInvoiceTotals(
  items: InvoiceItem[],
  pricingMode: PricingMode,
  invoiceDiscount: number = 0 // optional invoice-level discount in SAR
): InvoiceCalculatedTotals {
  let lineTotalDiscount = 0;
  let sumSubtotalBeforeVat = 0;
  let sumVat = 0;
  let sumGrandTotal = 0;

  items.forEach((it) => {
    lineTotalDiscount += it.discountAmount;
    sumSubtotalBeforeVat += it.subtotalBeforeVat;
    sumVat += it.vatAmount;
    sumGrandTotal += it.subtotalWithVat;
  });

  const totalDiscount = round2(lineTotalDiscount + invoiceDiscount);

  // If there is an additional overall invoice discount, adjust proportionally
  let finalSubtotalBeforeVat = round2(sumSubtotalBeforeVat);
  let finalVat = round2(sumVat);
  let grandTotal = round2(sumGrandTotal - invoiceDiscount);

  if (invoiceDiscount > 0) {
    if (pricingMode === 'INCLUSIVE') {
      // Standard 15% rate applied to net
      finalVat = round2((grandTotal * 15) / 115);
      finalSubtotalBeforeVat = round2(grandTotal - finalVat);
    } else {
      // Exclusive
      finalSubtotalBeforeVat = round2(finalSubtotalBeforeVat - invoiceDiscount);
      finalVat = round2((finalSubtotalBeforeVat * 15) / 100);
      grandTotal = round2(finalSubtotalBeforeVat + finalVat);
    }
  }

  return {
    subtotalBeforeVat: round2(finalSubtotalBeforeVat),
    totalDiscount: round2(totalDiscount),
    taxableAmount: round2(finalSubtotalBeforeVat),
    totalVat: round2(finalVat),
    grandTotal: Math.max(0, round2(grandTotal)),
  };
}
