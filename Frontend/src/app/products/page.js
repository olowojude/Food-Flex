'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { shopAPI, searchAPI, getUserLocation } from '@/lib/api';
import ProductCard from '@/components/common/ProductCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Search, Filter, X, ChevronLeft, ChevronRight, MapPin, Navigation } from 'lucide-react';

function ProductsContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationMode, setLocationMode] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [radiusUsed, setRadiusUsed] = useState(null);
  
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    currentPage: 1,
    totalPages: 1,
  });

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    in_stock: searchParams.get('in_stock') === 'true',
    ordering: searchParams.get('ordering') || '-created_at',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!locationMode) {
      fetchProducts(1);
    }
  }, [filters, locationMode]);

  const fetchCategories = async () => {
    try {
      const response = await shopAPI.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchProducts = async (page = 1) => {
    try {
      setLoading(true);
      
      const params = {
        page,
        page_size: 30,
        ...filters,
      };

      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === false) {
          delete params[key];
        }
      });

      const response = await shopAPI.getProducts(params);
      
      setProducts(response.data.results);
      
      const totalPages = Math.ceil(response.data.count / 30);
      setPagination({
        count: response.data.count,
        next: response.data.next,
        previous: response.data.previous,
        currentPage: page,
        totalPages,
      });
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle "Products Near Me" GPS search (SIMPLIFIED)
  const handleNearMe = async () => {
    setGettingLocation(true);
    
    try {
      const location = await getUserLocation();
      setUserLocation(location);
      
      const response = await searchAPI.getProductsNearMe(
        location.lat,
        location.lng,
        { radius: 10 }
      );
      
      setProducts(response.data.products);
      setRadiusUsed(response.data.metadata.radius_used);
      setLocationMode(true);
      
      // Simple alert instead of toast
      alert(`✅ Found ${response.data.metadata.total_products} products within ${response.data.metadata.radius_used}km`);
    } catch (error) {
      console.error('Location error:', error);
      alert(error.message || 'Could not get location. Please enable location access.');
    } finally {
      setGettingLocation(false);
    }
  };

  // Reset to normal browsing
  const handleResetLocation = () => {
    setLocationMode(false);
    setUserLocation(null);
    setRadiusUsed(null);
    setPagination({ 
      count: 0,
      next: null,
      previous: null,
      currentPage: 1, 
      totalPages: 1 
    });
    fetchProducts(1);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      min_price: '',
      max_price: '',
      in_stock: false,
      ordering: '-created_at',
    });
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchProducts(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header with Location Button */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                {locationMode ? (
                  <span className="flex items-center gap-2">
                    <MapPin className="w-8 h-8 text-blue-600" />
                    Products Near You
                  </span>
                ) : (
                  'All Products'
                )}
              </h1>
              <p className="text-gray-600">
                {locationMode && radiusUsed ? (
                  `Showing products within ${radiusUsed}km of your location`
                ) : pagination.count > 0 ? (
                  `${pagination.count} products found`
                ) : (
                  'Browse our collection'
                )}
              </p>
            </div>
            
            {/* Location Buttons */}
            <div className="flex gap-2">
              {!locationMode ? (
                <button
                  onClick={handleNearMe}
                  disabled={gettingLocation}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
                >
                  {gettingLocation ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Getting Location...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-5 h-5" />
                      Products Near Me
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleResetLocation}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium shadow-sm"
                >
                  <X className="w-5 h-5" />
                  Browse All Products
                </button>
              )}
            </div>
          </div>

          {/* Location Info Banner */}
          {locationMode && userLocation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Location-Based Search Active
                  </p>
                  <p className="text-xs text-blue-700">
                    Search radius: {radiusUsed}km • Showing nearest products first
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>

            <select
              value={filters.ordering}
              onChange={(e) => handleFilterChange('ordering', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="-created_at">Newest First</option>
              <option value="created_at">Oldest First</option>
              <option value="price">Price: Low to High</option>
              <option value="-price">Price: High to Low</option>
              <option value="name">Name: A to Z</option>
              <option value="-name">Name: Z to A</option>
              {locationMode && <option value="distance">Distance: Nearest First</option>}
            </select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Filters */}
          <aside className={`
            ${showFilters ? 'block' : 'hidden'} md:block
            w-full md:w-64 shrink-0
          `}>
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Filters</h3>
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.min_price}
                      onChange={(e) => handleFilterChange('min_price', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.max_price}
                      onChange={(e) => handleFilterChange('max_price', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.in_stock}
                    onChange={(e) => handleFilterChange('in_stock', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">In Stock Only</span>
                </label>
              </div>

              <button
                onClick={() => setShowFilters(false)}
                className="md:hidden w-full bg-blue-600 text-white py-2 rounded-lg mt-4 hover:bg-blue-700 transition"
              >
                Apply Filters
              </button>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg border border-gray-200 p-3 animate-pulse">
                    <div className="bg-gray-200 rounded mb-3" style={{ paddingTop: '100%' }}></div>
                    <div className="bg-gray-200 h-4 rounded mb-2"></div>
                    <div className="bg-gray-200 h-4 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {products.map((product) => (
                    <div key={product.id} className="relative">
                      <ProductCard product={product} />
                      
                      {/* Distance Badge (Location Mode) */}
                      {locationMode && product.distance_km !== undefined && (
                        <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-medium px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {product.distance_km}km away
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination (only in normal mode) */}
                {!locationMode && pagination.totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <button
                      onClick={() => goToPage(pagination.currentPage - 1)}
                      disabled={!pagination.previous}
                      className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex gap-1">
                      {[...Array(pagination.totalPages)].map((_, index) => {
                        const page = index + 1;
                        if (
                          page === 1 ||
                          page === pagination.totalPages ||
                          Math.abs(page - pagination.currentPage) <= 1
                        ) {
                          return (
                            <button
                              key={page}
                              onClick={() => goToPage(page)}
                              className={`px-4 py-2 rounded-lg font-medium ${
                                page === pagination.currentPage 
                                  ? 'bg-blue-600 text-white' 
                                  : 'border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        } else if (
                          page === pagination.currentPage - 2 ||
                          page === pagination.currentPage + 2
                        ) {
                          return <span key={page} className="px-2">...</span>;
                        }
                        return null;
                      })}
                    </div>

                    <button
                      onClick={() => goToPage(pagination.currentPage + 1)}
                      disabled={!pagination.next}
                      className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {!locationMode && pagination.totalPages > 0 && (
                  <p className="text-center text-gray-600 text-sm mt-4">
                    Page {pagination.currentPage} of {pagination.totalPages} 
                    ({pagination.count} total products)
                  </p>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <X className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-2">
                  {locationMode 
                    ? 'No products found nearby' 
                    : 'No products found'}
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  {locationMode 
                    ? 'Try browsing all products' 
                    : 'Try adjusting your filters'}
                </p>
                <button
                  onClick={locationMode ? handleResetLocation : clearFilters}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  {locationMode ? 'Browse All Products' : 'Clear filters and try again'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}