import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST' && req.url.includes('/api/create-order')) {
    return handleCreateOrder(req, res);
  }

  if (req.method === 'GET' && req.url.includes('/health')) {
    return res.status(200).json({ status: 'Backend server is running' });
  }

  res.status(404).json({ error: 'Not Found' });
}

async function handleCreateOrder(req, res) {
  try {
    const { amount, currency, receipt, notes } = req.body || {};

    // Validate input
    if (!amount || !currency) {
      return res.status(400).json({ error: 'Amount and currency are required' });
    }

    // Get Razorpay credentials from environment variables
    const RAZORPAY_KEY_ID = process.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_S2ZiBOtNgg2gta';
    const RAZORPAY_KEY_SECRET = process.env.VITE_RAZORPAY_KEY_SECRET || '9UUuvkyxieO4PnwvwUB8WMQF';

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
}
