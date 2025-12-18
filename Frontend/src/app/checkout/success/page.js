'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Download, Home } from 'lucide-react';
import Button from '@/components/common/Button';

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState(null);
  const [qrCode, setQrCode] = useState('');

  useEffect(() => {
    // Get order data from sessionStorage
    const orderData = sessionStorage.getItem('checkout_order');
    const qrCodeData = sessionStorage.getItem('checkout_qr');

    if (orderData && qrCodeData) {
      setOrder(JSON.parse(orderData));
      setQrCode(qrCodeData);
      
      // Clear sessionStorage after loading
      // sessionStorage.removeItem('checkout_order');
      // sessionStorage.removeItem('checkout_qr');
    } else {
      // If no data, redirect to orders page
      router.push('/orders');
    }
  }, []);

  const handleDownloadQR = () => {
    if (!qrCode) return;

    // Create download link
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `foodflex-order-${order?.order_number}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!order || !qrCode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Success Message */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Order Placed Successfully!
            </h1>
            <p className="text-gray-600">
              Your order has been confirmed. Use the QR code below to collect your items.
            </p>
          </div>

          {/* Order Details */}
          <div className="card p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Details</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Order Number:</span>
                <span className="font-semibold text-gray-900">{order.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-semibold text-gray-900">
                  ₦{parseFloat(order.total_amount).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                  {order.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-semibold text-gray-900">
                  {new Date(order.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="card p-8 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
              Your Order QR Code
            </h2>
            <div className="bg-white p-6 rounded-lg border-2 border-dashed border-gray-300 mb-6">
              <img
                src={qrCode}
                alt="Order QR Code"
                className="w-full max-w-xs mx-auto"
              />
            </div>
            <Button
              onClick={handleDownloadQR}
              variant="primary"
              className="w-full mb-3"
            >
              <Download className="w-5 h-5 inline mr-2" />
              Download QR Code
            </Button>
            <p className="text-sm text-gray-600 text-center">
              Save or screenshot this QR code to show to the seller
            </p>
          </div>

          {/* Instructions */}
          <div className="card p-6 mb-6 bg-blue-50 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-3">Next Steps:</h3>
            <ol className="space-y-2 text-sm text-blue-800">
              <li className="flex gap-2">
                <span className="font-semibold">1.</span>
                <span>Download or screenshot the QR code above</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">2.</span>
                <span>Visit the seller's physical location</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">3.</span>
                <span>Show the QR code to the seller</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">4.</span>
                <span>Seller will scan and verify your order</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">5.</span>
                <span>Collect your items!</span>
              </li>
            </ol>
          </div>

          {/* Order Items */}
          <div className="card p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Items Ordered</h2>
            <div className="space-y-3">
              {order.items?.map((item) => (
                <div key={item.id} className="flex justify-between items-center pb-3 border-b last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{item.product_name}</p>
                    <p className="text-sm text-gray-600">
                      ₦{parseFloat(item.product_price).toLocaleString()} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900">
                    ₦{parseFloat(item.subtotal).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/orders" className="btn-primary flex-1 text-center">
              View My Orders
            </Link>
            <Link href="/" className="btn-secondary flex-1 text-center flex items-center justify-center gap-2">
              <Home className="w-5 h-5" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}