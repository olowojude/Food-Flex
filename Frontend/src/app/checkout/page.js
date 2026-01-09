'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { orderAPI, creditAPI } from '@/lib/api';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Toast from '@/components/common/Toast';
import { CreditCard, ShoppingBag, AlertCircle, CheckCircle, Store } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, isBuyer } = useAuth();
  const { cart, loading: cartLoading, fetchCart } = useCart();
  const [creditAccount, setCreditAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isLoading && !isBuyer) {
      router.push('/');
    } else if (isAuthenticated && isBuyer) {
      fetchCheckoutData();
    }
  }, [isAuthenticated, isLoading, isBuyer, router]);

  const fetchCheckoutData = async () => {
    try {
      setLoading(true);
      const creditRes = await creditAPI.getMyCreditAccount();
      setCreditAccount(creditRes.data);
    } catch (error) {
      setError('Failed to load checkout data');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  //   Group cart items by seller
  const groupCartItemsBySeller = (cartItems) => {
    const grouped = {};
    
    cartItems.forEach(item => {
      const sellerId = item.product.seller || 'unknown';
      const sellerName = item.product.seller_store_name || 'Unknown Seller';
      
      if (!grouped[sellerId]) {
        grouped[sellerId] = {
          seller: {
            id: sellerId,
            name: sellerName
          },
          items: [],
          subtotal: 0
        };
      }
      
      grouped[sellerId].items.push(item);
      grouped[sellerId].subtotal += parseFloat(item.total_price || 0);
    });
    
    return Object.values(grouped);
  };

  const handleCheckout = async () => {
    setProcessing(true);
    setError('');

    try {
      const response = await orderAPI.checkout();

      //   Handle multiple orders with ONE QR code
      const orders = response.data.orders;
      const qrCode = response.data.qr_code_base64;
      
      if (!orders || orders.length === 0) {
        throw new Error('No orders created');
      }

      //   Store orders AND QR code in sessionStorage
      sessionStorage.setItem('checkout_orders', JSON.stringify(orders));
      sessionStorage.setItem('checkout_qr', qrCode);

      // Clear cart context
      await fetchCart();

      // Show success message
      showToast(
        response.data.message || `${orders.length} order(s) placed successfully!`,
        'success'
      );

      // Redirect to success page
      setTimeout(() => {
        router.push('/checkout/success');
      }, 500);

    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Checkout failed. Please try again.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (!isAuthenticated || !isBuyer) {
    return null;
  }

  if (loading || cartLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  const cartItems = cart?.items || [];
  const isEmpty = cartItems.length === 0;
  const subtotal = parseFloat(cart?.subtotal || 0);
  const availableCredit = parseFloat(creditAccount?.credit_balance || 0);
  const hasEnoughCredit = availableCredit >= subtotal;

  //   Group items by seller
  const groupedCart = groupCartItemsBySeller(cartItems);

  if (isEmpty) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="card p-12 text-center">
            <ShoppingBag className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add some products before checking out</p>
            <Link href="/products" className="btn-primary inline-block">
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Multi-Seller Notice */}
        {groupedCart.length > 1 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Store className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">
                  Multi-Seller Order
                </p>
                <p className="text-xs text-blue-700">
                  You're ordering from {groupedCart.length} different sellers. Each seller will receive a separate order, but you'll get ONE QR code for all pickups. Make sure to present the same QR code at each seller's pickup point.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cart Items Grouped by Seller */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Items</h2>
              
              {groupedCart.map((sellerGroup, index) => (
                <div key={sellerGroup.seller.id} className="mb-6 last:mb-0">
                  {/* Seller Header */}
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                    <Store className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">{sellerGroup.seller.name}</h3>
                    <span className="text-sm text-gray-500">({sellerGroup.items.length} items)</span>
                  </div>

                  {/* Seller's Items */}
                  <div className="space-y-4 mb-3">
                    {sellerGroup.items.map((item) => (
                      <div key={item.id} className="flex gap-4 pb-4 border-b border-gray-100 last:border-b-0">
                        <img
                          src={item.product.main_image || 'https://via.placeholder.com/100'}
                          alt={item.product.name}
                          className="w-20 h-20 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{item.product.name}</h4>
                          <p className="text-sm text-gray-600">
                            ₦{parseFloat(item.product.price).toLocaleString()} × {item.quantity}
                          </p>
                          <p className="text-sm font-bold text-gray-900 mt-1">
                            ₦{parseFloat(item.total_price).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Seller Subtotal */}
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-right text-sm">
                      <span className="text-gray-600">Subtotal: </span>
                      <span className="font-semibold text-gray-900">
                        ₦{sellerGroup.subtotal.toLocaleString()}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Buyer Information */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Information</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {user?.first_name} {user?.last_name}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>
                  <span className="ml-2 font-medium text-gray-900">{user?.email}</span>
                </div>
                {user?.phone_number && (
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <span className="ml-2 font-medium text-gray-900">{user?.phone_number}</span>
                  </div>
                )}
                {user?.address && (
                  <div>
                    <span className="text-gray-600">Address:</span>
                    <span className="ml-2 font-medium text-gray-900">{user?.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-4 space-y-6">
              {/* Credit Balance */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment</h2>
                <div className="p-4 bg-blue-50 rounded-lg mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Available Credit</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    ₦{availableCredit.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Order Summary */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  {groupedCart.length > 1 && (
                    <div className="mb-2 pb-2 border-b border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">Orders by Seller:</p>
                      {groupedCart.map((group, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-gray-600">{group.seller.name}</span>
                          <span className="font-medium">₦{group.subtotal.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-900">
                      ₦{subtotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Items</span>
                    <span className="font-medium text-gray-900">{cart.total_items}</span>
                  </div>
                  {groupedCart.length > 1 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Orders</span>
                      <span className="font-medium text-gray-900">{groupedCart.length}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-lg">
                      <span className="font-bold text-gray-900">Total</span>
                      <span className="font-bold text-gray-900">
                        ₦{subtotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Credit Warning */}
              {!hasEnoughCredit && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-900 mb-1">
                        Insufficient Credit
                      </p>
                      <p className="text-xs text-red-700">
                        You need ₦{(subtotal - availableCredit).toLocaleString()} more credit or remove some items
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Checkout Button */}
              <Button
                onClick={handleCheckout}
                variant="primary"
                loading={processing}
                disabled={!hasEnoughCredit}
                className="w-full"
              >
                <CheckCircle className="w-5 h-5 inline mr-2" />
                {processing ? 'Processing...' : 'Complete Purchase'}
              </Button>

              <p className="text-xs text-gray-600 text-center">
                By completing this purchase, you agree to our terms and conditions
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}