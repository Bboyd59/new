const express = require('express');
const bodyParser = require('body-parser');
const { Anthropic } = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  try {
    const completion = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [
        { role: 'user', content: message }
      ],
      system: "You are a helpful assistant for A(i)ron Home Loans, providing information about mortgages and home loans. Be concise and friendly in your responses."
    });

    res.json({ reply: completion.content[0].text });
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

app.post('/api/prequalify', (req, res) => {
  const { purchasePrice, annualIncome, creditScore, monthlyDebt, downPayment } = req.body;

  // Simple pre-qualification logic (adjust as needed)
  const qualified = (
    creditScore >= 620 &&
    (annualIncome / 12) * 0.43 > monthlyDebt &&
    downPayment >= purchasePrice * 0.03
  );

  res.json({ 
    qualified,
    message: qualified 
      ? "Based on the information provided, you may qualify. Let's schedule a time for a free pre-approval consultation."
      : "Based on the information provided, you may not qualify at this time. Please chat with our AI assistant for more information and advice."
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});