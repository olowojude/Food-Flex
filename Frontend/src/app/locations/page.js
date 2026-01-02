// frontend/src/app/inventory/locations/page.js
// CREATE THIS NEW FILE

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { locationAPI, getUserLocation } from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Toast from '@/components/common/Toast';
import { MapPin, Plus, Edit, Trash2, Navigation, X } from 'lucide-react';
import Link from 'next/link';

export default function StoreLocationsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, isSeller } = useAuth();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    latitude: '',
    longitude: ''
  });
  const [gettingLocation, setGettingLocation] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isLoading && !isSeller) {
      router.push('/');
    } else if (isAuthenticated && isSeller) {
      fetchLocations();
    }
  }, [isAuthenticated, isLoading, isSeller, router]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const response = await locationAPI.getStoreLocations();
      setLocations(response.data);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      showToast('Failed to load locations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGetCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const location = await getUserLocation();
      setFormData(prev => ({
        ...prev,
        latitude: location.lat.toFixed(6),
        longitude: location.lng.toFixed(6)
      }));
      showToast('Location captured successfully!', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to get location', 'error');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        await locationAPI.updateStoreLocation(editingId, formData);
        showToast('Store location updated!', 'success');
      } else {
        await locationAPI.createStoreLocation(formData);
        showToast('Store location added!', 'success');
      }
      
      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        address: '',
        city: '',
        state: '',
        latitude: '',
        longitude: ''
      });
      fetchLocations();
    } catch (error) {
      console.error('Failed to save location:', error);
      showToast('Failed to save location', 'error');
    }
  };

  const handleEdit = (location) => {
    setFormData({
      name: location.name,
      address: location.address,
      city: location.city,
      state: location.state,
      latitude: location.latitude,
      longitude: location.longitude
    });
    setEditingId(location.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    
    try {
      setDeleting(id);
      await locationAPI.deleteStoreLocation(id);
      showToast('Location deleted successfully', 'success');
      fetchLocations();
    } catch (error) {
      showToast('Failed to delete location', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      latitude: '',
      longitude: ''
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (!isAuthenticated || !isSeller) return null;

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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Store Locations</h1>
              <p className="text-gray-600">Manage your pickup locations for products</p>
            </div>
            <div className="flex gap-3">
              <Link href="/inventory">
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                  ← Back to Inventory
                </button>
              </Link>
              <button
                onClick={() => {
                  if (showForm) {
                    handleCancel();
                  } else {
                    setShowForm(true);
                  }
                }}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
              >
                {showForm ? (
                  <>
                    <X className="w-5 h-5" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Add Location
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">
                  Why add store locations?
                </p>
                <p className="text-xs text-blue-700">
                  Buyers can find your products using GPS search. Each product can be available at multiple locations. Use accurate GPS coordinates for best results.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingId ? 'Edit Location' : 'Add New Location'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Wuse 2 Branch, Main Store, Gwarinpa Outlet"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Abuja"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., FCT"
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  placeholder="Enter the complete address buyers will use for pickup..."
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows="3"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Latitude <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="e.g., 9.057353"
                    value={formData.latitude}
                    onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Longitude <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="e.g., 7.491302"
                    value={formData.longitude}
                    onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <p className="text-sm text-gray-600 mb-3">
                  💡 <strong>Tip:</strong> Click "Use Current Location" or find coordinates using{' '}
                  <a 
                    href="https://www.google.com/maps" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Google Maps
                  </a>
                  {' '}(right-click on map → first numbers are latitude, second are longitude)
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={gettingLocation}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {gettingLocation ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        Getting Location...
                      </>
                    ) : (
                      <>
                        <Navigation className="w-5 h-5" />
                        Use Current Location
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!formData.name || !formData.address || !formData.city || !formData.state || !formData.latitude || !formData.longitude}
                    className="flex-1 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingId ? 'Update Location' : 'Save Location'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Locations List */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : locations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Store Locations Yet</h3>
            <p className="text-gray-600 mb-6">
              Add your first store location to enable GPS-based product discovery for buyers
            </p>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add First Location
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.map(location => (
              <div key={location.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg text-gray-900">{location.name}</h3>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                    {location.product_count} Products
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                    <p className="text-sm text-gray-600">{location.address}</p>
                  </div>
                  <p className="text-sm font-medium text-gray-700 ml-6">
                    {location.city}, {location.state}
                  </p>
                  <p className="text-xs text-gray-400 ml-6">
                    GPS: {location.latitude}, {location.longitude}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(location)}
                    className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(location.id, location.name)}
                    disabled={deleting === location.id}
                    className="flex-1 px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {deleting === location.id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}