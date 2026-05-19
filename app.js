const DB_KEY = 'taitung_trip_expenses';

// State
let storedExpenses = null;
try {
    storedExpenses = JSON.parse(localStorage.getItem(DB_KEY));
} catch (e) {
    console.error("Failed to parse localStorage data", e);
}

let expenses = storedExpenses || {
    1: [], // Day 1: 6/5
    2: [], // Day 2: 6/6
    3: [], // Day 3: 6/7
    4: []  // Day 4: 6/8
};

// Ensure all days exist (backward compatibility safety)
[1, 2, 3, 4].forEach(day => {
    if (!expenses[day]) expenses[day] = [];
});

let currentDay = localStorage.getItem(DB_KEY + '_currentDay') || '1';
let totalBudget = parseInt(localStorage.getItem(DB_KEY + '_budget')) || 0;

// DOM Elements
const grandTotalEl = document.getElementById('grand-total');
const totalBudgetEl = document.getElementById('total-budget');
const remainingBudgetEl = document.getElementById('remaining-budget');
const editBudgetBtn = document.getElementById('edit-budget-btn');
const dayTotalEl = document.getElementById('day-total-amount');
const expenseListEl = document.getElementById('expense-list');
const tabBtns = document.querySelectorAll('.tab-btn');
const addBtn = document.getElementById('add-btn');
const modalOverlay = document.getElementById('add-modal');
const closeModalBtn = document.getElementById('close-modal');
const expenseForm = document.getElementById('expense-form');
const expenseCategoryInput = document.getElementById('expense-category');
const expenseDescInput = document.getElementById('expense-desc');
const expenseAmountInput = document.getElementById('expense-amount');

// Initialize
function init() {
    // Set initial active tab
    tabBtns.forEach(btn => {
        if (btn.dataset.day === currentDay) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    render();
    setupEventListeners();
}

// Helpers
function formatCurrency(amount) {
    return '$' + amount.toLocaleString('zh-TW');
}

function saveToLocalStorage() {
    localStorage.setItem(DB_KEY, JSON.stringify(expenses));
}

function calculateGrandTotal() {
    let total = 0;
    for (let day in expenses) {
        total += expenses[day].reduce((sum, item) => sum + item.amount, 0);
    }
    return total;
}

function calculateDayTotal(day) {
    return expenses[day].reduce((sum, item) => sum + item.amount, 0);
}

// Render
function render() {
    // Update budget and totals
    const grandTotal = calculateGrandTotal();
    const remaining = totalBudget - grandTotal;
    
    grandTotalEl.textContent = formatCurrency(grandTotal);
    totalBudgetEl.textContent = formatCurrency(totalBudget);
    remainingBudgetEl.textContent = formatCurrency(remaining);
    
    // Highlight remaining budget color if negative
    if (remaining < 0) {
        remainingBudgetEl.style.color = '#f87171'; // red
    } else {
        remainingBudgetEl.style.color = 'inherit';
    }
    
    // Update day total
    dayTotalEl.textContent = formatCurrency(calculateDayTotal(currentDay));

    // Render list
    expenseListEl.innerHTML = '';
    const dayExpenses = expenses[currentDay];

    if (dayExpenses.length === 0) {
        expenseListEl.innerHTML = '<div class="empty-state">尚未有任何花費，點擊右下角新增吧！ 💸</div>';
    } else {
        dayExpenses.forEach(item => {
            const div = document.createElement('div');
            div.className = 'expense-item';
            div.innerHTML = `
                <div class="expense-info">
                    <span class="expense-name">${item.category || item.name}</span>
                    ${item.desc ? `<span class="expense-desc-text">${item.desc}</span>` : ''}
                    <span class="expense-time">${item.time}</span>
                </div>
                <div class="expense-amount-del">
                    <span class="expense-amount">${formatCurrency(item.amount)}</span>
                    <button class="delete-btn" onclick="deleteExpense('${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            expenseListEl.appendChild(div);
        });
    }
}

// Actions
function addExpense(category, desc, amount) {
    const newExpense = {
        id: Date.now().toString(),
        category,
        desc,
        amount: parseFloat(amount),
        time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
    };
    expenses[currentDay].push(newExpense);
    saveToLocalStorage();
    render();
}

window.deleteExpense = function(id) {
    if(confirm('確定要刪除這筆花費嗎？')) {
        expenses[currentDay] = expenses[currentDay].filter(item => item.id !== id);
        saveToLocalStorage();
        render();
    }
}

// Event Listeners
function setupEventListeners() {
    // Tabs
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active class from all
            tabBtns.forEach(b => b.classList.remove('active'));
            // Add to clicked
            e.currentTarget.classList.add('active');
            // Update current day
            currentDay = e.currentTarget.dataset.day;
            localStorage.setItem(DB_KEY + '_currentDay', currentDay);
            render();
        });
    });

    // Edit Budget
    editBudgetBtn.addEventListener('click', () => {
        const input = prompt('請輸入您的這趟旅程的總預算 (NT$):', totalBudget);
        if (input !== null) {
            const parsed = parseInt(input, 10);
            if (!isNaN(parsed) && parsed >= 0) {
                totalBudget = parsed;
                localStorage.setItem(DB_KEY + '_budget', totalBudget);
                render();
            } else {
                alert('請輸入有效的數字！');
            }
        }
    });

    // Modal open
    addBtn.addEventListener('click', () => {
        modalOverlay.classList.add('active');
        setTimeout(() => expenseCategoryInput.focus(), 100);
    });

    // Modal close
    closeModalBtn.addEventListener('click', () => {
        modalOverlay.classList.remove('active');
        expenseForm.reset();
    });

    // Close on click outside
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.classList.remove('active');
            expenseForm.reset();
        }
    });

    // Form submit
    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const category = expenseCategoryInput.value;
        const desc = expenseDescInput.value.trim();
        const amount = expenseAmountInput.value;
        if (category && amount) {
            addExpense(category, desc, amount);
            modalOverlay.classList.remove('active');
            expenseForm.reset();
        }
    });
}

// Run
init();
