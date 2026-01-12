import { Token, OrderStatus, QueueStats, MenuItem, Canteen, UserRole, QueueType, PaymentStatus } from '../types';
import { db } from './firebaseConfig';
import { ref, set, push, onValue, update, get, child } from 'firebase/database';

// Keys for local storage (kept for caching/synchronous reads)
const STORAGE_KEY_TOKENS = 'smartqueue_tokens';
const STORAGE_KEY_CANTEENS = 'smartqueue_canteens';
const STORAGE_KEY_HISTORY = 'smartqueue_history';

// Helper to generate a random ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// Helper to generate a readable token number (e.g., A-001)
const generateTokenNumber = (currentCount: number) => {
  const number = (currentCount + 1).toString().padStart(3, '0');
  return `A-${number}`;
};

// Event Dispatcher for Real-time updates
const notifyChange = () => {
  window.dispatchEvent(new Event('smartqueue-update'));
};

// --- Firebase Sync Logic ---
const syncRef = (path: string, storageKey: string) => {
  // Only sync if Firebase is properly configured
  if (!db) {
    console.log('Firebase not configured, skipping sync for', path);
    return;
  }
  
  try {
    const dbRef = ref(db, path);
    onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      // Firebase returns objects for lists usually, need to convert to array if needed
      let parsedData: any[] = [];
      if (data) {
        if (Array.isArray(data)) {
          parsedData = data.filter(Boolean); // remove empty checks
        } else {
          parsedData = Object.values(data);
        }
      }
      localStorage.setItem(storageKey, JSON.stringify(parsedData));
      notifyChange();
    });
  } catch (err) {
    console.warn('Firebase sync failed for', path, err);
  }
};

// Initialize Sync
// We only sync if we are in a browser environment to avoid build errors
if (typeof window !== 'undefined') {
  syncRef('canteens', STORAGE_KEY_CANTEENS);
  syncRef('tokens', STORAGE_KEY_TOKENS);
  syncRef('history', STORAGE_KEY_HISTORY);
}

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'vadapav',
    name: 'Vada Pav',
    icon: 'pizza',
    color: 'bg-orange-100 text-orange-700'
  },
  {
    id: 'alooparatha',
    name: 'Aloo Paratha',
    icon: 'utensils',
    color: 'bg-yellow-100 text-yellow-700'
  },
  {
    id: 'samosa',
    name: 'Samosa',
    icon: 'pizza',
    color: 'bg-amber-100 text-amber-700'
  },
  {
    id: 'masaladosa',
    name: 'Masala Dosa',
    icon: 'utensils',
    color: 'bg-orange-50 text-orange-800'
  },
  {
    id: 'cholebhature',
    name: 'Chole Bhature',
    icon: 'utensils',
    color: 'bg-red-50 text-red-800'
  },
  {
    id: 'sandwich',
    name: 'Veg Sandwich',
    icon: 'sandwich',
    color: 'bg-green-100 text-green-700'
  },
  {
    id: 'coffee',
    name: 'Cold Coffee',
    icon: 'coffee',
    color: 'bg-stone-100 text-stone-700'
  },
];

