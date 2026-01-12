import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Razorpay credentials
const RAZORPAY_KEY_ID = process.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_S2ZiBOtNgg2gta';
const RAZORPAY_KEY_SECRET = process.env.VITE_RAZORPAY_KEY_SECRET || '9UUuvkyxieO4PnwvwUB8WMQF';

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Backend server is running' });
});

// Create order endpoint
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, currency, receipt, notes } = req.body;

    // Validate input
    if (!amount || !currency) {
      return res.status(400).json({ error: 'Amount and currency are required' });
    }

    // Create Basic Auth header
    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');

    // Call Razorpay API
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
        notes: notes || {}
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Razorpay API error:', data);
      return res.status(response.status).json({ error: data.error || 'Failed to create order' });
    }

    // Return order details
    res.json({
      id: data.id,
      amount: data.amount,
      currency: data.currency,
      receipt: data.receipt,
      status: data.status
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
  console.log(`📍 Order creation endpoint: POST http://localhost:${PORT}/api/create-order`);
});
