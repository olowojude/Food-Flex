import { useState, useEffect, useRef } from 'react';
import { X, Camera, Upload, AlertCircle, CheckCircle } from 'lucide-react';

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

        scanIntervalRef.current = setInterval(() => {
          captureAndDecode();
        }, 300);
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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    const code = jsQRRef.current(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data) {
      handleQRDetected(code.data);
    }
  };

  // CRITICAL: This handles the multi-seller QR format validation
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
      throw new Error('Invalid QR code format. Not a FoodFlex order QR code.');
    }

    // Validate QR format
    const hasMultiSellerFormat = orderData.buyer_id && orderData.order_ids && orderData.checkout_session;
    
    if (!hasMultiSellerFormat) {
      throw new Error('Invalid QR code format. Missing required order information.');
    }

    const orderCount = orderData.order_ids?.length || 0;
    
    // Show success ONLY after validation passes
    setSuccess(`QR verified! ${orderCount} order(s) detected.`);
    
    // Call parent handler after short delay
    setTimeout(() => {
      onScanSuccess({ orderData, qrData });
    }, 1000);

  } catch (err) {
    //  Show error state with red X
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

      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target.result;
      };

      img.onload = () => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

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

      reader.onerror = () => {
        setError('Failed to read file. Please try again.');
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
                <button
                  onClick={startCamera}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-6 rounded-lg transition flex items-center justify-center gap-2 text-lg"
                >
                  <Camera className="w-6 h-6" />
                  Start Camera
                </button>

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
                  <div className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-4 px-6 rounded-lg cursor-pointer text-center transition flex items-center justify-center gap-2">
                    <Upload className="w-6 h-6" />
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
                <video
                  ref={videoRef}
                  className="w-full rounded-lg bg-black"
                  playsInline
                  muted
                />

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-64 h-64">
                    <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>

                    <div className="absolute inset-0 overflow-hidden">
                      <div className="w-full h-1 bg-blue-500 animate-scan"></div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-gray-600">
                Point camera at QR code...
              </p>

              <button
                onClick={stopCamera}
                className="mt-4 px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition"
              >
                Cancel Scan
              </button>
            </div>
          )}

          {/* Processing State */}
          {processing && !success && !error && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Verifying QR code...</p>
            </div>
          )}

          {/* Success State - GREEN CHECKMARK (Only shows for VALID QR) */}
          {success && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  QR Code Detected!
                </h3>
                <p className="text-green-600">{success}</p>
              </div>

              <p className="text-sm text-gray-500">Processing order...</p>
            </div>
          )}

          {/* Error State - RED X (Shows for INVALID QR) */}
          {error && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Scan Failed
                </h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setError(null);
                    startCamera();
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
                >
                  Try Camera Again
                </button>
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg cursor-pointer text-center transition">
                    Upload Image
                  </div>
                </label>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Tips */}
        <div className="bg-gray-50 p-4 border-t">
          <p className="text-sm text-gray-600 text-center">
            <strong>Tip:</strong> Make sure the QR code is well-lit and in focus
          </p>
        </div>
      </div>

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