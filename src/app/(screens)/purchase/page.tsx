'use client';

import { Search, Plus, FileText, Edit, Trash } from 'lucide-react';
import {Purchase, Vendor} from '@/types/types';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PurchasesPage() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/purchase');
      const data = await res.json();
      const vendors = await fetch('/api/vendor');
      const vendorsData = await vendors.json();
      setPurchases(data);
      setVendors(vendorsData);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter purchase based on date
      const filterPurchaseByDate = (purchases: Purchase[]) => {
          const now = new Date();
          switch (dateFilter) {
              case 'today':
                  return purchases.filter(purchase => {
                      const purchaseDate = new Date(purchase.purchase_date);
                      return purchaseDate.toDateString() === now.toDateString();
                  });
              case 'week':
                  return purchases.filter(purchase => {
                      const purchaseDate = new Date(purchase.purchase_date);
                      const oneWeekAgo = new Date(now);
                      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                      return purchaseDate >= oneWeekAgo && purchaseDate <= now;
                  });
              case 'month':
                  return purchases.filter(purchase => {
                      const purchaseDate = new Date(purchase.purchase_date);
                      const oneMonthAgo = new Date(now);
                      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                      return purchaseDate >= oneMonthAgo && purchaseDate <= now;
                  });
              default: // 'all'
                  return purchases;
          }
      };

const handleDeletePurchase = async (id: number) => {
    try {
      if (!window.confirm('Are you sure you want to delete this purchase?')) return;
      await fetch(`/api/purchase/${id}`, {
        method: 'DELETE',
      });
      const refreshed = await fetch('/api/purchase').then(r => r.json());
      const purchasesArray = Array.isArray(refreshed) ? refreshed : refreshed.purchases || [];
      setPurchases(purchasesArray);
    } catch (error) {
      console.error('Error deleting purchase:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4 md:p-8 w-full max-w-screen-2xl mx-auto text-black">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <h1 className="text-3xl font-extrabold text-indigo-700 tracking-tight">Purchases</h1>
        <button
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-base font-semibold shadow-lg transition"
          onClick={() => router.push('/purchase/newpurchase')}
        >
          <Plus size={18} />
          <span>New Purchase</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by purchase ID or vendor..."
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 text-base"
            value={search}
          />
        </div>
        <div className="flex gap-3">
          <select 
                        className="border border-gray-200 rounded-xl px-4 py-3 text-base bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                    >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                    </select>
        </div>
      </div>

      <div className="overflow-x-auto bg-white border border-gray-200 rounded-2xl shadow-lg">
        <table className="min-w-full text-base">
          <thead className="bg-gradient-to-r from-indigo-50 to-blue-50 text-gray-600 font-semibold">
            <tr>
              <th className="px-4 py-3 text-left">Invoice Number</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Vendor</th>
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
            ) : filterPurchaseByDate(purchases).filter((purchase) => {
              const vendorName = vendors.find((vendor) => vendor.id === purchase.vendor_id)?.name?.toLowerCase() || '';
              const searchTerm = search.toLowerCase();
              
              return purchase.invoice_number.toLowerCase().includes(searchTerm) || 
                     vendorName.includes(searchTerm) || 
                     purchase.purchase_date.includes(search);
            }).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No purchases found
                </td>
              </tr>
            ) : (
            filterPurchaseByDate(purchases).filter((purchase) => {
              const vendorName = vendors.find((vendor) => vendor.id === purchase.vendor_id)?.name?.toLowerCase() || '';
              const searchTerm = search.toLowerCase();
              
              return purchase.invoice_number.toLowerCase().includes(searchTerm) || 
                     vendorName.includes(searchTerm) || 
                     purchase.purchase_date.includes(search);
            }).map((purchase) => (
              <tr key={purchase.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">#{purchase.invoice_number}</td>
                <td className="px-4 py-3">{purchase.purchase_date.slice(0, 10)}</td>
                <td className="px-4 py-3">{vendors.find(vendor => vendor.id === purchase.vendor_id)?.name}</td>
                <td className="px-4 py-3 font-semibold">PKR {purchase.total_amount}</td>
                <td className="px-4 py-3 flex space-x-2">
                  <button 
                  className="text-gray-500 hover:text-gray-700" 
                  title="View Invoice"
                  onClick={() => router.push(`/purchase/${purchase.id}`)}
                  >
                    <FileText size={16} />
                  </button>
                  <button 
                  className="text-gray-500 hover:text-gray-700" 
                  title="Edit Invoice"
                  onClick={() => router.push(`/purchase/${purchase.id}/edit`)}
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                  className="text-gray-500 hover:text-gray-700" 
                  title="Delete Invoice"
                  onClick={() => handleDeletePurchase(purchase.id)}
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
