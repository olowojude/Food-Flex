'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { orderAPI } from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Button from '@/components/common/Button';
import { 
  ArrowLeft, Package, User, Store, Calendar, CreditCard,
  MapPin, Phone, Mail, CheckCircle, Clock, XCircle, Download,
  AlertCircle, Check
} from 'lucide-react';

function OrderDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params.id;
  
  const fromScan = searchParams.get('scan') === 'true';
  const qrToken = searchParams.get('token');

  const { user, isAuthenticated, isBuyer, isSeller } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      fetchOrder();
    }
  }, [isAuthenticated, orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getOrderDetail(orderId);
      console.log('Order data:', response.data);
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
      setError(error.response?.data?.error || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!confirm('Confirm this order? The buyer will be notified and the order will be ready for pickup.')) {
      return;
    }

    try {
      setConfirming(true);
      await orderAPI.confirmOrder(orderId);
      alert('Order confirmed successfully!');
      await fetchOrder();
      setTimeout(() => {
        router.push('/sales');
      }, 1500);
    } catch (error) {
      console.error('Error confirming order:', error);
      alert(error.response?.data?.error || 'Failed to confirm order');
    } finally {
      setConfirming(false);
    }
  };

  const handleCompleteOrder = async () => {
    if (!confirm('Mark this order as completed? The buyer has picked up their items.')) {
      return;
    }

    try {
      setCompleting(true);
      await orderAPI.completeOrder(orderId);
      alert('Order completed successfully! Payment has been transferred to your wallet.');
      await fetchOrder();
      setTimeout(() => {
        router.push('/sales');
      }, 1500);
    } catch (error) {
      console.error('Error completing order:', error);
      alert(error.response?.data?.error || 'Failed to complete order');
    } finally {
      setCompleting(false);
    }
  };

  const downloadQRCode = () => {
    if (!order?.qr_code_image) return;
    
    const link = document.createElement('a');
    link.href = order.qr_code_image;
    link.download = `Order-${order.order_number}-QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'PENDING':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
          icon: <Clock className="w-5 h-5" />,
          message: isSeller 
            ? 'Order is awaiting your confirmation. Stock has been reserved.'
            : 'Your order is pending seller confirmation. Show the QR code at pickup.'
        };
      case 'CONFIRMED':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: <CheckCircle className="w-5 h-5" />,
          message: isSeller
            ? 'Order confirmed. Waiting for buyer to pick up.'
            : 'Order confirmed! Your items are ready for pickup.'
        };
      case 'COMPLETED':
        return {
          color: 'bg-green-100 text-green-800 border-green-300',
          icon: <CheckCircle className="w-5 h-5" />,
          message: 'Order completed successfully!'
        };
      case 'CANCELLED':
        return {
          color: 'bg-red-100 text-red-800 border-red-300',
          icon: <XCircle className="w-5 h-5" />,
          message: 'This order has been cancelled.'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: <Package className="w-5 h-5" />,
          message: ''
        };
    }
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'This order does not exist.'}</p>
          <Link href={isSeller ? '/sales' : '/orders'}>
            <Button variant="primary">Go Back</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(order.status);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={isSeller ? '/sales' : '/orders'}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {isSeller ? 'Sales' : 'Orders'}
          </Link>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Order #{order.order_number}
              </h1>
              <p className="text-gray-600">
                Placed on {new Date(order.created_at).toLocaleString()}
              </p>
            </div>

            <div className={`badge border-2 ${statusConfig.color} flex items-center gap-2 px-4 py-2 text-lg`}>
              {statusConfig.icon}
              <span className="font-semibold">{order.status}</span>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {fromScan && order.status === 'PENDING' && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
              <div>
                <h3 className="text-sm font-semibold text-green-800">
                  QR Code Verified Successfully!
                </h3>
                <p className="text-sm text-green-700">
                  Click "Confirm Order" below to mark the order as ready for pickup.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className={`bg-${order.status === 'PENDING' ? 'yellow' : 'blue'}-50 border border-${order.status === 'PENDING' ? 'yellow' : 'blue'}-200 rounded-lg p-4 mb-6`}>
          <p className="text-gray-800">
            {statusConfig.message}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Buyer Information */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Buyer Information</h2>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-600">Name</p>
                  <p className="font-medium text-gray-900">
                    {order.buyer_name || 'Not provided'}
                  </p>
                </div>
              </div>

              {isSeller && (
                <>
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-gray-600">Email</p>
                      <p className="font-medium text-gray-900">
                        {order.buyer_email || 'Not provided'}
                      </p>
                    </div>
                  </div>

                  {order.buyer_phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-gray-600">Phone</p>
                        <p className="font-medium text-gray-900">
                          {order.buyer_phone}
                        </p>
                      </div>
                    </div>
                  )}

                  {order.buyer_address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-gray-600">Address</p>
                        <p className="font-medium text-gray-900">
                          {order.buyer_address}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Seller Information */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Store className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Seller Information</h2>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Store className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-600">Store Name</p>
                  <p className="font-medium text-gray-900">
                    {order.seller_name || 'Not provided'}
                  </p>
                </div>
              </div>

              {isBuyer && (
                <>
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-gray-600">Email</p>
                      <p className="font-medium text-gray-900">
                        {order.seller_email || 'Not provided'}
                      </p>
                    </div>
                  </div>

                  {order.seller_phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-gray-600">Phone</p>
                        <p className="font-medium text-gray-900">
                          {order.seller_phone}
                        </p>
                      </div>
                    </div>
                  )}

                  {order.seller_address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-gray-600">Pickup Location</p>
                        <p className="font-medium text-gray-900">
                          {order.seller_address}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="card p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Items</h2>
          
          <div className="space-y-4">
            {order.items?.map((item, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                  {item.product_image ? (
                    <img 
                      src={item.product_image} 
                      alt={item.product_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-10 h-10 text-gray-400" />
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{item.product_name}</h3>
                  <p className="text-sm text-gray-600">
                    ₦{parseFloat(item.product_price).toLocaleString()} × {item.quantity}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-bold text-gray-900">
                    ₦{parseFloat(item.subtotal).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Order Total */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between text-xl font-bold">
              <span className="text-gray-900">Total Amount</span>
              <span className="text-green-600">
                ₦{parseFloat(order.total_amount).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* QR Code (for Buyer) */}
        {isBuyer && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && order.qr_code_image && (
          <div className="card p-6 mb-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Pickup QR Code</h2>
            <p className="text-gray-600 mb-6">
              Show this QR code to the seller at pickup
            </p>

            <div className="inline-block p-4 bg-white border-4 border-blue-600 rounded-xl shadow-lg">
              <img 
                src={order.qr_code_image} 
                alt="Order QR Code"
                className="w-64 h-64 mx-auto"
              />
            </div>

            <Button
              onClick={downloadQRCode}
              variant="primary"
              className="mt-6"
            >
              <Download className="w-5 h-5 mr-2" />
              Download QR Code
            </Button>
          </div>
        )}

        {/* Action Buttons for Seller */}
        {isSeller && (
          <div className="card p-6">
            <div className="space-y-4">
              {fromScan && order.status === 'PENDING' && (
                <Button
                  onClick={handleConfirmOrder}
                  loading={confirming}
                  variant="primary"
                  className="w-full text-lg py-4"
                >
                  <Check className="w-6 h-6 mr-2" />
                  {confirming ? 'Confirming...' : 'Confirm Order'}
                </Button>
              )}

              {order.status === 'CONFIRMED' && (
                <Button
                  onClick={handleCompleteOrder}
                  loading={completing}
                  variant="success"
                  className="w-full text-lg py-4"
                >
                  <CheckCircle className="w-6 h-6 mr-2" />
                  {completing ? 'Completing...' : 'Complete Order (Mark as Picked Up)'}
                </Button>
              )}

              {order.status === 'COMPLETED' && (
                <div className="text-center py-4 text-green-600 font-semibold text-lg">
                  ✓ Order Completed - Payment Received
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Timeline */}
        <div className="card p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Timeline</h2>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
              </div>
              <div className="pb-8">
                <p className="font-semibold text-gray-900">Order Placed</p>
                <p className="text-sm text-gray-600">
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            {order.confirmed_at && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-blue-600" />
                  </div>
                  {order.completed_at && <div className="w-0.5 h-full bg-gray-200 mt-2"></div>}
                </div>
                <div className={order.completed_at ? 'pb-8' : ''}>
                  <p className="font-semibold text-gray-900">Order Confirmed</p>
                  <p className="text-sm text-gray-600">
                    {new Date(order.confirmed_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {order.completed_at && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Order Completed</p>
                  <p className="text-sm text-gray-600">
                    {new Date(order.completed_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    }>
      <OrderDetailContent />
    </Suspense>
  );
}