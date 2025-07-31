"use client";
import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import {Product, Vendor} from '@/types/types';

const NewPurchase = () => {
  const [purchaseType, setPurchaseType] = useState<"Cash" | "Credit">("Cash");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  useEffect(() => {
    setInvoiceNumber(`PUR-${uuidv4().slice(0, 8)}`);
  }, []);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [orderDiscountType, setOrderDiscountType] = useState<"%" | "PKR">("PKR");

  // Fetch vendors and products on mount
  useEffect(() => {
    fetch('/api/vendor')
      .then(res => res.json())
      .then(data => setVendors(Array.isArray(data) ? data : data.vendors || []));
    fetch('/api/product')
      .then(res => res.json())
      .then(data => setAllProducts(Array.isArray(data) ? data : data.products || []));
  }, []);

  const handleAddProduct = (productId: number) => {
    const prod = allProducts.find(p => p.id === productId);
    if (!prod) return;
    const newProduct: Product = {
      id: prod.id,
      name: prod.name,
      sku: prod.sku || '',
      cost_price: prod.cost_price || 0,
      stock: prod.stock || 0,
      sale_price: prod.sale_price || 0,
      description: prod.description || '',
      min_stock_level: prod.min_stock_level || 0,
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
    acc + (p.cost_price * p.stock), 0);

  const calcOrderDiscount = () => {
    return orderDiscountType === "%"
      ? subtotal * (orderDiscount / 100)
      : orderDiscount;
  };

  const tax = 0; // no tax for now
  const grandTotal = subtotal - calcOrderDiscount() + tax;

  const handlePurchase = async () => {
    try {
      if (!vendor) {
        alert('Please select a vendor');
        return;
      }
      if (products.length === 0) {
        alert('Please add at least one product');
        return;
      }
      const payload = {
        vendor_id: vendor?.id,
        invoice_number: invoiceNumber,
        total_amount: grandTotal,
        subtotal: subtotal,
        items: products,
      };
      const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to add purchase');
      alert('Purchase added successfully');
      setProducts([]);
      setOrderDiscount(0);
      setOrderDiscountType('%');
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4 md:p-8 w-full max-w-screen-2xl mx-auto text-black">
      {/* Header Card */}
      <div className="bg-white/90 border border-gray-200 rounded-2xl mb-6 shadow p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 tracking-tight text-indigo-700">New Purchase</h1>
          <div className="flex gap-4 text-sm text-gray-500">
            <span>Invoice: <span className="font-semibold text-gray-700">#{invoiceNumber}</span></span>
            <span>Date: <span className="font-semibold text-gray-700">{date}</span></span>
          </div>
        </div>
        <div className="flex flex-col md:items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700">Type:</span>
            <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
              <button
                className={`px-4 py-2 rounded-2xl text-sm font-semibold ${purchaseType === 'Cash' ? 'bg-white shadow' : ''}`}
                onClick={() => setPurchaseType('Cash')}
              >
                Cash
              </button>
              <button
                className={`px-4 py-2 rounded-2xl text-sm font-semibold ${purchaseType === 'Credit' ? 'bg-white shadow' : ''}`}
                onClick={() => setPurchaseType('Credit')}
              >
                Credit
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Products Section */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Vendor Selection */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Vendor Information</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Vendor</label>
                <select
                  value={vendor?.id || ''}
                  onChange={(e) => {
                    const selectedVendor = vendors.find(v => v.id === Number(e.target.value));
                    setVendor(selectedVendor || null);
                  }}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">Select a vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Details</label>
                <div className="px-5 py-3 bg-gray-50 rounded-2xl border border-gray-200">
                  {vendor ? (
                    <div>
                      <p className="font-medium">{vendor.name}</p>
                    </div>
                  ) : (
                    <p className="text-gray-500">No vendor selected</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Add Products */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Add Products</h2>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Product</label>
                <select
                  onChange={(e) => handleAddProduct(Number(e.target.value))}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">Select a product</option>
                  {allProducts
                    .filter(p => !products.some(prod => prod.id === p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {p.sku} (Stock: {p.stock})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Products Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-base">
                <thead className="bg-gradient-to-r from-indigo-50 to-blue-50 text-gray-600 font-semibold">
                  <tr>
                    <th className="px-3 py-3 text-left">Product</th>
                    <th className="px-3 py-3 text-left">SKU</th>
                    <th className="px-3 py-3 text-right">Price (PKR)</th>
                    <th className="px-3 py-3 text-right">Qty</th>
                    <th className="px-3 py-3 text-right">Total</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="font-medium">{p.name}</div>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{p.sku}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={p.cost_price}
                          onChange={(e) => updateProduct(p.id, 'cost_price', parseFloat(e.target.value))}
                          className="w-24 text-right rounded-2xl border border-gray-200 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          step="
                          1"
                          min={0}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={p.stock}
                          onChange={(e) => updateProduct(p.id, 'stock', parseInt(e.target.value))}
                          className="w-20 text-right rounded-2xl border border-gray-200 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          min={1}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {(p.cost_price * p.stock).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right">
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
              onChange={(e) => setOrderDiscount(parseFloat(e.target.value))}
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
              <span className="font-medium text-red-500">- PKR {calcOrderDiscount().toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg">
              <span>Grand Total:</span>
              <span className="text-indigo-700">PKR {grandTotal.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-4">
            <button
              className="w-full flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg transition-all"
              onClick={handlePurchase}
            >
              Proceed
            </button>
            <button className="w-full flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-2xl font-semibold shadow transition-all">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewPurchase;