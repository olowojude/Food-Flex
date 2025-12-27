'use client';

/**
 * Admin - Credits Management Page
 * Save as: frontend/src/app/manage/credits/page.js
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { creditAPI } from '@/lib/api';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  CreditCard, Search, DollarSign, TrendingUp, TrendingDown,
  AlertCircle, CheckCircle, ArrowUp, User, Calendar
} from 'lucide-react';

export default function AdminCreditsPage() {
  const router = useRouter();
  const { isAuthenticated, isAdmin } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  const [repaymentForm, setRepaymentForm] = useState({ amount: '' });
  const [limitForm, setLimitForm] = useState({ new_limit: '' });
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    exhausted: 0,
    suspended: 0,
    totalCredit: 0,
    totalOutstanding: 0,
  });

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      router.push('/');
    } else {
      fetchAccounts();
    }
  }, [isAuthenticated, isAdmin]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await creditAPI.getAllCreditAccounts();
      const accountList = response.data.results || response.data;
      setAccounts(accountList);

      const totalCredit = accountList.reduce(
        (sum, acc) => sum + parseFloat(acc.credit_limit || 0), 0
      );
      const totalOutstanding = accountList.reduce(
        (sum, acc) => sum + parseFloat(acc.outstanding_balance || 0), 0
      );

      setStats({
        total: accountList.length,
        active: accountList.filter(a => a.loan_status === 'ACTIVE').length,
        exhausted: accountList.filter(a => a.loan_status === 'EXHAUSTED').length,
        suspended: accountList.filter(a => a.loan_status === 'SUSPENDED').length,
        totalCredit,
        totalOutstanding,
      });
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRepayment = async (e) => {
    e.preventDefault();
    if (!selectedAccount) return;

    const amount = parseFloat(repaymentForm.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (amount > parseFloat(selectedAccount.outstanding_balance)) {
      alert('Repayment amount cannot exceed outstanding balance');
      return;
    }

    if (!confirm(`Process repayment of ₦${amount.toLocaleString()} for ${selectedAccount.user_email}?`)) {
      return;
    }

    try {
      setProcessing(true);
      await creditAPI.processRepayment(selectedAccount.user_id, {
        amount: amount
      });
      alert('Repayment processed successfully!');
      setShowRepaymentModal(false);
      setRepaymentForm({ amount: '' });
      setSelectedAccount(null);
      fetchAccounts();
    } catch (error) {
      console.error('Error processing repayment:', error);
      alert(error.response?.data?.error || 'Failed to process repayment');
    } finally {
      setProcessing(false);
    }
  };

  const handleIncreaseCreditLimit = async (e) => {
    e.preventDefault();
    if (!selectedAccount) return;

    const newLimit = parseFloat(limitForm.new_limit);
    if (isNaN(newLimit) || newLimit <= 0) {
      alert('Please enter a valid credit limit');
      return;
    }

    if (newLimit <= parseFloat(selectedAccount.credit_limit)) {
      alert('New limit must be greater than current limit');
      return;
    }

    if (!confirm(`Increase credit limit to ₦${newLimit.toLocaleString()} for ${selectedAccount.user_email}?`)) {
      return;
    }

    try {
      setProcessing(true);
      await creditAPI.increaseCreditLimit(selectedAccount.user_id, {
        new_limit: newLimit
      });
      alert('Credit limit increased successfully!');
      setShowLimitModal(false);
      setLimitForm({ new_limit: '' });
      setSelectedAccount(null);
      fetchAccounts();
    } catch (error) {
      console.error('Error increasing limit:', error);
      alert(error.response?.data?.error || 'Failed to increase limit');
    } finally {
      setProcessing(false);
    }
  };

  const openRepaymentModal = (account) => {
    setSelectedAccount(account);
    setShowRepaymentModal(true);
  };

  const openLimitModal = (account) => {
    setSelectedAccount(account);
    setLimitForm({ new_limit: '' });
    setShowLimitModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'EXHAUSTED': return 'bg-red-100 text-red-800';
      case 'SUSPENDED': return 'bg-gray-100 text-gray-800';
      case 'REPAID': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch =
      account.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.user_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
      account.loan_status === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  if (!isAuthenticated || !isAdmin) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Credit Management
          </h1>
          <p className="text-gray-600">
            Manage buyer credit accounts, process repayments, and adjust limits
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Accounts</p>
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Active</p>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.active}</p>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Credit Given</p>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-xl font-bold text-blue-600">
              ₦{stats.totalCredit.toLocaleString()}
            </p>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Outstanding</p>
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-xl font-bold text-red-600">
              ₦{stats.totalOutstanding.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="card p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {['all', 'active', 'exhausted', 'suspended'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    statusFilter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Accounts List */}
        {filteredAccounts.length === 0 ? (
          <div className="card p-12 text-center">
            <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No credit accounts found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAccounts.map((account) => {
              const availableCredit = parseFloat(account.credit_balance || 0);
              const creditLimit = parseFloat(account.credit_limit || 0);
              const outstanding = parseFloat(account.outstanding_balance || 0);
              const usagePercentage = creditLimit > 0
                ? ((outstanding / creditLimit) * 100).toFixed(1)
                : 0;

              return (
                <div key={account.id} className="card p-6 hover:shadow-lg transition">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* User Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {account.user_name || 'Unknown User'}
                          </h3>
                          <p className="text-sm text-gray-600">{account.user_email}</p>
                        </div>
                        <span className={`badge ${getStatusColor(account.loan_status)}`}>
                          {account.loan_status}
                        </span>
                      </div>

                      {/* Credit Details */}
                      <div className="grid md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-600">Available Credit</p>
                          <p className="text-lg font-bold text-green-600">
                            ₦{availableCredit.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Credit Limit</p>
                          <p className="text-lg font-bold text-blue-600">
                            ₦{creditLimit.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Outstanding</p>
                          <p className="text-lg font-bold text-red-600">
                            ₦{outstanding.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Usage Bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Credit Usage</span>
                          <span>{usagePercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              usagePercentage > 80 ? 'bg-red-600' : 'bg-blue-600'
                            }`}
                            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span>Total Used: ₦{parseFloat(account.total_credit_used || 0).toLocaleString()}</span>
                        <span>Total Repaid: ₦{parseFloat(account.total_repaid || 0).toLocaleString()}</span>
                        {account.last_repayment_date && (
                          <span>
                            Last Repayment: {new Date(account.last_repayment_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex md:flex-col gap-2">
                      <Button
                        variant="primary"
                        onClick={() => openRepaymentModal(account)}
                        disabled={outstanding <= 0}
                        className="text-sm whitespace-nowrap"
                      >
                        <DollarSign className="w-4 h-4 mr-1" />
                        Repayment
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => openLimitModal(account)}
                        className="text-sm whitespace-nowrap"
                      >
                        <ArrowUp className="w-4 h-4 mr-1" />
                        Increase Limit
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Repayment Modal */}
        {showRepaymentModal && selectedAccount && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Process Repayment
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                User: <span className="font-medium">{selectedAccount.user_email}</span>
              </p>
              <p className="text-sm text-gray-600 mb-6">
                Outstanding: <span className="font-bold text-red-600">
                  ₦{parseFloat(selectedAccount.outstanding_balance).toLocaleString()}
                </span>
              </p>

              <form onSubmit={handleProcessRepayment}>
                <Input
                  label="Repayment Amount (₦)"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={repaymentForm.amount}
                  onChange={(e) => setRepaymentForm({ amount: e.target.value })}
                  required
                  placeholder="Enter amount"
                />

                <div className="flex gap-3 mt-6">
                  <Button type="submit" variant="primary" loading={processing} className="flex-1">
                    Process
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowRepaymentModal(false);
                      setSelectedAccount(null);
                      setRepaymentForm({ amount: '' });
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Increase Limit Modal */}
        {showLimitModal && selectedAccount && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Increase Credit Limit
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                User: <span className="font-medium">{selectedAccount.user_email}</span>
              </p>
              <p className="text-sm text-gray-600 mb-6">
                Current Limit: <span className="font-bold text-blue-600">
                  ₦{parseFloat(selectedAccount.credit_limit).toLocaleString()}
                </span>
              </p>

              <form onSubmit={handleIncreaseCreditLimit}>
                <Input
                  label="New Credit Limit (₦)"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={limitForm.new_limit}
                  onChange={(e) => setLimitForm({ new_limit: e.target.value })}
                  required
                  placeholder="Enter new limit"
                />

                <div className="flex gap-3 mt-6">
                  <Button type="submit" variant="primary" loading={processing} className="flex-1">
                    Increase
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowLimitModal(false);
                      setSelectedAccount(null);
                      setLimitForm({ new_limit: '' });
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}