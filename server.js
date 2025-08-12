require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// JSON parser
app.use(bodyParser.json());

// Allow Netlify + local dev
app.use(cors({
  origin: [
    'https://swiftwallet-stk-push.netlify.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ]
}));

// Helper: Ensure trailing slash in API base URL
function getApiBaseUrl() {
  if (!process.env.API_BASE_URL) {
    throw new Error('Missing API_BASE_URL in .env');
  }
  return process.env.API_BASE_URL.endsWith('/')
    ? process.env.API_BASE_URL
    : process.env.API_BASE_URL + '/';
}

// Format phone to 254XXXXXXXXX
function formatPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('7')) return '254' + digits;
  if (digits.length === 10 && digits.startsWith('07')) return '254' + digits.substring(1);
  if (digits.length === 12 && digits.startsWith('254')) return digits;
  return null;
}

// Payment endpoint
app.post('/pay', async (req, res) => {
  try {
    const { phone, amount } = req.body;
    const formattedPhone = formatPhone(phone);

    if (!formattedPhone) {
      return res.status(400).json({ success: false, error: 'Invalid phone format' });
    }
    if (!amount || amount < 1) {
      return res.status(400).json({ success: false, error: 'Amount must be >= 1' });
    }

    const payload = {
      amount: Math.round(amount),
      phone_number: formattedPhone,
      external_reference: 'ORDER-' + Date.now(),
      customer_name: 'Customer',
      callback_url: process.env.CALLBACK_URL
    };

    // Add channel_id only if provided
    if (process.env.CHANNEL_ID) {
      payload.channel_id = parseInt(process.env.CHANNEL_ID, 10);
      console.log(`Using channel_id: ${payload.channel_id}`);
    } else {
      console.log('No CHANNEL_ID set — using default channel from SwiftWallet dashboard.');
    }

    const url = getApiBaseUrl() + 'payments.php';
    console.log(`Sending payment request to: ${url}`);

    const resp = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${process.env.API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (resp.data.success) {
      res.json({ success: true, message: 'STK push sent, check your phone' });
    } else {
      res.status(400).json({
        success: false,
        error: resp.data.error || 'Failed to initiate payment'
      });
    }

  } catch (err) {
    console.error('Payment request failed:', {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message
    });
    res.status(500).json({
      success: false,
      error: err.response?.data?.error || 'Server error'
    });
  }
});

// SwiftWallet callback
app.post('/callback', (req, res) => {
  console.log('Callback received:', req.body);
  res.json({ ResultCode: 0, ResultDesc: 'Success' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
