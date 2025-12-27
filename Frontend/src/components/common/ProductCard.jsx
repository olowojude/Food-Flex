'use client';

/**
 * Optimized Product Card Component
 * Views count only visible to the seller who owns the product
 */

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ShoppingCart } from 'lucide-react';

export default function ProductCard({ product, showSellerStats = false }) {
  const { user } = useAuth();
  
  // Check if current user is the seller of this product
  const isProductOwner = user && product.seller === user.id;
  
  // Show stats if explicitly requested (inventory page) OR if user is the product owner
  const shouldShowStats = showSellerStats || isProductOwner;

  return (
    <Link 
      href={`/products/${product.slug}`}
      className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300 group"
    >
      {/* Image Container - Square aspect ratio */}
      <div className="relative w-full overflow-hidden bg-gray-50" style={{ paddingTop: '100%' }}>
        <img
          src={product.main_image || 'https://via.placeholder.com/400x400'}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        
        {/* Stock Badge */}
        {!product.is_in_stock && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-medium px-2 py-1 rounded">
            Out of Stock
          </div>
        )}
        
        {/* Featured Badge */}
        {product.is_featured && (
          <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs font-medium px-2 py-1 rounded">
            Featured
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-3">
        {/* Product Name - 2 lines max */}
        <h3 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Category */}
        {product.category_name && (
          <p className="text-xs text-gray-500 mb-2">
            {product.category_name}
          </p>
        )}

        {/* Price */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-bold text-blue-600">
            ₦{parseFloat(product.price).toLocaleString()}
          </span>
        </div>

        {/* Stats - Only visible to seller */}
        {shouldShowStats && (
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
            {product.views_count > 0 && (
              <span className="flex items-center gap-1">
                👁️ {product.views_count} views
              </span>
            )}
            {product.sales_count > 0 && (
              <span className="flex items-center gap-1">
                📦 {product.sales_count} sold
              </span>
            )}
          </div>
        )}

        {/* Action Button */}
        <button 
          className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          onClick={(e) => {
            e.preventDefault();
            window.location.href = `/products/${product.slug}`;
          }}
        >
          <ShoppingCart className="w-4 h-4" />
          View Details
        </button>
      </div>
    </Link>
  );
}