import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Users,
  Package,
  Settings,
  Calculator,
  Receipt,
  Menu,
  X,
  Globe,
} from 'lucide-react';
import { CompanyProfile } from '../types';
import { Language, translations } from '../utils/translations';

export type NavTab =
  | 'DASHBOARD'
  | 'CREATE_INVOICE'
  | 'INVOICE_HISTORY'
  | 'CUSTOMERS'
  | 'PRODUCTS'
  | 'COMPANY_SETTINGS'
  | 'VIEW_INVOICE';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  company: CompanyProfile;
  onOpenVatTests: () => void;
  lang: Language;
  onToggleLanguage: (nextLang: Language) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  company,
  onOpenVatTests,
  lang,
  onToggleLanguage,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const t = translations[lang];
  const isRtl = lang === 'ar';

  const navItems = [
    { id: 'DASHBOARD' as NavTab, label: t.nav.dashboard, icon: LayoutDashboard },
    { id: 'CREATE_INVOICE' as NavTab, label: t.nav.createInvoice, icon: PlusCircle },
    { id: 'INVOICE_HISTORY' as NavTab, label: t.nav.invoiceHistory, icon: FileText },
    { id: 'CUSTOMERS' as NavTab, label: t.nav.customers, icon: Users },
    { id: 'PRODUCTS' as NavTab, label: t.nav.products, icon: Package },
    { id: 'COMPANY_SETTINGS' as NavTab, label: t.nav.companySettings, icon: Settings },
  ];

  const handleTabClick = (tab: NavTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  const handleLanguageSwitch = () => {
    onToggleLanguage(lang === 'ar' ? 'en' : 'ar');
  };

  return (
    <>
      <header className="no-print sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Brand Logo & Title */}
            <div
              onClick={() => handleTabClick('DASHBOARD')}
              className="flex items-center gap-3 cursor-pointer select-none"
            >
              {company.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt={isRtl ? company.nameAr : company.nameEn}
                  className="h-9 w-auto max-w-[100px] object-contain rounded"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                  <Receipt className="w-5 h-5" />
                </div>
              )}
              <div>
                <span
                  className="font-bold text-sm sm:text-base text-slate-900 block leading-tight"
                  style={{ letterSpacing: 0, wordSpacing: 'normal' }}
                  lang={isRtl ? 'ar' : 'en'}
                  dir={isRtl ? 'rtl' : 'ltr'}
                >
                  {isRtl ? (company.nameAr || 'مركز الملك للدهانات') : (company.nameEn || 'King Paints Center')}
                </span>
                <span className="text-[10px] text-blue-700 font-semibold uppercase block" style={{ letterSpacing: 'normal' }}>
                  {t.appSubtitle}
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabClick(item.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-extrabold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right side quick actions */}
            <div className="flex items-center gap-2">
              {/* Language Switcher Button */}
              <button
                type="button"
                onClick={handleLanguageSwitch}
                title={lang === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 transition shadow-xs"
              >
                <Globe className="w-4 h-4 text-blue-600" />
                <span>{t.switchLang}</span>
              </button>

              <button
                type="button"
                onClick={onOpenVatTests}
                title={t.nav.vatTests}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 rounded-lg transition"
              >
                <Calculator className="w-3.5 h-3.5 text-blue-600" />
                <span>{t.nav.vatTests}</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('CREATE_INVOICE')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{t.nav.newInvoiceBtn}</span>
              </button>

              {/* Mobile menu button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full p-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2.5 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 text-blue-600" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  handleLanguageSwitch();
                  setMobileMenuOpen(false);
                }}
                className="w-full p-2.5 text-center text-xs font-bold text-slate-800 bg-slate-100 rounded-lg flex items-center justify-center gap-2"
              >
                <Globe className="w-4 h-4 text-blue-600" />
                <span>{lang === 'ar' ? 'English Language' : 'اللغة العربية'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenVatTests();
                  setMobileMenuOpen(false);
                }}
                className="w-full p-2 text-center text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg"
              >
                {t.nav.vatTests}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar for quick thumb access on phones */}
      <div className="lg:hidden no-print fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-3 flex items-center justify-around z-30 shadow-lg" dir={isRtl ? 'rtl' : 'ltr'}>
        <button
          type="button"
          onClick={() => handleTabClick('DASHBOARD')}
          className={`flex flex-col items-center p-1 text-[10px] font-medium ${
            activeTab === 'DASHBOARD' ? 'text-blue-600 font-bold' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          {t.nav.dashboard}
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('INVOICE_HISTORY')}
          className={`flex flex-col items-center p-1 text-[10px] font-medium ${
            activeTab === 'INVOICE_HISTORY' ? 'text-blue-600 font-bold' : 'text-slate-500'
          }`}
        >
          <FileText className="w-5 h-5 mb-0.5" />
          {t.nav.invoiceHistory}
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('CREATE_INVOICE')}
          className="flex flex-col items-center -mt-4 p-2 bg-blue-600 text-white rounded-full shadow-md text-[10px] font-bold"
        >
          <PlusCircle className="w-6 h-6" />
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('CUSTOMERS')}
          className={`flex flex-col items-center p-1 text-[10px] font-medium ${
            activeTab === 'CUSTOMERS' ? 'text-blue-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          {t.nav.customers}
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('COMPANY_SETTINGS')}
          className={`flex flex-col items-center p-1 text-[10px] font-medium ${
            activeTab === 'COMPANY_SETTINGS' ? 'text-blue-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          {t.nav.companySettings}
        </button>
      </div>
    </>
  );
};
