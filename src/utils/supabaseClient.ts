import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Invoice, Customer, CompanyProfile, Product } from '../types';

const STORAGE_KEYS = {
  URL: 'saudi_invoice_supabase_url',
  KEY: 'saudi_invoice_supabase_anon_key',
  AUTO_SYNC: 'saudi_invoice_supabase_auto_sync',
};

// Supabase Connection Credentials provided by user
export const DEFAULT_SUPABASE_PROJECT_ID = 'kvmlpimudqjzljumnstw';
export const DEFAULT_SUPABASE_URL = 'https://kvmlpimudqjzljumnstw.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_Kidm5sgUt3YdIEn6yCdxSw_0jtSEkxi';

export const SUPABASE_SQL_SCHEMA = `-- ==============================================================
-- مركز الملك للدهانات - Saudi Invoice Maker Pro Database Schema
-- Run this SQL in your Supabase Dashboard:
-- https://supabase.com/dashboard/project/kvmlpimudqjzljumnstw/sql/new
-- ==============================================================

-- 1. Invoices Table (جدول الفواتير الضريبية)
CREATE TABLE IF NOT EXISTS public.invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  issue_date TEXT,
  issue_time TEXT,
  pricing_mode TEXT DEFAULT 'INCLUSIVE',
  status TEXT DEFAULT 'FINALIZED',
  payment_status TEXT DEFAULT 'PAID',
  payment_method TEXT DEFAULT 'CASH',
  customer_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  grand_total NUMERIC DEFAULT 0,
  taxable_amount NUMERIC DEFAULT 0,
  total_vat NUMERIC DEFAULT 0,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices (invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_phone ON public.invoices (customer_phone);

-- 2. Customers Table (جدول العملاء)
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  phone TEXT,
  vat_number TEXT,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Products Table (جدول المنتجات والخدمات)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  code TEXT,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  unit_price NUMERIC DEFAULT 0,
  vat_rate NUMERIC DEFAULT 15,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Company Profile Table (جدول إعدادات وبيانات المنشأة)
CREATE TABLE IF NOT EXISTS public.company_profile (
  id TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  vat_number TEXT,
  cr_number TEXT,
  phone TEXT,
  data JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Row Level Security & Anonymous Access Policies
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access for invoices" ON public.invoices;
CREATE POLICY "Public access for invoices" ON public.invoices FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for customers" ON public.customers;
CREATE POLICY "Public access for customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for products" ON public.products;
CREATE POLICY "Public access for products" ON public.products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for company_profile" ON public.company_profile;
CREATE POLICY "Public access for company_profile" ON public.company_profile FOR ALL USING (true) WITH CHECK (true);
`;

export function getSupabaseCredentials(): { url: string; key: string; projectId: string } {
  let url = DEFAULT_SUPABASE_URL;
  let key = DEFAULT_SUPABASE_ANON_KEY;

  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem(STORAGE_KEYS.URL);
    const customKey = localStorage.getItem(STORAGE_KEYS.KEY);
    if (customUrl && customUrl.trim()) url = customUrl.trim();
    if (customKey && customKey.trim()) key = customKey.trim();
  }

  // Vite environment variables if defined
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_SUPABASE_URL) url = import.meta.env.VITE_SUPABASE_URL;
    if (import.meta.env.VITE_SUPABASE_ANON_KEY) key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  }

  const projectId = url.replace('https://', '').replace('.supabase.co', '').split('/')[0] || DEFAULT_SUPABASE_PROJECT_ID;

  return { url, key, projectId };
}

let cachedClient: SupabaseClient | null = null;
let currentUrl = '';
let currentKey = '';

