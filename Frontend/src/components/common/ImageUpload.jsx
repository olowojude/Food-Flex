'use client';

/**
 * Reusable Image Upload Component
 * Save as: frontend/src/components/common/ImageUpload.jsx
 */

import { useState } from 'react';
import { uploadImage, getOptimizedImageUrl } from '@/lib/cloudinary';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function ImageUpload({
  label = 'Upload Image',
  folder = 'general',
  onUploadComplete,
  currentImage = null,
  maxSize = 5, // MB
  accept = 'image/jpeg,image/jpg,image/png,image/webp',
  showPreview = true,
  className = '',
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    // Validate file size
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`File too large. Maximum size is ${maxSize}MB.`);
      return;
    }

    // Show preview immediately
    if (showPreview) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }

    // Upload to Cloudinary
    setUploading(true);
    try {
      const imageUrl = await uploadImage(file, folder);
      onUploadComplete?.(imageUrl);
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
      setPreview(currentImage); // Revert preview on error
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError('');
    onUploadComplete?.(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <div className="relative">
        {/* Preview or Upload Area */}
        {preview ? (
          <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-gray-200 group">
            <img
              src={getOptimizedImageUrl(preview, { width: 500, quality: 80 })}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            
            {/* Overlay with Remove Button */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
              <button
                type="button"
                onClick={handleRemove}
                className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                disabled={uploading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Uploading Overlay */}
            {uploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-center">
                  <LoadingSpinner size="lg" />
                  <p className="text-white text-sm mt-2">Uploading...</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <label
            className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
              uploading
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {uploading ? (
                <>
                  <LoadingSpinner size="lg" />
                  <p className="text-sm text-gray-600 mt-2">Uploading...</p>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, WEBP up to {maxSize}MB
                  </p>
                </>
              )}
            </div>
            <input
              type="file"
              className="hidden"
              accept={accept}
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <span>⚠️</span>
          <span>{error}</span>
        </p>
      )}

      {/* Help Text */}
      {!error && !uploading && (
        <p className="text-xs text-gray-500">
          Recommended: Square images (1:1 ratio) for best results
        </p>
      )}
    </div>
  );
}

// Usage Example:
/*

import ImageUpload from '@/components/common/ImageUpload';

function ProductForm() {
  const [productImage, setProductImage] = useState('');

  return (
    <ImageUpload
      label="Product Image"
      folder="products"
      currentImage={productImage}
      onUploadComplete={(url) => setProductImage(url)}
      maxSize={5}
      showPreview={true}
    />
  );
}

*/