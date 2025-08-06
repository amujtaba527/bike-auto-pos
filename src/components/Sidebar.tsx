'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import React, { useMemo } from 'react';
import { Home, LogOut, Package, Plus, RotateCcw, ShoppingCart, User } from 'lucide-react';

const getSidebarMenu = (pathname: string) => {
  if (pathname.startsWith("/product")) {
    return [
      { href: "/product", icon: Package, text: "Products" },
      { href: "/product/categories", icon: Plus, text: "Category & Brand" },
      { href: "/product/demand", icon: RotateCcw, text: "Product Demand" }
    ];
  }

  if (pathname.startsWith("/sale")) {
    return [
      { href: "/sale", icon: ShoppingCart, text: "Sales" },
      { href: "/sale/newsale", icon: Plus, text: "New Sale" },
      { href: "/sale/return", icon: RotateCcw, text: "Return Sale" }
    ];
  }

  if (pathname.startsWith("/customer") || pathname.startsWith("/vendor")) {
    return [
      { href: "/customer", icon: User, text: "Customers" },
      { href: "/vendor", icon: User, text: "Vendor" }
    ];
  }

  if (pathname.startsWith("/purchase")) {
    return [
      { href: "/purchase", icon: Package, text: "Purchase" },
      { href: "/purchase/newpurchase", icon: Plus, text: "New Purchase" },
      { href: "/purchase/return", icon: RotateCcw, text: "Return Purchase" }
    ];
  }

  return []; // fallback for Dashboard, Report, etc.
};

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Customers', path: '/customer' },
  { name: 'Products', path: '/product' },
  { name: 'Sales', path: '/sale' },
  { name: 'Purchases', path: '/purchase' },
  { name: 'Expenses', path: '/expenses' },
  { name: 'Reports', path: '/report' },
  { name: 'Accounts', path: '/account' },
];

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const sidebarItems = useMemo(() => getSidebarMenu(pathname), [pathname]);

  return (
    <div className="flex flex-col h-screen">
      {/* Top Navbar */}
      <nav className="flex items-center justify-between bg-gray-900 text-white p-4 shadow">
        <div className="flex space-x-6">
          {NAV_ITEMS.map((item) => (
            <Link key={item.name} href={item.path}>
              <span
                className={`cursor-pointer hover:underline ${
                  pathname === item.path ? 'font-bold text-yellow-400' : ''
                }`}
              >
                {item.name}
              </span>
            </Link>
          ))}
        </div>
        <div className="flex items-center space-x-2">
          <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded flex items-center space-x-2">
            <LogOut/>
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarItems.length > 0 && (
          <aside className="w-64 bg-gray-100 p-4 border-r overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Options</h2>
            <ul className="space-y-2">
              {sidebarItems.map((item: any) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.href}
                    className="p-2 rounded hover:bg-gray-200 cursor-pointer text-gray-800"
                  >
                    <Link href={item.href}>
                      <span className="flex items-center space-x-2">
                        <Icon />
                        {item.text}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </aside>
        )}

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto bg-white">{children}</main>
      </div>
    </div>
  );
}
