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
import { 
  CreditCard, ShoppingBag, AlertCircle, CheckCircle, 
  Store, DollarSign, Calendar, TrendingUp, Info,
  ShieldAlert, ArrowRight, Phone
} from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, isBuyer } = useAuth();
  const { cart, loading: cartLoading, fetchCart } = useCart();
  const [creditAccount, setCreditAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentBreakdown, setPaymentBreakdown] = useState(null);
  const [checkoutSession, setCheckoutSession] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [step, setStep] = useState('review'); // 'review' | 'payment'

  // ── Verification gate state ─────────────────────────────────────
  const [verificationBlocked, setVerificationBlocked] = useState(false);

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

  // Group cart items by seller
  const groupCartItemsBySeller = (cartItems) => {
    const grouped = {};
    cartItems.forEach(item => {
      const sellerId = item.product.seller || 'unknown';
      const sellerName = item.product.seller_store_name || 'Unknown Seller';
      if (!grouped[sellerId]) {
        grouped[sellerId] = { seller: { id: sellerId, name: sellerName }, items: [], subtotal: 0 };
      }
      grouped[sellerId].items.push(item);
      grouped[sellerId].subtotal += parseFloat(item.total_price || 0);
    });
    return Object.values(grouped);
  };

  const handleInitiateCheckout = async () => {
    setProcessing(true);
    setError('');
    setVerificationBlocked(false);

    try {
      const response = await orderAPI.initiateCheckout();
      setPaymentBreakdown(response.data.breakdown);
      setCheckoutSession(response.data.checkout_session);
      setStep('payment');
      showToast('Review payment details below', 'success');
    } catch (err) {
      const data = err.response?.data;

      // ── Phone verification gate ──────────────────────────────────
      if (err.response?.status === 403 && data?.redirect === 'verification') {
        setVerificationBlocked(true);
        setError('');
        return;
      }
      // ────────────────────────────────────────────────────────────

      const errorMessage = data?.error || 'Failed to initiate checkout';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDummyPayment = async () => {
    setProcessing(true);
    setError('');

    try {
      showToast('Processing payment...', 'warning');
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await orderAPI.confirmCheckout({
        checkout_session: checkoutSession,
        payment_reference: `DUMMY_${Date.now()}`
      });

      const orders = response.data.orders;
      const qrCode = response.data.qr_code_base64;

      sessionStorage.setItem('checkout_orders', JSON.stringify(orders));
      sessionStorage.setItem('checkout_qr', qrCode);
      sessionStorage.setItem('payment_info', JSON.stringify(response.data.payment_info));

      await fetchCart();
      showToast('Payment successful! Redirecting...', 'success');

      setTimeout(() => {
        router.push('/checkout/success');
      }, 1000);

    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Payment failed';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // ── Loading / auth guards ────────────────────────────────────────
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="xl" /></div>;
  }
  if (!isAuthenticated || !isBuyer) return null;
  if (loading || cartLoading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="xl" /></div>;
  }

  const cartItems = cart?.items || [];
  const isEmpty = cartItems.length === 0;
  const subtotal = parseFloat(cart?.subtotal || 0);
  const availableCredit = parseFloat(creditAccount?.credit_balance || 0);
  const hasEnoughCredit = availableCredit >= subtotal;
  const groupedCart = groupCartItemsBySeller(cartItems);

  if (isEmpty) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="card p-12 text-center">
            <ShoppingBag className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add some products before checking out</p>
            <Link href="/products" className="btn-primary inline-block px-4 py-2 rounded-lg">
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

      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
        <p className="text-gray-600 mb-8">Pay 10% now, pay the rest over 30 days</p>

        {/* ── Phone Verification Blocked Banner ───────────────────── */}
        {verificationBlocked && (
          <div className="mb-6 p-5 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-1">Phone Verification Required</h3>
                <p className="text-sm text-amber-700 mb-3">
                  You need to verify your phone number before you can checkout. This helps us 
                  send your order confirmation and pickup details via SMS.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => router.push('/profile?tab=verification')}
                    className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Verify Phone Number
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setVerificationBlocked(false)}
                    className="text-sm text-amber-700 hover:text-amber-900 underline underline-offset-2 px-2 py-2"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ────────────────────────────────────────────────────────── */}

        {/* General error */}
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
                <p className="text-sm font-medium text-blue-900 mb-1">Multi-Seller Order</p>
                <p className="text-xs text-blue-700">
                  You're ordering from {groupedCart.length} different sellers. You'll get ONE QR code for all pickups.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cart Items */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Items</h2>

              {groupedCart.map((sellerGroup) => (
                <div key={sellerGroup.seller.id} className="mb-6 last:mb-0">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                    <Store className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">{sellerGroup.seller.name}</h3>
                    <span className="text-sm text-gray-500">({sellerGroup.items.length} items)</span>
                  </div>

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
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium text-gray-900">{user?.phone_number}</span>
                    {user?.phone_verified ? (
                      <span className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100 font-medium">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    ) : (
                      <Link
                        href="/profile?tab=verification"
                        className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 font-medium hover:bg-amber-100 transition-colors"
                      >
                        <AlertCircle className="w-3 h-3" /> Verify now
                      </Link>
                    )}
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

          {/* Right Column - Payment */}
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

              {step === 'review' ? (
                <>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cart Total</span>
                        <span className="font-medium text-gray-900">₦{subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Items</span>
                        <span className="font-medium text-gray-900">{cart.total_items}</span>
                      </div>
                      {groupedCart.length > 1 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sellers</span>
                          <span className="font-medium text-gray-900">{groupedCart.length}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {!hasEnoughCredit && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-900 mb-1">Insufficient Credit</p>
                          <p className="text-xs text-red-700">
                            You need ₦{(subtotal - availableCredit).toLocaleString()} more credit
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Phone unverified nudge inside payment card */}
                  {user?.phone_number && !user?.phone_verified && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800">
                          <strong>Phone not verified.</strong> You'll need to verify it before checkout.{' '}
                          <Link href="/profile?tab=verification" className="underline font-medium">
                            Verify now →
                          </Link>
                        </p>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleInitiateCheckout}
                    variant="primary"
                    loading={processing}
                    disabled={!hasEnoughCredit}
                    className="w-full"
                  >
                    Continue to Checkout
                  </Button>
                </>
              ) : (
                <>
                  {paymentBreakdown && (
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <span className="font-semibold text-green-900">Pay 10% Now</span>
                        </div>
                        <p className="text-3xl font-bold text-green-600 mb-1">
                          ₦{parseFloat(paymentBreakdown.upfront_payment).toLocaleString()}
                        </p>
                        <p className="text-xs text-green-700">One-time upfront payment</p>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between pb-2 border-b">
                          <span className="text-gray-600">Cart Total</span>
                          <span className="font-medium">₦{parseFloat(paymentBreakdown.cart_total).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Upfront (10%)</span>
                          <span className="font-medium text-green-600">₦{parseFloat(paymentBreakdown.upfront_payment).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Principal (90%)</span>
                          <span className="font-medium">₦{parseFloat(paymentBreakdown.principal_amount).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-600">Service Fee</span>
                            <Info className="w-3 h-3 text-gray-400" />
                          </div>
                          <span className="font-medium">₦{parseFloat(paymentBreakdown.total_service_fee).toLocaleString()}</span>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex justify-between mb-2">
                            <span className="font-semibold text-gray-900">Total to Repay</span>
                            <span className="font-bold text-gray-900">₦{parseFloat(paymentBreakdown.total_repayment_due).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-gray-600">Over 30 days</p>
                        </div>
                      </div>

                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Calendar className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                          <div className="text-xs text-blue-800">
                            <p className="font-medium mb-1">Payment Terms:</p>
                            <ul className="space-y-1">
                              <li>• Pay anytime within 30 days</li>
                              <li>• Pay early to save on interest!</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <TrendingUp className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                          <div className="text-xs text-yellow-800">
                            <p className="font-medium mb-1">Save Money Tip:</p>
                            <p>Interest accrues daily at {paymentBreakdown.daily_interest_rate}% per day. Pay earlier to pay less interest!</p>
                          </div>
                        </div>
                      </div>

                      {/* SMS notice */}
                      <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Phone className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                          <p className="text-xs text-green-800">
                            An SMS confirmation with your order details and pickup location will be sent to <strong>{user?.phone_number}</strong> after payment.
                          </p>
                        </div>
                      </div>

                      <Button
                        onClick={handleDummyPayment}
                        variant="primary"
                        loading={processing}
                        className="w-full"
                      >
                        <CheckCircle className="w-5 h-5 inline mr-2" />
                        {processing ? 'Processing...' : `Pay ₦${parseFloat(paymentBreakdown.upfront_payment).toLocaleString()} Now`}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}