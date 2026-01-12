# Implementation Details - SmartQueue Dual Queue System

## 📋 Summary of Changes

### 1. Type System Updates (`types.ts`)

Added two new enums and updated Token interface:

```typescript
// New Enums
export enum QueueType {
  CAMPUS = 'CAMPUS',  // Physical queue at canteen
  ONLINE = 'ONLINE'   // Virtual queue with online payment
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

// Updated Token Interface
export interface Token {
  id: string;
  canteenId: string;
  couponCode: string;
  tokenNumber: string;
  foodItem: string;
  status: OrderStatus;
  queueType: QueueType;              // ← NEW
  timestamp: number;
  estimatedWaitTimeMinutes: number;
  aiReasoning?: string;
  completedAt?: number;
  
  // ← NEW: Online Payment Fields
  paymentId?: string;
  paymentStatus?: PaymentStatus;
  userEmail?: string;
  userPhone?: string;
}
```

---

### 2. Backend Service Extensions (`services/mockBackend.ts`)

#### Updated Imports
```typescript
import { Token, OrderStatus, QueueStats, MenuItem, Canteen, UserRole, QueueType, PaymentStatus } from '../types';
```

#### Modified Methods

**`createToken()` - Now supports QueueType parameter**
```typescript
async createToken(
  canteenId: string,
  couponCode: string,
  foodItem: string,
  queueType: QueueType = QueueType.CAMPUS  // ← NEW parameter
): Promise<Token>
```

**`getQueuePosition()` - Now filters by QueueType**
```typescript
async getQueuePosition(
  canteenId: string,
  tokenId: string,
  queueType?: QueueType  // ← NEW: Can filter by type
): Promise<number>
```

#### New Methods

**Create Online Order**
```typescript
async createOnlineOrder(
  canteenId: string,
  foodItem: string,
  userEmail: string,
  userPhone: string,
  paymentId: string
): Promise<Token> {
  // Returns online queue token with payment details
}
```

**Get Campus Queue Only**
```typescript
async getCampusQueue(canteenId: string): Promise<Token[]> {
  // Filter tokens where queueType === QueueType.CAMPUS
}
```

**Get Online Queue Only**
```typescript
async getOnlineQueue(canteenId: string): Promise<Token[]> {
  // Filter tokens where queueType === QueueType.ONLINE
}
```

**Save User Canteen**
```typescript
saveUserCanteen(canteenId: string, email?: string): void {
  // Saves to localStorage: smartqueue_user_canteens
  // Key: user email, Value: canteen ID
}
```

**Get Saved User Canteen**
```typescript
getUserSavedCanteen(email?: string): string | null {
  // Retrieves saved canteen ID from localStorage
}
```

---

### 3. Razorpay Service (`services/razorpayService.ts`)

New service for payment processing:

```typescript
export const RazorpayService = {
  // Load Razorpay CDN script
  initializeRazorpay(): Promise<boolean>
  
  // Create order (backend does this in production)
  createOrder(
    amount: number,
    canteenName: string,
    foodItem: string
  ): Promise<RazorpayOrder>
  
  // Open secure checkout modal
  openCheckout(
    amount: number,
    orderId: string,
    userEmail: string,
    userPhone: string,
    canteenName: string,
    foodItem: string,
    onSuccess: (paymentId: string) => void,
    onError: (error: any) => void
  ): Promise<void>
  
  // Verify payment signature
  verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string
  ): Promise<boolean>
}
```

---

### 4. Online Order Component (`components/OnlineOrderView.tsx`)

Complete component with 5-step flow:

**Props:**
```typescript
interface OnlineOrderViewProps {
  onOrderPlaced: (token: Token) => void;
}
```

**States:**
```typescript
const [step, setStep] = useState<OrderStep>('SELECT_CANTEEN');
// OrderStep = 'SELECT_CANTEEN' | 'SELECT_FOOD' | 'ENTER_DETAILS' | 'PAYMENT' | 'SUCCESS'

const [selectedCanteen, setSelectedCanteen] = useState<Canteen | null>(null);
const [selectedFood, setSelectedFood] = useState<string | null>(null);
const [userEmail, setUserEmail] = useState('');
const [userPhone, setUserPhone] = useState('');
const [token, setToken] = useState<Token | null>(null);
const [queuePosition, setQueuePosition] = useState(0);
const [isScanning, setIsScanning] = useState(false);
```

**Key Features:**
- QR Scanner for canteen selection (with camera access)
- Auto-load saved canteen when email entered
- Food menu with pricing
- Razorpay checkout integration
- Success confirmation with queue position

---

### 5. Student View Updates (`components/StudentView.tsx`)

Modified to specify CAMPUS queue type:

```typescript
// Import updated types
import { Token, OrderStatus, Canteen, QueueType } from '../types';

// When creating token
const newToken = await BackendService.createToken(
  canteenId,
  ticketHash,
  selectedFood,
  QueueType.CAMPUS  // ← Specify CAMPUS queue
);

// When getting queue position
const pos = await BackendService.getQueuePosition(
  canteenId,
  newToken.id,
  QueueType.CAMPUS  // ← Filter to CAMPUS queue
);
```

---

### 6. App.tsx Updates

**New State:**
```typescript
const [orderType, setOrderType] = useState<'CAMPUS' | 'ONLINE' | null>(null);
```

**New Flow:**
```
1. User clicks "Place an Order"
   ↓
2. orderType selection screen appears
   ├─ Campus Queue option
   └─ Online Order option
   ↓
3. User selects:
   ├─ CAMPUS → StudentView (existing flow)
   └─ ONLINE → OnlineOrderView (new flow)
```

