'use client';

/**
 * Test Page for Cloudinary Upload
 * Save as: frontend/src/app/test-upload/page.js
 * Visit: http://localhost:3000/test-upload
 * DELETE THIS PAGE AFTER TESTING!
 */

import { useState } from 'react';
import ImageUpload from '@/components/common/ImageUpload';
import MultipleImageUpload from '@/components/common/MultipleImageUpload';

export default function TestUploadPage() {
  const [singleImage, setSingleImage] = useState('');
  const [multipleImages, setMultipleImages] = useState([]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Cloudinary Upload Test
          </h1>
          <p className="text-gray-600 mb-8">
            Test your Cloudinary integration. Delete this page after testing.
          </p>

          {/* Single Image Upload Test */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              1. Single Image Upload
            </h2>
            <ImageUpload
              label="Profile Picture"
              folder="test/profiles"
              currentImage={singleImage}
              onUploadComplete={(url) => {
                setSingleImage(url);
                console.log('Single image uploaded:', url);
              }}
            />
            
            {singleImage && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800 mb-2">
                  ✅ Upload Successful!
                </p>
                <p className="text-xs text-green-700 break-all">
                  {singleImage}
                </p>
              </div>
            )}
          </div>

          {/* Multiple Images Upload Test */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              2. Multiple Images Upload
            </h2>
            <MultipleImageUpload
              label="Product Gallery"
              folder="test/products"
              currentImages={multipleImages}
              onUploadComplete={(urls) => {
                setMultipleImages(urls);
                console.log('Multiple images uploaded:', urls);
              }}
              maxImages={5}
            />
            
            {multipleImages.length > 0 && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800 mb-2">
                  ✅ {multipleImages.length} Image(s) Uploaded!
                </p>
                <div className="space-y-1">
                  {multipleImages.map((url, index) => (
                    <p key={index} className="text-xs text-green-700 break-all">
                      {index + 1}. {url}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Results Summary */}
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📊 Results
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Single Image:
                </p>
                <p className={`text-sm ${singleImage ? 'text-green-600' : 'text-gray-500'}`}>
                  {singleImage ? '✅ Uploaded' : '❌ Not uploaded'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Multiple Images:
                </p>
                <p className={`text-sm ${multipleImages.length > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                  {multipleImages.length > 0 ? `✅ ${multipleImages.length} uploaded` : '❌ Not uploaded'}
                </p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              🎯 What to Check:
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Images upload successfully</li>
              <li>✓ Preview displays correctly</li>
              <li>✓ URLs are HTTPS from Cloudinary</li>
              <li>✓ Check your browser console for any errors</li>
              <li>✓ Verify images appear in your Cloudinary dashboard</li>
            </ul>
            <p className="text-xs text-blue-700 mt-3">
              ⚠️ Remember to <strong>delete this test page</strong> before deploying!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}