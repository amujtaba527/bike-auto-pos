'use client';
import { Search, ShoppingCart } from 'lucide-react';
import React , { useEffect, useState } from 'react';
import { Product, Brand, Category } from '@/types/types';
import { useRouter } from 'next/navigation';

const PurchaseList = () => {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

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
          brand_id: product.brand_id,
          category_id: product.category_id,
          sku: product.sku,
          cost_price: product.cost_price,
        }));
        setProducts(formatted);

        const brandRes = await fetch('/api/brand');
        const brandData = await brandRes.json();
        setBrands(brandData);

        const categoryRes = await fetch('/api/category');
        const categoryData = await categoryRes.json();
        setCategories(categoryData);

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

  const handleCheckboxChange = (productId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleSendToQuotation = () => {
    if (selectedIds.size === 0) {
      alert('Please select at least one product.');
      return;
    }

    // Save selected product IDs to localStorage for the quotation page to pick up
    localStorage.setItem('purchaseListSelectedIds', JSON.stringify(Array.from(selectedIds)));
    router.push('/purchase/quotation');
  };

  return (
    <div className="max-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4 md:p-8 w-full max-w-screen-2xl mx-auto text-black">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <h1 className="text-3xl font-extrabold text-indigo-700 tracking-tight">Purchase List</h1>
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
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <span className="text-sm text-indigo-600 font-medium">
              {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected
            </span>
          )}
          <button
            onClick={handleSendToQuotation}
            className="bg-indigo-600 hover:bg-indigo-700 transition-colors text-white px-5 py-2.5 rounded-lg flex items-center space-x-2 font-medium shadow-sm"
          >
            <ShoppingCart size={18} />
            <span>Send to Quotation</span>
          </button>
        </div>
      </div>
 
      <div className="overflow-x-auto bg-white border border-gray-200 rounded-2xl shadow-lg max-h-[calc(100vh-350px)] overflow-y-scroll">
        <table className="min-w-full text-base">
          <thead className="bg-gradient-to-r from-indigo-50 to-blue-50 text-gray-600 font-semibold">
            <tr>
              <th className="px-4 py-3 text-left">SKU</th>
              <th className="px-4 py-3 text-left">Product Name</th>
              <th className="px-4 py-3 text-left">Brand</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Cost Price (PKR)</th>
              <th className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 cursor-pointer accent-indigo-600"
                    checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length}
                    onChange={handleSelectAll}
                  />
                  <span>Select All</span>
                </div>
              </th>
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
              <tr
                key={product.id}
                className={`hover:bg-gray-50 cursor-pointer ${selectedIds.has(product.id) ? 'bg-indigo-50' : ''}`}
                onClick={() => handleCheckboxChange(product.id)}
              >
                <td className="px-4 py-3 font-semibold">{product.sku}</td>
                <td className="px-4 py-3 font-semibold">{product.name}</td>
                <td className="px-4 py-3 font-semibold">{brands.find((brand) => brand.id === product.brand_id)?.name}</td>
                <td className="px-4 py-3 font-semibold">{categories.find((category) => category.id === product.category_id)?.name}</td>
                <td className="px-4 py-3 font-semibold">PKR {product.cost_price.toLocaleString()}</td>
                <td className="px-4 py-3 font-semibold flex justify-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 cursor-pointer accent-indigo-600"
                    checked={selectedIds.has(product.id)}
                    onChange={() => handleCheckboxChange(product.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PurchaseList;