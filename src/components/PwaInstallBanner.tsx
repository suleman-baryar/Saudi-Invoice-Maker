import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  X,
  Check,
  Share,
  PlusSquare,
  MoreVertical,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  WifiOff,
} from 'lucide-react';
import { Language } from '../utils/translations';

interface PwaInstallBannerProps {
  lang: Language;
  forceOpenModal?: boolean;
  onCloseModal?: () => void;
}

export const PwaInstallBanner: React.FC<PwaInstallBannerProps> = ({
  lang,
  forceOpenModal,
  onCloseModal,
}) => {
  const isRtl = lang === 'ar';
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState<'IOS' | 'ANDROID'>('IOS');

  useEffect(() => {
    if (forceOpenModal) {
      setIsModalOpen(true);
    }
  }, [forceOpenModal]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    onCloseModal?.();
  };

  useEffect(() => {
    // Check if running in standalone mode (already installed on phone or desktop)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect platform for default tab
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) {
        setActivePlatform('IOS');
      } else if (/android/.test(ua)) {
        setActivePlatform('ANDROID');
      }
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsModalOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Open the visual step-by-step modal for iOS and Android
      setIsModalOpen(true);
    }
  };

  const handleDirectInstallPrompt = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setIsModalOpen(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) {
    return null;
  }

  return (
    <>
      {/* Top Banner (Visible until dismissed or installed) */}
      {!isDismissed && (
        <div
          className="no-print bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white px-3 sm:px-4 py-2.5 shadow-md flex items-center justify-between gap-2.5 text-xs border-b border-emerald-700/50"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 shrink-0 border border-emerald-400/30">
              <Smartphone className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="font-bold truncate text-[11px] sm:text-xs">
                {isRtl
                  ? '📲 تثبيت تطبيق مركز المالك للدهانات على آيفون (iPhone) وأندرويد (Android)'
                  : '📲 Install Markaz Al Malki Paint App on iPhone & Android'}
              </p>
              <p className="text-[10px] text-emerald-200/80 hidden sm:block">
                {isRtl
                  ? 'يعمل كتطبيق أصيل بكامل الشاشة، سرعة فائقة في المحل، تشغيل بدون إنترنت، وجاهز لمتجر Play'
                  : 'Full screen native feel, fast in-store counter POS, offline support & Google Play ready'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 sm:px-3.5 py-1.5 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 text-slate-950 font-black rounded-lg transition inline-flex items-center gap-1.5 shadow-xs text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isRtl ? 'تثبيت التطبيق' : 'Install App'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition text-xs hidden md:inline-flex items-center gap-1"
            >
              <span>{isRtl ? 'طريقة التثبيت' : 'Guide'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1 text-slate-400 hover:text-white rounded transition"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Comprehensive Visual Step-by-Step Installation Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden text-slate-900 my-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-4 sm:p-5 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                    {isRtl ? 'تثبيت التطبيق على جوالك' : 'Install App on Your Phone'}
                  </h3>
                  <p className="text-xs text-emerald-200/80">
                    {isRtl
                      ? 'مركز المالك للدهانات - متوافق مع آيفون وأندرويد'
                      : 'Markaz Al Malki Paint - iOS & Android Compatible'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Platform Selector Tabs */}
            <div className="p-3 bg-slate-100 border-b border-slate-200 flex gap-2">
              <button
                type="button"
                onClick={() => setActivePlatform('IOS')}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 ${
                  activePlatform === 'IOS'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="text-base">🍏</span>
                <span>{isRtl ? 'آيفون (iPhone / iOS)' : 'iPhone (iOS)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePlatform('ANDROID')}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 ${
                  activePlatform === 'ANDROID'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="text-base">🤖</span>
                <span>{isRtl ? 'أندرويد (Android / Play)' : 'Android'}</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* iPhone / iPad Instructions */}
              {activePlatform === 'IOS' && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs leading-relaxed flex items-start gap-2.5">
                    <Share className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block mb-0.5">
                        {isRtl ? 'ملاحظة مهمة لمستخدمي آيفون (iPhone):' : 'Important Note for iPhone users:'}
                      </strong>
                      <span>
                        {isRtl
                          ? 'نظام أبل iOS يتطلب فتح الرابط في متصفح سفاري (Safari) فقط لتثبيت التطبيق على الشاشة الرئيسية.'
                          : 'Apple iOS requires opening this link in Safari browser to install on your Home Screen.'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        1
                      </div>
                      <div className="text-xs">
                        <strong className="block text-slate-900 font-bold mb-0.5">
                          {isRtl ? 'افتح الموقع في متصفح سفاري (Safari)' : 'Open in Safari Browser'}
                        </strong>
                        <span className="text-slate-600">
                          {isRtl
                            ? 'تأكد من فتح رابط البرنامج عبر متصفح Safari الافتراضي في جهاز الآيفون.'
                            : 'Make sure you are viewing this page inside the default Safari browser.'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        2
                      </div>
                      <div className="text-xs">
                        <strong className="block text-slate-900 font-bold mb-0.5 flex items-center gap-1.5">
                          <span>{isRtl ? 'اضغط على زر المشاركة' : 'Tap the Share Button'}</span>
                          <span className="inline-flex items-center justify-center p-1 bg-blue-100 text-blue-700 rounded-md">
                            <Share className="w-3.5 h-3.5" />
                          </span>
                        </strong>
                        <span className="text-slate-600">
                          {isRtl
                            ? 'انقر على زر المشاركة (المربع ذو السهم المتجه للأعلى) الموجود أسفل شاشة سفاري.'
                            : 'Tap the Share icon (square with upward arrow) in the bottom toolbar of Safari.'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        3
                      </div>
                      <div className="text-xs">
                        <strong className="block text-slate-900 font-bold mb-0.5 flex items-center gap-1.5">
                          <span>{isRtl ? 'اختر "إضافة إلى الشاشة الرئيسية"' : 'Select "Add to Home Screen"'}</span>
                          <span className="inline-flex items-center justify-center p-1 bg-slate-200 text-slate-700 rounded-md">
                            <PlusSquare className="w-3.5 h-3.5" />
                          </span>
                        </strong>
                        <span className="text-slate-600">
                          {isRtl
                            ? 'مرر للأسفل في قائمة الخيارات واضغط على «إضافة إلى الصفحة الرئيسية» (Add to Home Screen).'
                            : 'Scroll down the share sheet and tap "Add to Home Screen".'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        4
                      </div>
                      <div className="text-xs">
                        <strong className="block text-slate-900 font-bold mb-0.5">
                          {isRtl ? 'اضغط "إضافة" (Add) في الزاوية العلوية' : 'Tap "Add" in Top-Right Corner'}
                        </strong>
                        <span className="text-slate-600">
                          {isRtl
                            ? 'مبروك! ستظهر أيقونة مركز المالك للدهانات على شاشة الآيفون وتفتح كتطبيق مستقل وسريع جداً.'
                            : 'Congratulations! Markaz Al Malki Paint will appear on your Home Screen as a native app.'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Android Instructions & Direct Button */}
              {activePlatform === 'ANDROID' && (
                <div className="space-y-4">
                  {deferredPrompt ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-center space-y-3">
                      <p className="text-xs font-bold text-emerald-950">
                        {isRtl
                          ? 'جهازك الأندرويد جاهز للتثبيت المباشر بنقرة واحدة الآن:'
                          : 'Your Android device is ready for 1-click direct installation:'}
                      </p>
                      <button
                        type="button"
                        onClick={handleDirectInstallPrompt}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-sm rounded-xl shadow-md transition inline-flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>{isRtl ? 'تثبيت التطبيق على أندرويد الآن' : 'Install on Android Now'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                      {isRtl
                        ? 'إذا لم يظهر زر التثبيت التلقائي في متصفح كروم، اتبع الخطوات البسيطة التالية:'
                        : 'If automated install dialog does not pop up automatically, follow these simple steps in Chrome:'}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        1
                      </div>
                      <div className="text-xs">
                        <strong className="block text-slate-900 font-bold mb-0.5 flex items-center gap-1.5">
                          <span>{isRtl ? 'اضغط على زر القائمة (⋮)' : 'Tap Menu (⋮) in Chrome'}</span>
                          <span className="inline-flex items-center justify-center p-1 bg-slate-200 text-slate-700 rounded-md">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </span>
                        </strong>
                        <span className="text-slate-600">
                          {isRtl
                            ? 'في متصفح جوجل كروم أعلى الزاوية، اضغط على النقاط الثلاث (القائمة).'
                            : 'In Chrome or Samsung Internet, tap the 3 dots menu in the corner.'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        2
                      </div>
                      <div className="text-xs">
                        <strong className="block text-slate-900 font-bold mb-0.5 flex items-center gap-1.5">
                          <span>{isRtl ? 'اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"' : 'Select "Install App" or "Add to Home screen"'}</span>
                          <span className="inline-flex items-center justify-center p-1 bg-emerald-100 text-emerald-800 rounded-md">
                            <Download className="w-3.5 h-3.5" />
                          </span>
                        </strong>
                        <span className="text-slate-600">
                          {isRtl
                            ? 'اضغط على خيار «تثبيت التطبيق» (Install app).'
                            : 'Select "Install app" or "Add to Home Screen" from the menu.'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        3
                      </div>
                      <div className="text-xs">
                        <strong className="block text-slate-900 font-bold mb-0.5">
                          {isRtl ? 'جاهز ومتوافق مع متجر Google Play' : 'Ready & Compatible with Google Play'}
                        </strong>
                        <span className="text-slate-600">
                          {isRtl
                            ? 'التطبيق يدعم معيار TWA (Trusted Web Activity)، ويمكن تحويله لحزمة APK/AAB لمتجر Google Play في المستقبل.'
                            : 'Uses TWA standards, ready to package as an APK/AAB bundle for Google Play Store.'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Shared App Features Highlights */}
              <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <Zap className="w-4 h-4 text-amber-500 mx-auto" />
                  <span className="block text-[10px] font-bold text-slate-800">
                    {isRtl ? 'سرعة فائقة' : 'Fast POS'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <WifiOff className="w-4 h-4 text-emerald-600 mx-auto" />
                  <span className="block text-[10px] font-bold text-slate-800">
                    {isRtl ? 'يعمل بدون نت' : 'Offline Ready'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <ShieldCheck className="w-4 h-4 text-blue-600 mx-auto" />
                  <span className="block text-[10px] font-bold text-slate-800">
                    {isRtl ? 'حفظ تلقائي' : 'Auto Save'}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition"
              >
                {isRtl ? 'فهمت، إغلاق الدليل' : 'Got it, Close Guide'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
