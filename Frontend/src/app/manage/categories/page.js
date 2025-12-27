'use client';

/**
 * Admin - Categories Management Page
 * Save as: frontend/src/app/manage/categories/page.js
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { shopAPI, adminAPI } from '@/lib/api';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  FolderTree, Plus, Edit, Trash2, Eye, EyeOff, Save, X
} from 'lucide-react';

export default function CategoriesPage() {
  const router = useRouter();
  const { isAuthenticated, isAdmin } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      router.push('/');
    } else {
      fetchCategories();
    }
  }, [isAuthenticated, isAdmin]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await shopAPI.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      is_active: true,
    });
    setErrors({});
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (category) => {
    setFormData({
      name: category.name,
      description: category.description || '',
      is_active: category.is_active ?? true,
    });
    setEditingId(category.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!formData.name.trim()) {
      setErrors({ name: 'Category name is required' });
      return;
    }

    setSubmitting(true);

    try {
      if (editingId) {
        await adminAPI.updateCategory(editingId, formData);
        alert('Category updated successfully!');
      } else {
        await adminAPI.createCategory(formData);
      }
      fetchCategories();
      resetForm();
    } catch (error) {
      console.error('Error saving category:', error);
      const errorData = error.response?.data;
      if (errorData) {
        // Handle both string errors and object errors
        if (typeof errorData === 'string') {
          alert(errorData);
        } else if (errorData.name) {
          setErrors({ name: Array.isArray(errorData.name) ? errorData.name[0] : errorData.name });
        } else if (errorData.error) {
          alert(errorData.error);
        } else {
          setErrors(errorData);
        }
      } else {
        alert('Failed to save category. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (categoryId, categoryName) => {
    if (!confirm(`Delete "${categoryName}"? This will affect all products in this category.`)) {
      return;
    }

    try {
      setDeleting(categoryId);
      await adminAPI.deleteCategory(categoryId);
      alert('Category deleted successfully!');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert(error.response?.data?.error || 'Failed to delete category');
    } finally {
      setDeleting(null);
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
    <div className="py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Categories</h1>
            <p className="text-gray-600">Organize products into categories</p>
          </div>
          {!showForm && (
            <Button variant="primary" onClick={() => setShowForm(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Add Category
            </Button>
          )}
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <div className="card p-6 mb-8 bg-white rounded-lg shadow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingId ? 'Edit Category' : 'Add New Category'}
              </h2>
              <button onClick={resetForm} className="text-gray-600 hover:text-gray-900">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Category Name"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={errors.name}
                required
                placeholder="e.g., Fruits, Vegetables, Dairy"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of this category..."
                ></textarea>
                {errors.description && (
                  <p className="text-sm text-red-600 mt-1">{errors.description}</p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="ml-3 text-sm text-gray-700">
                  <span className="font-medium">Active</span>
                  <p className="text-gray-500">Make this category visible on the site</p>
                </label>
              </div>

              <div className="flex gap-4">
                <Button type="submit" variant="primary" loading={submitting}>
                  <Save className="w-5 h-5 mr-2" />
                  {editingId ? 'Update' : 'Create'} Category
                </Button>
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Categories Grid */}
        {categories.length === 0 ? (
          <div className="card p-12 text-center bg-white rounded-lg shadow">
            <FolderTree className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No categories yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first category to organize products
            </p>
            <Button variant="primary" onClick={() => setShowForm(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Add First Category
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <div key={category.id} className="card p-6 hover:shadow-lg transition bg-white rounded-lg shadow">
                {/* Icon Placeholder */}
                <div className="w-full h-40 bg-linear-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center mb-4">
                  <FolderTree className="w-16 h-16 text-blue-400" />
                </div>

                {/* Info */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {category.name}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${
                      category.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {category.is_active ? (
                        <><Eye className="w-3 h-3 mr-1" />Visible</>
                      ) : (
                        <><EyeOff className="w-3 h-3 mr-1" />Hidden</>
                      )}
                    </span>
                  </div>
                  {category.description ? (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {category.description}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No description</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Slug: {category.slug} • Products: {category.product_count || 0}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(category)}
                    className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-medium text-sm flex items-center justify-center"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(category.id, category.name)}
                    disabled={deleting === category.id}
                    className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium text-sm flex items-center justify-center disabled:opacity-50"
                  >
                    {deleting === category.id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-1" />
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