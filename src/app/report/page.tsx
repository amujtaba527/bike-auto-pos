'use client';

import React, { useState, useEffect } from 'react';

// Define TypeScript interfaces
interface ProfitLossData {
  revenue: number;
  cost_of_goods_sold: number;
  gross_profit: number;
  operating_expenses: number;
  net_profit: number;
  gross_profit_margin: string;
  net_profit_margin: string;
}

interface BalanceSheetData {
  assets: any[];
  liabilities: any[];
  equity: any[];
  totals: {
    assets: number;
    liabilities: number;
    equity: number;
    retained_earnings: number;
    liabilities_plus_equity: number;
  };
}

interface CustomerData {
  customer: {
    id: number;
    name: string;
    phone: string;
    email: string;
    address: string;
  };
  summary: {
    total_transactions: number;
    total_purchases: number;
    total_paid: number;
    total_balance: number;
  };
  transactions: any[];
}

interface VendorData {
  vendor: {
    id: number;
    name: string;
    phone: string;
    email: string;
    address: string;
  };
  summary: {
    total_transactions: number;
    total_purchases: number;
    total_paid: number;
    total_balance: number;
  };
  transactions: any[];
}

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('profit-loss');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [customerId, setCustomerId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Report data states
  const [profitLossData, setProfitLossData] = useState<ProfitLossData | null>(null);
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetData | null>(null);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [vendorData, setVendorData] = useState<VendorData | null>(null);
  
  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
    }).format(value);
  };

  // Fetch Profit & Loss Report
  const fetchProfitLoss = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports?type=profit-loss&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      const data = await res.json();
      if (data.success) {
        setProfitLossData(data.data);
      } else {
        setError(data.error || 'Failed to fetch profit & loss report');
      }
    } catch (err:unknown) {
      setError('Failed to fetch profit & loss report' + err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Balance Sheet Report
  const fetchBalanceSheet = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports?type=balance-sheet`);
      const data = await res.json();
      if (data.success) {
        setBalanceSheetData(data.data);
      } else {
        setError(data.error || 'Failed to fetch balance sheet');
      }
    } catch (err:unknown) {
      setError('Failed to fetch balance sheet' + err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Customer Report
  const fetchCustomerReport = async () => {
    if (!customerId) {
      setError('Please enter a customer ID');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports?type=customer-report&customerId=${customerId}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      const data = await res.json();
      if (data.success) {
        setCustomerData(data);
      } else {
        setError(data.error || 'Failed to fetch customer report');
      }
    } catch (err:unknown) {
      setError('Failed to fetch customer report' + err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Vendor Report
  const fetchVendorReport = async () => {
    if (!vendorId) {
      setError('Please enter a vendor ID');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports?type=vendor-report&vendorId=${vendorId}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      const data = await res.json();
      if (data.success) {
        setVendorData(data);
      } else {
        setError(data.error || 'Failed to fetch vendor report');
      }
    } catch (err:unknown) {
      setError('Failed to fetch vendor report' + err);
    } finally {
      setLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchProfitLoss();
    fetchBalanceSheet();
  }, []);

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    switch (tab) {
      case 'profit-loss':
        fetchProfitLoss();
        break;
      case 'balance-sheet':
        fetchBalanceSheet();
        break;
      case 'customer':
        setCustomerData(null);
        break;
      case 'vendor':
        setVendorData(null);
        break;
    }
  };

  // Profit & Loss Report Component
  const ProfitLossReport = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Profit & Loss Statement</h2>
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              className="mt-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              className="mt-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={fetchProfitLoss}
            disabled={loading}
            className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {profitLossData && (
        <div className="space-y-4">
          <div className="border-b pb-4">
            <div className="flex justify-between">
              <span className="font-medium">Revenue</span>
              <span>{formatCurrency(profitLossData.revenue)}</span>
            </div>
          </div>
          
          <div className="border-b pb-4">
            <div className="flex justify-between">
              <span className="font-medium">Cost of Goods Sold</span>
              <span className="text-red-600">({formatCurrency(profitLossData.cost_of_goods_sold)})</span>
            </div>
          </div>
          
          <div className="border-b pb-4">
            <div className="flex justify-between font-semibold">
              <span>Gross Profit</span>
              <span className={profitLossData.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(profitLossData.gross_profit)}
              </span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Gross Profit Margin: {profitLossData.gross_profit_margin}%
            </div>
          </div>
          
          <div className="border-b pb-4">
            <div className="flex justify-between">
              <span className="font-medium">Operating Expenses</span>
              <span className="text-red-600">({formatCurrency(profitLossData.operating_expenses)})</span>
            </div>
          </div>
          
          <div className="pt-4">
            <div className="flex justify-between text-xl font-bold">
              <span>Net Profit</span>
              <span className={profitLossData.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(profitLossData.net_profit)}
              </span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Net Profit Margin: {profitLossData.net_profit_margin}%
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Balance Sheet Report Component
  const BalanceSheetReport = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Balance Sheet</h2>
      
      {balanceSheetData && (
        <div className="space-y-8">
          {/* Assets */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Assets</h3>
            <div className="space-y-2">
              {balanceSheetData.assets.map((account) => (
                <div key={account.account_id} className="flex justify-between">
                  <span>{account.account_name}</span>
                  <span>{formatCurrency(parseFloat(account.balance))}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Total Assets</span>
                <span>{formatCurrency(balanceSheetData.totals.assets)}</span>
              </div>
            </div>
          </div>
          
          {/* Liabilities */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Liabilities</h3>
            <div className="space-y-2">
              {balanceSheetData.liabilities.map((account) => (
                <div key={account.account_id} className="flex justify-between">
                  <span>{account.account_name}</span>
                  <span>{formatCurrency(parseFloat(account.balance))}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Total Liabilities</span>
                <span>{formatCurrency(balanceSheetData.totals.liabilities)}</span>
              </div>
            </div>
          </div>
          
          {/* Equity */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Equity</h3>
            <div className="space-y-2">
              {balanceSheetData.equity.map((account) => (
                <div key={account.account_id} className="flex justify-between">
                  <span>{account.account_name}</span>
                  <span>{formatCurrency(parseFloat(account.balance))}</span>
                </div>
              ))}
              <div className="flex justify-between">
                <span>Retained Earnings</span>
                <span>{formatCurrency(balanceSheetData.totals.retained_earnings)}</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Total Equity</span>
                <span>{formatCurrency(balanceSheetData.totals.equity)}</span>
              </div>
            </div>
          </div>
          
          {/* Balance Check */}
          <div className="pt-4 border-t">
            <div className="flex justify-between text-lg font-bold">
              <span>Total Liabilities + Equity</span>
              <span>{formatCurrency(balanceSheetData.totals.liabilities_plus_equity)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold mt-2">
              <span>Total Assets</span>
              <span>{formatCurrency(balanceSheetData.totals.assets)}</span>
            </div>
            <div className={`mt-2 text-center font-semibold ${Math.abs(balanceSheetData.totals.assets - balanceSheetData.totals.liabilities_plus_equity) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(balanceSheetData.totals.assets - balanceSheetData.totals.liabilities_plus_equity) < 0.01 
                ? 'Balance Sheet Balanced ✓' 
                : 'Balance Sheet Not Balanced ✗'}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Customer Report Component
  const CustomerReport = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Customer Report</h2>
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700">Customer ID</label>
            <input
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="Enter customer ID"
              className="mt-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              className="mt-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              className="mt-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={fetchCustomerReport}
            disabled={loading}
            className="h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Generate'}
          </button>
        </div>
      </div>

      {error && activeTab === 'customer' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {customerData && (
        <div>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900">{customerData.customer.name}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p>{customerData.customer.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p>{customerData.customer.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p>{customerData.customer.address || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Total Transactions</p>
              <p className="text-2xl font-bold">{customerData.summary.total_transactions}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Total Purchases</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(customerData.summary.total_purchases)}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Total Paid</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(customerData.summary.total_paid)}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Balance Due</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(customerData.summary.total_balance)}</p>
            </div>
          </div>

          <h4 className="text-lg font-semibold text-gray-900 mb-3">Transaction History</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customerData.transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{transaction.invoice_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(transaction.sale_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(parseFloat(transaction.total_amount))}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(parseFloat(transaction.amount_paid))}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${parseFloat(transaction.balance_due) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(parseFloat(transaction.balance_due))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // Vendor Report Component
  const VendorReport = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Vendor Report</h2>
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700">Vendor ID</label>
            <input
              type="text"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              placeholder="Enter vendor ID"
              className="mt-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              className="mt-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              className="mt-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={fetchVendorReport}
            disabled={loading}
            className="h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Generate'}
          </button>
        </div>
      </div>

      {error && activeTab === 'vendor' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {vendorData && (
        <div>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900">{vendorData.vendor.name}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p>{vendorData.vendor.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p>{vendorData.vendor.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p>{vendorData.vendor.address || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Total Transactions</p>
              <p className="text-2xl font-bold">{vendorData.summary.total_transactions}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Total Purchases</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(vendorData.summary.total_purchases)}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Total Paid</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(vendorData.summary.total_paid)}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Balance Due</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(vendorData.summary.total_balance)}</p>
            </div>
          </div>

          <h4 className="text-lg font-semibold text-gray-900 mb-3">Purchase History</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vendorData.transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{transaction.invoice_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(transaction.purchase_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(parseFloat(transaction.total_amount))}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(parseFloat(transaction.amount_paid))}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${parseFloat(transaction.balance_due) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(parseFloat(transaction.balance_due))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
        <p className="mt-2 text-gray-600">Generate key financial statements and reports</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => handleTabChange('profit-loss')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profit-loss'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Profit & Loss
          </button>
          <button
            onClick={() => handleTabChange('balance-sheet')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'balance-sheet'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Balance Sheet
          </button>
          <button
            onClick={() => handleTabChange('customer')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'customer'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Customer Report
          </button>
          <button
            onClick={() => handleTabChange('vendor')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'vendor'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Vendor Report
          </button>
        </nav>
      </div>

      {/* Error Message */}
      {error && !['customer', 'vendor'].includes(activeTab) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* Report Content */}
      {activeTab === 'profit-loss' && <ProfitLossReport />}
      {activeTab === 'balance-sheet' && <BalanceSheetReport />}
      {activeTab === 'customer' && <CustomerReport />}
      {activeTab === 'vendor' && <VendorReport />}
    </div>
  );
};

export default ReportsPage;