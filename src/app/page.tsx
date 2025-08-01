"use client";

import { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  ShoppingBag, 
  Users,
  DollarSign
} from 'lucide-react';
import {SaleRecord, Purchase, Expense, Customer, Vendor} from '@/types/types';

interface OverviewCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
}

interface SaleWithCustomer extends SaleRecord {
  customer_name: string;
}

interface PurchaseWithVendor extends Purchase {
  vendor_name: string;
}

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState('');
  const [sales, setSales] = useState<SaleWithCustomer[]>([]);
  const [purchases, setPurchases] = useState<PurchaseWithVendor[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const date = new Date();
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    });
    setCurrentDate(formattedDate);
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const [salesRes, purchasesRes, customersRes, vendorsRes, expensesRes] = await Promise.all([
          fetch('/api/sale'),
          fetch('/api/purchase'),
          fetch('/api/customer'),
          fetch('/api/vendor'),
          fetch('/api/expense')
        ]);

        const [salesData, purchasesData, customersData, vendorsData, expensesData] = await Promise.all([
          salesRes.json(),
          purchasesRes.json(),
          customersRes.json(),
          vendorsRes.json(),
          expensesRes.json()
        ]);

        // Set customers and vendors first
        const customersArray = Array.isArray(customersData) ? customersData : [];
        const vendorsArray = Array.isArray(vendorsData) ? vendorsData : [];
        
        setCustomers(customersArray);
        setVendors(vendorsArray);
        setExpenses(Array.isArray(expensesData) ? expensesData : []);
        
        // Now map sales with customer names using the local arrays
        setSales(Array.isArray(salesData) ? salesData.map((sale: SaleRecord) => {
          const customer = customersArray.find((c: Customer) => c.id === sale.customer_id);
          return {
            ...sale,
            customer_name: customer ? customer.name : 'Unknown Customer'
          };
        }) : []);
        
        // Map purchases with vendor names using the local arrays
        setPurchases(Array.isArray(purchasesData) ? purchasesData.map(purchase => {
          const vendor = vendorsArray.find((v: Vendor) => v.id === purchase.vendor_id);
          return {
            ...purchase,
            vendor_name: vendor ? vendor.name : 'Unknown Vendor'
          };
        }) : []);
      } catch (err) {
        setError('Failed to fetch dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
    }).format(amount);
  };

  // Calculate totals
  const totalSales = sales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
  const totalPurchases = purchases.reduce((sum, purchase) => sum + Number(purchase.total_amount), 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4 md:p-8 w-full max-w-screen-2xl mx-auto flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4 md:p-8 w-full max-w-screen-2xl mx-auto flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-2xl transition duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4 md:p-8 w-full max-w-screen-2xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight mb-2 md:mb-0">Dashboard</h1>
        <p className="text-sm text-gray-500">Last updated: {currentDate}</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <OverviewCard 
          title="Total Sales" 
          value={formatCurrency(totalSales)} 
          icon={<ShoppingCart className="text-white" />} 
        />
        <OverviewCard 
          title="Total Purchases" 
          value={formatCurrency(totalPurchases)} 
          icon={<ShoppingBag className="text-white" />} 
        />
        <OverviewCard 
          title="Total Expenses" 
          value={formatCurrency(totalExpenses)} 
          icon={<Users className="text-white" />} 
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Recent Sales */}
        <div className="bg-white/90 backdrop-blur-lg border border-gray-200 rounded-3xl shadow-2xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Sales</h2>
          <div className="overflow-x-auto rounded-2xl">
            <table className="w-full min-w-full text-sm">
              <thead className="bg-gradient-to-r from-indigo-50 to-blue-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sales.slice(0, 4).map((sale) => (
                  <tr key={sale.id} className="hover:bg-indigo-50 transition-all">
                    <td className="px-4 py-3 text-gray-500">#{sale.id}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(sale.sale_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-medium text-gray-700">{sale.customer_name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800`}>
                        <DollarSign className="mr-1 h-3 w-3" />
                        CASH
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-right text-indigo-600">{formatCurrency(sale.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Recent Purchases */}
        <div className="bg-white/90 backdrop-blur-lg border border-gray-200 rounded-3xl shadow-2xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Purchases</h2>
          <div className="overflow-x-auto rounded-2xl">
            <table className="w-full min-w-full text-sm">
              <thead className="bg-gradient-to-r from-indigo-50 to-blue-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchases.slice(0, 4).map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-indigo-50 transition-all">
                    <td className="px-4 py-3 text-gray-500">#{purchase.id}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(purchase.purchase_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-medium text-gray-700">{purchase.vendor_name}</td>
                    <td className="px-4 py-3 font-semibold text-right text-indigo-600">{formatCurrency(purchase.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Overview Card Component
function OverviewCard({ title, value, icon }: OverviewCardProps) {
  return (
    <div className="bg-white/90 backdrop-blur-lg border border-gray-200 rounded-2xl shadow-2xl p-6 flex flex-col gap-2">
      <div className="flex justify-between items-center mb-1">
        <div>
          <p className="text-sm font-semibold text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-extrabold text-gray-800">{value}</p>
        </div>
        <div className="rounded-full bg-gradient-to-tr from-blue-600 to-indigo-400 p-3 shadow">
          {icon}
        </div>
      </div>
    </div>
  );
}