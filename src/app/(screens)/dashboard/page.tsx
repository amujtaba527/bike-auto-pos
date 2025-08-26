'use client';
import { Plus, Search, Pencil, Trash } from 'lucide-react';
import React, { useEffect, useState } from 'react';
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

  // --- Edit Mode State ---
  const [isEditMode, setIsEditMode] = useState(false); // New state for mode
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null); // ID of the expense being edited
  const [editLoading, setEditLoading] = useState(false); // Use one loading state or separate if needed

  // --- Unified handleEditClick ---
  const handleEditClick = (expense: Expense) => {
    // Populate the form fields with the selected expense's data
    setNewExpense({
      description: expense.description,
      amount: expense.amount,
      expense_date: expense.expense_date.split('T')[0], // Ensure date format is correct
      category: expense.category,
      notes: expense.notes || '', // Ensure notes is handled
    });
    setIsEditMode(true); // Set mode to edit
    setEditingExpenseId(expense.id); // Store the ID of the expense being edited
    setShowAddModal(true); // Open the modal
  };

  // --- Unified handleAddExpense (handles Add & Edit) ---
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    // Use appropriate loading state
    if (isEditMode) {
      setEditLoading(true);
    } else {
      setLoading(true);
    }

    try {
      let res;
      if (isEditMode && editingExpenseId !== null) {
        // --- Edit Logic ---
        res = await fetch(`/api/expense/${editingExpenseId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: newExpense.description,
            amount: Number(newExpense.amount),
            expense_date: newExpense.expense_date,
            category: newExpense.category,
            notes: newExpense.notes,
          }),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to update expense');
        }
      } else {
        // --- Add Logic ---
        res = await fetch('/api/expense', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: newExpense.description,
            amount: Number(newExpense.amount),
            expense_date: newExpense.expense_date,
            category: newExpense.category,
            notes: newExpense.notes,
          }),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to add expense');
        }
      }

      // Close modal and reset states regardless of add/edit
      handleCancelModal(); // Use the cancel function to reset everything

      // Refresh expenses list
      const refreshed = await fetch('/api/expense').then(r => r.json());
      const expensesArray = Array.isArray(refreshed) ? refreshed : refreshed.expenses || [];
      setExpenses(expensesArray);

    } catch (err: unknown) {
      console.error("Error in handleAddExpense:", err);
      alert((err as Error).message || (isEditMode ? 'An error occurred while updating the expense.' : 'An error occurred while adding the expense.'));
    } finally {
      // Reset appropriate loading state
      if (isEditMode) {
        setEditLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  // --- Unified Cancel/Discard Modal ---
  const handleCancelModal = () => {
    setShowAddModal(false);
    setIsEditMode(false);
    setEditingExpenseId(null);
    // Reset form data to initial empty state
    setNewExpense({
      description: '',
      amount: 0,
      expense_date: new Date().toISOString().split('T')[0],
      category: '',
      notes: '',
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Handle number inputs specifically
    const updatedValue = name === 'amount' ? Number(value) : value;
    setNewExpense({ ...newExpense, [name]: updatedValue });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    setEditLoading(true); // Use editLoading for delete too, or add another state
    try {
      const res = await fetch(`/api/expense/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete expense');
      }
      // Refresh expenses
      const refreshed = await fetch('/api/expense').then(r => r.json());
      const expensesArray = Array.isArray(refreshed) ? refreshed : refreshed.expenses || [];
      setExpenses(expensesArray);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setEditLoading(false);
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
      {/* Add/Edit Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md relative">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl"
              onClick={handleCancelModal} // Use cancel handler
              aria-label="Close"
            >
              &times;
            </button>
            {/* Conditional Title */}
            <h2 className="text-2xl font-bold mb-6 text-indigo-700">
              {isEditMode ? 'Edit Expense' : 'Add New Expense'}
            </h2>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <label htmlFor="description">Expense Description</label>
              <input
                type="text"
                name="description"
                placeholder="Expense Description"
                value={newExpense.description}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                disabled={isEditMode && editLoading} // Disable during edit loading
              />

              <label htmlFor="amount">Expense Amount</label>
              <input
                type="number"
                name="amount"
                placeholder="Expense Amount"
                value={newExpense.amount}
                onChange={handleInputChange}
                required
                min="0"
                step="1"
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                disabled={isEditMode && editLoading} // Disable during edit loading
              />

              <label htmlFor="expense_date">Expense Date</label>
              <input
                type="date"
                name="expense_date"
                placeholder="Expense Date"
                value={newExpense.expense_date}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                disabled={isEditMode && editLoading} // Disable during edit loading
              />

              <label htmlFor="category">Expense Category</label>
              <select
                name="category"
                value={newExpense.category}
                onChange={handleInputChange} // Use the unified handler
                required
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                disabled={isEditMode && editLoading} // Disable during edit loading
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

              <label htmlFor="notes">Expense Notes</label>
              <input
                type="text"
                name="notes"
                placeholder="Expense Notes"
                value={newExpense.notes}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                disabled={isEditMode && editLoading} // Disable during edit loading
              />

              {/* Conditional Submit Button */}
              <button
                type="submit"
                className={`w-full ${isEditMode ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'} text-white py-2 rounded-xl font-semibold transition flex items-center justify-center`}
                disabled={loading || editLoading} // Disable based on loading state
              >
                {isEditMode
                  ? (editLoading ? 'Saving...' : 'Save Changes')
                  : (loading ? 'Adding...' : 'Add Expense')}
              </button>
            </form>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <h1 className="text-3xl font-extrabold text-indigo-700 tracking-tight">Expenses</h1>
        <button
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-base font-semibold shadow-lg transition"
          onClick={() => {
            handleCancelModal(); // Reset state before opening for Add
            setShowAddModal(true);
          }}
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
            {loading && !isEditMode && !editLoading ? ( // Show loading only for initial load/fetch, not edit/add
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                </td>
              </tr>
            ) : filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No expenses found
                </td>
              </tr>
            ) : (
              filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold">{expense.id}</td>
                  <td className="px-4 py-3 font-semibold">{expense.description}</td>
                  <td className="px-4 py-3 font-semibold">{expense.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold">{expense.expense_date.split('T')[0]}</td>
                  <td className="px-4 py-3 font-semibold">{expense.category}</td>
                  <td className="px-4 py-3 font-semibold">{expense.notes ? expense.notes : "N/A"}</td>
                  <td className="px-4 py-3 flex gap-2">
                    {/* Edit Button */}
                    <button
                      className={`p-2 rounded ${
                        isEditMode || editLoading || loading // Disable if any operation is active
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                      }`}
                      onClick={() => handleEditClick(expense)}
                      disabled={isEditMode || editLoading || loading} // Disable based on state
                      aria-label="Edit"
                    >
                      <Pencil size={16} />
                    </button>

                    {/* Delete Button */}
                    <button
                      className={`p-2 rounded ${
                        isEditMode || editLoading || loading // Disable if any operation is active
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                      onClick={() => handleDelete(expense.id)}
                      disabled={isEditMode || editLoading || loading} // Disable based on state
                      aria-label="Delete"
                    >
                      <Trash size={16} />
                    </button>
                  </td>
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