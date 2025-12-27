'use client';

/**
 * Multiple Image Upload Component
 * Save as: frontend/src/components/common/MultipleImageUpload.jsx
 */

import { useState } from 'react';
import { uploadMultipleImages, getOptimizedImageUrl } from '@/lib/cloudinary';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function MultipleImageUpload({
  label = 'Upload Images',
  folder = 'general',
  onUploadComplete,
  currentImages = [],
  maxImages = 5,
  maxSize = 5, // MB per image
  accept = 'image/jpeg,image/jpg,image/png,image/webp',
  className = '',
}) {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState(currentImages);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setError('');

    // Check if adding these would exceed max
    if (images.length + files.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed. You can upload ${maxImages - images.length} more.`);
      return;
    }

    // Validate file sizes
    const maxSizeBytes = maxSize * 1024 * 1024;
    const oversizedFiles = files.filter(file => file.size > maxSizeBytes);
    if (oversizedFiles.length > 0) {
      setError(`Some files are too large. Maximum size is ${maxSize}MB per image.`);
      return;
    }

    // Upload to Cloudinary
    setUploading(true);
    setUploadProgress(`Uploading ${files.length} image(s)...`);
    
    try {
      const imageUrls = await uploadMultipleImages(files, folder);
      const newImages = [...images, ...imageUrls];
      setImages(newImages);
      onUploadComplete?.(newImages);
      setUploadProgress('');
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
      setUploadProgress('');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onUploadComplete?.(newImages);
  };

  const canUploadMore = images.length < maxImages;

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          <span className="text-xs text-gray-500 ml-2">
            ({images.length}/{maxImages} images)
          </span>
        </label>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((imageUrl, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 group"
            >
              <img
                src={getOptimizedImageUrl(imageUrl, { width: 300, quality: 80 })}
                alt={`Image ${index + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Remove Button */}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                disabled={uploading}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Image Number Badge */}
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                #{index + 1}
              </div>
            </div>
          ))}

          {/* Add More Button (if space available) */}
          {canUploadMore && !uploading && (
            <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center justify-center">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-xs text-gray-600">Add More</span>
              <input
                type="file"
                className="hidden"
                accept={accept}
                multiple
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
          )}
        </div>
      )}

      {/* Initial Upload Area (if no images) */}
      {images.length === 0 && (
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
                <p className="text-sm text-gray-600 mt-2">{uploadProgress}</p>
              </>
            ) : (
              <>
                <ImageIcon className="w-10 h-10 text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500 mb-1">
                  PNG, JPG, WEBP up to {maxSize}MB per image
                </p>
                <p className="text-xs text-gray-500">
                  You can select multiple images (max {maxImages})
                </p>
              </>
            )}
          </div>
          <input
            type="file"
            className="hidden"
            accept={accept}
            multiple
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      )}

      {/* Uploading Overlay (when uploading additional images) */}
      {uploading && images.length > 0 && (
        <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <LoadingSpinner size="sm" />
          <span className="text-sm text-blue-700">{uploadProgress}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <span>⚠️</span>
          <span>{error}</span>
        </p>
      )}

      {/* Help Text */}
      {!error && !uploading && (
        <div className="text-xs text-gray-500 space-y-1">
          <p>• First image will be used as main product image</p>
          <p>• Recommended: Square images (1:1 ratio) for best results</p>
          <p>• Drag images to reorder (coming soon)</p>
        </div>
      )}
    </div>
  );
}

// Usage Example:
/*

import MultipleImageUpload from '@/components/common/MultipleImageUpload';

function ProductForm() {
  const [productImages, setProductImages] = useState([]);

  return (
    <MultipleImageUpload
      label="Product Images"
      folder="products"
      currentImages={productImages}
      onUploadComplete={(urls) => setProductImages(urls)}
      maxImages={5}
      maxSize={5}
    />
  );
}

*/