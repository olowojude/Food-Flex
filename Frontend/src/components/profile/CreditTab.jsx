'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/common/Button';
import { creditAPI } from '@/lib/api';
import { 
  Wallet, Gift, CreditCard, TrendingDown, 
  Calendar, TrendingUp, DollarSign 
} from 'lucide-react';

export default function CreditTab({ 
  creditAccount, 
  transactions, 
  onRepaymentClick 
}) {
  const [activeLoans, setActiveLoans] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveLoans();
  }, []);

  const fetchActiveLoans = async () => {
    try {
      setLoading(true);
      const response = await creditAPI.getMyActiveLoans();
      setActiveLoans(response.data.summary);
    } catch (err) {
      console.error('Failed to fetch active loans:', err);
    } finally {
      setLoading(false);
    }
  };

  const availableCredit = parseFloat(creditAccount?.credit_balance || 0);
  const creditLimit = parseFloat(creditAccount?.credit_limit || 0);
  
  // Use active loans data for accurate outstanding balance
  const totalPrincipal = parseFloat(activeLoans?.total_principal_owed || 0);
  const totalInterest = parseFloat(activeLoans?.total_interest_accrued || 0);
  const outstandingBalance = totalPrincipal + totalInterest; // Principal + Interest
  
  const usagePercentage = creditLimit > 0 ? ((creditLimit - availableCredit) / creditLimit * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Outstanding Balance Banner */}
      {outstandingBalance > 0 && (
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-6 h-6" />
                <h3 className="text-xl font-bold">Outstanding Balance</h3>
              </div>
              <div className="mb-3">
                <p className="text-3xl font-bold mb-1">
                  ₦{outstandingBalance.toLocaleString()}
                </p>
                <div className="flex items-center gap-4 text-sm text-green-100">
                  <span>Principal: ₦{totalPrincipal.toLocaleString()}</span>
                  <span>•</span>
                  <span>Interest: ₦{totalInterest.toLocaleString()}</span>
                </div>
              </div>
              <p className="text-green-100 text-sm mb-4">
                Pay FULL balance within 30 days to get 5% credit limit bonus!
              </p>
              <Button
                onClick={onRepaymentClick}
                variant="secondary"
                className="bg-white text-green-600 hover:bg-green-50 border-0 font-bold"
              >
                <Wallet className="w-5 h-5 mr-2" />
                View Active Loans
              </Button>
            </div>
            <div className="hidden md:block">
              <Gift className="w-20 h-20 text-white opacity-20" />
            </div>
          </div>
        </div>
      )}

      {/* Credit Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Available Credit</p>
          </div>
          <p className="text-3xl font-bold text-green-600">
            ₦{availableCredit.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            of ₦{creditLimit.toLocaleString()} limit
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Credit Limit</p>
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-600">
            ₦{creditLimit.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-2">Maximum capacity</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Outstanding</p>
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-600">
            ₦{outstandingBalance.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {activeLoans?.total_active_loans || 0} active {activeLoans?.total_active_loans === 1 ? 'loan' : 'loans'}
          </p>
        </div>
      </div>

      {/* Loan Breakdown */}
      {outstandingBalance > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Loan Breakdown</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Principal */}
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">
                  Total Principal
                </span>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                ₦{totalPrincipal.toLocaleString()}
              </p>
              <p className="text-xs text-purple-700 mt-1">
                Original borrowed amount
              </p>
            </div>

            {/* Interest */}
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">
                  Accrued Interest
                </span>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                ₦{totalInterest.toLocaleString()}
              </p>
              <p className="text-xs text-orange-700 mt-1">
                Growing daily at 0.00283%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Credit Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Credit Status</h3>
        <div className="flex items-center justify-between mb-4">
          <span className={`px-4 py-2 rounded-full text-base font-medium ${
            creditAccount?.loan_status === 'ACTIVE' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {creditAccount?.loan_status}
          </span>
          <div className="text-right">
            <p className="text-sm text-gray-600">Usage</p>
            <p className="text-2xl font-bold text-gray-900">{usagePercentage}%</p>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              usagePercentage > 80 ? 'bg-red-600' : 'bg-blue-600'
            }`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          ></div>
        </div>
        {creditAccount?.last_repayment_date && (
          <p className="text-sm text-gray-600 mt-4">
            Last repayment: {new Date(creditAccount.last_repayment_date).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
          <Link href="/credit" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View All →
          </Link>
        </div>
        {transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.map((txn) => (
              <div key={txn.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    txn.transaction_type === 'PURCHASE' 
                      ? 'bg-red-100' 
                      : 'bg-green-100'
                  }`}>
                    {txn.transaction_type === 'PURCHASE' ? (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    ) : (
                      <Calendar className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {txn.transaction_type.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(txn.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className={`font-bold ${
                  txn.transaction_type === 'PURCHASE' 
                    ? 'text-red-600' 
                    : 'text-green-600'
                }`}>
                  {txn.transaction_type === 'PURCHASE' ? '-' : '+'}
                  ₦{parseFloat(txn.amount).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-600 py-4">No transactions yet</p>
        )}
      </div>
    </div>
  );
}