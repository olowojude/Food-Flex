'use client';

/**
 * Fixed Seller Sales/Orders Page - Shows ALL Orders Including PENDING
 * Save as: frontend/src/app/sales/page.js (REPLACE)
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { orderAPI } from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Button from '@/components/common/Button';
import { 
  Package, DollarSign, ShoppingBag, TrendingUp, 
  CheckCircle, Clock, XCircle, Search, Eye, Check, AlertCircle
} from 'lucide-react';

export default function SalesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isSeller } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, confirmed, completed, cancelled
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (!isSeller) {
      router.push('/');
    } else {
      fetchOrders();
    }
  }, [isAuthenticated, isSeller]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching seller orders...');
      const response = await orderAPI.getMyOrders();
      
      console.log('Orders response:', response);
      
      // Handle both paginated and non-paginated responses
      const orderList = response.data.results || response.data;
      
      console.log('Extracted order list:', orderList);
      console.log('Total orders:', orderList.length);
      
      // Log pending orders specifically
      const pendingOrders = orderList.filter(o => o.status === 'PENDING');
      console.log('Pending orders:', pendingOrders.length, pendingOrders);
      
      setOrders(orderList);
      calculateStats(orderList);
    } catch (error) {
      console.error('Error fetching orders:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.error || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (orderList) => {
    const stats = {
      total: orderList.length,
      pending: orderList.filter(o => o.status === 'PENDING').length,
      confirmed: orderList.filter(o => o.status === 'CONFIRMED').length,
      completed: orderList.filter(o => o.status === 'COMPLETED').length,
      cancelled: orderList.filter(o => o.status === 'CANCELLED').length,
      totalRevenue: orderList
        .filter(o => o.status === 'COMPLETED')
        .reduce((sum, o) => sum + parseFloat(o.total_amount), 0),
    };
    
    console.log('Calculated stats:', stats);
    setStats(stats);
  };

  const handleConfirmOrder = async (orderId) => {
    if (!confirm('Confirm this order? The buyer will be notified.')) return;

    try {
      await orderAPI.confirmOrder(orderId);
      alert('Order confirmed successfully!');
      fetchOrders();
    } catch (error) {
      console.error('Error confirming order:', error);
      alert(error.response?.data?.error || 'Failed to confirm order');
    }
  };

  const handleCompleteOrder = async (orderId) => {
    if (!confirm('Mark this order as completed? This action cannot be undone.')) return;

    try {
      await orderAPI.completeOrder(orderId);
      alert('Order completed successfully!');
      fetchOrders();
    } catch (error) {
      console.error('Error completing order:', error);
      alert(error.response?.data?.error || 'Failed to complete order');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    if (filter !== 'all') {
      matchesFilter = order.status === filter.toUpperCase();
    }

    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-300';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-4 h-4" />;
      case 'CONFIRMED': return <CheckCircle className="w-4 h-4" />;
      case 'COMPLETED': return <CheckCircle className="w-4 h-4" />;
      case 'CANCELLED': return <XCircle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  if (!isAuthenticated || !isSeller) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Orders</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchOrders} variant="primary">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales & Orders</h1>
          <p className="text-gray-600">Manage your customer orders and track sales</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Orders</p>
              <ShoppingBag className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>

          <div className="card p-4 border-2 border-yellow-200 bg-yellow-50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 font-semibold">Pending</p>
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-yellow-700 mt-1">⚠️ Needs Action</p>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Confirmed</p>
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.confirmed}</p>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Completed</p>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Cancelled</p>
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
          </div>

          <div className="card p-4 bg-green-50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Revenue</p>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-xl font-bold text-green-600">
              ₦{stats.totalRevenue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Pending Orders Alert */}
        {stats.pending > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-3" />
              <div>
                <h3 className="text-sm font-semibold text-yellow-800">
                  You have {stats.pending} pending order{stats.pending > 1 ? 's' : ''}!
                </h3>
                <p className="text-sm text-yellow-700">
                  These orders need to be prepared and reserved for pickup. Click "View Pending" to see them.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="card p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by order number or buyer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {[
                { id: 'all', label: 'All', count: stats.total },
                { id: 'pending', label: 'Pending', count: stats.pending },
                { id: 'confirmed', label: 'Confirmed', count: stats.confirmed },
                { id: 'completed', label: 'Completed', count: stats.completed },
              ].map(({ id, label, count }) => (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filter === id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="card p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || filter !== 'all' ? 'No orders found' : 'No orders yet'}
            </h3>
            <p className="text-gray-600">
              {searchTerm || filter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Orders from buyers will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div 
                key={order.id} 
                className={`card p-6 hover:shadow-lg transition ${
                  order.status === 'PENDING' ? 'border-2 border-yellow-300 bg-yellow-50' : ''
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Order Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{order.order_number}
                      </h3>
                      <span className={`badge flex items-center gap-1 border ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {order.status}
                      </span>
                      {order.status === 'PENDING' && (
                        <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full animate-pulse">
                          NEW
                        </span>
                      )}
                    </div>

                    <div className="grid md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600">Buyer</p>
                        <p className="font-medium text-gray-900">
                          {order.buyer_name || 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Date</p>
                        <p className="font-medium text-gray-900">
                          {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total</p>
                        <p className="font-bold text-green-600">
                          ₦{parseFloat(order.total_amount).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {order.status === 'PENDING' && (
                      <div className="mt-3 p-3 bg-yellow-100 rounded-lg border border-yellow-300">
                        <p className="text-sm text-yellow-800 font-medium">
                          ⚠️ Stock has been reserved. Please prepare this order for pickup.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 md:w-48">
                    <Link href={`/orders/${order.id}`}>
                      <Button variant="secondary" className="w-full">
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </Link>

                    {order.status === 'PENDING' && (
                      <Button
                        variant="primary"
                        onClick={() => handleConfirmOrder(order.id)}
                        className="w-full"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Confirm Order
                      </Button>
                    )}

                    {order.status === 'CONFIRMED' && (
                      <Button
                        variant="success"
                        onClick={() => handleCompleteOrder(order.id)}
                        className="w-full"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Complete Order
                      </Button>
                    )}

                    {order.status === 'COMPLETED' && (
                      <div className="text-center text-sm text-green-600 font-medium py-2">
                        ✓ Order Fulfilled
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}