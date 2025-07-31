"use client";

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PurchaseRecord, PurchaseItem, Product, Vendor } from '@/types/types';

export default function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [purchase, setPurchase] = useState<PurchaseRecord | null>(null);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { id } = use(params);

  useEffect(() => {
    const fetchPurchaseData = async () => {
      try {
        // Fetch purchase details
        const purchaseRes = await fetch(`/api/purchase/${id}`);
        const purchaseData = await purchaseRes.json();
        const itemsData = purchaseData.items;

        setPurchase(purchaseData.purchase);
        setItems(itemsData);

        // Fetch vendor
        const vendorRes = await fetch(`/api/vendor/${purchaseData.purchase.vendor_id}`);
        const vendorData = await vendorRes.json();
        setVendor(vendorData);

        // Fetch products for items
        if (itemsData.length > 0) {
          const productIds = itemsData.map((item: { product_id: number; }) => item.product_id);
          const productsRes = await fetch(`/api/product?ids=${productIds.join(',')}`);
          const productsData: Product[] = await productsRes.json();
          setProducts(productsData);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching purchase data:', error);
        setLoading(false);
      }
    };

    if (id) {
      fetchPurchaseData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <h1 className="text-2xl font-bold text-gray-700 mb-4">Purchase Not Found</h1>
        <p className="text-gray-500 mb-6">The purchase you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        <button 
          onClick={() => router.push('/purchase')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Back to Purchases
        </button>
      </div>
    );
  }

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.product_id);
    return sum + (item.quantity * (product?.cost_price || 0));
  }, 0);

  const totalDiscount = purchase.discount;
  const totalAmount = purchase.total_amount;

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Purchase Invoice</h1>
          <p className="text-gray-600">#{purchase.invoice_number}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-600">Date: {new Date(purchase.purchase_date).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Vendor Information</h2>
        <p className="text-gray-600">{vendor?.name || 'N/A'}</p>
        <p className="text-gray-600">{vendor?.phone || 'N/A'}</p>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Items</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border-b text-left">Product</th>
                <th className="py-2 px-4 border-b text-right">Price</th>
                <th className="py-2 px-4 border-b text-right">Quantity</th>
                <th className="py-2 px-4 border-b text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const product = products.find(p => p.id === item.product_id);
                const itemTotal = (item.quantity * (product?.cost_price || 0));
                // Create a unique key using product_id and sale_id
                const key = `${item.product_id}-${item.id}`;
                return (
                  <tr key={key} className="border-b">
                    <td className="py-2 px-4">{product?.name || 'Unknown Product'}</td>
                    <td className="py-2 px-4 text-right">PKR {product?.cost_price || '0.00'}</td>
                    <td className="py-2 px-4 text-right">{item.quantity}</td>
                    <td className="py-2 px-4 text-right font-medium">PKR {itemTotal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="mb-8 ml-auto max-w-xs">
        <div className="flex justify-between py-2">
          <span className="text-gray-600">Subtotal:</span>
          <span className="font-medium">PKR {subtotal}</span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-gray-600">Discount:</span>
          <span className="font-medium">PKR {totalDiscount}</span>
        </div>
        <div className="flex justify-between py-2 border-t border-gray-300 mt-2 pt-2">
          <span className="text-lg font-semibold">Total:</span>
          <span className="text-lg font-bold">PKR {totalAmount}</span>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button 
          onClick={() => window.print()}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          Print Invoice
        </button>
        <button 
          onClick={() => router.push('/purchase')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Back to Purchases
        </button>
      </div>
    </div>
  );
}
