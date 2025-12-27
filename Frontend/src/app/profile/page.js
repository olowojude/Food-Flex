'use client';

/**
 * Profile Page with Working Image Upload (Phone Number Read-Only)
 * Path: frontend/src/app/profile/page.js (REPLACE)
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { creditAPI, orderAPI } from '@/lib/api';
import { uploadImage } from '@/lib/cloudinary';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Toast from '@/components/common/Toast';
import { 
  User, Mail, Phone, MapPin, CreditCard, DollarSign, 
  TrendingDown, Calendar, Camera, Lock, CheckCircle,
  Package, ShoppingBag, Eye, Upload
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isBuyer, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  
  const [creditAccount, setCreditAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
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
        address: user?.address || '',
        profile_image: user?.profile_image || '',
      });
    }
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (user?.role === 'BUYER') {
        const [creditRes, transactionsRes, ordersRes] = await Promise.all([
          creditAPI.getMyCreditAccount(),
          creditAPI.getMyCreditTransactions(),
          orderAPI.getMyOrders(),
        ]);
        setCreditAccount(creditRes.data);
        setTransactions(transactionsRes.data.slice(0, 5));
        setOrders(ordersRes.data.results?.slice(0, 5) || ordersRes.data.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle profile image upload
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size must be less than 5MB', 'error');
      return;
    }

    try {
      setUploadingImage(true);
      showToast('Uploading image...', 'warning');

      // Upload to Cloudinary
      const imageUrl = await uploadImage(file, 'profiles');
      
      // Update form data
      setFormData(prev => ({ ...prev, profile_image: imageUrl }));
      
      // Auto-save profile image
      const result = await updateUser({ profile_image: imageUrl });
      
      if (result.success) {
        showToast('Profile picture updated successfully!', 'success');
      } else {
        showToast('Failed to update profile picture', 'error');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast('Failed to upload image. Please try again.', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);

    const result = await updateUser(formData);
    setUpdating(false);

    if (result.success) {
      showToast('Profile updated successfully!', 'success');
    } else {
      showToast(result.error || 'Failed to update profile', 'error');
    }
  };

  if (!isAuthenticated) return null;
  
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
      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your account, orders, and credit</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-4">
              {/* Profile Picture with Upload */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 overflow-hidden">
                    {formData.profile_image ? (
                      <img
                        src={formData.profile_image}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-blue-600" />
                    )}
                  </div>
                  
                  {/* Upload Button */}
                  <button
                    type="button"
                    onClick={handleImageClick}
                    disabled={uploadingImage}
                    className="absolute bottom-2 right-0 bg-white p-2 rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingImage ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Camera className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                  
                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
                
                <h3 className="font-semibold text-gray-900">
                  {user?.first_name} {user?.last_name}
                </h3>
                <p className="text-sm text-gray-600">{user?.email}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  {user?.role}
                </span>
              </div>

              {/* Navigation */}
              <div className="space-y-1">
                {[
                  { id: 'personal', label: 'Personal Info', icon: User },
                  ...(isBuyer ? [
                    { id: 'orders', label: 'My Orders', icon: Package },
                    { id: 'credit', label: 'Credit Info', icon: CreditCard }
                  ] : []),
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
                    value={user?.phone_number || 'Not provided'}
                    disabled
                    className="bg-gray-50"
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
                  </div>
                </form>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && isBuyer && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">My Orders</h2>
                  <Link href="/orders" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View All →
                  </Link>
                </div>

                {orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <Link
                        key={order.id}
                        href={`/orders/${order.id}`}
                        className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">Order #{order.order_number}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Total</span>
                          <span className="font-bold text-gray-900">
                            ₦{parseFloat(order.total_amount).toLocaleString()}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No orders yet</p>
                    <Link href="/products" className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 inline-block">
                      Start Shopping →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Credit Info Tab */}
            {activeTab === 'credit' && isBuyer && (
              <div className="space-y-6">
                {/* Credit Overview */}
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
                    <p className="text-xs text-gray-500 mt-2">To be repaid</p>
                  </div>
                </div>

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
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Security Settings</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Change Password</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Update your password to keep your account secure
                    </p>
                    <Button variant="primary">
                      Change Password
                    </Button>
                  </div>

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