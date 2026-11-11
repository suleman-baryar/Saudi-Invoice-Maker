import React, { useState } from 'react';
import { Supplier, PaymentMethod } from '../types';
import { storage } from '../utils/storage';
import { formatCurrency } from '../utils/vatCalculations';
import { Language } from '../utils/translations';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  DollarSign,
  User,
  X,
  PlusCircle,
  Receipt,
  CheckCircle,
} from 'lucide-react';

interface SupplierManagerProps {
  onNewPurchaseForSupplier?: (supplierId: string) => void;
  lang: Language;
}

export const SupplierManager: React.FC<SupplierManagerProps> = ({
  onNewPurchaseForSupplier,
  lang,
}) => {
  const isRtl = lang === 'ar';
  const [suppliers, setSuppliers] = useState<Supplier[]>(storage.getSuppliers());
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State: Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form State
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [companyNameAr, setCompanyNameAr] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [crNumber, setCrNumber] = useState('');
  const [addressAr, setAddressAr] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const refreshList = () => {
    storage.updateSupplierBalances();
    setSuppliers(storage.getSuppliers());
  };

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setNameAr('');
    setNameEn('');
    setCompanyNameAr('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setVatNumber('');
    setCrNumber('');
    setAddressAr('');
    setOpeningBalance(0);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setNameAr(sup.nameAr);
    setNameEn(sup.nameEn || '');
    setCompanyNameAr(sup.companyNameAr || '');
    setContactPerson(sup.contactPerson || '');
    setPhone(sup.phone || '');
    setEmail(sup.email || '');
    setVatNumber(sup.vatNumber || '');
    setCrNumber(sup.crNumber || '');
    setAddressAr(sup.addressAr || '');
    setOpeningBalance(sup.openingBalance || 0);
    setNotes(sup.notes || '');
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm(isRtl ? 'هل أنت متأكد من حذف هذا المورد؟' : 'Are you sure you want to delete this supplier?')) {
      storage.deleteSupplier(id);
      refreshList();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim()) return;

    if (editingSupplier) {
      storage.updateSupplier(editingSupplier.id, {
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim() || nameAr.trim(),
        companyNameAr: companyNameAr.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email.trim(),
        vatNumber: vatNumber.trim(),
        crNumber: crNumber.trim(),
        addressAr: addressAr.trim(),
        openingBalance: openingBalance || 0,
        notes: notes.trim(),
      });
    } else {
      const newSup: Supplier = {
        id: `sup_${Date.now()}`,
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim() || nameAr.trim(),
        companyNameAr: companyNameAr.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email.trim(),
        vatNumber: vatNumber.trim(),
        crNumber: crNumber.trim(),
        addressAr: addressAr.trim(),
        openingBalance: openingBalance || 0,
        totalPurchases: 0,
        totalPaid: 0,
        currentBalance: openingBalance || 0,
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      };
      storage.saveSupplier(newSup);
    }

    setIsModalOpen(false);
    refreshList();
  };

  const filteredSuppliers = suppliers.filter((s) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (s.nameAr || '').toLowerCase().includes(term) ||
      (s.nameEn || '').toLowerCase().includes(term) ||
      (s.phone || '').includes(term) ||
      (s.vatNumber || '').includes(term) ||
      (s.contactPerson || '').toLowerCase().includes(term)
    );
  });

  // Calculate totals
  const totalOutstanding = suppliers.reduce((sum, s) => sum + (s.currentBalance || 0), 0);
  const totalPurchasesAll = suppliers.reduce((sum, s) => sum + (s.totalPurchases || 0), 0);
  const totalPaidAll = suppliers.reduce((sum, s) => sum + (s.totalPaid || 0), 0);

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-700" />
            <span>{isRtl ? 'إدارة الموردين (Supplier Management)' : 'Supplier Management'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isRtl
              ? 'سجل مصانع وشركات الدهانات وموردي مواد البناء والديكور، تتبع الأرصدة والمدفوعات والمستحقات'
              : 'Database of paint manufacturers and suppliers, balance tracking, and invoices'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-900/20 transition inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>{isRtl ? '+ إضافة مورد جديد' : '+ New Supplier'}</span>
        </button>
      </div>

      {/* Aggregate Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-semibold block">
            {isRtl ? 'إجمالي مشترياتنا من جميع الموردين' : 'Total Purchases from Suppliers'}
          </span>
          <span className="text-lg font-black font-mono text-slate-900 mt-1 block">
            {formatCurrency(totalPurchasesAll)} <span className="text-xs font-normal">ر.س</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-emerald-700 font-semibold block">
            {isRtl ? 'إجمالي المبالغ المسددة للموردين' : 'Total Settled to Suppliers'}
          </span>
          <span className="text-lg font-black font-mono text-emerald-700 mt-1 block">
            {formatCurrency(totalPaidAll)} <span className="text-xs font-normal">ر.س</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-rose-600 font-semibold block">
            {isRtl ? 'إجمالي الأرصدة المستحقة للموردين (متبقي بذمتنا)' : 'Total Outstanding Debt'}
          </span>
          <span className="text-lg font-black font-mono text-rose-600 mt-1 block">
            {formatCurrency(totalOutstanding)} <span className="text-xs font-normal">ر.س</span>
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute top-3 right-3 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isRtl ? 'بحث باسم المورد، الرقم الضريبي، رقم الهاتف، أو اسم الشخص المسؤول...' : 'Search supplier by name, VAT #, phone...'}
            className="w-full pr-9 pl-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
          />
        </div>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map((sup) => (
          <div
            key={sup.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-emerald-300 transition space-y-4 flex flex-col justify-between"
          >
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                    <Building2 className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-sm text-slate-900 truncate">
                      {sup.nameAr}
                    </h3>
                    {sup.nameEn && (
                      <p className="text-[10px] text-slate-400 truncate">{sup.nameEn}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(sup)}
                    className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                    title="Edit"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(sup.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="pt-3 space-y-2 text-xs">
                {sup.vatNumber && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">{isRtl ? 'الرقم الضريبي:' : 'VAT #:'}</span>
                    <span className="font-mono font-bold text-slate-800">{sup.vatNumber}</span>
                  </div>
                )}

                {sup.contactPerson && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">{isRtl ? 'المسؤول:' : 'Contact:'}</span>
                    <span className="font-medium text-slate-800">{sup.contactPerson}</span>
                  </div>
                )}

                {sup.phone && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">{isRtl ? 'الجوال:' : 'Phone:'}</span>
                    <span className="font-mono text-slate-800" dir="ltr">{sup.phone}</span>
                  </div>
                )}

                {sup.addressAr && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">{isRtl ? 'العنوان:' : 'Address:'}</span>
                    <span className="text-slate-600 truncate max-w-[180px]">{sup.addressAr}</span>
                  </div>
                )}
              </div>

              {/* Balances Box */}
              <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-[11px] text-slate-600">
                  <span>{isRtl ? 'إجمالي المشتريات:' : 'Purchases:'}</span>
                  <span className="font-mono font-bold">{formatCurrency(sup.totalPurchases || 0)} SAR</span>
                </div>

                <div className="flex justify-between items-center text-[11px] text-emerald-700">
                  <span>{isRtl ? 'المسدد للمورد:' : 'Paid:'}</span>
                  <span className="font-mono font-bold">{formatCurrency(sup.totalPaid || 0)} SAR</span>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-slate-200 font-extrabold text-xs">
                  <span>{isRtl ? 'المستحق المتبقي:' : 'Outstanding:'}</span>
                  <span className={`font-mono ${sup.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {formatCurrency(sup.currentBalance || 0)} SAR
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Button */}
            {onNewPurchaseForSupplier && (
              <button
                type="button"
                onClick={() => onNewPurchaseForSupplier(sup.id)}
                className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-emerald-200"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{isRtl ? 'إنشاء فاتورة شراء لهذا المورد' : 'New Purchase Invoice'}</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Modal: Create or Edit Supplier */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-700" />
                <span>{editingSupplier ? (isRtl ? 'تعديل بيانات المورد' : 'Edit Supplier') : (isRtl ? 'إضافة مورد جديد' : 'New Supplier')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isRtl ? 'اسم المورد التجاري (عربي) *' : 'Supplier Name (Arabic) *'}
                </label>
                <input
                  type="text"
                  required
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder={isRtl ? 'مثال: شركة مصنع دهانات الجزيرة' : 'Supplier Arabic Name'}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isRtl ? 'الاسم بالإنجليزية (English Name)' : 'Supplier Name (English)'}
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g. Jazeera Paints Factory Co."
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isRtl ? 'الرقم الضريبي (15 رقم)' : 'VAT Number'}
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="300XXXXXXXXXXXX"
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isRtl ? 'السجل التجاري' : 'CR Number'}
                  </label>
                  <input
                    type="text"
                    value={crNumber}
                    onChange={(e) => setCrNumber(e.target.value)}
                    placeholder="1010XXXXXX"
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isRtl ? 'رقم الهاتف / الجوال' : 'Phone'}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isRtl ? 'الشخص المسؤول / المندوب' : 'Contact Person'}
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder={isRtl ? 'مثال: أحمد الشهري' : 'e.g. Sales Rep'}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isRtl ? 'البريد الإلكتروني' : 'Email'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="orders@supplier.sa"
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isRtl ? 'العنوان / المدينة' : 'Address'}
                </label>
                <input
                  type="text"
                  value={addressAr}
                  onChange={(e) => setAddressAr(e.target.value)}
                  placeholder={isRtl ? 'مثال: الرياض - المدينة الصناعية الثانية' : 'e.g. Riyadh Industrial City'}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isRtl ? 'الرصيد الافتتاحي (ر.س - متبقي سابق بذمتنا)' : 'Opening Balance (SAR)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isRtl ? 'ملاحظات إضافية' : 'Notes'}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isRtl ? 'شروط التوريد أو الخصومات المتفق عليها...' : 'Supply conditions or notes...'}
                  className="w-full p-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex gap-2 justify-end border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition shadow-sm"
                >
                  {isRtl ? 'حفظ بيانات المورد' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
