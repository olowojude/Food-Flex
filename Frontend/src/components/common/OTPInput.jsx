'use client';

import { useState, useRef, useEffect } from 'react';
import { Shield, Check, X } from 'lucide-react';
import Button from './Button';

export default function OTPInput({ onSubmit, loading = false, buyerName = '' }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const inputRefs = useRef([]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Handle single digit input
  const handleChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (index === 5 && value) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === 6) {
        handleSubmit(fullOtp);
      }
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // If current input empty, focus previous
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current input
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
    
    // Handle left/right arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste (Ctrl+V)
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    // Only accept 6 digits
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      setError('');
      
      // Focus last input
      inputRefs.current[5]?.focus();
      
      // Auto-submit
      handleSubmit(pastedData);
    }
  };

  // Submit OTP
  const handleSubmit = async (otpCode = null) => {
    const fullOtp = otpCode || otp.join('');
    
    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    try {
      setError('');
      await onSubmit(fullOtp);
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  // Clear all inputs
  const handleClear = () => {
    setOtp(['', '', '', '', '', '']);
    setError('');
    inputRefs.current[0]?.focus();
  };

  const isComplete = otp.every(digit => digit !== '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Enter Buyer's OTP
        </h3>
        <p className="text-sm text-gray-600">
          Ask <strong>{buyerName}</strong> for their 6-digit verification code
        </p>
      </div>

      {/* OTP Input Grid - 6 boxes */}
      <div className="flex justify-center gap-3">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={el => inputRefs.current[index] = el}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={loading}
            className={`w-14 h-14 text-center text-2xl font-bold border-2 rounded-lg 
              focus:outline-none focus:ring-2 focus:ring-blue-500 transition
              ${digit ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
              ${error ? 'border-red-500' : ''}
              ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          />
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <X className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleClear}
          variant="secondary"
          disabled={loading || !otp.some(d => d)}
          className="flex-1"
        >
          Clear
        </Button>
        
        <Button
          onClick={() => handleSubmit()}
          variant="primary"
          disabled={!isComplete}
          loading={loading}
          className="flex-1"
        >
          <Check className="w-5 h-5 mr-2" />
          {loading ? 'Verifying...' : 'Verify & Confirm'}
        </Button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 text-sm mb-2">
          How to verify:
        </h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Ask the buyer to check their order page</li>
          <li>Buyer will see a 6-digit code displayed prominently</li>
          <li>Enter the code above</li>
          <li>Click "Verify & Confirm" to complete</li>
        </ol>
      </div>

      {/* Security Note */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          The code expires in 10 minutes. If expired, scan the QR code again.
        </p>
      </div>
    </div>
  );
}