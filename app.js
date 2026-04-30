let transactions = [];

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const totalBalanceEl = document.getElementById('total-balance');
const monthlySpendingEl = document.getElementById('monthly-spending');
const savingsRateEl = document.getElementById('savings-rate');

// Initialize App
async function init() {
    await fetchTransactions();
    renderChart();
    updateStats();
}

// Fetch Transactions from Backend
async function fetchTransactions() {
    try {
        const response = await fetch('/api/transactions');
        transactions = await response.json();
    } catch (error) {
        console.error('Error fetching transactions:', error);
    }
}

// Update Dashboard Stats
function updateStats() {
    const income = transactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);
    
    const spending = Math.abs(transactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + t.amount, 0));
    
    const balance = income - spending;
    const savingsRate = income > 0 ? ((income - spending) / income * 100).toFixed(1) : 0;

    totalBalanceEl.textContent = `$${balance.toLocaleString()}`;
    monthlySpendingEl.textContent = `$${spending.toLocaleString()}`;
    savingsRateEl.textContent = `${savingsRate}%`;
}

// Render Spending Chart
function renderChart() {
    const ctx = document.getElementById('spendingChart').getContext('2d');
    
    const categories = {};
    transactions.filter(t => t.amount < 0).forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + Math.abs(t.amount);
    });

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: [
                    '#6366f1', '#a855f7', '#22d3ee', '#f43f5e', '#10b981', '#f59e0b'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', font: { family: 'Outfit' } }
                }
            },
            cutout: '70%'
        }
    });
}

// Handle Chat
async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Add user message
    addMessage(message, 'user');
    chatInput.value = '';

    // Show typing indicator
    const typingId = addMessage('Thinking...', 'ai');

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, context: transactions })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server Error: ${response.status}`);
        }

        const data = await response.json();
        
        // Replace typing with actual response
        removeMessage(typingId);
        addMessage(data.reply || "I couldn't get a response.", 'ai');
    } catch (error) {
        removeMessage(typingId);
        addMessage(`⚠️ Error: ${error.message}. Please check your server console and .env key.`, 'ai');
    }
}

function addMessage(text, sender) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    div.textContent = text;
    const id = Date.now();
    div.id = `msg-${id}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
}

function removeMessage(id) {
    const el = document.getElementById(`msg-${id}`);
    if (el) el.remove();
}

// Event Listeners
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Start the app
init();
