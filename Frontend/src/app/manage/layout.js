'use client';

/**
 * Admin Layout with Sidebar Navigation
 * Save as: frontend/src/app/manage/layout.js
 */

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, Users, UserCheck, Package,
  ShoppingBag, FolderTree, CreditCard, Settings
} from 'lucide-react';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const navigation = [
    {
      name: 'Overview',
      href: '/manage',
      icon: LayoutDashboard,
      description: 'Dashboard stats'
    },
    {
      name: 'People',
      href: '/manage/people',
      icon: Users,
      description: 'All users'
    },
    {
      name: 'Applications',
      href: '/manage/applications',
      icon: UserCheck,
      description: 'Seller applications'
    },
    {
      name: 'Products',
      href: '/manage/products',
      icon: Package,
      description: 'All products'
    },
    {
      name: 'Orders',
      href: '/manage/orders',
      icon: ShoppingBag,
      description: 'All orders'
    },
    {
      name: 'Categories',
      href: '/manage/categories',
      icon: FolderTree,
      description: 'Product categories'
    },
    {
      name: 'Credits',
      href: '/manage/credits',
      icon: CreditCard,
      description: 'Credit management'
    },
  ];

  const isActive = (href) => {
    if (href === '/manage') {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col grow pt-5 bg-white border-r border-gray-200 overflow-y-auto">
          {/* Logo/Title */}
          <div className="flex items-center shrink-0 px-4 mb-6">
            <Settings className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-xs text-gray-600">FoodFlex Management</p>
            </div>
          </div>

          {/* Admin Info */}
          <div className="px-4 mb-6 pb-6 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-blue-600">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-600 truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition ${
                    active
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon
                    className={`mr-3 shrink-0 h-5 w-5 ${
                      active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className={`text-xs ${
                      active ? 'text-blue-500' : 'text-gray-500'
                    }`}>
                      {item.description}
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Back to Site */}
          <div className="p-4 border-t">
            <Link
              href="/"
              className="flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              ← Back to FoodFlex
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-10 shrink-0 flex h-16 bg-white border-b border-gray-200">
          <div className="flex-1 px-4 flex justify-between items-center">
            <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
            <Link href="/" className="text-sm text-blue-600">
              Back to Site
            </Link>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-b bg-white overflow-x-auto">
          <nav className="flex gap-2 px-4 py-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition ${
                    active
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Page Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}