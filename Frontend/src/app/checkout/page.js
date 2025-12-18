'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { orderAPI, creditAPI } from '@/lib/api';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ShoppingBag, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated, isBuyer } = useAuth();
  const { cart, loading: cartLoading } = useCart();
  
  const [creditAccount, setCreditAccount] = useState(null);
  const [loadingCredit, setLoadingCredit] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (!isBuyer) {
      router.push('/');
    } else {
      fetchCreditAccount();
    }
  }, [isAuthenticated, isBuyer]);

  const fetchCreditAccount = async () => {
    try {
      const response = await creditAPI.getMyCreditAccount();
      setCreditAccount(response.data);
    } catch (error) {
      console.error('Error fetching credit:', error);
      setError('Failed to load credit information');
    } finally {
      setLoadingCredit(false);
    }
  };

  const handleCheckout = async () => {
    setError('');
    setProcessing(true);

    try {
      const response = await orderAPI.checkout();
      const { order, qr_code_base64 } = response.data;

      // Store order and QR code data for the success page
      sessionStorage.setItem('checkout_order', JSON.stringify(order));
      sessionStorage.setItem('checkout_qr', qr_code_base64);

      // Redirect to success page
      router.push(`/checkout/success?order=${order.order_number}`);
    } catch (error) {
      console.error('Checkout error:', error);
      setError(
        error.response?.data?.error || 
        'Checkout failed. Please try again.'
      );
      setProcessing(false);
    }
  };

  if (!isAuthenticated || !isBuyer) {
    return null;
  }

  if (cartLoading || loadingCredit) {
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
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto card p-12 text-center">
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
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
            <p className="text-gray-600">Review your order and complete purchase</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Order Items */}
            <div className="lg:col-span-2 space-y-6">
              {/* Items List */}
              <div className="card p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Order Items ({cart.total_items})
                </h2>
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0">
                      <img
                        src={item.product.main_image || 'https://via.placeholder.com/80'}
                        alt={item.product.name}
                        className="w-20 h-20 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{item.product.name}</h3>
                        <p className="text-sm text-gray-600">
                          ₦{parseFloat(item.product.price).toLocaleString()} × {item.quantity}
                        </p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          ₦{parseFloat(item.total_price).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buyer Information */}
              <div className="card p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Buyer Information
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium text-gray-900">
                      {user?.first_name} {user?.last_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium text-gray-900">{user?.email}</span>
                  </div>
                  {user?.phone_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium text-gray-900">{user.phone_number}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="lg:col-span-1">
              <div className="card p-6 sticky top-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Payment Summary
                </h2>

                {/* Order Total */}
                <div className="space-y-3 mb-6 pb-6 border-b">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>₦{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-900">
                    <span>Total</span>
                    <span>₦{subtotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Credit Information */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Credit Balance</h3>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 mb-3">
                    <p className="text-sm text-blue-900 mb-1">Available Credit</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ₦{availableCredit.toLocaleString()}
                    </p>
                  </div>
                  
                  {hasEnoughCredit ? (
                    <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg">
                      <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Sufficient Credit</p>
                        <p className="text-green-600">
                          Remaining: ₦{(availableCredit - subtotal).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 p-3 rounded-lg">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Insufficient Credit</p>
                        <p className="text-red-600">
                          Short by: ₦{(subtotal - availableCredit).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Checkout Button */}
                <Button
                  onClick={handleCheckout}
                  variant="primary"
                  loading={processing}
                  disabled={!hasEnoughCredit || processing}
                  className="w-full py-3 text-lg mb-3"
                >
                  {processing ? 'Processing...' : 'Complete Purchase'}
                </Button>

                <Link
                  href="/cart"
                  className="btn-secondary w-full text-center block"
                >
                  Back to Cart
                </Link>

                {/* Info Note */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">
                    <strong>Note:</strong> After checkout, you'll receive a QR code. 
                    Take this code to the seller's location to collect your items.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}