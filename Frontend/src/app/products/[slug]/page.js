'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { shopAPI } from '@/lib/api';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ArrowLeft, ShoppingCart, Star, Minus, Plus } from 'lucide-react';

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
      setProduct(response.data);
      setSelectedImage(response.data.main_image);
    } catch (error) {
      console.error('Error fetching product:', error);
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Back Button */}
        <Link 
          href="/products"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </Link>

        {/* Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Product Images */}
          <div>
            <div className="card p-4 mb-4">
              <img
                src={selectedImage || 'https://via.placeholder.com/600'}
                alt={product.name}
                className="w-full h-96 object-cover rounded-lg"
              />
            </div>
            
            {/* Image Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`shrink-0 w-20 h-20 border-2 rounded-lg overflow-hidden ${
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
          <div className="card p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {product.name}
            </h1>

            {/* Rating */}
            {averageRating > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(averageRating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  {averageRating.toFixed(1)} ({product.reviews?.length || 0} reviews)
                </span>
              </div>
            )}

            {/* Price */}
            <div className="mb-6">
              <p className="text-4xl font-bold text-blue-600 mb-2">
                ₦{parseFloat(product.price).toLocaleString()}
              </p>
              {product.weight && (
                <p className="text-sm text-gray-600">
                  {product.weight} {product.unit && `per ${product.unit}`}
                </p>
              )}
            </div>

            {/* Stock Status */}
            <div className="mb-6">
              {product.is_in_stock ? (
                <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  ✓ In Stock ({product.stock_quantity} available)
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                  Out of Stock
                </span>
              )}
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600 leading-relaxed">{product.description}</p>
            </div>

            {/* Seller Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Seller</h3>
              <p className="text-gray-700">{product.seller?.get_full_name || product.seller_name}</p>
            </div>

            {/* Quantity Selector */}
            {product.is_in_stock && isBuyer && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={decrementQuantity}
                      className="p-2 hover:bg-gray-100"
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <span className="px-6 py-2 font-semibold">{quantity}</span>
                    <button
                      onClick={incrementQuantity}
                      className="p-2 hover:bg-gray-100"
                      disabled={quantity >= product.stock_quantity}
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <span className="text-sm text-gray-600">
                    Total: ₦{(parseFloat(product.price) * quantity).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Add to Cart Button */}
            {product.is_in_stock ? (
              <Button
                onClick={handleAddToCart}
                variant="primary"
                loading={addingToCart}
                className="w-full py-3 text-lg"
              >
                <ShoppingCart className="w-5 h-5 inline mr-2" />
                Add to Cart
              </Button>
            ) : (
              <button disabled className="w-full py-3 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed">
                Out of Stock
              </button>
            )}

            {!isAuthenticated && (
              <p className="text-center text-sm text-gray-600 mt-4">
                <Link href="/login" className="text-blue-600 hover:text-blue-700">
                  Login
                </Link>{' '}
                to add items to cart
              </p>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        {product.reviews && product.reviews.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>
            <div className="space-y-4">
              {product.reviews.map((review) => (
                <div key={review.id} className="card p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{review.buyer_name}</p>
                      <div className="flex items-center mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}