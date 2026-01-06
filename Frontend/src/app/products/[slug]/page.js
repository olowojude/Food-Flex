'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { shopAPI } from '@/lib/api';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { 
  ArrowLeft, ShoppingCart, Star, Minus, Plus, 
  Store, MapPin, ShoppingBag, Phone
} from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isBuyer } = useAuth();
  const { addToCart } = useCart();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedImage, setSelectedImage] = useState('');

  useEffect(() => {
    if (params.slug) {
      fetchProduct();
    }
  }, [params.slug]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await shopAPI.getProduct(params.slug);
      const productData = response.data;
      setProduct(productData);
      setSelectedImage(productData.main_image);
    } catch (error) {
      setMessage({ type: 'error', text: 'Product not found' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!isBuyer) {
      setMessage({ type: 'error', text: 'Only buyers can add to cart' });
      return;
    }

    setAddingToCart(true);
    const result = await addToCart(product.id, quantity);
    setAddingToCart(false);

    if (result.success) {
      setMessage({ type: 'success', text: 'Added to cart successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } else {
      setMessage({ type: 'error', text: result.error });
    }
  };

  const incrementQuantity = () => {
    if (quantity < product.stock_quantity) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h2>
          <Link href="/products" className="text-blue-600 hover:text-blue-700">
            ← Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const allImages = [product.main_image, ...(product.additional_images || [])];
  const averageRating = product.average_rating || 0;
  const reviewCount = product.reviews?.length || 0;
  const salesCount = product.sales_count || 0;
  
  // Extract seller info with primary location
  const sellerInfo = product.seller_info || {};
  const primaryLocation = sellerInfo.primary_location;
  const otherLocations = sellerInfo.other_locations || [];
  
  // Use primary location data if available
  const storeName = primaryLocation?.store_name || sellerInfo.store_name || 'Store';
  const storePhone = primaryLocation?.phone_number || sellerInfo.phone || '';
  const storeAddress = primaryLocation?.address || sellerInfo.business_address || '';
  const storeCity = primaryLocation?.city || sellerInfo.city || '';
  const storeState = primaryLocation?.state || sellerInfo.state || '';

  return (
    <div className="min-h-screen bg-gray-50 py-4">
      <div className="container mx-auto px-4 max-w-7xl">
        <Link 
          href="/products"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        {message.text && (
          <div className={`mb-3 p-3 rounded text-sm ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Product Images */}
          <div>
            <div className="bg-white rounded-lg p-3 mb-3 border border-gray-200 max-w-md mx-auto">
              <img
                src={selectedImage || 'https://via.placeholder.com/600x800'}
                alt={product.name}
                className="w-full rounded object-cover"
                style={{ aspectRatio: '3/4' }}
              />
            </div>
            
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto justify-center">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`shrink-0 w-16 h-16 border-2 rounded overflow-hidden ${
                      selectedImage === img ? 'border-blue-600' : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={img || 'https://via.placeholder.com/100'}
                      alt={`${product.name} ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {product.name}
              </h1>

              {averageRating > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(averageRating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-gray-600">
                    {averageRating.toFixed(1)} ({reviewCount})
                  </span>
                </div>
              )}

              <div className="mt-3">
                <p className="text-3xl font-bold text-blue-600">
                  ₦{parseFloat(product.price).toLocaleString()}
                </p>
                {product.weight && (
                  <p className="text-xs text-gray-500 mt-1">
                    {product.weight} {product.unit && `per ${product.unit}`}
                  </p>
                )}
              </div>

              <div className="mt-3">
                {product.is_in_stock ? (
                  <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                    ✓ In Stock ({product.stock_quantity})
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                    Out of Stock
                  </span>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Seller Information</h3>
              
              {/* Seller Name */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 text-sm">
                    {sellerInfo.first_name || 'Seller'}'s Store
                  </h4>
                  <p className="text-xs text-gray-500">Verified Seller</p>
                </div>
              </div>

              {/* Primary Location Information */}
              {primaryLocation && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 mb-1">Primary Pickup Location</p>
                      
                      {/* Store Name */}
                      <p className="text-sm font-semibold text-gray-900 mb-1">
                        {storeName}
                      </p>
                      
                      {/* City, State */}
                      <p className="text-sm text-gray-700 mb-1">
                        {storeCity}, {storeState}
                      </p>
                      
                      {/* Address */}
                      {storeAddress && (
                        <p className="text-xs text-gray-600 mb-2">
                          {storeAddress}
                        </p>
                      )}
                      
                      {/* Phone */}
                      {storePhone && (
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <p className="text-sm text-gray-700">{storePhone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sales Stats */}
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ShoppingBag className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-gray-600">Items Sold</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{salesCount}</p>
              </div>
            </div>

            {/* Add to Cart */}
            {product.is_in_stock && (
              <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-gray-300 rounded">
                      <button
                        onClick={decrementQuantity}
                        className="p-2 hover:bg-gray-100 disabled:opacity-50"
                        disabled={quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-4 py-2 font-semibold text-sm">{quantity}</span>
                      <button
                        onClick={incrementQuantity}
                        className="p-2 hover:bg-gray-100 disabled:opacity-50"
                        disabled={quantity >= product.stock_quantity}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-sm text-gray-600">
                      = ₦{(parseFloat(product.price) * quantity).toLocaleString()}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleAddToCart}
                  variant="primary"
                  loading={addingToCart}
                  className="w-full"
                >
                  <ShoppingCart className="w-4 h-4 inline mr-2" />
                  Add to Cart
                </Button>

                {!isAuthenticated && (
                  <p className="text-center text-xs text-gray-600">
                    <Link href="/login" className="text-blue-600 hover:text-blue-700">
                      Login
                    </Link>{' '}
                    to purchase
                  </p>
                )}
              </div>
            )}

            {!product.is_in_stock && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <button disabled className="w-full py-2 bg-gray-300 text-gray-500 rounded cursor-not-allowed text-sm">
                  Out of Stock
                </button>
              </div>
            )}

            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2 text-sm">Description</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
            </div>
          </div>
        </div>

        {/* OTHER PICKUP LOCATIONS */}
        {otherLocations.length > 0 && (
          <div className="mt-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Other Pickup Locations
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                This seller has additional locations where you can pick up your order:
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                {otherLocations.map((location) => (
                  <div 
                    key={location.id} 
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                        <Store className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1">
                          {location.store_name}
                        </h3>
                        <div className="space-y-1 text-xs text-gray-600">
                          <p className="flex items-start gap-1">
                            <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                            <span>{location.city}, {location.state}</span>
                          </p>
                          {location.address && (
                            <p className="ml-4">{location.address}</p>
                          )}
                          {location.phone_number && (
                            <p className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span>{location.phone_number}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-gray-500 mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                💡 <strong>Tip:</strong> You can discuss your preferred pickup location with the seller after placing your order.
              </p>
            </div>
          </div>
        )}

        {/* Reviews */}
        {product.reviews && product.reviews.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Customer Reviews</h2>
            <div className="space-y-3">
              {product.reviews.map((review) => (
                <div key={review.id} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{review.buyer_name}</p>
                      <div className="flex items-center mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < review.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}