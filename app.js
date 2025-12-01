// === Money Tracker App with MongoDB Atlas ===

// API Base URL (Netlify Functions)
const API_BASE = '/.netlify/functions';

// App State
let state = {
  settings: {
    accountBudget: 10000,
    cardBudget: 5000
  },
  expenses: [],
  currentExpenseType: 'account',
  reportMonth: new Date(),
  isLoading: true,
  isAuthenticated: false,
  username: 'User'
};

// Auth State
let auth = {
  pin: '',
  isRegistering: false,
  hasExistingUser: false
};

// Calculator State
let calc = {
  currentValue: '0',
  expression: '',
  operator: null,
  waitingForSecondOperand: false,
  previousValue: null
};

// === Initialization ===
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  registerServiceWorker();
});

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .catch(err => console.log('SW registration failed:', err));
  }
}

// === Authentication ===
async function checkAuth() {
  document.getElementById('loginScreen').classList.add('loading');
  
  // Check if user has saved token
  const savedToken = localStorage.getItem('moneytrack_token');
  
  if (savedToken) {
    // Verify token with server
    try {
      const response = await fetch(`${API_BASE}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', token: savedToken })
      });
      const data = await response.json();
      
      if (data.valid) {
        state.isAuthenticated = true;
        state.username = data.username || 'User';
        showApp();
        return;
      }
    } catch (error) {
      console.error('Token verification failed:', error);
    }
    // Token invalid, remove it
    localStorage.removeItem('moneytrack_token');
  }
  
  // Check if user exists
  try {
    const response = await fetch(`${API_BASE}/auth`);
    const data = await response.json();
    
    auth.hasExistingUser = data.hasPin;
    
    if (data.hasPin) {
      // User exists, show login
      document.getElementById('loginTitle').textContent = 'Enter PIN';
      document.getElementById('loginHint').textContent = 'Enter your 4-digit PIN to continue';
      document.getElementById('usernameInput').style.display = 'none';
    } else {
      // New user, show registration
      auth.isRegistering = true;
      document.getElementById('loginTitle').textContent = 'Create PIN';
      document.getElementById('loginHint').textContent = 'Create a 4-digit PIN to secure your data';
      document.getElementById('usernameInput').style.display = 'block';
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    document.getElementById('pinError').textContent = 'Connection failed. Try again.';
  }
  
  document.getElementById('loginScreen').classList.remove('loading');
}

function pinDigit(digit) {
  if (auth.pin.length >= 4) return;
  
  auth.pin += digit;
  updatePinDisplay();
  
  if (auth.pin.length === 4) {
    setTimeout(() => {
      if (auth.isRegistering) {
        registerPin();
      } else {
        loginWithPin();
      }
    }, 200);
  }
}

function pinBackspace() {
  if (auth.pin.length > 0) {
    auth.pin = auth.pin.slice(0, -1);
    updatePinDisplay();
    document.getElementById('pinError').textContent = '';
  }
}

function updatePinDisplay() {
  const dots = document.querySelectorAll('.pin-dot');
  dots.forEach((dot, index) => {
    dot.setAttribute('data-filled', index < auth.pin.length);
  });
}

async function registerPin() {
  const username = document.getElementById('username').value.trim() || 'User';
  
  try {
    const response = await fetch(`${API_BASE}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', pin: auth.pin, username })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Now login with the new PIN
      await loginWithPin();
    } else {
      showPinError(data.error || 'Registration failed');
    }
  } catch (error) {
    showPinError('Connection failed. Try again.');
  }
}

async function loginWithPin() {
  try {
    const response = await fetch(`${API_BASE}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', pin: auth.pin })
    });
    
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('moneytrack_token', data.token);
      state.isAuthenticated = true;
      state.username = data.username || 'User';
      showApp();
    } else {
      showPinError(data.error || 'Invalid PIN');
    }
  } catch (error) {
    showPinError('Connection failed. Try again.');
  }
}

function showPinError(message) {
  auth.pin = '';
  updatePinDisplay();
  document.getElementById('pinError').textContent = message;
  document.querySelector('.pin-display').classList.add('shake');
  setTimeout(() => {
    document.querySelector('.pin-display').classList.remove('shake');
  }, 400);
}

async function logout() {
  const token = localStorage.getItem('moneytrack_token');
  
  try {
    await fetch(`${API_BASE}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout', token })
    });
  } catch (error) {
    // Ignore logout errors
  }
  
  localStorage.removeItem('moneytrack_token');
  state.isAuthenticated = false;
  auth.pin = '';
  auth.isRegistering = false;
  
  document.getElementById('appContainer').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  closeSettings();
  updatePinDisplay();
  checkAuth();
}

async function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appContainer').style.display = 'flex';
  document.getElementById('userGreeting').textContent = `Hi, ${state.username}`;
  
  await initApp();
}

async function initApp() {
  try {
    await Promise.all([loadSettings(), loadExpenses()]);
    updateUI();
  } catch (error) {
    console.error('Failed to load data:', error);
    showToast('Failed to load data', 'error');
  }
}

// === API Functions ===
async function loadSettings() {
  try {
    const response = await fetch(`${API_BASE}/settings`);
    if (response.ok) {
      state.settings = await response.json();
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

async function saveSettingsToServer() {
  try {
    const response = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.settings)
    });
    if (!response.ok) throw new Error('Failed to save settings');
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
}

async function loadExpenses() {
  try {
    const response = await fetch(`${API_BASE}/expenses`);
    if (response.ok) {
      state.expenses = await response.json();
    }
  } catch (error) {
    console.error('Failed to load expenses:', error);
  }
}

async function addExpense(expense) {
  try {
    const response = await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense)
    });
    if (!response.ok) throw new Error('Failed to add expense');
    const savedExpense = await response.json();
    state.expenses.push(savedExpense);
    return savedExpense;
  } catch (error) {
    console.error('Failed to add expense:', error);
    throw error;
  }
}

async function clearData(type) {
  try {
    const response = await fetch(`${API_BASE}/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    });
    if (!response.ok) throw new Error('Failed to clear data');
    await loadExpenses();
    if (type === 'all') {
      await loadSettings();
    }
  } catch (error) {
    console.error('Failed to clear data:', error);
    throw error;
  }
}

// === Budget Calculations ===
function getDaysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getChunks(date) {
  const daysInMonth = getDaysInMonth(date);
  const chunks = [
    { start: 1, end: 5 },
    { start: 6, end: 10 },
    { start: 11, end: 15 },
    { start: 16, end: 20 },
    { start: 21, end: 25 },
    { start: 26, end: daysInMonth }
  ];
  return chunks;
}

function getCurrentChunk() {
  const today = new Date();
  const day = today.getDate();
  const chunks = getChunks(today);
  
  for (let i = 0; i < chunks.length; i++) {
    if (day >= chunks[i].start && day <= chunks[i].end) {
      return { ...chunks[i], index: i };
    }
  }
  return chunks[chunks.length - 1];
}

function getChunkBudget(chunk) {
  const today = new Date();
  const daysInMonth = getDaysInMonth(today);
  const dailyBudget = state.settings.accountBudget / daysInMonth;
  const chunkDays = chunk.end - chunk.start + 1;
  return dailyBudget * chunkDays;
}

function getExpensesForChunk(chunk, date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  return state.expenses.filter(expense => {
    const expDate = new Date(expense.date);
    return expDate.getFullYear() === year &&
           expDate.getMonth() === month &&
           expDate.getDate() >= chunk.start &&
           expDate.getDate() <= chunk.end &&
           expense.type === 'account';
  });
}

function getExpensesForDate(dateStr) {
  return state.expenses.filter(expense => expense.date === dateStr);
}

function getMonthlyExpenses(date, type = null) {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  return state.expenses.filter(expense => {
    const expDate = new Date(expense.date);
    const matchesMonth = expDate.getFullYear() === year && expDate.getMonth() === month;
    if (type) {
      return matchesMonth && expense.type === type;
    }
    return matchesMonth;
  });
}

function getTotalForExpenses(expenses) {
  return expenses.reduce((sum, exp) => sum + exp.amount, 0);
}

// === UI Updates ===
function updateUI() {
  updateBudgetCards();
  updateTodaysList();
}

function updateBudgetCards() {
  const today = new Date();
  const currentChunk = getCurrentChunk();
  const chunkBudget = getChunkBudget(currentChunk);
  const chunkExpenses = getExpensesForChunk(currentChunk);
  const chunkSpent = getTotalForExpenses(chunkExpenses);
  const chunkRemaining = chunkBudget - chunkSpent;
  
  document.getElementById('accountBudgetDisplay').textContent = formatCurrency(state.settings.accountBudget);
  
  const chunkRemainingEl = document.getElementById('chunkRemaining');
  if (chunkRemaining < 0) {
    chunkRemainingEl.textContent = `-${formatCurrency(Math.abs(chunkRemaining))}`;
    chunkRemainingEl.className = 'chunk-remaining overflow';
  } else {
    chunkRemainingEl.textContent = formatCurrency(chunkRemaining);
    chunkRemainingEl.className = 'chunk-remaining';
  }
  
  document.querySelector('.chunk-label').textContent = 
    `Day ${currentChunk.start}-${currentChunk.end}:`;
  
  const progressPercent = Math.min((chunkSpent / chunkBudget) * 100, 100);
  const progressBar = document.getElementById('accountProgress');
  progressBar.style.width = `${progressPercent}%`;
  progressBar.className = chunkRemaining < 0 ? 'progress-bar overflow' : 'progress-bar';
  
  document.getElementById('cardBudgetDisplay').textContent = formatCurrency(state.settings.cardBudget);
  
  const cardExpenses = getMonthlyExpenses(today, 'card');
  const cardSpent = getTotalForExpenses(cardExpenses);
  document.getElementById('cardSpent').textContent = formatCurrency(cardSpent);
  
  const cardProgressPercent = Math.min((cardSpent / state.settings.cardBudget) * 100, 100);
  const cardProgressBar = document.getElementById('cardProgress');
  cardProgressBar.style.width = `${cardProgressPercent}%`;
  if (cardSpent > state.settings.cardBudget) {
    cardProgressBar.className = 'progress-bar card-progress overflow';
  } else {
    cardProgressBar.className = 'progress-bar card-progress';
  }
}

function updateTodaysList() {
  const today = new Date().toISOString().split('T')[0];
  const todayExpenses = getExpensesForDate(today);
  const listEl = document.getElementById('todayList');
  
  if (todayExpenses.length === 0) {
    listEl.innerHTML = '<div class="empty-state">No expenses today</div>';
    return;
  }
  
  listEl.innerHTML = todayExpenses.map(expense => `
    <div class="expense-item">
      <div class="expense-info">
        <div class="expense-desc">${escapeHtml(expense.description)}</div>
        <div class="expense-type">${expense.type}</div>
      </div>
      <div class="expense-amount ${expense.type === 'card' ? 'card-expense' : ''}">
        -${formatCurrency(expense.amount)}
      </div>
    </div>
  `).join('');
}

// === Expense Modal ===
function openExpenseModal(type) {
  state.currentExpenseType = type;
  document.getElementById('modalTitle').textContent = 
    type === 'account' ? 'Add Account Expense' : 'Add Card Expense';
  
  resetCalculator();
  document.getElementById('expenseDesc').value = '';
  
  document.getElementById('expenseModal').classList.add('active');
}

function closeExpenseModal() {
  document.getElementById('expenseModal').classList.remove('active');
}

async function submitExpense() {
  const amount = parseFloat(calc.currentValue);
  if (isNaN(amount) || amount <= 0) {
    showToast('Please enter a valid amount', 'error');
    return;
  }
  
  const description = document.getElementById('expenseDesc').value.trim() || 'Fixed expense';
  const today = new Date().toISOString().split('T')[0];
  
  const expense = {
    id: Date.now().toString(),
    date: today,
    amount: amount,
    description: description,
    type: state.currentExpenseType
  };
  
  const submitBtn = document.querySelector('.submit-expense-btn');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Saving...';
  submitBtn.disabled = true;
  
  try {
    await addExpense(expense);
    updateUI();
    closeExpenseModal();
    showToast('Expense added successfully', 'success');
  } catch (error) {
    showToast('Failed to save expense', 'error');
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

// === Calculator Functions ===
function resetCalculator() {
  calc = {
    currentValue: '0',
    expression: '',
    operator: null,
    waitingForSecondOperand: false,
    previousValue: null
  };
  updateCalculatorDisplay();
}

function calcClear() {
  resetCalculator();
}

function calcDigit(digit) {
  if (calc.waitingForSecondOperand) {
    calc.currentValue = digit;
    calc.waitingForSecondOperand = false;
  } else {
    calc.currentValue = calc.currentValue === '0' ? digit : calc.currentValue + digit;
  }
  updateCalculatorDisplay();
}

function calcDecimal() {
  if (calc.waitingForSecondOperand) {
    calc.currentValue = '0.';
    calc.waitingForSecondOperand = false;
    updateCalculatorDisplay();
    return;
  }
  
  if (!calc.currentValue.includes('.')) {
    calc.currentValue += '.';
  }
  updateCalculatorDisplay();
}

function calcBackspace() {
  if (calc.currentValue.length > 1) {
    calc.currentValue = calc.currentValue.slice(0, -1);
  } else {
    calc.currentValue = '0';
  }
  updateCalculatorDisplay();
}

function calcOperator(nextOperator) {
  const inputValue = parseFloat(calc.currentValue);
  
  if (calc.operator && calc.waitingForSecondOperand) {
    calc.operator = nextOperator;
    calc.expression = `${calc.previousValue} ${getOperatorSymbol(nextOperator)}`;
    updateCalculatorDisplay();
    return;
  }
  
  if (calc.previousValue === null) {
    calc.previousValue = inputValue;
  } else if (calc.operator) {
    const result = performCalculation(calc.previousValue, inputValue, calc.operator);
    calc.currentValue = String(result);
    calc.previousValue = result;
  }
  
  calc.waitingForSecondOperand = true;
  calc.operator = nextOperator;
  calc.expression = `${calc.previousValue} ${getOperatorSymbol(nextOperator)}`;
  updateCalculatorDisplay();
}

function calcEquals() {
  if (!calc.operator || calc.waitingForSecondOperand) {
    return;
  }
  
  const inputValue = parseFloat(calc.currentValue);
  const result = performCalculation(calc.previousValue, inputValue, calc.operator);
  
  calc.expression = `${calc.previousValue} ${getOperatorSymbol(calc.operator)} ${inputValue} =`;
  calc.currentValue = String(result);
  calc.previousValue = null;
  calc.operator = null;
  calc.waitingForSecondOperand = false;
  
  updateCalculatorDisplay();
}

function calcPercent() {
  const value = parseFloat(calc.currentValue);
  calc.currentValue = String(value / 100);
  updateCalculatorDisplay();
}

function performCalculation(first, second, operator) {
  switch (operator) {
    case '+': return first + second;
    case '-': return first - second;
    case '*': return first * second;
    case '/': return second !== 0 ? first / second : 0;
    default: return second;
  }
}

function getOperatorSymbol(operator) {
  const symbols = { '+': '+', '-': '−', '*': '×', '/': '÷' };
  return symbols[operator] || operator;
}

function updateCalculatorDisplay() {
  document.getElementById('calcExpression').textContent = calc.expression;
  
  let displayValue = calc.currentValue;
  if (!isNaN(parseFloat(displayValue))) {
    const parts = displayValue.split('.');
    parts[0] = parseFloat(parts[0]).toLocaleString('en-IN');
    displayValue = parts.join('.');
  }
  
  document.getElementById('calcResult').textContent = displayValue;
}

// === Settings ===
function openSettings() {
  document.getElementById('accountBudgetInput').value = state.settings.accountBudget;
  document.getElementById('cardBudgetInput').value = state.settings.cardBudget;
  document.getElementById('settingsModal').classList.add('active');
}

function closeSettings() {
  document.getElementById('settingsModal').classList.remove('active');
}

async function saveSettings() {
  const accountBudget = parseFloat(document.getElementById('accountBudgetInput').value) || 0;
  const cardBudget = parseFloat(document.getElementById('cardBudgetInput').value) || 0;
  
  if (accountBudget <= 0 || cardBudget <= 0) {
    showToast('Please enter valid budget amounts', 'error');
    return;
  }
  
  state.settings.accountBudget = accountBudget;
  state.settings.cardBudget = cardBudget;
  
  const saveBtn = document.querySelector('.save-settings-btn');
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Saving...';
  saveBtn.disabled = true;
  
  try {
    await saveSettingsToServer();
    updateUI();
    closeSettings();
    showToast('Settings saved', 'success');
  } catch (error) {
    showToast('Failed to save settings', 'error');
  } finally {
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
  }
}

async function resetMonth() {
  if (!confirm('Are you sure you want to reset current month expenses?')) return;
  
  try {
    await clearData('month');
    updateUI();
    closeSettings();
    showToast('Month reset successfully', 'success');
  } catch (error) {
    showToast('Failed to reset month', 'error');
  }
}

async function clearAllData() {
  if (!confirm('Are you sure you want to clear ALL data? This cannot be undone.')) return;
  
  try {
    await clearData('all');
    state.settings = { accountBudget: 10000, cardBudget: 5000 };
    updateUI();
    closeSettings();
    showToast('All data cleared', 'success');
  } catch (error) {
    showToast('Failed to clear data', 'error');
  }
}

// === Report ===
function openReport() {
  state.reportMonth = new Date();
  generateReport();
  document.getElementById('reportOverlay').classList.add('active');
}

function closeReport() {
  document.getElementById('reportOverlay').classList.remove('active');
}

function prevMonth() {
  state.reportMonth.setMonth(state.reportMonth.getMonth() - 1);
  generateReport();
}

function nextMonth() {
  state.reportMonth.setMonth(state.reportMonth.getMonth() + 1);
  generateReport();
}

function generateReport() {
  const date = state.reportMonth;
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  document.getElementById('reportMonth').textContent = 
    `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  
  const chunks = getChunks(date);
  const monthExpenses = getMonthlyExpenses(date);
  const cardExpenses = monthExpenses.filter(e => e.type === 'card');
  
  const expensesByDate = {};
  monthExpenses.forEach(expense => {
    if (!expensesByDate[expense.date]) {
      expensesByDate[expense.date] = [];
    }
    expensesByDate[expense.date].push(expense);
  });
  
  let reportHTML = '';
  
  const totalCardSpent = getTotalForExpenses(cardExpenses);
  const cardRemaining = state.settings.cardBudget - totalCardSpent;
  
  reportHTML += `
    <div class="card-summary">
      <div class="card-summary-title">💳 Card Budget Summary</div>
      <div class="chunk-summary-row">
        <span class="chunk-summary-label">Budget</span>
        <span class="chunk-summary-value budget">${formatCurrency(state.settings.cardBudget)}</span>
      </div>
      <div class="chunk-summary-row">
        <span class="chunk-summary-label">Spent</span>
        <span class="chunk-summary-value ${cardRemaining < 0 ? 'overflow' : ''}">${formatCurrency(totalCardSpent)}</span>
      </div>
      <div class="chunk-summary-row">
        <span class="chunk-summary-label">${cardRemaining < 0 ? 'Overflowed' : 'Remaining'}</span>
        <span class="chunk-summary-value ${cardRemaining < 0 ? 'overflow' : 'saved'}">${formatCurrency(Math.abs(cardRemaining))}</span>
      </div>
    </div>
  `;
  
  chunks.forEach((chunk, index) => {
    const chunkBudget = getChunkBudgetForMonth(chunk, date);
    const chunkExpenses = getExpensesForChunk(chunk, date);
    const chunkSpent = getTotalForExpenses(chunkExpenses);
    const chunkDiff = chunkBudget - chunkSpent;
    
    const today = new Date();
    const isCurrentMonth = date.getFullYear() === today.getFullYear() && 
                          date.getMonth() === today.getMonth();
    
    if (isCurrentMonth && today.getDate() < chunk.start) {
      return;
    }
    
    reportHTML += `
      <div class="chunk-summary">
        <div class="chunk-summary-header">
          <span class="chunk-summary-title">📊 5-Day Summary</span>
          <span class="chunk-summary-dates">Day ${chunk.start} - ${chunk.end}</span>
        </div>
        <div class="chunk-summary-row">
          <span class="chunk-summary-label">Budget</span>
          <span class="chunk-summary-value budget">${formatCurrency(chunkBudget)}</span>
        </div>
        <div class="chunk-summary-row">
          <span class="chunk-summary-label">Spent</span>
          <span class="chunk-summary-value">${formatCurrency(chunkSpent)}</span>
        </div>
        ${chunkDiff < 0 ? `
        <div class="chunk-summary-row">
          <span class="chunk-summary-label">⚠️ Overflowed</span>
          <span class="chunk-summary-value overflow">${formatCurrency(Math.abs(chunkDiff))}</span>
        </div>
        ` : `
        <div class="chunk-summary-row">
          <span class="chunk-summary-label">✓ Saved</span>
          <span class="chunk-summary-value saved">${formatCurrency(chunkDiff)}</span>
        </div>
        `}
      </div>
    `;
    
    for (let day = chunk.start; day <= chunk.end; day++) {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayExpenses = expensesByDate[dateStr];
      
      if (dayExpenses && dayExpenses.length > 0) {
        const dayDate = new Date(dateStr);
        const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
        
        reportHTML += `
          <div class="report-section">
            <div class="report-date">
              <span class="report-date-badge">${dayName}, ${day}</span>
              <div class="report-date-line"></div>
            </div>
            <div class="report-expenses">
              ${dayExpenses.map(exp => `
                <div class="report-expense-item">
                  <span class="report-expense-desc">${escapeHtml(exp.description)}</span>
                  <span class="report-expense-amount ${exp.type}">${formatCurrency(exp.amount)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    }
  });
  
  if (monthExpenses.length === 0) {
    reportHTML = '<div class="empty-state" style="padding: 60px 20px;">No expenses recorded for this month</div>';
  }
  
  document.getElementById('reportContent').innerHTML = reportHTML;
}

function getChunkBudgetForMonth(chunk, date) {
  const daysInMonth = getDaysInMonth(date);
  const dailyBudget = state.settings.accountBudget / daysInMonth;
  const chunkDays = chunk.end - chunk.start + 1;
  return dailyBudget * chunkDays;
}

// === Navigation ===
function switchView(view) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.view === view) {
      item.classList.add('active');
    }
  });
  
  if (view === 'report') {
    openReport();
  } else {
    closeReport();
  }
}

// === Utility Functions ===
function formatCurrency(amount) {
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
