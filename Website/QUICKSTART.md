# Quick Start Guide - SmartQueue Dual Queue System

## 🚀 Getting Started in 5 Minutes

### Step 1: Install Dependencies
```bash
cd c:\Users\shour\Downloads\SmartQueue-HackHive-main
npm install
```

### Step 2: Start Development Server
```bash
npm run dev
```

Open your browser to `http://localhost:5173` (or the URL shown in terminal)

---

## 🎯 Try the Two Queue Types

### Campus Queue (Physical Pickup)

1. Click **"Place an Order"** on home page
2. Click **"Campus Queue"** button
3. Select any food item from the menu
4. Scan a canteen QR code (or select from list)
5. Get your token (e.g., **A-001**)
6. Go to the counter
7. Scan the food counter QR to join the physical queue
8. See your position in the campus queue

**What happens**: You get a real token number and join the physical queue at the canteen.

---

### Online Order (Virtual Queue)

1. Click **"Place an Order"** on home page
2. Click **"Online Order"** button
3. **Scan a canteen QR code** (this saves it for next time!)
4. Select a food item with pricing
5. Enter your email and phone number
6. Click **"Proceed to Payment"**
7. Complete Razorpay payment (use test card)
8. Get your virtual token with queue position
9. See how many people are ahead of you

**What happens**: You pay online, get a virtual token, and can wait at home. Come to the counter when ready!

### Returning User (Next Day)

1. Click **"Online Order"**
2. Enter your saved email
3. **Your canteen auto-loads!** 
4. Select food
5. Pay and get token
6. No need to scan QR again!

---

## 💳 Test Razorpay Payment

When you click "Proceed to Payment" in the online order flow:

**Test Card Details:**
- Card Number: `4111 1111 1111 1111`
- Expiry: Any future date (e.g., 12/25)
- CVV: Any 3 digits (e.g., 123)

The payment will complete successfully in demo mode.

---

## 📱 Key Features to Try

### Feature 1: QR Code Canteen Saving
```
First time user:
1. Online Order → Scan Canteen QR
2. Canteen saved automatically
3. Next time: Just enter email → canteen loads!
```

### Feature 2: Queue Type Selection
```
Home page has clear buttons:
- Campus Queue (for pickup)
- Online Order (for payment)
```

### Feature 3: Separate Queue Management
```
Each canteen has TWO independent queues:
- Campus queue: A-001, A-002, A-003...
- Online queue: A-001, A-002, A-003...
(They count separately!)
```

### Feature 4: Different Wait Times
```
Campus Queue: Shows physical position
- "You are #3 in queue"
- Real-time position updates

Online Queue: Shows estimated time
- "You are #5 in virtual queue"
- "Estimated wait: 12 minutes"
```

---

## 📂 Project Structure

```
SmartQueue-HackHive-main/
├── components/
│   ├── StudentView.tsx          ← Campus queue logic
│   ├── OnlineOrderView.tsx      ← Online order flow (NEW)
│   ├── StaffView.tsx            ← Manage both queues
│   ├── AdminView.tsx            ← Analytics
│   └── ...
├── services/
│   ├── mockBackend.ts           ← Queue logic (updated)
│   ├── razorpayService.ts       ← Payment service (NEW)
│   └── ...
├── types.ts                     ← Updated with QueueType (updated)
├── App.tsx                      ← Queue selection screen (updated)
├── DUAL_QUEUE_SYSTEM_SETUP.md  ← Full documentation
├── IMPLEMENTATION_DETAILS.md    ← Technical details
└── package.json                 ← Added razorpay
```

---

## 🔍 What Changed From Original

### Before (Single Queue)
```
All orders → One queue → CAMPUS only
```

### After (Dual Queue)
```
Orders split into two:
├── CAMPUS Queue  ← Existing StudentView flow
└── ONLINE Queue  ← New OnlineOrderView flow
     └─ With Razorpay payment integration
```

---

## 🧪 Test Scenarios

