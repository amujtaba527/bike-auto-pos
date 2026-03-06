'use client';
import { Search, ChevronUp, ChevronDown, Package, DollarSign, TrendingUp } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Product, Brand, Category } from '@/types/types';

const StockReport = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [brands, setBrands] = useState<Brand[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    // Sorting state
    const [sortKey, setSortKey] = useState<'sku' | 'name' | 'brand' | 'category' | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [loading, setLoading] = useState(false);


    // Handle column sort
    const handleSort = (key: 'sku' | 'name' | 'brand' | 'category') => {
        if (sortKey === key) {
            setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/product');
                const data = await res.json();
                const productsArray = Array.isArray(data) ? data : data.products || [];
                const formatted = productsArray.map((product: Product) => ({
                    id: product.id,
                    name: product.name,
                    sku: product.sku,
                    cost_price: product.cost_price,
                    sale_price: product.sale_price,
                    brand_id: product.brand_id,
                    category_id: product.category_id,
                    min_stock_level: product.min_stock_level,
                    stock: product.stock,
                    description: product.description
                }));
                const brandres = await fetch('/api/brand');
                const branddata = await brandres.json();
                const brandsArray = Array.isArray(branddata) ? branddata : branddata.brands || [];
                const categoryres = await fetch('/api/category');
                const categorydata = await categoryres.json();
                const categoriesArray = Array.isArray(categorydata) ? categorydata : categorydata.categories || [];
                setBrands(brandsArray);
                setCategories(categoriesArray);
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
        product.stock > 0 &&
        (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
            brands.find((b: Brand) => b.id === product.brand_id)?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            categories.find((c: Category) => c.id === product.category_id)?.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Apply sorting on filtered products
    const sortedFilteredProducts = React.useMemo(() => {
        const arr = [...filteredProducts];
        if (!sortKey) return arr;

        const getBrandName = (p: Product) =>
            (brands.find(b => b.id === p.brand_id)?.name || '').toLowerCase();
        const getCategoryName = (p: Product) =>
            (categories.find(c => c.id === p.category_id)?.name || '').toLowerCase();

        arr.sort((a, b) => {
            let va = '';
            let vb = '';
            switch (sortKey) {
                case 'sku':
                    va = (a.sku || '').toLowerCase();
                    vb = (b.sku || '').toLowerCase();
                    break;
                case 'name':
                    va = (a.name || '').toLowerCase();
                    vb = (b.name || '').toLowerCase();
                    break;
                case 'brand':
                    va = getBrandName(a);
                    vb = getBrandName(b);
                    break;
                case 'category':
                    va = getCategoryName(a);
                    vb = getCategoryName(b);
                    break;
            }
            if (va < vb) return sortDir === 'asc' ? -1 : 1;
            if (va > vb) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return arr;
    }, [filteredProducts, sortKey, sortDir, brands, categories]);

    return (
        <div className="max-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4 md:p-8 w-full max-w-screen-2xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-5">
                <h1 className="text-3xl font-extrabold text-indigo-700 tracking-tight">Stock Report</h1>
                <div className="flex flex-wrap gap-4">
                    {/* Total Stock Value Card */}
                    <div className="flex items-center gap-4 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-200 px-6 py-4 min-w-[220px] transition-transform hover:scale-[1.03]">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm">
                            <DollarSign size={26} className="text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-medium uppercase tracking-wider text-indigo-100">Total Stock Value</span>
                            <span className="text-2xl font-bold tracking-tight">
                                Rs. {sortedFilteredProducts.reduce((acc, product) => acc + product.cost_price * product.stock, 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                    {/* Total Stock Quantity Card */}
                    <div className="flex items-center gap-4 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-200 px-6 py-4 min-w-[220px] transition-transform hover:scale-[1.03]">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm">
                            <Package size={26} className="text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-medium uppercase tracking-wider text-emerald-100">Total Stock Qty</span>
                            <span className="text-2xl font-bold tracking-tight">
                                {sortedFilteredProducts.reduce((acc, product) => acc + product.stock, 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                    {/* Total Sale Price Card */}
                    <div className="flex items-center gap-4 bg-gradient-to-br from-amber-500 to-amber-700 text-white rounded-2xl shadow-lg shadow-amber-200 px-6 py-4 min-w-[220px] transition-transform hover:scale-[1.03]">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm">
                            <TrendingUp size={26} className="text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-medium uppercase tracking-wider text-amber-100">Total Sale Price</span>
                            <span className="text-2xl font-bold tracking-tight">
                                Rs. {sortedFilteredProducts.reduce((acc, product) => acc + product.sale_price * product.stock, 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search products..."
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 text-base"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            <div className="overflow-x-auto bg-white border border-gray-200 rounded-2xl shadow-lg max-h-[calc(100vh-350px)] overflow-y-auto relative">
                <table className="min-w-full text-base">
                    <thead className="bg-gradient-to-r from-indigo-50 to-blue-50 text-gray-600 font-semibold sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-left">ID</th>
                            <th
                                className="px-4 py-3 text-left cursor-pointer select-none"
                                onClick={() => handleSort('sku')}
                            >
                                <div className="inline-flex items-center gap-1">
                                    SKU
                                    <ChevronUp size={16} className={`${sortKey === 'sku' && sortDir === 'asc' ? 'text-indigo-600' : 'text-gray-400'}`} />
                                    <ChevronDown size={16} className={`${sortKey === 'sku' && sortDir === 'desc' ? 'text-indigo-600' : 'text-gray-400'}`} />
                                </div>
                            </th>
                            <th
                                className="px-4 py-3 text-left cursor-pointer select-none"
                                onClick={() => handleSort('name')}
                            >
                                <div className="inline-flex items-center gap-1">
                                    Product
                                    <ChevronUp size={16} className={`${sortKey === 'name' && sortDir === 'asc' ? 'text-indigo-600' : 'text-gray-400'}`} />
                                    <ChevronDown size={16} className={`${sortKey === 'name' && sortDir === 'desc' ? 'text-indigo-600' : 'text-gray-400'}`} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-left">Stock</th>
                            <th
                                className="px-4 py-3 text-left cursor-pointer select-none"
                                onClick={() => handleSort('brand')}
                            >
                                <div className="inline-flex items-center gap-1">
                                    Brand
                                    <ChevronUp size={16} className={`${sortKey === 'brand' && sortDir === 'asc' ? 'text-indigo-600' : 'text-gray-400'}`} />
                                    <ChevronDown size={16} className={`${sortKey === 'brand' && sortDir === 'desc' ? 'text-indigo-600' : 'text-gray-400'}`} />
                                </div>
                            </th>
                            <th
                                className="px-4 py-3 text-left cursor-pointer select-none"
                                onClick={() => handleSort('category')}
                            >
                                <div className="inline-flex items-center gap-1">
                                    Category
                                    <ChevronUp size={16} className={`${sortKey === 'category' && sortDir === 'asc' ? 'text-indigo-600' : 'text-gray-400'}`} />
                                    <ChevronDown size={16} className={`${sortKey === 'category' && sortDir === 'desc' ? 'text-indigo-600' : 'text-gray-400'}`} />
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? ( // Show loading only for initial load/fetch, not edit/add
                            <tr>
                                <td colSpan={9} className="px-4 py-8 text-center">
                                    <div className="flex justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredProducts.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                                    No products found
                                </td>
                            </tr>
                        ) : (
                            sortedFilteredProducts.map((product) => (
                                <tr key={product.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-semibold">{product.id}</td>
                                    <td className="px-4 py-3 font-semibold">{product.sku}</td>
                                    <td className="px-4 py-3 font-semibold">{product.name}</td>
                                    <td className="px-4 py-3 font-semibold">{product.stock}</td>
                                    <td className="px-4 py-3 font-semibold">{brands.find((b: Brand) => b.id === product.brand_id)?.name}</td>
                                    <td className="px-4 py-3 font-semibold">{categories.find((c: Category) => c.id === product.category_id)?.name}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StockReport;