**Queue Type Selection Screen:**
```jsx
{step === 'SELECT_CANTEEN' && (
  <div className="max-w-2xl mx-auto">
    <h2>How do you want to order?</h2>
    
    <button onClick={() => setOrderType('CAMPUS')}>
      Campus Queue - Pick up at counter
    </button>
    
    <button onClick={() => setOrderType('ONLINE')}>
      Online Order - Pay online & wait virtually
    </button>
  </div>
)}
```

---

## 🔄 Data Flow Examples

### Campus Queue Flow

```
User selects CAMPUS
    ↓
StudentView component loads
    ↓
User selects food item
    ↓
User scans canteen QR
    ↓
BackendService.createToken(
  canteenId,
  couponCode,
  foodItem,
  QueueType.CAMPUS  ← Token type specified
)
    ↓
Token created with queueType: 'CAMPUS'
    ↓
User goes to counter, scans food counter QR
    ↓
Token moves to physical queue
    ↓
Staff manages in StaffView (campus queue section)
```

### Online Order Flow

```
User selects ONLINE
    ↓
OnlineOrderView component loads
    ↓
Step 1: User scans/selects canteen
  └─ If first time: canteen saved to localStorage
    ↓
Step 2: User selects food item
    ↓
Step 3: User enters email & phone
  └─ If email saved before: canteen auto-loads
    ↓
Step 4: User clicks "Proceed to Payment"
  └─ RazorpayService.createOrder()
  └─ RazorpayService.openCheckout()
    ↓
Step 5: Payment successful
  └─ paymentId received from Razorpay
    ↓
BackendService.createOnlineOrder(
  canteenId,
  foodItem,
  userEmail,
  userPhone,
  paymentId  ← Payment ID stored
)
    ↓
Token created with:
  - queueType: 'ONLINE'
  - paymentStatus: 'COMPLETED'
  - paymentId: 'pay_xyz123'
    ↓
User gets virtual token
  └─ Can leave and come back later
    ↓
Staff manages in StaffView (online queue section)
```

---

## 🛠️ Queue Filtering Logic

### Get Queue Position

```typescript
async getQueuePosition(
  canteenId: string,
  tokenId: string,
  queueType?: QueueType
): Promise<number> {
  const tokens: Token[] = JSON.parse(localStorage.getItem(STORAGE_KEY_TOKENS) || '[]');
  
  let activeTokens;
  
  if (queueType) {
    // Filter by both canteen AND queue type
    activeTokens = tokens.filter(
      t => t.canteenId === canteenId 
        && t.status === OrderStatus.WAITING 
        && t.queueType === queueType  // ← Key difference
    );
  } else {
    // Legacy: get all waiting tokens
    activeTokens = tokens.filter(
      t => t.canteenId === canteenId 
        && t.status === OrderStatus.WAITING
    );
  }
  
  const index = activeTokens.findIndex(t => t.id === tokenId);
  return index === -1 ? 0 : index + 1;
}
```

---

## 🎯 Key Decisions

### Why Separate Queues?

1. **Different Processes**
   - Campus: Physical token, immediate pickup
   - Online: Virtual token, come anytime

2. **Different Wait Times**
   - Campus: Real queue length
   - Online: Can be longer (user not waiting in person)

3. **Staffing Flexibility**
   - Can prioritize campus orders during rush
   - Online orders get separate slot

4. **User Experience**
   - Campus users see real position
   - Online users see estimated time

### Why Same Token Numbering?

- Simpler for users
- Easy to remember
- Can add prefix if needed (C-001 vs O-001)
- Currently separate counting per queue type

### Why Save Canteen to LocalStorage?

- No backend required for demo
- Instant loading on repeat users
- Works offline
- Can migrate to backend later

---

## 📝 Testing Checklist

- [ ] Campus queue creates tokens with queueType = 'CAMPUS'
- [ ] Online queue creates tokens with queueType = 'ONLINE'
- [ ] Queue positions calculated separately per type
- [ ] Canteen saved to localStorage on first QR scan
- [ ] Saved canteen auto-loads when user enters email
- [ ] Razorpay checkout opens and closes properly
- [ ] Payment success creates online token
- [ ] Token displays correct queue position
- [ ] Staff view shows both queues
- [ ] Admin dashboard distinguishes queue types

---

## 🚀 Production Readiness

### Before Production

1. **Backend API Integration**
   ```typescript
   // Replace mock with real API calls
   createOrder: async (amount, canteenName, foodItem) => {
     return await fetch('/api/orders/create', {
       method: 'POST',
       body: JSON.stringify({ amount, canteenName, foodItem })
     }).then(r => r.json());
   }
   ```

2. **Payment Verification**
   ```typescript
   // Backend must verify Razorpay signature
   verifyPayment: async (orderId, paymentId, signature) => {
     return await fetch('/api/payments/verify', {
       method: 'POST',
       body: JSON.stringify({ orderId, paymentId, signature })
     }).then(r => r.json());
   }
   ```

3. **Email Notifications**
   - Send order confirmation email
   - Send "ready for pickup" notification
   - Send receipt with payment details

4. **Database Integration**
   - Move localStorage to real database
   - Ensure data persistence
   - Add backup & recovery

5. **Security**
   - Validate Razorpay signatures on backend
   - Encrypt user phone numbers
   - Rate limit payment endpoints

---

## 📊 Metrics to Track

```typescript
// Campus Queue
- Average wait time per hour
- Queue length variations
- Peak hours
- Food item popularity

// Online Queue
- Average time to complete order
- Payment success rate
- Refund rate
- Time between order & pickup

// Overall
- Campus vs Online ratio
- User retention
- Conversion rate
```

This implementation provides a solid foundation for a dual-queue cafeteria management system!
