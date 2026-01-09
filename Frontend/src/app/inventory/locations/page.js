'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { shopAPI } from '@/lib/api';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Toast from '@/components/common/Toast';
import { 
  MapPin, Plus, Edit, Trash2, ArrowLeft, 
  Star, Phone, Building2 
} from 'lucide-react';
import { NIGERIA_STATES, getCitiesForState, hasPreDefinedCities } from '@/data/locations';

export default function StoreLocationsPage() {
  const router = useRouter();
  const { isAuthenticated, isSeller } = useAuth();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cities, setCities] = useState([]);
  const [showCustomCity, setShowCustomCity] = useState(false);

  const [formData, setFormData] = useState({
    store_name: '',
    country: 'Nigeria',
    state: '',
    city: '',
    address: '',
    phone_number: '',
    is_primary: false,
  });

  useEffect(() => {
    if (!isAuthenticated || !isSeller) {
      router.push('/');
    } else {
      fetchLocations();
    }
  }, [isAuthenticated, isSeller]);

  useEffect(() => {
    if (formData.state) {
      const stateCities = getCitiesForState(formData.state);
      setCities(stateCities);
      
      if (hasPreDefinedCities(formData.state)) {
        setFormData(prev => ({ ...prev, city: '' }));
        setShowCustomCity(false);
      } else {
        setShowCustomCity(true);
      }
    }
  }, [formData.state]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await shopAPI.getStoreLocations();
      const locationsList = response.data.results || response.data;
      setLocations(Array.isArray(locationsList) ? locationsList : []);
    } catch (error) {
      showToast('Failed to load locations', 'error');
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const resetForm = () => {
    setFormData({
      store_name: '',
      country: 'Nigeria',
      state: '',
      city: '',
      address: '',
      phone_number: '',
      is_primary: locations.length === 0,
    });
    setEditingLocation(null);
    setCities([]);
    setShowCustomCity(false);
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setFormData({
      store_name: location.store_name || '',
      country: location.country || 'Nigeria',
      state: location.state || '',
      city: location.city || '',
      address: location.address || '',
      phone_number: location.phone_number || '',
      is_primary: location.is_primary || false,
    });
    setShowModal(true);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return;

    try {
      await shopAPI.deleteStoreLocation(id);
      showToast('Location deleted successfully', 'success');
      fetchLocations();
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to delete location', 'error');
    }
  };

  const handleSetPrimary = async (id, name) => {
    try {
      const response = await shopAPI.setStorePrimary(id);
      showToast(`"${name}" is now your primary location`, 'success');
      await fetchLocations(); // Refresh to show updated primary
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Failed to set primary location';
      showToast(errorMsg, 'error');
    }
  };

  const handleSubmit = async () => {
    if (!formData.store_name?.trim()) {
      showToast('Store name is required', 'error');
      return;
    }
    if (!formData.state?.trim()) {
      showToast('State is required', 'error');
      return;
    }
    if (!formData.city?.trim()) {
      showToast('City is required', 'error');
      return;
    }
    if (!formData.address?.trim()) {
      showToast('Address is required', 'error');
      return;
    }
    if (!formData.phone_number?.trim()) {
      showToast('Phone number is required', 'error');
      return;
    }

    //   PREPARE DATA
    const cleanData = {
      store_name: formData.store_name.trim(),
      country: formData.country.trim(),
      state: formData.state.trim(),
      city: formData.city.trim(),
      address: formData.address.trim(),
      phone_number: formData.phone_number.trim(),
      is_primary: formData.is_primary,
    };



    setSubmitting(true);
    try {
      if (editingLocation) {
        await shopAPI.updateStoreLocation(editingLocation.id, cleanData);
        showToast('Location updated successfully', 'success');
      } else {
        const response = await shopAPI.createStoreLocation(cleanData);
        showToast('Location created successfully', 'success');
      }
      setShowModal(false);
      resetForm();
      fetchLocations();
    } catch (error) {

      const errorData = error.response?.data;
      let errorMessage = 'Failed to save location';
      
      if (errorData) {
        if (errorData.store_name) {
          errorMessage = Array.isArray(errorData.store_name) 
            ? errorData.store_name[0] 
            : errorData.store_name;
        } else if (errorData.state) {
          errorMessage = Array.isArray(errorData.state) 
            ? errorData.state[0] 
            : errorData.state;
        } else if (errorData.city) {
          errorMessage = Array.isArray(errorData.city) 
            ? errorData.city[0] 
            : errorData.city;
        } else if (errorData.address) {
          errorMessage = Array.isArray(errorData.address) 
            ? errorData.address[0] 
            : errorData.address;
        } else if (errorData.phone_number) {
          errorMessage = Array.isArray(errorData.phone_number) 
            ? errorData.phone_number[0] 
            : errorData.phone_number;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.non_field_errors) {
          errorMessage = Array.isArray(errorData.non_field_errors)
            ? errorData.non_field_errors[0]
            : errorData.non_field_errors;
        }
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated || !isSeller) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/inventory" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Inventory
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Store Locations</h1>
              <p className="text-gray-600">Manage your pickup locations for customers</p>
            </div>
            <Button onClick={() => { resetForm(); setShowModal(true); }}>
              <Plus className="w-5 h-5 mr-2" />
              Add Location
            </Button>
          </div>
        </div>

        {/* Locations List */}
        {locations.length > 0 ? (
          <div className="space-y-4">
            {locations.map((location) => (
              <div key={location.id} className={`bg-white rounded-lg border-2 p-6 ${
                location.is_primary ? 'border-green-500' : 'border-gray-200'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{location.store_name}</h3>
                        {location.is_primary && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                            <Star className="w-3 h-3 fill-current" />
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{location.full_address || `${location.address}, ${location.city}, ${location.state}`}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEdit(location)} 
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {locations.length > 1 && (
                      <button 
                        onClick={() => handleDelete(location.id, location.store_name)} 
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    <span>{location.phone_number}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    <span>{location.city}, {location.state}</span>
                  </div>
                </div>

                {!location.is_primary && (
                  <Button 
                    variant="secondary" 
                    onClick={() => handleSetPrimary(location.id, location.store_name)} 
                    className="text-sm"
                  >
                    <Star className="w-4 h-4 mr-1" />
                    Set as Primary
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-lg border border-gray-200">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No store locations yet</h3>
            <p className="text-gray-500 mb-6">Add your first store location to start listing products</p>
            <Button onClick={() => { resetForm(); setShowModal(true); }}>
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Location
            </Button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {editingLocation ? 'Edit' : 'Add'} Store Location
              </h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <Input 
                label="Store Name" 
                value={formData.store_name} 
                onChange={(e) => setFormData({ ...formData, store_name: e.target.value })} 
                required 
                placeholder="Main Store, Lagos Branch, etc." 
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State <span className="text-red-500">*</span>
                </label>
                <select 
                  value={formData.state} 
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select state</option>
                  {NIGERIA_STATES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {formData.state && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  {!showCustomCity && cities.length > 0 ? (
                    <div className="space-y-2">
                      <select 
                        value={formData.city} 
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })} 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select city</option>
                        {cities.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <button 
                        type="button" 
                        onClick={() => setShowCustomCity(true)} 
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        My city is not listed
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        value={formData.city} 
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })} 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your city" 
                        required
                      />
                      {cities.length > 0 && (
                        <button 
                          type="button" 
                          onClick={() => setShowCustomCity(false)} 
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Choose from common cities
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <textarea 
                  value={formData.address} 
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                  rows={3} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="15 Victoria Island Road"
                  required
                ></textarea>
              </div>

              <Input 
                label="Phone Number" 
                value={formData.phone_number} 
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} 
                required 
                placeholder="+234 801 234 5678" 
              />

              {locations.length > 0 && !editingLocation && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <input 
                    type="checkbox" 
                    id="is_primary"
                    checked={formData.is_primary} 
                    onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })} 
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_primary" className="text-sm text-gray-700">
                    Set as primary location
                  </label>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={handleSubmit} loading={submitting} className="flex-1">
                {editingLocation ? 'Update' : 'Create'} Location
              </Button>
              <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}