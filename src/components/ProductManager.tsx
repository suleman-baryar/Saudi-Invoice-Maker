import React, { useState } from 'react';
import { Product } from '../types';
import { storage } from '../utils/storage';
import { formatCurrency } from '../utils/vatCalculations';
import { Language, translations } from '../utils/translations';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';

interface ProductManagerProps {
  onProductSelectForInvoice?: (product: Product) => void;
  lang: Language;
}

export const ProductManager: React.FC<ProductManagerProps> = ({
  onProductSelectForInvoice,
  lang,
}) => {
  const [products, setProducts] = useState<Product[]>(storage.getProducts());
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const t = translations[lang].products;
  const isRtl = lang === 'ar';

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    nameAr: '',
    nameEn: '',
    unitPrice: 100,
    unitAr: 'حبة',
    unitEn: 'Piece',
    vatRate: 15,
    category: isRtl ? 'دهانات / Paints' : 'Paints',
  });

  const refreshProducts = () => {
    setProducts(storage.getProducts());
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      code: 'PROD-' + (products.length + 1),
      nameAr: '',
      nameEn: '',
      unitPrice: 100,
      unitAr: isRtl ? 'حبة' : 'Piece',
      unitEn: 'Piece',
      vatRate: 15,
      category: isRtl ? 'عام / General' : 'General',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      code: p.code,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      unitPrice: p.unitPrice,
      unitAr: p.unitAr,
      unitEn: p.unitEn,
      vatRate: p.vatRate,
      category: p.category || (isRtl ? 'عام / General' : 'General'),
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`${t.deleteConfirm} ${name}?`)) {
      storage.deleteProduct(id);
      refreshProducts();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nameAr.trim() && !formData.nameEn.trim()) return;

    if (editingProduct) {
      storage.updateProduct(editingProduct.id, {
        code: formData.code.trim(),
        nameAr: formData.nameAr.trim() || formData.nameEn.trim(),
        nameEn: formData.nameEn.trim() || formData.nameAr.trim(),
        unitPrice: Number(formData.unitPrice) || 0,
        unitAr: formData.unitAr.trim(),
        unitEn: formData.unitEn.trim(),
        vatRate: Number(formData.vatRate) || 15,
        category: formData.category.trim(),
      });
    } else {
      storage.addProduct({
        code: formData.code.trim(),
        nameAr: formData.nameAr.trim() || formData.nameEn.trim(),
        nameEn: formData.nameEn.trim() || formData.nameAr.trim(),
        unitPrice: Number(formData.unitPrice) || 0,
        unitAr: formData.unitAr.trim(),
        unitEn: formData.unitEn.trim(),
        vatRate: Number(formData.vatRate) || 15,
        category: formData.category.trim(),
      });
    }

    refreshProducts();
    setIsModalOpen(false);
  };

  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.nameAr.toLowerCase().includes(term) ||
      p.nameEn.toLowerCase().includes(term) ||
      p.code.toLowerCase().includes(term) ||
      (p.category && p.category.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
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
          <Plus className="w-4 h-4" />
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

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`w-full text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3 w-24">{t.sku}</th>
                <th className="p-3 min-w-[200px]">{t.name}</th>
                <th className="p-3">{t.category}</th>
                <th className="p-3 text-center">{t.unit}</th>
                <th className="p-3 text-center">{t.vatRate}</th>
                <th className="p-3 text-center font-bold">{t.unitPrice}</th>
                <th className="p-3 text-center w-28">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3 font-mono font-bold text-blue-900">{p.code}</td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900">
                      {isRtl ? p.nameAr : (p.nameEn || p.nameAr)}
                    </div>
                    {p.nameEn && isRtl && (
                      <div className="text-[11px] text-slate-500" dir="ltr">
                        {p.nameEn}
                      </div>
                    )}
                    {p.nameAr && !isRtl && (
                      <div className="text-[11px] text-slate-500" dir="rtl">
                        {p.nameAr}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-slate-600">{p.category || '-'}</td>
                  <td className="p-3 text-center text-slate-700 font-medium">
                    {isRtl ? p.unitAr : (p.unitEn || p.unitAr)}
                  </td>
                  <td className="p-3 text-center font-mono">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.vatRate === 15 ? 'bg-blue-50 text-blue-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p.vatRate}%
                    </span>
                  </td>
                  <td className="p-3 text-center font-mono font-extrabold text-slate-900 text-sm">
                    {formatCurrency(p.unitPrice)} <span className="text-[10px] font-sans font-normal">SAR</span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id, p.nameAr)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-xl">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingProduct ? t.editModalTitle : t.addModalTitle}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t.sku} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t.category}</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t.nameArLabel}
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
                  {t.nameEnLabel}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t.priceSar}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t.unitAr}</label>
                  <input
                    type="text"
                    value={formData.unitAr}
                    onChange={(e) => setFormData({ ...formData, unitAr: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t.unitEn}</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.unitEn}
                    onChange={(e) => setFormData({ ...formData, unitEn: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t.defaultVatRate}
                </label>
                <select
                  value={formData.vatRate}
                  onChange={(e) => setFormData({ ...formData, vatRate: parseFloat(e.target.value) })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="15">{t.standardVatOption}</option>
                  <option value="0">{t.exemptVatOption}</option>
                </select>
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
                  {t.saveProduct}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
