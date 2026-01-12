# SmartQueue Dual-Queue System - Implementation Guide

## 🎯 Overview

Your SmartQueue system now supports **TWO completely separate queuing systems**:

### 1️⃣ Campus Queue (Physical)
- **Who**: Students at campus ordering food
- **Process**: Get token at counter → eat → scan QR to join physical queue
- **Token Example**: A-001, A-002, A-003...
- **Wait Type**: Physical queue at canteen

### 2️⃣ Online Queue (Virtual)  
- **Who**: Users ordering via app with online payment
- **Process**: Select canteen → select food → pay via Razorpay → join virtual queue
- **Token Example**: A-001, A-002, A-003... (separate counting from campus)
- **Wait Type**: Virtual - user goes home, comes back when ready

---

## 📱 User Journey

### New User (Campus Queue)
```
1. Click "Place an Order"
2. Select "Campus Queue"
3. Choose food item
4. Scan canteen QR code
   └─ First time? Canteen saved automatically
5. Get token (A-101)
6. Go to counter, get food
7. Scan food counter QR code
8. Join physical campus queue
```

### New User (Online Order)
```
1. Click "Place an Order"
2. Select "Online Order"
3. Scan canteen QR (to save for future)
   └─ First time? Canteen saved for next time
4. Select food item from menu
5. Enter email & phone number
6. Review order summary
7. Pay via Razorpay (secure)
8. Get virtual token (A-101)
9. See queue position (#3)
10. Wait virtually at home
11. Come to counter when ready
```

### Returning User (Online Order)
```
1. Click "Place an Order"
2. Select "Online Order"
3. Enter email
   └─ Saved canteen auto-loads!
4. Select food item
5. Pay via Razorpay
6. Get virtual token
7. Wait at home
```

---

## 🏗️ Architecture Changes

### New Enums in `types.ts`

```typescript
enum QueueType {
  CAMPUS = 'CAMPUS'    // Physical queue
  ONLINE = 'ONLINE'    // Virtual queue
}

enum PaymentStatus {
  PENDING = 'PENDING'
  COMPLETED = 'COMPLETED'
  FAILED = 'FAILED'
}
```

### Updated Token Model

```typescript
Token {
  // Existing fields
  id, canteenId, foodItem, status, timestamp...
  
  // NEW Fields
  queueType: QueueType              // Distinguishes CAMPUS vs ONLINE
  
  // Online Payment Fields (optional)
  paymentId?: string                // Razorpay payment ID
  paymentStatus?: PaymentStatus     // Payment status
  userEmail?: string                // For online orders
  userPhone?: string                // For online orders
}
```

---

## 🔧 Backend Services

### New Methods in `BackendService`

```typescript
// Create online order (with payment verification)
createOnlineOrder(
  canteenId: string,
  foodItem: string,
  userEmail: string,
  userPhone: string,
  paymentId: string
): Promise<Token>

// Get only campus queue orders
getCampusQueue(canteenId: string): Promise<Token[]>

// Get only online queue orders
getOnlineQueue(canteenId: string): Promise<Token[]>

// Save canteen to user's device (after first QR scan)
saveUserCanteen(canteenId: string, email?: string): void

// Get user's saved canteen
getUserSavedCanteen(email?: string): string | null

// Get queue position (with optional queue type filter)
getQueuePosition(
  canteenId: string,
  tokenId: string,
  queueType?: QueueType
): Promise<number>
```

---

## 💳 Razorpay Integration

### Setup Instructions

1. **Create Account**: https://razorpay.com/
2. **Get API Keys**: Dashboard → Settings → API Keys
3. **Add to Environment**:
   ```env
   VITE_RAZORPAY_KEY_ID=your_key_here
   ```

### Payment Flow

```
User Fills Details
        ↓
Create Razorpay Order
        ↓
Open Secure Checkout
        ↓
User Enters Card Details
        ↓
Payment Authorized
        ↓
Receive paymentId
        ↓
Create Token with paymentId
        ↓
Add to Virtual Queue
```

### Razorpay Service Methods

```typescript
// Load Razorpay script
RazorpayService.initializeRazorpay(): Promise<boolean>

// Create order (mock - backend does this in production)
createOrder(amount, canteenName, foodItem): Promise<RazorpayOrder>

// Open checkout modal
openCheckout(
  amount,
  orderId,
  userEmail,
  userPhone,
  canteenName,
  foodItem,
  onSuccess,
  onError
): Promise<void>

// Verify payment (backend should do this)
verifyPayment(orderId, paymentId, signature): Promise<boolean>
```

---

## 📊 Separate Queue Management

### Queue Separation

Each canteen has **TWO independent queues**:

```
┌─ Canteen A ──────────────────────────────┐
│                                          │
│  Campus Queue          Online Queue      │
│  ──────────────────────────────────────  │
│  Token A-001 (CAMPUS)  Token A-001 (OL)  │
│  Token A-002 (CAMPUS)  Token A-002 (OL)  │
│  Token A-003 (CAMPUS)  Token A-003 (OL)  │
│                                          │
│  15 people waiting     8 people waiting  │
│  Avg wait: 12 mins    Avg wait: 15 mins │
│                                          │
└──────────────────────────────────────────┘
```

### Staff View
Staff can see and manage both queues:
- Campus queue with physical tokens
- Online queue with virtual tokens
- Mark items as READY separately per queue

### Admin Dashboard
Analytics show:
- Campus traffic patterns
- Online traffic patterns
- Separate wait time metrics
- Peak hours for each queue type

