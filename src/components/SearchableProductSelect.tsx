import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product } from '../types';
import { storage } from '../utils/storage';
import { Language } from '../utils/translations';
import { formatCurrency } from '../utils/vatCalculations';
import {
  Search,
  Package,
  Plus,
  Check,
  ChevronDown,
  X,
  Tag,
  Sparkles,
  ArrowRight,
  Boxes,
} from 'lucide-react';

interface SearchableProductSelectProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onProductCreated?: (product: Product) => void;
  lang: Language;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  mode?: 'add' | 'select'; // 'add' = adds new line item; 'select' = populates active row
  selectedProductId?: string;
  variant?: 'header' | 'compact' | 'row';
}

export const SearchableProductSelect: React.FC<SearchableProductSelectProps> = ({
  products,
  onSelectProduct,
  onProductCreated,
  lang,
  placeholder,
  className = '',
  buttonClassName = '',
  mode = 'add',
  selectedProductId,
  variant = 'header',
}) => {
  const isRtl = lang === 'ar';
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Quick Inline Add State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [newProdNameAr, setNewProdNameAr] = useState('');
  const [newProdNameEn, setNewProdNameEn] = useState('');
  const [newProdCode, setNewProdCode] = useState('');
  const [newProdPrice, setNewProdPrice] = useState<number | ''>('');
  const [newProdUnit, setNewProdUnit] = useState('سطل');
  const [newProdCategory, setNewProdCategory] = useState('دهانات');

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsQuickAddOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Autofocus input
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Extract unique categories
  const categories = useMemo(() => {
    const catSet = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        catSet.add(p.category.trim());
      }
    });
    return Array.from(catSet);
  }, [products]);

  // Filter products by search term and category
  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      // Category filter
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }

      if (!term) return true;

      const matchNameAr = p.nameAr?.toLowerCase().includes(term);
      const matchNameEn = p.nameEn?.toLowerCase().includes(term);
      const matchCode = p.code?.toLowerCase().includes(term);
      const matchCategory = p.category?.toLowerCase().includes(term);
      const matchPrice = p.unitPrice?.toString().includes(term);

      return matchNameAr || matchNameEn || matchCode || matchCategory || matchPrice;
    });
  }, [products, searchTerm, selectedCategory]);

  const handleOpenDropdown = () => {
    setIsOpen(!isOpen);
    setIsQuickAddOpen(false);
    setSearchTerm('');
    setSelectedCategory('ALL');
  };

  const handleSelect = (prod: Product) => {
    onSelectProduct(prod);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdNameAr.trim() && !newProdNameEn.trim()) return;

    const unitPriceNum = typeof newProdPrice === 'number' ? newProdPrice : parseFloat(newProdPrice as string) || 0;
    const generatedCode = newProdCode.trim() || `PRD-${Date.now().toString().slice(-4)}`;

    const created = storage.addProduct({
      nameAr: newProdNameAr.trim() || newProdNameEn.trim(),
      nameEn: newProdNameEn.trim() || newProdNameAr.trim(),
      code: generatedCode,
      unitPrice: unitPriceNum,
      unitAr: newProdUnit.trim() || 'سطل',
      unitEn: 'Piece',
      vatRate: 15,
      category: newProdCategory.trim() || 'دهانات',
    });

    onProductCreated?.(created);
    onSelectProduct(created);

    // Reset & close
    setNewProdNameAr('');
    setNewProdNameEn('');
    setNewProdCode('');
    setNewProdPrice('');
    setIsQuickAddOpen(false);
    setIsOpen(false);
  };

  const defaultPlaceholder =
    placeholder ||
    (isRtl
      ? '🔍 اختر من الأصناف المحفوظة في المخزن...'
      : '🔍 Search saved items / products...');

  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find((p) => p.id === selectedProductId);
  }, [products, selectedProductId]);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Trigger Button */}
      {variant === 'header' && (
        <button
          type="button"
          onClick={handleOpenDropdown}
          className={`px-4 py-2.5 text-sm font-extrabold rounded-xl border-2 transition flex items-center justify-between gap-2.5 shadow-xs ${
            isOpen
              ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-500/20'
              : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800'
          } ${buttonClassName}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Package className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">
              {selectedProduct
                ? isRtl
                  ? selectedProduct.nameAr
                  : selectedProduct.nameEn || selectedProduct.nameAr
                : defaultPlaceholder}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {products.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold border border-slate-200">
                {products.length}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
      )}

      {variant === 'compact' && (
        <button
          type="button"
          onClick={handleOpenDropdown}
          title={isRtl ? 'بحث في الأصناف المحفوظة' : 'Search saved items'}
          className={`p-2 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 ${
            isOpen
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-800'
          } ${buttonClassName}`}
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {isRtl ? 'أصناف المخزن' : 'Saved Items'}
          </span>
          <ChevronDown className="w-3 h-3 opacity-70" />
        </button>
      )}

      {variant === 'row' && (
        <button
          type="button"
          onClick={handleOpenDropdown}
          title={isRtl ? 'اختر من الأصناف المحفوظة' : 'Pick from saved items'}
          className={`p-1.5 rounded-md border text-xs transition flex items-center gap-1 ${
            isOpen
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border-slate-200'
          } ${buttonClassName}`}
        >
          <Package className="w-3.5 h-3.5" />
          <span className="text-[10px] hidden md:inline font-semibold">
            {isRtl ? 'اختر' : 'Pick'}
          </span>
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1.5 w-80 sm:w-96 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900"
          style={{
            [isRtl ? 'right' : 'left']: variant === 'row' ? -10 : 0,
          }}
        >
          {/* Dropdown Header & Search Bar */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                <Package className="w-4 h-4 text-blue-600" />
                <span>
                  {isRtl ? 'الأصناف والمنتجات المحفوظة' : 'Saved Items & Products'}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                  {products.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Search Input */}
            <div className="relative">
              <Search
                className={`w-4 h-4 text-slate-400 absolute top-2.5 ${
                  isRtl ? 'right-2.5' : 'left-2.5'
                }`}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  isRtl
                    ? 'ابحث بالاسم، الكود، التصنيف، السعر...'
                    : 'Search by name, SKU code, category, price...'
                }
                className={`w-full text-xs py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white font-medium ${
                  isRtl ? 'pr-8 pl-8' : 'pl-8 pr-8'
                }`}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className={`absolute top-2.5 text-slate-400 hover:text-slate-600 ${
                    isRtl ? 'left-2.5' : 'right-2.5'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-2 py-0.5 rounded-lg font-bold shrink-0 transition ${
                    selectedCategory === 'ALL'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {isRtl ? 'الكل' : 'All'}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 rounded-lg font-bold shrink-0 transition ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Products List Body */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 p-1">
            {filteredProducts.length === 0 ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">
                    {searchTerm
                      ? isRtl
                        ? `لا يوجد صنف يطابق "${searchTerm}"`
                        : `No items matching "${searchTerm}"`
                      : isRtl
                      ? 'قائمة الأصناف المحفوظة فارغة حالياً'
                      : 'No saved products yet'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isRtl
                      ? 'يمكنك إضافة هذا الصنف وحفظه بالمخزن بضغطة واحدة:'
                      : 'You can save this item directly to your catalog now:'}
                  </p>
                </div>

                {!isQuickAddOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickAddOpen(true);
                      setNewProdNameAr(searchTerm);
                      setNewProdCode(`PRD-${Date.now().toString().slice(-4)}`);
                    }}
                    className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {isRtl
                        ? `+ حفظ "${searchTerm || 'صنف جديد'}" في المخزن`
                        : `+ Save "${searchTerm || 'New item'}" to Catalog`}
                    </span>
                  </button>
                )}
              </div>
            ) : (
              filteredProducts.map((prod) => {
                const isSelected = selectedProductId === prod.id;
                return (
                  <div
                    key={prod.id}
                    onClick={() => handleSelect(prod)}
                    className={`p-3 rounded-xl cursor-pointer transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-50/90 border border-blue-300 ring-1 ring-blue-300'
                        : 'hover:bg-slate-50 active:bg-slate-100'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm sm:text-base text-slate-900">
                          {isRtl ? prod.nameAr : (prod.nameEn || prod.nameAr)}
                        </span>
                        {prod.code && (
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-bold">
                            {prod.code}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
                        {prod.category && (
                          <span className="inline-flex items-center gap-1 text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">
                            <Tag className="w-3 h-3" />
                            <span>{prod.category}</span>
                          </span>
                        )}
                        <span>•</span>
                        <span className="font-bold text-slate-800">
                          {isRtl ? prod.unitAr || 'سطل' : prod.unitEn || 'Piece'}
                        </span>
                        {prod.nameEn && isRtl && (
                          <>
                            <span>•</span>
                            <span className="truncate text-slate-400 font-normal">
                              {prod.nameEn}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-end shrink-0 ps-2">
                      <div className="text-sm sm:text-base font-black font-mono text-blue-700">
                        {formatCurrency(prod.unitPrice)}
                        <span className="text-xs font-sans font-bold ms-1 text-slate-500">
                          SAR
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-400 block mt-0.5">
                        {mode === 'add'
                          ? isRtl
                            ? '+ إضافة للفاتورة'
                            : '+ Add'
                          : isRtl
                          ? 'اختيار'
                          : 'Select'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Add Form Section */}
          {isQuickAddOpen ? (
            <form
              onSubmit={handleQuickAddSubmit}
              className="p-3 bg-blue-50/70 border-t border-blue-200 space-y-2"
            >
              <div className="flex items-center justify-between text-xs font-bold text-blue-950">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isRtl ? 'إضافة وحفظ صنف جديد بالمخزن' : 'Quick Save New Item'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={newProdNameAr}
                  onChange={(e) => setNewProdNameAr(e.target.value)}
                  placeholder={isRtl ? 'اسم الصنف بالعربي *' : 'Item Name *'}
                  className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
                />
                <input
                  type="text"
                  value={newProdCode}
                  onChange={(e) => setNewProdCode(e.target.value)}
                  placeholder={isRtl ? 'رمز الصنف / SKU' : 'SKU / Code'}
                  className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newProdPrice}
                  onChange={(e) =>
                    setNewProdPrice(e.target.value === '' ? '' : parseFloat(e.target.value))
                  }
                  placeholder={isRtl ? 'سعر البيع *' : 'Price *'}
                  className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white font-mono font-bold"
                />
                <select
                  value={newProdUnit}
                  onChange={(e) => setNewProdUnit(e.target.value)}
                  className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white font-medium"
                >
                  <option value="سطل">سطل (Bucket)</option>
                  <option value="جالون">جالون (Gallon)</option>
                  <option value="علبة">علبة (Can)</option>
                  <option value="كرتون">كرتون (Box)</option>
                  <option value="درزن">درزن (Dozen)</option>
                  <option value="لتر">لتر (Liter)</option>
                  <option value="حبة">حبة (Piece)</option>
                  <option value="رول">رول (Roll)</option>
                  <option value="متر">متر (Meter)</option>
                  <option value="كيس">كيس (Bag)</option>
                  <option value="خدمة">خدمة/مصنعية</option>
                </select>
                <select
                  value={newProdCategory}
                  onChange={(e) => setNewProdCategory(e.target.value)}
                  className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white font-medium"
                >
                  <option value="دهانات">دهانات</option>
                  <option value="أساس ومعجون">أساس ومعجون</option>
                  <option value="أدوات ومعدات">أدوات ومعدات</option>
                  <option value="عوازل ومواد بناء">عوازل وبناء</option>
                  <option value="ديكورات">ديكورات</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isRtl ? 'حفظ وإدراج في الفاتورة الآن' : 'Save & Insert Into Invoice'}</span>
              </button>
            </form>
          ) : (
            <div className="p-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsQuickAddOpen(true);
                  setNewProdNameAr(searchTerm);
                  setNewProdCode(`PRD-${Date.now().toString().slice(-4)}`);
                }}
                className="text-xs font-bold text-blue-700 hover:text-blue-800 transition inline-flex items-center gap-1 p-1 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isRtl ? '+ إضافة صنف جديد للمخزن' : '+ Add New Item to Catalog'}</span>
              </button>

              <span className="text-[10px] text-slate-400">
                {isRtl ? 'انقر على أي صنف لإضافته' : 'Click any item to add'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
