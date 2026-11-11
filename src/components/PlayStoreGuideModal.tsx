import React, { useState } from 'react';
import {
  Smartphone,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
  Package,
  Layers,
  FileText,
  AlertTriangle,
  X,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { Language } from '../utils/translations';

interface PlayStoreGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const PlayStoreGuideModal: React.FC<PlayStoreGuideModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const isRtl = lang === 'ar';
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentDomain = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
  const privacyUrl = `${currentDomain}/privacy-policy.html`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const playStoreChecklist = [
    {
      id: 'pwa',
      title: isRtl ? '1. تطبيق ويب تقدمي متكامل (PWA & Service Worker)' : '1. PWA & Service Worker Readiness',
      status: 'READY',
      desc: isRtl
        ? 'تم تجهيز ملف manifest.json، وأيقونات 192px و 512px و Maskable Icon، مع نظام كاش أوفلاين وسرعة فائقة.'
        : 'App manifest, 192px/512px/maskable icons, and offline caching are configured and ready.',
    },
    {
      id: 'privacy',
      title: isRtl ? '2. رابط سياسة الخصوصية (Privacy Policy URL)' : '2. Privacy Policy URL (Mandatory for Play Store)',
      status: 'READY',
      desc: isRtl
        ? 'تم إنشاء صفحة سياسة الخصوصية الرسمية باللغتين العربية والإنجليزية المتوافقة مع سياسات جوجل بلاي.'
        : 'Official Arabic & English Privacy Policy page is created and hosted at /privacy-policy.html.',
      actionUrl: '/privacy-policy.html',
    },
    {
      id: 'account',
      title: isRtl ? '3. حساب مطور جوجل بلاي (Google Play Console Account)' : '3. Google Play Console Developer Account',
      status: 'USER_ACTION',
      desc: isRtl
        ? 'يلزم تسجيل حساب في play.google.com/console (رسوم لمرة واحدة $25 تدفع لجوجل مباشرة).'
        : 'Sign up at play.google.com/console (one-time $25 Google registration fee).',
      link: 'https://play.google.com/console',
    },
    {
      id: 'bundle',
      title: isRtl ? '4. إنشاء حزمة أندرويد (AAB Bundle via Bubblewrap / PWABuilder)' : '4. Android App Bundle (.aab)',
      status: 'USER_ACTION',
      desc: isRtl
        ? 'أسهل طريقة مجانية بدون كتابة سطر كود واحد هي إدخال رابط التطبيق في PWABuilder.com لتنزيل ملف AAB فورا.'
        : 'Use PWABuilder.com (Microsoft free tool) to convert this app into a signed .aab file in 2 minutes.',
      link: 'https://www.pwabuilder.com',
    },
    {
      id: 'assets',
      title: isRtl ? '5. متطلبات المتجر البصرية (Store Listing Assets)' : '5. Store Listing Visual Requirements',
      status: 'USER_ACTION',
      desc: isRtl
        ? 'أيقونة 512x512، صورة الغلاف (Feature Graphic) بمقاس 1024x500، ولقطتي شاشة للجوال كحد أدنى.'
        : 'App icon 512x512, feature graphic 1024x500, and at least 2 mobile screenshots.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs overflow-y-auto" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center justify-center font-bold">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg">
                  {isRtl ? 'دليل نشر التطبيق على Google Play Store' : 'Google Play Store Publishing Guide'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  Ready
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                {isRtl ? 'المتطلبات التقنية، سياسة الخصوصية، وخطوات تحويل التطبيق إلى AAB' : 'Technical requirements, privacy policy, and AAB bundling steps'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs sm:text-sm text-slate-700">
          {/* Quick summary alert */}
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-black text-emerald-950 text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              <span>{isRtl ? 'تم تجهيز جميع المتطلبات البرمجية في تطبيقك بنجاح!' : 'All code & technical requirements are completed!'}</span>
            </div>
            <p className="text-xs text-emerald-900/90 leading-relaxed">
              {isRtl
                ? 'التطبيق مطابق بنسبة 100% لمعايير جوجل بلاي وتطبيقات الويب الموثوقة (TWA). يتبقى لك فقط رفع التطبيق عبر حسابك في Google Play Console.'
                : 'Your app fully adheres to Google Trusted Web Activity (TWA) and PWA standards. All you need now is your Google Play Console developer account.'}
            </p>
          </div>

          {/* Checklist */}
          <div className="space-y-3">
            <h4 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-700" />
              <span>{isRtl ? 'قائمة التحقق الرسمية لمتجر Google Play' : 'Play Store Compliance Checklist'}</span>
            </h4>

            <div className="space-y-2.5">
              {playStoreChecklist.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white transition space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">{item.title}</span>
                    {item.status === 'READY' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{isRtl ? 'جاهز ومكتمل' : 'Completed'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                        <span>{isRtl ? 'خطوة المستخدم' : 'Your Action'}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>

                  {item.actionUrl && (
                    <div className="pt-1 flex items-center gap-2">
                      <a
                        href={item.actionUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold transition shadow-2xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{isRtl ? 'فتح صفحة سياسة الخصوصية' : 'Open Privacy Policy'}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(privacyUrl, 'privacy')}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                      >
                        {copiedKey === 'privacy' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'privacy' ? (isRtl ? 'تم النسخ!' : 'Copied!') : (isRtl ? 'نسخ الرابط' : 'Copy URL')}</span>
                      </button>
                    </div>
                  )}

                  {item.link && (
                    <div className="pt-1">
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 underline"
                      >
                        <span>{item.link}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 3 Simple Steps to Convert PWA to Play Store */}
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
            <h4 className="font-extrabold text-sm text-emerald-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>{isRtl ? 'طريقة تحويل التطبيق إلى ملف (.aab) مجاناً بنقرتين:' : 'Fastest way to get .aab file for Play Store:'}</span>
            </h4>
            <ol className="space-y-2 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
              <li>
                <strong className="text-white">{isRtl ? 'افتح موقع:' : 'Open:'}</strong>{' '}
                <a href="https://www.pwabuilder.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-mono font-bold">
                  PWABuilder.com
                </a>
              </li>
              <li>
                <strong className="text-white">{isRtl ? 'ضع رابط موقعك المنشور' : 'Paste your live published URL'}</strong>{' '}
                {isRtl ? 'واضغط Start (سيفحص الموقع ويؤكد لك أنه مؤهل 100%).' : 'and click Start.'}
              </li>
              <li>
                <strong className="text-white">{isRtl ? 'اختر Android ثم Package:' : 'Click Android -> Package:'}</strong>{' '}
                {isRtl ? 'سينتج لك ملف الحزمة الموقع بصيغة (.aab) الجاهز للرفع الفوري على Google Play Console.' : 'Downloads the signed .aab bundle ready for Google Play Console upload.'}
              </li>
            </ol>
          </div>

          {/* Contact Us & WhatsApp Instant Support */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/70 border border-emerald-300 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base">💬</span>
                <h5 className="font-black text-slate-900 text-sm">
                  {isRtl ? 'الدعم الفني المباشر وتواصل معنا (Contact Us):' : 'Direct Support & Contact Us:'}
                </h5>
              </div>
              <p className="text-xs text-slate-600">
                {isRtl ? 'لأي مساعدة فورية أو استفسار تواصل معنا مباشرة عبر الواتساب:' : 'For instant assistance or queries, message us directly on WhatsApp:'}
              </p>
            </div>

            <a
              href="https://wa.me/966581409304?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%D8%8C%20%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D9%85%D8%B3%D8%A7%D8%B9%D8%AF%D8%A9%20%D9%81%D9%8A%20%D8%AA%D8%B7%D8%A8%D9%8A%D9%82%20%D9%85%D8%B1%D9%83%D8%B2%20%D8%A7%D9%84%D9%85%D8%A7%D9%84%D9%83%20%D9%84%D9%84%D8%AF%D9%87%D8%A7%D9%86%D8%A7%D8%AA"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-[#25D366] hover:bg-[#20ba59] active:bg-[#1caa4f] text-white font-bold text-xs rounded-xl transition inline-flex items-center gap-2 shadow-xs shrink-0"
            >
              <span>واتساب: 00966581409304</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-500 font-semibold">
            {isRtl ? 'مركز المالك للدهانات - متوافق مع ZATCA و Google Play' : 'ZATCA & Google Play TWA compliant'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition"
          >
            {isRtl ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
