'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { creditAPI } from '@/lib/api';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { 
  User, Mail, Phone, MapPin, CreditCard, DollarSign, 
  TrendingDown, Calendar, Camera, Lock, CheckCircle 
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, updateUser } = useAuth();
  const [creditAccount, setCreditAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('personal'); // personal, credit, security
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    address: '',
    profile_image: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      fetchData();
      setFormData({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        phone_number: user?.phone_number || '',
        address: user?.address || '',
        profile_image: user?.profile_image || '',
      });
    }
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (user?.role === 'BUYER') {
        const [creditRes, transactionsRes] = await Promise.all([
          creditAPI.getMyCreditAccount(),
          creditAPI.getMyCreditTransactions(),
        ]);
        setCreditAccount(creditRes.data);
        setTransactions(transactionsRes.data.slice(0, 5)); // Latest 5 transactions
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setUpdating(true);

    const result = await updateUser(formData);
    setUpdating(false);

    if (result.success) {
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update profile' });
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  const availableCredit = parseFloat(creditAccount?.credit_balance || 0);
  const creditLimit = parseFloat(creditAccount?.credit_limit || 0);
  const outstandingBalance = parseFloat(creditAccount?.outstanding_balance || 0);
  const usagePercentage = creditLimit > 0 ? ((outstandingBalance / creditLimit) * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.type === 'success' && <CheckCircle className="w-5 h-5" />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-4">
              {/* Profile Picture */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    {formData.profile_image ? (
                      <img
                        src={formData.profile_image}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-blue-600" />
                    )}
                  </div>
                  <button className="absolute bottom-2 right-0 bg-white p-2 rounded-full shadow-lg border border-gray-200 hover:bg-gray-50">
                    <Camera className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <h3 className="font-semibold text-gray-900">{user?.first_name} {user?.last_name}</h3>
                <p className="text-sm text-gray-600">{user?.email}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  {user?.role}
                </span>
              </div>

              {/* Navigation */}
              <div className="space-y-1">
                {[
                  { id: 'personal', label: 'Personal Info', icon: User },
                  ...(user?.role === 'BUYER' ? [{ id: 'credit', label: 'Credit Info', icon: CreditCard }] : []),
                  { id: 'security', label: 'Security', icon: Lock },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Personal Info Tab */}
            {activeTab === 'personal' && (
              <div className="card p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Personal Information</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      required
                      placeholder="John"
                    />
                    <Input
                      label="Last Name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      required
                      placeholder="Doe"
                    />
                  </div>

                  <Input
                    label="Email Address"
                    value={user?.email}
                    disabled
                    className="bg-gray-50"
                  />

                  <Input
                    label="Phone Number"
                    name="phone_number"
                    type="tel"
                    value={formData.phone_number}
                    onChange={handleChange}
                    placeholder="+2348012345678"
                  />

                  <Input
                    label="Address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter your address"
                  />

                  <div className="flex gap-4 pt-4">
                    <Button type="submit" variant="primary" loading={updating}>
                      Save Changes
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => router.back()}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Credit Info Tab */}
            {activeTab === 'credit' && user?.role === 'BUYER' && (
              <div className="space-y-6">
                {/* Credit Overview */}
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="card p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Available Credit</p>
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-3xl font-bold text-green-600">
                      ₦{availableCredit.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      of ₦{creditLimit.toLocaleString()} limit
                    </p>
                  </div>

                  <div className="card p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Credit Limit</p>
                      <CreditCard className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold text-blue-600">
                      ₦{creditLimit.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Maximum capacity</p>
                  </div>

                  <div className="card p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Outstanding</p>
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    </div>
                    <p className="text-3xl font-bold text-red-600">
                      ₦{outstandingBalance.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">To be repaid</p>
                  </div>
                </div>

                {/* Credit Status */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Credit Status</h3>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className={`badge ${
                        creditAccount?.loan_status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      } text-base px-4 py-2`}>
                        {creditAccount?.loan_status}
                      </span>
                    </div>
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
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
                    <button className="text-sm text-blue-600 hover:text-blue-700">
                      View All
                    </button>
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
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="card p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Security Settings</h2>
                
                <div className="space-y-6">
                  {/* Change Password */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Change Password</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Update your password to keep your account secure
                    </p>
                    <Button variant="primary">
                      Change Password
                    </Button>
                  </div>

                  {/* Account Info */}
                  <div className="pt-6 border-t">
                    <h3 className="font-semibold text-gray-900 mb-4">Account Information</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Account Created:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(user?.date_joined || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email Verified:</span>
                        <span className={`font-medium ${
                          user?.is_verified ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {user?.is_verified ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}