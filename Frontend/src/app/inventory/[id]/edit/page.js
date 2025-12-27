'use client';

/**
 * Edit Product Page - FIXED DATA LOADING
 * - Now fetches product by ID directly
 * - Properly retains all previous information
 * - Only need to edit what you want to change
 */

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { shopAPI } from '@/lib/api';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import ImageUpload from '@/components/common/ImageUpload';
import MultipleImageUpload from '@/components/common/MultipleImageUpload';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Toast from '@/components/common/Toast';
import { ArrowLeft, Save, Package } from 'lucide-react';
import Link from 'next/link';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id;
  const { isAuthenticated, isSeller } = useAuth();
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [originalProduct, setOriginalProduct] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    price: '',
    stock_quantity: '',
    main_image: '',
    additional_images: [],
    is_active: true,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (!isSeller) {
      router.push('/');
    } else {
      fetchData();
    }
  }, [isAuthenticated, isSeller, productId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch categories
      const categoriesRes = await shopAPI.getCategories();
      setCategories(categoriesRes.data);

      // Fetch ALL seller products to find this one
      const productsRes = await shopAPI.getMyProducts();
      const products = productsRes.data.results || productsRes.data;
      const product = products.find(p => p.id === parseInt(productId));

      if (!product) {
        showToast('Product not found or you don\'t have permission to edit it', 'error');
        setTimeout(() => router.push('/inventory'), 2000);
        return;
      }

      // Store original product for reference
      setOriginalProduct(product);

      // Parse additional images
      let additionalImages = [];
      if (product.additional_images) {
        try {
          additionalImages = typeof product.additional_images === 'string'
            ? JSON.parse(product.additional_images)
            : Array.isArray(product.additional_images)
            ? product.additional_images
            : [];
        } catch (e) {
          console.error('Error parsing additional images:', e);
          additionalImages = [];
        }
      }

      // Populate form with existing data
      setFormData({
        name: product.name || '',
        category: product.category?.id?.toString() || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        stock_quantity: product.stock_quantity?.toString() || '0',
        main_image: product.main_image || '',
        additional_images: additionalImages,
        is_active: product.is_active ?? true,
      });

      console.log('Product loaded:', {
        name: product.name,
        stock: product.stock_quantity,
        price: product.price,
        category: product.category?.id
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Failed to load product data', 'error');
      setTimeout(() => router.push('/inventory'), 2000);
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
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleMainImageUpload = (url) => {
    setFormData(prev => ({ ...prev, main_image: url }));
    if (errors.main_image) {
      setErrors(prev => ({ ...prev, main_image: '' }));
    }
  };

  const handleAdditionalImagesUpload = (urls) => {
    setFormData(prev => ({ ...prev, additional_images: urls }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Valid price is required';
    }
    if (formData.stock_quantity === '' || parseInt(formData.stock_quantity) < 0) {
      newErrors.stock_quantity = 'Valid stock quantity is required';
    }
    if (!formData.main_image) newErrors.main_image = 'Main image is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: parseInt(formData.category),
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity),
        main_image: formData.main_image,
        additional_images: formData.additional_images,
        is_active: formData.is_active,
      };

      console.log('Updating product with data:', productData);

      await shopAPI.updateProduct(productId, productData);
      showToast('Product updated successfully!', 'success');
      
      setTimeout(() => {
        router.push('/inventory');
      }, 1500);
    } catch (error) {
      console.error('Error updating product:', error);
      const errorData = error.response?.data;
      
      if (errorData) {
        // Handle field-specific errors
        if (typeof errorData === 'object') {
          setErrors(errorData);
          showToast('Please check the form for errors', 'error');
        } else {
          showToast(errorData.error || 'Failed to update product', 'error');
        }
      } else {
        showToast('Failed to update product. Please try again.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated || !isSeller) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="xl" />
          <p className="mt-4 text-gray-600">Loading product data...</p>
        </div>
      </div>
    );
  }

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

      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <Link
            href="/inventory"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Inventory
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Product</h1>
          <p className="text-gray-600">
            Update product information - All fields are pre-filled with current values
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Basic Information
            </h2>

            <div className="space-y-4">
              {/* Product Name */}
              <Input
                label="Product Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                required
                placeholder="e.g., Fresh Tomatoes"
              />

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.category ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-sm text-red-600 mt-1">{errors.category}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Describe your product in detail..."
                  required
                ></textarea>
                {errors.description && (
                  <p className="text-sm text-red-600 mt-1">{errors.description}</p>
                )}
              </div>

              {/* Price and Stock - HIGHLIGHTED */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Price (₦)"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={handleChange}
                  error={errors.price}
                  required
                  placeholder="0.00"
                />

                <div>
                  <Input
                    label="Stock Quantity"
                    name="stock_quantity"
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={handleChange}
                    error={errors.stock_quantity}
                    required
                    placeholder="0"
                  />
                  {originalProduct && (
                    <p className="text-xs text-gray-500 mt-1">
                      Current stock: {originalProduct.stock_quantity} units
                      {parseInt(formData.stock_quantity) !== originalProduct.stock_quantity && (
                        <span className="text-blue-600 font-medium ml-2">
                          → New: {formData.stock_quantity} units
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Product Images */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Product Images</h2>

            <div className="space-y-6">
              <ImageUpload
                label="Main Product Image"
                folder="products"
                currentImage={formData.main_image}
                onUploadComplete={handleMainImageUpload}
                maxSize={5}
              />
              {errors.main_image && (
                <p className="text-sm text-red-600 -mt-4">{errors.main_image}</p>
              )}

              <MultipleImageUpload
                label="Additional Images (Optional)"
                folder="products"
                currentImages={formData.additional_images}
                onUploadComplete={handleAdditionalImagesUpload}
                maxImages={4}
                maxSize={5}
              />
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Settings</h2>

            <div className="space-y-4">
              {/* Active Status */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                />
                <label htmlFor="is_active" className="ml-3">
                  <span className="block text-sm font-medium text-gray-900">Active</span>
                  <span className="block text-sm text-gray-500">
                    {formData.is_active 
                      ? 'Product is visible to buyers' 
                      : 'Product is hidden from buyers'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button type="submit" variant="primary" loading={submitting} className="flex-1">
              <Save className="w-5 h-5 mr-2" />
              {submitting ? 'Updating...' : 'Update Product'}
            </Button>
            <Link href="/inventory" className="flex-1">
              <Button type="button" variant="secondary" className="w-full">
                Cancel
              </Button>
            </Link>
          </div>

          {/* Quick Stock Update Hint */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              💡 <strong>Quick Tip:</strong> To update only the stock quantity, just change the "Stock Quantity" field and click Update. All other fields will remain unchanged.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}