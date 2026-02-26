'use client';

import Button from '@/components/common/Button';
import { 
  Store, Calendar, TrendingUp, DollarSign, 
  AlertTriangle, CheckCircle, Gift 
} from 'lucide-react';

export default function LoanCard({ loan, onRepayClick, onRefresh }) {
  const principalOwed = parseFloat(loan.remaining_principal || 0);
  const interestAccrued = parseFloat(loan.accrued_interest || 0);
  const totalDue = parseFloat(loan.total_amount_due || 0);
  const daysElapsed = loan.days_elapsed || 0;
  const daysRemaining = loan.days_remaining || 0;
  const isOverdue = loan.is_overdue;
  const isGracePeriod = loan.is_in_grace_period;
  
  // CORRECT calculation: Savings by paying NOW vs waiting until day 30
  const maxInterest = principalOwed * 0.085; // Total interest at day 30
  const potentialSavings = maxInterest - interestAccrued; // How much they save by paying now
  
  const bonusEligible = loan.full_payment_bonus_eligible;

  // Progress calculation (days elapsed out of 30)
  const progressPercentage = Math.min((daysElapsed / 30) * 100, 100);

  // Status color
  let statusColor = 'blue';
  let statusText = 'Active';
  
  if (isOverdue) {
    statusColor = 'red';
    statusText = 'Overdue';
  } else if (isGracePeriod) {
    statusColor = 'orange';
    statusText = 'Grace Period';
  } else if (daysRemaining <= 7) {
    statusColor = 'yellow';
    statusText = 'Due Soon';
  }

  const statusColors = {
    blue: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      border: 'border-blue-300',
      progress: 'bg-blue-600'
    },
    yellow: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-300',
      progress: 'bg-yellow-600'
    },
    orange: {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      border: 'border-orange-300',
      progress: 'bg-orange-600'
    },
    red: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-300',
      progress: 'bg-red-600'
    }
  };

  const colors = statusColors[statusColor];

  return (
    <div className={`card p-6 border-2 ${colors.border} ${isOverdue ? 'shadow-lg shadow-red-100' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${colors.bg}`}>
            <Store className={`w-5 h-5 ${colors.text}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {loan.seller_name}
            </h3>
            <p className="text-xs text-gray-600">
              Order #{loan.order_number}
            </p>
          </div>
        </div>
        
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
          {statusText}
        </span>
      </div>

      {/* Overdue Warning */}
      {isOverdue && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-semibold mb-1">Payment Overdue!</p>
              <p className="text-xs">Grace period has ended. Credit bureau report pending. Please pay immediately to avoid penalties.</p>
            </div>
          </div>
        </div>
      )}

      {/* Amount Breakdown */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <p className="text-xs text-purple-700 mb-1">Principal</p>
          <p className="text-lg font-bold text-purple-900">
            ₦{principalOwed.toLocaleString()}
          </p>
        </div>
        
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <p className="text-xs text-orange-700 mb-1">Interest</p>
          <p className="text-lg font-bold text-orange-900">
            ₦{interestAccrued.toLocaleString()}
          </p>
        </div>
        
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <p className="text-xs text-red-700 mb-1">Total Due</p>
          <p className="text-lg font-bold text-red-900">
            ₦{totalDue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Timeline Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-600" />
            <span className="text-gray-700">
              Day {daysElapsed} of 30
            </span>
          </div>
          <span className={`font-medium ${colors.text}`}>
            {daysRemaining} days left
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${colors.progress}`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Savings Info */}
      {daysRemaining > 0 && !isOverdue && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
            <div className="text-xs text-green-800">
              <p className="font-medium mb-1">Save ₦{potentialSavings.toLocaleString()} by paying now!</p>
              <p>Interest accrues at ₦{dailyInterest.toLocaleString()} per day</p>
            </div>
          </div>
        </div>
      )}

      {/* Bonus Eligibility */}
      {bonusEligible && !isOverdue && (
        <div className="mb-4 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-300 rounded-lg">
          <div className="flex items-start gap-2">
            <Gift className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-900">
              <p className="font-medium">5% Bonus Eligible!</p>
              <p className="text-yellow-800">Pay full amount to unlock credit limit increase</p>
            </div>
          </div>
        </div>
      )}

      {/* Loan Details */}
      <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-gray-200">
        <div>
          <p className="text-xs text-gray-600">Started</p>
          <p className="text-sm font-medium text-gray-900">
            {new Date(loan.loan_start_date).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Due Date</p>
          <p className="text-sm font-medium text-gray-900">
            {new Date(loan.loan_due_date).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Action Button */}
      <Button
        onClick={() => onRepayClick(loan)}
        variant={isOverdue ? 'danger' : 'primary'}
        className="w-full"
      >
        <DollarSign className="w-5 h-5 mr-2" />
        {isOverdue ? 'Pay Now (Overdue)' : 'Make Repayment'}
      </Button>
    </div>
  );
}