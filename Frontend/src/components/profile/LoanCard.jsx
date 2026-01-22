'use client';

import { 
  Store, Calendar, DollarSign, TrendingUp, 
  Clock, AlertCircle, CheckCircle 
} from 'lucide-react';

export default function LoanCard({ loan, onRepayClick, onRefresh }) {
  const daysRemaining = loan.days_remaining;
  const daysElapsed = loan.days_elapsed;
  const progressPercentage = (daysElapsed / 30) * 100;
  
  // Status logic
  const getStatusBadge = () => {
    if (loan.is_overdue) {
      return (
        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
          ⚠️ OVERDUE
        </span>
      );
    }
    if (loan.is_in_grace_period) {
      return (
        <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
          ⏰ GRACE PERIOD
        </span>
      );
    }
    if (daysRemaining <= 7) {
      return (
        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
          ⚡ DUE SOON
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
        ✓ ACTIVE
      </span>
    );
  };

  const getBorderColor = () => {
    if (loan.is_overdue) return 'border-red-300';
    if (loan.is_in_grace_period) return 'border-orange-300';
    if (daysRemaining <= 7) return 'border-yellow-300';
    return 'border-gray-200';
  };

  return (
    <div className={`card p-6 border-2 ${getBorderColor()}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Order #{loan.order_number}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Store className="w-4 h-4" />
            <span>{loan.seller_name}</span>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Timeline Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">
            Day {daysElapsed} of 30
          </span>
          <span className="font-semibold text-gray-900">
            {daysRemaining} days remaining
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              loan.is_overdue ? 'bg-red-500' :
              loan.is_in_grace_period ? 'bg-orange-500' :
              daysRemaining <= 7 ? 'bg-yellow-500' :
              'bg-blue-500'
            }`}
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Amount Breakdown */}
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        {/* Principal */}
        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-900">
              Principal Remaining
            </span>
          </div>
          <p className="text-xl font-bold text-purple-600">
            ₦{parseFloat(loan.remaining_principal).toLocaleString()}
          </p>
          <p className="text-xs text-purple-700 mt-1">
            of ₦{parseFloat(loan.principal_amount).toLocaleString()}
          </p>
        </div>

        {/* Interest */}
        <div className="p-4 bg-orange-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-medium text-orange-900">
              Accrued Interest
            </span>
          </div>
          <p className="text-xl font-bold text-orange-600">
            ₦{parseFloat(loan.accrued_interest).toLocaleString()}
          </p>
          <p className="text-xs text-orange-700 mt-1">
            Max: ₦{parseFloat(loan.total_service_fee).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Total Due */}
      <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg mb-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-red-900">
              Total Amount Due
            </span>
            <p className="text-xs text-red-700 mt-1">
              Principal + Interest
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-red-600">
              ₦{parseFloat(loan.total_amount_due).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Savings Potential */}
      {parseFloat(loan.potential_savings) > 0 && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-green-900 mb-1">
                Pay Now & Save!
              </p>
              <p className="text-green-700">
                If you pay <strong>today</strong>, you'll save <strong>₦{parseFloat(loan.potential_savings).toLocaleString()}</strong> in future interest!
              </p>
              {loan.full_payment_bonus_eligible && (
                <p className="text-green-800 mt-1">
                  <strong>Bonus:</strong> Pay in full within 30 days and get <strong>5% credit limit increase</strong>!
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Warning Messages */}
      {loan.is_overdue && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">
              <p className="font-semibold mb-1">Payment Overdue!</p>
              <p>Your payment is past the grace period. Please repay immediately to avoid credit bureau reporting.</p>
            </div>
          </div>
        </div>
      )}

      {loan.is_in_grace_period && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg mb-4">
          <div className="flex items-start gap-2">
            <Clock className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div className="text-sm text-orange-700">
              <p className="font-semibold mb-1">Grace Period Active</p>
              <p>You have {daysRemaining} days before late fees apply. Please repay soon!</p>
            </div>
          </div>
        </div>
      )}

      {/* Loan Details */}
      <div className="border-t border-gray-200 pt-4 mb-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          Loan Details
        </h4>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-600">Loan Amount:</span>
            <span className="ml-2 font-medium text-gray-900">
              ₦{parseFloat(loan.loan_amount).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Daily Rate:</span>
            <span className="ml-2 font-medium text-gray-900">
              {(parseFloat(loan.daily_interest_rate) * 100).toFixed(4)}%
            </span>
          </div>
          <div>
            <span className="text-gray-600">Start Date:</span>
            <span className="ml-2 font-medium text-gray-900">
              {new Date(loan.loan_start_date).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Due Date:</span>
            <span className="ml-2 font-medium text-gray-900">
              {new Date(loan.loan_due_date).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => onRepayClick(loan)}
          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
        >
          Make Payment
        </button>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}