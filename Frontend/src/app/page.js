'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { shopAPI } from '@/lib/api';
import { ShoppingCart, User, LogOut, CreditCard, Search, Menu, X } from 'lucide-react';

export default function HomePage() {
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        shopAPI.getProducts({ ordering: '-created_at' }),
        shopAPI.getCategories(),
      ]);
      setProducts(productsRes.data.results || productsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="text-2xl font-bold text-blue-600">
              FoodFlex
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-gray-700 hover:text-blue-600">
                Home
              </Link>
              <Link href="/products" className="text-gray-700 hover:text-blue-600">
                Products
              </Link>

              {isAuthenticated ? (
                <>
                  {user?.role === 'BUYER' && (
                    <>
                      <Link href="/cart" className="relative">
                        <ShoppingCart className="w-6 h-6 text-gray-700 hover:text-blue-600" />
                        {itemCount > 0 && (
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                            {itemCount}
                          </span>
                        )}
                      </Link>
                      <Link href="/orders" className="text-gray-700 hover:text-blue-600">
                        Orders
                      </Link>
                      <Link href="/profile" className="flex items-center gap-1 text-gray-700 hover:text-blue-600">
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                    </>
                  )}

                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                      Hi, {user?.first_name}
                    </span>
                    <button
                      onClick={logout}
                      className="text-gray-700 hover:text-red-600"
                      title="Logout"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-gray-700 hover:text-blue-600">
                    Login
                  </Link>
                  <Link href="/register" className="btn-primary">
                    Sign Up
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <div className="flex flex-col gap-4">
                <Link href="/" className="text-gray-700">
                  Home
                </Link>
                <Link href="/products" className="text-gray-700">
                  Products
                </Link>
                {isAuthenticated ? (
                  <>
                    {user?.role === 'BUYER' && (
                      <>
                        <Link href="/cart" className="text-gray-700">
                          Cart ({itemCount})
                        </Link>
                        <Link href="/orders" className="text-gray-700">
                          Orders
                        </Link>
                        <Link href="/profile" className="text-gray-700">
                          Profile
                        </Link>
                      </>
                    )}
                    <button onClick={logout} className="text-left text-red-600">
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="text-gray-700">
                      Login
                    </Link>
                    <Link href="/register" className="btn-primary">
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section (Only show if NOT authenticated) */}
      {!isAuthenticated && (
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-5xl font-bold mb-4">Welcome to FoodFlex</h1>
            <p className="text-xl mb-8">Get ₦50,000 instant credit. Shop now, pay later!</p>
            <Link href="/register" className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100">
              Get Started
            </Link>
          </div>
        </div>
      )}

      {/* Welcome Message (Only show if authenticated) */}
      {isAuthenticated && user && (
        <div className="bg-blue-50 border-b border-blue-100 py-6">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome back, {user.first_name}! 👋
            </h2>
            <p className="text-gray-600 mt-1">Browse our products and start shopping</p>
          </div>
        </div>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <div className="bg-white py-6 border-b">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-4 overflow-x-auto pb-2">
              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                Categories:
              </span>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/products?category=${category.slug}`}
                  className="px-4 py-2 bg-gray-100 hover:bg-blue-100 rounded-full text-sm whitespace-nowrap"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Featured Products</h2>
          <Link href="/products" className="text-blue-600 hover:text-blue-700">
            View All →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="bg-gray-200 h-48 rounded mb-4"></div>
                <div className="bg-gray-200 h-4 rounded mb-2"></div>
                <div className="bg-gray-200 h-4 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.slice(0, 8).map((product) => (
              <div key={product.id} className="card p-4 hover:shadow-lg transition">
                <img
                  src={product.main_image || 'https://via.placeholder.com/300'}
                  alt={product.name}
                  className="w-full h-48 object-cover rounded mb-4"
                />
                <h3 className="font-semibold text-gray-900 mb-2">{product.name}</h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {product.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-blue-600">
                    ₦{product.price}
                  </span>
                  {product.is_in_stock ? (
                    <span className="text-xs text-green-600 font-medium">In Stock</span>
                  ) : (
                    <span className="text-xs text-red-600 font-medium">Out of Stock</span>
                  )}
                </div>
                <Link
                  href={`/products/${product.slug}`}
                  className="btn-primary w-full mt-4 text-center"
                >
                  View Details
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No products available yet</p>
          </div>
        )}
      </div>
    </div>
  );
}