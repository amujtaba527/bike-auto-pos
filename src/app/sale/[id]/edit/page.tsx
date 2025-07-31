'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
interface Product {
  id: number;
  name: string;
  sku: string;
  sale_price: number;
  stock: number;
  quantity: number;
}

interface Customer {
  id: number;
  name: string;
}

interface SaleItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface SaleData {
  id: number;
  invoice_number: string;
  customer_id: number;
  subtotal: number;
  discount: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  sale_date: string;
  items: SaleItem[];
}

const EditSale = ({ params }: { params: Promise<{ id: string }> }) => {
  const router = useRouter();
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [orderDiscountType, setOrderDiscountType] = useState<'%' | 'PKR'>('PKR');
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [error, setError] = useState('');
  const { id } = use(params);

  // Fetch sale data, customers and products on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch sale data
        const saleRes = await fetch(`/api/sale/${id}`);
        if (!saleRes.ok) throw new Error('Failed to fetch sale data');
        const saleData: { sale: SaleData; items: SaleItem[] } = await saleRes.json();

        // Fetch customers
        const customersRes = await fetch('/api/customer');
        const customersData = await customersRes.json();
        setCustomers(Array.isArray(customersData) ? customersData : customersData.customers || []);

        // Fetch products
        const productsRes = await fetch('/api/product');
        const productsData = await productsRes.json();
        const allProductsData = Array.isArray(productsData) ? productsData : productsData.products || [];
        
        // Set form data
        setInvoiceNumber(saleData.sale.invoice_number);
        setDate(new Date(saleData.sale.sale_date).toISOString().slice(0, 10));
        
        // Find and set customer
        const foundCustomer = customersData.find((c: Customer) => c.id === saleData.sale.customer_id);
        if (foundCustomer) setCustomer(foundCustomer);
        
        // Set discount
        setOrderDiscount(Number(saleData.sale.discount));
        
        // Map sale items to products
        const saleProducts = saleData.items.map(item => {
          const product = allProductsData.find((p: Product) => p.id === item.product_id);
          return {
            id: item.product_id,
            name: product?.name || '',
            sku: product?.sku || '',
            sale_price: item.unit_price,
            stock: product?.stock || 0,
            quantity: item.quantity,
          };
        });
        
        setProducts(saleProducts);
        setAllProducts(allProductsData);
        setLoading(false);
      } catch (err) {
        setError('Failed to load data');
        setLoading(false);
        console.error(err);
      }
    };

    fetchData();
  }, [params]);

  const handleAddProduct = (productId: number) => {
    const prod = allProducts.find(p => p.id === productId);
    if (!prod) return;
    
    // Check if product is already added
    if (products.some(p => p.id === productId)) {
      alert('Product already added');
      return;
    }
    
    const newProduct: Product = {
      id: prod.id,
      name: prod.name,
      sku: prod.sku || '',
      sale_price: prod.sale_price || 0,
      stock: prod.stock || 0,
      quantity: 1,
    };
    setProducts([...products, newProduct]);
  };

  const updateProduct = (id: number, field: keyof Product, value: number) => {
    setProducts(products.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removeProduct = (id: number) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const subtotal = products.reduce((acc, p) =>
    acc + (p.sale_price * p.quantity), 0);

  const calcOrderDiscount = () => {
    return orderDiscountType === "%"
      ? subtotal * (orderDiscount / 100)
      : orderDiscount;
  };

  const tax = 0; // no tax for now
  const grandTotal = subtotal - calcOrderDiscount() + tax;

  const handleUpdateSale = async () => {
    try {
      if (!customer) {
        alert('Please select a customer');
        return;
      }
      if (products.length === 0) {
        alert('Please add at least one product');
        return;
      }
      
      setEditLoading(true);
      
      const payload = {
        invoice_number: invoiceNumber,
        customer_id: customer.id,
        discount: calcOrderDiscount(),
        subtotal: subtotal,
        tax_amount: tax,
        total_amount: grandTotal,
        amount_paid: grandTotal, // Cash-only system
        items: products.map(p => ({
          id: p.id,
          quantity: p.quantity,
          sale_price: p.sale_price,
          line_total: p.sale_price * p.quantity
        }))
      };
      
      const res = await fetch(`/api/sale/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update sale');
      }
      
      alert('Sale updated successfully');
      router.push('/sale');
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to update sale');
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4 md:p-8 w-full max-w-screen-2xl mx-auto flex items-center justify-center">
        <div className="text-xl font-semibold text-indigo-700">Loading sale data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4 md:p-8 w-full max-w-screen-2xl mx-auto flex items-center justify-center">
        <div className="text-xl font-semibold text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4 md:p-8 w-full max-w-screen-2xl mx-auto text-black">
      {/* Header Card */}
      <div className="bg-white/90 border border-gray-200 rounded-2xl mb-6 shadow p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 tracking-tight text-indigo-700">Edit Sale</h1>
          <div className="flex gap-4 text-sm text-gray-500">
            <span>Invoice: <span className="font-semibold text-gray-700">#{invoiceNumber}</span></span>
            <span>Date: <span className="font-semibold text-gray-700">{date}</span></span>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <button
            className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-2xl font-semibold shadow transition-all"
            onClick={() => router.push('/sale')}
            disabled={editLoading}
          >
            Back to Sales
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Customer and Product Selection */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Customer Selection Card */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Customer Information</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <select
                value={customer?.id || ''}
                onChange={(e) => {
                  const selectedCustomer = customers.find(c => c.id === parseInt(e.target.value));
                  setCustomer(selectedCustomer || null);
                }}
                className="flex-1 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Select Customer</option>
                {customers.map((cust) => (
                  <option key={cust.id} value={cust.id}>
                    {cust.name}
                  </option>
                ))}
              </select>
              <div className="flex-1 px-5 py-3 bg-gray-50 rounded-2xl border border-gray-200 text-gray-600">
                {customer ? customer.name : 'No customer selected'}
              </div>
            </div>
          </div>

          {/* Product Selection Card */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Add Products</h2>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <select
                onChange={(e) => handleAddProduct(parseInt(e.target.value))}
                className="flex-1 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-200"
                defaultValue=""
              >
                <option value="" disabled>Add Product</option>
                {allProducts
                  .filter(p => !products.some(prod => prod.id === p.id))
                  .map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} (SKU: {product.sku}) - PKR {product.sale_price} (Stock: {product.stock})
                    </option>
                  ))}
              </select>
            </div>

            {/* Products Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-base">
                <thead className="bg-gray-50 text-gray-600 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Product</th>
                    <th className="px-4 py-3 text-left">SKU</th>
                    <th className="px-4 py-3 text-left">Price</th>
                    <th className="px-4 py-3 text-left">Quantity</th>
                    <th className="px-4 py-3 text-left">Stock</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3">{p.name}</td>
                      <td className="px-4 py-3">{p.sku}</td>
                      <td className="px-4 py-3">PKR {p.sale_price}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="1"
                          max={p.stock + (products.find(prod => prod.id === p.id)?.quantity || 0)}
                          value={p.quantity}
                          onChange={(e) => updateProduct(p.id, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-20 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                      </td>
                      <td className="px-4 py-3">{p.stock}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        PKR {(p.sale_price * p.quantity)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeProduct(p.id)}
                          className="flex items-center gap-1 px-4 py-2 bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 rounded-2xl font-semibold shadow transition"
                          title="Remove"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Summary Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow p-6 flex flex-col gap-4 h-fit">
          <label className="font-semibold text-gray-700">Order Discount</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={orderDiscount}
              onChange={(e) => setOrderDiscount(Number(e.target.value) || 0)}
              className="w-24 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="0.00"
            />
            <select
              value={orderDiscountType}
              onChange={(e) => setOrderDiscountType(e.target.value as "%" | "PKR")}
              className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="PKR">PKR</option>
              <option value="%">%</option>
            </select>
          </div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Summary</h2>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-medium">PKR {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Order Discount:</span>
              <span className="font-medium text-red-500">- PKR {calcOrderDiscount()}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg">
              <span>Grand Total:</span>
              <span className="text-indigo-700">PKR {grandTotal.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-4">
            <button
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg transition-all"
              onClick={handleUpdateSale}
              disabled={editLoading}
            >
              {editLoading ? 'Updating Sale...' : 'Update Sale'}
            </button>
            <button
              className="w-full flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-2xl font-semibold shadow transition-all"
              onClick={() => router.push('/sale')}
              disabled={editLoading}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditSale;
