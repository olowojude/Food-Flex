// frontend/src/app/inventory/locations/page.js
// Create this new file

'use client';
import { useState, useEffect } from 'react';
import { locationAPI, getUserLocation } from '@/lib/api';

export default function StoreLocationsPage() {
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

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const response = await locationAPI.getStoreLocations();
      setLocations(response.data);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
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
      alert('Location captured successfully!');
    } catch (error) {
      alert(error.message);
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        await locationAPI.updateStoreLocation(editingId, formData);
        alert('Store location updated!');
      } else {
        await locationAPI.createStoreLocation(formData);
        alert('Store location added!');
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
      alert('❌ Failed to save location');
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
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this location?')) return;
    
    try {
      await locationAPI.deleteStoreLocation(id);
      alert('Location deleted');
      fetchLocations();
    } catch (error) {
      alert('Failed to delete location');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Store Locations</h1>
          <p className="text-gray-600 text-sm mt-1">
            Manage your pickup locations for products
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({
              name: '',
              address: '',
              city: '',
              state: '',
              latitude: '',
              longitude: ''
            });
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          {showForm ? 'Cancel' : '+ Add Location'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="font-semibold mb-4">
            {editingId ? 'Edit Location' : 'Add New Location'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Location Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Wuse 2 Branch, Main Store"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Abuja"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., FCT"
                value={formData.state}
                onChange={(e) => setFormData({...formData, state: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Full Address <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder="Enter the complete address..."
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows="3"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Latitude <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.000001"
                placeholder="e.g., 9.057353"
                value={formData.latitude}
                onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Longitude <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.000001"
                placeholder="e.g., 7.491302"
                value={formData.longitude}
                onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={gettingLocation}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {gettingLocation ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Getting Location...
                </>
              ) : (
                <>
                  📍 Use Current Location
                </>
              )}
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              {editingId ? 'Update Location' : 'Save Location'}
            </button>
          </div>
        </div>
      )}

      {/* Locations List */}
      {locations.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-6xl mb-4">📍</div>
          <h3 className="text-lg font-semibold mb-2">No Store Locations Yet</h3>
          <p className="text-gray-600 mb-4">
            Add your first store location to enable location-based product discovery
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Add First Location
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map(location => (
            <div key={location.id} className="bg-white p-5 rounded-lg shadow hover:shadow-md transition">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg">{location.name}</h3>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  {location.product_count} Products
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                <p className="flex items-start gap-2">
                  <span className="text-lg">📍</span>
                  <span>{location.address}</span>
                </p>
                <p className="font-medium text-gray-700">
                  {location.city}, {location.state}
                </p>
                <p className="text-xs text-gray-400">
                  GPS: {location.latitude}, {location.longitude}
                </p>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleEdit(location)}
                  className="flex-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(location.id)}
                  className="flex-1 px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}