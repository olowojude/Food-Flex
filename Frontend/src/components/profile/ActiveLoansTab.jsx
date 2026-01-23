'use client';

import { useState, useEffect } from 'react';
import { creditAPI } from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import LoanCard from './LoanCard';
import { 
  CreditCard, TrendingUp, Calendar, DollarSign, 
  AlertCircle, CheckCircle 
} from 'lucide-react';

export default function ActiveLoansTab({ onRepayClick }) {
  const [loans, setLoans] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastFetch, setLastFetch] = useState(Date.now());

  //   Auto-refresh every time component mounts or parent triggers refresh
  useEffect(() => {
    fetchActiveLoans();
  }, [lastFetch]); //   Will refresh when parent changes key

  const fetchActiveLoans = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await creditAPI.getMyActiveLoans();
      setLoans(response.data.active_loans || []);
      setSummary(response.data.summary || null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load active loans');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-8 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6">
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (loans.length === 0) {
    return (
      <div className="card p-12 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No Active Loans
        </h3>
        <p className="text-gray-600">
          You have no outstanding loan balances. Great job! 
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Banner */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Active Loans Summary
        </h2>
        
        <div className="grid sm:grid-cols-3 gap-4">
          {/* Total Loans */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Total Loans
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {summary?.total_active_loans || 0}
            </p>
          </div>

          {/* Principal Owed */}
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">
                Principal Owed
              </span>
            </div>
            <p className="text-2xl font-bold text-purple-600">
              ₦{(summary?.total_principal_owed || 0).toLocaleString()}
            </p>
          </div>

          {/* Accrued Interest */}
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">
                Accrued Interest
              </span>
            </div>
            <p className="text-2xl font-bold text-orange-600">
              ₦{(summary?.total_interest_accrued || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Total Due */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-900">
              Total Amount Due:
            </span>
            <span className="text-2xl font-bold text-red-600">
              ₦{(summary?.total_amount_due || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Individual Loan Cards */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Your Loans ({loans.length})
        </h2>
        
        {loans.map((loan) => (
          <LoanCard
            key={loan.order_id}
            loan={loan}
            onRepayClick={onRepayClick}
            onRefresh={fetchActiveLoans}
          />
        ))}
      </div>

      {/* Payment Tips */}
      <div className="card p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
        <div className="flex items-start gap-3">
          <Calendar className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900 mb-2">
                Save Money with Early Repayment!
            </h3>
            <ul className="space-y-1 text-sm text-green-800">
              <li>• Interest accrues daily at 0.283% per day</li>
              <li>• Pay earlier to reduce total interest paid</li>
              <li>• Full payment within 30 days = 5% credit bonus!  </li>
              <li>• You can make partial payments anytime</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}