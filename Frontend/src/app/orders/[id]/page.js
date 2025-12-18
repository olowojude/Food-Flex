'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { orderAPI } from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ArrowLeft, Package, Calendar, CreditCard, User, MapPin, Download } from 'lucide-react';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isBuyer } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (!isBuyer) {
      router.push('/');
    } else if (params.id) {
      fetchOrder();
    }
  }, [isAuthenticated, isBuyer, params.id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getOrderDetail(params.id);
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQR = () => {
    if (!order?.qr_code_image) return;

    const link = document.createElement('a');
    link.href = order.qr_code_image;
    link.download = `foodflex-order-${order.order_number}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      CONFIRMED: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Confirmed' },
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      CANCELLED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
    };
    return badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
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

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h2>
          <Link href="/orders" className="text-blue-600 hover:text-blue-700">
            ← Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(order.status);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Back Button */}
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Orders
        </Link>

        {/* Header */}
        <div className="card p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-6 h-6 text-gray-600" />
                <h1 className="text-2xl font-bold text-gray-900">
                  Order #{order.order_number}
                </h1>
              </div>
              <p className="text-sm text-gray-600">
                Placed on {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
            <span className={`badge ${statusBadge.bg} ${statusBadge.text} text-base px-4 py-2`}>
              {statusBadge.label}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0">
                    <div className="w-20 h-20 bg-gray-100 rounded shrink-0">
                      {/* Placeholder for product image */}
                      <Package className="w-full h-full p-4 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.product_name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        ₦{parseFloat(item.product_price).toLocaleString()} × {item.quantity}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mt-2">
                        Subtotal: ₦{parseFloat(item.subtotal).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span>₦{parseFloat(order.total_amount).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Buyer & Seller Info */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Information</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Buyer Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600">
                      <span className="font-medium">Name:</span>{' '}
                      {order.buyer?.first_name} {order.buyer?.last_name}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Email:</span> {order.buyer?.email}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Seller Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600">
                      <span className="font-medium">Name:</span>{' '}
                      {order.seller?.first_name} {order.seller?.last_name}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Email:</span> {order.seller?.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Timeline</h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                      ✓
                    </div>
                    <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="font-semibold text-gray-900">Order Placed</p>
                    <p className="text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {order.confirmed_at && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                        ✓
                      </div>
                      {order.completed_at && <div className="w-0.5 h-full bg-gray-200 mt-2"></div>}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-semibold text-gray-900">Order Confirmed</p>
                      <p className="text-sm text-gray-600">
                        {new Date(order.confirmed_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {order.completed_at && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                      ✓
                    </div>
                    <div className="flex-1">
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

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-6">
              {/* QR Code */}
              {order.qr_code_image && order.status !== 'COMPLETED' && (
                <div className="card p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
                    Order QR Code
                  </h2>
                  <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 mb-4">
                    <img
                      src={order.qr_code_image}
                      alt="Order QR Code"
                      className="w-full"
                    />
                  </div>
                  <button
                    onClick={handleDownloadQR}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download QR Code
                  </button>
                  <p className="text-xs text-gray-600 text-center mt-3">
                    Show this code to the seller to collect your items
                  </p>
                </div>
              )}

              {/* Order Summary */}
              <div className="card p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Summary</h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>₦{parseFloat(order.total_amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t">
                    <span>Total</span>
                    <span>₦{parseFloat(order.total_amount).toLocaleString()}</span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Paid with Credit
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