### Scenario 1: New Campus User
```
1. No saved canteen
2. Select Campus Queue
3. Scan/Select canteen
4. Get physical token
5. Join campus queue
Result: Real-time queue position
```

### Scenario 2: New Online User
```
1. No saved canteen
2. Select Online Order
3. Scan canteen QR → SAVED ✅
4. Select food, pay
5. Get virtual token
Result: Can order anytime, canteen remembered!
```

### Scenario 3: Returning Online User
```
1. Has saved email
2. Select Online Order
3. Enter email → canteen auto-loads ✅
4. Select food, pay
5. Quick & easy!
Result: 2-step ordering (no QR scan needed)
```

---

## 🛠️ Customization

### Change Queue Prefix
In `services/mockBackend.ts`, modify:
```typescript
const generateTokenNumber = (currentCount: number) => {
  const number = (currentCount + 1).toString().padStart(3, '0');
  return `A-${number}`; // Change 'A' to 'C' or 'O'
};
```

### Change Food Prices
In `components/OnlineOrderView.tsx`, modify:
```typescript
const getFoodPrice = (foodId: string): number => {
  const priceMap: Record<string, number> = {
    'vadapav': 40,      // Change prices here
    'alooparatha': 50,
    // ...
  };
  return priceMap[foodId] || 150;
};
```

### Customize Colors
Update Tailwind classes in components:
```tsx
// Campus Queue button - change from blue-600 to your color
className="bg-blue-600 hover:bg-blue-700"

// Online Queue button - change from green-600 to your color
className="bg-green-600 hover:bg-green-700"
```

---

## 🐛 Troubleshooting

### "Cannot find module" errors?
```bash
npm install
npm run dev
```

### Razorpay not loading?
- Check browser console for script load errors
- Make sure you're online (CDN script loads)
- Try hard refresh (Ctrl+Shift+R)

### Canteen not saving?
- Check browser's localStorage
- Inspect → Application → LocalStorage
- Look for `smartqueue_user_canteens` key

### Queue position not updating?
- Check that you're using correct QueueType
- Campus: `QueueType.CAMPUS`
- Online: `QueueType.ONLINE`

---

## 📚 Documentation Files

Read these for more details:

1. **DUAL_QUEUE_SYSTEM_SETUP.md**
   - Complete system overview
   - User journeys
   - Architecture explanation

2. **IMPLEMENTATION_DETAILS.md**
   - Code changes explained
   - Data flow examples
   - Testing checklist

3. **This file (QUICKSTART.md)**
   - Get running fast
   - Try it out immediately

---

## 🚀 Next Steps

### For Testing
- [ ] Try campus queue flow
- [ ] Try online order flow
- [ ] Test canteen saving
- [ ] Verify queue positions update

### For Development
- [ ] Connect to real backend API
- [ ] Setup real Razorpay account
- [ ] Add email notifications
- [ ] Deploy to production

### For Deployment
- [ ] Configure Razorpay API keys
- [ ] Setup backend payment verification
- [ ] Print QR codes for canteens
- [ ] Train staff on system
- [ ] Go live!

---

## 💡 Tips

**Tip 1**: Each queue type counts tokens separately per day
- Campus tokens: A-001, A-002, A-003...
- Online tokens: A-001, A-002, A-003...
- Tomorrow: Both reset to A-001

**Tip 2**: Canteen QR code should contain:
```
https://smartqueue.com?canteenId=xyz&name=Main%20Canteen&campus=Building%20A
```

**Tip 3**: Save this in localStorage for demos:
```javascript
localStorage.setItem('smartqueue_user_canteens', JSON.stringify({
  'demo@example.com': 'demo_canteen_id'
}))
```

**Tip 4**: Staff View shows both queues separately:
- Campus orders in one section
- Online orders in another section
- Easy to manage both!

---

## 📞 Support

For detailed info, check:
- `DUAL_QUEUE_SYSTEM_SETUP.md` - System overview
- `IMPLEMENTATION_DETAILS.md` - Technical details
- Code comments in components

Good luck! 🎉
