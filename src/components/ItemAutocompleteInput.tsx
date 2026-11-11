import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product } from '../types';
import { storage } from '../utils/storage';
import { Language } from '../utils/translations';
import { formatCurrency } from '../utils/vatCalculations';
import {
  ChevronDown,
  X,
  Package,
  Search,
  Plus,
  Check,
  Tag,
  Sparkles,
} from 'lucide-react';

interface ItemAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectProduct: (product: Product) => void;
  onProductCreated?: (product: Product) => void;
  products: Product[];
  lang: Language;
  placeholder?: string;
  inputClassName?: string;
  accentColor?: 'blue' | 'emerald';
  required?: boolean;
}

export const ItemAutocompleteInput: React.FC<ItemAutocompleteInputProps> = ({
  value,
  onChange,
  onSelectProduct,
  onProductCreated,
  products,
  lang,
  placeholder,
  inputClassName = '',
  accentColor = 'blue',
  required = false,
}) => {
  const isRtl = lang === 'ar';
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilterText, setActiveFilterText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);

  // Quick Add Form state
  const [newPrice, setNewPrice] = useState<number | ''>('');
  const [newUnit, setNewUnit] = useState('سطل');
  const [newCategory, setNewCategory] = useState('دهانات');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync activeFilterText with external value when user types in the input
  useEffect(() => {
    setActiveFilterText(value);
  }, [value]);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowQuickAddModal(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Extract categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set);
  }, [products]);

  // Instant real-time filtering:
  // When dropdown is opened, if activeFilterText is empty -> shows ALL items!
  // As soon as user starts typing -> filters in real-time!
  const filteredProducts = useMemo(() => {
    const query = activeFilterText.trim().toLowerCase();

    return products.filter((p) => {
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }
      if (!query) return true; // Show ALL items when no filter

      const matchAr = p.nameAr?.toLowerCase().includes(query);
      const matchEn = p.nameEn?.toLowerCase().includes(query);
      const matchCode = p.code?.toLowerCase().includes(query);
      const matchCat = p.category?.toLowerCase().includes(query);
      const matchPrice = p.unitPrice?.toString().includes(query);

      return matchAr || matchEn || matchCode || matchCat || matchPrice;
    });
  }, [products, activeFilterText, selectedCategory]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setActiveFilterText(val);
    setHighlightedIndex(0);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    // Open immediately on focus / click so user sees ALL items
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleToggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isOpen) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
      inputRef.current?.focus();
    }
  };

  const handleSelectProduct = (prod: Product) => {
    onSelectProduct(prod);
    setIsOpen(false);
    setShowQuickAddModal(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredProducts.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredProducts.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
        handleSelectProduct(filteredProducts[highlightedIndex]);
      } else if (filteredProducts.length === 1) {
        handleSelectProduct(filteredProducts[0]);
      } else {
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleQuickSave = (e: React.FormEvent) => {
    e.preventDefault();
    const itemName = activeFilterText.trim() || value.trim();
    if (!itemName) return;

    const unitPriceNum =
      typeof newPrice === 'number' ? newPrice : parseFloat(newPrice as string) || 0;
    const generatedCode = `MLK-${Date.now().toString().slice(-4)}`;

    const newProd = storage.addProduct({
      nameAr: itemName,
      nameEn: itemName,
      code: generatedCode,
      unitPrice: unitPriceNum,
      unitAr: newUnit,
      unitEn: 'Piece',
      vatRate: 15,
      category: newCategory,
    });

    onProductCreated?.(newProd);
    handleSelectProduct(newProd);
  };

  const focusRing =
    accentColor === 'emerald'
      ? 'focus:ring-emerald-500 focus:border-emerald-500'
      : 'focus:ring-blue-500 focus:border-blue-500';
  const badgeColor =
    accentColor === 'emerald'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : 'bg-blue-100 text-blue-800 border-blue-200';
  const btnColor =
    accentColor === 'emerald'
      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
      : 'bg-blue-600 hover:bg-blue-700 text-white';

  return (
    <div className="relative w-full" ref={containerRef} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Input with embedded dropdown chevron and clear button */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          required={required}
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onClick={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={
            placeholder ||
            (isRtl
              ? 'انقر لعرض الأصناف أو ابدأ بالكتابة للتصفية...'
              : 'Click to list all items or type to filter...')
          }
          className={`w-full text-sm sm:text-base py-2.5 sm:py-3 ${
            isRtl ? 'pr-5 pl-14 text-right' : 'pl-5 pr-14 text-left'
          } border border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 bg-white transition shadow-2xs ${focusRing} ${inputClassName}`}
          autoComplete="off"
        />

        <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 ${isRtl ? 'left-2' : 'right-2'}`}>
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setActiveFilterText('');
                inputRef.current?.focus();
              }}
              title={isRtl ? 'مسح' : 'Clear'}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleDropdown}
            title={
              isOpen
                ? isRtl
                  ? 'إغلاق القائمة'
                  : 'Close list'
                : isRtl
                ? 'عرض جميع الأصناف (انقر هنا)'
                : 'View all items (click here)'
            }
            className={`p-1.5 rounded-lg transition text-slate-500 hover:text-slate-800 hover:bg-slate-100 ${
              isOpen ? 'rotate-180 text-blue-600' : ''
            }`}
          >
            <ChevronDown className="w-5 h-5 transition-transform duration-200" />
          </button>
        </div>
      </div>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1.5 w-full min-w-[360px] sm:min-w-[520px] lg:min-w-[620px] max-w-[95vw] bg-white rounded-2xl shadow-2xl border-2 border-slate-200 overflow-hidden text-slate-900"
          style={{ [isRtl ? 'right' : 'left']: 0 }}
        >
          {/* Header Bar with Total Item Count and Quick Search/Clear */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2 font-black text-slate-900">
                <Package className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  {activeFilterText
                    ? isRtl
                      ? `نتائج البحث عن "${activeFilterText}"`
                      : `Results for "${activeFilterText}"`
                    : isRtl
                    ? 'جميع أصناف المخزن المحفوظة'
                    : 'All Saved Catalog Items'}
                </span>
                <span className={`text-xs font-mono px-2 py-0.5 rounded-full border font-bold ${badgeColor}`}>
                  {filteredProducts.length} / {products.length}
                </span>
              </div>

              {activeFilterText && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilterText('');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold underline"
                >
                  {isRtl ? 'عرض كل الأصناف' : 'Show all'}
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-3 py-1 rounded-lg font-bold shrink-0 transition ${
                    selectedCategory === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {isRtl ? 'الكل' : 'All'}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg font-bold shrink-0 transition ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* List of Products */}
          <div className="max-h-64 sm:max-h-72 overflow-y-auto divide-y divide-slate-100 p-1.5">
            {filteredProducts.length === 0 ? (
              <div className="p-5 text-center space-y-2.5">
                <p className="text-sm font-bold text-slate-700">
                  {isRtl
                    ? `لا يوجد صنف مطابق لـ "${activeFilterText}"`
                    : `No item found matching "${activeFilterText}"`}
                </p>
                <p className="text-xs text-slate-500">
                  {isRtl
                    ? 'يمكنك متابعة كتابة الصنف المخصص، أو حفظه الآن في المخزن:'
                    : 'You can use this custom item name or save it to inventory:'}
                </p>
                {!showQuickAddModal && (
                  <button
                    type="button"
                    onClick={() => setShowQuickAddModal(true)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-xs ${btnColor}`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      {isRtl
                        ? `+ حفظ "${activeFilterText}" كصنف دائم في المخزن`
                        : `+ Save "${activeFilterText}" to Inventory`}
                    </span>
                  </button>
                )}
              </div>
            ) : (
              filteredProducts.map((prod, idx) => {
                const isHighlighted = idx === highlightedIndex;
                return (
                  <div
                    key={prod.id}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelectProduct(prod)}
                    className={`px-4 py-3 rounded-xl cursor-pointer transition flex items-center justify-between gap-3 ${
                      isHighlighted
                        ? 'bg-blue-50/90 text-blue-950 font-semibold ring-1 ring-blue-300'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1 ps-1">
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <span className="font-extrabold text-sm sm:text-base text-slate-900 whitespace-nowrap">
                          {isRtl ? prod.nameAr : (prod.nameEn || prod.nameAr)}
                        </span>
                        {prod.code && (
                          <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-bold shrink-0">
                            {prod.code}
                          </span>
                        )}
                        {prod.category && (
                          <span className="inline-flex items-center gap-1 text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded text-[11px] shrink-0">
                            <Tag className="w-3 h-3" />
                            <span>{prod.category}</span>
                          </span>
                        )}
                        <span className="text-xs text-slate-500 font-bold shrink-0">
                          ({isRtl ? prod.unitAr || 'سطل' : prod.unitEn || 'Bucket'})
                        </span>
                      </div>

                      {prod.nameEn && isRtl && (
                        <div className="text-xs text-slate-400 font-medium truncate" dir="ltr">
                          {prod.nameEn}
                        </div>
                      )}
                    </div>

                    <div className="text-end shrink-0 ps-3">
                      <span className="text-sm sm:text-base font-black font-mono text-blue-700 block whitespace-nowrap">
                        {formatCurrency(prod.unitPrice)}
                        <span className="text-xs font-sans font-bold ms-1 text-slate-500">
                          ر.س
                        </span>
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        {isRtl ? 'انقر للاختيار' : 'Click to select'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Add Modal / Footer Form inside dropdown */}
          {showQuickAddModal ? (
            <form
              onSubmit={handleQuickSave}
              className="p-3 bg-blue-50/90 border-t border-blue-200 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between font-bold text-blue-900">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isRtl ? 'حفظ الصنف الجديد في المخزن' : 'Save New Catalog Item'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newPrice}
                  onChange={(e) =>
                    setNewPrice(e.target.value === '' ? '' : parseFloat(e.target.value))
                  }
                  placeholder={isRtl ? 'السعر *' : 'Price *'}
                  className="w-full p-1.5 rounded border border-slate-300 bg-white font-mono font-bold"
                />
                <select
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="w-full p-1.5 rounded border border-slate-300 bg-white"
                >
                  <option value="سطل">سطل</option>
                  <option value="جالون">جالون</option>
                  <option value="علبة">علبة</option>
                  <option value="كرتون">كرتون</option>
                  <option value="لتر">لتر</option>
                  <option value="حبة">حبة</option>
                  <option value="رول">رول</option>
                  <option value="متر">متر</option>
                  <option value="كيس">كيس</option>
                </select>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full p-1.5 rounded border border-slate-300 bg-white"
                >
                  <option value="دهانات">دهانات</option>
                  <option value="دهانات مائية">دهانات مائية</option>
                  <option value="دهانات زيتية">دهانات زيتية</option>
                  <option value="أساس ومعجون">أساس ومعجون</option>
                  <option value="أدوات ومعدات">أدوات ومعدات</option>
                  <option value="عوازل وبناء">عوازل وبناء</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              <button
                type="submit"
                className={`w-full py-1.5 rounded font-bold transition flex items-center justify-center gap-1 shadow-xs ${btnColor}`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isRtl ? 'حفظ الصنف واختياره' : 'Save & Select'}</span>
              </button>
            </form>
          ) : (
            <div className="p-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setShowQuickAddModal(true)}
                className="text-blue-700 hover:text-blue-900 font-bold inline-flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isRtl ? '+ إضافة صنف جديد للمخزن' : '+ Add new to inventory'}</span>
              </button>

              <span className="text-[10px] text-slate-400">
                {isRtl ? 'انقر على أي صنف لاختياره' : 'Click any item to pick'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
