'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/common/Button';
import {
  X, DollarSign, TrendingDown, Calendar,
  Gift, AlertCircle, CheckCircle
} from 'lucide-react';

export default function RepaymentModal({
  isOpen,
  onClose,
  selectedLoan,
  onSubmit,
  processing
}) {
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState('full'); // 'full' or 'partial'
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && selectedLoan) {
      // Default to full payment
      const totalDue = parseFloat(selectedLoan.total_amount_due || 0);
      setAmount(totalDue.toFixed(2));
      setPaymentType('full');
      setError('');
    }
  }, [isOpen, selectedLoan]);

  if (!isOpen || !selectedLoan) return null;

  const principalOwed = parseFloat(selectedLoan.remaining_principal || 0);
  const interestAccrued = parseFloat(selectedLoan.accrued_interest || 0);
  const totalDue = parseFloat(selectedLoan.total_amount_due || 0);
  const daysElapsed = selectedLoan.days_elapsed || 0;
  const daysRemaining = selectedLoan.days_remaining || 0;

  // CORRECT calculation: How much they SAVE by paying NOW vs waiting
  const maxInterest = principalOwed * 0.085; // Total interest if they wait full 30 days
  const potentialSavings = maxInterest - interestAccrued; // Savings by paying early

  const isEarlyPaymentEligible = selectedLoan.full_payment_bonus_eligible;

  const handleAmountChange = (e) => {
    const value = e.target.value;
    setAmount(value);
    setError('');

    const amountNum = parseFloat(value);
    if (amountNum > totalDue) {
      setError(`Amount cannot exceed total due (₦${totalDue.toLocaleString()})`);
    } else if (amountNum <= 0) {
      setError('Amount must be greater than zero');
    }
  };

  const handlePaymentTypeChange = (type) => {
    setPaymentType(type);
    if (type === 'full') {
      setAmount(totalDue.toFixed(2));
    } else {
      setAmount('');
    }
    setError('');
  };

  const handleSubmit = () => {
    const amountNum = parseFloat(amount);

    if (!amount || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amountNum > totalDue) {
      setError(`Amount cannot exceed ₦${totalDue.toLocaleString()}`);
      return;
    }

    onSubmit(selectedLoan.order_id, amountNum);
  };

  const calculateBreakdown = () => {
    const paymentAmount = parseFloat(amount) || 0;

    // Interest first, then principal
    const interestPayment = Math.min(paymentAmount, interestAccrued);
    const principalPayment = Math.min(paymentAmount - interestPayment, principalOwed);

    return {
      interestPayment,
      principalPayment,
      totalPayment: interestPayment + principalPayment
    };
  };

  const breakdown = calculateBreakdown();
  const isFullPayment = parseFloat(amount) >= totalDue - 0.01;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Make Repayment</h2>
            <p className="text-sm text-gray-600">Order #{selectedLoan.order_number}</p>
          </div>
          <button
            onClick={onClose}
            disabled={processing}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Balance */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-red-600" />
                <span className="font-semibold text-red-900">Total Amount Due</span>
              </div>
              <span className="text-3xl font-bold text-red-600">
                ₦{totalDue.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-red-800">
              <span>Principal: ₦{principalOwed.toLocaleString()}</span>
              <span>Interest: ₦{interestAccrued.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Payment Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handlePaymentTypeChange('full')}
                className={`p-4 rounded-lg border-2 transition-all ${paymentType === 'full'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className={`w-5 h-5 ${paymentType === 'full' ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className={`font-semibold ${paymentType === 'full' ? 'text-green-900' : 'text-gray-700'}`}>
                    Full Payment
                  </span>
                </div>
                <p className="text-xs text-gray-600">Pay off entire balance</p>
              </button>

              <button
                onClick={() => handlePaymentTypeChange('partial')}
                className={`p-4 rounded-lg border-2 transition-all ${paymentType === 'partial'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className={`w-5 h-5 ${paymentType === 'partial' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`font-semibold ${paymentType === 'partial' ? 'text-blue-900' : 'text-gray-700'}`}>
                    Partial Payment
                  </span>
                </div>
                <p className="text-xs text-gray-600">Pay custom amount</p>
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">₦</span>
              <input
                type="number"
                value={amount}
                onChange={handleAmountChange}
                disabled={paymentType === 'full' || processing}
                placeholder="Enter amount"
                step="0.01"
                min="0"
                max={totalDue}
                className="w-full pl-10 pr-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>

          {/* Payment Breakdown */}
          {amount && !error && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">Payment Breakdown</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-800">Interest Payment:</span>
                  <span className="font-medium text-blue-900">₦{breakdown.interestPayment.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-800">Principal Payment:</span>
                  <span className="font-medium text-blue-900">₦{breakdown.principalPayment.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t border-blue-200">
                  <div className="flex justify-between">
                    <span className="font-semibold text-blue-900">Total Payment:</span>
                    <span className="font-bold text-blue-900">₦{breakdown.totalPayment.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Savings & Bonuses */}
          {isFullPayment && (
            <div className="space-y-3">
              {/* Early Payment Savings */}
              {daysRemaining > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-900 mb-1">
                        Save ₦{potentialSavings.toLocaleString()} by Paying Now!
                      </p>
                      <p className="text-xs text-green-700">
                        You have {daysRemaining} days remaining. Paying now saves you {daysRemaining} days of interest.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Full Payment Bonus */}
              {isEarlyPaymentEligible && (
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-300 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Gift className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-yellow-900 mb-1">
                        5% Credit Limit Bonus Eligible!
                      </p>
                      <p className="text-xs text-yellow-800">
                        Full payment within 30 days earns you a 5% increase to your credit limit!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={processing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={processing}
              disabled={!amount || !!error || processing}
              className="flex-1"
            >
              {processing ? 'Processing...' : `Pay ₦${parseFloat(amount || 0).toLocaleString()}`}
            </Button>
          </div>

          {/* Info Note */}
          <p className="text-xs text-gray-600 text-center">
            Payments are applied to interest first, then principal
          </p>
        </div>
      </div>
    </div>
  );
}