'use client';
import { Plus, Search, Pencil, Trash } from 'lucide-react';
import React , { useEffect, useState } from 'react';
import { Vendor } from '@/types/types';


const Vendors = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);

  // Inline editing state
  const [editingVendorId, setEditingVendorId] = useState<number | null>(null);
  const [editVendor, setEditVendor] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  const [editLoading, setEditLoading] = useState(false);

  const handleEditClick = (vendor: Vendor) => {
    setEditingVendorId(vendor.id);
    setEditVendor({
      name: vendor.name,
      phone: vendor.phone,
      email: vendor.email,
      address: vendor.address,
    });
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditVendor({ ...editVendor, [e.target.name]: e.target.value });
  };

  const handleSaveEdit = async (id: number) => {
    setEditLoading(true);
    try {
      const res = await fetch(`/api/vendor/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editVendor.name,
          phone: editVendor.phone,
          email: editVendor.email,
          address: editVendor.address,
        }),
      });
      if (!res.ok) throw new Error('Failed to update vendor');
      setEditingVendorId(null);
      setEditVendor({ name: '', phone: '', email: '', address: '' });
      // Refresh products
      const refreshed = await fetch('/api/vendor').then(r => r.json());
      const vendorsArray = Array.isArray(refreshed) ? refreshed : refreshed.vendors || [];
      setVendors(vendorsArray);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDiscardEdit = () => {
    setEditingVendorId(null);
    setEditVendor({ name: '', phone: '', email: '', address: '' });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/vendor/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete vendor');
      // Refresh products
      const refreshed = await fetch('/api/vendor').then(r => r.json());
      const vendorsArray = Array.isArray(refreshed) ? refreshed : refreshed.vendors || [];
      setVendors(vendorsArray);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewVendor({ ...newVendor, [e.target.name]: e.target.value });
  };

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newVendor.name,
          phone: newVendor.phone,
          email: newVendor.email,
          address: newVendor.address,
        }),
      });
      if (!res.ok) throw new Error('Failed to add vendor');
      setShowAddModal(false);
      setNewVendor({ name: '', phone: '', email: '', address: '' });
      // Refresh products
      const refreshed = await fetch('/api/vendor').then(r => r.json());
      const vendorsArray = Array.isArray(refreshed) ? refreshed : refreshed.vendors || [];
      setVendors(vendorsArray);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/vendor');
        const data = await res.json();
        const vendorsArray = Array.isArray(data) ? data : data.vendors || [];
        const formatted = vendorsArray.map((vendor: Vendor) => ({
          id: vendor.id,
          name: vendor.name,
          phone: vendor.phone,
          email: vendor.email,
          address: vendor.address
        }));
        setVendors(formatted);
      } catch (err: unknown) {
        alert("Error fetching vendors: " + (err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchVendors();
  }, []);

  // Filter vendors based on search query
  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.phone.includes(searchQuery)
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
            <h2 className="text-2xl font-bold mb-6 text-indigo-700">Add New Vendor</h2>
            <form onSubmit={handleAddVendor} className="space-y-4">
              <input
                type="text"
                name="name"
                placeholder="Vendor Name"
                value={newVendor.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <input
                type="text"
                name="phone"
                placeholder="Vendor Phone"
                value={newVendor.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <input
                type="text"
                name="email"
                placeholder="Vendor Email (optional)"
                value={newVendor.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <input
                type="text"
                name="address"
                placeholder="Vendor Address (optional)"
                value={newVendor.address}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-semibold transition flex items-center justify-center"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Vendor'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <h1 className="text-3xl font-extrabold text-indigo-700 tracking-tight">Vendors</h1>
        <button
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-base font-semibold shadow-lg transition"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={16} />
          <span>Add Vendor</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search vendors..."
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
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Address</th>
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
            ) : filteredVendors.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No vendors found
                </td>
              </tr>
            ) : (
              filteredVendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold">{vendor.id}</td>
                  {editingVendorId === vendor.id ? (
                    <>
                      <td className="px-4 py-3 font-semibold">
                        <input
                          type="text"
                          name="name"
                          value={editVendor.name}
                          onChange={handleEditInputChange}
                          className="w-full px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        <input
                          type="number"
                          name="phone"
                          value={editVendor.phone}
                          onChange={handleEditInputChange}
                          className="w-full px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        <input
                          type="text"
                          name="email"
                          value={editVendor.email}
                          onChange={handleEditInputChange}
                          className="w-full px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        <input
                          type="text"
                          name="address"
                          value={editVendor.address}
                          onChange={handleEditInputChange}
                          className="w-full px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        <button
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                          onClick={() => handleSaveEdit(vendor.id)}
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
                      <td className="px-4 py-3 font-semibold">{vendor.name}</td>
                      <td className="px-4 py-3 font-semibold">{vendor.phone}</td>
                      <td className="px-4 py-3 font-semibold">{vendor.email ? vendor.email : "N/A"}</td>
                      <td className="px-4 py-3 font-semibold">{vendor.address ? vendor.address : "N/A"}</td>
                      <td className="px-4 py-3 flex gap-2">
                        <button
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
                          onClick={() => handleEditClick(vendor)}
                          disabled={!!editingVendorId}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                          onClick={() => handleDelete(vendor.id)}
                          disabled={editLoading || !!editingVendorId}
                        >
                          <Trash size={16} />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Vendors;