'use client';


import { useState } from 'react';
import { X, CreditCard, AlertCircle, CheckCircle, Gift, TrendingUp } from 'lucide-react';
import Button from './Button';
import Input from './Input';

export default function RepaymentModal({ 
  creditAccount, 
  onRepaymentSuccess, 
  onClose 
}) {
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const outstandingBalance = parseFloat(creditAccount?.outstanding_balance || 0);
  const availableCredit = parseFloat(creditAccount?.credit_balance || 0);
  const creditLimit = parseFloat(creditAccount?.credit_limit || 0);
  const usagePercentage = creditLimit > 0 ? ((outstandingBalance / creditLimit) * 100).toFixed(1) : 0;

  // Calculate if eligible for bonus (repaying when usage < 50%)
  const isEligibleForBonus = usagePercentage < 50;
  const bonusAmount = (creditLimit * 0.05).toFixed(2); // 5% of current limit

  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Only allow numbers and decimals
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError('');
    }
  };

  const setQuickAmount = (percentage) => {
    const quickAmount = (outstandingBalance * percentage).toFixed(2);
    setAmount(quickAmount);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const repaymentAmount = parseFloat(amount);

    // Validation
    if (!amount || repaymentAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (repaymentAmount > outstandingBalance) {
      setError(`Cannot repay more than outstanding balance (₦${outstandingBalance.toLocaleString()})`);
      return;
    }

    // Minimum repayment check (at least ₦100)
    if (repaymentAmount < 100) {
      setError('Minimum repayment amount is ₦100');
      return;
    }

    setProcessing(true);

    try {
      await onRepaymentSuccess(repaymentAmount);
    } catch (err) {
      setError(err.message || 'Repayment failed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-linear-to-r from-green-600 to-emerald-600 p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold">Repay Your Loan</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-green-100">
            Reduce your outstanding balance and improve your credit
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Balance Info */}
          <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">Outstanding Balance</span>
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              ₦{outstandingBalance.toLocaleString()}
            </p>
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Available: ₦{availableCredit.toLocaleString()}</span>
              <span>Limit: ₦{creditLimit.toLocaleString()}</span>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Credit Usage</span>
                <span className="font-semibold">{usagePercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    usagePercentage > 80 ? 'bg-red-500' : 
                    usagePercentage > 50 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Bonus Eligibility Banner */}
          {isEligibleForBonus && outstandingBalance > 0 && (
            <div className="bg-linear-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 rounded-full">
                  <Gift className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-purple-900 mb-1">
                    Early Repayment Bonus!
                  </h3>
                  <p className="text-sm text-purple-800 mb-2">
                    You're eligible for a <strong>5% credit limit increase</strong> (₦{parseFloat(bonusAmount).toLocaleString()}) if you repay while your usage is below 50%!
                  </p>
                  <div className="flex items-center gap-2 text-xs text-purple-700">
                    <TrendingUp className="w-4 h-4" />
                    <span>New limit after repayment: ₦{(creditLimit + parseFloat(bonusAmount)).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Warning for high usage */}
          {!isEligibleForBonus && outstandingBalance > 0 && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Repay more to qualify for the 5% credit limit bonus! 
                    (Currently at {usagePercentage}% usage, need to be below 50%)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Repayment Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repayment Amount (₦)
              </label>
              <Input
                type="text"
                value={amount}
                onChange={handleAmountChange}
                placeholder="Enter amount to repay"
                error={error}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum: ₦100 • Maximum: ₦{outstandingBalance.toLocaleString()}
              </p>
            </div>

            {/* Quick Amount Buttons */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Quick Select:</p>
              <div className="grid grid-cols-4 gap-2">
                {[0.25, 0.5, 0.75, 1].map((percentage) => (
                  <button
                    key={percentage}
                    type="button"
                    onClick={() => setQuickAmount(percentage)}
                    className="px-3 py-2 bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-600 rounded-lg text-sm font-medium transition"
                  >
                    {percentage === 1 ? 'Full' : `${percentage * 100}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Repayment Summary */}
            {amount && parseFloat(amount) > 0 && parseFloat(amount) <= outstandingBalance && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-green-900 mb-2">Repayment Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Repayment Amount:</span>
                    <span className="font-bold text-green-600">₦{parseFloat(amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">New Balance:</span>
                    <span className="font-semibold text-gray-900">
                      ₦{(outstandingBalance - parseFloat(amount)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">New Available Credit:</span>
                    <span className="font-semibold text-blue-600">
                      ₦{(availableCredit + parseFloat(amount)).toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Show bonus info if eligible */}
                  {isEligibleForBonus && (
                    <>
                      <div className="border-t border-green-300 my-2 pt-2">
                        <div className="flex items-center gap-2 text-purple-600 mb-1">
                          <Gift className="w-4 h-4" />
                          <span className="font-semibold">On-Time Bonus Applied!</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Credit Limit Increase:</span>
                        <span className="font-bold text-purple-600">
                          +₦{parseFloat(bonusAmount).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">New Credit Limit:</span>
                        <span className="font-bold text-green-600">
                          ₦{(creditLimit + parseFloat(bonusAmount)).toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                variant="success"
                loading={processing}
                disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > outstandingBalance}
                className="flex-1 py-3 text-lg"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                {processing ? 'Processing...' : 'Confirm Repayment'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={processing}
                className="px-6"
              >
                Cancel
              </Button>
            </div>
          </form>

          {/* Info Footer */}
          <div className="bg-gray-50 -mx-6 -mb-6 px-6 py-4 mt-6">
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>
                Repayment is instant. Your available credit will be updated immediately. 
                {isEligibleForBonus && ' The 5% bonus will be applied automatically!'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}