import React, { useState } from 'react';
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
  Database,
  Building2,
  BarChart3,
  ShoppingCart,
  ChevronDown,
  ShoppingBag,
  Smartphone,
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
  | 'VIEW_INVOICE'
  | 'CREATE_PURCHASE_INVOICE'
  | 'PURCHASE_HISTORY'
  | 'SUPPLIERS'
  | 'REPORTS'
  | 'VIEW_PURCHASE_INVOICE';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  company: CompanyProfile;
  onOpenVatTests: () => void;
  onOpenSupabase: () => void;
  lang: Language;
  onToggleLanguage: (nextLang: Language) => void;
  onOpenInstallModal?: () => void;
  onOpenPlayStoreModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  company,
  onOpenVatTests,
  onOpenSupabase,
  lang,
  onToggleLanguage,
  onOpenInstallModal,
  onOpenPlayStoreModal,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [salesDropdownOpen, setSalesDropdownOpen] = useState(false);
  const [purchaseDropdownOpen, setPurchaseDropdownOpen] = useState(false);
  const [mobileAddModalOpen, setMobileAddModalOpen] = useState(false);

  const t = translations[lang];
  const isRtl = lang === 'ar';

  const handleTabClick = (tab: NavTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
    setSalesDropdownOpen(false);
    setPurchaseDropdownOpen(false);
    setMobileAddModalOpen(false);
  };

  const handleLanguageSwitch = () => {
    onToggleLanguage(lang === 'ar' ? 'en' : 'ar');
  };

  const isSalesActive =
    activeTab === 'CREATE_INVOICE' ||
    activeTab === 'INVOICE_HISTORY' ||
    activeTab === 'VIEW_INVOICE' ||
    activeTab === 'CUSTOMERS';

  const isPurchaseActive =
    activeTab === 'CREATE_PURCHASE_INVOICE' ||
    activeTab === 'PURCHASE_HISTORY' ||
    activeTab === 'VIEW_PURCHASE_INVOICE' ||
    activeTab === 'SUPPLIERS';

  return (
    <>
      <header
        className="no-print sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-3">
            {/* Brand Logo & Title */}
            <div
              onClick={() => handleTabClick('DASHBOARD')}
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none shrink-0"
            >
              {company.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt={isRtl ? company.nameAr : company.nameEn}
                  className="h-9 w-auto max-w-[100px] object-contain rounded"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-800 to-teal-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                  <Receipt className="w-5 h-5 text-emerald-100" />
                </div>
              )}
              <div>
                <span
                  className="font-black text-xs sm:text-base text-slate-900 block leading-tight"
                  style={{ letterSpacing: 0, wordSpacing: 'normal' }}
                  lang={isRtl ? 'ar' : 'en'}
                  dir={isRtl ? 'rtl' : 'ltr'}
                >
                  {isRtl
                    ? company.nameAr || 'مركز المالك للدهانات'
                    : company.nameEn || 'Markaz Al Malki Paint'}
                </span>
                <span
                  className="text-[10px] text-emerald-700 font-bold uppercase block"
                  style={{ letterSpacing: 'normal' }}
                >
                  {isRtl ? 'المبيعات والمشتريات والضريبة' : 'Sales & Purchases Manager'}
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden xl:flex items-center gap-1">
              {/* Dashboard */}
              <button
                type="button"
                onClick={() => handleTabClick('DASHBOARD')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'DASHBOARD'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>{t.nav.dashboard}</span>
              </button>

              {/* Sales Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setSalesDropdownOpen(!salesDropdownOpen);
                    setPurchaseDropdownOpen(false);
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    isSalesActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>{t.nav.salesMenu}</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                {salesDropdownOpen && (
                  <div className="absolute top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
                    <button
                      type="button"
                      onClick={() => handleTabClick('INVOICE_HISTORY')}
                      className="w-full text-start px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>{t.nav.invoiceHistory}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTabClick('CREATE_INVOICE')}
                      className="w-full text-start px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4 text-emerald-600" />
                      <span>{t.nav.createInvoice}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTabClick('CUSTOMERS')}
                      className="w-full text-start px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                    >
                      <Users className="w-4 h-4 text-slate-500" />
                      <span>{t.nav.customers}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Purchases Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setPurchaseDropdownOpen(!purchaseDropdownOpen);
                    setSalesDropdownOpen(false);
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    isPurchaseActive
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Receipt className="w-4 h-4 text-emerald-700" />
                  <span>{t.nav.purchasesMenu}</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                {purchaseDropdownOpen && (
                  <div className="absolute top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
                    <button
                      type="button"
                      onClick={() => handleTabClick('PURCHASE_HISTORY')}
                      className="w-full text-start px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2"
                    >
                      <Receipt className="w-4 h-4 text-emerald-700" />
                      <span>{t.nav.purchaseHistory}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTabClick('CREATE_PURCHASE_INVOICE')}
                      className="w-full text-start px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4 text-teal-600" />
                      <span>{t.nav.createPurchaseInvoice}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTabClick('SUPPLIERS')}
                      className="w-full text-start px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2"
                    >
                      <Building2 className="w-4 h-4 text-slate-500" />
                      <span>{t.nav.suppliers}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Products & Inventory */}
              <button
                type="button"
                onClick={() => handleTabClick('PRODUCTS')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'PRODUCTS'
                    ? 'bg-amber-50 text-amber-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Package className="w-4 h-4 text-amber-600" />
                <span>{t.nav.products}</span>
              </button>

              {/* Reports & VAT */}
              <button
                type="button"
                onClick={() => handleTabClick('REPORTS')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'REPORTS'
                    ? 'bg-teal-50 text-teal-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-teal-600" />
                <span>{t.nav.reports}</span>
              </button>

              {/* Settings */}
              <button
                type="button"
                onClick={() => handleTabClick('COMPANY_SETTINGS')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'COMPANY_SETTINGS'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Settings className="w-4 h-4 text-slate-500" />
                <span>{t.nav.companySettings}</span>
              </button>
            </nav>

            {/* Quick action buttons & tools */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Quick Sale Button */}
              <button
                type="button"
                onClick={() => handleTabClick('CREATE_INVOICE')}
                title={t.nav.createInvoice}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{t.nav.newInvoiceBtn}</span>
              </button>

              {/* Quick Purchase Button */}
              <button
                type="button"
                onClick={() => handleTabClick('CREATE_PURCHASE_INVOICE')}
                title={t.nav.createPurchaseInvoice}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 rounded-lg shadow-xs transition"
              >
                <Receipt className="w-3.5 h-3.5 text-emerald-950" />
                <span>{t.nav.newPurchaseBtn}</span>
              </button>

              {/* Supabase Cloud */}
              <button
                type="button"
                onClick={onOpenSupabase}
                title={isRtl ? 'قاعدة بيانات Supabase السحابية' : 'Supabase Cloud Database'}
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 transition shadow-2xs"
              >
                <Database className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden xl:inline">{isRtl ? 'سوبابيز' : 'Supabase'}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </button>

              {/* VAT 15% Test */}
              <button
                type="button"
                onClick={onOpenVatTests}
                title={t.nav.vatTests}
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-amber-900 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 rounded-lg transition"
              >
                <Calculator className="w-3.5 h-3.5 text-amber-700" />
                <span>Vat 15%</span>
              </button>

              {/* Google Play Publishing Guide */}
              {onOpenPlayStoreModal && (
                <button
                  type="button"
                  onClick={onOpenPlayStoreModal}
                  title={isRtl ? 'متطلبات نشر التطبيق على متجر Google Play' : 'Google Play Publishing Guide'}
                  className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition shadow-2xs active:scale-95"
                >
                  <span className="text-sm">▶️</span>
                  <span className="hidden xl:inline">{isRtl ? 'نشر Google Play' : 'Play Store'}</span>
                </button>
              )}

              {/* Install on Mobile App button */}
              {onOpenInstallModal && (
                <button
                  type="button"
                  onClick={onOpenInstallModal}
                  title={isRtl ? 'تثبيت التطبيق على آيفون وأندرويد' : 'Install on iPhone & Android'}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-emerald-400 bg-emerald-700 text-white hover:bg-emerald-800 transition shadow-xs active:scale-95"
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-200" />
                  <span className="hidden lg:inline">{isRtl ? 'تثبيت بالجوال' : 'Install App'}</span>
                </button>
              )}

              {/* Language Switcher Button */}
              <button
                type="button"
                onClick={handleLanguageSwitch}
                title={lang === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 transition shadow-2xs"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-700" />
                <span>{t.switchLang}</span>
              </button>

              {/* Mobile menu toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="xl:hidden p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Full Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-slate-200 bg-white p-3 space-y-3 max-h-[85vh] overflow-y-auto">
            {/* Quick Add Buttons on Mobile */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTabClick('CREATE_INVOICE')}
                className="p-2.5 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t.nav.newInvoiceBtn}</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabClick('CREATE_PURCHASE_INVOICE')}
                className="p-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-xs"
              >
                <Receipt className="w-4 h-4" />
                <span>{t.nav.newPurchaseBtn}</span>
              </button>
            </div>

            {/* Dashboard */}
            <button
              type="button"
              onClick={() => handleTabClick('DASHBOARD')}
              className={`w-full p-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2.5 ${
                activeTab === 'DASHBOARD'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-400" />
              <span>{t.nav.dashboard}</span>
            </button>

            {/* Section: Sales */}
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-blue-700 px-2 block">
                {isRtl ? 'المبيعات والعملاء (Sales)' : 'Sales & Customers'}
              </span>
              <button
                type="button"
                onClick={() => handleTabClick('INVOICE_HISTORY')}
                className={`w-full p-2 rounded-lg text-xs font-bold flex items-center gap-2 ${
                  activeTab === 'INVOICE_HISTORY' ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                }`}
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span>{t.nav.invoiceHistory}</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabClick('CUSTOMERS')}
                className={`w-full p-2 rounded-lg text-xs font-bold flex items-center gap-2 ${
                  activeTab === 'CUSTOMERS' ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                }`}
              >
                <Users className="w-4 h-4 text-blue-600" />
                <span>{t.nav.customers}</span>
              </button>
            </div>

            {/* Section: Purchases */}
            <div className="space-y-1 pt-1 border-t border-slate-100">
              <span className="text-[10px] font-black uppercase text-emerald-700 px-2 block">
                {isRtl ? 'المشتريات والموردين (Purchases)' : 'Purchases & Suppliers'}
              </span>
              <button
                type="button"
                onClick={() => handleTabClick('PURCHASE_HISTORY')}
                className={`w-full p-2 rounded-lg text-xs font-bold flex items-center gap-2 ${
                  activeTab === 'PURCHASE_HISTORY'
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-slate-700'
                }`}
              >
                <Receipt className="w-4 h-4 text-emerald-700" />
                <span>{t.nav.purchaseHistory}</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabClick('SUPPLIERS')}
                className={`w-full p-2 rounded-lg text-xs font-bold flex items-center gap-2 ${
                  activeTab === 'SUPPLIERS' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700'
                }`}
              >
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span>{t.nav.suppliers}</span>
              </button>
            </div>

            {/* Section: Inventory & Analytics */}
            <div className="space-y-1 pt-1 border-t border-slate-100">
              <span className="text-[10px] font-black uppercase text-amber-700 px-2 block">
                {isRtl ? 'المحل والتقارير (Inventory & Reports)' : 'Inventory & Reports'}
              </span>
              <button
                type="button"
                onClick={() => handleTabClick('PRODUCTS')}
                className={`w-full p-2 rounded-lg text-xs font-bold flex items-center gap-2 ${
                  activeTab === 'PRODUCTS' ? 'bg-amber-50 text-amber-900' : 'text-slate-700'
                }`}
              >
                <Package className="w-4 h-4 text-amber-600" />
                <span>{t.nav.products}</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabClick('REPORTS')}
                className={`w-full p-2 rounded-lg text-xs font-bold flex items-center gap-2 ${
                  activeTab === 'REPORTS' ? 'bg-teal-50 text-teal-900' : 'text-slate-700'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-teal-600" />
                <span>{t.nav.reports}</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabClick('COMPANY_SETTINGS')}
                className={`w-full p-2 rounded-lg text-xs font-bold flex items-center gap-2 ${
                  activeTab === 'COMPANY_SETTINGS' ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
                }`}
              >
                <Settings className="w-4 h-4 text-slate-500" />
                <span>{t.nav.companySettings}</span>
              </button>
            </div>

            {/* Tools */}
            <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
              {onOpenPlayStoreModal && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenPlayStoreModal();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full p-2.5 text-center text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl flex items-center justify-center gap-2 shadow-2xs"
                >
                  <span className="text-sm">▶️</span>
                  <span>{isRtl ? 'دليل نشر التطبيق على Google Play Store' : 'Google Play Publishing Guide'}</span>
                </button>
              )}

              {onOpenInstallModal && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenInstallModal();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full p-2.5 text-center text-xs font-bold text-white bg-gradient-to-r from-emerald-800 to-teal-800 border border-emerald-600 rounded-xl flex items-center justify-center gap-2 shadow-sm"
                >
                  <Smartphone className="w-4 h-4 text-emerald-300" />
                  <span>{isRtl ? '📲 دليل تثبيت التطبيق على آيفون وأندرويد' : 'Install on iPhone & Android'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onOpenSupabase();
                  setMobileMenuOpen(false);
                }}
                className="w-full p-2 text-center text-xs font-bold text-emerald-950 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-2"
              >
                <Database className="w-4 h-4 text-emerald-700" />
                <span>{isRtl ? 'قاعدة بيانات Supabase السحابية' : 'Supabase Cloud Database'}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenVatTests();
                  setMobileMenuOpen(false);
                }}
                className="w-full p-2 text-center text-xs font-bold text-amber-900 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-center gap-2"
              >
                <Calculator className="w-4 h-4 text-amber-600" />
                <span>{t.nav.vatTests}</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar for rapid one-thumb actions in shop */}
      <div
        className="xl:hidden no-print fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-3 flex items-center justify-around z-30 shadow-lg"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Dashboard */}
        <button
          type="button"
          onClick={() => handleTabClick('DASHBOARD')}
          className={`flex flex-col items-center p-1 text-[10px] font-bold ${
            activeTab === 'DASHBOARD' ? 'text-emerald-700' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>{isRtl ? 'الرئيسية' : 'Home'}</span>
        </button>

        {/* Sales */}
        <button
          type="button"
          onClick={() => handleTabClick('INVOICE_HISTORY')}
          className={`flex flex-col items-center p-1 text-[10px] font-bold ${
            activeTab === 'INVOICE_HISTORY' ? 'text-blue-600' : 'text-slate-500'
          }`}
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span>{isRtl ? 'المبيعات' : 'Sales'}</span>
        </button>

        {/* Floating Center Action Button with Quick Selection */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMobileAddModalOpen(!mobileAddModalOpen)}
            className="flex flex-col items-center -mt-5 p-3 bg-gradient-to-tr from-emerald-700 to-teal-500 text-white rounded-full shadow-lg shadow-emerald-900/30 text-[10px] font-black active:scale-95 transition"
            title="Create Invoice"
          >
            <PlusCircle className="w-6 h-6" />
          </button>

          {mobileAddModalOpen && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-48 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
              <button
                type="button"
                onClick={() => handleTabClick('CREATE_INVOICE')}
                className="w-full text-start p-2 rounded-xl bg-blue-50 text-blue-800 text-xs font-bold flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4 text-blue-600" />
                <span>{isRtl ? 'فاتورة مبيعات جديدة' : 'New Sale'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabClick('CREATE_PURCHASE_INVOICE')}
                className="w-full text-start p-2 rounded-xl bg-emerald-50 text-emerald-900 text-xs font-bold flex items-center gap-2"
              >
                <Receipt className="w-4 h-4 text-emerald-700" />
                <span>{isRtl ? 'فاتورة مشتريات جديدة' : 'New Purchase'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Purchases */}
        <button
          type="button"
          onClick={() => handleTabClick('PURCHASE_HISTORY')}
          className={`flex flex-col items-center p-1 text-[10px] font-bold ${
            activeTab === 'PURCHASE_HISTORY' ? 'text-emerald-700' : 'text-slate-500'
          }`}
        >
          <Receipt className="w-5 h-5 mb-0.5" />
          <span>{isRtl ? 'المشتريات' : 'Purchases'}</span>
        </button>

        {/* Reports */}
        <button
          type="button"
          onClick={() => handleTabClick('REPORTS')}
          className={`flex flex-col items-center p-1 text-[10px] font-bold ${
            activeTab === 'REPORTS' ? 'text-teal-700' : 'text-slate-500'
          }`}
        >
          <BarChart3 className="w-5 h-5 mb-0.5" />
          <span>{isRtl ? 'التقارير' : 'Reports'}</span>
        </button>
      </div>
    </>
  );
};
