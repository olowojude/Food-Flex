'use client';

/**
 * Admin Dashboard - Overview Page (Mobile Optimized)
 * Save as: frontend/src/app/manage/page.js (REPLACE)
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { adminAPI, shopAPI, orderAPI, creditAPI } from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  Users, ShoppingBag, Package, DollarSign,
  TrendingUp, UserCheck, Clock, CheckCircle,
  BarChart3, Activity, Shield, ExternalLink
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    buyers: 0,
    sellers: 0,
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    activeCredits: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (!isAdmin) {
      router.push('/');
    } else {
      fetchDashboardData();
    }
  }, [isAuthenticated, isAdmin]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [usersRes, productsRes, ordersRes, creditsRes] = await Promise.all([
        adminAPI.getAllUsers(),
        shopAPI.getProducts(),
        adminAPI.getAllOrders(),
        creditAPI.getAllCreditAccounts(),
      ]);

      const users = usersRes.data;
      const products = productsRes.data.results || productsRes.data;
      const orders = ordersRes.data.results || ordersRes.data;
      const credits = creditsRes.data.results || creditsRes.data;

      // Calculate stats
      const buyers = users.filter(u => u.role === 'BUYER').length;
      const sellers = users.filter(u => u.role === 'SELLER').length;

      const completedOrders = orders.filter(o => o.status === 'COMPLETED');
      const totalRevenue = completedOrders.reduce((sum, o) => 
        sum + parseFloat(o.total_amount), 0
      );

      setStats({
        totalUsers: users.length,
        buyers,
        sellers,
        totalProducts: products.length,
        totalOrders: orders.length,
        pendingOrders: orders.filter(o => o.status === 'PENDING').length,
        completedOrders: completedOrders.length,
        totalRevenue,
        activeCredits: credits.filter(c => c.loan_status === 'ACTIVE').length,
      });

      // Recent activity (last 5 orders)
      setRecentActivity(orders.slice(0, 5));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDjangoAdminClick = () => {
    // Open Django admin in new tab
    const djangoAdminUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '/admin/') || 'http://127.0.0.1:8000/admin/';
    window.open(djangoAdminUrl, '_blank');
  };

  if (!isAuthenticated || !isAdmin) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 md:py-8">
      <div className="container mx-auto px-4">
        {/* Header with Django Admin Link */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">
                Dashboard Overview
              </h1>
              <p className="text-sm md:text-base text-gray-600">
                Welcome back, {user?.first_name}! Here's what's happening on FoodFlex.
              </p>
            </div>
            
            {/* Django Admin Button */}
            <button
              onClick={handleDjangoAdminClick}
              className="flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-md hover:shadow-lg w-full md:w-auto text-sm md:text-base"
            >
              <Shield className="w-4 h-4 md:w-5 md:h-5" />
              <span>Django Admin</span>
              <ExternalLink className="w-3 h-3 md:w-4 md:h-4" />
            </button>
          </div>

          {/* Django Admin Info Banner */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
            <div className="flex items-start gap-2 md:gap-3">
              <Shield className="w-4 h-4 md:w-5 md:h-5 text-purple-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-purple-900 mb-1 text-sm md:text-base">
                  Advanced Administration
                </h3>
                <p className="text-xs md:text-sm text-purple-800">
                  For critical operations like managing seller applications, database operations, and advanced configurations, 
                  use the Django Admin panel. Click the button above to access it.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid - Mobile: 2 cols, Desktop: 4 cols */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          {/* Total Users */}
          <Link href="/manage/people">
            <div className="card p-3 md:p-6 hover:shadow-lg transition cursor-pointer">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 md:mb-4">
                <div className="mb-2 md:mb-0">
                  <p className="text-xs md:text-sm text-gray-600 mb-1">Total People</p>
                  <p className="text-xl md:text-3xl font-bold text-gray-900">
                    {stats.totalUsers}
                  </p>
                </div>
                <div className="hidden md:block p-3 bg-blue-100 rounded-full">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-xs md:text-sm">
                <span className="text-green-600 font-medium">
                  {stats.buyers} Buyers
                </span>
                <span className="text-purple-600 font-medium">
                  {stats.sellers} Sellers
                </span>
              </div>
            </div>
          </Link>

          {/* Total Products */}
          <Link href="/manage/products">
            <div className="card p-3 md:p-6 hover:shadow-lg transition cursor-pointer">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 md:mb-4">
                <div className="mb-2 md:mb-0">
                  <p className="text-xs md:text-sm text-gray-600 mb-1">Total Products</p>
                  <p className="text-xl md:text-3xl font-bold text-gray-900">
                    {stats.totalProducts}
                  </p>
                </div>
                <div className="hidden md:block p-3 bg-green-100 rounded-full">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-xs md:text-sm text-gray-600">
                Active products
              </p>
            </div>
          </Link>

          {/* Total Orders */}
          <Link href="/manage/orders">
            <div className="card p-3 md:p-6 hover:shadow-lg transition cursor-pointer">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 md:mb-4">
                <div className="mb-2 md:mb-0">
                  <p className="text-xs md:text-sm text-gray-600 mb-1">Total Orders</p>
                  <p className="text-xl md:text-3xl font-bold text-gray-900">
                    {stats.totalOrders}
                  </p>
                </div>
                <div className="hidden md:block p-3 bg-indigo-100 rounded-full">
                  <ShoppingBag className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-xs md:text-sm">
                <span className="text-yellow-600 font-medium">
                  {stats.pendingOrders} Pending
                </span>
                <span className="text-green-600 font-medium">
                  {stats.completedOrders} Done
                </span>
              </div>
            </div>
          </Link>

          {/* Active Credits */}
          <Link href="/manage/credits">
            <div className="card p-3 md:p-6 hover:shadow-lg transition cursor-pointer">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 md:mb-4">
                <div className="mb-2 md:mb-0">
                  <p className="text-xs md:text-sm text-gray-600 mb-1">Active Credits</p>
                  <p className="text-xl md:text-3xl font-bold text-blue-600">
                    {stats.activeCredits}
                  </p>
                </div>
                <div className="hidden md:block p-3 bg-blue-100 rounded-full">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-xs md:text-sm text-gray-600">
                Active credit
              </p>
            </div>
          </Link>
        </div>

        {/* Revenue Card */}
        <div className="card p-4 md:p-6 mb-6 md:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-1">Total Platform Revenue</p>
              <p className="text-2xl md:text-4xl font-bold text-green-600">
                ₦{stats.totalRevenue.toLocaleString()}
              </p>
              <p className="text-xs md:text-sm text-gray-600 mt-1 md:mt-2">
                From {stats.completedOrders} completed orders
              </p>
            </div>
            <div className="p-3 md:p-4 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 md:w-10 md:h-10 text-green-600" />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-4 md:p-6 mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Recent Activity</span>
              <span className="sm:hidden">Activity</span>
            </h2>
            <Link href="/manage/orders" className="text-xs md:text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All →
            </Link>
          </div>

          {recentActivity.length > 0 ? (
            <div className="space-y-2 md:space-y-3">
              {recentActivity.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 md:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                    <div className={`p-1.5 md:p-2 rounded-full shrink-0 ${
                      order.status === 'COMPLETED' ? 'bg-green-100' :
                      order.status === 'PENDING' ? 'bg-yellow-100' :
                      order.status === 'CONFIRMED' ? 'bg-blue-100' :
                      'bg-red-100'
                    }`}>
                      {order.status === 'COMPLETED' ? (
                        <CheckCircle className="w-3 h-3 md:w-5 md:h-5 text-green-600" />
                      ) : order.status === 'PENDING' ? (
                        <Clock className="w-3 h-3 md:w-5 md:h-5 text-yellow-600" />
                      ) : (
                        <ShoppingBag className="w-3 h-3 md:w-5 md:h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-xs md:text-base truncate">
                        #{order.order_number}
                      </p>
                      <p className="text-xs md:text-sm text-gray-600 truncate">
                        {new Date(order.created_at).toLocaleDateString()} • {order.buyer_name || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="font-bold text-gray-900 text-xs md:text-base">
                      ₦{parseFloat(order.total_amount).toLocaleString()}
                    </p>
                    <span className={`text-xs font-medium ${
                      order.status === 'COMPLETED' ? 'text-green-600' :
                      order.status === 'PENDING' ? 'text-yellow-600' :
                      order.status === 'CONFIRMED' ? 'text-blue-600' :
                      'text-red-600'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600 py-8 text-sm">No recent activity</p>
          )}
        </div>

        {/* Quick Actions - Mobile: 1 col, Tablet: 2 cols, Desktop: 3 cols */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <Link href="/manage/people">
            <div className="card p-4 md:p-6 hover:shadow-lg transition cursor-pointer text-center">
              <Users className="w-10 h-10 md:w-12 md:h-12 text-blue-600 mx-auto mb-2 md:mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1 md:mb-2 text-sm md:text-base">Manage Users</h3>
              <p className="text-xs md:text-sm text-gray-600">
                View and manage all users on the platform
              </p>
            </div>
          </Link>

          <Link href="/manage/categories">
            <div className="card p-4 md:p-6 hover:shadow-lg transition cursor-pointer text-center">
              <BarChart3 className="w-10 h-10 md:w-12 md:h-12 text-purple-600 mx-auto mb-2 md:mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1 md:mb-2 text-sm md:text-base">Manage Categories</h3>
              <p className="text-xs md:text-sm text-gray-600">
                Add or edit product categories
              </p>
            </div>
          </Link>

          <Link href="/manage/credits">
            <div className="card p-4 md:p-6 hover:shadow-lg transition cursor-pointer text-center sm:col-span-2 lg:col-span-1">
              <DollarSign className="w-10 h-10 md:w-12 md:h-12 text-green-600 mx-auto mb-2 md:mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1 md:mb-2 text-sm md:text-base">Credit Management</h3>
              <p className="text-xs md:text-sm text-gray-600">
                Process repayments and adjust limits
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}