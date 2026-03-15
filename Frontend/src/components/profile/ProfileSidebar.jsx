'use client';

import { User, ShoppingBag, CreditCard, Lock, Upload, Camera, Wallet, ShieldCheck } from 'lucide-react';

export default function ProfileSidebar({
  user,
  isBuyer,
  activeTab,
  setActiveTab,
  profileImage,
  uploadingImage,
  onImageChange,
}) {
  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: User, forBuyer: false },
    { id: 'orders', label: 'My Orders', icon: ShoppingBag, forBuyer: true },
    { id: 'credit', label: 'Credit Account', icon: CreditCard, forBuyer: true },
    { id: 'loans', label: 'Active Loans', icon: Wallet, forBuyer: true },
    { id: 'verification', label: 'Verification', icon: ShieldCheck, forBuyer: false }, // NEW
    { id: 'security', label: 'Security', icon: Lock, forBuyer: false },
  ];

  const visibleTabs = tabs.filter(tab => !tab.forBuyer || (tab.forBuyer && isBuyer));

  return (
    <div className="card p-6">
      {/* Profile Picture */}
      <div className="text-center mb-6">
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 mb-3">
            {profileImage ? (
              <img
                src={profileImage}
                alt={user?.first_name || 'User'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-blue-100">
                <User className="w-12 h-12 text-blue-600" />
              </div>
            )}
          </div>

          {/* Upload Button */}
          <label
            htmlFor="profile-image-upload"
            className="absolute bottom-2 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors shadow-lg"
          >
            {uploadingImage ? (
              <Upload className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            <input
              id="profile-image-upload"
              type="file"
              accept="image/*"
              onChange={onImageChange}
              className="hidden"
              disabled={uploadingImage}
            />
          </label>
        </div>

        <h3 className="font-semibold text-gray-900">
          {user?.first_name} {user?.last_name}
        </h3>
        <p className="text-sm text-gray-600">{user?.email}</p>
        <span className="inline-block px-3 py-1 mt-2 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
          {user?.role}
        </span>
      </div>

      {/* Navigation Tabs */}
      <nav className="space-y-1">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}