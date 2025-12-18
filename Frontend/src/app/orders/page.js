'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { orderAPI } from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Package, Calendar, CreditCard, Eye, Filter } from 'lucide-react';

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated, isBuyer } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(''); // ALL, PENDING, CONFIRMED, COMPLETED

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (!isBuyer) {
      router.push('/');
    } else {
      fetchOrders();
    }
  }, [isAuthenticated, isBuyer, filter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = filter ? { status: filter } : {};
      const response = await orderAPI.getMyOrders(params);
      setOrders(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  if (!isAuthenticated || !isBuyer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
          <p className="text-gray-600">Track and manage your orders</p>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filter by:</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {['', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status || 'All'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="card p-6 hover:shadow-lg transition">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Order Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Package className="w-5 h-5 text-gray-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{order.order_number}
                      </h3>
                      <span className={`badge ${getStatusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <CreditCard className="w-4 h-4" />
                        <span className="font-semibold text-gray-900">
                          ₦{parseFloat(order.total_amount).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-gray-600">
                        <span className="font-medium">Seller:</span> {order.seller_name}
                      </div>
                      <div className="text-gray-600">
                        <span className="font-medium">Items:</span> {order.items_count || 'N/A'}
                      </div>
                    </div>

                    {/* Status Info */}
                    {order.status === 'PENDING' && (
                      <div className="mt-3 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                        ⏳ Waiting for seller confirmation. Show your QR code at pickup location.
                      </div>
                    )}
                    {order.status === 'CONFIRMED' && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                        ✓ Order confirmed! Visit seller to collect your items.
                      </div>
                    )}
                    {order.status === 'COMPLETED' && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg text-sm text-green-800">
                        ✓ Order completed. Thank you for shopping with FoodFlex!
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link
                      href={`/orders/${order.id}`}
                      className="btn-primary flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center">
            <Package className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              {filter ? `No ${filter.toLowerCase()} orders` : 'No orders yet'}
            </h2>
            <p className="text-gray-600 mb-6">
              {filter 
                ? 'Try changing the filter or start shopping!'
                : 'Start shopping to see your orders here'
              }
            </p>
            <Link href="/products" className="btn-primary inline-block">
              Browse Products
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}