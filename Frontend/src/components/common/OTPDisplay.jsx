'use client';

/**
 * OTP Display Component for Buyer
 * Shows OTP code when seller scans QR
 * Auto-refreshes every 3 seconds to check for new OTP
 * Save as: frontend/src/components/common/OTPDisplay.jsx
 */

import { useState, useEffect } from 'react';
import { Shield, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

export default function OTPDisplay({ orderId, orderAPI }) {
  const [otpData, setOtpData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOTP();
    
    // Poll for OTP every 3 seconds
    const pollInterval = setInterval(() => {
      fetchOTP();
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [orderId]);

  useEffect(() => {
    // Update countdown every second
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            fetchOTP(); // Refetch to check if new OTP generated
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  const fetchOTP = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await orderAPI.getBuyerOTP(orderId);
      const data = response.data;
      
      setOtpData(data);
      
      if (data.has_otp && data.time_remaining) {
        setTimeRemaining(data.time_remaining);
      } else {
        setTimeRemaining(0);
      }
    } catch (error) {
      setError('Failed to load OTP');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const copyOTP = () => {
    if (otpData?.otp_code) {
      navigator.clipboard.writeText(otpData.otp_code);
      alert('OTP copied to clipboard!');
    }
  };

  if (loading && !otpData) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  // No OTP generated yet
  if (!otpData?.has_otp && !otpData?.expired && !otpData?.verified) {
    return (
      <div className="card p-6 bg-blue-50 border border-blue-200">
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Waiting for Seller Verification</h3>
            <p className="text-sm text-blue-700">
              {otpData?.message || 'Show your QR code to the seller. An OTP will appear here once they scan it.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // OTP expired
  if (otpData?.expired) {
    return (
      <div className="card p-6 bg-yellow-50 border border-yellow-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-yellow-600 shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900 mb-2">OTP Expired</h3>
            <p className="text-sm text-yellow-700 mb-4">
              {otpData?.message || 'Your OTP has expired. Ask the seller to scan your QR code again.'}
            </p>
            <Button
              onClick={fetchOTP}
              variant="secondary"
              className="text-sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // OTP already used
  if (otpData?.verified) {
    return (
      <div className="card p-6 bg-green-50 border border-green-200">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-green-900 mb-2">Order Confirmed!</h3>
            <p className="text-sm text-green-700">
              {otpData?.message || 'Your OTP was successfully verified. The seller is preparing your order.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Active OTP - Show the code!
  return (
    <div className="card p-6 bg-linear-to-br from-blue-50 to-purple-50 border-2 border-blue-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600" />
          <h3 className="font-bold text-blue-900">Your Pickup OTP</h3>
        </div>
        
        {/* Countdown Timer */}
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
          timeRemaining < 60 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
        }`}>
          <Clock className="w-4 h-4" />
          <span className="text-sm font-semibold">{formatTime(timeRemaining)}</span>
        </div>
      </div>

      {/* OTP Code Display */}
      <div 
        onClick={copyOTP}
        className="bg-white rounded-lg p-6 mb-4 cursor-pointer hover:shadow-lg transition border-2 border-blue-400 group"
      >
        <p className="text-center text-6xl font-bold text-blue-600 tracking-widest font-mono">
          {otpData.otp_code}
        </p>
        <p className="text-center text-xs text-gray-500 mt-2 group-hover:text-blue-600">
          Click to copy
        </p>
      </div>

      {/* Instructions */}
      <div className="space-y-2">
        <div className="flex items-start gap-2 text-sm">
          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0 font-semibold">
            1
          </div>
          <p className="text-gray-700">Show your QR code to the seller</p>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0 font-semibold">
            2
          </div>
          <p className="text-gray-700">
            <strong>Tell them this 6-digit code:</strong> {otpData.otp_code}
          </p>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0 font-semibold">
            3
          </div>
          <p className="text-gray-700">Collect your items once confirmed!</p>
        </div>
      </div>

      {/* Warning for low time */}
      {timeRemaining < 60 && timeRemaining > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 font-medium">
            OTP expires in less than 1 minute! Ask seller to enter it quickly.
          </p>
        </div>
      )}

      {/* Security Note */}
      <div className="mt-4 pt-4 border-t border-blue-200">
        <p className="text-xs text-gray-600 text-center">
          This code is for your security. Only share it with the seller when collecting your order.
        </p>
      </div>
    </div>
  );
}