"use client";
import { Plus, Search, Pencil, Trash } from "lucide-react";
import React, { useEffect, useState } from "react";

interface Brand {
    id: number;
    name: string;
}

interface Category {
    id: number;
    name: string;
}

const CategoriesBrands = () => {
    // Brands State
    const [brands, setBrands] = useState<Brand[]>([]);
    const [brandSearch, setBrandSearch] = useState("");
    const [showAddBrand, setShowAddBrand] = useState(false);
    const [newBrand, setNewBrand] = useState({ name: "" });
    const [loadingBrand, setLoadingBrand] = useState(false);
    const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

    // Categories State
    const [categories, setCategories] = useState<Category[]>([]);
    const [categorySearch, setCategorySearch] = useState("");
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: "" });
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [loadingCategory, setLoadingCategory] = useState(false);

    // Fetch Brands
    const fetchBrands = async () => {
        try {
            const res = await fetch("/api/brand");
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const data = await res.json();
            // Ensure data is an array
            const brandsArray = Array.isArray(data) ? data : (data.brands || []);
            setBrands(brandsArray);
        } catch (err) {
            console.error("Failed to fetch brands:", err);
            alert("Failed to load brands.");
        }
    };

    // Fetch Categories
    const fetchCategories = async () => {
        try {
            const res = await fetch("/api/category");
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const data = await res.json();
            // Ensure data is an array
            const categoriesArray = Array.isArray(data) ? data : (data.categories || []);
            setCategories(categoriesArray);
        } catch (err) {
            console.error("Failed to fetch categories:", err);
            alert("Failed to load categories.");
        }
    };

    useEffect(() => {
        fetchBrands();
        fetchCategories();
    }, []);

    // Add Brand
    const handleAddBrand = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingBrand(true);
        try {
            const res = await fetch("/api/brand", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newBrand.name }),
            });

            if (!res.ok) {
                const errorData = await res.text();
                console.error("Add brand error response:", errorData);
                throw new Error(`Failed to add brand: ${res.status} ${res.statusText}`);
            }

            setShowAddBrand(false);
            setNewBrand({ name: "" });
            setSelectedBrand(null); // Clear selection
            await fetchBrands(); // Refresh list
        } catch (err: any) {
            console.error("Error adding brand:", err);
            alert(err.message || "An error occurred while adding the brand.");
        } finally {
            setLoadingBrand(false);
        }
    };

    // Add Category
    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingCategory(true);
        try {
            const res = await fetch("/api/category", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newCategory.name }),
            });

            if (!res.ok) {
                const errorData = await res.text();
                console.error("Add category error response:", errorData);
                throw new Error(`Failed to add category: ${res.status} ${res.statusText}`);
            }

            setShowAddCategory(false);
            setNewCategory({ name: "" });
            setSelectedCategory(null); // Clear selection
            await fetchCategories(); // Refresh list
        } catch (err: any) {
            console.error("Error adding category:", err);
            alert(err.message || "An error occurred while adding the category.");
        } finally {
            setLoadingCategory(false);
        }
    };

    // Edit Category
    const handleEditCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCategory) return;

        setLoadingCategory(true);
        try {
            const res = await fetch(`/api/category/${selectedCategory.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newCategory.name }), // Use newCategory.name which holds the edited value
            });

            if (!res.ok) {
                const errorData = await res.text();
                console.error("Edit category error response:", errorData);
                throw new Error(`Failed to update category: ${res.status} ${res.statusText}`);
            }

            setShowAddCategory(false);
            setNewCategory({ name: "" });
            setSelectedCategory(null); // Clear selection
            await fetchCategories(); // Refresh list
        } catch (err: any) {
            console.error("Error editing category:", err);
            alert(err.message || "An error occurred while updating the category.");
        } finally {
            setLoadingCategory(false);
        }
    };

    // Edit Brand
    const handleEditBrand = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBrand) return;

        setLoadingBrand(true);
        try {
            const res = await fetch(`/api/brand/${selectedBrand.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newBrand.name }), // Use newBrand.name which holds the edited value
            });

            if (!res.ok) {
                const errorData = await res.text();
                console.error("Edit brand error response:", errorData);
                throw new Error(`Failed to update brand: ${res.status} ${res.statusText}`);
            }

            setShowAddBrand(false);
            setNewBrand({ name: "" });
            setSelectedBrand(null); // Clear selection
            await fetchBrands(); // Refresh list
        } catch (err: any) {
            console.error("Error editing brand:", err);
            alert(err.message || "An error occurred while updating the brand.");
        } finally {
            setLoadingBrand(false);
        }
    };

    // Delete Category
    const handleDeleteCategory = async (id: number) => {
        if (!window.confirm(`Are you sure you want to delete the category?`)) {
            return;
        }

        setLoadingCategory(true);
        try {
            const res = await fetch(`/api/category/${id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
            });

            if (!res.ok) {
                const errorData = await res.text();
                console.error("Delete category error response:", errorData);
                throw new Error(`Failed to delete category: ${res.status} ${res.statusText}`);
            }

            setShowAddCategory(false);
            setNewCategory({ name: "" });
            setSelectedCategory(null); // Clear selection
            await fetchCategories(); // Refresh list
        } catch (err: any) {
            console.error("Error deleting category:", err);
            alert(err.message || "An error occurred while deleting the category.");
        } finally {
            setLoadingCategory(false);
        }
    };

    // Delete Brand
    const handleDeleteBrand = async (id: number) => {
        if (!window.confirm(`Are you sure you want to delete the brand?`)) {
            return;
        }

        setLoadingBrand(true);
        try {
            const res = await fetch(`/api/brand/${id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
            });

            if (!res.ok) {
                const errorData = await res.text();
                console.error("Delete brand error response:", errorData);
                throw new Error(`Failed to delete brand: ${res.status} ${res.statusText}`);
            }

            setShowAddBrand(false);
            setNewBrand({ name: "" });
            setSelectedBrand(null); // Clear selection
            await fetchBrands(); // Refresh list
        } catch (err: any) {
            console.error("Error deleting brand:", err);
            alert(err.message || "An error occurred while deleting the brand.");
        } finally {
            setLoadingBrand(false);
        }
    };

    // Filtered lists
    const filteredBrands = brands.filter((b) =>
        b.name.toLowerCase().includes(brandSearch.toLowerCase())
    );
    const filteredCategories = categories.filter((c) =>
        c.name.toLowerCase().includes(categorySearch.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4 md:p-8 w-full max-w-screen-2xl mx-auto text-black">
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Brands Card */}
                <div className="bg-white rounded-lg shadow p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold">Brands</h2>
                        <button
                            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-base font-semibold shadow-lg transition"
                            onClick={() => {
                                setSelectedBrand(null);
                                setNewBrand({ name: "" });
                                setShowAddBrand(true);
                            }}
                        >
                            <Plus size={18} /> <span>Add Brand</span>
                        </button>
                    </div>
                    <div className="mb-4 flex items-center">
                        <Search size={18} className="mr-2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search brands..."
                            className="w-full px-3 py-2 border rounded"
                            value={brandSearch}
                            onChange={(e) => setBrandSearch(e.target.value)}
                        />
                    </div>
                    <div className="overflow-x-auto rounded">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-4 py-2 text-left">ID</th>
                                    <th className="px-4 py-2 text-left">Brand Name</th>
                                    <th className="px-4 py-2 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBrands.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="text-center py-4 text-gray-400">No brands found</td>
                                    </tr>
                                ) : (
                                    filteredBrands.map((brand) => (
                                        <tr key={brand.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2">{brand.id}</td>
                                            <td className="px-4 py-2">{brand.name}</td>
                                            <td className="px-4 py-2">
                                                <div className="flex gap-2">
                                                    <button
                                                        className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded shadow text-xs"
                                                        onClick={() => {
                                                            setSelectedBrand(brand);
                                                            setNewBrand({ name: brand.name });
                                                            setShowAddBrand(true);
                                                        }}
                                                    >
                                                        <Pencil size={14} /> Edit
                                                    </button>
                                                    <button
                                                        className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded shadow text-xs"
                                                        onClick={() => {
                                                            handleDeleteBrand(brand.id);
                                                        }}
                                                    >
                                                        <Trash size={14} /> Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Categories Card */}
                <div className="bg-white rounded-lg shadow p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold">Categories</h2>
                        <button
                            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl text-base font-semibold shadow-lg transition"
                            onClick={() => {
                                setSelectedCategory(null);
                                setNewCategory({ name: "" });
                                setShowAddCategory(true);
                            }}
                        >
                            <Plus size={18} /> <span>Add Category</span>
                        </button>
                    </div>
                    <div className="mb-4 flex items-center">
                        <Search size={18} className="mr-2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search categories..."
                            className="w-full px-3 py-2 border rounded"
                            value={categorySearch}
                            onChange={(e) => setCategorySearch(e.target.value)}
                        />
                    </div>
                    <div className="overflow-x-auto rounded">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-4 py-2 text-left">ID</th>
                                    <th className="px-4 py-2 text-left">Category Name</th>
                                    <th className="px-4 py-2 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCategories.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="text-center py-4 text-gray-400">No categories found</td>
                                    </tr>
                                ) : (
                                    filteredCategories.map((category) => (
                                        <tr key={category.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2">{category.id}</td>
                                            <td className="px-4 py-2">{category.name}</td>
                                            <td className="px-4 py-2">
                                                <div className="flex gap-2">
                                                    <button
                                                        className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded shadow text-xs"
                                                        onClick={() => {
                                                            setSelectedCategory(category);
                                                            setNewCategory({ name: category.name });
                                                            setShowAddCategory(true);
                                                        }}
                                                    >
                                                        <Pencil size={14} /> Edit
                                                    </button>
                                                    <button
                                                        className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded shadow text-xs"
                                                        onClick={() => {
                                                            handleDeleteCategory(category.id);
                                                        }}
                                                    >
                                                        <Trash size={14} /> Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add/Edit Brand Modal */}
            {showAddBrand && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md relative">
                        <button
                            className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl"
                            onClick={() => {
                                setShowAddBrand(false);
                                setSelectedBrand(null);
                                setNewBrand({ name: "" });
                            }}
                            aria-label="Close"
                        >
                            &times;
                        </button>
                        <h3 className="text-2xl font-bold mb-6 text-indigo-700">{selectedBrand ? "Edit Brand" : "Add Brand"}</h3>
                        <form onSubmit={selectedBrand ? handleEditBrand : handleAddBrand} className="space-y-4">
                            <input
                                type="text"
                                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                placeholder="Brand name"
                                value={newBrand.name}
                                onChange={(e) => setNewBrand({ name: e.target.value })}
                                required
                            />
                            <div className="flex gap-2 justify-end">
                                <button
                                    type="button"
                                    className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-xl"
                                    onClick={() => {
                                        setShowAddBrand(false);
                                        setSelectedBrand(null);
                                        setNewBrand({ name: "" });
                                    }}
                                    disabled={loadingBrand}
                                >
                                    Cancel
                                </button>
                                {/* {selectedBrand && (
                                    <button
                                        type="button"
                                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl"
                                        onClick={() => handleDeleteBrand(selectedBrand.id)}
                                        disabled={loadingBrand}
                                    >
                                        {loadingBrand ? "Deleting..." : "Delete"}
                                    </button>
                                )} */}
                                <button
                                    type="submit"
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl"
                                    disabled={loadingBrand}
                                >
                                    {loadingBrand ? (selectedBrand ? "Saving..." : "Adding...") : (selectedBrand ? "Save" : "Add")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showAddCategory && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md relative">
                        <button
                            className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl"
                            onClick={() => {
                                setShowAddCategory(false);
                                setSelectedCategory(null);
                                setNewCategory({ name: "" });
                            }}
                            aria-label="Close"
                        >
                            &times;
                        </button>
                        <h3 className="text-2xl font-bold mb-6 text-indigo-700">{selectedCategory ? "Edit Category" : "Add Category"}</h3>
                        <form onSubmit={selectedCategory ? handleEditCategory : handleAddCategory} className="space-y-4">
                            <input
                                type="text"
                                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                placeholder="Category name"
                                value={newCategory.name}
                                onChange={(e) => setNewCategory({ name: e.target.value })}
                                required
                            />
                            <div className="flex gap-2 justify-end">
                                <button
                                    type="button"
                                    className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-xl"
                                    onClick={() => {
                                        setShowAddCategory(false);
                                        setSelectedCategory(null);
                                        setNewCategory({ name: "" });
                                    }}
                                    disabled={loadingCategory}
                                >
                                    Cancel
                                </button>
                                {/* {selectedCategory && (
                                    <button
                                        type="button"
                                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl"
                                        onClick={() => handleDeleteCategory(selectedCategory.id)}
                                        disabled={loadingCategory}
                                    >
                                        {loadingCategory ? "Deleting..." : "Delete"}
                                    </button>
                                )} */}
                                <button
                                    type="submit"
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl"
                                    disabled={loadingCategory}
                                >
                                    {loadingCategory ? (selectedCategory ? "Saving..." : "Adding...") : (selectedCategory ? "Save" : "Add")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoriesBrands;