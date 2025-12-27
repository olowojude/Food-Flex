'use client';

/**
 * Admin Dashboard - Overview Page
 * Save as: frontend/src/app/manage/page.js
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
  BarChart3, Activity
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    buyers: 0,
    sellers: 0,
    pendingSellers: 0,
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
      const pendingSellers = users.filter(u => 
        u.role === 'BUYER' && u.seller_profile
      ).length;

      const completedOrders = orders.filter(o => o.status === 'COMPLETED');
      const totalRevenue = completedOrders.reduce((sum, o) => 
        sum + parseFloat(o.total_amount), 0
      );

      setStats({
        totalUsers: users.length,
        buyers,
        sellers,
        pendingSellers,
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

  if (!isAuthenticated || !isAdmin) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard Overview
          </h1>
          <p className="text-gray-600">
            Welcome back, {user?.first_name}! Here's what's happening on FoodFlex.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <Link href="/manage/people">
            <div className="card p-6 hover:shadow-lg transition cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total People</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.totalUsers}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-600 font-medium">
                  {stats.buyers} Buyers
                </span>
                <span className="text-purple-600 font-medium">
                  {stats.sellers} Sellers
                </span>
              </div>
            </div>
          </Link>

          {/* Pending Applications */}
          <Link href="/manage/applications">
            <div className="card p-6 hover:shadow-lg transition cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending Applications</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {stats.pendingSellers}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Seller applications awaiting review
              </p>
            </div>
          </Link>

          {/* Total Products */}
          <Link href="/manage/products">
            <div className="card p-6 hover:shadow-lg transition cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Products</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.totalProducts}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Active products in catalog
              </p>
            </div>
          </Link>

          {/* Total Orders */}
          <Link href="/manage/orders">
            <div className="card p-6 hover:shadow-lg transition cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.totalOrders}
                  </p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-full">
                  <ShoppingBag className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-yellow-600 font-medium">
                  {stats.pendingOrders} Pending
                </span>
                <span className="text-green-600 font-medium">
                  {stats.completedOrders} Done
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Revenue */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-green-600">
                  ₦{stats.totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600">
              From {stats.completedOrders} completed orders
            </p>
          </div>

          {/* Active Credits */}
          <Link href="/manage/credits">
            <div className="card p-6 hover:shadow-lg transition cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Credit Accounts</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {stats.activeCredits}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Buyers with active credit
              </p>
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </h2>
            <Link href="/manage/orders" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All Orders →
            </Link>
          </div>

          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${
                      order.status === 'COMPLETED' ? 'bg-green-100' :
                      order.status === 'PENDING' ? 'bg-yellow-100' :
                      order.status === 'CONFIRMED' ? 'bg-blue-100' :
                      'bg-red-100'
                    }`}>
                      {order.status === 'COMPLETED' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : order.status === 'PENDING' ? (
                        <Clock className="w-5 h-5 text-yellow-600" />
                      ) : (
                        <ShoppingBag className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        Order #{order.order_number}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleDateString()} • {order.buyer_name || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
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
            <p className="text-center text-gray-600 py-8">No recent activity</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Link href="/manage/applications">
            <div className="card p-6 hover:shadow-lg transition cursor-pointer text-center">
              <UserCheck className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Review Applications</h3>
              <p className="text-sm text-gray-600">
                Approve or reject seller applications
              </p>
            </div>
          </Link>

          <Link href="/manage/categories">
            <div className="card p-6 hover:shadow-lg transition cursor-pointer text-center">
              <BarChart3 className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Manage Categories</h3>
              <p className="text-sm text-gray-600">
                Add or edit product categories
              </p>
            </div>
          </Link>

          <Link href="/manage/credits">
            <div className="card p-6 hover:shadow-lg transition cursor-pointer text-center">
              <DollarSign className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Credit Management</h3>
              <p className="text-sm text-gray-600">
                Process repayments and adjust limits
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}