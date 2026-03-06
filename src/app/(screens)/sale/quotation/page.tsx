"use client";
import { MinusIcon, PlusIcon, Edit, Trash, Printer } from "lucide-react";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
const Select = dynamic(() => import('react-select'), { ssr: false });

type Brand = {
    id: number;
    name: string;
}

type Product = {
    id: number;
    name: string;
    sku: string;
    sale_price: number;
    brand_id: number;
    stock: number;
    quantity: number;
};

type Customer = {
    id: number;
    name: string;
};

const SaleQuotation = () => {
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [orderDiscount, setOrderDiscount] = useState<number>(0);
    const [orderDiscountType, setOrderDiscountType] = useState<"%" | "PKR">("PKR");
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [selectedProductOption, setSelectedProductOption] = useState<any>(null);
    const [editingProductId, setEditingProductId] = useState<number | null>(null);
    const [tempQuantity, setTempQuantity] = useState<number>(1);
    const [selectedCustomerOption, setSelectedCustomerOption] = useState<any>(null);
    const [total, setTotal] = useState<number>(0);
    const [rate, setRate] = useState<number>(0);

    useEffect(() => {
        if (rate > 0) {
            setTotal(rate * tempQuantity);
        }
    }, [rate]);

    useEffect(() => {
        if (tempQuantity > 0) {
            setTotal(rate * tempQuantity);
        }
    }, [tempQuantity]);

    // Fetch customers and products on mount
    useEffect(() => {
        fetch('/api/customer')
            .then(res => res.json())
            .then(data => {
                const customerList = Array.isArray(data) ? data : data.customers || [];
                setCustomers(customerList);
                const walkInCustomer = customerList.find((c: Customer) => c.name === "Walk In");
                if (walkInCustomer) {
                    setCustomer(walkInCustomer);
                    setSelectedCustomerOption({
                        value: walkInCustomer.id,
                        label: walkInCustomer.name,
                        ...walkInCustomer
                    });
                }
            });
        fetch('/api/brand')
            .then(res => res.json())
            .then(data => setBrands(Array.isArray(data) ? data : data.brands || []));
        fetch('/api/product')
            .then(res => res.json())
            .then(data => setAllProducts(Array.isArray(data) ? data : data.products || []));
    }, []);

    const handleAddProduct = (productId: number) => {
        const prod = allProducts.find((p: Product) => p.id === productId);
        if (!prod) return;

        if (editingProductId) {
            setProducts(products.map((p: Product) =>
                p.id === editingProductId
                    ? { ...p, quantity: tempQuantity, sale_price: rate }
                    : p
            ));
            setEditingProductId(null);
        } else {
            const existingProduct = products.find((p: Product) => p.id === productId);
            if (existingProduct) {
                setProducts(products.map((p: Product) =>
                    p.id === productId
                        ? { ...p, quantity: p.quantity + tempQuantity, sale_price: rate }
                        : p
                ));
            } else {
                const newProduct: Product = {
                    id: prod.id,
                    name: prod.name,
                    sku: prod.sku || '',
                    brand_id: prod.brand_id || 0,
                    sale_price: rate || prod.sale_price || 0,
                    stock: prod.stock || 0,
                    quantity: tempQuantity,
                };
                setProducts([...products, newProduct]);
            }
        }

        setSelectedProductId(null);
        setSelectedProductOption(null);
        setTempQuantity(1);
        setRate(0);
        setTotal(0);
    };

    const updateProduct = (id: number, field: keyof Product, value: number) => {
        setProducts(products.map((p: Product) => p.id === id ? { ...p, [field]: value } : p));
    };

    const removeProduct = (id: number) => {
        setProducts(products.filter((p: Product) => p.id !== id));
    };

    const subtotal = products.reduce((acc, p) =>
        acc + (p.sale_price * p.quantity), 0);

    const calcOrderDiscount = () => {
        return orderDiscountType === "%"
            ? subtotal * (orderDiscount / 100)
            : orderDiscount;
    };

    const tax = subtotal * 0.00;
    const grandTotal = subtotal - calcOrderDiscount() + tax;

    const generatePDF = () => {
        if (products.length === 0) {
            alert('Please add at least one product');
            return;
        }
        const printStyle = document.createElement('style');
        printStyle.innerHTML = `
      @media print {
        body * {
          visibility: hidden;
        }
        .invoice-container, .invoice-container * {
          visibility: visible;
        }
        .invoice-container {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          box-shadow: none;
          display: block !important;
        }
        .no-print {
          display: none;
        }
      }
    `;
        document.head.appendChild(printStyle);
        window.print();
        setTimeout(() => {
            document.head.removeChild(printStyle);
        }, 1000);
    };

    return (
        <div className="max-h-screen bg-gray-50 p-4 md:p-8 w-full max-w-screen-2xl mx-auto">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 no-print">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-800">Sale Quotation</h1>
                        <div className="flex items-center gap-4">
                            <div className="bg-gray-100 px-4 py-2 rounded-lg">
                                <div className="text-sm text-gray-600">Order Summary</div>
                                <div className="text-sm font-semibold">{products.length} items</div>
                            </div>
                            <button
                                onClick={() => {
                                    setProducts([]);
                                    setOrderDiscount(0);
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:text-red-800 border border-red-200 rounded-lg"
                            >
                                <span>✕</span>
                                Clear (C)
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Product Entry and List */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Customer and Date Info */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 no-print">
                            <div className="flex lg:flex-row justify-between">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer Selection</label>
                                    <Select
                                        options={customers.map(customer => ({
                                            value: customer.id,
                                            label: customer.name,
                                            ...customer
                                        }))}
                                        value={selectedCustomerOption}
                                        onChange={(option: any) => {
                                            if (!option) return;
                                            setSelectedCustomerOption(option);
                                            setCustomer(option);
                                        }}
                                        placeholder="Search or select a customer..."
                                        isSearchable
                                        classNamePrefix="react-select"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Product Search and Add */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 no-print">
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Product Name / SKU / Barcode
                                    </label>
                                    <Select
                                        options={allProducts.map(product => ({
                                            value: product.id,
                                            label: `${product.name} (SKU: ${product.sku}, PKR ${product.sale_price}, Brand: ${brands.find((brand: Brand) => brand.id === product.brand_id)?.name})`,
                                            ...product
                                        }))}
                                        value={selectedProductOption}
                                        onChange={(option: any) => {
                                            if (!option) return;
                                            setSelectedProductOption(option);
                                            setSelectedProductId(option.value);
                                            setRate(option.sale_price);
                                            setTempQuantity(1);
                                            setTotal(option.sale_price);
                                        }}
                                        placeholder="Search or select a product..."
                                        isSearchable
                                        classNamePrefix="react-select"
                                    />
                                </div>
                                <div className="w-20">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Rate</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={rate}
                                        onChange={(e) => setRate(Number(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                    />
                                </div>
                                <div className="w-20">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Qty</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={tempQuantity}
                                        onChange={(e) => {
                                            setTempQuantity(Number(e.target.value) || 1);
                                            if (rate > 0) {
                                                setTotal(rate * tempQuantity);
                                            }
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                    />
                                </div>
                                <div className="w-20">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Total</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={total}
                                        disabled
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                    />
                                </div>
                                <button
                                    onClick={() => selectedProductId && handleAddProduct(selectedProductId)}
                                    disabled={!selectedProductId}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                                >
                                    Add
                                </button>
                            </div>
                        </div>

                        {/* Product List - visible on screen only */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 no-print">
                            {products.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <div className="text-4xl mb-4">🛒</div>
                                    <div className="text-lg font-medium mb-2">No items in quotation</div>
                                    <div className="text-sm">Start by searching and adding products above</div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto max-h-[calc(100vh-520px)] overflow-y-auto relative">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 ">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Product Name / SKU / Barcode</th>
                                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Qty</th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Price</th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Total</th>
                                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {products.map((product) => (
                                                <tr key={product.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-gray-900">{product.name}</div>
                                                        <div className="text-sm text-gray-500">SKU: {product.sku} Stock: {product.stock} Brand: {brands.find((brand: Brand) => brand.id === product.brand_id)?.name}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => updateProduct(product.id, 'quantity', Math.max(1, product.quantity - 1))}
                                                                className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600"
                                                            >
                                                                <MinusIcon className="w-4 h-4" />
                                                            </button>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={product.quantity}
                                                                onChange={(e) => updateProduct(product.id, 'quantity', parseInt(e.target.value) || 1)}
                                                                className="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                            <button
                                                                onClick={() => updateProduct(product.id, 'quantity', product.quantity + 1)}
                                                                className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600"
                                                            >
                                                                <PlusIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium">PKR {product.sale_price}</td>
                                                    <td className="px-4 py-3 text-right font-semibold">PKR {(product.sale_price * product.quantity)}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button onClick={() => {
                                                            setEditingProductId(product.id);
                                                            setSelectedProductId(product.id);
                                                            setSelectedProductOption({
                                                                value: product.id,
                                                                label: `${product.name} (SKU: ${product.sku}, PKR ${product.sale_price})`,
                                                                ...product
                                                            });
                                                            setRate(product.sale_price);
                                                            setTempQuantity(product.quantity);
                                                            setTotal(product.sale_price * product.quantity);
                                                        }}>
                                                            <Edit size={16} className="text-blue-600 mr-2" />
                                                        </button>
                                                        <button
                                                            onClick={() => removeProduct(product.id)}
                                                            className="text-red-600 hover:text-red-800 p-1"
                                                            title="Remove item"
                                                        >
                                                            <Trash size={16} className="text-red-600 mr-2" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Invoice Container - for print/PDF */}
                        <div className="invoice-container hidden bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-800">Sale Quotation</h1>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-600">Date: {new Date(date).toLocaleDateString()}</p>
                                </div>
                            </div>


                            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                                <h2 className="text-lg font-semibold text-gray-700 mb-2">Customer Information</h2>
                                <p className="text-gray-600">{customer?.name || 'N/A'}</p>
                            </div>


                            <div className="mb-8">
                                <h2 className="text-lg font-semibold text-gray-700 mb-4">Items</h2>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full bg-white border border-gray-200">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                <th className="py-2 px-4 border-b text-left">Product</th>
                                                <th className="py-2 px-4 border-b text-right">Price</th>
                                                <th className="py-2 px-4 border-b text-right">Quantity</th>
                                                <th className="py-2 px-4 border-b text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {products.map((product) => (
                                                <tr key={product.id} className="border-b">
                                                    <td className="py-2 px-4">{product.name}</td>
                                                    <td className="py-2 px-4 text-right">PKR {product.sale_price}</td>
                                                    <td className="py-2 px-4 text-right">{product.quantity}</td>
                                                    <td className="py-2 px-4 text-right font-medium">PKR {(product.sale_price * product.quantity)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>


                            <div className="mb-8 ml-auto max-w-xs">
                                <div className="flex justify-between py-2">
                                    <span className="text-gray-600">Subtotal:</span>
                                    <span className="font-medium">PKR {subtotal}</span>
                                </div>
                                {calcOrderDiscount() > 0 && (
                                    <div className="flex justify-between py-2">
                                        <span className="text-gray-600">Discount:</span>
                                        <span className="font-medium">PKR {calcOrderDiscount()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between py-2 border-t border-gray-300 mt-2 pt-2">
                                    <span className="text-lg font-semibold">Total:</span>
                                    <span className="text-lg font-bold">PKR {grandTotal}</span>
                                </div>
                            </div>

                            <div className="text-center text-sm text-gray-500 mt-4">
                                <p>This is a quotation only. Not a confirmed sale.</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Order Summary */}
                    <div className="space-y-4 no-print">
                        {/* Order Summary Card */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Quotation Summary</h2>

                            {/* Order Discount */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Order Discount</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={orderDiscount}
                                        onChange={(e) => setOrderDiscount(Number(e.target.value) || 0)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="0.00"
                                    />
                                    <select
                                        value={orderDiscountType}
                                        onChange={(e) => setOrderDiscountType(e.target.value as "%" | "PKR")}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="PKR">PKR</option>
                                        <option value="%">%</option>
                                    </select>
                                </div>
                            </div>

                            {/* Summary Details */}
                            <div className="space-y-3 border-t border-gray-200 pt-4">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal:</span>
                                    <span className="font-medium">PKR {subtotal}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Tax:</span>
                                    <span className="font-medium">PKR {tax}</span>
                                </div>
                                {orderDiscount > 0 && (
                                    <div className="flex justify-between text-red-600">
                                        <span>Discount:</span>
                                        <span className="font-medium">-PKR {calcOrderDiscount()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-xl font-bold text-gray-900 border-t border-gray-200 pt-3">
                                    <span>Total:</span>
                                    <span className="text-green-600">PKR {grandTotal}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="space-y-3">
                                <button
                                    onClick={generatePDF}
                                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-semibold text-lg transition-colors"
                                >
                                    <Printer size={20} />
                                    Print Quotation
                                </button>
                                <button
                                    onClick={() => {
                                        setProducts([]);
                                        setOrderDiscount(0);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg font-semibold text-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SaleQuotation;
