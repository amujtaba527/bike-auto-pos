'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Brand, Product } from '@/types/types';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

const Select = dynamic(() => import('react-select'), { ssr: false });

interface ReportRow {
  id: number;
  type: 'purchase' | 'sale';
  product_name: string;
  sku: string;
  invoice_number: string;
  price: number;
  date: string;
  qty: number;
}

const ProductReportPage = () => {
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const [transactionType, setTransactionType] = useState<'all' | 'sale' | 'purchase'>('all');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ReportRow[]>([]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        const value = Number(r.qty) || 0;
        if (r.type === 'sale') acc.sale += value;
        if (r.type === 'purchase') acc.purchase += value;
        return acc;
      },
      { sale: 0, purchase: 0 }
    );
  }, [rows]);

  // Fetch brands and products
  useEffect(() => {
    const load = async () => {
      try {
        const [bRes, pRes] = await Promise.all([
          fetch('/api/brand'),
          fetch('/api/product'),
        ]);
        const [bJson, pJson] = await Promise.all([bRes.json(), pRes.json()]);
        const brandsArray = Array.isArray(bJson) ? bJson : bJson.brands || [];
        const productsArray = Array.isArray(pJson) ? pJson : pJson.products || [];
        setBrands(brandsArray);
        setProducts(productsArray);
      } catch (e: any) {
        setError(e?.message || 'Failed to load brands/products');
      }
    };
    load();
  }, []);

  // Filter products by brand
  const filteredProducts = useMemo(() => {
    if (!selectedBrandId) return products;
    return products.filter(p => p.brand_id === selectedBrandId);
  }, [products, selectedBrandId]);

  // When brand changes, reset product selection if it no longer matches
  useEffect(() => {
    if (selectedProductId && !filteredProducts.some(p => p.id === selectedProductId)) {
      setSelectedProductId(null);
    }
  }, [filteredProducts, selectedProductId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setRows([]);
    try {
      const params = new URLSearchParams();
      if (selectedBrandId) params.set('brandId', String(selectedBrandId));
      if (selectedProductId) params.set('productId', String(selectedProductId));
      if (transactionType !== 'all') params.set('transactionType', transactionType);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);

      const res = await fetch(`/api/productreport?${params.toString()}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to fetch report');
      }
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4 md:p-8 w-full max-w-screen-2xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <h1 className="text-3xl font-extrabold text-indigo-700 tracking-tight">Product Report</h1>
      </div>

      {/* Filters Card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-4 md:p-6 mb-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
            <Select
              options={brands.map(b => ({ value: b.id, label: b.name }))}
              value={selectedBrandId ? { value: selectedBrandId, label: brands.find(b => b.id === selectedBrandId)?.name || '' } : null}
              onChange={(opt: any) => setSelectedBrandId(opt ? Number(opt.value) : null)}
              placeholder="Select brand"
              isClearable
              className="text-sm"
              menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
              menuPosition="fixed"
              styles={{
                menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
                menu: (base: any) => ({ ...base, zIndex: 9999 })
              }}
            />
          </div>

          {/* Product */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <Select
              options={filteredProducts.map(p => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
              value={selectedProductId ? { value: selectedProductId, label: `${products.find(p => p.id === selectedProductId)?.name || ''} (${products.find(p => p.id === selectedProductId)?.sku || ''})` } : null}
              onChange={(opt: any) => setSelectedProductId(opt ? Number(opt.value) : null)}
              placeholder="Select product"
              isClearable
              className="text-sm"
              menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
              menuPosition="fixed"
              styles={{
                menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
                menu: (base: any) => ({ ...base, zIndex: 9999 })
              }}
            />
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
              <select name="transaction_type" id="transaction_type" className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200" onChange={(e) => setTransactionType(e.target.value as 'all' | 'sale' | 'purchase')}>
                <option value="all">All</option>
                <option value="sale">Sale</option>
                <option value="purchase">Purchase</option>
              </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          {/* Submit */}
          <div>
            <button
              type="submit"
              className={`w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-2xl font-semibold shadow transition flex items-center justify-center ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={submitting}
            >
              {submitting ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 text-sm text-red-600">{error}</div>
        )}
      </div>

      {/* Totals Summary (Quantities) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-2xl shadow p-4">
          <div className="text-sm text-gray-500">Total Sales Qty</div>
          <div className="text-2xl font-bold text-emerald-600">{totals.sale.toLocaleString()}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow p-4">
          <div className="text-sm text-gray-500">Total Purchases Qty</div>
          <div className="text-2xl font-bold text-blue-600">{totals.purchase.toLocaleString()}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow p-4">
          <div className="text-sm text-gray-500">Net Qty (Purchases - Sales)</div>
          <div className={`text-2xl font-bold ${totals.purchase - totals.sale >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{(totals.purchase - totals.sale).toLocaleString()}</div>
        </div>
      </div>

      {/* Results Table */}
      <div className="overflow-x-auto bg-white border border-gray-200 rounded-2xl shadow-lg max-h-[calc(100vh-350px)] overflow-y-auto relative">
        <table className="min-w-full text-base">
          <thead className="bg-gradient-to-r from-indigo-50 to-blue-50 text-gray-600 font-semibold sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left">SKU</th>
              <th className="px-4 py-3 text-left">Invoice #</th>
              <th className="px-4 py-3 text-left">Qty</th>
              <th className="px-4 py-3 text-left">Price</th>
              <th className="px-4 py-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {submitting ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No data</td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={idx} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/${r.type}/${r.id}/edit`)}>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${r.type === 'sale' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                      {r.type === 'sale' ? 'Sale' : 'Purchase'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold">{r.product_name}</td>
                  <td className="px-4 py-3">{r.sku}</td>
                  <td className="px-4 py-3">{r.invoice_number}</td>
                  <td className="px-4 py-3">{Number(r.qty).toLocaleString()}</td>
                  <td className="px-4 py-3">{Number(r.price).toLocaleString()}</td>
                  <td className="px-4 py-3">{new Date(r.date).toDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductReportPage;