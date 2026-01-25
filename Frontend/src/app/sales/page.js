'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { orderAPI } from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Button from '@/components/common/Button';
import QRScanner from '@/components/common/QRScanner';
import Toast from '@/components/common/Toast';
import { 
  Package, ShoppingBag, CheckCircle, Clock, XCircle, Search, 
  Eye, AlertCircle, Camera, X, User, MapPin, Phone, Mail
} from 'lucide-react';

// ========================================
// ORDER DETAIL MODAL COMPONENT
// ========================================
function OrderDetailModal({ order, isOpen, onClose }) {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Order #{order.order_number}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Status: <span className={`font-semibold ${
                order.status === 'PENDING' ? 'text-yellow-600' :
                order.status === 'CONFIRMED' ? 'text-blue-600' :
                order.status === 'COMPLETED' ? 'text-green-600' :
                'text-red-600'
              }`}>{order.status}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Buyer Information */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Buyer Information
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {order.buyer_name}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {order.buyer_email}
                </span>
              </div>
              {order.buyer_phone && (
                <div>
                  <span className="text-gray-600">Phone:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {order.buyer_phone}
                  </span>
                </div>
              )}
              {order.buyer_address && (
                <div className="sm:col-span-2">
                  <span className="text-gray-600">Address:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {order.buyer_address}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Order Items ({order.items_count || order.items?.length || 0})
            </h3>
            <div className="space-y-3">
              {order.items?.map((item, index) => (
                <div key={index} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                  {item.product_image && (
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{item.product_name}</p>
                    <p className="text-sm text-gray-600">
                      ₦{parseFloat(item.product_price).toLocaleString()} × {item.quantity}
                    </p>
                    <p className="text-sm font-bold text-gray-900 mt-1">
                      Subtotal: ₦{parseFloat(item.subtotal).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Order Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-bold text-gray-900">
                  ₦{parseFloat(order.total_amount).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Order Date:</span>
                <span className="font-medium text-gray-900">
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
              </div>
              {order.confirmed_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Confirmed At:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(order.confirmed_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Hint */}
          {order.status === 'PENDING' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Next Step:</strong> Scan the buyer's QR code to confirm this order and start the pickup process.
              </p>
            </div>
          )}

          {order.status === 'CONFIRMED' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                ✅ <strong>Order Confirmed!</strong> Complete the order after the buyer receives their items.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ========================================
// MAIN SALES PAGE COMPONENT
// ========================================
export default function SalesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isSeller } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scanningOrderId, setScanningOrderId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Detail Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
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

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await orderAPI.getMyOrders();
      const orderList = response.data.results || response.data;
      
      setOrders(orderList);
      calculateStats(orderList);
    } catch (error) {
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
    
    setStats(stats);
  };

  const handleScanClick = (orderId = null) => {
    setScanningOrderId(orderId);
    setShowScanner(true);
  };

  const handleScanSuccess = async ({ orderData, qrData }) => {
    setShowScanner(false);
    setProcessing(true);

    try {
      const response = await orderAPI.verifyQRCode({ 
        qr_data: JSON.stringify(orderData) 
      });
      
      if (response.data.success && response.data.order) {
        const orderId = response.data.order.id;
        
        showToast('QR verified! OTP generated. Redirecting...', 'success');
        
        setTimeout(() => {
          router.push(`/orders/${orderId}?scan=true`);
        }, 1000);
      } else {
        throw new Error('QR verification failed');
      }
      
    } catch (error) {
      const errorMsg = error.response?.data?.error || 
                       error.response?.data?.message || 
                       error.message || 
                       'Invalid QR code';
      showToast(errorMsg, 'error');
      setProcessing(false);
    }
  };

  const handleScanError = (error) => {
    setShowScanner(false);
    setProcessing(false);
    showToast(error.message || 'Scan failed', 'error');
  };

  const handleCompleteOrder = async (orderId) => {
    if (!confirm('Mark this order as completed? This action cannot be undone.')) return;

    try {
      await orderAPI.completeOrder(orderId);
      showToast('Order completed successfully!', 'success');
      fetchOrders();
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to complete order', 'error');
    }
  };

  // NEW: View order details handler
  const handleViewDetails = async (order) => {
    try {
      // If order doesn't have items, fetch full details
      if (!order.items || order.items.length === 0) {
        const response = await orderAPI.getOrderDetail(order.id);
        setSelectedOrder(response.data);
      } else {
        setSelectedOrder(order);
      }
      setShowDetailModal(true);
    } catch (error) {
      showToast('Failed to load order details', 'error');
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
          <Button onClick={fetchOrders} variant="primary">Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Toasts */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          onScanSuccess={handleScanSuccess}
          onScanError={handleScanError}
          onClose={() => {
            setShowScanner(false);
            setProcessing(false);
          }}
          isProcessing={processing}
        />
      )}

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedOrder(null);
        }}
      />

      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales & Orders</h1>
          <p className="text-gray-600">Manage your customer orders and track sales</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
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
            <p className="text-xs text-yellow-700 mt-1">Needs Action</p>
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

          <div className="card p-4 bg-green-50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Revenue</p>
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
                  Stock has been reserved. Scan the buyer's QR code to confirm pickup.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
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
                          {new Date(order.created_at).toLocaleDateString()}
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
                          📸 Scan buyer's QR code to generate OTP and confirm order.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 md:w-48">
                    {/* View Details Button (Always Show) */}
                    <Button
                      variant="secondary"
                      onClick={() => handleViewDetails(order)}
                      className="w-full"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>

                    {order.status === 'PENDING' && (
                      <Button
                        variant="primary"
                        onClick={() => handleScanClick(order.id)}
                        disabled={processing}
                        className="w-full"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        {processing ? 'Processing...' : 'Scan QR Code'}
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