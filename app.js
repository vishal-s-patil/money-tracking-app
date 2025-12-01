// === Money Tracker App ===

// Storage Keys
const STORAGE_KEYS = {
  SETTINGS: 'moneytrack_settings',
  EXPENSES: 'moneytrack_expenses'
};

// App State
let state = {
  settings: {
    accountBudget: 10000,
    cardBudget: 5000
  },
  expenses: [], // { id, date, amount, description, type: 'account' | 'card' }
  currentExpenseType: 'account',
  reportMonth: new Date()
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
  loadData();
  updateUI();
  registerServiceWorker();
});

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('Service Worker registered'))
      .catch(err => console.log('SW registration failed:', err));
  }
}

// === Data Management ===
function loadData() {
  const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  const savedExpenses = localStorage.getItem(STORAGE_KEYS.EXPENSES);
  
  if (savedSettings) {
    state.settings = JSON.parse(savedSettings);
  }
  
  if (savedExpenses) {
    state.expenses = JSON.parse(savedExpenses);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(state.expenses));
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
    { start: 26, end: daysInMonth } // Last chunk handles variable month lengths
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
  
  // Account Budget Display
  document.getElementById('accountBudgetDisplay').textContent = formatCurrency(state.settings.accountBudget);
  
  // Chunk Info
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
  
  // Progress Bar
  const progressPercent = Math.min((chunkSpent / chunkBudget) * 100, 100);
  const progressBar = document.getElementById('accountProgress');
  progressBar.style.width = `${progressPercent}%`;
  progressBar.className = chunkRemaining < 0 ? 'progress-bar overflow' : 'progress-bar';
  
  // Card Budget
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
  
  // Reset calculator
  resetCalculator();
  document.getElementById('expenseDesc').value = '';
  
  document.getElementById('expenseModal').classList.add('active');
}

function closeExpenseModal() {
  document.getElementById('expenseModal').classList.remove('active');
}

function submitExpense() {
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
  
  state.expenses.push(expense);
  saveData();
  updateUI();
  closeExpenseModal();
  showToast('Expense added successfully', 'success');
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
  
  // Format number with commas
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

function saveSettings() {
  const accountBudget = parseFloat(document.getElementById('accountBudgetInput').value) || 0;
  const cardBudget = parseFloat(document.getElementById('cardBudgetInput').value) || 0;
  
  if (accountBudget <= 0 || cardBudget <= 0) {
    showToast('Please enter valid budget amounts', 'error');
    return;
  }
  
  state.settings.accountBudget = accountBudget;
  state.settings.cardBudget = cardBudget;
  saveData();
  updateUI();
  closeSettings();
  showToast('Settings saved', 'success');
}

function resetMonth() {
  if (!confirm('Are you sure you want to reset current month expenses?')) return;
  
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  state.expenses = state.expenses.filter(expense => {
    const expDate = new Date(expense.date);
    return !(expDate.getFullYear() === year && expDate.getMonth() === month);
  });
  
  saveData();
  updateUI();
  closeSettings();
  showToast('Month reset successfully', 'success');
}

function clearAllData() {
  if (!confirm('Are you sure you want to clear ALL data? This cannot be undone.')) return;
  
  state.expenses = [];
  state.settings = {
    accountBudget: 10000,
    cardBudget: 5000
  };
  
  saveData();
  updateUI();
  closeSettings();
  showToast('All data cleared', 'success');
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
  const accountExpenses = monthExpenses.filter(e => e.type === 'account');
  
  // Get all unique dates with expenses
  const expensesByDate = {};
  monthExpenses.forEach(expense => {
    if (!expensesByDate[expense.date]) {
      expensesByDate[expense.date] = [];
    }
    expensesByDate[expense.date].push(expense);
  });
  
  let reportHTML = '';
  
  // Card Budget Summary at top
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
  
  // Generate report by chunks
  chunks.forEach((chunk, index) => {
    const chunkBudget = getChunkBudgetForMonth(chunk, date);
    const chunkExpenses = getExpensesForChunk(chunk, date);
    const chunkSpent = getTotalForExpenses(chunkExpenses);
    const chunkDiff = chunkBudget - chunkSpent;
    
    // Only show chunks that have started (for current month) or all (for past months)
    const today = new Date();
    const isCurrentMonth = date.getFullYear() === today.getFullYear() && 
                          date.getMonth() === today.getMonth();
    
    if (isCurrentMonth && today.getDate() < chunk.start) {
      return; // Skip future chunks
    }
    
    // Chunk summary
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
    
    // Daily breakdown for this chunk
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
  
  if (reportHTML === '') {
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
  // Remove existing toast
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// === Export for debugging ===
window.moneyTracker = {
  state,
  saveData,
  loadData
};

