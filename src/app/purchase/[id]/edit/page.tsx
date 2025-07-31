"use client";

import React, { useState, useEffect } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { Product, Vendor, PurchaseRecord, PurchaseItem } from '@/types/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

const EditPurchase = ({ params }: PageProps) => {
  const router = useRouter();
  const { id } = use(params);
  
  const [purchaseType, setPurchaseType] = useState<"Cash" | "Credit">("Cash");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState("");
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [orderDiscountType, setOrderDiscountType] = useState<'%' | 'PKR'>('PKR');
  const [editLoading, setEditLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Fetch purchase data, vendors, and products on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch purchase data
        const purchaseRes = await fetch(`/api/purchase/${id}`);
        if (!purchaseRes.ok) throw new Error('Failed to fetch purchase');
        const purchaseData = await purchaseRes.json();
        
        // Set purchase data
        setInvoiceNumber(purchaseData.purchase.invoice_number);
        setDate(new Date(purchaseData.purchase.purchase_date).toISOString().split('T')[0]);
        
        // Fetch vendors
        const vendorsRes = await fetch('/api/vendor');
        const vendorsData = await vendorsRes.json();
        setVendors(Array.isArray(vendorsData) ? vendorsData : vendorsData.vendors || []);
        
        // Set vendor
        const purchaseVendor = (Array.isArray(vendorsData) ? vendorsData : vendorsData.vendors || []).find(
          (v: Vendor) => v.id === purchaseData.purchase.vendor_id
        );
        if (purchaseVendor) setVendor(purchaseVendor);
        
        // Fetch products
        const productsRes = await fetch('/api/product');
        const productsData = await productsRes.json();
        setAllProducts(Array.isArray(productsData) ? productsData : productsData.products || []);
        
        // Set purchase items as products
        const purchaseItems = purchaseData.items;
        const itemsAsProducts: Product[] = purchaseItems.map((item: PurchaseItem) => {
          const product = (Array.isArray(productsData) ? productsData : productsData.products || []).find(
            (p: Product) => p.id === item.product_id
          );
          
          return {
            id: item.product_id,
            name: product?.name || '',
            sku: product?.sku || '',
            cost_price: item.unit_price,
            stock: item.quantity,
            sale_price: product?.sale_price || 0,
            description: product?.description || '',
            min_stock_level: product?.min_stock_level || 0,
          };
        });
        
        setProducts(itemsAsProducts);
      } catch (err: unknown) {
        setError('Failed to load purchase data' + err);
        console.error(error);
      }
    };
    fetchData();
  }, [id]);
  
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
      cost_price: prod.cost_price || 0,
      stock: 0, // Will be set by user
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
  
  const handleUpdatePurchase = async () => {
    try {
      if (!vendor) {
        alert('Please select a vendor');
        return;
      }
      if (products.length === 0) {
        alert('Please add at least one product');
        return;
      }
      
      // Validate that all products have valid quantities
      for (const product of products) {
        if (!product.stock || product.stock <= 0) {
          alert(`Please enter a valid quantity for ${product.name}`);
          return;
        }
        if (!product.cost_price || product.cost_price <= 0) {
          alert(`Please enter a valid cost price for ${product.name}`);
          return;
        }
      }
      
      setEditLoading(true);
      
      const payload = {
        vendor_id: vendor.id,
        invoice_number: invoiceNumber,
        subtotal: subtotal,
        tax_amount: tax,
        total_amount: grandTotal,
        items: products.map(p => ({
          id: p.id,
          quantity: p.stock,
          unit_price: p.cost_price,
          line_total: p.cost_price * p.stock
        }))
      };
      
      const res = await fetch(`/api/purchase/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update purchase');
      }
      
      alert('Purchase updated successfully');
      router.push('/purchase');
    } catch (err: any) {
      alert(err.message || 'Failed to update purchase' + err);
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4 md:p-8 w-full max-w-screen-2xl mx-auto text-black">
      {/* Header Card */}
      <div className="bg-white/90 border border-gray-200 rounded-2xl mb-6 shadow p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 tracking-tight text-indigo-700">Edit Purchase</h1>
          <div className="flex gap-4 text-sm text-gray-500">
            <span>Invoice: <span className="font-semibold text-gray-700">#{invoiceNumber}</span></span>
            <span>Date: <span className="font-semibold text-gray-700">{date}</span></span>
          </div>
        </div>
        <div className="flex flex-col md:items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 font-medium">Purchase Type:</span>
            <div className="flex rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <button
                className={`px-4 py-2 text-sm font-semibold ${purchaseType === 'Cash' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                onClick={() => setPurchaseType('Cash')}
              >
                Cash
              </button>
              <button
                className={`px-4 py-2 text-sm font-semibold ${purchaseType === 'Credit' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                onClick={() => setPurchaseType('Credit')}
              >
                Credit
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Form Card */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Vendor Selection */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Vendor Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Vendor</label>
                <select
                  value={vendor?.id || ''}
                  onChange={(e) => {
                    const selectedVendor = vendors.find(v => v.id === parseInt(e.target.value));
                    setVendor(selectedVendor || null);
                  }}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">Select a vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.phone})
                    </option>
                  ))}
                </select>
              </div>
              
              {vendor && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">Vendor Details</h3>
                  <p className="text-gray-600 text-sm">{vendor.name}</p>
                  <p className="text-gray-600 text-sm">{vendor.phone}</p>
                  <p className="text-gray-600 text-sm">{vendor.email}</p>
                  <p className="text-gray-600 text-sm">{vendor.address}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Product Selection */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Add Products</h2>
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <select
                onChange={(e) => handleAddProduct(parseInt(e.target.value))}
                className="flex-1 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-200"
                value=""
              >
                <option value="">Select a product to add</option>
                {allProducts
                  .filter(p => !products.some(prod => prod.id === p.id))
                  .map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} (SKU: {product.sku}) - PKR {product.cost_price}
                    </option>
                  ))}
              </select>
            </div>
            
            {/* Products Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-base">
                <thead className="bg-gray-50 text-gray-600 font-semibold">
                  <tr>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-left">SKU</th>
                    <th className="px-3 py-2 text-right">Cost Price</th>
                    <th className="px-3 py-2 text-right">Quantity</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2">
                        <div className="font-medium">{p.name}</div>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{p.sku}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={p.cost_price || 0}
                          onChange={(e) => updateProduct(p.id, 'cost_price', Number(e.target.value) || 0)}
                          className="w-24 text-right rounded-2xl border border-gray-200 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          step="0.01"
                          min={0}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={p.stock || 1}
                          onChange={(e) => updateProduct(p.id, 'stock', Number(e.target.value) || 0)}
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
              onChange={(e) => setOrderDiscount(Number(e.target.value))}
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
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg transition-all"
              onClick={handleUpdatePurchase}
              disabled={editLoading}
            >
              {editLoading ? 'Updating Purchase...' : 'Update Purchase'}
            </button>
            <button
              className="w-full flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-2xl font-semibold shadow transition-all"
              onClick={() => router.push('/purchase')}
              disabled={editLoading}
            >
              Back to Purchases
            </button>
            <button
              className="w-full flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-2xl font-semibold shadow transition-all"
              onClick={() => router.push('/purchase')}
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

export default EditPurchase;