export function getSupabaseClient(): SupabaseClient {
  const { url, key } = getSupabaseCredentials();
  if (!cachedClient || currentUrl !== url || currentKey !== key) {
    currentUrl = url;
    currentKey = key;
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return cachedClient;
}

export const supabase = getSupabaseClient();

export interface SupabaseHealth {
  connected: boolean;
  url: string;
  projectId: string;
  tablesExist: {
    invoices: boolean;
    customers: boolean;
    products: boolean;
    company_profile: boolean;
  };
  error?: string;
  needsSchemaSetup: boolean;
  lastChecked: string;
}

/**
 * Tests connection to Supabase and checks if required tables exist
 */
export async function testSupabaseHealth(): Promise<SupabaseHealth> {
  const { url, projectId } = getSupabaseCredentials();
  const client = getSupabaseClient();

  const result: SupabaseHealth = {
    connected: false,
    url,
    projectId,
    tablesExist: {
      invoices: false,
      customers: false,
      products: false,
      company_profile: false,
    },
    needsSchemaSetup: false,
    lastChecked: new Date().toISOString(),
  };

  try {
    const isMissingTable = (err: any) => {
      if (!err) return false;
      const msg = (err.message || '').toLowerCase();
      return (
        err.code === 'PGRST205' ||
        err.code === '42P01' ||
        msg.includes('not find the table') ||
        msg.includes('does not exist')
      );
    };

    const { error: invErr } = await client.from('invoices').select('id').limit(1);
    result.tablesExist.invoices = !isMissingTable(invErr);

    const { error: custErr } = await client.from('customers').select('id').limit(1);
    result.tablesExist.customers = !isMissingTable(custErr);

    const { error: prodErr } = await client.from('products').select('id').limit(1);
    result.tablesExist.products = !isMissingTable(prodErr);

    const { error: compErr } = await client.from('company_profile').select('id').limit(1);
    result.tablesExist.company_profile = !isMissingTable(compErr);

    // Connected to Supabase backend successfully
    result.connected = true;
    result.needsSchemaSetup = !result.tablesExist.invoices;

    if (invErr && isMissingTable(invErr)) {
      result.error = "الاتصال ناجح! يلزم تشغيل كود SQL لإنشاء جدول الفواتير 'invoices' في سوبابيز.";
    } else if (invErr) {
      result.error = invErr.message;
    }
  } catch (err: any) {
    result.connected = false;
    result.error = err.message || 'فشل الاتصال بـ Supabase';
  }

  return result;
}

/**
 * Saves single invoice to Supabase
 */
export async function saveInvoiceToSupabase(invoice: Invoice): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabaseClient();
    const payload = {
      id: invoice.id,
      invoice_number: invoice.invoiceNumber,
      issue_date: invoice.issueDate,
      issue_time: invoice.issueTime,
      pricing_mode: invoice.pricingMode,
      status: invoice.status,
      payment_status: invoice.paymentStatus,
      payment_method: invoice.paymentMethod,
      customer_id: invoice.customer?.id || null,
      customer_name: invoice.customer?.nameAr || invoice.customer?.nameEn || '',
      customer_phone: invoice.customer?.phone || null,
      grand_total: invoice.grandTotal,
      taxable_amount: invoice.taxableAmount,
      total_vat: invoice.totalVat,
      data: invoice,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('invoices').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase saveInvoice error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: any) {
    console.warn('Supabase saveInvoice exception:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Fetches all invoices from Supabase
 */
export async function fetchInvoicesFromSupabase(): Promise<{ invoices: Invoice[]; error?: string }> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('invoices')
      .select('*')
      .order('issue_date', { ascending: false });

    if (error) {
      return { invoices: [], error: error.message };
    }

    const invoices: Invoice[] = (data || []).map((row: any) => {
      if (row.data && row.data.invoiceNumber) {
        return row.data as Invoice;
      }
      return {
        id: row.id,
        invoiceNumber: row.invoice_number,
        issueDate: row.issue_date,
        issueTime: row.issue_time || '12:00:00',
        pricingMode: row.pricing_mode || 'INCLUSIVE',
        status: row.status || 'FINALIZED',
        paymentStatus: row.payment_status || 'PAID',
        paymentMethod: row.payment_method || 'CASH',
        customer: {
          id: row.customer_id || 'cust_unknown',
          nameAr: row.customer_name || 'عميل نقدي',
          phone: row.customer_phone || '',
          createdAt: row.created_at || new Date().toISOString(),
        },
        items: [],
        subtotalBeforeVat: Number(row.taxable_amount || 0),
        totalDiscount: 0,
        taxableAmount: Number(row.taxable_amount || 0),
        totalVat: Number(row.total_vat || 0),
        amountPaid: Number(row.grand_total || 0),
        notesAr: '',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } as unknown as Invoice;
    });

    return { invoices };
  } catch (e: any) {
    return { invoices: [], error: e.message };
  }
}

/**
 * Fetches single invoice by invoiceNumber or id directly from Supabase
 * (Enables public customer links on Netlify static hosting without backend dependency)
 */
export async function fetchSingleInvoiceFromSupabase(identifier: string): Promise<Invoice | null> {
  if (!identifier) return null;
  try {
    const client = getSupabaseClient();
    const clean = identifier.trim();

    // 1. By exact ID
    const { data: byId } = await client
      .from('invoices')
      .select('*')
      .eq('id', clean)
      .maybeSingle();

    if (byId?.data) return byId.data as Invoice;

    // 2. By invoice number (case-insensitive)
    const { data: byNumber } = await client
      .from('invoices')
      .select('*')
      .ilike('invoice_number', clean)
      .maybeSingle();

    if (byNumber?.data) return byNumber.data as Invoice;

    return null;
  } catch (err) {
    console.warn('fetchSingleInvoiceFromSupabase error:', err);
    return null;
  }
}

/**
 * Deletes an invoice from Supabase
 */
export async function deleteInvoiceFromSupabase(id: string): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('invoices').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Bulk syncs all local data (invoices, customers, company profile, products) into Supabase
 */
export async function syncAllToSupabase(
  invoices: Invoice[],
  customers: Customer[],
  company: CompanyProfile,
  products: Product[]
): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  try {
    const client = getSupabaseClient();

    // 1. Sync Invoices
    if (invoices.length > 0) {
      const invoicePayloads = invoices.map((inv) => ({
        id: inv.id,
        invoice_number: inv.invoiceNumber,
        issue_date: inv.issueDate,
        issue_time: inv.issueTime,
        pricing_mode: inv.pricingMode,
        status: inv.status,
        payment_status: inv.paymentStatus,
        payment_method: inv.paymentMethod,
        customer_id: inv.customer?.id || null,
        customer_name: inv.customer?.nameAr || inv.customer?.nameEn || '',
        customer_phone: inv.customer?.phone || null,
        grand_total: inv.grandTotal,
        taxable_amount: inv.taxableAmount,
        total_vat: inv.totalVat,
        data: inv,
        updated_at: new Date().toISOString(),
      }));

      const { error: invErr } = await client
        .from('invoices')
        .upsert(invoicePayloads, { onConflict: 'id' });

      if (invErr) {
        return { success: false, syncedCount: 0, error: invErr.message };
      }
    }

    // 2. Sync Customers
    if (customers.length > 0) {
      const custPayloads = customers.map((c) => ({
        id: c.id,
        name_ar: c.nameAr,
        name_en: c.nameEn || null,
        phone: c.phone || null,
        vat_number: c.vatNumber || null,
        data: c,
        updated_at: new Date().toISOString(),
      }));
      await client.from('customers').upsert(custPayloads, { onConflict: 'id' });
    }

    // 3. Sync Company Profile
    if (company) {
      await client.from('company_profile').upsert(
        {
          id: company.id || 'comp_default_king',
          name_ar: company.nameAr,
          name_en: company.nameEn,
          vat_number: company.vatNumber,
          cr_number: company.crNumber,
          phone: company.phone,
          data: company,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    }

    // 4. Sync Products
    if (products.length > 0) {
      const prodPayloads = products.map((p) => ({
        id: p.id,
        code: p.code,
        name_ar: p.nameAr,
        name_en: p.nameEn,
        unit_price: p.unitPrice,
        vat_rate: p.vatRate,
        data: p,
      }));
      await client.from('products').upsert(prodPayloads, { onConflict: 'id' });
    }

    return { success: true, syncedCount: invoices.length };
  } catch (e: any) {
    return { success: false, syncedCount: 0, error: e.message };
  }
}
