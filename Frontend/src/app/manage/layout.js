'use client';

/**
 * Admin Layout with Sidebar Navigation (Mobile Fixed)
 * Save as: frontend/src/app/manage/layout.js (REPLACE)
 */

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, Users, Package, ShoppingBag, 
  FolderTree, CreditCard, Settings, Shield, ExternalLink,
  Menu, X, Home
} from 'lucide-react';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleDjangoAdminClick = () => {
    const djangoAdminUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '/admin/') || 'http://127.0.0.1:8000/admin/';
    window.open(djangoAdminUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-50">
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

          {/* Django Admin Button */}
          <div className="p-4 border-t">
            <button
              onClick={handleDjangoAdminClick}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-md hover:shadow-lg"
            >
              <Shield className="w-4 h-4" />
              <span>Django Admin</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

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

      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm">
        <button
          type="button"
          className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </button>
        
        <div className="flex flex-1 items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <Home className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-gray-900/80"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-white">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <Settings className="w-6 h-6 text-blue-600" />
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Admin Panel</h2>
                    <p className="text-xs text-gray-600">FoodFlex Management</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Admin Info */}
              <div className="p-4 border-b">
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
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center px-3 py-3 text-sm font-medium rounded-lg transition ${
                        active
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className={`mr-3 h-5 w-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className={`text-xs ${active ? 'text-blue-500' : 'text-gray-500'}`}>
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </nav>

              {/* Django Admin Button */}
              <div className="p-4 border-t">
                <button
                  onClick={() => {
                    handleDjangoAdminClick();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-md"
                >
                  <Shield className="w-4 h-4" />
                  <span>Django Admin</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {/* Back to Site */}
              <div className="p-4 border-t">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  ← Back to FoodFlex
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="lg:pl-64">
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}