"use client";
import { MinusIcon, PlusIcon } from "lucide-react";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [tempQuantity, setTempQuantity] = useState<number>(1);
  const [tempCostPrice, setTempCostPrice] = useState<number>(0);
  const [vendorSearchTerm, setVendorSearchTerm] = useState("");
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
    const prod = allProducts.find((p: Product) => p.id === productId);
    if (!prod) return;
    
    // Check if product already exists in cart
    const existingProduct = products.find((p: Product) => p.id === productId);
    if (existingProduct) {
      // Update quantity if product already exists
      setProducts(products.map((p: Product) => 
        p.id === productId 
          ? { ...p, stock: p.stock + tempQuantity }
          : p
      ));
    } else {
      // Add new product
      const newProduct: Product = {
        id: prod.id,
        name: prod.name,
        sku: prod.sku || '',
        cost_price: tempCostPrice || prod.cost_price || 0,
        stock: tempQuantity,
        sale_price: prod.sale_price || 0,
        description: prod.description || '',
        min_stock_level: prod.min_stock_level || 0,
        brand_id: prod.brand_id || 0,
        category_id: prod.category_id || 0,
      };
      setProducts([...products, newProduct]);
    }
    
    // Reset search and values
    setSearchTerm("");
    setSelectedProductId(null);
    setTempQuantity(1);
    setTempCostPrice(0);
  };
  
  const updateProduct = (id: number, field: keyof Product, value: number) => {
    setProducts(products.map(p => p.id === id ? { ...p, [field]: value } : p));
  };
  
  const removeProduct = (id: number) => {
    setProducts(products.filter((p: Product) => p.id !== id));
  };
  
  const subtotal = products.reduce((acc, p) =>
    acc + (p.cost_price * p.stock), 0);
  const NumberSubtotal = Number(subtotal).toFixed(2);

  const calcOrderDiscount = () => {
    return orderDiscountType === "%"
      ? Number(NumberSubtotal) * (orderDiscount / 100)
      : Number(orderDiscount);
  };

  const tax = Number(NumberSubtotal) * 0.00; // 0% tax
  const grandTotal = Number(NumberSubtotal) - Number(calcOrderDiscount()) + Number(tax);
  
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
        purchase_date: date,
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
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Edit Purchase</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span>Invoice: <span className="font-medium text-gray-800">#{invoiceNumber}</span></span>
              <span>Date: <span className="font-medium text-gray-800"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></span></span>
              <span>Vendor: <span className="font-medium text-gray-800">{vendor?.name || 'Not selected'}</span></span>
            </div>
          </div>
          <button
            onClick={() => router.push('/purchase')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Back to Purchases
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Product Management */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vendor Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex">Vendor Selection</h2>
            <div className="flex justify-between mb-4">
            <div className="relative w-2/3">
              <input
                type="text"
                placeholder="Search vendors..."
                value={vendorSearchTerm}
                onChange={(e) => setVendorSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {vendorSearchTerm && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg mt-1 max-h-48 overflow-y-auto z-10">
                  {vendors
                    .filter(v => v.name.toLowerCase().includes(vendorSearchTerm.toLowerCase()))
                    .map(v => (
                      <button
                        key={v.id}
                        onClick={() => {
                          setVendor(v);
                          setVendorSearchTerm("");
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        {v.name}
                      </button>
                    ))
                  }
                </div>
              )}
            </div>
            {vendor && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-700">Selected: <strong>{vendor.name}</strong></span>
              </div>
            )}
            </div>
          </div>

          {/* Product Search & Add */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Add Products</h2>
            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search products by name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchTerm && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg mt-1 max-h-48 overflow-y-auto z-10">
                    {allProducts
                      .filter(p => 
                        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .slice(0, 10)
                      .map(product => (
                        <button
                          key={product.id}
                          onClick={() => setSelectedProductId(product.id)}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                            selectedProductId === product.id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">PKR {product.cost_price}</div>
                            </div>
                          </div>
                        </button>
                      ))
                    }
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTempQuantity(Math.max(1, tempQuantity - 1))}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={tempQuantity <= 1}
                >
                  <MinusIcon className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  value={tempQuantity}
                  onChange={(e) => setTempQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2 py-2 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setTempQuantity(tempQuantity + 1)}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>
              <input
                type="number"
                placeholder="Cost Price"
                value={tempCostPrice}
                onChange={(e) => setTempCostPrice(Number(e.target.value) || 0)}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="0.01"
                min="0"
              />
              <button
                onClick={() => selectedProductId && handleAddProduct(selectedProductId)}
                disabled={!selectedProductId}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Product List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Products in Purchase</h2>
            </div>
            <div className="p-6">
              {products.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No products added yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Product</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">SKU</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-700">Quantity</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Cost Price</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Total</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <tr key={product.id} className="border-b border-gray-100">
                          <td className="py-4 px-4">
                            <div className="font-medium text-gray-900">{product.name}</div>
                          </td>
                          <td className="py-4 px-4 text-gray-600">{product.sku}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => updateProduct(product.id, 'stock', Math.max(1, product.stock - 1))}
                                className="p-1 border border-gray-300 rounded hover:bg-gray-50"
                                disabled={product.stock <= 1}
                              >
                                <MinusIcon className="w-4 h-4" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={product.stock}
                                onChange={(e) => updateProduct(product.id, 'stock', Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <button
                                onClick={() => updateProduct(product.id, 'stock', product.stock + 1)}
                                className="p-1 border border-gray-300 rounded hover:bg-gray-50"
                              >
                                <PlusIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <input
                              type="number"
                              value={product.cost_price}
                              onChange={(e) => updateProduct(product.id, 'cost_price', Number(e.target.value) || 0)}
                              className="w-24 px-2 py-1 text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              step="0.01"
                              min="0"
                            />
                          </td>
                          <td className="py-4 px-4 text-right font-semibold">PKR {(product.cost_price * product.stock).toFixed(2)}</td>
                          <td className="py-4 px-4 text-center">
                            <button
                              onClick={() => removeProduct(product.id)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Remove item"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Order Summary */}
        <div className="space-y-4">
          {/* Order Summary Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Purchase Summary</h2>
            
            {/* Order Discount */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Order Discount</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={orderDiscount}
                  onChange={(e) => setOrderDiscount(Number(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
                <select
                  value={orderDiscountType}
                  onChange={(e) => setOrderDiscountType(e.target.value as "%" | "PKR")}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PKR">PKR</option>
                  <option value="%">%</option>
                </select>
              </div>
            </div>

            {/* Summary Details */}
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-medium">PKR {NumberSubtotal}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax:</span>
                <span className="font-medium">PKR {tax}</span>
              </div>
              {orderDiscount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount:</span>
                  <span className="font-medium">-PKR {calcOrderDiscount()}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-gray-900 border-t border-gray-200 pt-3">
                <span>Total:</span>
                <span className="text-green-600">PKR {grandTotal}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="space-y-3">
              <button
                onClick={handleUpdatePurchase}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-semibold text-lg transition-colors"
                disabled={editLoading}
              >
                {editLoading ? "Updating..." : "Update Purchase"}
              </button>
              <button
                onClick={() => router.push('/purchase')}
                className="w-full flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-4 rounded-lg font-semibold text-lg transition-colors"
                disabled={editLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPurchase;
