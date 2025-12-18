'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft } from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated, isBuyer } = useAuth();
  const { cart, loading, updateCartItem, removeFromCart, clearCart } = useCart();
  const [updatingItems, setUpdatingItems] = useState({});

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (!isBuyer) {
      router.push('/');
    }
  }, [isAuthenticated, isBuyer]);

  const handleUpdateQuantity = async (itemId, currentQuantity, change) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity < 1) return;

    setUpdatingItems(prev => ({ ...prev, [itemId]: true }));
    await updateCartItem(itemId, newQuantity);
    setUpdatingItems(prev => ({ ...prev, [itemId]: false }));
  };

  const handleRemoveItem = async (itemId) => {
    if (confirm('Remove this item from cart?')) {
      await removeFromCart(itemId);
    }
  };

  const handleClearCart = async () => {
    if (confirm('Are you sure you want to clear your entire cart?')) {
      await clearCart();
    }
  };

  if (!isAuthenticated || !isBuyer) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  const cartItems = cart?.items || [];
  const isEmpty = cartItems.length === 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Shopping Cart</h1>
            <p className="text-gray-600">
              {isEmpty ? 'Your cart is empty' : `${cart.total_items} item(s) in cart`}
            </p>
          </div>
          <Link
            href="/products"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Continue Shopping
          </Link>
        </div>

        {isEmpty ? (
          /* Empty Cart */
          <div className="card p-12 text-center">
            <ShoppingBag className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add some products to get started!</p>
            <Link href="/products" className="btn-primary inline-block">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* Clear Cart Button */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleClearCart}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Clear Cart
                </button>
              </div>

              {cartItems.map((item) => (
                <div key={item.id} className="card p-4">
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <Link href={`/products/${item.product.slug}`}>
                      <img
                        src={item.product.main_image || 'https://via.placeholder.com/150'}
                        alt={item.product.name}
                        className="w-24 h-24 object-cover rounded"
                      />
                    </Link>

                    {/* Product Info */}
                    <div className="flex-1">
                      <Link
                        href={`/products/${item.product.slug}`}
                        className="font-semibold text-gray-900 hover:text-blue-600 mb-1 block"
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-sm text-gray-600 mb-2">
                        ₦{parseFloat(item.product.price).toLocaleString()} each
                      </p>

                      {/* Stock Status */}
                      {item.product.stock_quantity < item.quantity && (
                        <p className="text-xs text-red-600 mb-2">
                          Only {item.product.stock_quantity} available in stock
                        </p>
                      )}

                      <div className="flex items-center gap-4 flex-wrap">
                        {/* Quantity Controls */}
                        <div className="flex items-center border border-gray-300 rounded-lg">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                            disabled={updatingItems[item.id] || item.quantity <= 1}
                            className="p-2 hover:bg-gray-100 disabled:opacity-50"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-4 py-2 font-semibold min-w-[3rem] text-center">
                            {updatingItems[item.id] ? '...' : item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                            disabled={
                              updatingItems[item.id] ||
                              item.quantity >= item.product.stock_quantity
                            }
                            className="p-2 hover:bg-gray-100 disabled:opacity-50"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Subtotal */}
                        <div className="flex-1 text-right lg:text-left">
                          <p className="text-sm text-gray-600">Subtotal</p>
                          <p className="font-bold text-gray-900">
                            ₦{parseFloat(item.total_price).toLocaleString()}
                          </p>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-600 hover:text-red-700 p-2"
                          title="Remove item"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="card p-6 sticky top-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>₦{parseFloat(cart.subtotal || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Items</span>
                    <span>{cart.total_items}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-bold text-gray-900">
                      <span>Total</span>
                      <span>₦{parseFloat(cart.subtotal || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <Link href="/checkout" className="btn-primary w-full text-center block mb-3">
                  Proceed to Checkout
                </Link>

                <Link
                  href="/products"
                  className="btn-secondary w-full text-center block"
                >
                  Continue Shopping
                </Link>

                {/* Credit Info */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900 font-medium mb-1">
                    💳 Pay with Credit
                  </p>
                  <p className="text-xs text-blue-700">
                    This purchase will be deducted from your available credit
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}