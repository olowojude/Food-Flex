'use client';

// frontend/src/components/common/Navbar.jsx
 

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import SearchBar from '@/components/common/SearchBar';
import { 
  ShoppingCart, User, LogOut, Menu, X, 
  Package, Home, ShoppingBag, Store, Settings
} from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, isSeller, isBuyer, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-blue-600 shrink-0">
            FoodFlex
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden md:block flex-1 max-w-xl">
            <SearchBar />
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-4 shrink-0">
            <Link 
              href="/" 
              className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition px-3 py-2 rounded-lg hover:bg-gray-50"
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Home</span>
            </Link>
            
            <Link 
              href="/products" 
              className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition px-3 py-2 rounded-lg hover:bg-gray-50"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="font-medium">Products</span>
            </Link>

            {isAuthenticated ? (
              <>
                {/* Buyer Cart */}
                {isBuyer && (
                  <Link 
                    href="/cart" 
                    className="relative flex items-center gap-2 text-gray-700 hover:text-blue-600 transition px-3 py-2 rounded-lg hover:bg-gray-50"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span className="font-medium">Cart</span>
                    {itemCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                        {itemCount}
                      </span>
                    )}
                  </Link>
                )}

                {/* Seller Links */}
                {isSeller && (
                  <>
                    <Link 
                      href="/inventory" 
                      className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition px-3 py-2 rounded-lg hover:bg-gray-50"
                    >
                      <Package className="w-5 h-5" />
                      <span className="font-medium">Inventory</span>
                    </Link>
                    <Link 
                      href="/sales" 
                      className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition px-3 py-2 rounded-lg hover:bg-gray-50"
                    >
                      <Store className="w-5 h-5" />
                      <span className="font-medium">Sales</span>
                    </Link>
                  </>
                )}

                {/* Admin Link */}
                {isAdmin && (
                  <Link 
                    href="/manage" 
                    className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition px-3 py-2 rounded-lg hover:bg-gray-50"
                  >
                    <Settings className="w-5 h-5" />
                    <span className="font-medium">Dashboard</span>
                  </Link>
                )}

                {/* Profile */}
                <Link 
                  href="/profile" 
                  className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition px-3 py-2 rounded-lg hover:bg-gray-50"
                >
                  <User className="w-5 h-5" />
                  <span className="font-medium">Profile</span>
                </Link>

                {/* Logout */}
                <button
                  onClick={logout}
                  className="flex items-center gap-2 text-gray-700 hover:text-red-600 transition px-3 py-2 rounded-lg hover:bg-red-50"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium transition"
                >
                  Login
                </Link>
                <Link 
                  href="/register" 
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Search Bar - Mobile */}
        <div className="md:hidden pb-3">
          <SearchBar onClose={() => setMobileMenuOpen(false)} />
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col gap-2">
              <Link 
                href="/" 
                className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Home className="w-5 h-5" />
                <span>Home</span>
              </Link>
              
              <Link 
                href="/products" 
                className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                <ShoppingBag className="w-5 h-5" />
                <span>Products</span>
              </Link>

              {isAuthenticated ? (
                <>
                  {isBuyer && (
                    <Link 
                      href="/cart" 
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <ShoppingCart className="w-5 h-5" />
                      <span>Cart ({itemCount})</span>
                    </Link>
                  )}
                  
                  {isSeller && (
                    <>
                      <Link 
                        href="/inventory" 
                        className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Package className="w-5 h-5" />
                        <span>Inventory</span>
                      </Link>
                      <Link 
                        href="/sales" 
                        className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Store className="w-5 h-5" />
                        <span>Sales</span>
                      </Link>
                    </>
                  )}
                  
                  {isAdmin && (
                    <Link 
                      href="/manage" 
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Settings className="w-5 h-5" />
                      <span>Dashboard</span>
                    </Link>
                  )}
                  
                  <Link 
                    href="/profile" 
                    className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="w-5 h-5" />
                    <span>Profile</span>
                  </Link>
                  
                  <button 
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    href="/login" 
                    className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link 
                    href="/register" 
                    className="flex items-center gap-3 px-4 py-2 bg-blue-600 text-white rounded-lg mx-4 justify-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}