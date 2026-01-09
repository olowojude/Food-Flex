'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { CheckCircle, Download, ShoppingBag, Store, MapPin, Phone } from 'lucide-react';

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const { isAuthenticated, isBuyer } = useAuth();
  
  //   ALL STATE VARIABLES PROPERLY DEFINED
  const [orders, setOrders] = useState([]);
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !isBuyer) {
      router.push('/');
      return;
    }

    //   Get checkout data from sessionStorage
    const ordersData = sessionStorage.getItem('checkout_orders');
    const qrCodeData = sessionStorage.getItem('checkout_qr');
    
    if (ordersData && qrCodeData) {
      try {
        const parsedOrders = JSON.parse(ordersData);
        setOrders(Array.isArray(parsedOrders) ? parsedOrders : [parsedOrders]);
        setQrCode(qrCodeData);
        
        // Clean up session storage
        sessionStorage.removeItem('checkout_orders');
        sessionStorage.removeItem('checkout_qr');
      } catch (error) {
      }
    }
    
    setLoading(false);
  }, [isAuthenticated, isBuyer, router]);

  const downloadQRCode = () => {
    if (!qrCode) return;
    
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `foodflex-all-orders-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated || !isBuyer) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Order Found</h2>
          <Button onClick={() => router.push('/products')}>
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  const totalAmount = orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Successful!</h1>
          <p className="text-gray-600">
            {orders.length === 1 
              ? 'Your order has been placed successfully'
              : `${orders.length} orders have been placed successfully`}
          </p>
        </div>

        {/* Total Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Amount Paid</p>
              <p className="text-3xl font-bold text-gray-900">
                ₦{totalAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-blue-600">{orders.length}</p>
            </div>
          </div>
        </div>

        {/*   ONE QR CODE FOR ALL ORDERS */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Your Pickup QR Code</h2>
          <p className="text-center text-gray-600 mb-4">
            Show this QR code to each seller when picking up your orders
          </p>
          
          <div className="bg-white border-2 border-gray-200 rounded-lg p-4 text-center mb-4">
            <img
              src={qrCode}
              alt="All Orders QR Code"
              className="w-64 h-64 mx-auto mb-3"
            />
            <p className="text-xs text-gray-500">
              This QR code works for all {orders.length} order(s)
            </p>
          </div>
          
          <Button 
            onClick={downloadQRCode}
            variant="primary"
            className="w-full"
          >
            <Download className="w-5 h-5 mr-2" />
            Download QR Code
          </Button>
          
          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-xs text-blue-900">
              <strong>Note:</strong> Each seller will only see their own items when they scan this QR code.
            </p>
          </div>
        </div>

        {/* Individual Orders */}
        <div className="space-y-6 mb-6">
          {orders.map((order, index) => (
            <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Order Header */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Order #{order.id} {orders.length > 1 && `(${index + 1} of ${orders.length})`}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      ₦{parseFloat(order.total_amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </p>
                    <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full mt-1">
                      {order.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Seller Info */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Store className="w-5 h-5 text-blue-600" />
                      Seller Information
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <p className="font-medium text-gray-900">{order.seller_info?.store_name || 'Store'}</p>
                      
                      {order.seller_info?.primary_location && (
                        <>
                          <div className="flex items-start gap-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                            <div>
                              <p className="font-medium">{order.seller_info.primary_location.store_name}</p>
                              <p>{order.seller_info.primary_location.city}, {order.seller_info.primary_location.state}</p>
                              <p className="text-xs">{order.seller_info.primary_location.address}</p>
                            </div>
                          </div>
                          
                          {order.seller_info.primary_location.phone_number && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4" />
                              <span>{order.seller_info.primary_location.phone_number}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-gray-600" />
                      Items ({order.items?.length || 0})
                    </h4>
                    <div className="space-y-2">
                      {order.items?.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                          <img
                            src={item.product_image || 'https://via.placeholder.com/60'}
                            alt={item.product_name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">
                              {item.product_name}
                            </p>
                            <p className="text-xs text-gray-600">
                              ₦{parseFloat(item.product_price).toLocaleString()} × {item.quantity}
                            </p>
                          </div>
                          <p className="font-semibold text-sm text-gray-900">
                            ₦{parseFloat(item.subtotal).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button onClick={() => router.push('/orders')} className="flex-1">
            View All Orders
          </Button>
          <Button onClick={() => router.push('/products')} variant="secondary" className="flex-1">
            Continue Shopping
          </Button>
        </div>

        {/* Info Note */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Important:</strong> Download your QR code and show it to each seller when picking up your order(s). Each seller will only see their own items when they scan.
          </p>
        </div>
      </div>
    </div>
  );
}