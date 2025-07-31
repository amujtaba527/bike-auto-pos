'use client';
import { Plus, Search, Pencil, Trash } from 'lucide-react';
import React , { useEffect, useState } from 'react';
import { Product } from '@/types/types';


const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    description: '',
    cost_price: '',
    sale_price: '',
    stock: '',
    min_stock_level: '',
  });
  const [loading, setLoading] = useState(false);

  // Inline editing state
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editProduct, setEditProduct] = useState({
    name: '',
    sku: '',
    cost_price: '',
    sale_price: '',
    stock: '',
  });
  const [editLoading, setEditLoading] = useState(false);

  const handleEditClick = (product: Product) => {
    setEditingProductId(product.id);
    setEditProduct({
      name: product.name,
      sku: product.sku,
      cost_price: product.cost_price.toString(),
      sale_price: product.sale_price.toString(),
      stock: product.stock.toString(),
    });
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditProduct({ ...editProduct, [e.target.name]: e.target.value });
  };

  const handleSaveEdit = async (id: number) => {
    setEditLoading(true);
    try {
      const res = await fetch(`/api/product/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editProduct.name,
          sku: editProduct.sku,
          cost_price: Number(editProduct.cost_price),
          sale_price: Number(editProduct.sale_price),
          stock: Number(editProduct.stock),
        }),
      });
      if (!res.ok) throw new Error('Failed to update product');
      setEditingProductId(null);
      setEditProduct({ name: '', sku: '', cost_price: '', sale_price: '', stock: '' });
      // Refresh products
      const refreshed = await fetch('/api/product').then(r => r.json());
      const productsArray = Array.isArray(refreshed) ? refreshed : refreshed.products || [];
      setProducts(productsArray);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDiscardEdit = () => {
    setEditingProductId(null);
    setEditProduct({ name: '', sku: '', cost_price: '', sale_price: '', stock: '' });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/product/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete product');
      // Refresh products
      const refreshed = await fetch('/api/product').then(r => r.json());
      const productsArray = Array.isArray(refreshed) ? refreshed : refreshed.products || [];
      setProducts(productsArray);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewProduct({ ...newProduct, [e.target.name]: e.target.value });
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProduct.name,
          sku: newProduct.sku,
          cost_price: Number(newProduct.cost_price),
          description: newProduct.description,
          sale_price: Number(newProduct.sale_price),
          stock: Number(newProduct.stock),
          min_stock_level: Number(newProduct.min_stock_level),
        }),
      });
      if (!res.ok) throw new Error('Failed to add product');
      setShowAddModal(false);
      setNewProduct({ name: '', sku: '', description: '', cost_price: '', sale_price: '', stock: '', min_stock_level: '' });
      // Refresh products
      const refreshed = await fetch('/api/product').then(r => r.json());
      const productsArray = Array.isArray(refreshed) ? refreshed : refreshed.products || [];
      setProducts(productsArray);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
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
          stock: product.stock,
          min_stock_level: product.min_stock_level,
          description: product.description
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4 md:p-8 w-full max-w-screen-2xl mx-auto text-black">
      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md relative">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl"
              onClick={() => setShowAddModal(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-6 text-indigo-700">Add New Product</h2>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <input
                type="text"
                name="name"
                placeholder="Product Name"
                value={newProduct.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <input
                type="text"
                name="description"
                placeholder="Product Description"
                value={newProduct.description}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <input
                type="text"
                name="sku"
                placeholder="SKU"
                value={newProduct.sku}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <input
                type="number"
                name="cost_price"
                placeholder="Cost Price"
                value={newProduct.cost_price}
                onChange={handleInputChange}
                required
                min="0"
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <input
                type="number"
                name="sale_price"
                placeholder="Sale Price"
                value={newProduct.sale_price}
                onChange={handleInputChange}
                required
                min="0"
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <input
                type="number"
                name="stock"
                placeholder="Stock"
                value={newProduct.stock}
                onChange={handleInputChange}
                required
                min="0"
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <input
                type="number"
                name="min_stock_level"
                placeholder="Min Stock Level"
                value={newProduct.min_stock_level}
                onChange={handleInputChange}
                required
                min="0"
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-semibold transition flex items-center justify-center"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Product'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <h1 className="text-3xl font-extrabold text-indigo-700 tracking-tight">Products</h1>
        <button
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-base font-semibold shadow-lg transition"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={16} />
          <span>Add Product</span>
        </button>
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
 
      <div className="overflow-x-auto bg-white border border-gray-200 rounded-2xl shadow-lg">
        <table className="min-w-full text-base">
          <thead className="bg-gradient-to-r from-indigo-50 to-blue-50 text-gray-600 font-semibold">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">SKU</th>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left">Stock</th>
              <th className="px-4 py-3 text-left">Cost Price (PKR)</th>
              <th className="px-4 py-3 text-left">Selling Price (PKR)</th>
              <th className="px-4 py-3 text-left">Actions</th>
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
            ) : (
            filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold">{product.id}</td>
                <td className="px-4 py-3 font-semibold">{product.sku}</td>
                {editingProductId === product.id ? (
                  <>
                    <td className="px-4 py-3 font-semibold">
                      <input
                        type="text"
                        name="name"
                        value={editProduct.name}
                        onChange={handleEditInputChange}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      <input
                        type="number"
                        name="stock"
                        value={editProduct.stock}
                        onChange={handleEditInputChange}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      <input
                        type="number"
                        name="cost_price"
                        value={editProduct.cost_price}
                        onChange={handleEditInputChange}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      <input
                        type="number"
                        name="sale_price"
                        value={editProduct.sale_price}
                        onChange={handleEditInputChange}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                        onClick={() => handleSaveEdit(product.id)}
                        disabled={editLoading}
                      >
                        Save
                      </button>
                      <button
                        className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded"
                        onClick={handleDiscardEdit}
                        disabled={editLoading}
                      >
                        Discard
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-semibold">{product.name}</td>
                    <td className="px-4 py-3">{product.stock}</td>
                    <td className="px-4 py-3 font-semibold">PKR {product.cost_price.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold">PKR {product.sale_price.toLocaleString()}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
                        onClick={() => handleEditClick(product)}
                        disabled={!!editingProductId}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                        onClick={() => handleDelete(product.id)}
                        disabled={editLoading || !!editingProductId}
                      >
                        <Trash size={16} />
                      </button>
                    </td>
                  </>
                )}
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Products;