'use client';
import { Search, FileDown } from 'lucide-react';
import React , { useEffect, useState } from 'react';
import { Product, Brand, Category } from '@/types/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PurchaseList = () => {
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

  const handleDownloadPdf = () => {
    const selectedProducts = products.filter(p => selectedIds.has(p.id));
    if (selectedProducts.length === 0) {
      alert('Please select at least one product to download.');
      return;
    }

    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Purchase Order List', 14, 20);

    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

    // Table
    const tableData = selectedProducts.map((product, index) => [
      index + 1,
      product.sku,
      product.name,
      brands.find(b => b.id === product.brand_id)?.name || '-',
      categories.find(c => c.id === product.category_id)?.name || '-',
      `PKR ${product.cost_price.toLocaleString()}`,
    ]);

    autoTable(doc, {
      startY: 34,
      head: [['#', 'SKU', 'Product Name', 'Brand', 'Category', 'Cost Price']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [67, 56, 202],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [245, 247, 255],
      },
      styles: {
        cellPadding: 3,
      },
    });

    // Total
    const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Items: ${selectedProducts.length}`, 14, finalY + 10);

    doc.save(`Purchase_List_${new Date().toISOString().slice(0, 10)}.pdf`);
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
            onClick={handleDownloadPdf}
            className="bg-amber-800 hover:bg-amber-900 transition-colors text-white px-4 py-2 rounded flex items-center space-x-2"
          >
            <FileDown />
            <span>Download Pdf</span>
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