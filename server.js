require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Allow only your specific Netlify site
app.use(cors({
  origin: 'https://swiftwallet-stk-push.netlify.app'
}));

// Format phone to 254XXXXXXXXX
function formatPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('7')) return '254' + digits;
  if (digits.length === 10 && digits.startsWith('07')) return '254' + digits.substring(1);
  if (digits.length === 12 && digits.startsWith('254')) return digits;
  return null;
}

// Initiate STK Push
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

    if (process.env.CHANNEL_ID) {
      payload.channel_id = parseInt(process.env.CHANNEL_ID, 10);
    }

    const resp = await axios.post(
      process.env.API_BASE_URL + 'payments.php',
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (resp.data.success) {
      res.json({ success: true, message: 'STK push sent, check your phone' });
    } else {
      res.status(400).json({ success: false, error: resp.data.error || 'Failed to initiate payment' });
    }

  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Callback from SwiftWallet
app.post('/callback', (req, res) => {
  console.log('Callback received:', req.body);
  res.json({ ResultCode: 0, ResultDesc: 'Success' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
