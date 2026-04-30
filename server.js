import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});
app.use(express.static('./')); // Serve static files from root

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'your_groq_api_key_here',
});

// Simulated Transaction Data
const mockTransactions = [
  { id: 1, date: '2024-04-01', description: 'Grocery Store', category: 'Food', amount: -85.50 },
  { id: 2, date: '2024-04-02', description: 'Monthly Rent', category: 'Housing', amount: -1200.00 },
  { id: 3, date: '2024-04-03', description: 'Salary Deposit', category: 'Income', amount: 3500.00 },
  { id: 4, date: '2024-04-05', description: 'Electric Bill', category: 'Utilities', amount: -120.00 },
  { id: 5, date: '2024-04-08', description: 'Internet Provider', category: 'Utilities', amount: -60.00 },
  { id: 6, date: '2024-04-10', description: 'Coffee Shop', category: 'Food', amount: -4.50 },
  { id: 7, date: '2024-04-12', description: 'Gas Station', category: 'Transport', amount: -45.00 },
  { id: 8, date: '2024-04-15', description: 'Subscription Service', category: 'Entertainment', amount: -15.99 },
  { id: 9, date: '2024-04-18', description: 'Local Restaurant', category: 'Food', amount: -35.00 },
  { id: 10, date: '2024-04-20', description: 'Gym Membership', category: 'Health', amount: -50.00 },
  { id: 11, date: '2024-04-22', description: 'Pharmacy', category: 'Health', amount: -22.50 },
  { id: 12, date: '2024-04-25', description: 'Movie Theater', category: 'Entertainment', amount: -28.00 },
];

// Endpoint to get transactions
app.get('/api/transactions', (req, res) => {
  res.json(mockTransactions);
});

// Endpoint for AI Analysis
app.post('/api/chat', async (req, res) => {
  const { message, context } = req.body;

  try {
    const systemPrompt = `
      You are an expert AI Personal Finance Coach. 
      Your goal is to analyze the user's spending habits and suggest practical financial goals.
      
      RULES:
      1. ONLY answer queries related to personal finance, budgeting, investing, and savings.
      2. If a user asks something outside this domain (e.g., sports, movies, cooking), politely decline and state that you are only specialized in financial coaching.
      3. Use the provided transaction context to give data-driven advice.
      4. Be encouraging, professional, and concise.
      
      User Context (Transactions): ${JSON.stringify(context)}
    `;

    console.log('--- AI Analysis Request ---');
    console.log('Message:', message);

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      model: 'llama-3.3-70b-versatile',
    }).catch(async (err) => {
        console.warn('Primary model failed, trying fallback...', err.message);
        return await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ],
            model: 'llama-3.1-8b-instant',
        });
    });

    res.json({ reply: chatCompletion.choices[0].message.content });
  } catch (error) {
    console.error('--- CRITICAL GROQ ERROR ---');
    console.error('Status:', error?.status);
    console.error('Message:', error?.message);
    console.error('Full Error:', error);
    
    let errorMessage = "⚠️ AI Coach is temporarily offline. Please check your terminal for details.";
    
    if (error?.status === 401) {
      errorMessage = "⚠️ Invalid API Key. Please double-check your .env file.";
    }

    res.status(200).json({ reply: errorMessage });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