export const BackendService = {

  MENU_ITEMS,

  // --- Canteen Management ---

  registerCanteen: async (name: string, campus: string): Promise<Canteen> => {
    // Assign a random gradient theme
    const themes = [
      'from-blue-500 to-indigo-600',
      'from-amber-600 to-orange-600',
      'from-red-500 to-pink-600',
      'from-green-500 to-emerald-600',
      'from-purple-500 to-violet-600'
    ];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];

    const newCanteen: Canteen = {
      id: generateId(),
      name,
      campus,
      themeColor: randomTheme
    };

    // Save to localStorage
    const canteens: Canteen[] = JSON.parse(localStorage.getItem(STORAGE_KEY_CANTEENS) || '[]');
    canteens.push(newCanteen);
    localStorage.setItem(STORAGE_KEY_CANTEENS, JSON.stringify(canteens));

    // Write to Firebase (non-blocking, may fail silently if not configured)
    try {
      await set(ref(db, `canteens/${newCanteen.id}`), newCanteen);
    } catch (err) {
      console.warn('Firebase write failed, using localStorage only:', err);
    }

    return newCanteen;
  },

  // Save a canteen directly (e.g. from QR scan)
  saveCanteen: async (canteen: Canteen): Promise<void> => {
    // Save to localStorage first (primary storage)
    const canteens: Canteen[] = JSON.parse(localStorage.getItem(STORAGE_KEY_CANTEENS) || '[]');
    const index = canteens.findIndex(c => c.id === canteen.id);
    if (index >= 0) {
      canteens[index] = canteen;
    } else {
      canteens.push(canteen);
    }
    localStorage.setItem(STORAGE_KEY_CANTEENS, JSON.stringify(canteens));

    // Try to write to Firebase (non-blocking)
    if (db) {
      try {
        await set(ref(db, `canteens/${canteen.id}`), canteen);
      } catch (err) {
        console.warn('Firebase write failed, using localStorage only:', err);
      }
    }
  },

  getCanteen: (id: string): Canteen | undefined => {
    const canteens: Canteen[] = JSON.parse(localStorage.getItem(STORAGE_KEY_CANTEENS) || '[]');
    return canteens.find(c => c.id === id);
  },

  getAllCanteens: (): Canteen[] => {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_CANTEENS) || '[]');
  },

  // --- Student Methods ---

  createToken: async (canteenId: string, couponCode: string, foodItem: string, queueType: QueueType = QueueType.CAMPUS): Promise<Token> => {
    // We need to fetch current tokens from Firebase (or use local cache) to count them for the number
    // To be safe against race conditions, we should use a transaction, but for this scale, reading local is acceptable trade-off
    // or better: just use a timestamp-based ID or random ID. The "token number" A-001 is cosmetic.

    const tokens: Token[] = JSON.parse(localStorage.getItem(STORAGE_KEY_TOKENS) || '[]');
    const today = new Date().setHours(0, 0, 0, 0);
    const canteenTodayTokens = tokens.filter(t => t.canteenId === canteenId && t.timestamp >= today && t.queueType === queueType);

    const newToken: Token = {
      id: generateId(),
      canteenId,
      couponCode,
      tokenNumber: generateTokenNumber(canteenTodayTokens.length),
      foodItem,
      status: OrderStatus.WAITING,
      queueType,
      timestamp: Date.now(),
      estimatedWaitTimeMinutes: 5,
    };

    // Save to localStorage first
    tokens.push(newToken);
    localStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(tokens));
    
    // Notify listeners of change
    notifyChange();

    // Try Firebase (non-blocking)
    if (db) {
      try {
        await set(ref(db, `tokens/${newToken.id}`), newToken);
      } catch (err) {
        console.warn('Firebase write failed for token, using localStorage:', err);
      }
    }
    
    return newToken;
  },

  // Create token for online payment orders
  createOnlineOrder: async (
    canteenId: string,
    foodItem: string,
    userEmail: string,
    userPhone: string,
    paymentId: string
  ): Promise<Token> => {
    const tokens: Token[] = JSON.parse(localStorage.getItem(STORAGE_KEY_TOKENS) || '[]');
    const today = new Date().setHours(0, 0, 0, 0);
    const canteenTodayOnlineTokens = tokens.filter(
      t => t.canteenId === canteenId && t.timestamp >= today && t.queueType === QueueType.ONLINE
    );

    const newToken: Token = {
      id: generateId(),
      canteenId,
      couponCode: '', // Online orders don't have coupon codes
      tokenNumber: generateTokenNumber(canteenTodayOnlineTokens.length),
      foodItem,
      status: OrderStatus.WAITING,
      queueType: QueueType.ONLINE,
      timestamp: Date.now(),
      estimatedWaitTimeMinutes: 8,
      paymentId,
      paymentStatus: PaymentStatus.COMPLETED,
      userEmail,
      userPhone
    };

    // Save to localStorage first
    tokens.push(newToken);
    localStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(tokens));
    
    // Notify listeners of change
    notifyChange();

    // Try Firebase (non-blocking)
    if (db) {
      try {
        await set(ref(db, `tokens/${newToken.id}`), newToken);
      } catch (err) {
        console.warn('Firebase write failed for online order, using localStorage:', err);
      }
    }
    
    return newToken;
  },

  getTokenStatus: async (tokenId: string): Promise<Token | null> => {
    const tokens: Token[] = JSON.parse(localStorage.getItem(STORAGE_KEY_TOKENS) || '[]');
    return tokens.find(t => t.id === tokenId) || null;
  },

  getQueuePosition: async (canteenId: string, tokenId: string, queueType?: QueueType): Promise<number> => {
    const tokens: Token[] = JSON.parse(localStorage.getItem(STORAGE_KEY_TOKENS) || '[]');
    let activeTokens;
    
    if (queueType) {
      activeTokens = tokens.filter(
        t => t.canteenId === canteenId && t.status === OrderStatus.WAITING && t.queueType === queueType
      );
    } else {
      activeTokens = tokens.filter(t => t.canteenId === canteenId && t.status === OrderStatus.WAITING);
    }
    
    const index = activeTokens.findIndex(t => t.id === tokenId);
    return index === -1 ? 0 : index + 1;
  },

  // Get both campus and online queues
  getCampusQueue: async (canteenId: string): Promise<Token[]> => {
    const tokens: Token[] = JSON.parse(localStorage.getItem(STORAGE_KEY_TOKENS) || '[]');
    return tokens.filter(t =>
      t.canteenId === canteenId &&
      (t.status === OrderStatus.WAITING || t.status === OrderStatus.READY) &&
      t.queueType === QueueType.CAMPUS
    );
  },

  getOnlineQueue: async (canteenId: string): Promise<Token[]> => {
    const tokens: Token[] = JSON.parse(localStorage.getItem(STORAGE_KEY_TOKENS) || '[]');
    return tokens.filter(t =>
      t.canteenId === canteenId &&
      (t.status === OrderStatus.WAITING || t.status === OrderStatus.READY) &&
      t.queueType === QueueType.ONLINE
    );
  },

  // Save canteen ID to localStorage for user (new users after QR scan)
  saveUserCanteen: (canteenId: string, email?: string): void => {
    const userCanteens = JSON.parse(localStorage.getItem('smartqueue_user_canteens') || '{}');
    userCanteens[email || 'default'] = canteenId;
    localStorage.setItem('smartqueue_user_canteens', JSON.stringify(userCanteens));
  },

  // Get saved canteen for user
  getUserSavedCanteen: (email?: string): string | null => {
    const userCanteens = JSON.parse(localStorage.getItem('smartqueue_user_canteens') || '{}');
    return userCanteens[email || 'default'] || null;
  },

  // --- Staff Methods ---

  getActiveQueue: async (canteenId: string): Promise<Token[]> => {
    const tokens: Token[] = JSON.parse(localStorage.getItem(STORAGE_KEY_TOKENS) || '[]');
    return tokens.filter(t =>
      t.canteenId === canteenId &&
      (t.status === OrderStatus.WAITING || t.status === OrderStatus.READY)
    );
  },

  markOrderReady: async (tokenId: string): Promise<void> => {
    const tokens: Token[] = JSON.parse(localStorage.getItem(STORAGE_KEY_TOKENS) || '[]');
    const token = tokens.find(t => t.id === tokenId);
    if (token) {
      token.status = OrderStatus.READY;
      localStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(tokens));
      notifyChange();
    }
    
    if (db) {
      try {
        await update(ref(db, `tokens/${tokenId}`), { status: OrderStatus.READY });
      } catch (err) {
        console.warn('Firebase update failed, using localStorage:', err);
      }
    }
  },

  completeOrder: async (tokenId: string): Promise<void> => {
    const tokens: Token[] = JSON.parse(localStorage.getItem(STORAGE_KEY_TOKENS) || '[]');
    const token = tokens.find(t => t.id === tokenId);
    if (token) {
      token.status = OrderStatus.COMPLETED;
      token.completedAt = Date.now();
      localStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(tokens));
      notifyChange();
    }
    
    if (db) {
      try {
        await update(ref(db, `tokens/${tokenId}`), {
          status: OrderStatus.COMPLETED,
          completedAt: Date.now()
        });
      } catch (err) {
        console.warn('Firebase update failed, using localStorage:', err);
      }
    }
  },

  // --- Admin Methods ---

  getStats: async (canteenId: string): Promise<QueueStats> => {
    const tokens: Token[] = JSON.parse(localStorage.getItem(STORAGE_KEY_TOKENS) || '[]');

    const canteenTokens = tokens.filter(t => t.canteenId === canteenId);
    const activeTokens = canteenTokens.filter(t => t.status === OrderStatus.WAITING);
    const completedTokens = canteenTokens.filter(t => t.status === OrderStatus.COMPLETED && t.completedAt);

    let totalWaitTime = 0;
    completedTokens.forEach(t => {
      if (t.completedAt) {
        totalWaitTime += (t.completedAt - t.timestamp);
      }
    });

    const averageWaitTimeMs = completedTokens.length > 0 ? totalWaitTime / completedTokens.length : 0;

    return {
      totalOrdersToday: canteenTokens.length,
      averageWaitTime: Math.round(averageWaitTimeMs / 60000),
      peakHour: '12:00 PM - 1:00 PM', // Placeholder logic remains
      activeQueueLength: activeTokens.length,
    };
  },

  getHourlyTraffic: async (canteenId: string): Promise<{ name: string, orders: number }[]> => {
    const tokens: Token[] = JSON.parse(localStorage.getItem(STORAGE_KEY_TOKENS) || '[]');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const todayTokens = tokens.filter(t => t.canteenId === canteenId && t.timestamp >= todayMs);

    const trafficMap: Record<number, number> = {};
    todayTokens.forEach(t => {
      const h = new Date(t.timestamp).getHours();
      trafficMap[h] = (trafficMap[h] || 0) + 1;
    });

    const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    Object.keys(trafficMap).forEach(k => {
      if (!hours.includes(Number(k))) hours.push(Number(k));
    });
    hours.sort((a, b) => a - b);

    return hours.map(h => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 || 12;
      return {
        name: `${displayH} ${ampm}`,
        orders: trafficMap[h] || 0
      };
    });
  },

  updateTokenEstimation: async (tokenId: string, minutes: number, reasoning?: string) => {
    const updates: any = { estimatedWaitTimeMinutes: minutes };
    if (reasoning) updates.aiReasoning = reasoning;
    await update(ref(db, `tokens/${tokenId}`), updates);
  },

  recordOrderHistory: async (tokenId: string, foodItem: string, prepTimeMinutes: number, hour: number) => {
    const newEntry = {
      id: generateId(),
      foodItem,
      prepTimeMinutes,
      hour,
      timestamp: Date.now()
    };
    await push(ref(db, 'history'), newEntry);
  },

  getHistoricalDataForFood: async (foodItem: string): Promise<any[]> => {
    const history: any[] = JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || '[]');
    return history.filter(h => h.foodItem === foodItem);
  },

  getAllHistoricalData: async (): Promise<any[]> => {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || '[]');
  },

  getTodaysOrderSummary: async (canteenId: string): Promise<{ foodItem: string, count: number, totalPrepTime: number }[]> => {
    const tokens: Token[] = JSON.parse(localStorage.getItem(STORAGE_KEY_TOKENS) || '[]');
    const today = new Date().setHours(0, 0, 0, 0);
    
    // Get all completed orders for this canteen today
    const todayTokens = tokens.filter(t => 
      t.canteenId === canteenId && 
      t.timestamp >= today && 
      t.status === OrderStatus.COMPLETED
    );

    // Aggregate by food item
    const foodSummary: Record<string, { count: number, totalPrepTime: number }> = {};
    
    todayTokens.forEach(token => {
      if (!foodSummary[token.foodItem]) {
        foodSummary[token.foodItem] = { count: 0, totalPrepTime: 0 };
      }
      foodSummary[token.foodItem].count += 1;
      if (token.completedAt && token.timestamp) {
        foodSummary[token.foodItem].totalPrepTime += (token.completedAt - token.timestamp) / 60000; // convert to minutes
      }
    });

    // Convert to array and sort by count (descending)
    return Object.entries(foodSummary)
      .map(([foodItem, data]) => ({
        foodItem,
        count: data.count,
        totalPrepTime: Math.round(data.totalPrepTime)
      }))
      .sort((a, b) => b.count - a.count);
  },


  completeOrderWithAI: async (tokenId: string, aiReasoning?: string): Promise<void> => {
    // Get current token data to calculate prep time
    // Since this is called from UI, we assume data is in local cache 
    // but to be robust we could fetch. For now, rely on cache.
    const tokens: Token[] = JSON.parse(localStorage.getItem(STORAGE_KEY_TOKENS) || '[]');
    const token = tokens.find(t => t.id === tokenId);

    const updates: any = {
      status: OrderStatus.COMPLETED,
      completedAt: Date.now()
    };
    if (aiReasoning) updates.aiReasoning = aiReasoning;

    if (token) {
      token.status = OrderStatus.COMPLETED;
      token.completedAt = Date.now();
      if (aiReasoning) token.aiReasoning = aiReasoning;
      localStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(tokens));
      notifyChange();
    }

    if (db) {
      try {
        await update(ref(db, `tokens/${tokenId}`), updates);
      } catch (err) {
        console.warn('Firebase update failed for AI completion, using localStorage:', err);
      }
    }

    // Record History
    if (token && token.timestamp) {
      const prepTimeMinutes = Math.round((Date.now() - token.timestamp) / 60000);
      const hour = new Date(token.timestamp).getHours();
      await BackendService.recordOrderHistory(tokenId, token.foodItem, prepTimeMinutes, hour);
    }
  }
};

// --- Razorpay Backend API ---
export const RazorpayBackend = {
  // Create a Razorpay order
  createOrder: async (amount: number, currency: string, receipt: string, notes: any): Promise<any> => {
    try {
      // Determine API endpoint based on environment
      const isProduction = window.location.hostname !== 'localhost';
      const apiUrl = isProduction 
        ? '/api/create-order'  // Vercel API route
        : 'http://localhost:3000/api/create-order';  // Local backend
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount, // already in paise
          currency: currency,
          receipt: receipt,
          notes: notes
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const order = await response.json();
      return {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        receipt: order.receipt,
        createdAt: Date.now()
      };
    } catch (error) {
      console.error('Razorpay order creation error:', error);
      throw error;
    }
  }
};

// --- Demo Data Initialization ---
export const initializeDemoData = async () => {
  // Step 1: Keep only VITFC canteen
  const canteens: Canteen[] = JSON.parse(localStorage.getItem(STORAGE_KEY_CANTEENS) || '[]');
  const vitfc = canteens.find(c => c.name === 'VITFC');
  
  if (!vitfc) {
    console.error('VITFC canteen not found');
    return;
  }

  // Clear all canteens except VITFC
  localStorage.setItem(STORAGE_KEY_CANTEENS, JSON.stringify([vitfc]));

  // Step 2: Generate 400 completed orders for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  
  // Spread 400 orders across 12 hours (8 AM to 8 PM)
  const tokens: Token[] = [];
  const foodItems = ['vadapav', 'alooparatha', 'samosa', 'masaladosa', 'cholebhature', 'sandwich', 'coffee'];
  
  for (let i = 0; i < 400; i++) {
    // Spread orders across 12 hours (43200000 ms)
    const timeOffset = (i / 400) * 12 * 60 * 60 * 1000;
    const timestamp = todayStart + 8 * 60 * 60 * 1000 + timeOffset; // Start from 8 AM
    
    const newToken: Token = {
      id: generateId(),
      canteenId: vitfc.id,
      couponCode: '',
      tokenNumber: `A-${(i + 1).toString().padStart(3, '0')}`,
      foodItem: foodItems[i % foodItems.length],
      status: OrderStatus.COMPLETED,
      queueType: QueueType.CAMPUS,
      timestamp: timestamp,
      completedAt: timestamp + Math.random() * 30 * 60 * 1000, // Completed within 30 mins
      estimatedWaitTimeMinutes: Math.floor(Math.random() * 15) + 5,
    };
    tokens.push(newToken);
  }

  localStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(tokens));
  notifyChange();
  
  console.log('Demo data initialized: 400 completed orders for VITFC');
};