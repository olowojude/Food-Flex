'use client';

import Button from '@/components/common/Button';

export default function SecurityTab({ user }) {
  return (
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
  );
}