import React, { useState } from 'react';
import { CompanyProfile } from '../types';
import { storage } from '../utils/storage';
import { Language, translations } from '../utils/translations';
import {
  Building2,
  Save,
  Upload,
  Download,
  RotateCcw,
  Check,
  CheckCircle,
  CreditCard,
  MapPin,
  Globe,
  ShieldCheck,
  Lock,
  Smartphone,
  Database,
  Cloud,
  ExternalLink,
  RefreshCw,
  Copy,
  Stamp,
  Share,
  PlusSquare,
  Zap,
  WifiOff,
} from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import {
  DEFAULT_SUPABASE_PROJECT_ID,
  DEFAULT_SUPABASE_URL,
  SUPABASE_SQL_SCHEMA,
  syncAllToSupabase,
  testSupabaseHealth,
} from '../utils/supabaseClient';

interface CompanySettingsProps {
  onSaved: () => void;
  lang: Language;
}

export const CompanySettings: React.FC<CompanySettingsProps> = ({ onSaved, lang }) => {
  const [profile, setProfile] = useState<CompanyProfile>(storage.getCompany());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [supabaseSyncStatus, setSupabaseSyncStatus] = useState<string | null>(null);
  const [isSupabaseSyncing, setIsSupabaseSyncing] = useState(false);
  const [isSqlCopied, setIsSqlCopied] = useState(false);
  const t = translations[lang].settings;
  const isRtl = lang === 'ar';

  const handleSyncToSupabase = async () => {
    setIsSupabaseSyncing(true);
    setSupabaseSyncStatus(null);
    try {
      const invoices = storage.getInvoices();
      const customers = storage.getCustomers();
      const company = storage.getCompany();
      const products = storage.getProducts();
      const res = await syncAllToSupabase(invoices, customers, company, products);
      if (res.success) {
        setSupabaseSyncStatus(
          isRtl
            ? `تمت المزامنة بنجاح! تم رفع ${res.syncedCount} فاتورة إلى سوبابيز.`
            : `Synced successfully! ${res.syncedCount} invoices uploaded to Supabase.`
        );
      } else {
        setSupabaseSyncStatus(res.error || (isRtl ? 'فشلت المزامنة' : 'Sync failed'));
      }
    } catch (e: any) {
      setSupabaseSyncStatus(e.message || (isRtl ? 'خطأ أثناء المزامنة' : 'Error during sync'));
    } finally {
      setIsSupabaseSyncing(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setIsSqlCopied(true);
    setTimeout(() => setIsSqlCopied(false), 2500);
  };

  const handleChange = (field: keyof CompanyProfile, value: unknown) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          handleChange('logoUrl', reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    storage.saveCompany(profile);
    setSaveSuccess(true);
    onSaved();
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleExportBackup = () => {
    const jsonStr = storage.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saudi-invoice-maker-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const success = storage.importAllData(reader.result);
          if (success) {
            setProfile(storage.getCompany());
            setImportStatus(isRtl ? 'تمت استعادة البيانات بنجاح!' : 'Data restored successfully!');
            onSaved();
          } else {
            setImportStatus(isRtl ? 'خطأ في استيراد ملف النسخ الاحتياطي.' : 'Failed to import backup file.');
          }
          setTimeout(() => setImportStatus(null), 4000);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleResetData = () => {
    if (
      window.confirm(
        isRtl
          ? 'هل أنت متأكد من حذف كافة البيانات التجريبية نهائياً والبدء بسجلات المحل الفعلية فقط؟'
          : 'Are you sure you want to permanently remove all demo data and keep only real shop records?'
      )
    ) {
      storage.purgeAllDemoData();
      setProfile(storage.getCompany());
      onSaved();
      setImportStatus(
        isRtl
          ? 'تم حذف جميع البيانات التجريبية بنجاح! التطبيق جاهز للعمل الفعلي.'
          : 'All demo data removed successfully! App is ready for live business.'
      );
      setTimeout(() => setImportStatus(null), 3500);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            {t.title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.subtitle}
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
            <CheckCircle className="w-4 h-4" />
            {t.savedSuccess}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info & Logo */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2.5">
            {t.identityAndLogo}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            {/* Logo Preview & Upload */}
            <div className="sm:col-span-4 flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              {profile.logoUrl ? (
                <img
                  src={profile.logoUrl}
                  alt="Company Logo"
                  className="max-h-20 max-w-full object-contain mb-3"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-slate-200 text-slate-400 flex items-center justify-center font-bold text-xs mb-3">
                  {t.noLogo}
                </div>
              )}
              <label className="cursor-pointer px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 shadow-xs transition">
                <Upload className="w-3.5 h-3.5" />
                {t.uploadLogoBtn}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
              {profile.logoUrl && (
                <button
                  type="button"
                  onClick={() => handleChange('logoUrl', '')}
                  className="text-[11px] text-rose-600 hover:underline mt-2"
                >
                  {t.removeLogoBtn}
                </button>
              )}
            </div>

            {/* Names Arabic & English */}
            <div className="sm:col-span-8 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.nameAr}
                </label>
                <input
                  type="text"
                  required
                  value={profile.nameAr}
                  onChange={(e) => handleChange('nameAr', e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.nameEn}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  required
                  value={profile.nameEn}
                  onChange={(e) => handleChange('nameEn', e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Saudi Tax & Commercial IDs */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2.5 flex items-center justify-between">
            <span>{t.taxAndCrSection}</span>
            <span className="text-[11px] text-blue-700 font-normal">
              {t.taxMandatoryNotice}
            </span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.vatNumber}
              </label>
              <input
                type="text"
                required
                maxLength={15}
                value={profile.vatNumber}
                onChange={(e) => handleChange('vatNumber', e.target.value)}
                placeholder="300000000000003"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono font-bold tracking-wider text-slate-900"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                {t.vatNumberHelp}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.crNumber}
              </label>
              <input
                type="text"
                required
                maxLength={10}
                value={profile.crNumber}
                onChange={(e) => handleChange('crNumber', e.target.value)}
                placeholder="1010456789"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono font-bold tracking-wider text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.phone}</label>
              <input
                type="text"
                value={profile.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
              />
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="hidePhoneOnInvoiceCheckbox"
                  checked={profile.hidePhoneOnInvoice ?? false}
                  onChange={(e) => handleChange('hidePhoneOnInvoice', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="hidePhoneOnInvoiceCheckbox" className="text-[11px] text-slate-700 font-medium cursor-pointer">
                  {isRtl ? 'إخفاء رقم الهاتف تماماً من الفاتورة ورابط العميل' : 'Hide phone number completely from invoice & customer link'}
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.email}</label>
              <input
                type="email"
                dir="ltr"
                value={profile.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>
          </div>
        </div>

        {/* Address in Saudi Arabia - Bilingual Arabic & English */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2.5">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>{t.addressSection}</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {t.addressBilingualHelp}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Arabic Address Block */}
            <div className="p-3.5 rounded-lg border border-emerald-100 bg-emerald-50/30 space-y-3" dir="rtl">
              <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/60">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  {t.addressArGroup}
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-medium">عربي</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.streetAr}</label>
                <input
                  type="text"
                  value={profile.streetAr}
                  onChange={(e) => handleChange('streetAr', e.target.value)}
                  placeholder="مثال: طريق الملك فهد"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.districtAr}</label>
                  <input
                    type="text"
                    value={profile.districtAr}
                    onChange={(e) => handleChange('districtAr', e.target.value)}
                    placeholder="مثال: حي العليا"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.cityAr}</label>
                  <input
                    type="text"
                    value={profile.cityAr}
                    onChange={(e) => handleChange('cityAr', e.target.value)}
                    placeholder="مثال: الرياض"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.countryAr}</label>
                <input
                  type="text"
                  value={profile.countryAr || 'المملكة العربية السعودية'}
                  onChange={(e) => handleChange('countryAr', e.target.value)}
                  placeholder="المملكة العربية السعودية"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* English Address Block */}
            <div className="p-3.5 rounded-lg border border-blue-100 bg-blue-50/30 space-y-3" dir="ltr">
              <div className="flex items-center justify-between pb-1.5 border-b border-blue-200/60">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  {t.addressEnGroup}
                </span>
                <span className="text-[10px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-medium">English</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.streetEn}</label>
                <input
                  type="text"
                  dir="ltr"
                  value={profile.streetEn}
                  onChange={(e) => handleChange('streetEn', e.target.value)}
                  placeholder="e.g. King Fahd Road"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.districtEn}</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={profile.districtEn}
                    onChange={(e) => handleChange('districtEn', e.target.value)}
                    placeholder="e.g. Al Olaya Dist."
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.cityEn}</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={profile.cityEn}
                    onChange={(e) => handleChange('cityEn', e.target.value)}
                    placeholder="e.g. Riyadh"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.countryEn}</label>
                <input
                  type="text"
                  dir="ltr"
                  value={profile.countryEn || 'Kingdom of Saudi Arabia'}
                  onChange={(e) => handleChange('countryEn', e.target.value)}
                  placeholder="Kingdom of Saudi Arabia"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Shared Postal, Building No, and Prefix */}
          <div className="pt-2 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.buildingNo}</label>
                <input
                  type="text"
                  value={profile.buildingNo}
                  onChange={(e) => handleChange('buildingNo', e.target.value)}
                  placeholder="101"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.postalCode}</label>
                <input
                  type="text"
                  value={profile.postalCode}
                  onChange={(e) => handleChange('postalCode', e.target.value)}
                  placeholder="12214"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.prefix}</label>
                <input
                  type="text"
                  value={profile.invoicePrefix}
                  onChange={(e) => handleChange('invoicePrefix', e.target.value)}
                  placeholder="INV-2026-"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bank & Invoice Footer Details */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2.5 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            {t.bankAndFooterSection}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.bankName}</label>
              <input
                type="text"
                value={profile.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.iban}</label>
              <input
                type="text"
                dir="ltr"
                value={profile.bankIban}
                onChange={(e) => handleChange('bankIban', e.target.value)}
                placeholder="SA..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.footerNotesAr}
            </label>
            <textarea
              rows={2}
              value={profile.footerNotesAr}
              onChange={(e) => handleChange('footerNotesAr', e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.footerNotesEn}
            </label>
            <textarea
              rows={2}
              dir="ltr"
              value={profile.footerNotesEn}
              onChange={(e) => handleChange('footerNotesEn', e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-300"
            />
          </div>
        </div>

        {/* WhatsApp Business API & No-Reply Automated Channel Settings */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
              <span>{isRtl ? 'خدمة واتساب أعمال وإرسال الفواتير الآلي (No-Reply WhatsApp API)' : 'WhatsApp Business Official Channel (No-Reply)'}</span>
            </h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              {isRtl ? 'إرسال صامت بدون فتح واتساب' : 'Background Direct Dispatch'}
            </span>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-700" />
              {isRtl ? 'إخفاء الرقم الشخصي وعدم استقبال الردود (No-Reply):' : 'Sender Privacy & No-Reply Policy:'}
            </p>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              {isRtl
                ? 'عند إرسال الفاتورة عبر واتساب، يتم إرسال ملف الفاتورة PDF مباشرة بالخلفية دون فتح تطبيق واتساب. الاسم الظاهر للعميل هو اسم المنشأة المعتمد، ورقم هاتفك الشخصي يكون مخفياً تماماً، مع تفعيل خاصية عدم استقبال الردود (No-Reply).'
                : 'Invoices are sent directly as PDF documents via the Cloud API without opening WhatsApp. The display name shown to the customer is your verified business name, your personal number is kept confidential, and no replies are accepted.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isRtl ? 'الاسم الظاهر للعميل في واتساب (Business Display Name):' : 'WhatsApp Sender Display Name:'}
              </label>
              <input
                type="text"
                value={profile.whatsappBusinessName || profile.nameAr || 'مركز الملك للدهانات'}
                onChange={(e) => handleChange('whatsappBusinessName', e.target.value)}
                placeholder="مركز الملك للدهانات"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                {isRtl ? 'هذا الاسم هو الوحيد الذي يظهر للعميل في رأس المحادثة' : 'This verified name is displayed in the chat header to the customer'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isRtl ? 'رسالة التنبيه الآلية لعدم الرد (No-Reply Notice):' : 'No-Reply Automated Notice:'}
              </label>
              <input
                type="text"
                value={profile.whatsappNoReplyMessage || 'هذا الحساب مخصص لإرسال الفواتير بصيغة PDF آلياً فقط (No-Reply) ولا يستقبل الردود.'}
                onChange={(e) => handleChange('whatsappNoReplyMessage', e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                {isRtl ? 'يتم إرفاق هذا التنبيه أسفل الفاتورة لإبلاغ العميل بعدم إمكانية الرد' : 'Appended to the invoice message to notify the customer of automated dispatch'}
              </span>
            </div>
          </div>

          {/* Meta WhatsApp Cloud API Credentials */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{isRtl ? 'بيانات ربط Meta WhatsApp Business API (لإرسال ملف الـ PDF كمستند مباشر):' : 'Meta WhatsApp Business API Credentials (PDF Document Dispatch):'}</span>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                profile.whatsappPhoneNumberId && profile.whatsappAccessToken
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {profile.whatsappPhoneNumberId && profile.whatsappAccessToken
                  ? (isRtl ? 'مربوط وجاهز للإرسال ✓' : 'Configured ✓')
                  : (isRtl ? 'غير مربوط (اختياري)' : 'Not Configured (Optional)')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRtl ? 'معرف رقم الهاتف (Phone Number ID):' : 'Meta Phone Number ID:'}
                </label>
                <input
                  type="text"
                  value={profile.whatsappPhoneNumberId || ''}
                  onChange={(e) => handleChange('whatsappPhoneNumberId', e.target.value)}
                  placeholder="e.g. 102938475612345"
                  className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-300 bg-white"
                  dir="ltr"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {isRtl ? 'معرف الرقم المخصص لحساب واتساب للأعمال من بوابة مطوري Meta' : 'Found in Meta App Dashboard > WhatsApp > API Setup'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRtl ? 'رمز الوصول (Permanent Access Token):' : 'Permanent Access Token:'}
                </label>
                <input
                  type="password"
                  value={profile.whatsappAccessToken || ''}
                  onChange={(e) => handleChange('whatsappAccessToken', e.target.value)}
                  placeholder="EAAB..."
                  className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-300 bg-white"
                  dir="ltr"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {isRtl ? 'رمز وصول مستخدم النظام مع صلاحية whatsapp_business_messaging' : 'System User Token with whatsapp_business_messaging scope'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice PDF & Print Watermark Settings (Paid / Draft) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Stamp className="w-5 h-5 text-indigo-600" />
              <span>{isRtl ? 'العلامة المائية للفواتير وملفات PDF (Paid / Draft Watermark)' : 'Invoice & PDF Watermark Settings (Paid / Draft)'}</span>
            </h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={profile.enableInvoiceWatermark ?? true}
                onChange={(e) => handleChange('enableInvoiceWatermark', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              <span className="ms-2 text-xs font-bold text-slate-700">
                {(profile.enableInvoiceWatermark ?? true) ? (isRtl ? 'مفعلة ✓' : 'Enabled ✓') : (isRtl ? 'معطلة' : 'Disabled')}
              </span>
            </label>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {isRtl
              ? 'إظهار ختم مائي شبه شفاف على الفاتورة المعروضة، وفي ملف الـ PDF بعد التنزيل وعند الطباعة. يمكنك اختيار إظهار ختم "مدفوعة" للفواتير المسددة، أو "مسودة" للفواتير غير المعتمدة.'
              : 'Display an official semi-transparent watermark on invoices, downloaded PDF files, and printouts. Toggle between "Paid" or "Draft" watermark stamps.'}
          </p>

          {(profile.enableInvoiceWatermark ?? true) && (
            <div className="space-y-3 pt-1">
              <label className="block text-xs font-semibold text-slate-700">
                {isRtl ? 'نوع الختم المائي المعروض على الفاتورة:' : 'Watermark Display Option:'}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* AUTO */}
                <label
                  className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    (profile.watermarkType || 'AUTO') === 'AUTO'
                      ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-200'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="watermarkType"
                      value="AUTO"
                      checked={(profile.watermarkType || 'AUTO') === 'AUTO'}
                      onChange={() => handleChange('watermarkType', 'AUTO')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900">
                        {isRtl ? 'تلقائي حسب حالة الفاتورة' : 'Automatic by Status'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {isRtl
                          ? 'يظهر "مدفوعة" إذا سُددت الفاتورة، و"مسودة" إذا كانت مسودة'
                          : 'Shows "PAID" if paid, "DRAFT" if draft'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-center text-[10px] font-bold text-indigo-700 bg-indigo-100/60 py-1 rounded">
                    {isRtl ? 'موصى به لجميع الفواتير' : 'Recommended'}
                  </div>
                </label>

                {/* PAID ONLY */}
                <label
                  className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    profile.watermarkType === 'PAID'
                      ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-200'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="watermarkType"
                      value="PAID"
                      checked={profile.watermarkType === 'PAID'}
                      onChange={() => handleChange('watermarkType', 'PAID')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900">
                        {isRtl ? 'ختم "مدفوعة / PAID" دائماً' : 'PAID Watermark Always'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {isRtl
                          ? 'يظهر ختم السداد المعتمد على جميع الفواتير'
                          : 'Always displays PAID stamp on invoices'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-center text-[10px] font-bold text-emerald-700 bg-emerald-100/60 py-1 rounded">
                    مـدفـوعـة • PAID
                  </div>
                </label>

                {/* DRAFT ONLY */}
                <label
                  className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    profile.watermarkType === 'DRAFT'
                      ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-200'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="watermarkType"
                      value="DRAFT"
                      checked={profile.watermarkType === 'DRAFT'}
                      onChange={() => handleChange('watermarkType', 'DRAFT')}
                      className="mt-0.5 text-slate-700 focus:ring-slate-500"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900">
                        {isRtl ? 'ختم "مسودة / DRAFT" دائماً' : 'DRAFT Watermark Always'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {isRtl
                          ? 'يظهر ختم مسودة للأغراض التجريبية والمراجعة'
                          : 'Always displays DRAFT stamp for reviews'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-center text-[10px] font-bold text-slate-700 bg-slate-200/80 py-1 rounded">
                    مـسـودة • DRAFT
                  </div>
                </label>
              </div>

              {/* Watermark Live Preview Box */}
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] font-bold text-slate-600 block mb-2">
                  {isRtl ? 'معاينة شكل الختم المائي على الفاتورة والـ PDF:' : 'Watermark Live Preview on PDF:'}
                </span>
                <div className="relative h-24 bg-white border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center p-3 select-none">
                  {/* Subtle placeholder invoice lines behind */}
                  <div className="absolute inset-0 p-3 opacity-20 flex flex-col justify-between pointer-events-none">
                    <div className="h-2 bg-slate-400 rounded w-1/3"></div>
                    <div className="h-2 bg-slate-300 rounded w-full"></div>
                    <div className="h-2 bg-slate-300 rounded w-4/5"></div>
                    <div className="h-2 bg-slate-400 rounded w-1/4"></div>
                  </div>

                  {/* Stamp Display */}
                  <div
                    className={`transform -rotate-12 px-6 py-1.5 rounded-xl border-3 border-dashed font-black text-center tracking-wider shadow-2xs z-10 ${
                      profile.watermarkType === 'DRAFT'
                        ? 'border-slate-500/60 text-slate-600 bg-slate-100/50'
                        : 'border-emerald-600/60 text-emerald-700 bg-emerald-50/50'
                    }`}
                  >
                    <div className="text-base sm:text-lg leading-tight">
                      {profile.watermarkType === 'DRAFT' ? 'مـسـودة' : 'مـدفـوعـة'}
                    </div>
                    <div className="text-[10px] tracking-widest uppercase">
                      {profile.watermarkType === 'DRAFT' ? 'DRAFT' : 'PAID IN FULL'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition inline-flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {t.saveSettingsBtn}
          </button>
        </div>
      </form>

      {/* Mobile App Installation (iPhone & Android) Card */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white p-5 rounded-2xl border border-emerald-800 shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center font-bold">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">
                {isRtl ? 'تطبيق الجوال لمركز المالك (iPhone & Android)' : 'Mobile App for Markaz Al Malki (iOS & Android)'}
              </h3>
              <p className="text-xs text-emerald-200/80">
                {isRtl
                  ? 'يعمل كتطبيق أصيل على جوالك بكامل الشاشة، وبدون الحاجة لإنترنت في المحل'
                  : 'Runs as a native standalone app on your home screen with offline capability'}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black bg-emerald-400 text-slate-950 px-2.5 py-1 rounded-full uppercase tracking-wider">
            PWA Ready
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* iPhone / iOS Guide */}
          <div className="bg-white/10 rounded-xl p-4 border border-white/15 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 font-black text-sm text-emerald-300">
              <span>🍏</span>
              <span>{isRtl ? 'طريقة التثبيت على آيفون (iPhone)' : 'How to Install on iPhone'}</span>
            </div>
            <ol className="space-y-2 text-slate-200 list-decimal list-inside pr-1">
              <li>
                {isRtl ? 'افتح رابط التطبيق عبر متصفح' : 'Open this app link in'}{' '}
                <strong className="text-white underline">Safari</strong> {isRtl ? 'فقط.' : 'browser.'}
              </li>
              <li>
                {isRtl ? 'اضغط على زر المشاركة' : 'Tap the Share icon'}{' '}
                <span className="inline-flex items-center p-0.5 bg-blue-500/30 text-blue-200 rounded">
                  <Share className="w-3 h-3 inline" />
                </span>{' '}
                {isRtl ? 'أسفل الشاشة.' : 'at the bottom toolbar.'}
              </li>
              <li>
                {isRtl ? 'اختر' : 'Scroll down & tap'}{' '}
                <strong className="text-emerald-300">«إضافة إلى الصفحة الرئيسية»</strong> (Add to Home Screen).
              </li>
              <li>
                {isRtl ? 'اضغط' : 'Tap'} <strong className="text-white">«إضافة» (Add)</strong> {isRtl ? 'بأعلى الزاوية لتثبيت التطبيق فوراً.' : 'in top corner.'}
              </li>
            </ol>
          </div>

          {/* Android / Play Store Guide */}
          <div className="bg-white/10 rounded-xl p-4 border border-white/15 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 font-black text-sm text-teal-300">
              <span>🤖</span>
              <span>{isRtl ? 'طريقة التثبيت على أندرويد (Android)' : 'How to Install on Android'}</span>
            </div>
            <ol className="space-y-2 text-slate-200 list-decimal list-inside pr-1">
              <li>
                {isRtl ? 'افتح الموقع عبر متصفح' : 'Open in'}{' '}
                <strong className="text-white underline">Google Chrome</strong>.
              </li>
              <li>
                {isRtl ? 'اضغط على زر القائمة الثلاث نقاط' : 'Tap the 3-dots menu'}{' '}
                <strong className="text-white">(⋮)</strong> {isRtl ? 'أعلى الزاوية.' : 'in top corner.'}
              </li>
              <li>
                {isRtl ? 'اختر' : 'Select'}{' '}
                <strong className="text-teal-300">«تثبيت التطبيق»</strong> (Install app) {isRtl ? 'أو إضافة للشاشة الرئيسية.' : 'or Add to Home Screen.'}
              </li>
              <li>
                {isRtl
                  ? 'التطبيق جاهز أيضاً للتحويل كملف APK لمتجر Google Play عبر TWA.'
                  : 'Ready to bundle as an APK for Google Play Store using TWA.'}
              </li>
            </ol>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-emerald-200 text-xs border-t border-white/10">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{isRtl ? 'سريع جداً لكاشير المحل' : 'Fast In-Store POS'}</span>
            </span>
            <span className="flex items-center gap-1">
              <WifiOff className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isRtl ? 'يعمل بدون إنترنت' : 'Offline Mode'}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/privacy-policy.html"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-emerald-200 hover:text-white underline font-semibold flex items-center gap-1"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-300" />
              <span>{isRtl ? 'سياسة الخصوصية (Google Play)' : 'Privacy Policy'}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Supabase Cloud Database & Storage Section */}
      <div className="bg-emerald-50/60 p-5 rounded-xl border border-emerald-200 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-700" />
            <h3 className="font-extrabold text-slate-900 text-sm">
              {isRtl ? 'قاعدة بيانات Supabase السحابية' : 'Supabase Cloud Database'}
            </h3>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isRtl ? 'المشروع متصل' : 'Connected'}
            </span>
          </div>
          <span className="font-mono text-xs text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200">
            Project: {DEFAULT_SUPABASE_PROJECT_ID}
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {isRtl
            ? 'يتم حفظ جميع فواتيرك وبيانات العملاء سحابياً في حسابك على Supabase. يمكنك مزامنة جميع البيانات الحالية فوراً أو نسخ كود SQL لإنشاء الجداول في لوحة سوبابيز.'
            : 'All your invoices and customer records are saved to your Supabase cloud project. You can trigger an instant bulk sync or copy the database schema SQL.'}
        </p>

        {supabaseSyncStatus && (
          <div className="p-3 bg-white border border-emerald-200 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{supabaseSyncStatus}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleSyncToSupabase}
            disabled={isSupabaseSyncing}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition"
          >
            <Cloud className={`w-3.5 h-3.5 ${isSupabaseSyncing ? 'animate-bounce' : ''}`} />
            <span>
              {isSupabaseSyncing
                ? (isRtl ? 'جاري المزامنة...' : 'Syncing...')
                : (isRtl ? 'مزامنة جميع الفواتير إلى Supabase الآن' : 'Sync All Invoices to Supabase')}
            </span>
          </button>

          <button
            type="button"
            onClick={handleCopySql}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 shadow-2xs transition"
          >
            {isSqlCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isSqlCopied ? (isRtl ? 'تم نسخ كود الـ SQL!' : 'SQL Copied!') : (isRtl ? 'نسخ كود الـ SQL (إنشاء الجداول)' : 'Copy SQL Schema')}</span>
          </button>

          <a
            href={`https://supabase.com/dashboard/project/${DEFAULT_SUPABASE_PROJECT_ID}/sql/new`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 shadow-2xs transition"
          >
            <span>{isRtl ? 'لوحة Supabase SQL Editor' : 'Open Supabase SQL Editor'}</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </a>
        </div>
      </div>

      {/* Data Backup, Import, and Reset Area */}
      <div className="bg-slate-100 p-5 rounded-xl border border-slate-200 space-y-3">
        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
          {t.backupSection}
        </h3>
        <p className="text-xs text-slate-600">
          {t.backupHelp}
        </p>

        {importStatus && (
          <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs font-semibold">
            {importStatus}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            {t.exportJsonBtn}
          </button>

          <label className="cursor-pointer px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 shadow-xs transition">
            <Upload className="w-3.5 h-3.5" />
            {t.importJsonBtn}
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleResetData}
            className={`px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition ${
              isRtl ? 'mr-auto' : 'ml-auto'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t.resetSamplesBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
