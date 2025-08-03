"use client";

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SaleRecord, SaleItem, Product, Customer } from '@/types/types';

export default function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [sale, setSale] = useState<SaleRecord | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { id } = use(params);

  useEffect(() => {
    const fetchSaleData = async () => {
      try {
        // Fetch sale details
        const saleRes = await fetch(`/api/sale/${id}`);
        const saleData = await saleRes.json();
        
        setSale(saleData.sale);

        // Fetch customer
        const customerRes = await fetch(`/api/customer/${saleData.sale.customer_id}`);
        const customerData = await customerRes.json();
        setCustomer(customerData);

        // Fetch products for items
        const itemsRes = await fetch(`/api/sale_item/${id}`);
        const itemsData = await itemsRes.json();
        setItems(itemsData);
        if (itemsData.length > 0) {
          const productIds = itemsData.map((item: { product_id: number; }) => item.product_id);
          const productsRes = await fetch(`/api/product?ids=${productIds.join(',')}`);
          const productsData: Product[] = await productsRes.json();
          // Merge price from itemsData into productsData
          const mergedProducts = productsData.map((prod) => {
            const item = itemsData.find((i: any) => i.product_id === prod.id);
            return {
              ...prod,
              sale_price: item ? item.unit_price : prod.sale_price
            };
          });
          setProducts(mergedProducts);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching sale data:', error);
        setLoading(false);
      }
    };

    if (id) {
      fetchSaleData();
    }
  }, [id]);

  // Simple print function
  const printInvoice = () => {
    window.print();
  };

  // Simple PDF generation using browser's print to PDF
  const generatePDF = () => {
    // Set up print styles to make it look like a PDF
    const printStyle = document.createElement('style');
    printStyle.innerHTML = `
      @media print {
        body * {
          visibility: hidden;
        }
        .invoice-container, .invoice-container * {
          visibility: visible;
        }
        .invoice-container {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          box-shadow: none;
        }
        .no-print {
          display: none;
        }
      }
    `;
    document.head.appendChild(printStyle);
    
    // Trigger print (which can be saved as PDF)
    window.print();
    
    // Clean up
    setTimeout(() => {
      document.head.removeChild(printStyle);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <h1 className="text-2xl font-bold text-gray-700 mb-4">Sale Not Found</h1>
        <p className="text-gray-500 mb-6">The sale you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        <button 
          onClick={() => router.push('/sale')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Back to Sales
        </button>
      </div>
    );
  }

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.product_id);
    return sum + (item.quantity * (product?.sale_price || 0));
  }, 0);

  const totalDiscount = sale.discount;
  const totalAmount = sale.total_amount;

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white rounded-lg shadow-md">
      {/* Invoice container with class for printing */}
      <div className="invoice-container">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Sale Invoice</h1>
            <p className="text-gray-600">#{sale.invoice_number}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-600">Date: {new Date(sale.sale_date).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Customer Information</h2>
          <p className="text-gray-600">{customer?.name || 'N/A'}</p>
          <p className="text-gray-600">{customer?.phone || 'N/A'}</p>
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
                  const itemTotal = (item.quantity * (product?.sale_price || 0));
                  const key = `${item.product_id}-${item.id}`;
                  return (
                    <tr key={key} className="border-b">
                      <td className="py-2 px-4">{product?.name || 'Unknown Product'}</td>
                      <td className="py-2 px-4 text-right">PKR {product?.sale_price || '0.00'}</td>
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
      </div>

      {/* Buttons with no-print class */}
      <div className="flex justify-end space-x-4 mt-8 no-print">
        <button 
          onClick={generatePDF}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          Save as PDF
        </button>
        <button 
          onClick={printInvoice}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          Print Invoice
        </button>
        <button 
          onClick={() => router.push('/sale')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Back to Sales
        </button>
      </div>
    </div>
  );
}