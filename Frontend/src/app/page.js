'use client';

/**
 * Optimized Homepage - Final Version
 * Using the new ProductCard component for better design
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { shopAPI } from '@/lib/api';
import ProductCard from '@/components/common/ProductCard';
import { ShoppingBag, Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, isAuthenticated, isSeller } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    currentPage: 1,
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes] = await Promise.all([
        shopAPI.getProducts({ ordering: '-created_at', page: 1, page_size: 30 }),
        shopAPI.getCategories(),
      ]);
      
      setProducts(productsRes.data.results);
      setPagination({
        count: productsRes.data.count,
        next: productsRes.data.next,
        previous: productsRes.data.previous,
        currentPage: 1,
      });
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreProducts = async () => {
    if (!pagination.next || loadingMore) return;

    try {
      setLoadingMore(true);
      const nextPage = pagination.currentPage + 1;
      
      const response = await shopAPI.getProducts({ 
        ordering: '-created_at', 
        page: nextPage, 
        page_size: 30 
      });
      
      setProducts(prev => [...prev, ...response.data.results]);
      setPagination({
        count: response.data.count,
        next: response.data.next,
        previous: response.data.previous,
        currentPage: nextPage,
      });
    } catch (error) {
      console.error('Error loading more products:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      {!isAuthenticated && (
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-16 md:py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">Welcome to FoodFlex</h1>
            <p className="text-lg md:text-xl mb-8">Get ₦50,000 instant credit. Shop now, pay later!</p>
            <Link 
              href="/register" 
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 inline-block transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}

      {/* Welcome Message */}
      {isAuthenticated && user && (
        <div className="bg-blue-50 border-b border-blue-100 py-6">
          <div className="container mx-auto px-4">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              Welcome back, {user.first_name}!
            </h2>
            <p className="text-gray-600 mt-1">
              {isSeller ? 'Manage your products and orders' : 'Browse our products and start shopping'}
            </p>
          </div>
        </div>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <div className="bg-white py-4 border-b sticky top-0 z-10 shadow-sm">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                Categories:
              </span>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/products?category=${category.slug}`}
                  className="px-4 py-2 bg-gray-100 hover:bg-blue-600 hover:text-white rounded-full text-sm whitespace-nowrap transition"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Products Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Browse Products</h2>
            <p className="text-gray-600 mt-1 text-sm md:text-base">
              {pagination.count > 0 && `${products.length} of ${pagination.count} products`}
            </p>
          </div>
          <Link 
            href="/products" 
            className="text-blue-600 hover:text-blue-700 font-medium text-sm md:text-base"
          >
            View All →
          </Link>
        </div>

        {loading ? (
          // Loading skeleton with proper square images
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-3 animate-pulse">
                <div className="bg-gray-200 rounded mb-3" style={{ paddingTop: '100%' }}></div>
                <div className="bg-gray-200 h-4 rounded mb-2"></div>
                <div className="bg-gray-200 h-4 rounded w-2/3 mb-2"></div>
                <div className="bg-gray-200 h-8 rounded"></div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            {/* Products Grid - 5 columns like Jumia */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Load More Button */}
            {pagination.next && (
              <div className="mt-8 text-center">
                <button
                  onClick={loadMoreProducts}
                  disabled={loadingMore}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Load More
                      <span className="text-sm opacity-80">
                        ({products.length} of {pagination.count})
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* End of Results */}
            {!pagination.next && products.length > 0 && (
              <div className="mt-8 text-center">
                <p className="text-gray-500">
                  You've viewed all {products.length} products
                </p>
                <Link 
                  href="/products" 
                  className="text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block"
                >
                  Browse with filters →
                </Link>
              </div>
            )}
          </>
        ) : (
          // Empty state
          <div className="text-center py-20">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No products available yet</p>
          </div>
        )}
      </div>
    </div>
  );
}