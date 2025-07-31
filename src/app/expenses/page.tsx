'use client';
import { Plus, Search, Pencil, Trash } from 'lucide-react';
import React , { useEffect, useState } from 'react';
import { Expense } from '@/types/types';


const ExpensesPage = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    category: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  // Inline editing state
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [editExpense, setEditExpense] = useState({
    description: '',
    amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    category: '',
    notes: '',
  });
  const [editLoading, setEditLoading] = useState(false);

  const handleEditClick = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setEditExpense({
      description: expense.description,
      amount: expense.amount,
      expense_date: expense.expense_date,
      category: expense.category,
      notes: expense.notes,
    });
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditExpense({ ...editExpense, [e.target.name]: e.target.value });
  };

  const handleSaveEdit = async (id: number) => {
    setEditLoading(true);
    try {
      const res = await fetch(`/api/expense/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editExpense.description,
          amount: editExpense.amount,
          expense_date: editExpense.expense_date,
          category: editExpense.category,
          notes: editExpense.notes,
        }),
      });
      if (!res.ok) throw new Error('Failed to update expense');
      setEditingExpenseId(null);
      setEditExpense({ description: '', amount: 0, expense_date: new Date().toISOString().split('T')[0], category: '', notes: '' });
      // Refresh products
      const refreshed = await fetch('/api/expense').then(r => r.json());
      const expensesArray = Array.isArray(refreshed) ? refreshed : refreshed.expenses || [];
      setExpenses(expensesArray);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDiscardEdit = () => {
    setEditingExpenseId(null);
    setEditExpense({ description: '', amount: 0, expense_date: new Date().toISOString().split('T')[0], category: '', notes: '' });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/expense/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete expense');
      // Refresh products
      const refreshed = await fetch('/api/expense').then(r => r.json());
      const expensesArray = Array.isArray(refreshed) ? refreshed : refreshed.expenses || [];
      setExpenses(expensesArray);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewExpense({ ...newExpense, [e.target.name]: e.target.value });
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: newExpense.description,
          amount: newExpense.amount,
          expense_date: newExpense.expense_date,
          category: newExpense.category,
          notes: newExpense.notes,
        }),
      });
      if (!res.ok) throw new Error('Failed to add expense');
      setShowAddModal(false);
      setNewExpense({ description: '', amount: 0, expense_date: new Date().toISOString().split('T')[0], category: '', notes: '' });
      // Refresh products
      const refreshed = await fetch('/api/expense').then(r => r.json());
      const expensesArray = Array.isArray(refreshed) ? refreshed : refreshed.expenses || [];
      setExpenses(expensesArray);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/expense');
        const data = await res.json();
        const expensesArray = Array.isArray(data) ? data : data.expenses || [];
        const formatted = expensesArray.map((expense: Expense) => ({
          id: expense.id,
          description: expense.description,
          amount: expense.amount,
          expense_date: expense.expense_date,
          category: expense.category,
          notes: expense.notes
        }));
        setExpenses(formatted);
      } catch (err: unknown) {
        alert("Error fetching expenses: " + (err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchExpenses();
  }, []);

  // Filter expenses based on search query
  const filteredExpenses = expenses.filter(expense =>
    expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    expense.category.toLowerCase().includes(searchQuery.toLowerCase())
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
            <h2 className="text-2xl font-bold mb-6 text-indigo-700">Add New Expense</h2>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <input
                type="text"
                name="description"
                placeholder="Expense Description"
                value={newExpense.description}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <input
                type="number"
                name="amount"
                placeholder="Expense Amount"
                value={newExpense.amount}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <input
                type="date"
                name="expense_date"
                placeholder="Expense Date"
                value={newExpense.expense_date}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <select
                name="category"
                value={newExpense.category}
                onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                required
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Select Category</option>
                <option value="Rent">Rent</option>
                <option value="Utilities">Utilities</option>
                <option value="Electricity">Electricity</option>
                <option value="Internet">Internet</option>
                <option value="Salaries">Salaries</option>
                <option value="Wages">Wages</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Others">Others</option>
              </select>
              <input
                type="text"
                name="notes"
                placeholder="Expense Notes"
                value={newExpense.notes}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-semibold transition flex items-center justify-center"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Expense'}
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
          <span>Add Expense</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search expenses..."
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
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-left">Amount</th>
              <th className="px-4 py-3 text-left">Expense Date</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Notes</th>
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
            ) : filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No expenses found
                </td>
              </tr>
            ) : (
              filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold">{expense.id}</td>
                  {editingExpenseId === expense.id ? (
                    <>
                      <td className="px-4 py-3 font-semibold">
                        <input
                          type="text"
                          name="description"
                          value={editExpense.description}
                          onChange={handleEditInputChange}
                          className="w-full px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        <input
                          type="number"
                          name="amount"
                          value={editExpense.amount}
                          onChange={handleEditInputChange}
                          className="w-full px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        <input
                          type="date"
                          name="expense_date"
                          value={editExpense.expense_date}
                          onChange={handleEditInputChange}
                          className="w-full px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        <input
                          type="text"
                          name="category"
                          value={editExpense.category}
                          onChange={handleEditInputChange}
                          className="w-full px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        <input
                          type="text"
                          name="notes"
                          value={editExpense.notes}
                          onChange={handleEditInputChange}
                          className="w-full px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        <button
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                          onClick={() => handleSaveEdit(expense.id)}
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
                      <td className="px-4 py-3 font-semibold">{expense.description}</td>
                      <td className="px-4 py-3 font-semibold">{expense.amount}</td>
                      <td className="px-4 py-3 font-semibold">{expense.expense_date.split('T')[0] }</td>
                      <td className="px-4 py-3 font-semibold">{expense.category}</td>
                      <td className="px-4 py-3 font-semibold">{expense.notes ? expense.notes : "N/A"}</td>
                      <td className="px-4 py-3 flex gap-2">
                        <button
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
                          onClick={() => handleEditClick(expense)}
                          disabled={!!editingExpenseId}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                          onClick={() => handleDelete(expense.id)}
                          disabled={editLoading || !!editingExpenseId}
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

export default ExpensesPage;