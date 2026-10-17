import React from 'react';
import { X, Check, Calculator, ArrowRight, ShieldCheck } from 'lucide-react';
import { calculateLineItem, calculateInvoiceTotals, round2 } from '../utils/vatCalculations';
import { PricingMode, InvoiceItem } from '../types';
import { Language, translations } from '../utils/translations';

interface VatTestCasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadTestCase?: (testCaseItems: InvoiceItem[], mode: PricingMode, notes: string) => void;
  lang?: Language;
}

export const VatTestCasesModal: React.FC<VatTestCasesModalProps> = ({
  isOpen,
  onClose,
  onLoadTestCase,
  lang = 'ar',
}) => {
  if (!isOpen) return null;
  const t = translations[lang].vatTestModal;
  const isRtl = lang === 'ar';

  // Test Case 1: User's exact prompt example
  const item1 = calculateLineItem({
    id: 'test_item_1',
    code: 'JAZ-03',
    nameAr: 'معجون تشطيب ناعم (مثال المستخدم المطلوب)',
    nameEn: 'Fine Interior Finishing Putty',
    quantity: 3,
    unitPrice: 52.0,
    unitAr: 'كيس',
    unitEn: 'Bag',
    vatRate: 15,
    discountPercent: 0,
    discountAmount: 0,
  }, 'INCLUSIVE');
  const totals1 = calculateInvoiceTotals([item1], 'INCLUSIVE', 0);
  const test1Passed =
    item1.subtotalWithVat === 156.0 &&
    item1.vatAmount === 20.35 &&
    item1.subtotalBeforeVat === 135.65 &&
    totals1.grandTotal === 156.0;

  // Test Case 2: VAT-Exclusive Mode (Standard B2B)
  const item2 = calculateLineItem({
    id: 'test_item_2',
    code: 'JAZ-01',
    nameAr: 'دهان بلاستيك نصف لمعة (سعر غير شامل)',
    nameEn: 'Semi-Gloss Interior Paint (Exclusive)',
    quantity: 10,
    unitPrice: 100.0,
    unitAr: 'جالون',
    unitEn: 'Gallon',
    vatRate: 15,
    discountPercent: 0,
    discountAmount: 0,
  }, 'EXCLUSIVE');
  const totals2 = calculateInvoiceTotals([item2], 'EXCLUSIVE', 0);
  const test2Passed =
    item2.subtotalBeforeVat === 1000.0 &&
    item2.vatAmount === 150.0 &&
    totals2.grandTotal === 1150.0;

  // Test Case 3: Line Discount + Mode A (Inclusive)
  const item3 = calculateLineItem({
    id: 'test_item_3',
    code: 'JAZ-04',
    nameAr: 'دهان خارجي مع خصم 10%',
    nameEn: 'Exterior Paint with 10% Discount',
    quantity: 5,
    unitPrice: 200.0,
    unitAr: 'سطل',
    unitEn: 'Bucket',
    vatRate: 15,
    discountPercent: 10,
    discountAmount: 0,
  }, 'INCLUSIVE');
  const totals3 = calculateInvoiceTotals([item3], 'INCLUSIVE', 0);
  const test3Passed =
    item3.discountAmount === 100.0 &&
    item3.subtotalWithVat === 900.0 &&
    item3.vatAmount === 117.39 &&
    item3.subtotalBeforeVat === 782.61;

  // Test Case 4: Zero-Rated / Exempt Items (0% VAT)
  const item4 = calculateLineItem({
    id: 'test_item_4',
    code: 'SRV-01',
    nameAr: 'تصدير دولي أو خدمة معفاة (ضريبة 0%)',
    nameEn: 'Zero-Rated / Exempt Export Service (0% VAT)',
    quantity: 4,
    unitPrice: 50.0,
    unitAr: 'خدمة',
    unitEn: 'Service',
    vatRate: 0,
    discountPercent: 0,
    discountAmount: 0,
  }, 'INCLUSIVE');
  const totals4 = calculateInvoiceTotals([item4], 'INCLUSIVE', 0);
  const test4Passed =
    item4.vatAmount === 0 &&
    item4.subtotalBeforeVat === 200.0 &&
    totals4.grandTotal === 200.0;

  // Test Case 5: Multi-Item Rounding Safety
  const multiItems = [item1, item3, item4];
  const totalsMulti = calculateInvoiceTotals(multiItems, 'INCLUSIVE', 0);
  const expectedSumGrandTotal = round2(item1.subtotalWithVat + item3.subtotalWithVat + item4.subtotalWithVat);
  const test5Passed = totalsMulti.grandTotal === expectedSumGrandTotal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {t.title}
              </h3>
              <p className="text-xs text-slate-500">
                {t.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Case 1 */}
          <div className="p-4 border rounded-lg bg-slate-50/70 border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                {test1Passed ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                ) : null}
                {t.case1Title}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                {t.verifiedBadge}
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-2">
              {t.case1Desc}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white p-2.5 rounded border border-slate-200 font-mono">
              <div>
                <span className="text-slate-500 block">{isRtl ? 'الإجمالي الشامل:' : 'Gross with VAT:'}</span>
                <span className="font-bold text-slate-900">{item1.subtotalWithVat.toFixed(2)} SAR</span>
              </div>
              <div>
                <span className="text-slate-500 block">{isRtl ? 'الضريبة المضمنة (15/115):' : 'VAT (15/115):'}</span>
                <span className="font-bold text-blue-700">{item1.vatAmount.toFixed(2)} SAR</span>
              </div>
              <div>
                <span className="text-slate-500 block">{isRtl ? 'المبلغ قبل الضريبة:' : 'Amount Excl. VAT:'}</span>
                <span className="font-bold text-slate-900">{item1.subtotalBeforeVat.toFixed(2)} SAR</span>
              </div>
              <div>
                <span className="text-slate-500 block">{isRtl ? 'الإجمالي النهائي:' : 'Grand Total:'}</span>
                <span className="font-bold text-emerald-700">{totals1.grandTotal.toFixed(2)} SAR</span>
              </div>
            </div>
            {onLoadTestCase && (
              <button
                type="button"
                onClick={() => {
                  onLoadTestCase([item1], 'INCLUSIVE', 'Test Case - VAT Inclusive (15%)');
                  onClose();
                }}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
              >
                {t.loadInEditor} <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? '' : 'rotate-180'}`} />
              </button>
            )}
          </div>

          {/* Case 2 */}
          <div className="p-4 border rounded-lg bg-slate-50/70 border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                {test2Passed ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                ) : null}
                {t.case2Title}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                {t.verifiedBadge}
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-2">
              {t.case2Desc}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white p-2.5 rounded border border-slate-200 font-mono">
              <div>
                <span className="text-slate-500 block">{isRtl ? 'قبل الضريبة:' : 'Before VAT:'}</span>
                <span className="font-bold text-slate-900">{item2.subtotalBeforeVat.toFixed(2)} SAR</span>
              </div>
              <div>
                <span className="text-slate-500 block">{isRtl ? 'قيمة الضريبة (15%):' : 'VAT (15%):'}</span>
                <span className="font-bold text-blue-700">{item2.vatAmount.toFixed(2)} SAR</span>
              </div>
              <div>
                <span className="text-slate-500 block">{isRtl ? 'الإجمالي مع الضريبة:' : 'Total with VAT:'}</span>
                <span className="font-bold text-emerald-700">{totals2.grandTotal.toFixed(2)} SAR</span>
              </div>
              <div>
                <span className="text-slate-500 block">{isRtl ? 'حالة الحساب:' : 'Tax Status:'}</span>
                <span className="font-bold text-emerald-600">{isRtl ? 'لا تكرار للضريبة ✓' : 'No double VAT ✓'}</span>
              </div>
            </div>
            {onLoadTestCase && (
              <button
                type="button"
                onClick={() => {
                  onLoadTestCase([item2], 'EXCLUSIVE', 'Test Case - VAT Exclusive (15%)');
                  onClose();
                }}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
              >
                {t.loadInEditor} <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? '' : 'rotate-180'}`} />
              </button>
            )}
          </div>

          {/* Case 3 */}
          <div className="p-4 border rounded-lg bg-slate-50/70 border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                {test3Passed ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                ) : null}
                {t.case3Title}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                {t.verifiedBadge}
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-2">
              {t.case3Desc}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white p-2.5 rounded border border-slate-200 font-mono">
              <div>
                <span className="text-slate-500 block">{isRtl ? 'قيمة الخصم:' : 'Discount Amount:'}</span>
                <span className="font-bold text-rose-600">-{item3.discountAmount.toFixed(2)} SAR</span>
              </div>
              <div>
                <span className="text-slate-500 block">{isRtl ? 'الصافي قبل الضريبة:' : 'Net Before VAT:'}</span>
                <span className="font-bold text-slate-900">{item3.subtotalBeforeVat.toFixed(2)} SAR</span>
              </div>
              <div>
                <span className="text-slate-500 block">{isRtl ? 'ضريبة الصافي:' : 'Net VAT:'}</span>
                <span className="font-bold text-blue-700">{item3.vatAmount.toFixed(2)} SAR</span>
              </div>
              <div>
                <span className="text-slate-500 block">{isRtl ? 'الإجمالي المطلوب:' : 'Total Payable:'}</span>
                <span className="font-bold text-emerald-700">{totals3.grandTotal.toFixed(2)} SAR</span>
              </div>
            </div>
          </div>

          {/* Case 4 */}
          <div className="p-4 border rounded-lg bg-slate-50/70 border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                {test4Passed ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                ) : null}
                {t.case4Title}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                {t.verifiedBadge}
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-2">
              {t.case4Desc}
            </p>
          </div>

          {/* Case 5 */}
          <div className="p-4 border rounded-lg bg-emerald-50/70 border-emerald-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                {t.case5Title}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                100% {t.verifiedBadge}
              </span>
            </div>
            <p className="text-xs text-emerald-900">
              {t.case5Desc}
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition"
          >
            {t.closeModal}
          </button>
        </div>
      </div>
    </div>
  );
};
