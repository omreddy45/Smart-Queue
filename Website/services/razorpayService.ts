// Razorpay Integration Service for Online Payments
import { RazorpayBackend } from './mockBackend';

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  createdAt: number;
}

export interface PaymentDetails {
  orderId: string;
  paymentId: string;
  amount: number;
  foodItem: string;
  canteenName: string;
  userEmail: string;
  userPhone: string;
}

export const RazorpayService = {
  // Initialize Razorpay - call this on app load
  initializeRazorpay: async (): Promise<boolean> => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        console.error('Failed to load Razorpay');
        resolve(false);
      };
      document.body.appendChild(script);
    });
  },

  // Create Razorpay order via backend
  createOrder: async (amount: number, canteenName: string, foodItem: string): Promise<RazorpayOrder> => {
    try {
      // Call backend service to create real Razorpay order
      const order = await RazorpayBackend.createOrder(
        amount * 100, // Convert to paise
        'INR',
        `${canteenName}-${foodItem}-${Date.now()}`,
        {
          canteen: canteenName,
          foodItem: foodItem
        }
      );

      return {
        id: order.id,
        amount,
        currency: 'INR',
        receipt: order.receipt,
        status: order.status,
        createdAt: order.createdAt
      };
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  // Open Razorpay checkout
  openCheckout: async (
    amount: number,
    orderId: string,
    userEmail: string,
    userPhone: string,
    canteenName: string,
    foodItem: string,
    onSuccess: (paymentId: string) => void,
    onError: (error: any) => void
  ): Promise<void> => {
    // Check if Razorpay is loaded
    if (!(window as any).Razorpay) {
      onError('Razorpay not loaded');
      return;
    }

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_IfVJg9VZS9Jx6N', // Use env variable in production
      amount: amount * 100, // Razorpay expects amount in paise
      currency: 'INR',
      name: 'SmartQueue',
      description: `${foodItem} from ${canteenName}`,
      order_id: orderId,
      prefill: {
        email: userEmail,
        contact: userPhone
      },
      handler: function (response: any) {
        // Payment successful
        onSuccess(response.razorpay_payment_id);
      },
      modal: {
        ondismiss: function () {
          onError('Payment cancelled by user');
        }
      },
      theme: {
        color: '#3b82f6' // Blue theme
      }
    };

    const razorpay = new (window as any).Razorpay(options);
    razorpay.open();
  },

  // Verify payment (backend should verify signature)
  verifyPayment: async (
    orderId: string,
    paymentId: string,
    signature: string
  ): Promise<boolean> => {
    // In production, this would call your backend API to verify the payment signature
    // The backend would use the Razorpay API to verify the payment
    // For now, we'll assume verification is successful
    console.log('Verifying payment:', { orderId, paymentId, signature });
    return true;
  },

  // Get payment status
  getPaymentStatus: (paymentId: string): Promise<string> => {
    // In production, this would call your backend API
    return Promise.resolve('completed');
  }
};
