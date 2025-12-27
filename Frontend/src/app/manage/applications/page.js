'use client';

/**
 * Admin - Seller Applications Page
 * Save as: frontend/src/app/manage/applications/page.js
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { adminAPI } from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Button from '@/components/common/Button';
import {
  UserCheck, Mail, Phone, MapPin, Store, Calendar,
  CheckCircle, XCircle, Clock, Search
} from 'lucide-react';

export default function ApplicationsPage() {
  const router = useRouter();
  const { isAuthenticated, isAdmin } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      router.push('/');
    } else {
      fetchApplications();
    }
  }, [isAuthenticated, isAdmin]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      // Get all buyers who have seller profiles (pending applications)
      const response = await adminAPI.getAllUsers({ role: 'BUYER' });
      const buyers = response.data;
      
      // Filter only those with seller profiles (applications)
      const pending = buyers.filter(user => user.seller_profile);
      setApplications(pending);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId, userName) => {
    if (!confirm(`Approve ${userName} as a seller? They will be able to list products.`)) {
      return;
    }

    try {
      setProcessing(userId);
      await adminAPI.approveSeller(userId);
      alert(`${userName} has been approved as a seller!`);
      fetchApplications(); // Refresh list
    } catch (error) {
      console.error('Error approving seller:', error);
      alert(error.response?.data?.error || 'Failed to approve seller');
    } finally {
      setProcessing(null);
      setSelectedApp(null);
    }
  };

  const filteredApplications = applications.filter(app =>
    app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${app.first_name} ${app.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.seller_profile?.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            Seller Applications
          </h1>
          <p className="text-gray-600">
            Review and approve people who want to sell on FoodFlex
          </p>
        </div>

        {/* Search */}
        <div className="card p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, email, or business name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Applications</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {applications.length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <div className="card p-12 text-center">
            <UserCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? 'No applications found' : 'No pending applications'}
            </h3>
            <p className="text-gray-600">
              {searchTerm
                ? 'Try adjusting your search'
                : 'All seller applications have been reviewed'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredApplications.map((app) => (
              <div key={app.id} className="card p-6 hover:shadow-lg transition">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* User Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {app.first_name} {app.last_name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <Mail className="w-4 h-4" />
                          {app.email}
                        </div>
                        {app.phone_number && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            {app.phone_number}
                          </div>
                        )}
                      </div>
                      <span className="badge bg-yellow-100 text-yellow-800">
                        <Clock className="w-4 h-4 mr-1" />
                        Pending
                      </span>
                    </div>

                    {/* Business Info */}
                    {app.seller_profile && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Store className="w-5 h-5 text-blue-600" />
                          <h4 className="font-semibold text-gray-900">Business Information</h4>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-600">Business Name:</span>
                            <span className="ml-2 font-medium text-gray-900">
                              {app.seller_profile.business_name}
                            </span>
                          </div>
                          {app.seller_profile.business_description && (
                            <div>
                              <span className="text-gray-600">Description:</span>
                              <p className="mt-1 text-gray-900">
                                {app.seller_profile.business_description}
                              </p>
                            </div>
                          )}
                          {app.seller_profile.business_address && (
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                              <span className="text-gray-900">
                                {app.seller_profile.business_address}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Applied Date */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      Applied on {new Date(app.date_joined).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-3 md:w-48">
                    <Button
                      variant="primary"
                      onClick={() => handleApprove(app.id, `${app.first_name} ${app.last_name}`)}
                      loading={processing === app.id}
                      disabled={processing !== null}
                      className="w-full"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Approve
                    </Button>

                    <button
                      onClick={() => setSelectedApp(selectedApp === app.id ? null : app.id)}
                      className="btn-secondary w-full"
                    >
                      {selectedApp === app.id ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedApp === app.id && (
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-semibold text-gray-900 mb-3">Additional Information</h4>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Account Status:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {app.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Email Verified:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {app.is_verified ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">User ID:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {app.id}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Current Role:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {app.role}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}