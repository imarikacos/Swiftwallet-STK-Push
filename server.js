const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(cors({
  origin: 'https://swiftloanke-com.onrender.com'
}));

function formatPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('7')) return '254' + digits;
  if (digits.length === 10 && digits.startsWith('07')) return '254' + digits.substring(1);
  if (digits.length === 12 && digits.startsWith('254')) return digits;
  return null;
}

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
      callback_url: "https://swiftwallet-stk-push.onrender.com/callback",
      channel_id: "000103"
    };

    const url = "https://swiftwallet.co.ke/pay-app-v2/payments.php";
    const resp = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer fb53284f56ed14a6ea3ca908c70763b5d00d03e769576611e5f337709d4c7f5a`,
        'Content-Type': 'application/json'
      }
    });
    
     console.log('SwiftWallet response:', resp.data);
    if (resp.data.success) {
      res.json({ success: true, message: 'STK push sent, check your phone' });
    } else {
      res.status(400).json({
        success: false,
        error: resp.data.error || 'Failed to initiate payment'
      });
    }

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.response?.data?.error || 'Server error'
    });
  }
});

app.post('/callback', (req, res) => {
  console.log('Callback received:', req.body);
  res.json({ ResultCode: 0, ResultDesc: 'Success' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
