'use client';

// app/store-locations/page.js

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { shopAPI } from '@/lib/api';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Toast from '@/components/common/Toast';
import { MapPin, Plus, Edit2, Trash2, Star, Store, Phone } from 'lucide-react';
import { NIGERIA_STATES, getCitiesForState, hasPreDefinedCities } from '@/data/locations';

export default function StoreLocationsPage() {
  const router = useRouter();
  const { isAuthenticated, isSeller } = useAuth();
  
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
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
    if (!isAuthenticated) {
      router.push('/login');
    } else if (!isSeller) {
      router.push('/');
    } else {
      fetchLocations();
    }
  }, [isAuthenticated, isSeller]);

  // Update cities when state changes
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
    } else {
      setCities([]);
      setShowCustomCity(false);
    }
  }, [formData.state]);

  const fetchLocations = async () => {
    try {
      const response = await shopAPI.getStoreLocations();
      setLocations(response.data.results || response.data);
    } catch (error) {
      showToast('Failed to load store locations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const openModal = (location = null) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        store_name: location.store_name,
        country: location.country,
        state: location.state,
        city: location.city,
        address: location.address,
        phone_number: location.phone_number,
        is_primary: location.is_primary,
      });
    } else {
      setEditingLocation(null);
      setFormData({
        store_name: '',
        country: 'Nigeria',
        state: '',
        city: '',
        address: '',
        phone_number: '',
        is_primary: locations.length === 0, // First location is automatically primary
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingLocation(null);
    setFormData({
      store_name: '',
      country: 'Nigeria',
      state: '',
      city: '',
      address: '',
      phone_number: '',
      is_primary: false,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingLocation) {
        await shopAPI.updateStoreLocation(editingLocation.id, formData);
        showToast('Store location updated successfully!', 'success');
      } else {
        await shopAPI.createStoreLocation(formData);
        showToast('Store location added successfully!', 'success');
      }
      
      await fetchLocations();
      closeModal();
    } catch (error) {
      const errorMsg = error.response?.data?.store_name?.[0] || 
                      error.response?.data?.error || 
                      'Failed to save store location';
      showToast(errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      await shopAPI.deleteStoreLocation(id);
      showToast('Store location deleted successfully!', 'success');
      await fetchLocations();
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to delete location', 'error');
    }
  };

  const handleSetPrimary = async (id) => {
    try {
      await shopAPI.setStorePrimary(id);
      showToast('Primary location updated!', 'success');
      await fetchLocations();
    } catch (error) {
      showToast('Failed to set primary location', 'error');
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
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Store Locations</h1>
          <p className="text-gray-600">Manage your pickup/delivery locations</p>
        </div>

        {/* No Locations Warning */}
        {locations.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <MapPin className="w-6 h-6 text-yellow-600 shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">No Store Locations Yet</h3>
                <p className="text-sm text-yellow-800 mb-3">
                  You need to add at least one store location before you can create products.
                  This helps buyers know where to pick up their orders.
                </p>
                <Button
                  onClick={() => openModal()}
                  variant="primary"
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Location
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add Location Button (when locations exist) */}
        {locations.length > 0 && (
          <div className="mb-6 flex justify-end">
            <Button onClick={() => openModal()} variant="primary">
              <Plus className="w-4 h-4 mr-2" />
              Add New Location
            </Button>
          </div>
        )}

        {/* Locations Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {locations.map((location) => (
            <div
              key={location.id}
              className={`bg-white rounded-lg shadow-sm border-2 p-6 ${
                location.is_primary ? 'border-blue-500' : 'border-gray-200'
              }`}
            >
              {/* Primary Badge */}
              {location.is_primary && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    <Star className="w-3 h-3 fill-current" />
                    Primary Location
                  </span>
                </div>
              )}

              {/* Store Name */}
              <div className="flex items-center gap-2 mb-4">
                <Store className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-bold text-gray-900">{location.store_name}</h3>
              </div>

              {/* Location Details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                  <div className="text-gray-700">
                    <p>{location.address}</p>
                    <p>{location.city}, {location.state}</p>
                    <p>{location.country}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">{location.phone_number}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                {!location.is_primary && (
                  <Button
                    onClick={() => handleSetPrimary(location.id)}
                    variant="secondary"
                    className="flex-1 text-sm"
                  >
                    <Star className="w-4 h-4 mr-1" />
                    Set as Primary
                  </Button>
                )}
                
                <Button
                  onClick={() => openModal(location)}
                  variant="secondary"
                  className="text-sm"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                
                {locations.length > 1 && (
                  <Button
                    onClick={() => handleDelete(location.id)}
                    variant="secondary"
                    className="text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingLocation ? 'Edit Location' : 'Add New Location'}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Store Name */}
                  <Input
                    label="Store Name"
                    name="store_name"
                    value={formData.store_name}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Main Store, Lagos Branch"
                  />

                  {/* Phone */}
                  <Input
                    label="Contact Phone"
                    name="phone_number"
                    type="tel"
                    value={formData.phone_number}
                    onChange={handleChange}
                    required
                    placeholder="+234 801 234 5678"
                  />

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value="Nigeria"
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select state</option>
                      {NIGERIA_STATES.map((state) => (
                        <option key={state.value} value={state.value}>
                          {state.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* City */}
                  {formData.state && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City <span className="text-red-500">*</span>
                      </label>
                      {!showCustomCity && cities.length > 0 ? (
                        <div className="space-y-2">
                          <select
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                          >
                            <option value="">Select city</option>
                            {cities.map((city) => (
                              <option key={city} value={city}>
                                {city}
                              </option>
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
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            placeholder="Enter your city"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Enter full street address"
                      required
                    ></textarea>
                  </div>

                  {/* Primary Checkbox */}
                  {locations.length > 0 && !formData.is_primary && (
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id="is_primary"
                        name="is_primary"
                        checked={formData.is_primary}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                      />
                      <label htmlFor="is_primary" className="ml-3">
                        <span className="block text-sm font-medium text-gray-900">
                          Set as Primary Location
                        </span>
                        <span className="block text-sm text-gray-500">
                          This will be your main store location
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      onClick={closeModal}
                      variant="secondary"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      loading={submitting}
                      className="flex-1"
                    >
                      {editingLocation ? 'Update Location' : 'Add Location'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}