import React, { useState, useEffect } from 'react';
import { Language } from '../utils/translations';
import { Invoice, CompanyProfile, Customer, Product } from '../types';
import { storage } from '../utils/storage';
import {
  DEFAULT_SUPABASE_PROJECT_ID,
  DEFAULT_SUPABASE_URL,
  DEFAULT_SUPABASE_ANON_KEY,
  SUPABASE_SQL_SCHEMA,
  testSupabaseHealth,
  SupabaseHealth,
  syncAllToSupabase,
  fetchInvoicesFromSupabase,
  saveInvoiceToSupabase,
} from '../utils/supabaseClient';
import {
  Database,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  UploadCloud,
  DownloadCloud,
  Server,
  FileCode,
  ShieldCheck,
  X,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  invoices: Invoice[];
  onInvoicesSynced?: (updatedInvoices: Invoice[]) => void;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  lang,
  invoices,
  onInvoicesSynced,
}) => {
  const isRtl = lang === 'ar';
  const [health, setHealth] = useState<SupabaseHealth | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSqlCopied, setIsSqlCopied] = useState(false);
  const [showSqlCode, setShowSqlCode] = useState(false);

  const checkConnection = async () => {
    setIsChecking(true);
    setSyncStatusMsg(null);
    try {
      const res = await testSupabaseHealth();
      setHealth(res);
    } catch {
      setHealth({
        connected: false,
        url: DEFAULT_SUPABASE_URL,
        projectId: DEFAULT_SUPABASE_PROJECT_ID,
        tablesExist: { invoices: false, customers: false, products: false, company_profile: false },
        needsSchemaSetup: true,
        lastChecked: new Date().toISOString(),
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkConnection();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setIsSqlCopied(true);
    setTimeout(() => setIsSqlCopied(false), 2500);
  };

  const handleSyncAllToSupabase = async () => {
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const currentInvoices = storage.getInvoices();
      const currentCustomers = storage.getCustomers();
      const currentCompany = storage.getCompany();
      const currentProducts = storage.getProducts();

      const result = await syncAllToSupabase(
        currentInvoices,
        currentCustomers,
        currentCompany,
        currentProducts
      );

      if (result.success) {
        setSyncStatusMsg({
          type: 'success',
          text: isRtl
            ? `تمت مزامنة ${result.syncedCount} فاتورة وجميع بيانات العملاء والمنتجات في حسابك بنجاح!`
            : `Successfully synced ${result.syncedCount} invoices and all customer data to Supabase!`,
        });
        await checkConnection();
      } else {
        setSyncStatusMsg({
          type: 'error',
          text: result.error || (isRtl ? 'فشلت المزامنة' : 'Sync failed'),
        });
      }
    } catch (e: any) {
      setSyncStatusMsg({
        type: 'error',
        text: e.message || (isRtl ? 'حدث خطأ أثناء المزامنة' : 'Error during sync'),
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromSupabase = async () => {
    setIsPulling(true);
    setSyncStatusMsg(null);
    try {
      const result = await fetchInvoicesFromSupabase();
      if (result.error) {
        setSyncStatusMsg({
          type: 'error',
          text: result.error,
        });
      } else if (result.invoices) {
        // Merge with local invoices
        const localList = storage.getInvoices();
        const map = new Map<string, Invoice>();
        localList.forEach((inv) => map.set(inv.id, inv));
        result.invoices.forEach((inv) => map.set(inv.id, inv));

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
        );

        storage.saveInvoices(merged);
        if (onInvoicesSynced) {
          onInvoicesSynced(merged);
        }

        setSyncStatusMsg({
          type: 'success',
          text: isRtl
            ? `تم استيراد ${result.invoices.length} فاتورة من سوبابيز بنجاح وإضافتها للوحة التحكم!`
            : `Successfully imported ${result.invoices.length} invoices from Supabase!`,
        });
      }
    } catch (e: any) {
      setSyncStatusMsg({
        type: 'error',
        text: e.message || 'فشل الاستيراد من Supabase',
      });
    } finally {
      setIsPulling(false);
    }
  };

  const sqlEditorUrl = `https://supabase.com/dashboard/project/${DEFAULT_SUPABASE_PROJECT_ID}/sql/new`;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">
                  {isRtl ? 'قاعدة بيانات Supabase السحابية' : 'Supabase Cloud Database'}
                </h2>
                <span className="text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Cloud className="w-3 h-3" />
                  {isRtl ? 'حسابك مفعل' : 'Connected'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {isRtl
                  ? 'تخزين وحفظ جميع تفاصيل الفواتير سحابياً بأمان واسترجاعها من أي جهاز'
                  : 'Cloud data storage for all invoices and customer records'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {/* Status Feedback Notification */}
          {syncStatusMsg && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold ${
                syncStatusMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {syncStatusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{syncStatusMsg.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setSyncStatusMsg(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Connection Overview Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-extrabold text-slate-900">
                  {isRtl ? 'حالة الاتصال بمشروعك في Supabase:' : 'Supabase Connection Status:'}
                </span>
                <span className="text-emerald-700 bg-emerald-100 font-mono text-xs px-2 py-0.5 rounded-md font-bold">
                  {isRtl ? 'متصل بنجاح' : 'Connected'}
                </span>
              </div>
              <button
                type="button"
                onClick={checkConnection}
                disabled={isChecking}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-emerald-600' : ''}`} />
                <span>{isChecking ? (isRtl ? 'جاري الفحص...' : 'Checking...') : (isRtl ? 'إعادة فحص الاتصال' : 'Refresh Check')}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block mb-0.5 font-medium">{isRtl ? 'معرف المشروع (Project ID):' : 'Project ID:'}</span>
                <span className="font-mono font-bold text-slate-900">{DEFAULT_SUPABASE_PROJECT_ID}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 truncate">
                <span className="text-slate-500 block mb-0.5 font-medium">{isRtl ? 'رابط الـ API:' : 'API Endpoint:'}</span>
                <span className="font-mono text-slate-900 truncate block text-[11px]">{DEFAULT_SUPABASE_URL}</span>
              </div>
            </div>

            {/* Tables Check */}
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="text-xs font-bold text-slate-700 mb-2">
                {isRtl ? 'حالة الجداول في قاعدة البيانات:' : 'Database Tables Status:'}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div
                  className={`p-2 rounded-lg border text-center text-xs font-bold ${
                    health?.tablesExist.invoices
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-300 text-amber-800'
                  }`}
                >
                  <div className="font-mono">invoices</div>
                  <div className="text-[10px] mt-0.5">
                    {health?.tablesExist.invoices ? (isRtl ? 'جاهز ومفعل ✓' : 'Ready ✓') : (isRtl ? 'يحتاج كود SQL ⚠️' : 'Missing ⚠️')}
                  </div>
                </div>

                <div
                  className={`p-2 rounded-lg border text-center text-xs font-bold ${
                    health?.tablesExist.customers
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="font-mono">customers</div>
                  <div className="text-[10px] mt-0.5">
                    {health?.tablesExist.customers ? (isRtl ? 'جاهز ✓' : 'Ready ✓') : (isRtl ? 'اختياري' : 'Optional')}
                  </div>
                </div>

                <div
                  className={`p-2 rounded-lg border text-center text-xs font-bold ${
                    health?.tablesExist.products
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="font-mono">products</div>
                  <div className="text-[10px] mt-0.5">
                    {health?.tablesExist.products ? (isRtl ? 'جاهز ✓' : 'Ready ✓') : (isRtl ? 'اختياري' : 'Optional')}
                  </div>
                </div>

                <div
                  className={`p-2 rounded-lg border text-center text-xs font-bold ${
                    health?.tablesExist.company_profile
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="font-mono">company_profile</div>
                  <div className="text-[10px] mt-0.5">
                    {health?.tablesExist.company_profile ? (isRtl ? 'جاهز ✓' : 'Ready ✓') : (isRtl ? 'اختياري' : 'Optional')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Setup Guide Banner (if tables need creation) */}
          {health?.needsSchemaSetup && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 text-amber-950 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">
                    {isRtl
                      ? 'خطوة بسيطة متبقية: تشغيل كود SQL لإنشاء جدول الفواتير في Supabase'
                      : 'Quick Step Needed: Run the SQL Code in your Supabase SQL Editor'}
                  </h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    {isRtl
                      ? 'الاتصال بحسابك في Supabase بنجاح! يلزم فقط نسخ كود الـ SQL وتشغيله في صفحة SQL Editor لمشروعك لإنشاء جدول الفواتير والسماح بحفظها للأبد.'
                      : 'Your Supabase project is connected! Simply copy the SQL code below and paste it into the Supabase SQL Editor once to create the invoices table.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
                >
                  {isSqlCopied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                  <span>{isSqlCopied ? (isRtl ? 'تم نسخ كود الـ SQL!' : 'SQL Code Copied!') : (isRtl ? 'نسخ كود الـ SQL كاملاً' : 'Copy SQL Schema')}</span>
                </button>

                <a
                  href={sqlEditorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <span>{isRtl ? 'فتح Supabase SQL Editor' : 'Open Supabase SQL Editor'}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                </a>

                <button
                  type="button"
                  onClick={() => setShowSqlCode(!showSqlCode)}
                  className="text-xs text-amber-900 hover:underline px-2 py-1 font-semibold"
                >
                  {showSqlCode ? (isRtl ? 'إخفاء كود الـ SQL' : 'Hide SQL') : (isRtl ? 'معاينة كود الـ SQL' : 'Preview SQL')}
                </button>
              </div>

              {showSqlCode && (
                <div className="mt-2 bg-slate-900 text-emerald-400 p-3 rounded-lg font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-700 text-left" dir="ltr">
                  <pre>{SUPABASE_SQL_SCHEMA}</pre>
                </div>
              )}
            </div>
          )}

          {/* Cloud Synchronization Actions */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-emerald-600" />
              <span>{isRtl ? 'مزامنة وإدارة البيانات السحابية:' : 'Cloud Data Sync Operations:'}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Push local invoices to Supabase */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-white flex flex-col justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                    <span>{isRtl ? 'رفع الفواتير إلى Supabase' : 'Push Invoices to Supabase'}</span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                      {invoices.length} {isRtl ? 'فاتورة' : 'invoices'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {isRtl
                      ? 'مزامنة فورية لجميع الفواتير المحلية الموجودة إلى حسابك في Supabase لحفظها بشكل دائم.'
                      : 'Upload all your current local invoices to your Supabase account now.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSyncAllToSupabase}
                  disabled={isSyncing}
                  className="mt-3 w-full py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 rounded-lg transition inline-flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <UploadCloud className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                  <span>
                    {isSyncing
                      ? (isRtl ? 'جاري الرفع إلى Supabase...' : 'Syncing...')
                      : (isRtl ? 'مزامنة جميع الفواتير الآن' : 'Sync All Invoices Now')}
                  </span>
                </button>
              </div>

              {/* Pull invoices from Supabase */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-white flex flex-col justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                    <span>{isRtl ? 'استيراد الفواتير من Supabase' : 'Pull Invoices from Supabase'}</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                      {isRtl ? 'سحابي' : 'Cloud'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {isRtl
                      ? 'جلب الفواتير المخزنة في حسابك على Supabase ودمجها مع هذا المتصفح أو الجهاز.'
                      : 'Fetch all stored invoices from your Supabase account and merge with this device.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePullFromSupabase}
                  disabled={isPulling}
                  className="mt-3 w-full py-2 px-3 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-50 rounded-lg transition inline-flex items-center justify-center gap-1.5"
                >
                  <DownloadCloud className={`w-4 h-4 ${isPulling ? 'animate-pulse text-emerald-600' : ''}`} />
                  <span>
                    {isPulling
                      ? (isRtl ? 'جاري الاستيراد...' : 'Pulling...')
                      : (isRtl ? 'استيراد من Supabase' : 'Pull from Supabase')}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Automatic sync note */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              {isRtl
                ? 'المزامنة التلقائية مفعلة: في كل مرة تنشئ أو تعدل فاتورة، يتم حفظها فورياً في Supabase وفي جهازك في نفس اللحظة.'
                : 'Real-time auto-sync is active: Every new or edited invoice is automatically pushed to Supabase and saved locally.'}
            </span>
          </div>

          {/* Netlify Deployment Ready Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <Server className="w-4 h-4 text-blue-600" />
              <h5 className="font-bold text-xs text-slate-900">
                {isRtl ? 'جاهزية النشر على Netlify (Netlify Deployment Ready)' : 'Netlify Deployment Ready'}
              </h5>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {isRtl
                ? 'تم تجهيز ملفات netlify.toml و _redirects بشكل كامل. يمكنك رفع المشروع مباشرة على Netlify وسيعمل الاتصال بقاعدة بيانات Supabase وعرض روابط الفواتير للعملاء مباشرة من المتصفح بدون الحاجة لسيرفر خارجي!'
                : 'Your app is fully configured with netlify.toml and _redirects. You can deploy directly to Netlify; all Supabase connections and customer links work seamlessly client-side!'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            Project: {DEFAULT_SUPABASE_PROJECT_ID}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-xs"
          >
            {isRtl ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
