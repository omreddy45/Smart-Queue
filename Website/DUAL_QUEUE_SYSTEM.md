# SmartQueue - Dual Queue System Implementation

## Overview
SmartQueue now supports two distinct queuing mechanisms for students:

### 1. **Campus Queue** 🏫
- Students physically present at the campus canteen
- Order flow:
  1. Student selects food item
  2. Gets physical token from food counter
  3. Scans the **canteen QR code** at the counter to join the digital queue
  4. Receives real-time queue position and wait time updates
  5. Waits virtually/physically for their token to be called

**Use Case**: Perfect for students who are already at campus and want to order immediately

---

### 2. **Online Payment Queue** 💳
- Remote ordering with Razorpay payment integration
- Order flow:
  1. **New Users**: Scan canteen QR code once to save the canteen
  2. **Returning Users**: Directly select saved canteen or scan new QR
  3. Select food item from menu
  4. Enter email and phone number
  5. Proceed to payment (Razorpay checkout)
  6. After payment, receive digital token and join virtual queue
  7. Wait for notification when food is ready

**Use Case**: Perfect for remote students, online classes, or those wanting to skip physical queues

---

## Architecture

### New Data Types (types.ts)
```typescript
enum QueueType {
  CAMPUS = 'CAMPUS',   // Physical queue at campus
  ONLINE = 'ONLINE'    // Virtual queue for online orders
}

enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

// Token now includes:
- queueType: QueueType
- paymentId?: string (for online orders)
- paymentStatus?: PaymentStatus
- userEmail?: string
- userPhone?: string
```

### New Services

#### RazorpayService (`services/razorpayService.ts`)
Handles payment processing:
- `initializeRazorpay()` - Load Razorpay SDK
- `createOrder()` - Create order for payment
- `openCheckout()` - Open Razorpay payment UI
- `verifyPayment()` - Verify payment signature

#### Backend Extensions (`services/mockBackend.ts`)
New methods:
- `createToken(canteenId, couponCode, foodItem, queueType)` - Create campus token
- `createOnlineOrder()` - Create and process online order
- `getCampusQueue()` - Get campus queue only
- `getOnlineQueue()` - Get online queue only
- `saveUserCanteen()` - Save canteen for user (new users after QR scan)
- `getUserSavedCanteen()` - Retrieve saved canteen

### New Components

#### OnlineOrderView (`components/OnlineOrderView.tsx`)
Complete online ordering flow:
1. **Select Canteen** - New users scan QR, returning users select from saved
2. **Select Food** - Browse menu items with prices
3. **Enter Details** - Email and phone number
4. **Payment** - Razorpay integration
5. **Success** - Token and queue position display

---

## User Flows

### Campus Queue (Physical)
```
Landing Page
    ↓
"Place an Order" → Select Queue Type
    ↓
Select "Campus Queue"
    ↓
StudentView
    ↓
Select Food Item
    ↓
Scan Canteen QR → Automatic token creation
    ↓
Queue Position & Wait Time
    ↓
Status Updates in Real-time
```

### Online Queue (Digital)
```
Landing Page
    ↓
"Place an Order" → Select Queue Type
    ↓
Select "Online Order"
    ↓
OnlineOrderView
    ↓
[New User] Scan Canteen QR → Save Canteen
[Returning] Select Saved Canteen or Scan New
    ↓
Select Food Item & Price
    ↓
Enter Email & Phone
    ↓
Razorpay Payment
    ↓
Token & Queue Position
    ↓
Virtual Queue Updates
```

---

## Database Schema

### Token Record (Firebase/LocalStorage)
```typescript
{
  id: string;                    // Unique token ID
  canteenId: string;             // Which canteen
  queueType: 'CAMPUS' | 'ONLINE'; // Queue type
  tokenNumber: string;           // Display token (A-001)
  foodItem: string;              // What they ordered
  status: 'WAITING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  
  // Campus-specific
  couponCode: string;            // Physical ticket
  
  // Online-specific
  paymentId: string;             // Razorpay payment ID
  paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED';
  userEmail: string;
  userPhone: string;
  
  // Common
  timestamp: number;
  completedAt?: number;
  estimatedWaitTimeMinutes: number;
  aiReasoning?: string;
}
```

