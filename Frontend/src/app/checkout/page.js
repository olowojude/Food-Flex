'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { orderAPI, creditAPI } from '@/lib/api';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { CreditCard, ShoppingBag, AlertCircle, CheckCircle } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated, isBuyer } = useAuth();
  const { cart, loading: cartLoading, fetchCart } = useCart();
  const [creditAccount, setCreditAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (!isBuyer) {
      router.push('/');
    } else {
      fetchCheckoutData();
    }
  }, [isAuthenticated, isBuyer]);

  const fetchCheckoutData = async () => {
    try {
      setLoading(true);
      const creditRes = await creditAPI.getMyCreditAccount();
      setCreditAccount(creditRes.data);
    } catch (error) {
      console.error('Error fetching checkout data:', error);
      setError('Failed to load checkout data');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    try {
      setProcessing(true);
      setError('');

      // Call checkout API
      const response = await orderAPI.checkout();
      console.log('Checkout response:', response.data);
      
      // ✅ FIXED: Store with correct keys that success page expects
      sessionStorage.setItem('checkout_order', JSON.stringify(response.data.order));
      sessionStorage.setItem('checkout_qr', response.data.qr_code_base64);
      
      // ✅ Clear cart after successful checkout
      await fetchCart();
      
      // Redirect to success page
      router.push('/checkout/success');
    } catch (error) {
      console.error('Checkout error:', error);
      setError(error.response?.data?.error || 'Checkout failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

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
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cart Items */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Items</h2>
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4 pb-4 border-b last:border-b-0">
                    <img
                      src={item.product.main_image || 'https://via.placeholder.com/100'}
                      alt={item.product.name}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.product.name}</h3>
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
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-900">
                      ₦{subtotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Items</span>
                    <span className="font-medium text-gray-900">{cart.total_items}</span>
                  </div>
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
                        You need ₦{(subtotal - availableCredit).toLocaleString()} more credit
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