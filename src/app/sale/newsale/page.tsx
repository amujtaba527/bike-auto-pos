"use client";
import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

type Product = {
  id: number;
  name: string;
  sku: string;
  sale_price: number;
  stock: number;
  quantity: number;
};

type Customer = {
  id: number;
  name: string;
};

const NewSale = () => {
  const [saleType, setSaleType] = useState<"Cash" | "Credit">("Cash");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  useEffect(() => {
    setInvoiceNumber(`INV-${uuidv4().slice(0, 8)}`);
  }, []);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [orderDiscountType, setOrderDiscountType] = useState<"%" | "PKR">("PKR");

  // Fetch customers and products on mount
  useEffect(() => {
    fetch('/api/customer')
      .then(res => res.json())
      .then(data => setCustomers(Array.isArray(data) ? data : data.customers || []));
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
      sale_price: prod.sale_price || 0,
      stock: prod.stock || 0,
      quantity: prod.quantity || 1,
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
  const changeDue = 0 - grandTotal;

  const handleSale = async () => {
    try {
      if (!customer) {
        alert('Please select a customer');
        return;
      }
      if (products.length === 0) {
        alert('Please add at least one product');
        return;
      }
      
      // Format items to match backend expectations
      const formattedItems = products.map(product => ({
        product_id: product.id,
        quantity: product.quantity,
        price: product.sale_price,
        discount: 0 // No discount per item in current UI
      }));
      
      const payload = {
        invoice_number: invoiceNumber,
        customer_id: customer.id,
        discount: calcOrderDiscount(),
        subtotal: subtotal,
        tax_amount: tax,
        total_amount: grandTotal,
        items: formattedItems,
      };
      
      const res = await fetch('/api/sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add sale');
      }
      
      alert('Sale added successfully');
      // Reset form
      setProducts([]);
      setOrderDiscount(0);
      setOrderDiscountType('PKR');
      setInvoiceNumber(`INV-${uuidv4().slice(0, 8)}`);
    } catch (err: unknown) {
      console.error('Error adding sale:', err);
      alert((err as Error).message || 'An error occurred while adding the sale');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4 md:p-8 w-full max-w-screen-2xl mx-auto text-black">
      {/* Header Card */}
      <div className="bg-white/90 border border-gray-200 rounded-2xl mb-6 shadow p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 tracking-tight text-indigo-700">New Sale</h1>
          <div className="flex gap-4 text-sm text-gray-500">
            <span>Invoice: <span className="font-semibold text-gray-700">#{invoiceNumber}</span></span>
            <span>Date: <span className="font-semibold text-gray-700">{date}</span></span>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <label className="font-medium text-gray-600">Sale Type</label>
          <select
            value={saleType}
            onChange={(e) => setSaleType(e.target.value as "Cash" | "Credit")}
            className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="Cash">Cash</option>
            <option value="Credit">Credit</option>
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Customer & Product Entry */}
        <div className="space-y-6 md:col-span-2">
          {/* Customer Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow p-5 space-y-3">
            <label className="block font-semibold text-gray-700 mb-1">Customer</label>
            <div className="flex gap-2">
              <select
                className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-3 text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                value={customer?.id ?? ''}
                onChange={e => {
                  const id = parseInt(e.target.value);
                  const found = customers.find(c => c.id === id);
                  setCustomer(found ?? null);
                }}
              >
                <option value="" disabled>Select customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => alert("Add new customer modal")}
                className="text-sm px-3 py-2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Product Entry Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow p-5 space-y-3">
            <label className="block font-semibold text-gray-700 mb-1">Add Product</label>
            <select
              className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-3 text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              onChange={e => {
                const id = parseInt(e.target.value);
                if (!isNaN(id)) handleAddProduct(id);
              }}
              defaultValue=""
            >
              <option value="" disabled>Add product...</option>
              {allProducts.map(prod => (
                <option key={prod.id} value={prod.id}>{prod.name} (PKR {prod.sale_price})</option>
              ))}
            </select>

            {/* Products Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm mt-2 border rounded-xl overflow-hidden">
                <thead className="bg-gradient-to-r from-indigo-50 to-blue-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">Product</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">Code</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500">Qty</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500">Rate</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500">Total</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center text-gray-400 py-4">No products added.</td>
                    </tr>
                  )}
                  {products.map((p) => (
                    <tr key={p.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{p.name}</td>
                      <td className="px-3 py-2">{p.sku}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          onChange={(e) => updateProduct(p.id, "quantity", parseInt(e.target.value))}
                          className="w-16 rounded-2xl border border-gray-200 bg-white px-3 py-3 text-base text-right focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          min={1}
                          defaultValue={1}
                          max={p.stock}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={p.sale_price}
                          onChange={(e) => updateProduct(p.id, "sale_price", parseFloat(e.target.value))}
                          className="w-20 rounded-2xl border border-gray-200 bg-white px-3 py-3 text-base text-right focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {(p.sale_price * p.quantity).toFixed(2)}
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
            <div className="flex justify-between text-gray-600">
              <span>Change Due:</span>
              <span className="font-medium {changeDue < 0 ? 'text-red-500' : 'text-green-600'}">PKR {changeDue < 0 ? 0 : changeDue.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-4">
            <button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg transition-all">
              Proceed & Print
            </button>
            <button
              className="w-full flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg transition-all"
              onClick={handleSale}
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
export default NewSale;
