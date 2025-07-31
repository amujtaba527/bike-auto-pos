'use client';

import React, { useState, useEffect } from 'react';

// Define TypeScript interfaces
interface SaleReturn {
  id: number;
  return_number: string;
  original_sale_id: number;
  customer_id: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  refund_amount: number;
  reason: string;
  notes: string;
  status: string;
  return_date: string;
  created_at: string;
  updated_at: string;
}

interface SaleReturnItem {
  id?: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface Product {
  id: number;
  sku: string;
  name: string;
  sale_price: number;
  stock: number;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
}

interface Sale {
  id: number;
  invoice_number: string;
  customer_id: number;
  total_amount: number;
  sale_date: string;
}

interface SaleItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  line_total: number;
  product_name: string;
  product_sku: string;
}

const SalesReturnsPage = () => {
  // State management
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [originalSaleItems, setOriginalSaleItems] = useState<SaleItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [currentReturnId, setCurrentReturnId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    return_number: '',
    original_sale_id: 0,
    customer_id: 0,
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    refund_amount: 0,
    reason: '',
    notes: ''
  });
  
  const [returnItems, setReturnItems] = useState<SaleReturnItem[]>([]);
  const [newItem, setNewItem] = useState({
    product_id: 0,
    quantity: 1,
    unit_price: 0,
    line_total: 0
  });

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch returns
      const returnsRes = await fetch('/api/sales-returns');
      const returnsData = await returnsRes.json();
      setReturns(returnsData);
      
      // Fetch sales
      const salesRes = await fetch('/api/sale');
      const salesData = await salesRes.json();
      setSales(salesData);
      
      // Fetch customers
      const customersRes = await fetch('/api/customer');
      const customersData = await customersRes.json();
      setCustomers(customersData);
      
      // Fetch products
      const productsRes = await fetch('/api/product');
      const productsData = await productsRes.json();
      setProducts(productsData);
      
      setError(null);
    } catch (err) {
      setError('Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch original sale items when sale is selected
  const fetchOriginalSaleItems = async (saleId: number) => {
    try {
      const res = await fetch(`/api/sale/${saleId}`);
      const saleData = await res.json();
      
      if (saleData.sale && saleData.items) {
        // Combine sale items with product info
        const itemsWithProductInfo = saleData.items.map((item: SaleItem) => {
          const product = products.find(p => p.id === item.product_id);
          return {
            ...item,
            product_name: product?.name || 'Unknown Product',
            product_sku: product?.sku || 'Unknown SKU'
          };
        });
        setOriginalSaleItems(itemsWithProductInfo);
      }
    } catch (err) {
      console.error('Error fetching sale items:', err);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('_amount') || name === 'customer_id' || name === 'original_sale_id' 
        ? Number(value) 
        : value
    }));
  };

  // Handle original sale selection
  const handleSaleSelection = (saleId: number) => {
    setFormData(prev => ({
      ...prev,
      original_sale_id: saleId,
      customer_id: sales.find(s => s.id === saleId)?.customer_id || 0
    }));
    
    fetchOriginalSaleItems(saleId);
  };

  // Handle item input changes
  const handleItemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, index: number) => {
    const { name, value } = e.target;
    const updatedItems = [...returnItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [name]: Number(value)
    };
    
    // Auto-calculate line total
    if (name === 'quantity' || name === 'unit_price') {
      const quantity = name === 'quantity' ? Number(value) : updatedItems[index].quantity;
      const unitPrice = name === 'unit_price' ? Number(value) : updatedItems[index].unit_price;
      updatedItems[index].line_total = quantity * unitPrice;
    }
    
    setReturnItems(updatedItems);
    recalculateTotals(updatedItems);
  };

  // Handle new item input changes
  const handleNewItemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewItem(prev => ({
      ...prev,
      [name]: name === 'product_id' ? Number(value) : Number(value)
    }));
    
    // Auto-fill unit price when product is selected
    if (name === 'product_id') {
      const product = products.find(p => p.id === Number(value));
      if (product) {
        setNewItem(prev => ({
          ...prev,
          unit_price: product.sale_price,
          line_total: prev.quantity * product.sale_price
        }));
      }
    }
    
    // Auto-calculate line total
    if (name === 'quantity' || name === 'unit_price') {
      const quantity = name === 'quantity' ? Number(value) : newItem.quantity;
      const unitPrice = name === 'unit_price' ? Number(value) : newItem.unit_price;
      setNewItem(prev => ({
        ...prev,
        line_total: quantity * unitPrice
      }));
    }
  };

  // Add new item to return items
  const addNewItem = () => {
    if (newItem.product_id && newItem.quantity > 0) {
      // Check if item already exists
      const existingItemIndex = returnItems.findIndex(item => item.product_id === newItem.product_id);
      
      if (existingItemIndex >= 0) {
        // Update existing item quantity
        const updatedItems = [...returnItems];
        updatedItems[existingItemIndex].quantity += newItem.quantity;
        updatedItems[existingItemIndex].line_total = 
          updatedItems[existingItemIndex].quantity * updatedItems[existingItemIndex].unit_price;
        setReturnItems(updatedItems);
      } else {
        // Add new item
        setReturnItems(prev => [...prev, { ...newItem }]);
      }
      
      // Reset new item form
      setNewItem({
        product_id: 0,
        quantity: 1,
        unit_price: 0,
        line_total: 0
      });
      
      recalculateTotals([...returnItems, { ...newItem }]);
    }
  };

  // Remove item from return items
  const removeItem = (index: number) => {
    const updatedItems = [...returnItems];
    updatedItems.splice(index, 1);
    setReturnItems(updatedItems);
    recalculateTotals(updatedItems);
  };

  // Recalculate totals
  const recalculateTotals = (items: SaleReturnItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
    const totalAmount = subtotal;
    
    setFormData(prev => ({
      ...prev,
      subtotal: parseFloat(subtotal.toFixed(2)),
      total_amount: parseFloat(totalAmount.toFixed(2)),
      refund_amount: parseFloat(totalAmount.toFixed(2))
    }));
  };

  // Handle form submission (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate required fields
      if (!formData.return_number || !formData.original_sale_id || !formData.customer_id) {
        setError('Return number, original sale, and customer are required');
        return;
      }
      
      if (returnItems.length === 0) {
        setError('At least one return item is required');
        return;
      }
      
      // Validate quantities against original sale
      for (const item of returnItems) {
        const originalItem = originalSaleItems.find(oi => oi.product_id === item.product_id);
        if (!originalItem) {
          setError(`Product ${item.product_id} was not in the original sale`);
          return;
        }
        if (item.quantity > originalItem.quantity) {
          setError(`Return quantity (${item.quantity}) exceeds original quantity (${originalItem.quantity}) for ${originalItem.product_name}`);
          return;
        }
      }
      
      const returnData = {
        ...formData,
        items: returnItems
      };
      
      let response;
      
      if (isEditing && currentReturnId) {
        // Update existing return
        response = await fetch(`/api/sales-returns/${currentReturnId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(returnData),
        });
      } else {
        // Create new return
        response = await fetch('/api/sales-returns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(returnData),
        });
      }
      
      const result = await response.json();
      
      if (response.ok) {
        setSuccess(isEditing ? 'Return updated successfully!' : 'Return processed successfully!');
        resetForm();
        fetchData();
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Operation failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Error submitting return:', err);
    }
  };

  // Handle edit return
  const handleEdit = async (returnId: number) => {
    try {
      // Fetch return details
      const response = await fetch(`/api/sales-returns?id=${returnId}`);
      const data = await response.json();
      
      if (data.sale_return && data.items) {
        setFormData({
          return_number: data.sale_return.return_number,
          original_sale_id: data.sale_return.original_sale_id,
          customer_id: data.sale_return.customer_id,
          subtotal: data.sale_return.subtotal,
          tax_amount: data.sale_return.tax_amount,
          total_amount: data.sale_return.total_amount,
          refund_amount: data.sale_return.refund_amount,
          reason: data.sale_return.reason || '',
          notes: data.sale_return.notes || ''
        });
        
        setReturnItems(data.items);
        setCurrentReturnId(returnId);
        setIsEditing(true);
        
        // Fetch original sale items
        await fetchOriginalSaleItems(data.sale_return.original_sale_id);
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setError('Failed to load return details');
      console.error('Error loading return:', err);
    }
  };

  // Handle delete return
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this return? This will restore inventory.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/sales-returns/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setSuccess('Return deleted successfully!');
        fetchData();
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to delete return');
      }
    } catch (err) {
      setError('Failed to delete return');
      console.error('Error deleting return:', err);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      return_number: `RET${new Date().getFullYear()}${String(returns.length + 1).padStart(4, '0')}`,
      original_sale_id: 0,
      customer_id: 0,
      subtotal: 0,
      tax_amount: 0,
      total_amount: 0,
      refund_amount: 0,
      reason: '',
      notes: ''
    });
    setReturnItems([]);
    setOriginalSaleItems([]);
    setIsEditing(false);
    setCurrentReturnId(null);
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  // Load data on component mount
  useEffect(() => {
    fetchData();
    resetForm();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Sales Returns</h1>
        <p className="mt-2 text-gray-600">Process and manage customer returns</p>
      </div>

      {/* Success and Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Return Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {isEditing ? 'Edit Return' : 'Process New Return'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="return_number" className="block text-sm font-medium text-gray-700 mb-1">
                Return Number *
              </label>
              <input
                type="text"
                id="return_number"
                name="return_number"
                value={formData.return_number}
                onChange={handleInputChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter return number"
              />
            </div>
            
            <div>
              <label htmlFor="original_sale_id" className="block text-sm font-medium text-gray-700 mb-1">
                Original Sale *
              </label>
              <select
                id="original_sale_id"
                name="original_sale_id"
                value={formData.original_sale_id}
                onChange={(e) => handleSaleSelection(Number(e.target.value))}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a sale</option>
                {sales.map(sale => (
                  <option key={sale.id} value={sale.id}>
                    {sale.invoice_number} - {formatDate(sale.sale_date)} ({formatCurrency(sale.total_amount)})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700 mb-1">
                Customer *
              </label>
              <select
                id="customer_id"
                name="customer_id"
                value={formData.customer_id}
                onChange={handleInputChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!!formData.original_sale_id}
              >
                <option value="">Select a customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} {customer.phone ? `(${customer.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                Return Reason
              </label>
              <input
                type="text"
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter return reason"
              />
            </div>
          </div>
          
          {/* Original Sale Items */}
          {originalSaleItems.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Original Sale Items</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {originalSaleItems.map(item => (
                    <div key={item.id} className="bg-white rounded p-3 shadow-sm">
                      <div className="font-medium text-gray-900">{item.product_name}</div>
                      <div className="text-sm text-gray-500">{item.product_sku}</div>
                      <div className="mt-1 text-sm">
                        <span className="text-gray-600">Qty: </span>
                        <span className="font-medium">{item.quantity}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Price: </span>
                        <span className="font-medium">{formatCurrency(item.unit_price)}</span>
                      </div>
                      <div className="text-sm font-medium text-blue-600">
                        {formatCurrency(item.line_total)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Return Items */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Return Items</h3>
            
            {/* Add New Item Form */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Product</label>
                <select
                  name="product_id"
                  value={newItem.product_id}
                  onChange={handleNewItemChange}
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select product</option>
                  {originalSaleItems.map(item => (
                    <option key={item.product_id} value={item.product_id}>
                      {item.product_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  min="1"
                  value={newItem.quantity}
                  onChange={handleNewItemChange}
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Unit Price</label>
                <input
                  type="number"
                  name="unit_price"
                  step="0.01"
                  value={newItem.unit_price}
                  onChange={handleNewItemChange}
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Total</label>
                <div className="pt-1 text-sm font-medium">
                  {formatCurrency(newItem.line_total)}
                </div>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={addNewItem}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1 px-2 rounded-md transition duration-150 ease-in-out"
                >
                  Add
                </button>
              </div>
            </div>
            
            {/* Return Items List */}
            {returnItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {returnItems.map((item, index) => {
                      const product = originalSaleItems.find(p => p.product_id === item.product_id);
                      return (
                        <tr key={index}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                            {product ? product.product_name : 'Unknown Product'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            <input
                              type="number"
                              name="quantity"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(e, index)}
                              className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            <input
                              type="number"
                              name="unit_price"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => handleItemChange(e, index)}
                              className="w-24 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(item.line_total)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No return items added yet
              </div>
            )}
          </div>
          
          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700">Subtotal</label>
              <div className="mt-1 text-lg font-medium">
                {formatCurrency(formData.subtotal)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tax (10%)</label>
              <div className="mt-1 text-lg font-medium">
                {formatCurrency(formData.tax_amount)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Total Amount</label>
              <div className="mt-1 text-lg font-medium">
                {formatCurrency(formData.total_amount)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Refund Amount</label>
              <div className="mt-1 text-lg font-medium text-green-600">
                {formatCurrency(formData.refund_amount)}
              </div>
            </div>
          </div>
          
          {/* Notes */}
          <div className="mb-6">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes about this return"
            />
          </div>
          
          {/* Form Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50"
            >
              {isEditing ? 'Update Return' : 'Process Return'}
            </button>
            
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
            >
              {isEditing ? 'Cancel' : 'Reset'}
            </button>
          </div>
        </form>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Return History</h2>
        </div>
        
        {loading ? (
          <div className="px-6 py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading returns...</p>
          </div>
        ) : returns.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No returns processed</h3>
            <p className="mt-1 text-gray-500">Get started by processing a new return.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Return Number
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Original Sale
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {returns.map((returnItem) => {
                  const sale = sales.find(s => s.id === returnItem.original_sale_id);
                  const customer = customers.find(c => c.id === returnItem.customer_id);
                  
                  return (
                    <tr key={returnItem.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{returnItem.return_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{sale?.invoice_number || 'Unknown'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{customer?.name || 'Unknown'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(returnItem.return_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(returnItem.refund_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {returnItem.reason || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(returnItem.id)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(returnItem.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesReturnsPage;