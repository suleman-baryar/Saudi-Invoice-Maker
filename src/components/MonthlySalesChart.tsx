import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Invoice } from '../types';
import { Language } from '../utils/translations';
import { formatCurrency } from '../utils/vatCalculations';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Sparkles,
  Award,
  Layers,
  Receipt,
  FileCheck2,
} from 'lucide-react';

interface MonthlySalesChartProps {
  invoices: Invoice[];
  lang: Language;
}

const MONTHS_AR = [
  'يناير',
  'فبراير',
  'مارس',
  'إبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTHS_AR_SHORT = [
  'يناير',
  'فبراير',
  'مارس',
  'إبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

const MONTHS_EN_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export interface MonthlyDataPoint {
  monthIndex: number;
  monthName: string;
  shortName: string;
  revenue: number;
  vat: number;
  count: number;
}

type MetricMode = 'REVENUE' | 'VAT' | 'COUNT';

export const MonthlySalesChart: React.FC<MonthlySalesChartProps> = ({
  invoices,
  lang,
}) => {
  const isRtl = lang === 'ar';
  const currentCalendarYear = new Date().getFullYear();

  // Find all available years in invoices or fallback to current year
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(currentCalendarYear);
    invoices.forEach((inv) => {
      if (inv.issueDate) {
        const year = parseInt(inv.issueDate.split('-')[0], 10);
        if (!isNaN(year) && year > 2000 && year < 2100) {
          yearsSet.add(year);
        }
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [invoices, currentCalendarYear]);

  const [selectedYear, setSelectedYear] = useState<number>(currentCalendarYear);
  const [metricMode, setMetricMode] = useState<MetricMode>('REVENUE');

  // Filter non-cancelled invoices for the selected year
  const yearInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (inv.status === 'CANCELLED') return false;
      if (!inv.issueDate) return false;
      const invYear = parseInt(inv.issueDate.split('-')[0], 10);
      return invYear === selectedYear;
    });
  }, [invoices, selectedYear]);

  // Aggregate monthly data for the 12 months
  const monthlyData = useMemo<MonthlyDataPoint[]>(() => {
    return Array.from({ length: 12 }, (_, monthIdx) => {
      const monthInvoices = yearInvoices.filter((inv) => {
        const parts = inv.issueDate.split('-');
        const invMonth = parseInt(parts[1], 10) - 1;
        return invMonth === monthIdx;
      });

      const revenue = monthInvoices.reduce(
        (sum, inv) => sum + (inv.grandTotal || 0),
        0
      );
      const vat = monthInvoices.reduce(
        (sum, inv) => sum + (inv.totalVat || 0),
        0
      );
      const count = monthInvoices.length;

      return {
        monthIndex: monthIdx,
        monthName: isRtl ? MONTHS_AR[monthIdx] : MONTHS_EN[monthIdx],
        shortName: isRtl ? MONTHS_AR_SHORT[monthIdx] : MONTHS_EN_SHORT[monthIdx],
        revenue: Math.round(revenue * 100) / 100,
        vat: Math.round(vat * 100) / 100,
        count,
      };
    });
  }, [yearInvoices, isRtl]);

  // Summary statistics for the year
  const totalYearRevenue = useMemo(() => {
    return monthlyData.reduce((sum, item) => sum + item.revenue, 0);
  }, [monthlyData]);

  const totalYearVat = useMemo(() => {
    return monthlyData.reduce((sum, item) => sum + item.vat, 0);
  }, [monthlyData]);

  const totalYearCount = useMemo(() => {
    return monthlyData.reduce((sum, item) => sum + item.count, 0);
  }, [monthlyData]);

  const avgMonthlyRevenue = useMemo(() => {
    return Math.round((totalYearRevenue / 12) * 100) / 100;
  }, [totalYearRevenue]);

  // Peak month calculation
  const peakMonth = useMemo<MonthlyDataPoint | null>(() => {
    let max = -1;
    let best: MonthlyDataPoint | null = null;
    monthlyData.forEach((m) => {
      const val =
        metricMode === 'REVENUE'
          ? m.revenue
          : metricMode === 'VAT'
          ? m.vat
          : m.count;
      if (val > max && val > 0) {
        max = val;
        best = m;
      }
    });
    return best;
  }, [monthlyData, metricMode]);

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-xl border border-slate-700/80 backdrop-blur-md text-xs min-w-[190px] space-y-2 pointer-events-none"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <div className="flex items-center justify-between border-b border-slate-700/70 pb-1.5">
            <span className="font-extrabold text-sm text-emerald-400">
              {data.monthName} {selectedYear}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
              {data.count} {isRtl ? 'فاتورة' : 'Inv.'}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-slate-300">
              <span>{isRtl ? 'إجمالي المبيعات:' : 'Sales Revenue:'}</span>
              <span className="font-mono font-bold text-white">
                {formatCurrency(data.revenue)} SAR
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>{isRtl ? 'ضريبة القيمة المضافة:' : 'VAT (15%):'}</span>
              <span className="font-mono text-indigo-300">
                {formatCurrency(data.vat)} SAR
              </span>
            </div>
          </div>

          {peakMonth && peakMonth.monthIndex === data.monthIndex && data.revenue > 0 && (
            <div className="pt-1 border-t border-slate-800 text-[10px] text-amber-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>{isRtl ? 'أعلى شهر مبيعاً في السنة' : 'Highest sales month'}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Chart Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-slate-900 text-sm sm:text-base">
                {isRtl
                  ? `إيرادات المبيعات الشهرية لعام ${selectedYear}`
                  : `Monthly Sales Revenue (${selectedYear})`}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                Recharts
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRtl
                ? 'رسم بياني لتتبع إجمالي الإيرادات وضريبة القيمة المضافة شهرياً طوال العام'
                : 'Interactive visual breakdown of monthly turnover and tax performance'}
            </p>
          </div>
        </div>

        {/* Year & Metric Mode Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Year selector */}
          <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500 ms-1" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="bg-transparent font-black text-slate-900 px-2 py-1 rounded-lg focus:outline-none cursor-pointer"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Metric Selector (Revenue vs VAT vs Invoices count) */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setMetricMode('REVENUE')}
              className={`px-3 py-1 rounded-lg transition ${
                metricMode === 'REVENUE'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isRtl ? 'الإيرادات' : 'Revenue'}
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('VAT')}
              className={`px-3 py-1 rounded-lg transition ${
                metricMode === 'VAT'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isRtl ? 'الضريبة' : 'VAT'}
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('COUNT')}
              className={`px-3 py-1 rounded-lg transition ${
                metricMode === 'COUNT'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isRtl ? 'العدد' : 'Count'}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-white grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Year Revenue */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500 block">
            {isRtl ? 'إجمالي مبيعات السنة' : 'Annual Sales Total'}
          </span>
          <div className="text-base sm:text-lg font-black font-mono text-slate-900 mt-1">
            {formatCurrency(totalYearRevenue)}{' '}
            <span className="text-[11px] font-sans text-slate-500 font-normal">
              SAR
            </span>
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
            {totalYearCount} {isRtl ? 'فاتورة معتمدة' : 'approved invoices'}
          </span>
        </div>

        {/* Average Monthly Sales */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500 block">
            {isRtl ? 'متوسط الإيراد الشهري' : 'Monthly Average'}
          </span>
          <div className="text-base sm:text-lg font-black font-mono text-blue-700 mt-1">
            {formatCurrency(avgMonthlyRevenue)}{' '}
            <span className="text-[11px] font-sans text-slate-500 font-normal">
              SAR
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {isRtl ? 'معدل 12 شهراً' : '12-month baseline'}
          </span>
        </div>

        {/* Peak Month */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500 block flex items-center justify-between">
            <span>{isRtl ? 'الشهر الأعلى مبيعاً' : 'Peak Sales Month'}</span>
            <Award className="w-3.5 h-3.5 text-amber-500" />
          </span>
          <div className="text-base sm:text-lg font-black text-emerald-800 mt-1">
            {peakMonth ? peakMonth.monthName : isRtl ? 'لا يوجد بعد' : 'None yet'}
          </div>
          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
            {peakMonth
              ? `${formatCurrency(peakMonth.revenue)} SAR`
              : isRtl
              ? 'بانتظار المبيعات'
              : 'Awaiting sales'}
          </span>
        </div>

        {/* Total Year VAT */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500 block">
            {isRtl ? 'ضريبة السنة (15%)' : 'Total Year VAT (15%)'}
          </span>
          <div className="text-base sm:text-lg font-black font-mono text-indigo-900 mt-1">
            {formatCurrency(totalYearVat)}{' '}
            <span className="text-[11px] font-sans text-indigo-400 font-normal">
              SAR
            </span>
          </div>
          <span className="text-[10px] text-indigo-600 block mt-0.5">
            {isRtl ? 'مستحقة للإقرار' : 'ZATCA Output Tax'}
          </span>
        </div>
      </div>

      {/* Main Bar Chart Container */}
      <div className="p-4 sm:p-6">
        <div className="w-full min-w-0 h-[280px] sm:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyData}
              margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="revenueBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.75} />
                </linearGradient>
                <linearGradient id="peakBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                  <stop offset="100%" stopColor="#047857" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="vatBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#4338ca" stopOpacity={0.75} />
                </linearGradient>
                <linearGradient id="countBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f172a" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#334155" stopOpacity={0.75} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />

              <XAxis
                dataKey="shortName"
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />

              <YAxis
                tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => {
                  if (metricMode === 'COUNT') return `${value}`;
                  if (value >= 1000) return `${Math.round(value / 1000)}k`;
                  return `${value}`;
                }}
                orientation={isRtl ? 'right' : 'left'}
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(241, 245, 249, 0.65)' }}
              />

              <Bar
                dataKey={
                  metricMode === 'REVENUE'
                    ? 'revenue'
                    : metricMode === 'VAT'
                    ? 'vat'
                    : 'count'
                }
                radius={[6, 6, 0, 0]}
                maxBarSize={45}
              >
                {monthlyData.map((entry, index) => {
                  const isPeak =
                    peakMonth &&
                    peakMonth.monthIndex === entry.monthIndex &&
                    (metricMode === 'REVENUE'
                      ? entry.revenue > 0
                      : metricMode === 'VAT'
                      ? entry.vat > 0
                      : entry.count > 0);

                  let fill = 'url(#revenueBarGrad)';
                  if (metricMode === 'VAT') fill = 'url(#vatBarGrad)';
                  if (metricMode === 'COUNT') fill = 'url(#countBarGrad)';
                  if (isPeak) fill = 'url(#peakBarGrad)';

                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={fill}
                      className="transition-all duration-300 hover:opacity-80"
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Informative Legend and Status */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block" />
              <span>
                {metricMode === 'REVENUE'
                  ? isRtl
                    ? 'إيرادات المبيعات الشهرية'
                    : 'Monthly Revenue'
                  : metricMode === 'VAT'
                  ? isRtl
                    ? 'ضريبة القيمة المضافة'
                    : 'VAT 15%'
                  : isRtl
                  ? 'عدد فواتير البيع'
                  : 'Invoices count'}
              </span>
            </div>

            {peakMonth && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
                <span className="text-emerald-800 font-semibold">
                  {isRtl ? 'الشهر الأعلى أداءً' : 'Peak performing month'} (
                  {peakMonth.monthName})
                </span>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-400">
            {totalYearCount === 0 ? (
              <span className="text-amber-600 font-medium">
                {isRtl
                  ? '⚡ جاهز لتسجيل المبيعات - سيبدأ الرسم البياني بالتحديث تلقائياً مع كل فاتورة جديدة'
                  : '⚡ Ready for sales - chart auto-updates as new invoices are saved'}
              </span>
            ) : (
              <span>
                {isRtl
                  ? `تم احتساب ${totalYearCount} فاتورة مسجلة لعام ${selectedYear}`
                  : `Calculated from ${totalYearCount} sales invoices in ${selectedYear}`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
