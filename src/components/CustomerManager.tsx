import React, { useState } from 'react';
import { Customer } from '../types';
import { storage } from '../utils/storage';
import { Language, translations } from '../utils/translations';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Trash2,
  X,
  Building,
} from 'lucide-react';

interface CustomerManagerProps {
  onCustomerSelectForInvoice?: (customer: Customer) => void;
  lang: Language;
}

export const CustomerManager: React.FC<CustomerManagerProps> = ({
  onCustomerSelectForInvoice,
  lang,
}) => {
  const [customers, setCustomers] = useState<Customer[]>(storage.getCustomers());
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const t = translations[lang].customers;
  const isRtl = lang === 'ar';

  // Form State
  const [formData, setFormData] = useState({
    nameAr: '',
    nameEn: '',
    phone: '',
    email: '',
    vatNumber: '',
    crNumber: '',
    addressAr: '',
    addressEn: '',
    cityAr: 'الرياض',
    cityEn: 'Riyadh',
    notes: '',
  });

  const refreshCustomers = () => {
    setCustomers(storage.getCustomers());
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      nameAr: '',
      nameEn: '',
      phone: '',
      email: '',
      vatNumber: '',
      crNumber: '',
      addressAr: '',
      addressEn: '',
      cityAr: isRtl ? 'الرياض' : 'Riyadh',
      cityEn: 'Riyadh',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      nameAr: c.nameAr,
      nameEn: c.nameEn || '',
      phone: c.phone || '',
      email: c.email || '',
      vatNumber: c.vatNumber || '',
      crNumber: c.crNumber || '',
      addressAr: c.addressAr || '',
      addressEn: c.addressEn || '',
      cityAr: c.cityAr || 'الرياض',
      cityEn: c.cityEn || 'Riyadh',
      notes: c.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`${t.deleteConfirm} ${name}?`)) {
      storage.deleteCustomer(id);
      refreshCustomers();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nameAr.trim() && !formData.nameEn.trim()) return;

    if (editingCustomer) {
      storage.updateCustomer(editingCustomer.id, {
        nameAr: formData.nameAr.trim() || formData.nameEn.trim(),
        nameEn: formData.nameEn.trim() || formData.nameAr.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        vatNumber: formData.vatNumber.trim(),
        crNumber: formData.crNumber.trim(),
        addressAr: formData.addressAr.trim(),
        addressEn: formData.addressEn.trim(),
        cityAr: formData.cityAr.trim(),
        cityEn: formData.cityEn.trim(),
        notes: formData.notes.trim(),
      });
    } else {
      storage.addCustomer({
        nameAr: formData.nameAr.trim() || formData.nameEn.trim(),
        nameEn: formData.nameEn.trim() || formData.nameAr.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        vatNumber: formData.vatNumber.trim(),
        crNumber: formData.crNumber.trim(),
        addressAr: formData.addressAr.trim(),
        addressEn: formData.addressEn.trim(),
        cityAr: formData.cityAr.trim(),
        cityEn: formData.cityEn.trim(),
        notes: formData.notes.trim(),
      });
    }

    refreshCustomers();
    setIsModalOpen(false);
  };

  const filteredCustomers = customers.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.nameAr.toLowerCase().includes(term) ||
      (c.nameEn && c.nameEn.toLowerCase().includes(term)) ||
      (c.phone && c.phone.includes(term)) ||
      (c.vatNumber && c.vatNumber.includes(term))
    );
  });

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            {t.title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          {t.addNew}
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative max-w-md">
          <Search className={`w-4 h-4 text-slate-400 absolute top-2.5 ${isRtl ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.searchPlaceholder}
            className={`w-full text-xs py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'
            }`}
          />
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((c) => (
          <div
            key={c.id}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5 mb-2.5">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {isRtl ? c.nameAr : (c.nameEn || c.nameAr)}
                  </h3>
                  {c.nameEn && isRtl && (
                    <p className="text-xs text-slate-500" dir="ltr">
                      {c.nameEn}
                    </p>
                  )}
                  {c.nameAr && !isRtl && (
                    <p className="text-xs text-slate-500" dir="rtl">
                      {c.nameAr}
                    </p>
                  )}
                </div>
                {c.vatNumber && (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-mono font-bold shrink-0">
                    {t.b2bVatBadge}
                  </span>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                {c.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono">{c.phone}</span>
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </div>
                )}
                {c.vatNumber && (
                  <div className="flex items-center gap-2 font-mono">
                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{isRtl ? 'الرقم الضريبي:' : 'VAT:'} {c.vatNumber}</span>
                  </div>
                )}
                {(c.addressAr || c.cityAr) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{c.addressAr || ''} {c.cityAr ? `(${c.cityAr})` : ''}</span>
                  </div>
                )}
                {c.notes && (
                  <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded mt-2 italic">
                    "{c.notes}"
                  </p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between">
              {onCustomerSelectForInvoice && (
                <button
                  type="button"
                  onClick={() => onCustomerSelectForInvoice(c)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  {t.issueInvoiceForCustomer}
                </button>
              )}
              <div className={`flex items-center gap-1 ${isRtl ? 'mr-auto' : 'ml-auto'}`}>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(c)}
                  className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id, c.nameAr)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-xl">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingCustomer ? t.editModalTitle : t.addModalTitle}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t.nameAr}
                </label>
                <input
                  type="text"
                  required
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t.nameEn}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t.phone}</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="05xxxxxxxx"
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t.email}</label>
                  <input
                    type="email"
                    dir="ltr"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t.vatNumber}</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={formData.vatNumber}
                    onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                    placeholder="300000000000003"
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t.crNumber}</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={formData.crNumber}
                    onChange={(e) => setFormData({ ...formData, crNumber: e.target.value })}
                    placeholder="1010xxxxxx"
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isRtl ? 'العنوان بالعربية' : 'Address (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={formData.addressAr}
                    onChange={(e) => setFormData({ ...formData, addressAr: e.target.value })}
                    placeholder="مثال: الرياض - طريق الملك فهد"
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isRtl ? 'العنوان بالإنجليزية (Address in English)' : 'Address (English)'}
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.addressEn}
                    onChange={(e) => setFormData({ ...formData, addressEn: e.target.value })}
                    placeholder="e.g. Riyadh - King Fahd Rd"
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isRtl ? 'المدينة (عربي)' : 'City (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={formData.cityAr}
                    onChange={(e) => setFormData({ ...formData, cityAr: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isRtl ? 'المدينة (إنجليزي)' : 'City (English)'}
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.cityEn}
                    onChange={(e) => setFormData({ ...formData, cityEn: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t.notes}</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  {t.saveCustomer}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
