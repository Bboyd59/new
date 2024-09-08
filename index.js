const express = require('express');
const bodyParser = require('body-parser');
const { Anthropic } = require('@anthropic-ai/sdk');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Store user data (in memory for this example)
const users = new Map();

app.post('/api/register', (req, res) => {
  const { firstName, phone, email } = req.body;
  const userId = Date.now().toString();
  users.set(userId, { firstName, phone, email });
  res.json({ userId, firstName });
});

app.post('/api/chat', async (req, res) => {
  const { userId, message } = req.body;
  const user = users.get(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  try {
    const completion = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [
        { role: 'user', content: message }
      ],
      system: `You are a helpful assistant for A(i)ron Home Loans, providing information about mortgages and home loans. Be concise and friendly in your responses. The user's name is ${user.firstName}.`
    });

    res.json({ reply: completion.content[0].text });
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

app.post('/api/calculate-dti', (req, res) => {
  const { purchasePrice, downPayment, annualIncome, creditScore, monthlyDebt } = req.body;

  const loanAmount = purchasePrice - downPayment;
  const monthlyIncome = annualIncome / 12;
  const estimatedMonthlyPayment = (loanAmount * 0.005) + (purchasePrice * 0.001 / 12); // Simplified estimation
  const dti = ((estimatedMonthlyPayment + monthlyDebt) / monthlyIncome) * 100;

  const qualified = (
    creditScore >= 620 &&
    dti <= 43 &&
    downPayment >= purchasePrice * 0.03
  );

  res.json({ 
    qualified,
    dti: dti.toFixed(2),
    message: qualified 
      ? "Based on the information provided, you may qualify. Let's schedule a time for a free pre-approval consultation."
      : "Based on the information provided, you may not qualify at this time. Please chat with our AI assistant for more information and advice."
  });
});

app.get('/api/cal-availability', async (req, res) => {
  try {
    console.log('Fetching Cal.com availability...');
    const url = `https://api.cal.com/v1/event-types/836820/availability`;
    console.log('URL:', url);
    console.log('API Key:', process.env.CAL_API_KEY ? 'Set' : 'Not set');

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${process.env.CAL_API_KEY}`
      },
      params: {
        dateFrom: new Date().toISOString(),
        dateTo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        apiKey: process.env.CAL_API_KEY
      }
    });

    console.log('Cal.com API Response:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.busy) {
      res.json(response.data.busy);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching Cal.com availability:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to fetch availability', details: error.message });
  }
});

app.post('/api/cal-schedule', async (req, res) => {
  try {
    const response = await axios.post(`https://api.cal.com/v1/event-types/836820/bookings`, req.body, {
      headers: {
        Authorization: `Bearer ${process.env.CAL_API_KEY}`
      },
      params: {
        apiKey: process.env.CAL_API_KEY
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error scheduling Cal.com appointment:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to schedule appointment' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`ANTHROPIC_API_KEY is ${process.env.ANTHROPIC_API_KEY ? 'set' : 'not set'}`);
  console.log(`CAL_API_KEY is ${process.env.CAL_API_KEY ? 'set' : 'not set'}`);
});