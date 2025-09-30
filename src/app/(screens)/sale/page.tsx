'use client';

import { Search, Plus, FileText, Edit, Trash } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SaleRecord, Customer } from '@/types/types';

export default function SalesPage() {
  const router = useRouter();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/sale');
        const data = await res.json();
        const rescust = await fetch('/api/customer');
        const custdata = await rescust.json();
        setCustomers(custdata);
        setSales(data);
      } catch (error) {
        console.error('Error fetching sales:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSales();
  }, []);

// To and From date
const filterSaleByDate = (sales: SaleRecord[]) => {
  // If no 'from' date selected, do not filter by date
  if (!fromDate) return sales;

  // Build date range with safe bounds
  const from = new Date(fromDate + 'T00:00:00');
  const to = toDate ? new Date(toDate + 'T23:59:59.999') : new Date('9999-12-31T23:59:59.999');

  return sales.filter((sale) => {
    const saleDate = new Date(sale.sale_date);
    return saleDate >= from && saleDate <= to;
  });
};

  const handleDeleteSale = async (id: number) => {
    try {
      if (!window.confirm('Are you sure you want to delete this sale?')) return;
      await fetch(`/api/sale/${id}`, {
        method: 'DELETE',
      });
      const refreshed = await fetch('/api/sale').then(r => r.json());
      const salesArray = Array.isArray(refreshed) ? refreshed : refreshed.sales || [];
      setSales(salesArray);
    } catch (error) {
      console.error('Error deleting sale:', error);
    }
  };
 
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4 md:p-8 w-full max-w-screen-2xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <h1 className="text-3xl font-extrabold text-indigo-700 tracking-tight">Sales</h1>
        <button
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-base font-semibold shadow-lg transition"
          onClick={() => router.push('/sale/newsale')}
        >
          <Plus size={18} />
          <span>New Sale</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by Invoice Number or Customer..."
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 text-base"
            value={search}
          />
        </div>
        <div className="flex gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto bg-white border border-gray-200 rounded-2xl shadow-lg">
        <table className="min-w-full text-base">
          <thead className="bg-gradient-to-r from-indigo-50 to-blue-50 text-gray-600 font-semibold">
            <tr>
              <th className="px-4 py-3 text-left">Invoice</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Total (PKR)</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                </td>
              </tr>
            ) : filterSaleByDate(sales).filter((sale) => {
              const customerName = customers.find((cust) => cust.id === sale.customer_id)?.name?.toLowerCase() || '';
              const searchTerm = search.toLowerCase();
              
              return sale.invoice_number.toLowerCase().includes(searchTerm) || 
                     customerName.includes(searchTerm) || 
                     sale.sale_date.includes(search);
            }).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No sales found
                </td>
              </tr>
            ) : (
              filterSaleByDate(sales).filter((sale) => {
                const customerName = customers.find((cust) => cust.id === sale.customer_id)?.name?.toLowerCase() || '';
                const searchTerm = search.toLowerCase();
                
                return sale.invoice_number.toLowerCase().includes(searchTerm) || 
                       customerName.includes(searchTerm) || 
                       sale.sale_date.includes(search);
              }).map((sale)=> (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">#{sale.invoice_number}</td>
                  <td className="px-4 py-3">{sale.sale_date.slice(0, 10)}</td>
                  <td className="px-4 py-3">{customers.find((cust) => cust.id === sale.customer_id)?.name}</td>
                <td className="px-4 py-3 font-semibold">{formatCurrency(sale.total_amount)}</td>
                <td className="px-4 py-3 flex space-x-2">
                  <button 
                    className="text-gray-500 hover:text-gray-700" 
                    title="View Invoice"
                    onClick={() => router.push(`/sale/${sale.id}`)}
                  >
                    <FileText size={16} />
                  </button>
                  <button 
                  className="text-gray-500 hover:text-gray-700" 
                  title="Edit Invoice"
                  onClick={() => router.push(`/sale/${sale.id}/edit`)}
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                  className="text-gray-500 hover:text-gray-700" 
                  title="Delete Invoice"
                  onClick={() => handleDeleteSale(sale.id)}
                  >
                    <Trash size={16} />
                  </button>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
