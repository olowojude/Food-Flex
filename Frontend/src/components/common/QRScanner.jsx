'use client';

/**
 * QR Scanner Component - Xender Style
 * Save as: frontend/src/components/common/QRScanner.jsx
 */

import { useState, useEffect, useRef } from 'react';
import { X, Camera, Upload, AlertCircle } from 'lucide-react';
import Button from './Button';

export default function QRScanner({ onScanSuccess, onClose }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [cameraPermission, setCameraPermission] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      setScanning(true);

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });

      streamRef.current = stream;
      setCameraPermission('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        // Start scanning
        scanIntervalRef.current = setInterval(() => {
          captureAndDecode();
        }, 500); // Scan every 500ms
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Failed to access camera. Please grant camera permission.');
      setCameraPermission('denied');
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setScanning(false);
  };

  const captureAndDecode = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    // Try to decode QR code using jsQR library
    try {
      // Note: You'll need to install jsqr: npm install jsqr
      // For now, we'll use a simpler approach with native browser APIs
      decodeQRFromCanvas(canvas);
    } catch (err) {
      console.error('Decode error:', err);
    }
  };

  const decodeQRFromCanvas = async (canvas) => {
    try {
      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        // Use BarcodeDetector API if available (Chrome, Edge)
        if ('BarcodeDetector' in window) {
          try {
            const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await barcodeDetector.detect(blob);

            if (barcodes.length > 0) {
              const qrData = barcodes[0].rawValue;
              handleQRDetected(qrData);
            }
          } catch (err) {
            console.error('BarcodeDetector error:', err);
          }
        }
      });
    } catch (err) {
      console.error('Decode error:', err);
    }
  };

  const handleQRDetected = (qrData) => {
    console.log('QR Code detected:', qrData);

    // Stop camera
    stopCamera();

    // Extract order info from QR data
    // Format: FOODFLEX_ORDER:ORDER_NUMBER:QR_TOKEN
    if (qrData.startsWith('FOODFLEX_ORDER:')) {
      const parts = qrData.split(':');
      if (parts.length === 3) {
        const orderNumber = parts[1];
        const qrToken = parts[2];

        onScanSuccess({ orderNumber, qrToken });
      } else {
        setError('Invalid QR code format');
        setScanning(false);
      }
    } else {
      setError('This is not a FoodFlex order QR code');
      setScanning(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setScanning(true);

      // Create image element
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target.result;
      };

      img.onload = async () => {
        // Draw image to canvas
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);

        // Try to decode
        await decodeQRFromCanvas(canvas);
        setScanning(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error('File upload error:', err);
      setError('Failed to read QR code from image');
      setScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold">Scan QR Code</h2>
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-blue-100">
            Scan the buyer's QR code to confirm their order
          </p>
        </div>

        {/* Scanner Area */}
        <div className="p-6">
          {!scanning && !error && (
            <div className="text-center space-y-4">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                <Camera className="w-16 h-16 text-blue-600" />
              </div>

              <p className="text-gray-700 text-lg">
                Position the QR code within the frame
              </p>

              <div className="space-y-3">
                <Button
                  onClick={startCamera}
                  variant="primary"
                  className="w-full text-lg py-4"
                >
                  <Camera className="w-6 h-6 mr-2" />
                  Start Camera
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">or</span>
                  </div>
                </div>

                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="btn-secondary w-full cursor-pointer text-center py-4 text-lg">
                    <Upload className="w-6 h-6 mr-2 inline" />
                    Upload QR Image
                  </div>
                </label>
              </div>
            </div>
          )}

          {scanning && !error && (
            <div className="text-center">
              <div className="relative mx-auto" style={{ maxWidth: '400px' }}>
                {/* Video Preview */}
                <video
                  ref={videoRef}
                  className="w-full rounded-lg"
                  playsInline
                  muted
                />

                {/* Scanning Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-64 h-64">
                    {/* Corner brackets */}
                    <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>

                    {/* Scanning line */}
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="w-full h-1 bg-blue-500 animate-scan"></div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-gray-600">
                Point camera at QR code...
              </p>

              <Button
                onClick={stopCamera}
                variant="secondary"
                className="mt-4"
              >
                Cancel Scan
              </Button>
            </div>
          )}

          {error && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Scan Failed
                </h3>
                <p className="text-red-600">{error}</p>
              </div>

              <Button
                onClick={() => {
                  setError(null);
                  startCamera();
                }}
                variant="primary"
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Hidden canvas for processing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Tips */}
        <div className="bg-gray-50 p-4 border-t">
          <p className="text-sm text-gray-600 text-center">
            💡 <strong>Tip:</strong> Make sure the QR code is well-lit and in focus
          </p>
        </div>
      </div>

      {/* Custom CSS for scanning animation */}
      <style jsx>{`
        @keyframes scan {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(256px);
          }
        }

        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  );
}