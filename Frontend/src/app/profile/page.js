'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { creditAPI, orderAPI } from '@/lib/api';
import { uploadImage } from '@/lib/cloudinary';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Toast from '@/components/common/Toast';
import CancelOrderModal from '@/components/orders/CancelOrderModal';

// Import components
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import PersonalInfoTab from '@/components/profile/PersonalInfoTab';
import OrdersTab from '@/components/profile/OrdersTab';
import CreditTab from '@/components/profile/CreditTab';
import SecurityTab from '@/components/profile/SecurityTab';
import ActiveLoansTab from '@/components/profile/ActiveLoansTab';
import RepaymentModal from '@/components/profile/RepaymentModal';

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading, isBuyer, updateUser } = useAuth();
  
  const [creditAccount, setCreditAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // ✅ NEW: Track refresh trigger for child components
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Cancel order state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    address: '',
    profile_image: '',
  });

  // Check for repayment success
  useEffect(() => {
    const repaymentStatus = searchParams.get('repayment');
    if (repaymentStatus === 'success') {
      showToast('Repayment successful! Your account has been updated.', 'success');
      fetchData();
      
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (isAuthenticated) {
      fetchData();
      setFormData({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        address: user?.address || '',
        profile_image: user?.profile_image || '',
      });
    }
  }, [isAuthenticated, isLoading, user, router]);

  // ✅ ENHANCED: Comprehensive data fetch
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
        
        const ordersData = ordersRes.data.results || ordersRes.data.orders || ordersRes.data;
        setOrders(Array.isArray(ordersData) ? ordersData.slice(0, 5) : []);
        
        // ✅ Trigger refresh in child components
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Failed to refresh data', 'error');
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

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size must be less than 5MB', 'error');
      return;
    }

    try {
      setUploadingImage(true);
      showToast('Uploading image...', 'warning');

      const imageUrl = await uploadImage(file, 'profiles');
      setFormData(prev => ({ ...prev, profile_image: imageUrl }));
      
      const result = await updateUser({ profile_image: imageUrl });
      
      if (result.success) {
        showToast('Profile picture updated successfully!', 'success');
      } else {
        showToast('Failed to update profile picture', 'error');
      }
    } catch (error) {
      showToast('Failed to upload image. Please try again.', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePersonalInfoSubmit = async () => {
    setUpdating(true);

    const result = await updateUser(formData);
    setUpdating(false);

    if (result.success) {
      showToast('Profile updated successfully!', 'success');
    } else {
      showToast(result.error || 'Failed to update profile', 'error');
    }
  };

  const handleRepaymentClick = (loan) => {
    setSelectedLoan(loan);
    setShowRepaymentModal(true);
  };

  // ✅ ENHANCED: Repayment with full refresh
  const handleRepaymentSubmit = async (orderId, amount) => {
    try {
      setProcessingPayment(true);
      
      // Step 1: Initiate repayment
      showToast('Calculating payment breakdown...', 'warning');
      const initiateRes = await creditAPI.initiateLoanRepayment({
        order_id: orderId,
        amount: amount
      });
      
      const paymentSession = initiateRes.data.payment_session;
      
      // Step 2: Dummy payment (2 seconds)
      showToast('Processing payment...', 'warning');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 3: Confirm repayment
      const confirmRes = await creditAPI.confirmLoanRepayment({
        payment_session: paymentSession,
        payment_reference: `DUMMY_REPAY_${Date.now()}`
      });
      
      showToast(confirmRes.data.message || 'Repayment successful!', 'success');
      
      // ✅ CRITICAL: Close modal FIRST, then refresh
      setShowRepaymentModal(false);
      setSelectedLoan(null);
      setProcessingPayment(false);
      
      // ✅ Wait a bit for backend to finalize
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // ✅ Comprehensive refresh
      await fetchData();
      
      // ✅ Show updated credit
      const creditRes = await creditAPI.getMyCreditAccount();
      showToast(
        `✅ Payment processed! Available credit: ₦${parseFloat(creditRes.data.credit_balance).toLocaleString()}`,
        'success'
      );
      
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to process payment', 'error');
      setProcessingPayment(false);
    }
  };

  // ✅ ENHANCED: Cancellation with full refresh
  const handleCancelOrder = async (orderId, reason) => {
    try {
      const response = await orderAPI.cancelOrder(orderId, { reason });
      
      // ✅ Show detailed refund info
      const refundInfo = response.data.refunded_amount || {};
      const creditRefund = refundInfo.credit_refund || 0;
      const upfrontRefund = refundInfo.upfront_refund || 0;
      
      showToast(
        response.data.message || 
        `Order cancelled! Credit refund: ₦${creditRefund.toLocaleString()}, Upfront refund: ₦${upfrontRefund.toLocaleString()}`,
        'success'
      );
      
      // ✅ Wait for backend to process
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // ✅ Comprehensive refresh
      await fetchData();
      
      // ✅ Show updated credit
      const creditRes = await creditAPI.getMyCreditAccount();
      showToast(
        `✅ Credit restored! Available: ₦${parseFloat(creditRes.data.credit_balance).toLocaleString()}`,
        'success'
      );
      
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to cancel order', 'error');
      throw err;
    }
  };

  const openCancelModal = (order) => {
    setSelectedOrder(order);
    setShowCancelModal(true);
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Modals */}
      <RepaymentModal
        isOpen={showRepaymentModal}
        onClose={() => {
          setShowRepaymentModal(false);
          setSelectedLoan(null);
        }}
        selectedLoan={selectedLoan}
        onSubmit={handleRepaymentSubmit}
        processing={processingPayment}
      />

      {selectedOrder && (
        <CancelOrderModal
          order={selectedOrder}
          isOpen={showCancelModal}
          onClose={() => {
            setShowCancelModal(false);
            setSelectedOrder(null);
          }}
          onConfirm={handleCancelOrder}
        />
      )}

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
            <ProfileSidebar
              user={user}
              isBuyer={isBuyer}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              profileImage={formData.profile_image}
              uploadingImage={uploadingImage}
              onImageChange={handleImageChange}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'personal' && (
              <PersonalInfoTab
                user={user}
                formData={formData}
                onChange={handleChange}
                onSubmit={handlePersonalInfoSubmit}
                updating={updating}
              />
            )}

            {activeTab === 'orders' && isBuyer && (
              <OrdersTab
                orders={orders}
                onCancelOrder={openCancelModal}
                key={`orders-${refreshTrigger}`} // ✅ Force refresh
              />
            )}

            {activeTab === 'credit' && isBuyer && (
              <CreditTab
                creditAccount={creditAccount}
                transactions={transactions}
                onRepaymentClick={() => setActiveTab('loans')}
                key={`credit-${refreshTrigger}`} // ✅ Force refresh
              />
            )}

            {activeTab === 'loans' && isBuyer && (
              <ActiveLoansTab
                onRepayClick={handleRepaymentClick}
                key={`loans-${refreshTrigger}`} // ✅ Force refresh
              />
            )}

            {activeTab === 'security' && (
              <SecurityTab user={user} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}