---

## 📁 Files Created/Modified

### New Files
```
services/razorpayService.ts          ← Razorpay payment integration
components/OnlineOrderView.tsx       ← Complete online ordering flow
DUAL_QUEUE_SYSTEM_SETUP.md          ← This file
```

### Modified Files
```
types.ts                             ← Added QueueType, PaymentStatus enums
services/mockBackend.ts              ← Added online queue methods
components/StudentView.tsx           ← Updated to use QueueType.CAMPUS
App.tsx                              ← Added order type selection screen
package.json                         ← Added razorpay dependency
```

---

## 🎨 UI Components

### Queue Selection Screen
When users click "Place an Order", they see:

```
┌──────────────────────────────────────────┐
│     How do you want to order?            │
├──────────────────┬──────────────────────┤
│                  │                      │
│  Campus Queue    │   Online Order       │
│  ───────────────│      ───────────────│
│  📱 Scan QR      │  🛒 Select Food     │
│  ⚡ Quick        │  💳 Pay Online      │
│  🏪 At Campus    │  ⏳ Wait Virtual    │
│                  │                      │
└──────────────────┴──────────────────────┘
```

### Online Order Steps

**Step 1: Select Canteen**
- Scan QR code (saves for future)
- Or select from previously saved

**Step 2: Select Food**
- Grid view of menu items
- Shows prices
- Click to select

**Step 3: Enter Details**
- Email address field
- Phone number field
- Order summary with total

**Step 4: Payment**
- Razorpay secure checkout opens
- User enters card details securely

**Step 5: Success Confirmation**
- Large token number displayed (A-101)
- Queue position shown (#3)
- Estimated wait time
- Instructions to come to counter

---

## 🔐 Data Flow

### Campus Order Token
```json
{
  "id": "xyz123",
  "canteenId": "canteen_001",
  "queueType": "CAMPUS",
  "tokenNumber": "A-001",
  "foodItem": "Vada Pav",
  "status": "WAITING",
  "timestamp": 1705043200000,
  "estimatedWaitTimeMinutes": 5,
  "couponCode": "TKT-ABC123"
}
```

### Online Order Token
```json
{
  "id": "abc789",
  "canteenId": "canteen_001",
  "queueType": "ONLINE",
  "tokenNumber": "A-002",
  "foodItem": "Samosa",
  "status": "WAITING",
  "timestamp": 1705043200000,
  "estimatedWaitTimeMinutes": 8,
  "paymentId": "pay_xyz123",
  "paymentStatus": "COMPLETED",
  "userEmail": "user@example.com",
  "userPhone": "+91 9876543210"
}
```

---

## 💾 LocalStorage Structure

### Canteen Saving

When user scans canteen QR for the first time:

```javascript
localStorage.setItem('smartqueue_user_canteens', JSON.stringify({
  'user@example.com': 'canteen_001'
}))
```

Next time user enters email → canteen auto-loads!

---

## 🚀 How to Test

### Setup
```bash
npm install      # Install all dependencies
npm run dev      # Start development server
```

### Test Campus Queue
1. Open app
2. Click "Place an Order"
3. Click "Campus Queue"
4. Select a food item
5. Scan a canteen QR (or select from list)
6. Should get token and queue position

### Test Online Order  
1. Open app
2. Click "Place an Order"
3. Click "Online Order"
4. Scan canteen QR (saves it)
5. Select food item
6. Enter email & phone
7. Click "Proceed to Payment"
8. Mock payment completes (in demo)
9. Get virtual token with queue position

### Test Returning User
1. Online Order → Enter previous email
2. Saved canteen should auto-load ✅
3. Select food → Pay → Get token

---

## 🔑 Key Features

✅ **Two Separate Queues** - Campus and Online tracked independently
✅ **QR Code Scanning** - New users scan canteen QR to save it
✅ **Auto-Load Canteen** - Returning users' canteen loads automatically  
✅ **Razorpay Integration** - Secure online payments
✅ **Virtual Queue** - Users wait at home, come when ready
✅ **Physical Queue** - Campus users see real-time position
✅ **Same Token System** - A-001, A-002 etc. but separate counts
✅ **Queue Filtering** - Staff/Admin can view each queue separately
✅ **Wait Time Estimation** - Different estimates per queue type

---

## 🔄 Queue Logic

### Token Numbering Per Day

**Canteen A - Campus Queue**
```
Total orders today: 50
Today's campus tokens: A-001, A-002, A-003... A-035
Tomorrow: Resets to A-001
```

**Canteen A - Online Queue**
```
Total orders today: 30  
Today's online tokens: A-001, A-002, A-003... A-030
Tomorrow: Resets to A-001
```

Both queues start fresh daily with independent counting!

---

## 📝 Next Steps

1. **Configure Razorpay**
   - Create account at razorpay.com
   - Add keys to `.env` file

2. **Test Payments**
   - Use test card: 4111 1111 1111 1111
   - Any future date, any CVV

3. **Deploy QR Codes**
   - Generate canteen QR codes
   - Print and display at each canteen

4. **Train Staff**
   - Explain campus vs online queues
   - Show how to mark orders ready
   - Separate displays for each queue

5. **Monitor & Optimize**
   - Check queue metrics
   - Adjust staffing based on queue lengths
   - Get feedback from users

---

**Implementation Complete! ✅**

Your SmartQueue system is now ready for dual-queue operations with secure online payment integration.
