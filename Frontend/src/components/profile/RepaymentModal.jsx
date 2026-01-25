'use client';

import { useState } from 'react';
import { X, DollarSign, TrendingUp, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import Button from '@/components/common/Button';

export default function RepaymentModal({ 
  isOpen, 
  onClose, 
  selectedLoan,
  onSubmit, 
  processing 
}) {
  const [amount, setAmount] = useState('');
  const [breakdown, setBreakdown] = useState(null);
  const [error, setError] = useState(''); // ✅ NEW: Validation errors

  if (!isOpen || !selectedLoan) return null;

  const totalDue = parseFloat(selectedLoan.total_amount_due || 0);
  const remainingPrincipal = parseFloat(selectedLoan.remaining_principal || 0);
  const accruedInterest = parseFloat(selectedLoan.accrued_interest || 0);
  const potentialSavings = parseFloat(selectedLoan.potential_savings || 0);

  const handleAmountChange = (e) => {
    const value = e.target.value;
    
    // Clear error when user types
    setError('');
    
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      calculateBreakdown(parseFloat(value) || 0);
    }
  };

  const calculateBreakdown = (paymentAmount) => {
    // ✅ Clear error
    setError('');
    
    if (paymentAmount <= 0) {
      setBreakdown(null);
      return;
    }

    // ✅ Validate amount
    if (paymentAmount > totalDue) {
      setError(`Amount cannot exceed total due of ₦${totalDue.toLocaleString()}`);
      setBreakdown(null);
      return;
    }

    // Calculate payment allocation (interest first, then principal)
    const interestPayment = Math.min(paymentAmount, accruedInterest);
    const remainingAfterInterest = paymentAmount - interestPayment;
    const principalPayment = Math.min(remainingAfterInterest, remainingPrincipal);

    // Calculate new balances
    const newInterest = accruedInterest - interestPayment;
    const newPrincipal = remainingPrincipal - principalPayment;
    const newTotalDue = newInterest + newPrincipal;
    const willBeFullyPaid = newTotalDue <= 0.01; // Allow small rounding

    // Calculate savings (avoided future interest)
    const daysRemaining = selectedLoan.days_remaining;
    const dailyInterestRate = parseFloat(selectedLoan.daily_interest_rate);
    const futureDailyInterest = newPrincipal * dailyInterestRate;
    const savedInterest = futureDailyInterest * daysRemaining;

    setBreakdown({
      interestPayment,
      principalPayment,
      newInterest,
      newPrincipal,
      newTotalDue,
      willBeFullyPaid,
      savedInterest,
      bonusEligible: willBeFullyPaid && selectedLoan.full_payment_bonus_eligible,
    });
  };

  const setQuickAmount = (percentage) => {
    const calculatedAmount = (totalDue * percentage / 100).toFixed(2);
    setAmount(calculatedAmount);
    setError(''); // Clear error
    calculateBreakdown(parseFloat(calculatedAmount));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const paymentAmount = parseFloat(amount);
    
    // ✅ Enhanced validation
    if (!paymentAmount || paymentAmount <= 0) {
      setError('Please enter an amount greater than zero');
      return;
    }

    if (paymentAmount > totalDue) {
      setError(`Amount cannot exceed total due of ₦${totalDue.toLocaleString()}`);
      return;
    }

    // ✅ Minimum payment validation (optional - at least ₦100)
    if (paymentAmount < 100 && paymentAmount < totalDue) {
      setError('Minimum payment is ₦100 (unless paying full amount)');
      return;
    }

    await onSubmit(selectedLoan.order_id, paymentAmount);
    setAmount('');
    setBreakdown(null);
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Make Loan Payment
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={processing}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Loan Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">
              Order #{selectedLoan.order_number}
            </h3>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-blue-700">Seller:</span>
                <span className="ml-2 font-medium text-blue-900">
                  {selectedLoan.seller_name}
                </span>
              </div>
              <div>
                <span className="text-blue-700">Days Remaining:</span>
                <span className="ml-2 font-medium text-blue-900">
                  {selectedLoan.days_remaining} days
                </span>
              </div>
            </div>
          </div>

          {/* Current Balance */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Current Balance</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="p-3 bg-purple-50 rounded-lg">
                <span className="text-xs text-purple-700">Principal</span>
                <p className="text-lg font-bold text-purple-600">
                  ₦{remainingPrincipal.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <span className="text-xs text-orange-700">Interest</span>
                <p className="text-lg font-bold text-orange-600">
                  ₦{accruedInterest.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <span className="text-xs text-red-700">Total Due</span>
                <p className="text-lg font-bold text-red-600">
                  ₦{totalDue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Payment Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                ₦
              </span>
              <input
                type="text"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.00"
                className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={processing}
              />
            </div>
            
            {/* ✅ Error Message */}
            {error && (
              <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            
            {/* Quick Amount Buttons */}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setQuickAmount(25)}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                disabled={processing}
              >
                25%
              </button>
              <button
                type="button"
                onClick={() => setQuickAmount(50)}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                disabled={processing}
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => setQuickAmount(75)}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                disabled={processing}
              >
                75%
              </button>
              <button
                type="button"
                onClick={() => setQuickAmount(100)}
                className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 text-green-700 font-semibold rounded transition-colors"
                disabled={processing}
              >
                Pay Full
              </button>
            </div>
          </div>

          {/* Payment Breakdown */}
          {breakdown && !error && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
              <h3 className="font-semibold text-gray-900">Payment Breakdown</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment to Interest:</span>
                  <span className="font-medium text-gray-900">
                    ₦{breakdown.interestPayment.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment to Principal:</span>
                  <span className="font-medium text-gray-900">
                    ₦{breakdown.principalPayment.toLocaleString()}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-300">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">New Principal:</span>
                    <span className="font-medium text-gray-900">
                      ₦{breakdown.newPrincipal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">New Interest:</span>
                    <span className="font-medium text-gray-900">
                      ₦{breakdown.newInterest.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-gray-900">New Total Due:</span>
                    <span className="text-gray-900">
                      ₦{breakdown.newTotalDue.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Savings Message */}
              {breakdown.savedInterest > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-green-800">
                      {/* <p className="font-semibold mb-1">You'll Save!</p>
                      <p>
                        By paying ₦{parseFloat(amount).toLocaleString()} now, you'll avoid <strong>₦{breakdown.savedInterest.toLocaleString()}</strong> in future interest!
                      </p> */}
                    </div>
                  </div>
                </div>
              )}

              {/* Bonus Message */}
              {breakdown.bonusEligible && breakdown.willBeFullyPaid && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-semibold mb-1">Bonus Alert!</p>
                      <p>
                        You're eligible for a <strong>5% credit limit increase</strong> by paying in full within 30 days!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Fully Paid Message */}
              {breakdown.willBeFullyPaid && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">
                      This will fully pay off your loan!
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={processing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={processing}
              disabled={!amount || parseFloat(amount) <= 0 || !!error}
              className="flex-1"
            >
              {processing ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}