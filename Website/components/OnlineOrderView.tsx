import React, { useState, useEffect, useRef } from 'react';
import { BackendService, MENU_ITEMS } from '../services/mockBackend';
import { RazorpayService } from '../services/razorpayService';
import { Token, Canteen, QueueType } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import {
  QrCode,
  Clock,
  Users,
  ArrowRight,
  AlertCircle,
  Coffee,
  Sandwich,
  Pizza,
  Utensils,
  Check,
  ShoppingCart,
  CreditCard,
  User,
  Mail,
  Phone,
  Camera,
  MapPin
} from 'lucide-react';
import jsQR from 'jsqr';

const ICON_MAP: Record<string, any> = {
  'coffee': <Coffee className="w-6 h-6" />,
  'sandwich': <Sandwich className="w-6 h-6" />,
  'utensils': <Utensils className="w-6 h-6" />,
  'pizza': <Pizza className="w-6 h-6" />
};

interface OnlineOrderViewProps {
  onOrderPlaced: (token: Token) => void;
}

type OrderStep = 'SELECT_CANTEEN' | 'SELECT_FOOD' | 'ENTER_DETAILS' | 'PAYMENT' | 'SUCCESS';

export const OnlineOrderView: React.FC<OnlineOrderViewProps> = ({ onOrderPlaced }) => {
  const [step, setStep] = useState<OrderStep>('SELECT_CANTEEN');
  const [selectedCanteen, setSelectedCanteen] = useState<Canteen | null>(null);
  const [selectedFood, setSelectedFood] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<Token | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);

  // QR Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [availableCanteens, setAvailableCanteens] = useState<Canteen[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load available canteens
  useEffect(() => {
    setAvailableCanteens(BackendService.getAllCanteens());
    // Initialize Razorpay
    RazorpayService.initializeRazorpay();
  }, []);

  // Load saved canteen
  useEffect(() => {
    const savedCanteenId = BackendService.getUserSavedCanteen(userEmail);
    if (savedCanteenId) {
      const canteen = BackendService.getCanteen(savedCanteenId);
      if (canteen) {
        setSelectedCanteen(canteen);
        setStep('SELECT_FOOD');
      }
    }
  }, [userEmail]);

  // Camera cleanup
  useEffect(() => {
    if (!isScanning) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      return;
    }

    const startCamera = async () => {
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }

        scanIntervalRef.current = setInterval(() => {
          if (canvasRef.current && videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const context = canvasRef.current.getContext('2d', { willReadFrequently: true });
            if (!context) return;

            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0);

            const imageData = context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
              try {
                const qrUrl = new URL(code.data);
                const canteenId = qrUrl.searchParams.get('canteenId');

                if (canteenId) {
                  let scannedCanteen = BackendService.getCanteen(canteenId);

                  if (!scannedCanteen) {
                    const name = qrUrl.searchParams.get('name');
                    const campus = qrUrl.searchParams.get('campus');
                    const themeColor = qrUrl.searchParams.get('themeColor');

                    if (name && campus) {
                      scannedCanteen = {
                        id: canteenId,
                        name,
                        campus,
                        themeColor: themeColor || 'from-blue-500 to-indigo-600'
                      };
                      BackendService.saveCanteen(scannedCanteen);
                    }
                  }

                  if (scannedCanteen) {
                    handleCanteenScanned(scannedCanteen);
                  }
                }
              } catch (err) {
                console.error(err);
              }
            }
          }
        }, 300);
      } catch (err: any) {
        setCameraError(err.message || 'Failed to access camera');
      }
    };

    startCamera();
  }, [isScanning]);

  const handleCanteenScanned = (canteen: Canteen) => {
    setSelectedCanteen(canteen);
    setIsScanning(false);
    setStep('SELECT_FOOD');
    // Save canteen for user if they enter email
    if (userEmail) {
      BackendService.saveUserCanteen(canteen.id, userEmail);
    }
  };

  const handleSelectCanteen = (canteen: Canteen) => {
    setSelectedCanteen(canteen);
    setStep('SELECT_FOOD');
    // Save canteen for user if they enter email
    if (userEmail) {
      BackendService.saveUserCanteen(canteen.id, userEmail);
    }
  };

  const handleSelectFood = (foodId: string) => {
    setSelectedFood(foodId);
    setStep('ENTER_DETAILS');
  };

  const handleProceedToPayment = async () => {
    if (!userEmail || !userPhone || !selectedCanteen || !selectedFood) {
      setError('Please fill in all details');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Create order
      const foodItem = MENU_ITEMS.find(m => m.id === selectedFood)?.name || selectedFood;
      const amount = 150; // Default price, can be dynamic
      
      const order = await RazorpayService.createOrder(amount, selectedCanteen.name, foodItem);

      // Save email and phone for later reference
      setLoading(false);
      setStep('PAYMENT');

      // Open Razorpay checkout
      await RazorpayService.openCheckout(
        amount,
        order.id,
        userEmail,
        userPhone,
        selectedCanteen.name,
        foodItem,
        (paymentId) => handlePaymentSuccess(paymentId),
        (error) => handlePaymentError(error)
      );
    } catch (err: any) {
      setError(err.message || 'Failed to create order');
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    if (!selectedCanteen || !selectedFood) return;

    try {
      setLoading(true);

      // Create online order
      const newToken = await BackendService.createOnlineOrder(
        selectedCanteen.id,
        selectedFood,
        userEmail,
        userPhone,
        paymentId
      );

      // Save canteen for user
      BackendService.saveUserCanteen(selectedCanteen.id, userEmail);

      // Get queue position
      const pos = await BackendService.getQueuePosition(selectedCanteen.id, newToken.id, QueueType.ONLINE);
      setQueuePosition(pos);
      setToken(newToken);
      setStep('SUCCESS');
      setLoading(false);

      onOrderPlaced(newToken);
    } catch (err: any) {
      setError(err.message || 'Failed to create order');
      setLoading(false);
    }
  };

  const handlePaymentError = (error: any) => {
    setError(error.message || 'Payment failed. Please try again.');
    setStep('PAYMENT');
  };

  const getFoodPrice = (foodId: string): number => {
    // Default pricing - can be made dynamic from canteen menu
    const priceMap: Record<string, number> = {
      'vadapav': 40,
      'alooparatha': 50,
      'samosa': 20,
      'masaladosa': 80,
      'cholebhature': 90,
      'sandwich': 60,
      'coffee': 30
    };
    return priceMap[foodId] || 150;
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="w-6 h-6 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Online Food Order</h1>
        </div>
        <p className="text-gray-500">Order food online and skip the queue with digital payments</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Step 1: Select Canteen */}
      {step === 'SELECT_CANTEEN' && (
        <div className="space-y-6 animate-slide-up">
          <Card className="p-6 border-2 border-blue-200 bg-blue-50">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Step 1: Select Your Canteen</h2>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              New user? Scan your canteen's QR code to save it. Returning users can select a canteen directly.
            </p>

            {/* Scan QR Button */}
            <button
              onClick={() => setIsScanning(true)}
              className="w-full mb-4 p-4 border-2 border-dashed border-blue-400 rounded-lg hover:border-blue-600 hover:bg-blue-100 transition-all flex items-center justify-center gap-2 text-blue-600 font-semibold"
            >
              <Camera className="w-5 h-5" />
              Scan Canteen QR Code
            </button>

            {/* Camera Scanner */}
            {isScanning && (
              <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
                <div className="relative mb-4">
                  <video ref={videoRef} className="w-full rounded-lg bg-black" />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                {cameraError && (
                  <p className="text-red-600 text-sm text-center mb-2">{cameraError}</p>
                )}
                <button
                  onClick={() => setIsScanning(false)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Close Scanner
                </button>
              </div>
            )}

            {/* Available Canteens */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700 mb-3">Or select from available canteens:</p>
              {availableCanteens.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No canteens available. Scan a QR code first.</p>
              ) : (
                availableCanteens.map(canteen => (
                  <button
                    key={canteen.id}
                    onClick={() => handleSelectCanteen(canteen)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left group ${
                      selectedCanteen?.id === canteen.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{canteen.name}</h3>
                        <p className="text-sm text-gray-500">{canteen.campus}</p>
                      </div>
                      {selectedCanteen?.id === canteen.id && (
                        <Check className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Step 2: Select Food */}
      {step === 'SELECT_FOOD' && selectedCanteen && (
        <div className="space-y-6 animate-slide-up">
          <Card className="p-6 border-2 border-green-200 bg-green-50">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-900">Canteen: {selectedCanteen.name}</h3>
            </div>
          </Card>

          <Card className="p-6 border-2 border-blue-200 bg-blue-50">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Step 2: Select Your Food</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {MENU_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSelectFood(item.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-center group ${
                    selectedFood === item.id
                      ? 'border-blue-600 bg-blue-100'
                      : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
                  }`}
                >
                  <div className={`flex justify-center mb-2 ${item.color}`}>
                    {ICON_MAP[item.icon] || <Utensils className="w-6 h-6" />}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">{item.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">₹{getFoodPrice(item.id)}</p>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Step 3: Enter Details */}
      {step === 'ENTER_DETAILS' && selectedCanteen && selectedFood && (
        <div className="space-y-6 animate-slide-up">
          <Card className="p-6 border-2 border-green-200 bg-green-50">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-900">
                {MENU_ITEMS.find(m => m.id === selectedFood)?.name}
              </h3>
            </div>
          </Card>

          <Card className="p-6 border-2 border-blue-200 bg-blue-50">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Step 3: Your Details</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-700">Food Item:</span>
                  <span className="font-semibold">{MENU_ITEMS.find(m => m.id === selectedFood)?.name}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-700">Price:</span>
                  <span className="font-semibold">₹{getFoodPrice(selectedFood)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="text-gray-700 font-semibold">Total:</span>
                  <span className="font-bold text-lg text-blue-600">₹{getFoodPrice(selectedFood)}</span>
                </div>
              </div>

              <button
                onClick={handleProceedToPayment}
                disabled={!userEmail || !userPhone || loading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                {loading ? 'Processing...' : 'Proceed to Payment'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Step 4: Payment Processing */}
      {step === 'PAYMENT' && (
        <div className="space-y-6 animate-slide-up">
          <Card className="p-8 text-center">
            <Clock className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Processing Payment</h2>
            <p className="text-gray-600">Please wait while we process your payment securely...</p>
          </Card>
        </div>
      )}

      {/* Step 5: Success */}
      {step === 'SUCCESS' && token && selectedCanteen && (
        <div className="space-y-6 animate-slide-up">
          <Card className="p-6 border-2 border-green-400 bg-green-50">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h2>
              <p className="text-gray-600">Your food is being prepared</p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4 mb-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Your Order Token</p>
                <div className="text-4xl font-bold text-blue-600">{token.tokenNumber}</div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Food Item:</span>
                  <span className="font-semibold">{token.foodItem}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Canteen:</span>
                  <span className="font-semibold">{selectedCanteen.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Type:</span>
                  <span className="font-semibold text-blue-600">Online Payment</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Queue Position:</span>
                  <span className="font-bold text-lg text-green-600">#{queuePosition}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Est. Wait Time:</span>
                  <span className="font-semibold">{token.estimatedWaitTimeMinutes} mins</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <Clock className="w-4 h-4 inline mr-2" />
                Your order will be ready in approximately <strong>{token.estimatedWaitTimeMinutes} minutes</strong>. Come to the counter and show your token.
              </p>
            </div>

            <button
              onClick={() => {
                setStep('SELECT_CANTEEN');
                setSelectedCanteen(null);
                setSelectedFood(null);
                setToken(null);
                setError(null);
              }}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              Place Another Order
            </button>
          </Card>
        </div>
      )}
    </div>
  );
};
