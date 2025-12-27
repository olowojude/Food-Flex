/**
 * Cloudinary Upload Utility
 * Save as: frontend/src/lib/cloudinary.js
 */

/**
 * Upload a single image to Cloudinary
 * @param {File} file - The image file to upload
 * @param {string} folder - Optional folder path (e.g., 'products', 'profiles')
 * @returns {Promise<string>} - The uploaded image URL
 */
export async function uploadImage(file, folder = '') {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary configuration missing. Check your .env.local file.');
  }

  // Validate file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload JPG, PNG, or WebP images.');
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 5MB.');
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    
    if (folder) {
      formData.append('folder', `foodflex/${folder}`);
    }

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Upload failed');
    }

    const data = await response.json();
    return data.secure_url; // Returns HTTPS URL
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
}

/**
 * Upload multiple images to Cloudinary
 * @param {File[]} files - Array of image files
 * @param {string} folder - Optional folder path
 * @returns {Promise<string[]>} - Array of uploaded image URLs
 */
export async function uploadMultipleImages(files, folder = '') {
  try {
    const uploadPromises = files.map(file => uploadImage(file, folder));
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Multiple upload error:', error);
    throw error;
  }
}

/**
 * Delete an image from Cloudinary (requires backend)
 * Note: Unsigned presets can't delete. You'd need to call your backend
 * which would use the API secret to delete.
 * @param {string} publicId - The Cloudinary public ID of the image
 */
export async function deleteImage(publicId) {
  // This would need to be implemented in your Django backend
  // since deletion requires API secret (can't be exposed in frontend)
  console.warn('Image deletion should be handled by backend');
  throw new Error('Delete operation not implemented yet');
}

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary image URL
 * @returns {string} - Public ID
 */
export function getPublicIdFromUrl(url) {
  if (!url) return '';
  
  // Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/folder/image.jpg
  const parts = url.split('/');
  const uploadIndex = parts.indexOf('upload');
  
  if (uploadIndex === -1) return '';
  
  // Get everything after 'upload/v1234567890/'
  const pathParts = parts.slice(uploadIndex + 2);
  const publicId = pathParts.join('/').replace(/\.[^/.]+$/, ''); // Remove extension
  
  return publicId;
}

/**
 * Get optimized image URL with transformations
 * @param {string} url - Original Cloudinary URL
 * @param {Object} options - Transformation options
 * @returns {string} - Transformed URL
 */
export function getOptimizedImageUrl(url, options = {}) {
  if (!url || !url.includes('cloudinary.com')) return url;

  const {
    width = 800,
    height = null,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
  } = options;

  // Build transformation string
  const transformations = [];
  
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (crop) transformations.push(`c_${crop}`);
  if (quality) transformations.push(`q_${quality}`);
  if (format) transformations.push(`f_${format}`);

  const transformString = transformations.join(',');

  // Insert transformations into URL
  return url.replace('/upload/', `/upload/${transformString}/`);
}

// Example usage in components:
/*

import { uploadImage, uploadMultipleImages, getOptimizedImageUrl } from '@/lib/cloudinary';

// Single image upload
const handleImageUpload = async (e) => {
  const file = e.target.files[0];
  try {
    const imageUrl = await uploadImage(file, 'products');
    console.log('Uploaded:', imageUrl);
  } catch (error) {
    console.error('Upload failed:', error.message);
  }
};

// Multiple images upload
const handleMultipleUpload = async (e) => {
  const files = Array.from(e.target.files);
  try {
    const imageUrls = await uploadMultipleImages(files, 'products');
    console.log('Uploaded:', imageUrls);
  } catch (error) {
    console.error('Upload failed:', error.message);
  }
};

// Optimize image display
<img 
  src={getOptimizedImageUrl(originalUrl, { width: 400, quality: 80 })} 
  alt="Product"
/>

*/