### User Saved Canteens (LocalStorage)
```
smartqueue_user_canteens: {
  "user@email.com": "canteen_id_123",
  "another@email.com": "canteen_id_456"
}
```

---

## Razorpay Integration Setup

### Prerequisites
1. Razorpay account (https://razorpay.com/)
2. Live/Test API keys

### Configuration
1. Get your **Key ID** from Razorpay dashboard
2. Update `services/razorpayService.ts`:
```typescript
key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'your_key_id'
```

3. Create `.env.local` file:
```
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

### Payment Verification (Backend)
For production, verify payment signatures:
```typescript
const crypto = require('crypto');

function verifySignature(orderId, paymentId, signature, secret) {
  const body = orderId + '|' + paymentId;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  return signature === expectedSignature;
}
```

---

## Canteen Persistence

### For New Online Users
1. User scans canteen QR code
2. System extracts canteen details from QR data
3. Canteen is automatically saved in localStorage
4. Email is linked to canteen ID

### For Returning Online Users
- Can select from previously saved canteens
- Email-based retrieval ensures user gets their saved canteen
- Option to scan new canteen QR and switch

---

## Queue Management

### Campus Queue
- Managed per canteen
- Students join after physical token + QR scan
- Real-time position updates
- First-come, first-served (FIFO)

### Online Queue
- Separate virtual queue from campus queue
- Students can monitor via app
- Different estimated wait time
- Notification when ready (future enhancement)

---

## Staff View Updates

Canteen staff can now see **both queues separately**:
- Campus Queue - Physical tokens
- Online Queue - Digital orders

This helps kitchen staff prepare for both types of orders efficiently.

---

## Admin Dashboard Updates

Analytics now differentiate between:
- Campus orders
- Online orders
- Peak hours per queue type
- Payment status tracking (for online orders)

---

## Installation & Running

### Install Razorpay
```bash
npm install razorpay
```

### Environment Variables
Create `.env.local`:
```
VITE_RAZORPAY_KEY_ID=your_razorpay_test_key_id
```

### Build & Run
```bash
npm run dev      # Development
npm run build    # Production build
npm run preview  # Preview build
```

---

## Testing the Dual Queue

### Test Campus Queue
1. Go to app → "Place an Order"
2. Select "Campus Queue"
3. Choose a food item
4. Scan a canteen QR (use QR generator for testing)
5. Verify token appears with correct queue position

### Test Online Queue
1. Go to app → "Place an Order"
2. Select "Online Order"
3. Scan canteen QR (if new user) or select saved canteen
4. Choose food item
5. Enter test email: `test@example.com`
6. Enter test phone: `9876543210`
7. Click "Proceed to Payment"
8. Use Razorpay test cards:
   - Success: `4111 1111 1111 1111`
   - Failure: `4111 1111 1111 1110`

---

## Key Features

✅ **Dual Queue System** - Campus and online orders managed separately  
✅ **Razorpay Integration** - Secure online payments  
✅ **QR Code Scanning** - Both canteen and counter scanning  
✅ **Canteen Persistence** - Remember saved canteens for users  
✅ **Real-time Updates** - Live queue position and status  
✅ **AI-Powered Wait Times** - ML-based ETA prediction  
✅ **Responsive Design** - Works on mobile and desktop  
✅ **Firebase Sync** - Cloud-based order management  

---

## Future Enhancements

🔜 Push notifications when food is ready  
🔜 Email/SMS notifications for online orders  
🔜 Multi-canteen ordering at once  
🔜 Scheduled ordering (pre-orders)  
🔜 Dietary preferences and customization  
🔜 Student wallet/prepaid system  
🔜 Rating and feedback system  
🔜 Integration with student meal plans  

---

## Support

For issues or questions about the dual queue system:
1. Check component prop interfaces
2. Review Firebase sync status
3. Verify Razorpay credentials
4. Check browser console for errors
5. Ensure camera permissions are granted for QR scanning

---

## License
MIT License - Open for modification and distribution
