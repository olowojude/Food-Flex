'use client';

import Link from 'next/link';
import { Package, Eye, XCircle } from 'lucide-react';

export default function OrdersTab({ orders, onCancelOrder }) {
  const canCancelOrder = (order) => {
    if (typeof order.can_cancel !== 'undefined') {
      return order.can_cancel;
    }
    return order.status === 'PENDING' && !order.is_cancelled;
  };

  const getStatusClasses = (status) => {
    const classes = {
      COMPLETED: 'bg-green-100 text-green-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      CANCELLED: 'bg-red-100 text-red-800',
      PENDING: 'bg-yellow-100 text-yellow-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  };

  const renderStatusMessage = (order) => {
    if (order.status === 'PENDING' && !order.is_cancelled) {
      return (
        <div className="p-2 bg-yellow-50 rounded text-xs text-yellow-800">
             Waiting for seller confirmation
        </div>
      );
    }
    if (order.status === 'CONFIRMED') {
      return (
        <div className="p-2 bg-blue-50 rounded text-xs text-blue-800">
          ✓ Order confirmed! Visit seller to collect
        </div>
      );
    }
    if (order.status === 'COMPLETED') {
      return (
        <div className="p-2 bg-green-50 rounded text-xs text-green-800">
          ✓ Order completed. Thank you!
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">My Orders</h2>
        <Link href="/orders" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          View All →
        </Link>
      </div>

      {orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => {
            const canCancel = canCancelOrder(order);
            
            return (
              <div
                key={order.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <p className="font-semibold text-gray-900">Order #{order.order_number}</p>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusClasses(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm mb-3">
                      <span className="text-gray-600">Total</span>
                      <span className="font-bold text-gray-900">
                        ₦{parseFloat(order.total_amount).toLocaleString()}
                      </span>
                    </div>

                    {renderStatusMessage(order)}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 items-end">
                    <Link
                      href={`/orders/${order.id}`}
                      className="p-3 bg-blue-600 text-white hover:bg-blue-700 rounded text-xs font-medium transition flex items-center gap-1 whitespace-nowrap"
                    >
                      <Eye className="w-3 h-3" />
                      View Details
                    </Link>
                    
                    {canCancel && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          onCancelOrder(order);
                        }}
                        className="p-3 bg-red-600 text-white hover:bg-red-700 rounded text-xs font-medium transition flex items-center gap-1 whitespace-nowrap"
                      >
                        <XCircle className="w-3 h-3" />
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No orders yet</p>
          <Link href="/products" className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 inline-block">
            Start Shopping →
          </Link>
        </div>
      )}
    </div>
  );
}