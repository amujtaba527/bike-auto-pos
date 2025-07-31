'use client';
import { Plus, Search, Pencil, Trash } from 'lucide-react';
import React , { useEffect, useState } from 'react';
import { Customer } from '@/types/types';


const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);

  // Inline editing state
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [editCustomer, setEditCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  const [editLoading, setEditLoading] = useState(false);

  const handleEditClick = (customer: Customer) => {
    setEditingCustomerId(customer.id);
    setEditCustomer({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
    });
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditCustomer({ ...editCustomer, [e.target.name]: e.target.value });
  };

  const handleSaveEdit = async (id: number) => {
    setEditLoading(true);
    try {
      const res = await fetch(`/api/customer/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editCustomer.name,
          phone: editCustomer.phone,
          email: editCustomer.email,
          address: editCustomer.address,
        }),
      });
      if (!res.ok) throw new Error('Failed to update customer');
      setEditingCustomerId(null);
      setEditCustomer({ name: '', phone: '', email: '', address: '' });
      // Refresh products
      const refreshed = await fetch('/api/customer').then(r => r.json());
      const customersArray = Array.isArray(refreshed) ? refreshed : refreshed.customers || [];
      setCustomers(customersArray);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDiscardEdit = () => {
    setEditingCustomerId(null);
    setEditCustomer({ name: '', phone: '', email: '', address: '' });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/customer/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete customer');
      // Refresh products
      const refreshed = await fetch('/api/customer').then(r => r.json());
      const customersArray = Array.isArray(refreshed) ? refreshed : refreshed.customers || [];
      setCustomers(customersArray);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCustomer({ ...newCustomer, [e.target.name]: e.target.value });
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCustomer.name,
          phone: newCustomer.phone,
          email: newCustomer.email,
          address: newCustomer.address,
        }),
      });
      if (!res.ok) throw new Error('Failed to add customer');
      setShowAddModal(false);
      setNewCustomer({ name: '', phone: '', email: '', address: '' });
      // Refresh products
      const refreshed = await fetch('/api/customer').then(r => r.json());
      const customersArray = Array.isArray(refreshed) ? refreshed : refreshed.customers || [];
      setCustomers(customersArray);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/customer');
        const data = await res.json();
        const customersArray = Array.isArray(data) ? data : data.customers || [];
        const formatted = customersArray.map((customer: Customer) => ({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address
        }));
        setCustomers(formatted);
      } catch (err: unknown) {
        alert("Error fetching customers: " + (err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  // Filter customers based on search query
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery)
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
            <h2 className="text-2xl font-bold mb-6 text-indigo-700">Add New Customer</h2>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <input
                type="text"
                name="name"
                placeholder="Customer Name"
                value={newCustomer.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <input
                type="text"
                name="phone"
                placeholder="Customer Phone"
                value={newCustomer.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <input
                type="text"
                name="email"
                placeholder="Customer Email (optional)"
                value={newCustomer.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <input
                type="text"
                name="address"
                placeholder="Customer Address (optional)"
                value={newCustomer.address}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-semibold transition flex items-center justify-center"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Customer'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <h1 className="text-3xl font-extrabold text-indigo-700 tracking-tight">Customers</h1>
        <button
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-base font-semibold shadow-lg transition"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={16} />
          <span>Add Customer</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search customers..."
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
            ) : filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No customers found
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold">{customer.id}</td>
                  {editingCustomerId === customer.id ? (
                    <>
                      <td className="px-4 py-3 font-semibold">
                        <input
                          type="text"
                          name="name"
                          value={editCustomer.name}
                          onChange={handleEditInputChange}
                          className="w-full px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        <input
                          type="number"
                          name="phone"
                          value={editCustomer.phone}
                          onChange={handleEditInputChange}
                          className="w-full px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        <input
                          type="text"
                          name="email"
                          value={editCustomer.email}
                          onChange={handleEditInputChange}
                          className="w-full px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        <input
                          type="text"
                          name="address"
                          value={editCustomer.address}
                          onChange={handleEditInputChange}
                          className="w-full px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        <button
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                          onClick={() => handleSaveEdit(customer.id)}
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
                      <td className="px-4 py-3 font-semibold">{customer.name}</td>
                      <td className="px-4 py-3 font-semibold">{customer.phone}</td>
                      <td className="px-4 py-3 font-semibold">{customer.email ? customer.email : "N/A"}</td>
                      <td className="px-4 py-3 font-semibold">{customer.address ? customer.address : "N/A"}</td>
                      <td className="px-4 py-3 flex gap-2">
                        <button
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
                          onClick={() => handleEditClick(customer)}
                          disabled={!!editingCustomerId}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                          onClick={() => handleDelete(customer.id)}
                          disabled={editLoading || !!editingCustomerId}
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

export default Customers;