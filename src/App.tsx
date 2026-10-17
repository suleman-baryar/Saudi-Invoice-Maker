import React, { useState, useEffect } from 'react';
import { Invoice, CompanyProfile, Customer, InvoiceItem, PricingMode } from './types';
import { storage } from './utils/storage';
import { Language } from './utils/translations';
import { Navbar, NavTab } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { InvoiceEditor } from './components/InvoiceEditor';
import { InvoicePreview } from './components/InvoicePreview';
import { InvoiceHistory } from './components/InvoiceHistory';
import { CustomerManager } from './components/CustomerManager';
import { ProductManager } from './components/ProductManager';
import { CompanySettings } from './components/CompanySettings';
import { VatTestCasesModal } from './components/VatTestCasesModal';
import { PrintPreviewModal } from './components/PrintPreviewModal';
import { CustomerInvoiceView } from './components/CustomerInvoiceView';
import { SupabaseSyncModal } from './components/SupabaseSyncModal';
import { fetchInvoicesFromSupabase, fetchSingleInvoiceFromSupabase } from './utils/supabaseClient';

const LANG_STORAGE_KEY = 'saudi_invoice_app_language';

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    return saved === 'en' ? 'en' : 'ar';
  });

  const [activeTab, setActiveTab] = useState<NavTab>('DASHBOARD');
  const [invoices, setInvoices] = useState<Invoice[]>(() => storage.getInvoices());
  const [company, setCompany] = useState<CompanyProfile>(() => storage.getCompany());
  
  // Selected invoice for View/Print
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(() => {
    const list = storage.getInvoices();
    return list.length > 0 ? list[0] : null;
  });

  // Invoice being edited
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Print Preview Modal State
  const [printPreviewInvoice, setPrintPreviewInvoice] = useState<Invoice | null>(null);

  // Modals
  const [isVatTestOpen, setIsVatTestOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Customer Public View Mode (when opened via link from WhatsApp / SMS)
  const [isCustomerPublicMode, setIsCustomerPublicMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.has('inv') || params.has('invoice') || params.has('id') || params.has('invoiceId');
  });

  const [publicViewInvoice, setPublicViewInvoice] = useState<Invoice | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const targetNo = params.get('inv') || params.get('invoice');
    const targetId = params.get('id') || params.get('invoiceId');
    const list = storage.getInvoices();
    if (targetNo) {
      const found = list.find((i) => i.invoiceNumber.toLowerCase() === targetNo.toLowerCase());
      if (found) return found;
    }
    if (targetId) {
      const found = list.find((i) => i.id === targetId);
      if (found) return found;
    }
    return null;
  });

  const [customerLookupFailed, setCustomerLookupFailed] = useState(false);
  const [manualInvoiceInput, setManualInvoiceInput] = useState('');

  // Bulk sync all stored invoices to server on launch and pull cloud invoices from Supabase
  useEffect(() => {
    const list = storage.getInvoices();
    if (list.length > 0) {
      fetch('/api/invoices/bulk-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoices: list }),
      }).catch(() => {});
    }

    // Pull invoices from Supabase cloud database and merge with local storage
    fetchInvoicesFromSupabase().then((res) => {
      if (res.invoices && res.invoices.length > 0) {
        const localList = storage.getInvoices();
        const map = new Map<string, Invoice>();
        localList.forEach((inv) => map.set(inv.id, inv));
        let hasNew = false;
        res.invoices.forEach((inv) => {
          if (!map.has(inv.id)) {
            map.set(inv.id, inv);
            hasNew = true;
          }
        });
        if (hasNew) {
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
          );
          storage.saveInvoices(merged);
          setInvoices(merged);
        }
      }
    }).catch(() => {});
  }, []);

  // Fetch invoice from Supabase or server if external customer opened link on their device
  useEffect(() => {
    if (!isCustomerPublicMode) return;
    const params = new URLSearchParams(window.location.search);

    // 1. Try decoding embedded snapshot if present (zero server reliance - perfect for static Netlify CDN)
    const encodedDoc = params.get('d') || params.get('data') || params.get('doc');
    if (encodedDoc) {
      try {
        const jsonStr = decodeURIComponent(escape(atob(encodedDoc)));
        const parsed = JSON.parse(jsonStr);
        if (parsed && (parsed.invoiceNumber || parsed.id)) {
          setPublicViewInvoice(parsed as Invoice);
          return;
        }
      } catch (e) {
        console.warn('Could not decode embedded invoice param:', e);
      }
    }

    // 2. Fetch directly from Supabase (works on Netlify serverless static hosting) or server fallback
    const target = params.get('inv') || params.get('invoice') || params.get('id') || params.get('invoiceId');
    if (target && !publicViewInvoice) {
      fetchSingleInvoiceFromSupabase(target).then((supaInv) => {
        if (supaInv) {
          setPublicViewInvoice(supaInv);
          setCustomerLookupFailed(false);
          return;
        }
        // Fall back to server endpoint
        fetch(`/api/invoices/${encodeURIComponent(target)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data?.invoice) {
              setPublicViewInvoice(data.invoice);
            } else {
              setCustomerLookupFailed(true);
            }
          })
          .catch(() => {
            setCustomerLookupFailed(true);
          });
      }).catch(() => {
        fetch(`/api/invoices/${encodeURIComponent(target)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data?.invoice) {
              setPublicViewInvoice(data.invoice);
            } else {
              setCustomerLookupFailed(true);
            }
          })
          .catch(() => {
            setCustomerLookupFailed(true);
          });
      });
    } else if (!target) {
      setCustomerLookupFailed(true);
    }
  }, [isCustomerPublicMode, publicViewInvoice]);

  // Sync HTML dir and lang
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  }, [lang]);

  const handleToggleLanguage = (nextLang: Language) => {
    setLang(nextLang);
  };

  const refreshData = () => {
    setInvoices(storage.getInvoices());
    setCompany(storage.getCompany());
  };

  // Nav Handlers
  const handleNewInvoice = () => {
    setEditingInvoice(null);
    setActiveTab('CREATE_INVOICE');
  };

  const handleEditInvoice = (inv: Invoice) => {
    setEditingInvoice(inv);
    setActiveTab('CREATE_INVOICE');
  };

  const handleViewInvoice = (inv: Invoice) => {
    setCurrentInvoice(inv);
    setActiveTab('VIEW_INVOICE');
  };

  const handleOpenPrintPreview = (inv: Invoice) => {
    setPrintPreviewInvoice(inv);
  };

  const handleClosePrintPreview = () => {
    setPrintPreviewInvoice(null);
  };

  const handleDuplicateInvoice = (inv: Invoice) => {
    const nextNumber = storage.getNextInvoiceNumber(company.invoicePrefix || 'INV-2026-');
    const duplicated: Invoice = {
      ...inv,
      id: 'inv_' + Date.now(),
      invoiceNumber: nextNumber,
      issueDate: new Date().toISOString().split('T')[0],
      issueTime: new Date().toTimeString().split(' ')[0],
      status: 'DRAFT',
      paymentStatus: 'UNPAID',
      amountPaid: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingInvoice(duplicated);
    setActiveTab('CREATE_INVOICE');
  };

  const handleSaveInvoiceSuccess = (saved: Invoice) => {
    refreshData();
    setCurrentInvoice(saved);
    setActiveTab('VIEW_INVOICE');
  };

  const handlePreviewFromEditor = (draft: Invoice) => {
    setCurrentInvoice(draft);
    setActiveTab('VIEW_INVOICE');
  };

  const handleCustomerSelectForInvoice = (cust: Customer) => {
    const nextNumber = storage.getNextInvoiceNumber(company.invoicePrefix || 'INV-2026-');
    const newInv: Partial<Invoice> = {
      invoiceNumber: nextNumber,
      customer: cust,
      items: [],
    };
    setEditingInvoice(newInv as Invoice);
    setActiveTab('CREATE_INVOICE');
  };

  const handleLoadVatTestCase = (testItems: InvoiceItem[], mode: PricingMode, notes: string) => {
    const custs = storage.getCustomers();
    const nextNumber = storage.getNextInvoiceNumber(company.invoicePrefix || 'INV-2026-');
    const testInv: Partial<Invoice> = {
      id: 'test_inv_' + Date.now(),
      invoiceNumber: nextNumber,
      customer: custs[0],
      pricingMode: mode,
      items: testItems,
      notesAr: notes,
    };
    setEditingInvoice(testInv as Invoice);
    setActiveTab('CREATE_INVOICE');
  };

  if (isCustomerPublicMode) {
    if (publicViewInvoice) {
      return (
        <CustomerInvoiceView
          invoice={publicViewInvoice}
          lang={lang}
          onExitToPortal={() => {
            window.history.pushState({}, '', window.location.pathname);
            setIsCustomerPublicMode(false);
            setActiveTab('DASHBOARD');
          }}
        />
      );
    }

    if (customerLookupFailed) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-md text-center max-w-md w-full space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
              📄
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">
              {lang === 'ar' ? 'تعذر العثور على الفاتورة عبر هذا الرابط' : 'Invoice Not Found'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {lang === 'ar'
                ? 'يرجى التأكد من صحة رقم الفاتورة أو إدخال رقم الفاتورة للبحث عنها في نظام مركز الملك للدهانات:'
                : 'Please verify your invoice number or enter it below to search:'}
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={lang === 'ar' ? 'مثال: INV-2026-0001' : 'e.g. INV-2026-0001'}
                value={manualInvoiceInput}
                onChange={(e) => setManualInvoiceInput(e.target.value)}
                className="flex-1 px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => {
                  if (!manualInvoiceInput.trim()) return;
                  const target = manualInvoiceInput.trim();
                  // Check localStorage first
                  const list = storage.getInvoices();
                  const found = list.find((i) => i.invoiceNumber.toLowerCase() === target.toLowerCase() || i.id === target);
                  if (found) {
                    setPublicViewInvoice(found);
                    setCustomerLookupFailed(false);
                    return;
                  }
                  // Check Supabase cloud database
                  fetchSingleInvoiceFromSupabase(target).then((supaInv) => {
                    if (supaInv) {
                      setPublicViewInvoice(supaInv);
                      setCustomerLookupFailed(false);
                      return;
                    }
                    // Otherwise fetch from server
                    fetch(`/api/invoices/${encodeURIComponent(target)}`)
                      .then((res) => res.json())
                      .then((data) => {
                        if (data?.invoice) {
                          setPublicViewInvoice(data.invoice);
                          setCustomerLookupFailed(false);
                        } else {
                          alert(lang === 'ar' ? 'لم يتم العثور على الفاتورة' : 'Invoice not found');
                        }
                      })
                      .catch(() => {
                        alert(lang === 'ar' ? 'لم يتم العثور على الفاتورة' : 'Invoice not found');
                      });
                  }).catch(() => {
                    fetch(`/api/invoices/${encodeURIComponent(target)}`)
                      .then((res) => res.json())
                      .then((data) => {
                        if (data?.invoice) {
                          setPublicViewInvoice(data.invoice);
                          setCustomerLookupFailed(false);
                        } else {
                          alert(lang === 'ar' ? 'لم يتم العثور على الفاتورة' : 'Invoice not found');
                        }
                      });
                  });
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition"
              >
                {lang === 'ar' ? 'بحث' : 'Search'}
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400">مركز الملك للدهانات</span>
              <button
                type="button"
                onClick={() => {
                  window.history.pushState({}, '', window.location.pathname);
                  setIsCustomerPublicMode(false);
                  setActiveTab('DASHBOARD');
                }}
                className="text-blue-600 hover:underline font-medium"
              >
                {lang === 'ar' ? 'لوحة الإدارة' : 'Admin Portal'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-md text-center max-w-sm w-full space-y-4">
          <div className="w-12 h-12 border-3 border-[#25D366] border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">
            {lang === 'ar' ? 'جاري فتح الفاتورة الضريبية...' : 'Loading Tax Invoice...'}
          </h3>
          <p className="text-xs text-slate-500">
            {lang === 'ar' ? 'يتم جلب بيانات الفاتورة المعتمدة من مركز الملك للدهانات عبر الرابط' : 'Fetching verified invoice from King Paints Center'}
          </p>
          <button
            type="button"
            onClick={() => {
              window.history.pushState({}, '', window.location.pathname);
              setIsCustomerPublicMode(false);
            }}
            className="text-xs text-blue-600 hover:underline pt-2 inline-block"
          >
            {lang === 'ar' ? 'الانتقال إلى لوحة التحكم' : 'Go to Portal'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col pb-16 lg:pb-8 font-sans">
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        company={company}
        onOpenVatTests={() => setIsVatTestOpen(true)}
        onOpenSupabase={() => setIsSupabaseModalOpen(true)}
        lang={lang}
        onToggleLanguage={handleToggleLanguage}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'DASHBOARD' && (
          <Dashboard
            invoices={invoices}
            onNewInvoice={handleNewInvoice}
            onViewInvoice={handleViewInvoice}
            onEditInvoice={handleEditInvoice}
            onOpenVatTests={() => setIsVatTestOpen(true)}
            onOpenSupabase={() => setIsSupabaseModalOpen(true)}
            lang={lang}
            onPrintInvoice={handleOpenPrintPreview}
          />
        )}

        {activeTab === 'CREATE_INVOICE' && (
          <InvoiceEditor
            initialInvoice={editingInvoice}
            onSaveSuccess={handleSaveInvoiceSuccess}
            onCancel={() => setActiveTab('INVOICE_HISTORY')}
            onPreview={handlePreviewFromEditor}
            onPrintPreview={handleOpenPrintPreview}
            lang={lang}
          />
        )}

        {activeTab === 'VIEW_INVOICE' && (
          currentInvoice ? (
            <InvoicePreview
              invoice={currentInvoice}
              onEdit={() => handleEditInvoice(currentInvoice)}
              lang={lang}
              onPrint={() => handleOpenPrintPreview(currentInvoice)}
            />
          ) : (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-xs max-w-md mx-auto my-8">
              <h3 className="font-bold text-slate-800 text-base mb-2">
                {lang === 'ar' ? 'لا توجد فاتورة محددة للعرض' : 'No Invoice Selected'}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                {lang === 'ar' ? 'قم بإنشاء فاتورة جديدة للبدء في المعاينة والطباعة.' : 'Create a new invoice to preview, print or download.'}
              </p>
              <button
                type="button"
                onClick={handleNewInvoice}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition"
              >
                {lang === 'ar' ? '+ إنشاء فاتورة جديدة' : '+ Create New Invoice'}
              </button>
            </div>
          )
        )}

        {activeTab === 'INVOICE_HISTORY' && (
          <InvoiceHistory
            invoices={invoices}
            onRefresh={refreshData}
            onViewInvoice={handleViewInvoice}
            onEditInvoice={handleEditInvoice}
            onDuplicateInvoice={handleDuplicateInvoice}
            onNewInvoice={handleNewInvoice}
            lang={lang}
            onPrintInvoice={handleOpenPrintPreview}
          />
        )}

        {activeTab === 'CUSTOMERS' && (
          <CustomerManager
            onCustomerSelectForInvoice={handleCustomerSelectForInvoice}
            lang={lang}
          />
        )}

        {activeTab === 'PRODUCTS' && (
          <ProductManager
            lang={lang}
          />
        )}

        {activeTab === 'COMPANY_SETTINGS' && (
          <CompanySettings
            onSaved={refreshData}
            lang={lang}
          />
        )}
      </main>

      {/* VAT 15% Calculation Test Suite Modal */}
      <VatTestCasesModal
        isOpen={isVatTestOpen}
        onClose={() => setIsVatTestOpen(false)}
        onLoadTestCase={handleLoadVatTestCase}
        lang={lang}
      />

      {/* Dedicated Invoice Print Preview Modal */}
      <PrintPreviewModal
        isOpen={!!printPreviewInvoice}
        invoice={printPreviewInvoice}
        onClose={handleClosePrintPreview}
        lang={lang}
        onEdit={(inv) => {
          handleClosePrintPreview();
          handleEditInvoice(inv);
        }}
      />

      {/* Supabase Cloud Database Management & Sync Modal */}
      <SupabaseSyncModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        lang={lang}
        invoices={invoices}
        onInvoicesSynced={(updated) => {
          setInvoices(updated);
          if (updated.length > 0 && !currentInvoice) {
            setCurrentInvoice(updated[0]);
          }
        }}
      />
    </div>
  );
}
