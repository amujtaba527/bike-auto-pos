'use client';
import { Search } from 'lucide-react';
import React , { useEffect, useState } from 'react';
import { Product } from '@/types/types';

const ProductsDemand = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/product/demand');
        const data = await res.json();
        const productsArray = Array.isArray(data) ? data : data.products || [];
        const formatted = productsArray.map((product: Product) => ({
          id: product.id,
          name: product.name,
          sku: product.sku,
          cost_price: product.cost_price,
          sale_price: product.sale_price,
          stock: product.stock,
          min_stock_level: product.min_stock_level
        }));
        setProducts(formatted);
      } catch (err: unknown) {
        alert("Error fetching products: " + (err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.includes(searchQuery)
  );

  return (
    <div className="max-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4 md:p-8 w-full max-w-screen-2xl mx-auto text-black">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <h1 className="text-3xl font-extrabold text-indigo-700 tracking-tight">Products Demand</h1>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20}/>
          <input
            type="text"
            placeholder="Search products..."
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 text-base"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
 
      <div className="overflow-x-auto bg-white border border-gray-200 rounded-2xl shadow-lg max-h-[calc(100vh-350px)] overflow-y-scroll">
        <table className="min-w-full text-base">
          <thead className="bg-gradient-to-r from-indigo-50 to-blue-50 text-gray-600 font-semibold">
            <tr>
              <th className="px-4 py-3 text-left">SKU</th>
              <th className="px-4 py-3 text-left">Product Name</th>
              <th className="px-4 py-3 text-left">Stock</th>
              <th className="px-4 py-3 text-left">Cost Price (PKR)</th>
              <th className="px-4 py-3 text-left">Selling Price (PKR)</th>
              <th className="px-4 py-3 text-left">Min Stock Level</th>
              <th className="px-4 py-3 text-left">Demand</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No products found
                </td>
              </tr>
            ) : 
            filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold">{product.sku}</td>
                <td className="px-4 py-3 font-semibold">{product.name}</td>
                <td className="px-4 py-3">{product.stock}</td>
                <td className="px-4 py-3 font-semibold">PKR {product.cost_price.toLocaleString()}</td>
                <td className="px-4 py-3 font-semibold">PKR {product.sale_price.toLocaleString()}</td>
                <td className="px-4 py-3 font-semibold">{product.min_stock_level}</td>
                <td className="px-4 py-3 font-semibold bg-amber-800 text-white">Order Stock</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductsDemand;