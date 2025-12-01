// === Money Tracker App with MongoDB Atlas ===

// API Base URL (Netlify Functions)
const API_BASE = '/.netlify/functions';

// App State
let state = {
  settings: {
    accountBudget: 10000,
    cardBudget: 5000,
    windowSize: 5 // 5, 10, or 15 days
  },
  expenses: [],
  currentExpenseType: 'account',
  reportMonth: new Date(),
  isAuthenticated: false,
  token: null,
  userId: null,
  username: 'User'
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
  
  // Enter key handlers for auth forms
  document.getElementById('loginPin').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('confirmPin').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleRegister();
  });
});

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .catch(err => console.log('SW registration failed:', err));
  }
}

// === Authentication ===
async function checkAuth() {
  const savedToken = localStorage.getItem('moneytrack_token');
  
  if (savedToken) {
    try {
      const response = await fetch(`${API_BASE}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', token: savedToken })
      });
      const data = await response.json();
      
      if (data.valid) {
        state.isAuthenticated = true;
        state.token = savedToken;
        state.userId = data.userId;
        state.username = data.username || 'User';
        showApp();
        return;
      }
    } catch (error) {
      console.error('Token verification failed:', error);
    }
    localStorage.removeItem('moneytrack_token');
  }
  
  // Show auth screen
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('appContainer').style.display = 'none';
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => {
    t.classList.remove('active');
    if (t.dataset.tab === tab) t.classList.add('active');
  });
  
  if (tab === 'login') {
    document.getElementById('loginTab').style.display = 'block';
    document.getElementById('registerTab').style.display = 'none';
  } else {
    document.getElementById('loginTab').style.display = 'none';
    document.getElementById('registerTab').style.display = 'block';
  }
  
  // Clear errors
  document.getElementById('loginError').textContent = '';
  document.getElementById('registerError').textContent = '';
}

async function handleLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const pin = document.getElementById('loginPin').value;
  
  if (!username) {
    document.getElementById('loginError').textContent = 'Please enter your username';
    return;
  }
  
  if (!pin || pin.length !== 6) {
    document.getElementById('loginError').textContent = 'PIN must be 6 digits';
    return;
  }
  
  const btn = document.querySelector('#loginTab .auth-submit-btn');
  btn.textContent = 'Logging in...';
  btn.disabled = true;
  
  try {
    const response = await fetch(`${API_BASE}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', username, pin })
    });
    
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('moneytrack_token', data.token);
      state.isAuthenticated = true;
      state.token = data.token;
      state.userId = data.userId;
      state.username = data.username;
      showApp();
    } else {
      document.getElementById('loginError').textContent = data.error || 'Login failed';
    }
  } catch (error) {
    document.getElementById('loginError').textContent = 'Connection failed. Try again.';
  } finally {
    btn.textContent = 'Login';
    btn.disabled = false;
  }
}

async function handleRegister() {
  const username = document.getElementById('registerUsername').value.trim();
  const pin = document.getElementById('registerPin').value;
  const confirmPin = document.getElementById('confirmPin').value;
  
  if (!username || username.length < 2) {
    document.getElementById('registerError').textContent = 'Username must be at least 2 characters';
    return;
  }
  
  if (!pin || pin.length !== 6) {
    document.getElementById('registerError').textContent = 'PIN must be 6 digits';
    return;
  }
  
  if (pin !== confirmPin) {
    document.getElementById('registerError').textContent = 'PINs do not match';
    return;
  }
  
  const btn = document.querySelector('#registerTab .auth-submit-btn');
  btn.textContent = 'Creating account...';
  btn.disabled = true;
  
  try {
    const response = await fetch(`${API_BASE}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', username, pin })
    });
    
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('moneytrack_token', data.token);
      state.isAuthenticated = true;
      state.token = data.token;
      state.userId = data.userId;
      state.username = data.username;
      showApp();
    } else {
      document.getElementById('registerError').textContent = data.error || 'Registration failed';
    }
  } catch (error) {
    document.getElementById('registerError').textContent = 'Connection failed. Try again.';
  } finally {
    btn.textContent = 'Create Account';
    btn.disabled = false;
  }
}

async function logout() {
  try {
    await fetch(`${API_BASE}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout', token: state.token })
    });
  } catch (error) {
    // Ignore logout errors
  }
  
  localStorage.removeItem('moneytrack_token');
  state.isAuthenticated = false;
  state.token = null;
  state.userId = null;
  state.expenses = [];
  
  // Reset forms
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPin').value = '';
  document.getElementById('registerUsername').value = '';
  document.getElementById('registerPin').value = '';
  document.getElementById('confirmPin').value = '';
  document.getElementById('loginError').textContent = '';
  document.getElementById('registerError').textContent = '';
  
  // Show auth screen
  document.getElementById('appContainer').style.display = 'none';
  document.getElementById('authScreen').style.display = 'flex';
  closeSettings();
  
  // Switch to login tab
  switchAuthTab('login');
}

async function showApp() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appContainer').style.display = 'flex';
  document.getElementById('userGreeting').textContent = `Hi, ${state.username}`;
  
  await initApp();
}

async function initApp() {
  try {
    await loadSettings();
    await loadExpenses();
    updateUI();
  } catch (error) {
    console.error('Failed to load data:', error);
    showToast('Failed to load data. Please try again.', 'error');
  }
}

// === API Functions with Auth ===
function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${state.token}`
  };
}

async function loadSettings() {
  try {
    const response = await fetch(`${API_BASE}/settings`, {
      headers: getAuthHeaders()
    });
    
    if (response.status === 401) {
      console.log('Settings: Unauthorized - session invalid');
      showToast('Session expired. Please login again.', 'error');
      localStorage.removeItem('moneytrack_token');
      setTimeout(() => location.reload(), 1500);
      return;
    }
    
    if (response.ok) {
      const settings = await response.json();
      state.settings = {
        accountBudget: settings.accountBudget || 10000,
        cardBudget: settings.cardBudget || 5000,
        windowSize: settings.windowSize || 5
      };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

async function saveSettingsToServer() {
  try {
    const response = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: getAuthHeaders(),
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
    const response = await fetch(`${API_BASE}/expenses`, {
      headers: getAuthHeaders()
    });
    
    if (response.ok) {
      state.expenses = await response.json();
    } else if (response.status === 401) {
      console.log('Expenses: Unauthorized');
    }
  } catch (error) {
    console.error('Failed to load expenses:', error);
  }
}

async function addExpense(expense) {
  try {
    const response = await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(expense)
    });
    
    if (response.status === 401) {
      // Session invalid - user needs to re-login
      showToast('Session invalid. Please login again.', 'error');
      localStorage.removeItem('moneytrack_token');
      setTimeout(() => location.reload(), 1500);
      throw new Error('Session invalid');
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to add expense');
    }
    
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
      headers: getAuthHeaders(),
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
  const windowSize = state.settings.windowSize || 5;
  const chunks = [];
  
  let start = 1;
  while (start <= daysInMonth) {
    let end = start + windowSize - 1;
    // Last chunk gets remaining days
    if (end >= daysInMonth || daysInMonth - end < windowSize) {
      end = daysInMonth;
    }
    chunks.push({ start, end });
    start = end + 1;
  }
  
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

function updateDailyLimit() {
  const dailyLimitValue = document.getElementById('dailyLimitValue');
  const dailyLimitProgress = document.getElementById('dailyLimitProgress');
  const dailyLimitStatus = document.getElementById('dailyLimitStatus');
  
  // Check if elements exist
  if (!dailyLimitValue || !dailyLimitProgress || !dailyLimitStatus) {
    console.log('Daily limit elements not found');
    return;
  }
  
  const today = new Date();
  const daysInMonth = getDaysInMonth(today);
  const dailyLimit = state.settings.accountBudget / daysInMonth;
  
  const todayStr = today.toISOString().split('T')[0];
  const todayExpenses = getExpensesForDate(todayStr).filter(e => e.type === 'account');
  const todaySpent = getTotalForExpenses(todayExpenses);
  
  const remaining = dailyLimit - todaySpent;
  const percentUsed = dailyLimit > 0 ? (todaySpent / dailyLimit) * 100 : 0;
  
  // Update display
  dailyLimitValue.textContent = `${formatCurrency(todaySpent)} / ${formatCurrency(dailyLimit)}`;
  
  // Update progress bar - dailyLimitProgress IS the bar itself
  dailyLimitProgress.style.width = `${Math.min(percentUsed, 100)}%`;
  
  // Update status and colors
  if (remaining < 0) {
    dailyLimitProgress.className = 'progress-bar overflow';
    dailyLimitStatus.className = 'daily-limit-status overflow';
    dailyLimitStatus.textContent = `⚠️ Over by ${formatCurrency(Math.abs(remaining))}`;
  } else if (percentUsed >= 80) {
    dailyLimitProgress.className = 'progress-bar warning';
    dailyLimitStatus.className = 'daily-limit-status warning';
    dailyLimitStatus.textContent = `${formatCurrency(remaining)} remaining`;
  } else {
    dailyLimitProgress.className = 'progress-bar';
    dailyLimitStatus.className = 'daily-limit-status saved';
    dailyLimitStatus.textContent = `✓ ${formatCurrency(remaining)} remaining`;
  }
}

function updateBudgetCards() {
  try {
    const today = new Date();
    const windowSize = state.settings.windowSize || 5;
    
    // Monthly totals
    const monthlyAccountExpenses = getMonthlyExpenses(today, 'account');
    const monthlySpent = getTotalForExpenses(monthlyAccountExpenses);
    const monthlyRemaining = state.settings.accountBudget - monthlySpent;
    
    const accountBudgetDisplay = document.getElementById('accountBudgetDisplay');
    const monthlySpentEl = document.getElementById('monthlySpent');
    const monthlyProgressBar = document.getElementById('monthlyProgress');
    
    if (accountBudgetDisplay) {
      accountBudgetDisplay.textContent = formatCurrency(state.settings.accountBudget);
    }
    if (monthlySpentEl) {
      monthlySpentEl.textContent = formatCurrency(monthlySpent);
    }
    
    // Monthly progress bar
    if (monthlyProgressBar) {
      const monthlyProgressPercent = state.settings.accountBudget > 0 
        ? Math.min((monthlySpent / state.settings.accountBudget) * 100, 100) 
        : 0;
      monthlyProgressBar.style.width = `${monthlyProgressPercent}%`;
      monthlyProgressBar.className = monthlyRemaining < 0 ? 'progress-bar overflow' : 'progress-bar';
    }
    
    // Chunk calculations
    const currentChunk = getCurrentChunk();
    const chunkBudget = getChunkBudget(currentChunk);
    const chunkExpenses = getExpensesForChunk(currentChunk);
    const chunkSpent = getTotalForExpenses(chunkExpenses);
    const chunkRemaining = chunkBudget - chunkSpent;
    
    const chunkRemainingEl = document.getElementById('chunkRemaining');
    if (chunkRemainingEl) {
      if (chunkRemaining < 0) {
        chunkRemainingEl.textContent = `-${formatCurrency(Math.abs(chunkRemaining))}`;
        chunkRemainingEl.className = 'chunk-remaining overflow';
      } else {
        chunkRemainingEl.textContent = formatCurrency(chunkRemaining);
        chunkRemainingEl.className = 'chunk-remaining';
      }
    }
    
    const chunkLabel = document.getElementById('chunkLabel');
    if (chunkLabel) {
      chunkLabel.textContent = `Day ${currentChunk.start}-${currentChunk.end} (${windowSize}-day):`;
    }
    
    const progressBar = document.getElementById('accountProgress');
    if (progressBar) {
      const progressPercent = chunkBudget > 0 
        ? Math.min((chunkSpent / chunkBudget) * 100, 100) 
        : 0;
      progressBar.style.width = `${progressPercent}%`;
      progressBar.className = chunkRemaining < 0 ? 'progress-bar overflow' : 'progress-bar';
    }
    
    // Card Budget
    const cardBudgetDisplay = document.getElementById('cardBudgetDisplay');
    if (cardBudgetDisplay) {
      cardBudgetDisplay.textContent = formatCurrency(state.settings.cardBudget);
    }
    
    const cardExpenses = getMonthlyExpenses(today, 'card');
    const cardSpent = getTotalForExpenses(cardExpenses);
    
    const cardSpentEl = document.getElementById('cardSpent');
    if (cardSpentEl) {
      cardSpentEl.textContent = formatCurrency(cardSpent);
    }
    
    const cardProgressBar = document.getElementById('cardProgress');
    if (cardProgressBar) {
      const cardProgressPercent = state.settings.cardBudget > 0 
        ? Math.min((cardSpent / state.settings.cardBudget) * 100, 100) 
        : 0;
      cardProgressBar.style.width = `${cardProgressPercent}%`;
      if (cardSpent > state.settings.cardBudget) {
        cardProgressBar.className = 'progress-bar card-progress overflow';
      } else {
        cardProgressBar.className = 'progress-bar card-progress';
      }
    }
    
    // Update daily limit
    updateDailyLimit();
  } catch (error) {
    console.error('Error updating budget cards:', error);
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
  
  const totalToday = getTotalForExpenses(todayExpenses);
  const accountTotal = getTotalForExpenses(todayExpenses.filter(e => e.type === 'account'));
  const cardTotal = getTotalForExpenses(todayExpenses.filter(e => e.type === 'card'));
  
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
  `).join('') + `
    <div class="today-total">
      <div class="today-total-row">
        <span>Today's Total</span>
        <span class="today-total-amount">${formatCurrency(totalToday)}</span>
      </div>
      ${accountTotal > 0 ? `<div class="today-total-breakdown"><span>Account:</span> <span>${formatCurrency(accountTotal)}</span></div>` : ''}
      ${cardTotal > 0 ? `<div class="today-total-breakdown"><span>Card:</span> <span>${formatCurrency(cardTotal)}</span></div>` : ''}
    </div>
  `;
}

// === Expense Modal ===
function openExpenseModal(type) {
  state.currentExpenseType = type;
  document.getElementById('modalTitle').textContent = 
    type === 'account' ? 'Add Account Expense' : 'Add Card Expense';
  
  resetCalculator();
  document.getElementById('expenseDesc').value = '';
  
  // Set date to today by default
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('expenseDate');
  dateInput.value = today;
  dateInput.max = today; // Don't allow future dates
  
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
  const selectedDate = document.getElementById('expenseDate').value;
  
  if (!selectedDate) {
    showToast('Please select a date', 'error');
    return;
  }
  
  const expense = {
    id: Date.now().toString(),
    date: selectedDate,
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
  
  // Update window size buttons
  const windowSize = state.settings.windowSize || 5;
  document.querySelectorAll('.window-btn').forEach(btn => {
    btn.classList.remove('active');
    if (parseInt(btn.dataset.days) === windowSize) {
      btn.classList.add('active');
    }
  });
  
  document.getElementById('settingsModal').classList.add('active');
}

function selectWindowSize(days) {
  document.querySelectorAll('.window-btn').forEach(btn => {
    btn.classList.remove('active');
    if (parseInt(btn.dataset.days) === days) {
      btn.classList.add('active');
    }
  });
}

function closeSettings() {
  document.getElementById('settingsModal').classList.remove('active');
}

async function saveSettings() {
  const accountBudget = parseFloat(document.getElementById('accountBudgetInput').value) || 0;
  const cardBudget = parseFloat(document.getElementById('cardBudgetInput').value) || 0;
  
  // Get selected window size
  const activeWindowBtn = document.querySelector('.window-btn.active');
  const windowSize = activeWindowBtn ? parseInt(activeWindowBtn.dataset.days) : 5;
  
  if (accountBudget <= 0 || cardBudget <= 0) {
    showToast('Please enter valid budget amounts', 'error');
    return;
  }
  
  state.settings.accountBudget = accountBudget;
  state.settings.cardBudget = cardBudget;
  state.settings.windowSize = windowSize;
  
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
  
  chunks.forEach((chunk) => {
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
    
    const windowSize = state.settings.windowSize || 5;
    reportHTML += `
      <div class="chunk-summary">
        <div class="chunk-summary-header">
          <span class="chunk-summary-title">📊 ${windowSize}-Day Summary</span>
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
