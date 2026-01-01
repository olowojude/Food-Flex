'use client';


import { useState, useEffect, useRef } from 'react';
import { X, Camera, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';

export default function QRScanner({ onScanSuccess, onClose, expectedOrderId = null }) {
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const jsQRRef = useRef(null);

  useEffect(() => {
    // Load jsQR library dynamically
    loadJsQR();
    
    return () => {
      stopCamera();
    };
  }, []);

  const loadJsQR = async () => {
    try {
      const jsQR = (await import('jsqr')).default;
      jsQRRef.current = jsQR;
    } catch (err) {
      setError('QR scanner library failed to load. Please refresh the page.');
    }
  };

  const startCamera = async () => {
    try {
      setError(null);
      setSuccess(null);
      setScanning(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Start scanning loop
        scanIntervalRef.current = setInterval(() => {
          captureAndDecode();
        }, 300); // Scan every 300ms
      }
    } catch (err) {
      setError('Failed to access camera. Please grant camera permission or try uploading an image.');
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
    if (!videoRef.current || !canvasRef.current || !jsQRRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    // Decode QR code using jsQR
    const code = jsQRRef.current(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data) {
      handleQRDetected(code.data);
    }
  };

  const handleQRDetected = (qrData) => {

    // Stop camera immediately
    stopCamera();
    setProcessing(true);

    try {
      // Parse JSON QR data
      let orderData;
      try {
        orderData = JSON.parse(qrData);
      } catch (e) {
        // If not JSON, show error
        throw new Error('Invalid QR code format. This does not appear to be a FoodFlex order QR code.');
      }

      // Validate required fields
      if (!orderData.order_id && !orderData.order_number) {
        throw new Error('Invalid QR code. Missing order information.');
      }

      // Check if this matches expected order (if provided)
      if (expectedOrderId && orderData.order_id !== expectedOrderId) {
        throw new Error('This QR code is for a different order!');
      }

      // Success!
      setSuccess(`Order #${orderData.order_number} detected!`);
      
      // Delay slightly to show success message
      setTimeout(() => {
        onScanSuccess({ orderData, qrData });
      }, 1000);

    } catch (err) {
      setError(err.message);
      setProcessing(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!jsQRRef.current) {
      setError('QR scanner not ready. Please wait a moment and try again.');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      setProcessing(true);

      // Create image element
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target.result;
      };

      img.onload = () => {
        // Draw image to canvas
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);

        // Get image data
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

        // Decode QR code
        const code = jsQRRef.current(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data) {
          handleQRDetected(code.data);
        } else {
          setError('No QR code found in image. Please try with a clearer image.');
          setProcessing(false);
        }
      };

      img.onerror = () => {
        setError('Failed to load image. Please try another file.');
        setProcessing(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to read QR code from image');
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-600 to-indigo-600 p-6 text-white">
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
          {/* Initial State */}
          {!scanning && !processing && !error && !success && (
            <div className="text-center space-y-4">
              <div className="w-32 h-32 mx-auto bg-linear-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
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

          {/* Scanning State */}
          {scanning && !processing && (
            <div className="text-center">
              <div className="relative mx-auto" style={{ maxWidth: '400px' }}>
                {/* Video Preview */}
                <video
                  ref={videoRef}
                  className="w-full rounded-lg bg-black"
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

          {/* Processing State */}
          {processing && !success && !error && (
            <div className="text-center py-12">
              <LoadingSpinner size="xl" />
              <p className="mt-4 text-gray-600">Verifying QR code...</p>
            </div>
          )}

          {/* Success State */}
          {success && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  QR Code Verified!
                </h3>
                <p className="text-green-600">{success}</p>
              </div>

              <p className="text-sm text-gray-500">Redirecting to order details...</p>
            </div>
          )}

          {/* Error State */}
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

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setError(null);
                    startCamera();
                  }}
                  variant="primary"
                  className="flex-1"
                >
                  Try Camera Again
                </Button>
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="btn-secondary w-full cursor-pointer text-center">
                    Upload Image
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Hidden canvas for processing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Tips */}
        <div className="bg-gray-50 p-4 border-t">
          <p className="text-sm text-gray-600 text-center">
            <strong>Tip:</strong> Make sure the QR code is well-lit and in focus
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