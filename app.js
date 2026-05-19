// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCfPqN0uTnQMu0b6SZPPYMMXil-HtqcyPo",
  authDomain: "lizmoney-6a340.firebaseapp.com",
  projectId: "lizmoney-6a340",
  storageBucket: "lizmoney-6a340.firebasestorage.app",
  messagingSenderId: "502109506998",
  appId: "1:502109506998:web:b959dceac0128a87938517"
};

// 確保有資料庫的連線網址（如果在美國預設區以外建立，Firebase 有時會漏掉）
firebaseConfig.databaseURL = "https://lizmoney-6a340-default-rtdb.firebaseio.com";

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const expensesRef = db.ref('expenses');
const budgetRef = db.ref('budget');

const DB_KEY = 'taitung_trip_expenses';

// State
let expenses = {
    1: [], 
    2: [], 
    3: [], 
    4: []  
};
// 依然保留目前停留在哪一天的本地設定，讓體驗更好
let currentDay = localStorage.getItem(DB_KEY + '_currentDay') || '1';
let totalBudget = 0;

// [即時連線] 監聽總預算的改變
budgetRef.on('value', (snapshot) => {
    totalBudget = snapshot.val() || 0;
    render();
});

// [即時連線] 監聽所有花費的改變
expensesRef.on('value', (snapshot) => {
    const data = snapshot.val() || {};
    
    // 清空本地暫存，準備載入雲端最新資料
    expenses = { 1: [], 2: [], 3: [], 4: [] };
    
    for (const key in data) {
        const item = data[key];
        item.id = key; // 使用 Firebase 產生的唯一 ID
        if (expenses[item.day]) {
            expenses[item.day].push(item);
        }
    }
    render();
});

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
        day: currentDay, // 記錄是哪一天的花費
        category,
        desc,
        amount: parseFloat(amount),
        time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
    };
    // 寫入 Firebase
    expensesRef.push(newExpense);
}

window.deleteExpense = function(id) {
    if(confirm('確定要刪除這筆花費嗎？')) {
        // 從 Firebase 刪除
        expensesRef.child(id).remove();
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
                // 寫入 Firebase，所有人的預算都會同步更新！
                budgetRef.set(parsed);
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
