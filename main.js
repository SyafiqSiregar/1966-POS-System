import Chart from 'chart.js/auto';
import { RAYA_LOGO_DARK, RAYA_LOGO_BLACK } from './logo-data.js';
import { connectBluetoothPrinter, printDirectBluetooth, printViaRawBtIntent } from './thermal-printer.js';
import { saveFileToLocalDevice } from './local-file-saver.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
// import * as supabaseApi from './src/api.js'; // Offline mode active
// window.supabaseApi = supabaseApi;

// Initialize Lucide icons
lucide.createIcons();

// --- Toast Notifications ---
window.showToast = function(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  let icon = 'info';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error') icon = 'alert-circle';
  toast.innerHTML = `<i data-lucide="${icon}"></i> <span>${msg}</span>`;
  container.appendChild(toast);
  lucide.createIcons();
  setTimeout(() => { 
    toast.remove(); 
  }, 2400);
};

// Format Currency Utility
const formatRp = (num) => `Rp ${(num || 0).toLocaleString('id-ID')}`;

// Format Date
const todayStr = new Date().toLocaleDateString('id-ID', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
});
const todayEl = document.getElementById('current-date');
if (todayEl) todayEl.textContent = todayStr;

// --- Persistent Database & Local Storage Layer ---
const STORAGE_KEYS = {
  HISTORY: 'caffe1966_pos_history_v1',
  PRODUCTS: 'caffe1966_pos_products_v1',
  EXPENSES: 'caffe1966_pos_expenses_v1',
  TAXES: 'caffe1966_pos_taxes_v1',
  USERS: 'caffe1966_pos_users_v1',
  SESSION: 'caffe1966_pos_session_v1',
  ATTENDANCE: 'caffe1966_pos_attendance_v1',
  CLEAN_INITIAL: 'caffe1966_pos_clean_slate_v1'
};

// Automatic cleanup of legacy trial data so production starts 100% clean
try {
  if (!localStorage.getItem(STORAGE_KEYS.CLEAN_INITIAL)) {
    localStorage.removeItem('caffe1966_pos_history_trial');
    localStorage.removeItem('caffe1966_pos_expenses_trial');
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CLEAN_INITIAL, 'true');
  }
} catch (e) {}

function loadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Gagal membaca database lokal:', key, err);
  }
  return fallback;
}

function saveStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Gagal menyimpan ke database lokal:', key, err);
  }
}

// Default Data Seed untuk 1966 Caffe (Spesialisasi F&B Kopi & Resto)
const defaultProducts = [
  { id: 1, name: '1966 Signature Aren', price: 22000, category: 'KOPI' },
  { id: 2, name: 'Caffe Latte', price: 24000, category: 'KOPI' },
  { id: 3, name: 'Americano Double Shot', price: 18000, category: 'KOPI' },
  { id: 4, name: 'Caramel Macchiato', price: 26000, category: 'KOPI' },
  { id: 5, name: 'Matcha Cream Latte', price: 25000, category: 'NON_KOPI' },
  { id: 6, name: 'Artisan Chocolate', price: 24000, category: 'NON_KOPI' },
  { id: 7, name: 'Lychee Iced Tea', price: 18000, category: 'NON_KOPI' },
  { id: 8, name: 'Nasi Goreng 1966 Special', price: 32000, category: 'MAKANAN' },
  { id: 9, name: 'Spaghetti Aglio Olio', price: 35000, category: 'MAKANAN' },
  { id: 10, name: 'Butter Croissant', price: 22000, category: 'SNACK' },
  { id: 11, name: 'Crispy French Fries', price: 20000, category: 'SNACK' },
  { id: 12, name: 'Truffle Platter', price: 28000, category: 'SNACK' },
];

const defaultHistory = [];

function normalizeExpense(e) {
  const todayIso = new Date().toISOString().split('T')[0];
  const todayFormatted = new Date().toLocaleDateString('id-ID');
  const fund = e.fundSource || 'KASIR';
  return {
    id: e.id ? String(e.id) : ('EXP-' + Date.now() + '-' + Math.floor(Math.random() * 1000)),
    desc: e.desc || 'Pengeluaran Operasional',
    amount: Math.max(0, parseInt(e.amount, 10) || 0),
    category: e.category || (e.desc && e.desc.toLowerCase().includes('shampoo') ? 'CUCI' : 'KAFE'),
    fundSource: fund,
    employeeName: e.employeeName || (fund === 'KARYAWAN' ? 'Karyawan' : ''),
    reimbursementStatus: e.reimbursementStatus || (fund === 'KARYAWAN' ? 'PENDING' : 'SETTLED'),
    reimbursedAt: e.reimbursedAt || '',
    date: e.date || todayFormatted,
    isoDate: e.isoDate || todayIso,
    timestamp: e.timestamp || Date.now()
  };
}

const todayIso = new Date().toISOString().split('T')[0];
const todayFormatted = new Date().toLocaleDateString('id-ID');

const defaultExpenses = [];

const defaultTaxes = [
  { id: 1, name: 'Pajak PB1 Resto', pct: 11, active: true },
  { id: 2, name: 'Service Charge', pct: 5, active: false }
];

const defaultUsers = [
  {
    id: 'USR-1',
    name: 'Admin Utama',
    username: 'admin',
    pin: 'admin',
    role: 'ADMIN',
    phone: '081234567890',
    status: 'ACTIVE',
    createdAt: '01/10/2026'
  },
  {
    id: 'USR-2',
    name: 'Budi Santoso',
    username: 'kasir',
    pin: 'kasir',
    role: 'KASIR',
    phone: '085678912345',
    status: 'ACTIVE',
    createdAt: '02/10/2026'
  },
  {
    id: 'USR-3',
    name: 'Siti Rahma',
    username: 'siti',
    pin: '1234',
    role: 'KASIR',
    phone: '087812345678',
    status: 'ACTIVE',
    createdAt: '02/10/2026'
  }
];

const defaultAttendance = [
  {
    id: 'ATT-1001',
    userId: 'USR-2',
    userName: 'Kasir Utama',
    userRole: 'KASIR',
    date: new Date().toLocaleDateString('id-ID'),
    isoDate: new Date().toISOString().split('T')[0],
    shiftKey: 'SHIFT_PAGI',
    shiftName: 'Shift Pagi (08:00 - 16:00)',
    clockInTime: '07:55:12',
    clockInPhoto: '',
    clockInStatus: 'ON_TIME',
    lateMinutes: 0,
    clockOutTime: '16:02:45',
    clockOutPhoto: null,
    totalWorkDuration: '8 Jam 7 Menit',
    notes: 'Presensi harian shift pagi lancar',
    timestamp: Date.now() - (1000 * 60 * 60 * 4)
  },
  {
    id: 'ATT-1002',
    userId: 'USR-1',
    userName: 'Admin Utama',
    userRole: 'ADMIN',
    date: new Date().toLocaleDateString('id-ID'),
    isoDate: new Date().toISOString().split('T')[0],
    shiftKey: 'SHIFT_FULL',
    shiftName: 'Shift General (09:00 - 18:00)',
    clockInTime: '09:18:30',
    clockInPhoto: '',
    clockInStatus: 'LATE',
    lateMinutes: 18,
    clockOutTime: null,
    clockOutPhoto: null,
    totalWorkDuration: null,
    notes: 'Macet di jalan operasional',
    timestamp: Date.now() - (1000 * 60 * 60 * 2)
  },
  {
    id: 'ATT-1003',
    userId: 'USR-2',
    userName: 'Kasir Utama',
    userRole: 'KASIR',
    date: new Date(Date.now() - 86400000).toLocaleDateString('id-ID'),
    isoDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    shiftKey: 'SHIFT_PAGI',
    shiftName: 'Shift Pagi (08:00 - 16:00)',
    clockInTime: '07:58:00',
    clockInPhoto: '',
    clockInStatus: 'ON_TIME',
    lateMinutes: 0,
    clockOutTime: '16:05:10',
    clockOutPhoto: null,
    totalWorkDuration: '8 Jam 7 Menit',
    notes: 'Standby mesin kopi operasional',
    timestamp: Date.now() - 86400000
  }
];

// Persistent State Instances
let products = loadStorage(STORAGE_KEYS.PRODUCTS, defaultProducts);
let history = loadStorage(STORAGE_KEYS.HISTORY, defaultHistory);
let expenses = loadStorage(STORAGE_KEYS.EXPENSES, defaultExpenses).map(normalizeExpense);
let taxes = loadStorage(STORAGE_KEYS.TAXES, defaultTaxes);
let users = loadStorage(STORAGE_KEYS.USERS, defaultUsers);
let attendance = loadStorage(STORAGE_KEYS.ATTENDANCE, defaultAttendance);
if (!attendance || !Array.isArray(attendance) || attendance.length === 0) {
  attendance = JSON.parse(JSON.stringify(defaultAttendance));
  saveStorage(STORAGE_KEYS.ATTENDANCE, attendance);
}

// Ensure default admin & cashier accounts are always guaranteed to exist initially
if (!users || !Array.isArray(users) || users.length === 0) {
  users = JSON.parse(JSON.stringify(defaultUsers));
  saveStorage(STORAGE_KEYS.USERS, users);
} else {
  const hasAdmin = users.some(u => u.username && u.username.toLowerCase() === 'admin');
  if (!hasAdmin) {
    users.unshift({
      id: 'USR-1',
      name: 'Admin Utama',
      username: 'admin',
      pin: 'admin',
      role: 'ADMIN',
      phone: '081234567890',
      status: 'ACTIVE',
      createdAt: '01/10/2026'
    });
    saveStorage(STORAGE_KEYS.USERS, users);
  }
}

let currentUser = loadStorage(STORAGE_KEYS.SESSION, null);
let kioskAutoReturnTimer = null;

function cancelKioskAutoReturn() {
  if (kioskAutoReturnTimer) {
    clearTimeout(kioskAutoReturnTimer);
    kioskAutoReturnTimer = null;
  }
}

let currentExpenseFilter = 'ALL'; // ALL, KASIR, PENDING, SETTLED
let editingExpenseId = null;

// Storage helper functions (Full Offline Local Storage)
function saveHistory() { 
  saveStorage(STORAGE_KEYS.HISTORY, history); 
}

function saveProducts() { 
  saveStorage(STORAGE_KEYS.PRODUCTS, products); 
}

function saveExpenses() { 
  saveStorage(STORAGE_KEYS.EXPENSES, expenses); 
}

function saveTaxes() { saveStorage(STORAGE_KEYS.TAXES, taxes); }
function saveUsers() { saveStorage(STORAGE_KEYS.USERS, users); }
function saveAttendance() { saveStorage(STORAGE_KEYS.ATTENDANCE, attendance); }

// Generate Monotonically Increasing TRX ID
function generateNextTrxId() {
  let maxNum = 1000;
  history.forEach(t => {
    if (t.id) {
      const match = t.id.match(/TRX-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  });
  return 'TRX-' + (maxNum + 1);
}

let cart = [];
let currentOrderType = 'DINE_IN'; // DINE_IN, TAKE_AWAY, CARWASH
let currentDiscountType = 'NOMINAL';
let currentDiscountVal = 0;

// DOM Elements
const posGrid = document.getElementById('pos-grid');
const cartItemsContainer = document.getElementById('cart-items');
const cartSubtotalEl = document.getElementById('cart-subtotal');
const cartDiscountEl = document.getElementById('cart-discount');
const cartTaxEl = document.getElementById('cart-tax');
const cartTotalEl = document.getElementById('cart-total');
const searchInput = document.getElementById('pos-search');
const filterBtns = document.querySelectorAll('.filter-btn');
const navItems = document.querySelectorAll('.nav-item[data-target]');
const pageViews = document.querySelectorAll('.page-view');
const drawerMenu = document.getElementById('drawer-menu');
const orderRefInput = document.getElementById('order-reference');

// --- Auth / Login Logic with Role-Based Access ---
function applyUserSession(user) {
  currentUser = user;
  saveStorage(STORAGE_KEYS.SESSION, user);

  document.body.classList.remove('standalone-kiosk-mode');
  if (typeof cancelKioskAutoReturn === 'function') cancelKioskAutoReturn();

  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('main-app').style.display = 'flex';
  
  const roleEl = document.getElementById('current-user-role');
  if (roleEl) {
    roleEl.innerHTML = `${user.name} <br><small style="font-weight:600; font-size:11px; color:${user.role === 'ADMIN' ? 'var(--primary)' : 'var(--success)'};">${user.role === 'ADMIN' ? 'Administrator' : 'Kasir Toko'}</small>`;
  }

  if (user.role === 'KASIR') {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    const activeNav = document.querySelector('.nav-item.active');
    if (!activeNav || activeNav.classList.contains('admin-only')) {
      const posNav = document.querySelector('.nav-item[data-target="pos"]');
      if (posNav) posNav.click();
    }
  } else {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
  }
}

function handleLogin() {
  const usernameInput = document.getElementById('login-user').value.trim().toLowerCase();
  const passwordInput = document.getElementById('login-pass').value.trim();

  if (!usernameInput) {
    showToast('Masukkan username Anda!', 'error');
    return;
  }

  let foundUser = users.find(u => u.username && u.username.toLowerCase() === usernameInput);

  // Auto-restore default admin account if username is admin
  if (!foundUser && usernameInput === 'admin') {
    foundUser = {
      id: 'USR-1',
      name: 'Admin Utama',
      username: 'admin',
      pin: 'admin',
      role: 'ADMIN',
      phone: '081234567890',
      status: 'ACTIVE',
      createdAt: '01/10/2026'
    };
    users.unshift(foundUser);
    saveUsers();
  }

  if (!foundUser) {
    showToast('Username tidak ditemukan di sistem!', 'error');
    return;
  }

  if (foundUser.status === 'INACTIVE') {
    showToast('Akun ini dinonaktifkan. Hubungi Administrator.', 'error');
    return;
  }

  // Validasi password/PIN
  const expectedPin = (foundUser.pin !== undefined && foundUser.pin !== null && foundUser.pin !== '') 
    ? String(foundUser.pin) 
    : (foundUser.username === 'admin' ? 'admin' : (foundUser.username === 'kasir' ? 'kasir' : ''));

  if (expectedPin && passwordInput !== expectedPin) {
    showToast('Password / PIN salah!', 'error');
    return;
  }

  applyUserSession(foundUser);
  showToast(`Selamat datang, ${foundUser.name}! (${foundUser.role === 'ADMIN' ? 'Admin' : 'Kasir'})`, 'success');
}

document.getElementById('btn-login').addEventListener('click', handleLogin);
document.getElementById('login-pass')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleLogin();
});
document.getElementById('login-user')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleLogin();
});

document.getElementById('btn-logout').addEventListener('click', () => {
  currentUser = null;
  localStorage.removeItem(STORAGE_KEYS.SESSION);
  document.body.classList.remove('standalone-kiosk-mode');
  if (typeof cancelKioskAutoReturn === 'function') cancelKioskAutoReturn();
  document.getElementById('main-app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  showToast('Anda telah keluar dari sistem', 'info');
});

// Check existing session on load
if (currentUser && currentUser.username) {
  const freshUser = users.find(u => u.id === currentUser.id || u.username === currentUser.username);
  if (freshUser && freshUser.status === 'ACTIVE') {
    applyUserSession(freshUser);
  } else {
    currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  }
}

// --- Drawer Toggle ---
document.getElementById('btn-menu-toggle').addEventListener('click', () => {
  drawerMenu.classList.add('show');
});
document.getElementById('btn-close-drawer').addEventListener('click', () => {
  drawerMenu.classList.remove('show');
});
drawerMenu.addEventListener('click', (e) => {
  if (e.target === drawerMenu) drawerMenu.classList.remove('show');
});

// --- Navigation ---
navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    const target = e.currentTarget.dataset.target;
    if (!target) return;
    
    // SECURITY AUTH GUARD: Cegah bypass akses jika belum login
    if (!currentUser) {
      showToast('Akses ditolak: Silakan login terlebih dahulu!', 'error');
      if (typeof exitStandaloneAttendanceKiosk === 'function') {
        exitStandaloneAttendanceKiosk();
      }
      return;
    }

    // Role-based protection: Kasir tidak boleh akses menu admin-only
    if (currentUser.role === 'KASIR' && e.currentTarget.classList.contains('admin-only')) {
      showToast('Akses dibatasi hanya untuk Administrator!', 'error');
      return;
    }
    
    navItems.forEach(n => n.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    pageViews.forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(target);
    if (targetPage) targetPage.classList.add('active');

    if (target === 'users') {
      renderUsers();
    } else if (target === 'expense') {
      renderExpense();
    } else if (target === 'reports') {
      renderReports();
    } else if (target === 'dashboard') {
      updateDashboardStats();
    } else if (target === 'attendance') {
      renderAttendanceKiosk();
    } else if (target === 'attendance-report') {
      renderAttendanceReport();
    }
    
    drawerMenu.classList.remove('show');
  });
});

// --- Order Type Selector for Tablets ---
document.querySelectorAll('.order-type-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.order-type-btn').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    currentOrderType = e.currentTarget.dataset.type;
    
    if (currentOrderType === 'DINE_IN') orderRefInput.placeholder = 'No. Meja...';
    else if (currentOrderType === 'TAKE_AWAY') orderRefInput.placeholder = 'Nama Pelanggan...';
    else if (currentOrderType === 'DELIVERY' || currentOrderType === 'CARWASH') orderRefInput.placeholder = 'Catatan Ojol / Delivery...';
  });
});

// --------------------------------------------------
// POS Logic & Rendering
// --------------------------------------------------
function renderPOS(filter = 'all', search = '') {
  posGrid.innerHTML = '';
  
  const filtered = products.filter(p => {
    const matchCat = filter === 'all' || p.category === filter;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // Update catalog count badge
  const countBadge = document.getElementById('pos-item-count-badge');
  if (countBadge) {
    countBadge.textContent = `${filtered.length} Menu`;
  }

  if (filtered.length === 0) {
    posGrid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 48px 20px; text-align: center; color: var(--text-muted);">
        <i data-lucide="search-x" style="width: 40px; height: 40px; stroke-width: 1.5; margin: 0 auto 12px; color: var(--text-muted); opacity: 0.65; display: block;"></i>
        <p style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">Menu Tidak Ditemukan</p>
        <p style="font-size: 12.5px; color: var(--text-muted); max-width: 280px; margin: 0 auto;">Coba kata kunci lain atau pilih filter kategori Semua.</p>
      </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  const catLabelMap = {
    KOPI: 'Kopi',
    NON_KOPI: 'Non-Kopi',
    MAKANAN: 'Makanan',
    SNACK: 'Snack',
    KAFE: 'Kafe'
  };

  filtered.forEach(p => {
    const card = document.createElement('div');
    card.className = 'pos-card';
    card.onclick = () => addToCart(p.id);
    const catDisplay = catLabelMap[p.category] || p.category;
    card.innerHTML = `
      <div class="pos-card-header">
        <span class="category-tag ${p.category}">${catDisplay}</span>
      </div>
      <div>
        <div class="pos-card-title">${p.name}</div>
        <div class="pos-card-price">${formatRp(p.price)}</div>
      </div>
    `;
    posGrid.appendChild(card);
  });
}

// Category filter interaction
filterBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    const targetBtn = e.currentTarget || e.target.closest('.filter-btn');
    if (!targetBtn) return;
    filterBtns.forEach(b => b.classList.remove('active'));
    targetBtn.classList.add('active');
    const searchVal = searchInput ? searchInput.value : '';
    renderPOS(targetBtn.dataset.filter, searchVal);
  });
});

// Search input & clear button handling
const posSearchClearBtn = document.getElementById('pos-search-clear');

function updateSearchClearVisibility() {
  if (!posSearchClearBtn) return;
  if (searchInput && searchInput.value.trim().length > 0) {
    posSearchClearBtn.style.display = 'inline-flex';
  } else {
    posSearchClearBtn.style.display = 'none';
  }
}

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const activeFilterBtn = document.querySelector('.filter-btn.active');
    const activeFilter = activeFilterBtn ? activeFilterBtn.dataset.filter : 'all';
    renderPOS(activeFilter, e.target.value);
    updateSearchClearVisibility();
  });
}

if (posSearchClearBtn) {
  posSearchClearBtn.addEventListener('click', () => {
    if (searchInput) {
      searchInput.value = '';
      updateSearchClearVisibility();
      const activeFilterBtn = document.querySelector('.filter-btn.active');
      const activeFilter = activeFilterBtn ? activeFilterBtn.dataset.filter : 'all';
      renderPOS(activeFilter, '');
      searchInput.focus();
    }
  });
}

// --------------------------------------------------
// Cart Logic
// --------------------------------------------------
function addToCart(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  
  const existing = cart.find(c => c.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...product, qty: 1, notes: '' });
  }
  updateCart();
}

window.openNotes = (id) => {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  document.getElementById('input-notes-id').value = id;
  document.getElementById('input-notes-text').value = item.notes || '';
  document.getElementById('modal-notes').classList.add('show');
};

document.getElementById('btn-save-notes').addEventListener('click', () => {
  const id = parseInt(document.getElementById('input-notes-id').value);
  const text = document.getElementById('input-notes-text').value.trim();
  const item = cart.find(c => c.id === id);
  if (item) item.notes = text;
  document.getElementById('modal-notes').classList.remove('show');
  updateCart();
});

function updateCartQty(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(c => c.id !== id);
  }
  updateCart();
}

function updateCart() {
  cartItemsContainer.innerHTML = '';
  
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="empty-state">
        <i data-lucide="shopping-bag"></i>
        <p>Pesanan masih kosong</p>
      </div>`;
    lucide.createIcons();
    cartSubtotalEl.textContent = formatRp(0);
    if (cartDiscountEl) cartDiscountEl.textContent = '-Rp 0';
    if (cartTaxEl) cartTaxEl.textContent = formatRp(0);
    cartTotalEl.textContent = formatRp(0);
    return;
  }

  let subtotal = 0;
  cart.forEach(item => {
    const itemTotal = item.price * item.qty;
    subtotal += itemTotal;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${formatRp(item.price)} × ${item.qty} = <strong>${formatRp(itemTotal)}</strong></div>
        ${item.notes ? `<div class="cart-item-notes">📝 ${item.notes}</div>` : ''}
      </div>
      <div class="cart-item-controls">
        <button class="btn-qty" onclick="openNotes(${item.id})" title="Catatan"><i data-lucide="edit-2" style="width:14px;height:14px;"></i></button>
        <button class="btn-qty" onclick="updateCartQty(${item.id}, -1)"><i data-lucide="minus" style="width:14px;height:14px;"></i></button>
        <span class="qty-val">${item.qty}</span>
        <button class="btn-qty" onclick="updateCartQty(${item.id}, 1)"><i data-lucide="plus" style="width:14px;height:14px;"></i></button>
      </div>
    `;
    cartItemsContainer.appendChild(div);
  });
  lucide.createIcons();
  
  // Calculate Discount
  let discountNominal = 0;
  if (currentDiscountType === 'PERCENT') {
    discountNominal = subtotal * (currentDiscountVal / 100);
  } else {
    discountNominal = currentDiscountVal;
  }
  if (discountNominal > subtotal) discountNominal = subtotal;

  const afterDiscount = subtotal - discountNominal;
  
  // Calculate Active Taxes
  let totalTaxPct = taxes.filter(t => t.active).reduce((sum, t) => sum + t.pct, 0);
  const taxNominal = Math.round(afterDiscount * (totalTaxPct / 100));
  const grandTotal = Math.round(afterDiscount + taxNominal);
  
  cartSubtotalEl.textContent = formatRp(subtotal);
  if (cartDiscountEl) cartDiscountEl.textContent = '-Rp ' + discountNominal.toLocaleString('id-ID');
  if (cartTaxEl) cartTaxEl.textContent = formatRp(taxNominal);
  cartTotalEl.textContent = formatRp(grandTotal);
}

document.getElementById('btn-apply-discount').addEventListener('click', () => {
  currentDiscountType = document.getElementById('input-disc-type').value;
  currentDiscountVal = parseFloat(document.getElementById('input-disc-val').value) || 0;
  document.getElementById('modal-discount').classList.remove('show');
  updateCart();
});

document.getElementById('btn-clear-cart').addEventListener('click', () => {
  if (cart.length > 0) {
    cart = [];
    currentDiscountVal = 0;
    orderRefInput.value = '';
    updateCart();
    showToast('Pesanan direset', 'info');
  }
});

// --------------------------------------------------
// Checkout & Payment Logic (Tablet Touch Numpad)
// --------------------------------------------------
let currentTotal = 0;
let paymentMethod = 'TUNAI';
let cashInputValue = '';

document.getElementById('btn-checkout').addEventListener('click', () => {
  if (cart.length === 0) return showToast('Pilih menu terlebih dahulu!', 'error');
  
  const totalStr = document.getElementById('cart-total').textContent.replace(/[Rp\s.]/g, '');
  currentTotal = parseInt(totalStr) || 0;
  
  document.getElementById('payment-total-amount').textContent = formatRp(currentTotal);
  
  paymentMethod = 'TUNAI';
  document.querySelectorAll('.pay-method').forEach(btn => btn.classList.remove('active'));
  document.querySelector('.pay-method[data-method="TUNAI"]').classList.add('active');
  document.getElementById('cash-input-section').style.display = 'block';
  
  cashInputValue = currentTotal.toString();
  updateCashDisplay();
  renderQuickCashOptions(currentTotal);
  
  document.getElementById('modal-payment').classList.add('show');
  lucide.createIcons();
});

// Tablet On-Screen Keypad Functions
window.appendNumpad = function(val) {
  if (cashInputValue === '0' || cashInputValue === currentTotal.toString()) {
    cashInputValue = val;
  } else {
    cashInputValue += val;
  }
  updateCashDisplay();
};

window.clearNumpad = function() {
  cashInputValue = '0';
  updateCashDisplay();
};

window.backspaceNumpad = function() {
  cashInputValue = cashInputValue.slice(0, -1);
  if (cashInputValue === '') cashInputValue = '0';
  updateCashDisplay();
};

window.setExactCash = function() {
  cashInputValue = currentTotal.toString();
  updateCashDisplay();
};

function updateCashDisplay() {
  const cashNum = parseInt(cashInputValue) || 0;
  document.getElementById('input-cash-amount').value = cashNum.toLocaleString('id-ID');
  
  const change = cashNum - currentTotal;
  const changeEl = document.getElementById('payment-change');
  if (change < 0) {
    changeEl.textContent = 'Kurang ' + formatRp(Math.abs(change));
    changeEl.style.color = 'var(--danger)';
  } else {
    changeEl.textContent = formatRp(change);
    changeEl.style.color = 'var(--text-main)';
  }
}

function renderQuickCashOptions(total) {
  const container = document.getElementById('quick-cash-container');
  container.innerHTML = '';
  
  const options = new Set();
  options.add(total);
  
  const denominations = [20000, 50000, 100000, 200000, 500000];
  const next50k = Math.ceil(total / 50000) * 50000;
  const next100k = Math.ceil(total / 100000) * 100000;
  
  if (next50k > total) options.add(next50k);
  if (next100k > total) options.add(next100k);
  denominations.forEach(d => {
    if (d > total && options.size < 4) options.add(d);
  });

  Array.from(options).sort((a, b) => a - b).forEach(val => {
    const btn = document.createElement('button');
    btn.className = 'btn-quick-cash';
    btn.textContent = val === total ? 'Uang Pas' : formatRp(val);
    btn.onclick = () => {
      cashInputValue = val.toString();
      updateCashDisplay();
    };
    container.appendChild(btn);
  });
}

document.querySelectorAll('.pay-method').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.pay-method').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    paymentMethod = e.currentTarget.dataset.method;
    document.getElementById('cash-input-section').style.display = paymentMethod === 'TUNAI' ? 'block' : 'none';
  });
});

document.getElementById('btn-confirm-payment').addEventListener('click', () => {
  let cash = 0;
  if (paymentMethod === 'TUNAI') {
    cash = parseInt(cashInputValue) || 0;
    if (cash < currentTotal) return showToast('Nominal pembayaran kurang!', 'error');
  } else {
    cash = currentTotal;
  }
  
  let typeText = 'Dine In';
  if (currentOrderType === 'TAKE_AWAY') typeText = 'Takeaway';
  if (currentOrderType === 'DELIVERY' || currentOrderType === 'CARWASH') typeText = 'Delivery';
  
  const refText = orderRefInput.value.trim() || '-';

  // Subtotal & discount & tax
  const subtotalStr = document.getElementById('cart-subtotal').textContent.replace(/[Rp\s.]/g, '');
  const subtotal = parseInt(subtotalStr) || 0;
  const discountStr = document.getElementById('cart-discount').textContent.replace(/[-Rp\s.]/g, '');
  const discount = parseInt(discountStr) || 0;
  const taxStr = document.getElementById('cart-tax').textContent.replace(/[Rp\s.]/g, '');
  const tax = parseInt(taxStr) || 0;

  const cashierName = currentUser ? currentUser.name : 'Kasir 1966';
  const cashierId = currentUser ? currentUser.id : 'USR-1';

  const newTrx = {
    id: generateNextTrxId(),
    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    date: new Date().toLocaleDateString('id-ID'),
    isoDate: new Date().toISOString().split('T')[0],
    timestamp: Date.now(),
    type: typeText,
    ref: refText,
    cashierName,
    cashierId,
    items: JSON.parse(JSON.stringify(cart)),
    subtotal,
    discount,
    tax,
    total: currentTotal,
    paid: cash,
    change: cash > currentTotal ? cash - currentTotal : 0,
    method: paymentMethod,
    status: 'Selesai'
  };
  
  history.unshift(newTrx);
  saveHistory(); // Simpan ke database lokal permanen
  
  updateDashboardStats();
  renderHistory();
  renderReports();
  
  document.getElementById('modal-payment').classList.remove('show');
  
  // Clear Active Cart
  cart = [];
  currentDiscountVal = 0;
  orderRefInput.value = '';
  updateCart();
  
  showToast(`Transaksi ${newTrx.id} Berhasil (${paymentMethod})`, 'success');
  
  // Auto-open thermal receipt preview
  openReceiptModal(newTrx);
});

// --------------------------------------------------
// Thermal Receipt Modal & Print
// --------------------------------------------------
window.currentReceiptTrx = null;
window.receiptPaperWidth = 32; // 32 chars for 58mm, 48 chars for 80mm

window.setReceiptPaperWidth = function(width) {
  window.receiptPaperWidth = width;
  const btn58 = document.getElementById('btn-paper-58');
  const btn80 = document.getElementById('btn-paper-80');
  if (btn58 && btn80) {
    if (width === 32) {
      btn58.style.background = 'var(--primary)';
      btn58.style.color = '#fff';
      btn58.style.borderColor = 'var(--primary)';
      btn80.style.background = 'var(--surface)';
      btn80.style.color = 'var(--text-main)';
      btn80.style.borderColor = 'var(--border-color)';
    } else {
      btn80.style.background = 'var(--primary)';
      btn80.style.color = '#fff';
      btn80.style.borderColor = 'var(--primary)';
      btn58.style.background = 'var(--surface)';
      btn58.style.color = 'var(--text-main)';
      btn58.style.borderColor = 'var(--border-color)';
    }
  }
};

window.handlePrintBluetooth = async function() {
  if (!window.currentReceiptTrx) {
    return showToast('Tidak ada transaksi aktif untuk dicetak', 'error');
  }
  try {
    showToast('Menghubungkan ke Printer Bluetooth...', 'info');
    await printDirectBluetooth(window.currentReceiptTrx, window.receiptPaperWidth);
    showToast('Struk berhasil dicetak ke printer thermal!', 'success');
  } catch (err) {
    console.warn('Direct Bluetooth print failed, suggesting RawBT:', err);
    showToast(err.message || 'Gagal cetak Bluetooth. Silakan gunakan opsi RawBT / POS.', 'error');
  }
};

window.handlePrintRawBt = function() {
  if (!window.currentReceiptTrx) {
    return showToast('Tidak ada transaksi aktif untuk dicetak', 'error');
  }
  try {
    printViaRawBtIntent(window.currentReceiptTrx, window.receiptPaperWidth);
    showToast('Mengirim struk ke driver thermal (RawBT)...', 'info');
  } catch (err) {
    showToast('Gagal memanggil driver printer: ' + err.message, 'error');
  }
};

window.handleScanBluetoothPrinter = async function() {
  try {
    showToast('Mencari printer thermal Bluetooth di sekitar...', 'info');
    const deviceName = await connectBluetoothPrinter();
    showToast(`Printer Bluetooth terhubung: ${deviceName}`, 'success');
  } catch (err) {
    showToast(err.message || 'Pencarian printer dibatalkan', 'error');
  }
};

window.openReceiptModal = function(param) {
  const trx = typeof param === 'string' ? history.find(t => t.id === param) : param;
  if (!trx) return;
  window.currentReceiptTrx = trx;

  const cashierDisplay = trx.cashierName || (currentUser ? currentUser.name : 'Kasir 1966');
  document.getElementById('receipt-date-time').textContent = `${trx.date} ${trx.time} WIB`;
  document.getElementById('receipt-id').textContent = `No: ${trx.id} (Kasir: ${cashierDisplay})`;
  document.getElementById('receipt-type-label').textContent = `Tipe: ${trx.type} (${trx.ref})`;
  
  const table = document.getElementById('receipt-items-table');
  table.innerHTML = '';
  trx.items.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name} ${item.notes ? `<small>(${item.notes})</small>` : ''}<br><span style="color:#555;">${formatRp(item.price)} × ${item.qty}</span></td>
      <td style="text-align:right; vertical-align:bottom;">${formatRp(item.price * item.qty)}</td>
    `;
    table.appendChild(tr);
  });

  document.getElementById('receipt-subtotal').textContent = formatRp(trx.subtotal);
  if (trx.discount > 0) {
    document.getElementById('receipt-discount-row').style.display = 'table-row';
    document.getElementById('receipt-discount').textContent = '-' + formatRp(trx.discount);
  } else {
    document.getElementById('receipt-discount-row').style.display = 'none';
  }
  document.getElementById('receipt-tax').textContent = formatRp(trx.tax);
  document.getElementById('receipt-total').textContent = formatRp(trx.total);
  document.getElementById('receipt-method-label').textContent = trx.method;
  document.getElementById('receipt-paid').textContent = formatRp(trx.paid);
  
  if (trx.method === 'TUNAI') {
    document.getElementById('receipt-change-row').style.display = 'table-row';
    document.getElementById('receipt-change').textContent = formatRp(trx.change);
  } else {
    document.getElementById('receipt-change-row').style.display = 'none';
  }

  document.getElementById('modal-receipt').classList.add('show');
  lucide.createIcons();
};

// --------------------------------------------------
// Menu Management Logic
// --------------------------------------------------
function renderMenuTable() {
  const tbody = document.getElementById('table-menu');
  if (!tbody) return;
  tbody.innerHTML = '';
  const catLabelMap = {
    KOPI: 'Kopi',
    NON_KOPI: 'Non-Kopi',
    MAKANAN: 'Makanan',
    SNACK: 'Snack',
    KAFE: 'Kafe'
  };
  products.forEach(p => {
    const tr = document.createElement('tr');
    const catLabel = catLabelMap[p.category] || p.category;
    tr.innerHTML = `
      <td><strong>${p.name}</strong></td>
      <td><span class="category-tag ${p.category}">${catLabel}</span></td>
      <td>${formatRp(p.price)}</td>
      <td style="text-align:right;">
        <div style="display:flex; gap:6px; justify-content:flex-end;">
          <button class="btn-outline" style="padding: 4px 8px; font-size:12px; min-height:36px;" onclick="openEditMenu(${p.id})">
            <i data-lucide="pencil" style="width:14px;height:14px;"></i> Edit
          </button>
          <button class="btn-outline danger" style="padding: 4px 8px; font-size:12px; min-height:36px;" onclick="deleteMenu(${p.id})">
            <i data-lucide="trash-2" style="width:14px;height:14px;"></i> Hapus
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  lucide.createIcons();
}

window.deleteMenu = (id) => {
  if (confirm("Hapus menu ini dari katalog?")) {
    products = products.filter(p => p.id !== id);
    saveProducts();
    renderMenuTable();
    renderPOS();
    showToast('Menu berhasil dihapus', 'info');
  }
};

// Edit menu: open modal pre-filled with current product data
let editingMenuId = null;

window.openEditMenu = (id) => {
  const product = products.find(p => p.id === id);
  if (!product) return;
  
  editingMenuId = id;
  document.getElementById('edit-menu-name').value = product.name;
  document.getElementById('edit-menu-category').value = product.category;
  document.getElementById('edit-menu-price').value = product.price;
  document.getElementById('modal-edit-menu').classList.add('show');
};

document.getElementById('btn-update-menu').addEventListener('click', () => {
  const name = document.getElementById('edit-menu-name').value.trim();
  const cat = document.getElementById('edit-menu-category').value;
  const price = parseInt(document.getElementById('edit-menu-price').value);
  
  if (!name || isNaN(price) || price <= 0) {
    return showToast('Mohon lengkapi nama dan harga produk', 'error');
  }
  
  const product = products.find(p => p.id === editingMenuId);
  if (!product) return;
  
  product.name = name;
  product.category = cat;
  product.price = price;
  
  saveProducts();
  document.getElementById('modal-edit-menu').classList.remove('show');
  renderMenuTable();
  renderPOS();
  editingMenuId = null;
  showToast(`Produk "${name}" berhasil diperbarui`, 'success');
});

document.getElementById('btn-save-menu').addEventListener('click', () => {
  const name = document.getElementById('input-menu-name').value.trim();
  const cat = document.getElementById('input-menu-category').value;
  const price = parseInt(document.getElementById('input-menu-price').value);
  
  if (!name || isNaN(price) || price <= 0) {
    return showToast('Mohon lengkapi nama dan harga produk', 'error');
  }
  
  products.push({
    id: Date.now(),
    name, 
    category: cat, 
    price
  });
  
  saveProducts();
  document.getElementById('modal-add-menu').classList.remove('show');
  renderMenuTable();
  renderPOS();
  
  document.getElementById('input-menu-name').value = '';
  document.getElementById('input-menu-price').value = '';
  showToast(`Produk "${name}" ditambahkan`, 'success');
});

// --------------------------------------------------
// History & Expenses Logic
// --------------------------------------------------
let currentHistoryFilter = 'ALL'; // 'ALL', 'KAFE', 'CUCI'
let currentReportFilter = 'ALL';  // 'ALL', 'KAFE', 'CUCI'

function getTrxServices(trx) {
  let hasKafe = false; // Minuman / Kopi
  let hasCuci = false; // Makanan / Snack
  let kafeTotal = 0;
  let cuciTotal = 0;
  let kafeQty = 0;
  let cuciQty = 0;

  if (trx.items && trx.items.length > 0) {
    trx.items.forEach(item => {
      const cat = (item.category || '').toUpperCase();
      if (cat === 'MAKANAN' || cat === 'SNACK' || cat === 'CUCI' || cat === 'FOOD') {
        hasCuci = true;
        cuciTotal += (item.price * item.qty);
        cuciQty += item.qty;
      } else {
        hasKafe = true;
        kafeTotal += (item.price * item.qty);
        kafeQty += item.qty;
      }
    });
  } else {
    hasKafe = true;
    kafeTotal = trx.total || 0;
    kafeQty = 1;
  }

  return { hasKafe, hasCuci, kafeTotal, cuciTotal, kafeQty, cuciQty };
}

function renderHistory() {
  const tbody = document.getElementById('table-history');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  // Calculate summary metrics for all transactions
  let allOmset = 0;
  let kafeOmset = 0;
  let cuciOmset = 0;
  let kafeTrxCount = 0;
  let cuciTrxCount = 0;
  let kafeItemCount = 0;
  let cuciUnitCount = 0;

  history.forEach(trx => {
    allOmset += trx.total;
    const s = getTrxServices(trx);
    if (s.hasKafe) {
      kafeOmset += s.kafeTotal;
      kafeTrxCount++;
      kafeItemCount += s.kafeQty;
    }
    if (s.hasCuci) {
      cuciOmset += s.cuciTotal;
      cuciTrxCount++;
      cuciUnitCount += s.cuciQty;
    }
  });

  const histAllOmsetEl = document.getElementById('hist-stat-all-omset');
  if (histAllOmsetEl) histAllOmsetEl.textContent = formatRp(allOmset);
  const histAllCountEl = document.getElementById('hist-stat-all-count');
  if (histAllCountEl) histAllCountEl.textContent = `${history.length} Transaksi`;

  const histKafeOmsetEl = document.getElementById('hist-stat-kafe-omset');
  if (histKafeOmsetEl) histKafeOmsetEl.textContent = formatRp(kafeOmset);
  const histKafeCountEl = document.getElementById('hist-stat-kafe-count');
  if (histKafeCountEl) histKafeCountEl.textContent = `${kafeTrxCount} Trx (${kafeItemCount} item)`;

  const histWashOmsetEl = document.getElementById('hist-stat-wash-omset');
  if (histWashOmsetEl) histWashOmsetEl.textContent = formatRp(cuciOmset);
  const histWashCountEl = document.getElementById('hist-stat-wash-count');
  if (histWashCountEl) histWashCountEl.textContent = `${cuciTrxCount} Trx (${cuciUnitCount} unit)`;

  // Filter based on active service tab
  let filtered = history;
  if (currentHistoryFilter === 'KAFE') {
    filtered = history.filter(h => getTrxServices(h).hasKafe);
  } else if (currentHistoryFilter === 'CUCI') {
    filtered = history.filter(h => getTrxServices(h).hasCuci);
  }

  if (filtered.length === 0) {
    const filterName = currentHistoryFilter === 'KAFE' ? 'Minuman' : (currentHistoryFilter === 'CUCI' ? 'Makanan' : 'semua pesanan');
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:24px;">Belum ada riwayat transaksi untuk ${filterName}.</td></tr>`;
    return;
  }
  
  filtered.forEach(h => {
    const s = getTrxServices(h);
    let serviceBadge = '';
    if (s.hasKafe && s.hasCuci) {
      serviceBadge = `<span class="category-tag KAFE">Minuman</span> <span class="category-tag CUCI" style="margin-left:2px; background:var(--carwash-light); color:var(--secondary); border-color:var(--carwash-border);">Makanan</span>`;
    } else if (s.hasKafe) {
      serviceBadge = `<span class="category-tag KAFE">Minuman</span>`;
    } else {
      serviceBadge = `<span class="category-tag CUCI" style="background:var(--carwash-light); color:var(--secondary); border-color:var(--carwash-border);">Makanan</span>`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${h.id}</strong></td>
      <td>${h.time} WIB</td>
      <td>${serviceBadge}</td>
      <td>${h.type || '-'} <small style="color:var(--text-muted);">(${h.ref || '-'})</small></td>
      <td><strong>${formatRp(h.total)}</strong></td>
      <td><span class="status-badge" style="background:var(--surface-subtle); color:var(--text-secondary); border:1px solid var(--border-color);">${h.method}</span></td>
      <td style="text-align:right; white-space:nowrap;">
        <button class="btn-outline" style="padding:4px 8px; font-size:12px; min-height:34px; display:inline-flex; align-items:center; gap:4px;" onclick='openReceiptModal("${h.id}")' title="Lihat Struk">
          <i data-lucide="receipt" style="width:13px;height:13px;"></i> Struk
        </button>
        <button class="btn-outline" style="padding:4px 8px; font-size:12px; min-height:34px; display:inline-flex; align-items:center; gap:4px; margin-left:4px; color:var(--primary); border-color:var(--primary-border);" onclick='openEditTrx("${h.id}")' title="Edit Transaksi">
          <i data-lucide="edit-3" style="width:13px;height:13px;"></i> Edit
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  lucide.createIcons();
}

// --- Edit Transaction State & Logic ---
let editingTrxId = null;
let editingTrxItems = [];

window.openEditTrx = function(id) {
  const trx = history.find(t => t.id === id);
  if (!trx) return showToast('Transaksi tidak ditemukan', 'error');

  editingTrxId = id;
  editingTrxItems = JSON.parse(JSON.stringify(trx.items || []));

  document.getElementById('edit-trx-badge').textContent = trx.id;
  document.getElementById('edit-trx-time').value = trx.time || '';
  document.getElementById('edit-trx-method').value = trx.method || 'TUNAI';
  document.getElementById('edit-trx-type').value = trx.type || 'Dine In';
  document.getElementById('edit-trx-ref').value = trx.ref || '';
  document.getElementById('edit-trx-discount').value = trx.discount || 0;
  document.getElementById('edit-trx-tax').value = trx.tax || 0;

  // Populate Add Product Select
  const select = document.getElementById('edit-trx-add-product-select');
  if (select) {
    select.innerHTML = products.map(p => `
      <option value="${p.id}">${p.name} (${p.category}) - ${formatRp(p.price)}</option>
    `).join('');
  }

  renderEditTrxItems();
  calcEditTrxTotal();

  document.getElementById('modal-edit-trx').classList.add('show');
  lucide.createIcons();
};

function renderEditTrxItems() {
  const container = document.getElementById('edit-trx-items-container');
  if (!container) return;
  container.innerHTML = '';

  if (editingTrxItems.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:16px; color:var(--text-muted); font-size:12px;">Tidak ada item. Tambahkan item di bawah.</div>`;
    document.getElementById('edit-trx-item-count').textContent = '0 item';
    calcEditTrxTotal();
    return;
  }

  document.getElementById('edit-trx-item-count').textContent = `${editingTrxItems.length} item`;

  editingTrxItems.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'edit-trx-item-row';
    row.innerHTML = `
      <div class="edit-trx-item-info">
        <div class="edit-trx-item-name">${item.name}</div>
        <div class="edit-trx-item-price">${formatRp(item.price)} × ${item.qty} = <strong>${formatRp(item.price * item.qty)}</strong></div>
      </div>
      <div class="edit-trx-qty-ctrl">
        <button type="button" class="btn-qty-mini" onclick="changeEditTrxItemQty(${idx}, -1)">−</button>
        <span class="qty-mini-val">${item.qty}</span>
        <button type="button" class="btn-qty-mini" onclick="changeEditTrxItemQty(${idx}, 1)">+</button>
        <button type="button" class="btn-remove-item" onclick="removeEditTrxItem(${idx})" title="Hapus item">
          <i data-lucide="trash-2" style="width:13px;height:13px;"></i>
        </button>
      </div>
    `;
    container.appendChild(row);
  });
  lucide.createIcons();
  calcEditTrxTotal();
}

window.changeEditTrxItemQty = function(idx, delta) {
  if (!editingTrxItems[idx]) return;
  editingTrxItems[idx].qty += delta;
  if (editingTrxItems[idx].qty <= 0) {
    editingTrxItems.splice(idx, 1);
  }
  renderEditTrxItems();
};

window.removeEditTrxItem = function(idx) {
  if (!editingTrxItems[idx]) return;
  editingTrxItems.splice(idx, 1);
  renderEditTrxItems();
};

document.getElementById('btn-edit-trx-add-item').addEventListener('click', () => {
  const select = document.getElementById('edit-trx-add-product-select');
  if (!select) return;
  const prodId = parseInt(select.value);
  const prod = products.find(p => p.id === prodId);
  if (!prod) return;

  const existing = editingTrxItems.find(i => i.id === prod.id || i.name === prod.name);
  if (existing) {
    existing.qty += 1;
  } else {
    editingTrxItems.push({
      id: prod.id,
      name: prod.name,
      price: prod.price,
      category: prod.category,
      qty: 1
    });
  }
  renderEditTrxItems();
});

function calcEditTrxTotal() {
  const subtotal = editingTrxItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const discountInput = document.getElementById('edit-trx-discount');
  const taxInput = document.getElementById('edit-trx-tax');
  const discount = Math.max(0, parseInt(discountInput ? discountInput.value : 0) || 0);
  const tax = Math.max(0, parseInt(taxInput ? taxInput.value : 0) || 0);
  const total = Math.max(0, subtotal - discount + tax);

  const previewEl = document.getElementById('edit-trx-total-preview');
  if (previewEl) previewEl.textContent = formatRp(total);
  return { subtotal, discount, tax, total };
}

document.getElementById('edit-trx-discount').addEventListener('input', calcEditTrxTotal);
document.getElementById('edit-trx-tax').addEventListener('input', calcEditTrxTotal);

document.getElementById('btn-save-edit-trx').addEventListener('click', () => {
  if (!editingTrxId) return;
  const trx = history.find(t => t.id === editingTrxId);
  if (!trx) return showToast('Transaksi tidak ditemukan', 'error');

  if (editingTrxItems.length === 0) {
    return showToast('Transaksi harus memiliki minimal 1 item pesanan', 'error');
  }

  const timeVal = document.getElementById('edit-trx-time').value.trim() || trx.time;
  const methodVal = document.getElementById('edit-trx-method').value;
  const typeVal = document.getElementById('edit-trx-type').value;
  const refVal = document.getElementById('edit-trx-ref').value.trim();

  const { subtotal, discount, tax, total } = calcEditTrxTotal();

  trx.time = timeVal;
  trx.method = methodVal;
  trx.type = typeVal;
  trx.ref = refVal;
  trx.items = JSON.parse(JSON.stringify(editingTrxItems));
  trx.subtotal = subtotal;
  trx.discount = discount;
  trx.tax = tax;
  trx.total = total;
  trx.paid = trx.paid >= total ? trx.paid : total;
  trx.change = trx.paid > total ? trx.paid - total : 0;

  saveHistory();
  document.getElementById('modal-edit-trx').classList.remove('show');
  renderHistory();
  updateDashboardStats();
  renderReports();

  showToast(`Transaksi ${trx.id} berhasil diperbarui`, 'success');
  editingTrxId = null;
});

document.getElementById('btn-delete-trx').addEventListener('click', () => {
  if (!editingTrxId) return;
  if (!confirm(`Hapus transaksi ${editingTrxId} dari riwayat? Total omset dan laporan akan diperbarui otomatis.`)) {
    return;
  }

  const deletedId = editingTrxId;
  history = history.filter(t => t.id !== deletedId);
  saveHistory();
  document.getElementById('modal-edit-trx').classList.remove('show');
  renderHistory();
  updateDashboardStats();
  renderReports();

  showToast(`Transaksi ${deletedId} telah dihapus`, 'info');
  editingTrxId = null;
});

// --------------------------------------------------
// Biaya Operasional & Talangan Karyawan Logic
// --------------------------------------------------
function formatDateIndo(isoStr) {
  if (!isoStr) return '';
  try {
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const dayName = days[d.getDay()];
      const dayNum = d.getDate();
      const monthName = months[d.getMonth()];
      const year = d.getFullYear();
      return `${dayName}, ${dayNum} ${monthName} ${year}`;
    }
  } catch (err) {
    console.error('Error formatting date:', err);
  }
  return isoStr;
}

function openAddExpenseModal() {
  const modal = document.getElementById('modal-add-expense');
  if (!modal) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('input-expense-date');
  if (dateInput) dateInput.value = todayStr;

  const descInput = document.getElementById('input-expense-desc');
  if (descInput) descInput.value = '';

  const amountInput = document.getElementById('input-expense-amount');
  if (amountInput) amountInput.value = '';

  const employeeInput = document.getElementById('input-expense-employee');
  if (employeeInput) employeeInput.value = '';

  const reimbursedNowCheckbox = document.getElementById('input-expense-reimbursed-now');
  if (reimbursedNowCheckbox) reimbursedNowCheckbox.checked = false;

  const catSelect = document.getElementById('input-expense-category');
  if (catSelect) catSelect.value = 'KAFE';

  // Set fund radio to Kasir by default
  const kasirRadio = document.querySelector('input[name="add-expense-fund"][value="KASIR"]');
  if (kasirRadio) kasirRadio.checked = true;
  document.getElementById('card-fund-kasir')?.classList.add('active');
  document.getElementById('card-fund-karyawan')?.classList.remove('active');
  
  const empContainer = document.getElementById('add-expense-employee-container');
  if (empContainer) empContainer.style.display = 'none';

  modal.classList.add('show');
}

// Radio change listeners for Add Expense Modal
document.querySelectorAll('input[name="add-expense-fund"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    const isKaryawan = e.target.value === 'KARYAWAN';
    document.getElementById('card-fund-kasir')?.classList.toggle('active', !isKaryawan);
    document.getElementById('card-fund-karyawan')?.classList.toggle('active', isKaryawan);
    const empContainer = document.getElementById('add-expense-employee-container');
    if (empContainer) empContainer.style.display = isKaryawan ? 'block' : 'none';
  });
});

// Radio change listeners for Edit Expense Modal
document.querySelectorAll('input[name="edit-expense-fund"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    const isKaryawan = e.target.value === 'KARYAWAN';
    document.getElementById('edit-card-fund-kasir')?.classList.toggle('active', !isKaryawan);
    document.getElementById('edit-card-fund-karyawan')?.classList.toggle('active', isKaryawan);
    const empContainer = document.getElementById('edit-expense-employee-container');
    if (empContainer) empContainer.style.display = isKaryawan ? 'block' : 'none';
  });
});

// Save New Expense
document.getElementById('btn-save-expense').addEventListener('click', () => {
  const dateInput = document.getElementById('input-expense-date');
  const catInput = document.getElementById('input-expense-category');
  const descInput = document.getElementById('input-expense-desc');
  const amountInput = document.getElementById('input-expense-amount');

  const isoDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
  const category = catInput ? catInput.value : 'KAFE';
  const desc = descInput ? descInput.value.trim() : '';
  const amount = parseInt(amountInput ? amountInput.value : 0, 10);

  if (!desc || isNaN(amount) || amount <= 0) {
    return showToast('Mohon isi keterangan dan nominal biaya dengan benar', 'error');
  }

  const fundRadio = document.querySelector('input[name="add-expense-fund"]:checked');
  const fundSource = fundRadio ? fundRadio.value : 'KASIR';

  let employeeName = '';
  let reimbursementStatus = 'SETTLED';
  let reimbursedAt = '';

  if (fundSource === 'KARYAWAN') {
    const empInput = document.getElementById('input-expense-employee');
    employeeName = empInput ? empInput.value.trim() : '';
    if (!employeeName) {
      return showToast('Mohon isi nama karyawan yang menalangi pengeluaran ini', 'error');
    }

    const isReimbursedNow = document.getElementById('input-expense-reimbursed-now')?.checked;
    if (isReimbursedNow) {
      reimbursementStatus = 'SETTLED';
      reimbursedAt = new Date().toLocaleTimeString('id-ID') + ', ' + new Date().toLocaleDateString('id-ID');
    } else {
      reimbursementStatus = 'PENDING';
    }
  }

  let formattedDate = isoDate;
  try {
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      formattedDate = `${parseInt(parts[2])}/${parseInt(parts[1])}/${parts[0]}`;
    }
  } catch (err) {}

  const newExpense = {
    id: 'EXP-' + Date.now(),
    desc,
    amount,
    category,
    fundSource,
    employeeName,
    reimbursementStatus,
    reimbursedAt,
    date: formattedDate,
    isoDate,
    timestamp: Date.now()
  };

  expenses.unshift(newExpense);
  saveExpenses();

  document.getElementById('modal-add-expense')?.classList.remove('show');
  renderExpense();
  updateDashboardStats();
  renderReports();

  if (fundSource === 'KARYAWAN' && reimbursementStatus === 'PENDING') {
    showToast(`Pengeluaran dicatat sebagai talangan ${employeeName} (Menunggu Penggantian)`, 'info');
  } else {
    showToast('Pengeluaran berhasil dicatat ke sistem', 'success');
  }
});

// Confirm Reimbursement (1-Click Action)
window.confirmReimbursement = function(id) {
  const exp = expenses.find(e => String(e.id) === String(id));
  if (!exp) return;

  const emp = exp.employeeName || 'Karyawan';
  const nominalStr = formatRp(exp.amount);

  if (!confirm(`Konfirmasi pelunasan uang talangan untuk ${emp} sebesar ${nominalStr} dari kasir sekarang?`)) {
    return;
  }

  exp.reimbursementStatus = 'SETTLED';
  exp.reimbursedAt = new Date().toLocaleTimeString('id-ID') + ', ' + new Date().toLocaleDateString('id-ID');

  saveExpenses();
  renderExpense();
  updateDashboardStats();
  renderReports();

  showToast(`Uang talangan ${emp} sebesar ${nominalStr} telah lunas diganti kasir`, 'success');
};

// Open Edit Expense Modal
window.openEditExpense = function(id) {
  const exp = expenses.find(e => String(e.id) === String(id));
  if (!exp) return;

  editingExpenseId = exp.id;

  const modal = document.getElementById('modal-edit-expense');
  if (!modal) return;

  document.getElementById('edit-expense-date').value = exp.isoDate || new Date().toISOString().split('T')[0];
  document.getElementById('edit-expense-category').value = exp.category || 'KAFE';
  document.getElementById('edit-expense-desc').value = exp.desc || '';
  document.getElementById('edit-expense-amount').value = exp.amount || 0;

  const isKaryawan = exp.fundSource === 'KARYAWAN';
  const kasirRadio = document.querySelector('input[name="edit-expense-fund"][value="KASIR"]');
  const karyawanRadio = document.querySelector('input[name="edit-expense-fund"][value="KARYAWAN"]');

  if (isKaryawan && karyawanRadio) {
    karyawanRadio.checked = true;
  } else if (kasirRadio) {
    kasirRadio.checked = true;
  }

  document.getElementById('edit-card-fund-kasir')?.classList.toggle('active', !isKaryawan);
  document.getElementById('edit-card-fund-karyawan')?.classList.toggle('active', isKaryawan);

  const empContainer = document.getElementById('edit-expense-employee-container');
  if (empContainer) empContainer.style.display = isKaryawan ? 'block' : 'none';

  document.getElementById('edit-expense-employee').value = exp.employeeName || '';
  document.getElementById('edit-expense-reimb-status').value = exp.reimbursementStatus || 'PENDING';

  modal.classList.add('show');
};

// Save Edit Expense
document.getElementById('btn-save-edit-expense').addEventListener('click', () => {
  if (!editingExpenseId) return;
  const exp = expenses.find(e => String(e.id) === String(editingExpenseId));
  if (!exp) return showToast('Catatan pengeluaran tidak ditemukan', 'error');

  const isoDate = document.getElementById('edit-expense-date').value;
  const category = document.getElementById('edit-expense-category').value;
  const desc = document.getElementById('edit-expense-desc').value.trim();
  const amount = parseInt(document.getElementById('edit-expense-amount').value, 10);

  if (!desc || isNaN(amount) || amount <= 0) {
    return showToast('Mohon isi keterangan dan nominal biaya dengan benar', 'error');
  }

  const fundRadio = document.querySelector('input[name="edit-expense-fund"]:checked');
  const fundSource = fundRadio ? fundRadio.value : 'KASIR';

  let employeeName = '';
  let reimbursementStatus = 'SETTLED';
  let reimbursedAt = exp.reimbursedAt;

  if (fundSource === 'KARYAWAN') {
    employeeName = document.getElementById('edit-expense-employee').value.trim();
    if (!employeeName) {
      return showToast('Mohon isi nama karyawan yang menalangi biaya ini', 'error');
    }
    reimbursementStatus = document.getElementById('edit-expense-reimb-status').value;
    if (reimbursementStatus === 'SETTLED' && !reimbursedAt) {
      reimbursedAt = new Date().toLocaleTimeString('id-ID') + ', ' + new Date().toLocaleDateString('id-ID');
    }
  }

  let formattedDate = isoDate;
  try {
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      formattedDate = `${parseInt(parts[2])}/${parseInt(parts[1])}/${parts[0]}`;
    }
  } catch (err) {}

  exp.desc = desc;
  exp.amount = amount;
  exp.category = category;
  exp.fundSource = fundSource;
  exp.employeeName = employeeName;
  exp.reimbursementStatus = reimbursementStatus;
  exp.reimbursedAt = reimbursedAt;
  exp.date = formattedDate;
  exp.isoDate = isoDate;

  saveExpenses();
  document.getElementById('modal-edit-expense')?.classList.remove('show');
  renderExpense();
  updateDashboardStats();
  renderReports();

  showToast('Catatan pengeluaran berhasil diperbarui', 'success');
  editingExpenseId = null;
});

// Delete Expense
window.deleteExpense = function(id) {
  if (!confirm('Hapus catatan pengeluaran ini? Laba bersih dan laporan omset akan diperbarui otomatis.')) {
    return;
  }

  expenses = expenses.filter(e => String(e.id) !== String(id));
  saveExpenses();

  document.getElementById('modal-edit-expense')?.classList.remove('show');
  renderExpense();
  updateDashboardStats();
  renderReports();

  showToast('Catatan pengeluaran telah dihapus', 'info');
  editingExpenseId = null;
};

document.getElementById('btn-delete-expense')?.addEventListener('click', () => {
  if (editingExpenseId) {
    deleteExpense(editingExpenseId);
  }
});

// Render Expense Grouped by Date
function renderExpense() {
  const container = document.getElementById('expense-grouped-container');
  if (!container) return;

  const nowIso = new Date().toISOString().split('T')[0];
  const currentMonthPrefix = nowIso.substring(0, 7); // YYYY-MM

  // Calculate Metrics
  let totalThisMonth = 0;
  let countThisMonth = 0;
  let totalToday = 0;
  let totalTodayKasir = 0;
  let totalKafe = 0;
  let totalCuci = 0;
  let pendingReimbCount = 0;
  let pendingReimbAmount = 0;

  expenses.forEach(e => {
    const amt = Number(e.amount) || 0;
    if (e.isoDate && e.isoDate.startsWith(currentMonthPrefix)) {
      totalThisMonth += amt;
      countThisMonth++;
    }
    if (e.isoDate === nowIso) {
      totalToday += amt;
      if (e.fundSource === 'KASIR' || e.reimbursementStatus === 'SETTLED') {
        totalTodayKasir += amt;
      }
    }
    if (e.category === 'KAFE') totalKafe += amt;
    if (e.category === 'CUCI') totalCuci += amt;

    if (e.fundSource === 'KARYAWAN' && e.reimbursementStatus === 'PENDING') {
      pendingReimbCount++;
      pendingReimbAmount += amt;
    }
  });

  // Update Summary DOM Cards
  const expMonthEl = document.getElementById('exp-stat-month');
  if (expMonthEl) expMonthEl.textContent = formatRp(totalThisMonth);

  const expMonthSubEl = document.getElementById('exp-stat-month-sub');
  if (expMonthSubEl) expMonthSubEl.textContent = `${countThisMonth} Biaya Bulan Ini`;

  const expTodayEl = document.getElementById('exp-stat-today');
  if (expTodayEl) expTodayEl.textContent = formatRp(totalToday);

  const expTodaySubEl = document.getElementById('exp-stat-today-sub');
  if (expTodaySubEl) expTodaySubEl.textContent = `Dari Kas Kasir: ${formatRp(totalTodayKasir)}`;

  const expSplitEl = document.getElementById('exp-stat-split');
  if (expSplitEl) expSplitEl.textContent = `${formatRp(totalKafe)} / ${formatRp(totalCuci)}`;

  const expReimbEl = document.getElementById('exp-stat-reimb-pending');
  if (expReimbEl) expReimbEl.textContent = formatRp(pendingReimbAmount);

  const expReimbCountEl = document.getElementById('exp-stat-reimb-count');
  if (expReimbCountEl) expReimbCountEl.textContent = `${pendingReimbCount} Menunggu Penggantian`;

  const reimbCardEl = document.getElementById('card-metric-reimb');
  if (reimbCardEl) {
    if (pendingReimbCount > 0) {
      reimbCardEl.style.background = '#FFFBEB';
      reimbCardEl.style.borderColor = '#FCD34D';
    } else {
      reimbCardEl.style.background = 'var(--surface)';
      reimbCardEl.style.borderColor = 'var(--border-color)';
    }
  }

  // Filter expenses
  let filtered = expenses.slice();
  if (currentExpenseFilter === 'KASIR') {
    filtered = filtered.filter(e => e.fundSource === 'KASIR');
  } else if (currentExpenseFilter === 'PENDING') {
    filtered = filtered.filter(e => e.fundSource === 'KARYAWAN' && e.reimbursementStatus === 'PENDING');
  } else if (currentExpenseFilter === 'SETTLED') {
    filtered = filtered.filter(e => e.fundSource === 'KARYAWAN' && e.reimbursementStatus === 'SETTLED');
  }

  // Sort descending by isoDate, then timestamp
  filtered.sort((a, b) => {
    if (a.isoDate !== b.isoDate) {
      return (b.isoDate || '').localeCompare(a.isoDate || '');
    }
    return (b.timestamp || 0) - (a.timestamp || 0);
  });

  if (filtered.length === 0) {
    let emptyMsg = 'Belum ada catatan pengeluaran operasional.';
    if (currentExpenseFilter === 'KASIR') emptyMsg = 'Belum ada pengeluaran dari kas kasir toko.';
    if (currentExpenseFilter === 'PENDING') emptyMsg = 'Tidak ada uang talangan karyawan yang menanti penggantian.';
    if (currentExpenseFilter === 'SETTLED') emptyMsg = 'Belum ada riwayat talangan karyawan yang telah lunas diganti.';

    container.innerHTML = `
      <div class="panel" style="text-align:center; padding: 48px 24px; color:var(--text-muted);">
        <div style="width:52px; height:52px; border-radius:50%; background:#F1F5F9; display:flex; align-items:center; justify-content:center; margin:0 auto 12px; color:var(--text-secondary);">
          <i data-lucide="wallet" style="width:24px;height:24px;"></i>
        </div>
        <h4 style="margin-bottom:6px; color:var(--text-main); font-size:15px;">${emptyMsg}</h4>
        <p style="font-size:12px; margin-bottom:16px;">Catat belanja bahan baku kopi, makanan, packaging, atau operasional kafe.</p>
        <button class="btn-primary-sm" onclick="openAddExpenseModal()" style="display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="plus" style="width:14px;height:14px;"></i> Catat Biaya Sekarang
        </button>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  // Group by isoDate
  const dateGroups = {};
  filtered.forEach(e => {
    const key = e.isoDate || 'Tanpa Tanggal';
    if (!dateGroups[key]) dateGroups[key] = [];
    dateGroups[key].push(e);
  });

  let html = '';
  Object.keys(dateGroups).forEach(dateKey => {
    const items = dateGroups[dateKey];
    const groupSubtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const kasirSubtotal = items.filter(i => i.fundSource === 'KASIR' || i.reimbursementStatus === 'SETTLED').reduce((sum, i) => sum + i.amount, 0);
    const pendingSubtotal = items.filter(i => i.fundSource === 'KARYAWAN' && i.reimbursementStatus === 'PENDING').reduce((sum, i) => sum + i.amount, 0);

    const friendlyDate = formatDateIndo(dateKey);
    const isToday = dateKey === nowIso;

    html += `
      <div class="expense-date-card">
        <div class="expense-date-header">
          <div class="expense-date-title">
            <span class="expense-date-badge" style="background:${isToday ? 'var(--primary)' : '#486581'};">
              ${isToday ? 'Hari Ini' : dateKey}
            </span>
            <div>
              <strong style="color:var(--text-main); font-size:14px;">${friendlyDate}</strong>
              <div class="expense-date-meta">${items.length} Catatan Biaya</div>
            </div>
          </div>
          <div class="expense-date-subtotal">
            <div class="expense-date-subtotal-val">${formatRp(groupSubtotal)}</div>
            <div class="expense-date-subtotal-sub">
              Kasir: ${formatRp(kasirSubtotal)} ${pendingSubtotal > 0 ? `• <span style="color:#D97706; font-weight:600;">Talangan: ${formatRp(pendingSubtotal)}</span>` : ''}
            </div>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table" style="margin:0;">
            <thead>
              <tr>
                <th style="width:110px;">Layanan</th>
                <th>Keterangan Biaya</th>
                <th>Sumber Dana & Status</th>
                <th style="text-align:right; width:130px;">Nominal</th>
                <th style="text-align:right; width:110px;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => {
                let categoryBadge = `<span class="category-tag KAFE">Minuman</span>`;
                if (item.category === 'CUCI' || item.category === 'MAKANAN') {
                  categoryBadge = `<span class="category-tag CUCI">Makanan</span>`;
                } else if (item.category === 'UMUM') {
                  categoryBadge = `<span class="category-tag" style="background:#E2E8F0; color:#334155;">Umum</span>`;
                }

                let fundHtml = '';
                if (item.fundSource === 'KASIR') {
                  fundHtml = `
                    <span class="fund-badge kasir" title="Dipungut dari uang laci kasir toko">
                      <i data-lucide="wallet" style="width:12px;height:12px;"></i> Kas Toko
                    </span>
                  `;
                } else if (item.fundSource === 'KARYAWAN') {
                  const empName = item.employeeName || 'Karyawan';
                  if (item.reimbursementStatus === 'PENDING') {
                    fundHtml = `
                      <div style="display:inline-flex; align-items:center; gap:6px; flex-wrap:wrap;">
                        <span class="fund-badge talangan-pending" title="Uang talangan karyawan menanti penggantian dari kasir">
                          <i data-lucide="clock" style="width:12px;height:12px;"></i> Talangan: ${empName} (Belum Diganti)
                        </span>
                        <button class="btn-reimb-action" onclick="confirmReimbursement('${item.id}')" title="Klik untuk mengonfirmasi bahwa kasir telah mengganti uang ini">
                          <i data-lucide="check-circle" style="width:12px;height:12px;"></i> Ganti Uang
                        </button>
                      </div>
                    `;
                  } else {
                    fundHtml = `
                      <span class="fund-badge talangan-settled" title="Telah lunas diganti oleh kasir pada ${item.reimbursedAt || 'hari ini'}">
                        <i data-lucide="check" style="width:12px;height:12px;"></i> Lunas (${empName})
                      </span>
                    `;
                  }
                }

                return `
                  <tr>
                    <td>${categoryBadge}</td>
                    <td>
                      <strong>${item.desc}</strong>
                      ${item.reimbursedAt ? `<div style="font-size:10px; color:var(--text-muted); margin-top:2px;">Diganti kasir: ${item.reimbursedAt}</div>` : ''}
                    </td>
                    <td>${fundHtml}</td>
                    <td style="text-align:right; font-weight:700; color:var(--danger); font-variant-numeric:tabular-nums; font-size:13px;">
                      ${formatRp(item.amount)}
                    </td>
                    <td style="text-align:right;">
                      <div style="display:flex; justify-content:flex-end; gap:6px;">
                        <button class="btn-outline" style="min-height:36px; min-width:36px; padding:6px 10px; font-size:12px;" onclick="openEditExpense('${item.id}')" title="Ubah catatan">
                          <i data-lucide="edit-3" style="width:14px;height:14px;"></i>
                        </button>
                        <button class="btn-outline danger" style="min-height:36px; min-width:36px; padding:6px 10px; font-size:12px;" onclick="deleteExpense('${item.id}')" title="Hapus catatan">
                          <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Mobile Reflow Cards (Auto active at <= 680px) -->
        <div class="expense-mobile-list" style="display:none; flex-direction:column; gap:10px; padding:12px;">
          ${items.map(item => {
            let catTag = `<span class="category-tag KAFE">Minuman</span>`;
            if (item.category === 'CUCI' || item.category === 'MAKANAN') catTag = `<span class="category-tag CUCI">Makanan</span>`;
            else if (item.category === 'UMUM') catTag = `<span class="category-tag" style="background:#E2E8F0; color:#334155;">Umum</span>`;

            let fundTag = '';
            if (item.fundSource === 'KASIR') {
              fundTag = `<span class="fund-badge kasir"><i data-lucide="wallet" style="width:12px;height:12px;"></i> Kas Toko</span>`;
            } else if (item.fundSource === 'KARYAWAN') {
              const empName = item.employeeName || 'Karyawan';
              if (item.reimbursementStatus === 'PENDING') {
                fundTag = `<span class="fund-badge talangan-pending"><i data-lucide="clock" style="width:12px;height:12px;"></i> Talangan: ${empName}</span>`;
              } else {
                fundTag = `<span class="fund-badge talangan-settled"><i data-lucide="check" style="width:12px;height:12px;"></i> Lunas (${empName})</span>`;
              }
            }

            return `
              <div class="expense-mobile-card">
                <div class="expense-mobile-top">
                  <span class="expense-mobile-desc">${item.desc}</span>
                  <span class="expense-mobile-amount">${formatRp(item.amount)}</span>
                </div>
                <div class="expense-mobile-meta">
                  ${catTag}
                  ${fundTag}
                </div>
                ${item.reimbursedAt ? `<div style="font-size:11px; color:var(--text-muted); margin-bottom:8px;">Diganti kasir: ${item.reimbursedAt}</div>` : ''}
                <div class="expense-mobile-actions">
                  ${item.fundSource === 'KARYAWAN' && item.reimbursementStatus === 'PENDING' ? `
                    <button class="btn-primary-sm btn-mobile-touch" onclick="confirmReimbursement('${item.id}')" style="flex:1;">
                      <i data-lucide="check-circle" style="width:15px;height:15px;"></i> Ganti Uang
                    </button>
                  ` : ''}
                  <button class="btn-outline btn-mobile-touch" onclick="openEditExpense('${item.id}')">
                    <i data-lucide="edit-3" style="width:14px;height:14px;"></i> Edit
                  </button>
                  <button class="btn-outline danger btn-mobile-touch" onclick="deleteExpense('${item.id}')">
                    <i data-lucide="trash-2" style="width:14px;height:14px;"></i> Hapus
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  lucide.createIcons();
}

// --------------------------------------------------
// Taxes & Charges Logic
// --------------------------------------------------
function renderTaxes() {
  const tbody = document.getElementById('table-taxes');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  if (taxes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center; padding:24px; color:var(--text-muted);">
          Belum ada pajak atau biaya layanan. Tambahkan dengan tombol "Tambah Pajak".
        </td>
      </tr>
    `;
    return;
  }

  taxes.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${t.name}</strong></td>
      <td>${t.pct}%</td>
      <td>
        <span class="status-badge ${t.active ? 'success' : 'danger'}">
          ${t.active ? 'Aktif' : 'Non-aktif'}
        </span>
      </td>
      <td style="text-align:right;">
        <div style="display:flex; justify-content:flex-end; align-items:center; gap:6px;">
          <button class="btn-outline" style="padding: 4px 8px; font-size:12px; min-height:34px;" onclick="toggleTax(${t.id})">
            ${t.active ? 'Nonaktifkan' : 'Aktifkan'}
          </button>
          <button class="btn-outline danger" style="padding: 4px 8px; font-size:12px; min-height:34px;" onclick="deleteTax(${t.id})" title="Hapus Pajak">
            <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  lucide.createIcons();
}

window.toggleTax = (id) => {
  const tax = taxes.find(t => String(t.id) === String(id));
  if (tax) {
    tax.active = !tax.active;
    saveTaxes();
    renderTaxes();
    updateCart();
    showToast(`Status ${tax.name} diperbarui`, 'info');
  }
};

window.deleteTax = (id) => {
  const tax = taxes.find(t => String(t.id) === String(id));
  if (!tax) return;

  if (!confirm(`Hapus tarif pajak/biaya "${tax.name}" (${tax.pct}%)?`)) {
    return;
  }

  taxes = taxes.filter(t => String(t.id) !== String(id));
  saveTaxes();
  renderTaxes();
  updateCart();
  showToast(`Pajak "${tax.name}" berhasil dihapus`, 'info');
};

document.getElementById('btn-save-tax').addEventListener('click', () => {
  const name = document.getElementById('input-tax-name').value.trim();
  const pct = parseFloat(document.getElementById('input-tax-pct').value);
  
  if (!name || isNaN(pct) || pct <= 0) {
    return showToast('Mohon isi nama dan persentase pajak', 'error');
  }
  
  taxes.push({
    id: Date.now(),
    name,
    pct,
    active: true
  });
  
  saveTaxes();
  document.getElementById('modal-add-tax').classList.remove('show');
  renderTaxes();
  updateCart();
  
  document.getElementById('input-tax-name').value = '';
  document.getElementById('input-tax-pct').value = '';
  showToast(`Pajak "${name}" berhasil ditambahkan`, 'success');
});

// --------------------------------------------------
// Manajemen Anggota & Kasir (User Management)
// --------------------------------------------------
window.userPinVisibilityState = {};

window.toggleUserPinVisibility = function(userId, pinValue) {
  const isVisible = !!window.userPinVisibilityState[userId];
  const nextVisible = !isVisible;
  window.userPinVisibilityState[userId] = nextVisible;
  
  const textEl = document.getElementById(`user-pin-text-${userId}`);
  const iconEl = document.getElementById(`user-pin-icon-${userId}`);
  
  if (textEl) {
    textEl.textContent = nextVisible ? (pinValue || '-') : '••••••';
    textEl.style.color = nextVisible ? 'var(--primary)' : 'var(--text-main)';
  }
  if (iconEl) {
    iconEl.setAttribute('data-lucide', nextVisible ? 'eye-off' : 'eye');
    lucide.createIcons();
  }
};

window.toggleEditCurrentPin = function() {
  const pinInput = document.getElementById('user-edit-current-pin');
  const icon = document.getElementById('icon-toggle-edit-pin');
  if (!pinInput) return;
  const isPass = pinInput.type === 'password';
  pinInput.type = isPass ? 'text' : 'password';
  if (icon) {
    icon.setAttribute('data-lucide', isPass ? 'eye-off' : 'eye');
    lucide.createIcons();
  }
};

function renderUsers() {
  const tbody = document.getElementById('table-users');
  if (!tbody) return;
  tbody.innerHTML = '';

  // Update Summary Metrics
  const totalEl = document.getElementById('user-stat-total');
  const cashiersEl = document.getElementById('user-stat-cashiers');
  const adminsEl = document.getElementById('user-stat-admins');

  const totalCount = users.length;
  const activeCashiers = users.filter(u => u.role === 'KASIR' && u.status === 'ACTIVE').length;
  const adminCount = users.filter(u => u.role === 'ADMIN').length;

  if (totalEl) totalEl.textContent = totalCount;
  if (cashiersEl) cashiersEl.textContent = activeCashiers;
  if (adminsEl) adminsEl.textContent = adminCount;

  if (users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:32px; color:var(--text-muted);">
          Belum ada anggota terdaftar. Tambahkan anggota baru di atas.
        </td>
      </tr>
    `;
    return;
  }

  users.forEach(u => {
    const initials = (u.name || 'U')
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const roleBadge = u.role === 'ADMIN'
      ? `<span class="role-badge admin"><i data-lucide="shield-check" style="width:12px;height:12px;"></i> Admin</span>`
      : `<span class="role-badge kasir"><i data-lucide="user" style="width:12px;height:12px;"></i> Kasir</span>`;

    const statusBadge = u.status === 'ACTIVE'
      ? `<span class="status-badge success">Aktif</span>`
      : `<span class="status-badge danger">Nonaktif</span>`;

    const isPrimaryAdmin = u.username === 'admin' || u.id === 'USR-1';
    const userPin = (u.pin !== undefined && u.pin !== null && u.pin !== '') ? u.pin : u.username;
    const isVisible = !!window.userPinVisibilityState[u.id];

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="user-avatar-badge">${initials}</div>
          <div>
            <strong style="color:var(--text-main); font-size:13px;">${u.name}</strong>
            <div style="font-size:11px; color:var(--text-muted);">${u.phone && u.phone !== '-' ? u.phone : 'Tanpa No. HP'}</div>
          </div>
        </div>
      </td>
      <td><code style="background:var(--bg-color); padding:2px 6px; border-radius:4px; font-size:12px;">@${u.username}</code></td>
      <td>
        <div style="display:inline-flex; align-items:center; gap:6px;">
          <span id="user-pin-text-${u.id}" class="user-pin-masked" style="font-family:monospace; font-weight:600; background:var(--bg-color); padding:3px 8px; border-radius:4px; font-size:12px; border:1px solid var(--border-color); color:${isVisible ? 'var(--primary)' : 'var(--text-main)'}; min-width:65px; text-align:center;">
            ${isVisible ? userPin : '••••••'}
          </span>
          <button type="button" class="btn-outline" style="min-height:28px; min-width:28px; padding:2px 6px; border-radius:4px;" onclick="toggleUserPinVisibility('${u.id}', '${userPin}')" title="Lihat / Sembunyikan Password">
            <i data-lucide="${isVisible ? 'eye-off' : 'eye'}" id="user-pin-icon-${u.id}" style="width:13px;height:13px;"></i>
          </button>
        </div>
      </td>
      <td>${roleBadge}</td>
      <td>${statusBadge}</td>
      <td style="font-size:12px; color:var(--text-secondary);">${u.createdAt || '-'}</td>
      <td style="text-align:right;">
        <div style="display:flex; justify-content:flex-end; gap:6px;">
          <button class="btn-outline" style="min-height:36px; min-width:36px; padding:6px 10px; font-size:12px;" onclick="openEditUserModal('${u.id}')" title="Edit Anggota & Lihat Password">
            <i data-lucide="edit-3" style="width:14px;height:14px;"></i>
          </button>
          ${!isPrimaryAdmin ? `
            <button class="btn-outline danger" style="min-height:36px; min-width:36px; padding:6px 10px; font-size:12px;" onclick="deleteUser('${u.id}')" title="Hapus Anggota">
              <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
            </button>
          ` : `
            <span style="font-size:11px; color:var(--text-muted); padding:4px 6px;">Utama</span>
          `}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  lucide.createIcons();
}

window.openAddUserModal = function() {
  document.getElementById('form-add-user')?.reset();
  document.getElementById('modal-add-user')?.classList.add('show');
};

window.closeAddUserModal = function() {
  document.getElementById('modal-add-user')?.classList.remove('show');
};

window.saveNewUser = function() {
  const name = document.getElementById('user-add-name')?.value.trim();
  const username = document.getElementById('user-add-username')?.value.trim().toLowerCase();
  const pin = document.getElementById('user-add-pin')?.value.trim();
  const role = document.getElementById('user-add-role')?.value || 'KASIR';
  const phone = document.getElementById('user-add-phone')?.value.trim();
  const status = document.getElementById('user-add-status')?.value || 'ACTIVE';

  if (!name || !username || !pin) {
    showToast('Mohon lengkapi Nama, Username, dan Password / PIN', 'error');
    return;
  }

  // Check unique username
  const exists = users.some(u => u.username && u.username.toLowerCase() === username);
  if (exists) {
    showToast(`Username "${username}" sudah digunakan anggota lain!`, 'error');
    return;
  }

  const newUser = {
    id: 'USR-' + Date.now().toString().slice(-4),
    name,
    username,
    pin,
    role,
    phone: phone || '-',
    status,
    createdAt: new Date().toLocaleDateString('id-ID')
  };

  users.push(newUser);
  saveUsers();
  renderUsers();
  closeAddUserModal();
  showToast(`Anggota baru "${newUser.name}" (${newUser.role}) berhasil didaftarkan`, 'success');
};

document.getElementById('form-add-user')?.addEventListener('submit', (e) => {
  e.preventDefault();
  window.saveNewUser();
});

document.getElementById('btn-save-new-user')?.addEventListener('click', (e) => {
  e.preventDefault();
  window.saveNewUser();
});

window.openEditUserModal = function(userId) {
  const u = users.find(user => user.id === userId);
  if (!u) return;

  document.getElementById('user-edit-id').value = u.id;
  document.getElementById('user-edit-name').value = u.name;
  document.getElementById('user-edit-username').value = u.username;
  document.getElementById('user-edit-pin').value = '';
  document.getElementById('user-edit-role').value = u.role;
  document.getElementById('user-edit-phone').value = u.phone === '-' ? '' : (u.phone || '');
  document.getElementById('user-edit-status').value = u.status;

  const currentPinEl = document.getElementById('user-edit-current-pin');
  if (currentPinEl) {
    currentPinEl.value = (u.pin !== undefined && u.pin !== null && u.pin !== '') ? u.pin : u.username;
    currentPinEl.type = 'password';
  }
  const icon = document.getElementById('icon-toggle-edit-pin');
  if (icon) {
    icon.setAttribute('data-lucide', 'eye');
    lucide.createIcons();
  }

  const roleSelect = document.getElementById('user-edit-role');
  const isPrimary = u.username === 'admin' || u.id === 'USR-1';
  if (isPrimary && roleSelect) {
    roleSelect.disabled = true;
  } else if (roleSelect) {
    roleSelect.disabled = false;
  }

  document.getElementById('modal-edit-user')?.classList.add('show');
};

window.closeEditUserModal = function() {
  document.getElementById('modal-edit-user')?.classList.remove('show');
};

window.saveEditUser = function() {
  const id = document.getElementById('user-edit-id')?.value;
  const name = document.getElementById('user-edit-name')?.value.trim();
  const pin = document.getElementById('user-edit-pin')?.value.trim();
  const role = document.getElementById('user-edit-role')?.value || 'KASIR';
  const phone = document.getElementById('user-edit-phone')?.value.trim();
  const status = document.getElementById('user-edit-status')?.value || 'ACTIVE';

  if (!name) {
    showToast('Nama anggota tidak boleh kosong', 'error');
    return;
  }

  const userIdx = users.findIndex(u => u.id === id);
  if (userIdx === -1) return;

  const user = users[userIdx];
  user.name = name;
  if (pin) user.pin = pin;
  
  if (user.username !== 'admin' && user.id !== 'USR-1') {
    user.role = role;
    user.status = status;
  }
  user.phone = phone || '-';

  saveUsers();
  renderUsers();
  closeEditUserModal();

  if (currentUser && currentUser.id === user.id) {
    applyUserSession(user);
  }

  showToast(`Data anggota "${user.name}" berhasil diperbarui`, 'success');
};

document.getElementById('form-edit-user')?.addEventListener('submit', (e) => {
  e.preventDefault();
  window.saveEditUser();
});

document.getElementById('btn-save-edit-user')?.addEventListener('click', (e) => {
  e.preventDefault();
  window.saveEditUser();
});

window.deleteUser = function(userId) {
  const u = users.find(user => user.id === userId);
  if (!u) return;

  if (u.username === 'admin' || u.id === 'USR-1') {
    showToast('Akun Admin Utama tidak boleh dihapus!', 'error');
    return;
  }

  if (currentUser && (currentUser.id === u.id || currentUser.username === u.username)) {
    showToast('Anda tidak dapat menghapus akun yang sedang Anda gunakan!', 'error');
    return;
  }

  if (!confirm(`Hapus anggota "${u.name}" (@${u.username}) dari sistem?`)) {
    return;
  }

  users = users.filter(user => user.id !== userId);
  saveUsers();
  renderUsers();
  showToast(`Anggota "${u.name}" berhasil dihapus`, 'info');
};

// --------------------------------------------------
// Reports Generation
// --------------------------------------------------
function renderReports() {
  const thead = document.getElementById('thead-reports');
  const tbody = document.getElementById('table-reports');
  if (!tbody || !thead) return;
  tbody.innerHTML = '';

  let totalKafe = 0;
  let totalCuci = 0;
  let totalOmset = 0;
  let kafeTrxCount = 0;
  let cuciTrxCount = 0;
  let kafeItemsSold = 0;
  let cuciUnitsDone = 0;

  const topKafeMap = {};
  const topCuciMap = {};

  history.forEach(trx => {
    totalOmset += trx.total;
    const s = getTrxServices(trx);
    if (s.hasKafe) {
      totalKafe += s.kafeTotal;
      kafeTrxCount++;
      kafeItemsSold += s.kafeQty;
    }
    if (s.hasCuci) {
      totalCuci += s.cuciTotal;
      cuciTrxCount++;
      cuciUnitsDone += s.cuciQty;
    }

    if (trx.items) {
      trx.items.forEach(item => {
        if (item.category === 'KAFE') {
          topKafeMap[item.name] = (topKafeMap[item.name] || 0) + item.qty;
        } else if (item.category === 'CUCI') {
          topCuciMap[item.name] = (topCuciMap[item.name] || 0) + item.qty;
        }
      });
    }
  });

  // Calculate Expenses per category
  let totalKafeExpense = 0;
  let totalCuciExpense = 0;
  let totalGeneralExpense = 0;

  expenses.forEach(exp => {
    const amt = Number(exp.amount) || 0;
    if (exp.category === 'KAFE') totalKafeExpense += amt;
    else if (exp.category === 'CUCI') totalCuciExpense += amt;
    else totalGeneralExpense += amt;
  });

  const totalExpenseAll = totalKafeExpense + totalCuciExpense + totalGeneralExpense;
  const netProfitAll = totalOmset - totalExpenseAll;
  const netKafe = totalKafe - totalKafeExpense;
  const netCuci = totalCuci - totalCuciExpense;

  // Update Summary Metrics on top of Reports page
  const repAllOmsetEl = document.getElementById('rep-stat-all-omset');
  if (repAllOmsetEl) repAllOmsetEl.textContent = formatRp(totalOmset);
  const repAllCountEl = document.getElementById('rep-stat-all-count');
  if (repAllCountEl) repAllCountEl.textContent = `${history.length} Transaksi`;

  const repExpenseEl = document.getElementById('rep-stat-expense');
  if (repExpenseEl) repExpenseEl.textContent = formatRp(totalExpenseAll);
  const repExpenseCountEl = document.getElementById('rep-stat-expense-count');
  if (repExpenseCountEl) repExpenseCountEl.textContent = `${expenses.length} Catatan Biaya`;

  const repNetProfitEl = document.getElementById('rep-stat-net-profit');
  if (repNetProfitEl) {
    repNetProfitEl.textContent = formatRp(netProfitAll);
    repNetProfitEl.style.color = netProfitAll >= 0 ? 'var(--success)' : 'var(--danger)';
  }
  const repMarginEl = document.getElementById('rep-stat-margin');
  if (repMarginEl) {
    const marginPct = totalOmset > 0 ? Math.round((netProfitAll / totalOmset) * 100) : 0;
    repMarginEl.textContent = `Margin Laba Bersih: ${marginPct}%`;
  }

  const repSplitOmsetEl = document.getElementById('rep-stat-split-omset');
  if (repSplitOmsetEl) repSplitOmsetEl.textContent = `${formatRp(totalKafe)} / ${formatRp(totalCuci)}`;
  const repSplitCountEl = document.getElementById('rep-stat-split-count');
  if (repSplitCountEl) repSplitCountEl.textContent = `${kafeTrxCount} Trx Minuman | ${cuciTrxCount} Trx Makanan`;

  const today = new Date().toLocaleDateString('id-ID');

  // Render Table Head & Body based on currentReportFilter
  if (currentReportFilter === 'KAFE') {
    thead.innerHTML = `
      <tr>
        <th>Periode</th>
        <th>Jml Transaksi Minuman</th>
        <th>Total Cup / Minuman Terjual</th>
        <th>Total Omset Minuman</th>
        <th>Biaya Bahan Baku Minuman</th>
        <th>Estimasi Laba Minuman</th>
      </tr>
    `;
    tbody.innerHTML = `
      <tr>
        <td><strong>Hari Ini (${today})</strong></td>
        <td><span class="category-tag KAFE">Minuman</span> ${kafeTrxCount} Transaksi</td>
        <td><strong>${kafeItemsSold} item/cup</strong></td>
        <td style="color:var(--text-main); font-weight:700;">${formatRp(totalKafe)}</td>
        <td style="color:var(--danger); font-weight:600;">-${formatRp(totalKafeExpense)}</td>
        <td style="color:${netKafe >= 0 ? 'var(--success)' : 'var(--danger)'}; font-size:15px; font-weight:700;">
          <strong>${formatRp(netKafe)}</strong>
        </td>
      </tr>
    `;
  } else if (currentReportFilter === 'CUCI') {
    thead.innerHTML = `
      <tr>
        <th>Periode</th>
        <th>Jml Transaksi Makanan</th>
        <th>Total Porsi / Item Terjual</th>
        <th>Total Omset Makanan</th>
        <th>Biaya Bahan Baku Makanan</th>
        <th>Estimasi Laba Makanan</th>
      </tr>
    `;
    tbody.innerHTML = `
      <tr>
        <td><strong>Hari Ini (${today})</strong></td>
        <td><span class="category-tag CUCI">Makanan</span> ${cuciTrxCount} Transaksi</td>
        <td><strong>${cuciUnitsDone} Porsi/Item</strong></td>
        <td style="color:var(--text-main); font-weight:700;">${formatRp(totalCuci)}</td>
        <td style="color:var(--danger); font-weight:600;">-${formatRp(totalCuciExpense)}</td>
        <td style="color:${netCuci >= 0 ? 'var(--success)' : 'var(--danger)'}; font-size:15px; font-weight:700;">
          <strong>${formatRp(netCuci)}</strong>
        </td>
      </tr>
    `;
  } else {
    // ALL (Rekap Gabungan)
    thead.innerHTML = `
      <tr>
        <th>Periode</th>
        <th>Total Transaksi</th>
        <th>Porsi Minuman</th>
        <th>Porsi Makanan</th>
        <th>Total Omset (Kotor)</th>
        <th>Total Biaya Operasional</th>
        <th>Estimasi Laba Bersih</th>
      </tr>
    `;
    tbody.innerHTML = `
      <tr>
        <td><strong>Hari Ini (${today})</strong></td>
        <td>${history.length} Transaksi</td>
        <td><span class="category-tag KAFE">Minuman</span> <strong>${formatRp(totalKafe)}</strong></td>
        <td><span class="category-tag CUCI">Makanan</span> <strong>${formatRp(totalCuci)}</strong></td>
        <td style="font-weight:700; color:var(--text-main);">${formatRp(totalOmset)}</td>
        <td style="color:var(--danger); font-weight:600;">-${formatRp(totalExpenseAll)}</td>
        <td style="color:${netProfitAll >= 0 ? 'var(--success)' : 'var(--danger)'}; font-size:16px; font-weight:700;">
          <strong>${formatRp(netProfitAll)}</strong>
        </td>
      </tr>
    `;
  }
}

// --------------------------------------------------
// Dashboard Modern Logic & Visual Charts (UI/UX Pro Max)
// --------------------------------------------------
let salesTrendChartInstance = null;
let revenueDonutChartInstance = null;
let selectedTrendPeriod = '7days';

function renderSalesTrendChart(period = '7days') {
  const canvas = document.getElementById('chart-sales-trend');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const now = new Date();
  let labels = [];
  let kafeData = [];
  let cuciData = [];

  const subtitleEl = document.getElementById('sales-trend-subtitle');

  if (period === 'today') {
    if (subtitleEl) subtitleEl.textContent = 'Performa penjualan minuman & makanan sepanjang hari ini';
    const hours = [8, 10, 12, 14, 16, 18, 20, 22];
    labels = hours.map(h => `${String(h).padStart(2, '0')}:00`);
    kafeData = new Array(hours.length).fill(0);
    cuciData = new Array(hours.length).fill(0);

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 86400000;

    history.forEach(trx => {
      const d = getTrxDateObj(trx);
      const t = d.getTime();
      if (t >= todayStart && t < todayEnd) {
        const h = d.getHours();
        let closestIdx = 0;
        let minDiff = 999;
        hours.forEach((targetH, idx) => {
          const diff = Math.abs(h - targetH);
          if (diff < minDiff) {
            minDiff = diff;
            closestIdx = idx;
          }
        });
        if (trx.items && trx.items.length > 0) {
          trx.items.forEach(it => {
            const cat = (it.category || '').toUpperCase();
            if (cat === 'MAKANAN' || cat === 'SNACK' || cat === 'CUCI' || cat === 'FOOD') {
              cuciData[closestIdx] += (it.price * it.qty);
            } else {
              kafeData[closestIdx] += (it.price * it.qty);
            }
          });
        }
      }
    });
  } else if (period === 'month') {
    if (subtitleEl) subtitleEl.textContent = 'Perbandingan penjualan 4 minggu bulan ini';
    labels = ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'];
    kafeData = [0, 0, 0, 0];
    cuciData = [0, 0, 0, 0];
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    history.forEach(trx => {
      const d = getTrxDateObj(trx);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const weekIdx = Math.min(3, Math.floor((d.getDate() - 1) / 7));
        if (trx.items && trx.items.length > 0) {
          trx.items.forEach(it => {
            const cat = (it.category || '').toUpperCase();
            if (cat === 'MAKANAN' || cat === 'SNACK' || cat === 'CUCI' || cat === 'FOOD') {
              cuciData[weekIdx] += (it.price * it.qty);
            } else {
              kafeData[weekIdx] += (it.price * it.qty);
            }
          });
        }
      }
    });
  } else {
    // 7 Hari (Default)
    if (subtitleEl) subtitleEl.textContent = 'Tren omzet minuman & makanan dalam 7 hari terakhir';
    const dayBuckets = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dayBuckets.push({ label: dayStr, ymd, dateObj: d, kafe: 0, cuci: 0 });
    }

    history.forEach(trx => {
      const d = getTrxDateObj(trx);
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const bucket = dayBuckets.find(b => b.ymd === ymd);
      if (bucket && trx.items && trx.items.length > 0) {
        trx.items.forEach(it => {
          const cat = (it.category || '').toUpperCase();
          if (cat === 'MAKANAN' || cat === 'SNACK' || cat === 'CUCI' || cat === 'FOOD') {
            bucket.cuci += (it.price * it.qty);
          } else {
            bucket.kafe += (it.price * it.qty);
          }
        });
      }
    });

    labels = dayBuckets.map(b => b.label);
    kafeData = dayBuckets.map(b => b.kafe);
    cuciData = dayBuckets.map(b => b.cuci);
  }

  if (salesTrendChartInstance) {
    salesTrendChartInstance.destroy();
  }

  const gradKafe = ctx.createLinearGradient(0, 0, 0, 220);
  gradKafe.addColorStop(0, 'rgba(75, 21, 30, 0.25)');
  gradKafe.addColorStop(1, 'rgba(75, 21, 30, 0.00)');

  const gradCuci = ctx.createLinearGradient(0, 0, 0, 220);
  gradCuci.addColorStop(0, 'rgba(184, 93, 54, 0.22)');
  gradCuci.addColorStop(1, 'rgba(184, 93, 54, 0.00)');

  salesTrendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Minuman',
          data: kafeData,
          borderColor: '#4B151E',
          backgroundColor: gradKafe,
          borderWidth: 2.2,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#4B151E',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Makanan',
          data: cuciData,
          borderColor: '#B85D36',
          backgroundColor: gradCuci,
          borderWidth: 2.2,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#B85D36',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0F172A',
          titleFont: { family: 'DM Sans', size: 12, weight: '600' },
          bodyFont: { family: 'DM Sans', size: 12 },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (item) => ` ${item.dataset.label}: ${formatRp(item.raw)}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: 'DM Sans', size: 11 },
            color: '#64748B'
          }
        },
        y: {
          beginAtZero: true,
          suggestedMax: 200000,
          grid: {
            color: 'rgba(226, 232, 240, 0.7)'
          },
          ticks: {
            font: { family: 'DM Sans', size: 11 },
            color: '#64748B',
            stepSize: 50000,
            precision: 0,
            callback: (val) => formatRp(val)
          }
        }
      }
    }
  });
}

function renderRevenueDonutChart(totalKafe, totalCuci) {
  const canvas = document.getElementById('chart-revenue-donut');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (revenueDonutChartInstance) {
    revenueDonutChartInstance.destroy();
  }

  const isZero = (totalKafe === 0 && totalCuci === 0);
  const chartData = isZero ? [50, 50] : [totalKafe, totalCuci];
  const chartColors = isZero ? ['#EAE2D8', '#DDD2C5'] : ['#4B151E', '#B85D36'];

  revenueDonutChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Minuman', 'Makanan'],
      datasets: [{
        data: chartData,
        backgroundColor: chartColors,
        borderWidth: 0,
        hoverOffset: isZero ? 0 : 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: !isZero,
          callbacks: {
            label: (item) => ` ${item.label}: ${formatRp(item.raw)}`
          }
        }
      }
    }
  });
}

function updateDashboardStats() {
  let totalKafe = 0;
  let totalCuci = 0;
  let totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  const productCountMap = {};
  products.forEach(p => productCountMap[p.name] = { name: p.name, category: p.category || 'KAFE', qty: 0, totalSales: 0 });
  
  history.forEach(trx => {
    if (trx.items && trx.items.length > 0) {
      trx.items.forEach(item => {
        const itemSales = (item.price * item.qty);
        const cat = (item.category || '').toUpperCase();
        if (cat === 'MAKANAN' || cat === 'SNACK' || cat === 'CUCI' || cat === 'FOOD') {
          totalCuci += itemSales; // Makanan
        } else {
          totalKafe += itemSales; // Minuman
        }
        if (productCountMap[item.name]) {
          productCountMap[item.name].qty += item.qty;
          productCountMap[item.name].totalSales += itemSales;
        } else {
          productCountMap[item.name] = { 
            name: item.name, 
            category: item.category || 'KOPI', 
            qty: item.qty,
            totalSales: itemSales 
          };
        }
      });
    }
  });
  
  const totalOmset = totalKafe + totalCuci;
  const netProfit = totalOmset - totalExpense;
  
  // Percentages
  const kafePct = totalOmset > 0 ? Math.round((totalKafe / totalOmset) * 100) : 0;
  const cuciPct = totalOmset > 0 ? Math.round((totalCuci / totalOmset) * 100) : 0;
  const expPct = totalOmset > 0 ? Math.round((totalExpense / totalOmset) * 100) : 0;

  // Header Sub-stats
  const dashNetEl = document.getElementById('dash-net-profit');
  if (dashNetEl) {
    dashNetEl.textContent = formatRp(netProfit);
    dashNetEl.style.color = netProfit >= 0 ? 'var(--success)' : 'var(--danger)';
  }
  const dashTrxCountEl = document.getElementById('dash-trx-count');
  if (dashTrxCountEl) dashTrxCountEl.textContent = `${history.length} Transaksi`;

  // Hero Card Total Omzet
  const dashLabaEl = document.getElementById('dash-laba');
  if (dashLabaEl) dashLabaEl.textContent = formatRp(totalOmset);
  const dashOmzetTrend = document.getElementById('dash-omzet-trend');
  if (dashOmzetTrend) dashOmzetTrend.textContent = totalOmset > 0 ? '+100%' : '~ 0%';

  // KPI 2: Kafe
  const dashKafeEl = document.getElementById('dash-kafe');
  if (dashKafeEl) dashKafeEl.textContent = formatRp(totalKafe);
  const dashKafePctEl = document.getElementById('dash-kafe-pct');
  if (dashKafePctEl) dashKafePctEl.textContent = `${kafePct}% dari total omzet`;
  const dashKafeTrend = document.getElementById('dash-kafe-trend');
  if (dashKafeTrend) dashKafeTrend.textContent = `${kafePct}%`;

  // KPI 3: Pendapatan Makanan & Snack
  const dashCuciEl = document.getElementById('dash-cuci');
  if (dashCuciEl) dashCuciEl.textContent = formatRp(totalCuci);
  const dashCuciPctEl = document.getElementById('dash-cuci-pct');
  if (dashCuciPctEl) dashCuciPctEl.textContent = `${cuciPct}% dari total omzet`;
  const dashCuciTrend = document.getElementById('dash-cuci-trend');
  if (dashCuciTrend) dashCuciTrend.textContent = `~ ${cuciPct}%`;

  // KPI 4: Biaya Operasional
  const dashPengeluaranEl = document.getElementById('dash-pengeluaran');
  if (dashPengeluaranEl) dashPengeluaranEl.textContent = formatRp(totalExpense);
  const dashExpensePctEl = document.getElementById('dash-expense-pct');
  if (dashExpensePctEl) dashExpensePctEl.textContent = `${expPct}% dari total omzet`;
  const dashExpenseTrend = document.getElementById('dash-expense-trend');
  if (dashExpenseTrend) dashExpenseTrend.textContent = `- ${expPct}%`;

  // Donut Center Info & Legend List
  const donutCenterVal = document.getElementById('donut-center-val');
  if (donutCenterVal) donutCenterVal.textContent = formatRp(totalOmset);

  const donutKafePct = document.getElementById('donut-kafe-pct');
  if (donutKafePct) donutKafePct.textContent = `${kafePct}%`;
  const donutKafeVal = document.getElementById('donut-kafe-val');
  if (donutKafeVal) donutKafeVal.textContent = formatRp(totalKafe);

  const donutCuciPct = document.getElementById('donut-cuci-pct');
  if (donutCuciPct) donutCuciPct.textContent = `${cuciPct}%`;
  const donutCuciVal = document.getElementById('donut-cuci-val');
  if (donutCuciVal) donutCuciVal.textContent = formatRp(totalCuci);

  // Render Visual Charts
  renderSalesTrendChart(selectedTrendPeriod);
  renderRevenueDonutChart(totalKafe, totalCuci);

  // Render Top Products Table
  const tableTopProducts = document.getElementById('table-top-products');
  const emptyTopProducts = document.getElementById('empty-top-products');
  const tbodyTopProducts = document.getElementById('dash-top-products-body');

  const topProductsList = Object.values(productCountMap)
    .filter(p => p.qty > 0)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  if (topProductsList.length === 0) {
    if (tableTopProducts) tableTopProducts.style.display = 'none';
    if (emptyTopProducts) emptyTopProducts.classList.remove('hidden');
  } else {
    if (tableTopProducts) tableTopProducts.style.display = 'table';
    if (emptyTopProducts) emptyTopProducts.classList.add('hidden');
    if (tbodyTopProducts) {
      tbodyTopProducts.innerHTML = topProductsList.map((p, idx) => {
        let badgeClass = '';
        if (idx === 0) badgeClass = 'dash-badge-top1';
        else if (idx === 1) badgeClass = 'dash-badge-top2';
        else if (idx === 2) badgeClass = 'dash-badge-top3';
        const catClass = p.category === 'CUCI' ? 'CUCI' : 'KAFE';
        const catLabel = p.category === 'CUCI' ? 'Makanan' : 'Minuman';
        return `
          <tr>
            <td style="text-align:center;"><span class="dash-rank-badge ${badgeClass}">${idx + 1}</span></td>
            <td><strong>${p.name}</strong></td>
            <td><span class="dash-cat-pill ${catClass}">${catLabel}</span></td>
            <td style="text-align:center; font-weight:600;">${p.qty}x</td>
            <td style="text-align:right; font-weight:700;">${formatRp(p.totalSales)}</td>
          </tr>
        `;
      }).join('');
    }
  }

  // Render Recent Transactions Table
  const tableRecentTrx = document.getElementById('table-recent-trx');
  const emptyRecentTrx = document.getElementById('empty-recent-trx');
  const tbodyRecentTrx = document.getElementById('dash-recent-trx-body');

  const recents = history.slice(0, 5);
  if (recents.length === 0) {
    if (tableRecentTrx) tableRecentTrx.style.display = 'none';
    if (emptyRecentTrx) emptyRecentTrx.classList.remove('hidden');
  } else {
    if (tableRecentTrx) tableRecentTrx.style.display = 'table';
    if (emptyRecentTrx) emptyRecentTrx.classList.add('hidden');
    if (tbodyRecentTrx) {
      tbodyRecentTrx.innerHTML = recents.map((trx, idx) => {
        let serviceType = 'KAFE';
        let serviceName = 'Minuman';
        if (trx.items && trx.items.some(i => i.category === 'CUCI')) {
          if (trx.items.some(i => i.category === 'KAFE')) {
            serviceType = 'KAFE';
            serviceName = 'Minuman + Makanan';
          } else {
            serviceType = 'CUCI';
            serviceName = 'Makanan';
          }
        }
        return `
          <tr>
            <td style="text-align:center;"><span class="dash-rank-badge">${idx + 1}</span></td>
            <td>${trx.time || '-'}</td>
            <td><span class="dash-cat-pill ${serviceType}">${serviceName}</span></td>
            <td style="text-align:right; font-weight:700;">${formatRp(trx.total)}</td>
            <td>${trx.cashier || 'Admin'}</td>
            <td style="text-align:center;"><span class="dash-status-pill">Selesai</span></td>
          </tr>
        `;
      }).join('');
    }
  }

  // Footer Update Info
  const lastUpdatedEl = document.getElementById('dash-last-updated');
  if (lastUpdatedEl) {
    const now = new Date();
    const day = now.getDate();
    const mths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    lastUpdatedEl.textContent = `${day} ${mths[now.getMonth()]} ${now.getFullYear()}, ${timeStr}`;
  }

  lucide.createIcons();
}

// Event Listeners for Dashboard Controls
document.querySelectorAll('#trend-period-filters .filter-pill').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('#trend-period-filters .filter-pill').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    selectedTrendPeriod = e.currentTarget.dataset.period || '7days';
    if (selectedTrendPeriod === 'custom') {
      showToast('Pilih filter periode: 7 Hari / Hari Ini / Bulan Ini.', 'info');
      selectedTrendPeriod = '7days';
    }
    renderSalesTrendChart(selectedTrendPeriod);
  });
});

const btnSyncDash = document.getElementById('btn-sync-dashboard');
if (btnSyncDash) {
  btnSyncDash.addEventListener('click', () => {
    const icon = btnSyncDash.querySelector('i, svg');
    if (icon) icon.style.transform = 'rotate(360deg)';
    updateDashboardStats();
    showToast('Data dashboard telah diperbarui.', 'success');
    setTimeout(() => { if (icon) icon.style.transform = ''; }, 600);
  });
}

const btnSeeAllProducts = document.getElementById('btn-see-all-products');
if (btnSeeAllProducts) {
  btnSeeAllProducts.addEventListener('click', () => {
    const navBtn = document.querySelector('.nav-item[data-target="reports"]') || document.querySelector('.nav-item[data-target="menu-manage"]');
    if (navBtn) navBtn.click();
  });
}

const btnSeeAllTrx = document.getElementById('btn-see-all-trx');
if (btnSeeAllTrx) {
  btnSeeAllTrx.addEventListener('click', () => {
    const navBtn = document.querySelector('.nav-item[data-target="history"]');
    if (navBtn) navBtn.click();
  });
}

const btnDashTheme = document.getElementById('btn-dash-theme-toggle');
if (btnDashTheme) {
  btnDashTheme.addEventListener('click', () => {
    showToast('Mode tema otomatis disesuaikan dengan sistem operasi.', 'info');
  });
}

const btnDashNotif = document.getElementById('btn-notifications');
if (btnDashNotif) {
  btnDashNotif.addEventListener('click', () => {
    showToast('Semua sistem dan sinkronisasi cloud berjalan normal.', 'success');
  });
}

const dashDatePickerBtn = document.getElementById('dash-date-picker-btn');
if (dashDatePickerBtn) {
  dashDatePickerBtn.addEventListener('click', () => {
    showToast(`Tanggal aktif: ${todayStr}`, 'info');
  });
}

// --------------------------------------------------
// Keyboard Shortcuts & Escape Handler (antislop-human)
// --------------------------------------------------
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
    if (drawerMenu) drawerMenu.classList.remove('show');
  }
  if (e.key === '/' && document.activeElement !== searchInput) {
    e.preventDefault();
    if (document.getElementById('pos').classList.contains('active')) {
      searchInput.focus();
    }
  }
});

// --------------------------------------------------
// Export & Print Report Modal Logic
// --------------------------------------------------
let exportSelectedService = 'ALL';
let exportSelectedPeriod = 'today';
let exportSelectedFormat = 'PDF';

function getTrxDateObj(trx) {
  if (trx.timestamp) return new Date(trx.timestamp);
  if (trx.isoDate) return new Date(trx.isoDate + 'T00:00:00');
  if (trx.date) {
    const parts = trx.date.split('/');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }
  }
  return new Date();
}

function filterTransactionsForExport(service, period, customStart, customEnd) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 86400000 - 1;

  return history.filter(trx => {
    // 1. Service filter
    const s = getTrxServices(trx);
    if (service === 'KAFE' && !s.hasKafe) return false;
    if (service === 'CUCI' && !s.hasCuci) return false;

    // 2. Period filter
    const trxDate = getTrxDateObj(trx);
    const trxTime = trxDate.getTime();

    if (period === 'today') {
      return trxTime >= startOfToday && trxTime <= endOfToday;
    } else if (period === 'yesterday') {
      const startOfYesterday = startOfToday - 86400000;
      const endOfYesterday = startOfToday - 1;
      return trxTime >= startOfYesterday && trxTime <= endOfYesterday;
    } else if (period === 'week') {
      const sevenDaysAgo = startOfToday - (6 * 86400000);
      return trxTime >= sevenDaysAgo && trxTime <= endOfToday;
    } else if (period === 'month') {
      return trxDate.getFullYear() === now.getFullYear() && trxDate.getMonth() === now.getMonth();
    } else if (period === 'custom') {
      if (customStart) {
        const [sy, sm, sd] = customStart.split('-').map(Number);
        const startTime = new Date(sy, sm - 1, sd, 0, 0, 0).getTime();
        if (trxTime < startTime) return false;
      }
      if (customEnd) {
        const [ey, em, ed] = customEnd.split('-').map(Number);
        const endTime = new Date(ey, em - 1, ed, 23, 59, 59).getTime();
        if (trxTime > endTime) return false;
      }
      return true;
    }
    // 'all'
    return true;
  });
}

function getPeriodLabel(period, customStart, customEnd) {
  const now = new Date();
  const todayStr = now.toLocaleDateString('id-ID');
  if (period === 'today') return `Hari Ini (${todayStr})`;
  if (period === 'yesterday') {
    const yest = new Date(now.getTime() - 86400000).toLocaleDateString('id-ID');
    return `Kemarin (${yest})`;
  }
  if (period === 'week') return '7 Hari Terakhir';
  if (period === 'month') {
    return now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }
  if (period === 'custom') {
    return `${customStart || 'Awal'} s/d ${customEnd || 'Sekarang'}`;
  }
  return 'Semua Riwayat';
}

function getServiceLabel(service) {
  if (service === 'KAFE') return 'Minuman & Kopi';
  if (service === 'CUCI') return 'Makanan & Snack';
  return 'Semua Menu (F&B)';
}

function updateExportModalPreview() {
  const customStart = document.getElementById('export-date-start')?.value || '';
  const customEnd = document.getElementById('export-date-end')?.value || '';
  const matching = filterTransactionsForExport(exportSelectedService, exportSelectedPeriod, customStart, customEnd);
  
  let totalFiltered = 0;
  matching.forEach(trx => {
    const s = getTrxServices(trx);
    if (exportSelectedService === 'KAFE') {
      totalFiltered += s.kafeTotal;
    } else if (exportSelectedService === 'CUCI') {
      totalFiltered += s.cuciTotal;
    } else {
      totalFiltered += trx.total;
    }
  });

  const countEl = document.getElementById('export-matched-count');
  const totalEl = document.getElementById('export-matched-total');
  if (countEl) countEl.textContent = `${matching.length} Transaksi`;
  if (totalEl) totalEl.textContent = formatRp(totalFiltered);

  // Update button text & icon based on format
  const btnText = document.getElementById('btn-process-text');
  const btnIcon = document.getElementById('btn-process-icon');
  if (btnText && btnIcon) {
    if (exportSelectedFormat === 'PDF') {
      btnText.textContent = 'Cetak / Simpan PDF';
      btnIcon.setAttribute('data-lucide', 'printer');
    } else {
      btnText.textContent = 'Unduh File Excel (.xls)';
      btnIcon.setAttribute('data-lucide', 'file-spreadsheet');
    }
    lucide.createIcons();
  }
}

function openExportReportModal() {
  // Sync selected service with current report tab if available
  if (currentReportFilter && ['ALL', 'KAFE', 'CUCI'].includes(currentReportFilter)) {
    exportSelectedService = currentReportFilter;
  }
  
  // Set active classes on service cards
  document.querySelectorAll('.service-options .export-radio-card').forEach(card => {
    card.classList.toggle('active', card.dataset.exportService === exportSelectedService);
  });

  // Set active format card
  document.querySelectorAll('.format-options .export-radio-card').forEach(card => {
    card.classList.toggle('active', card.dataset.exportFormat === exportSelectedFormat);
  });

  // Set period select
  const periodSelect = document.getElementById('export-period-select');
  if (periodSelect) periodSelect.value = exportSelectedPeriod;
  
  const customDateContainer = document.getElementById('export-custom-date-container');
  if (customDateContainer) {
    customDateContainer.style.display = exportSelectedPeriod === 'custom' ? 'grid' : 'none';
  }

  // Pre-fill default dates for custom if empty
  const todayIso = new Date().toISOString().split('T')[0];
  const startInput = document.getElementById('export-date-start');
  const endInput = document.getElementById('export-date-end');
  if (startInput && !startInput.value) startInput.value = todayIso;
  if (endInput && !endInput.value) endInput.value = todayIso;

  updateExportModalPreview();
  document.getElementById('modal-export-report').classList.add('show');
}

async function generatePdfReport(matchingTrx, service, periodLabel) {
  const serviceLabel = getServiceLabel(service);
  const now = new Date();
  const exportTimestamp = now.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

  try {
    showToast('Menyiapkan file PDF rekap penjualan...', 'info');

    // Menggunakan A4 Landscape agar seluruh 8 kolom laporan finansial muat lapang & rapi
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.width; // 297mm
    const pageHeight = doc.internal.pageSize.height; // 210mm
    const marginX = 14;

    // 1. Brand Logo & Header
    if (RAYA_LOGO_BLACK) {
      try {
        doc.addImage(RAYA_LOGO_BLACK, 'PNG', marginX, 10, 24, 18);
      } catch (imgErr) {
        console.warn('Logo image render warning in sales PDF:', imgErr);
      }
    }

    const titleLeft = RAYA_LOGO_BLACK ? 42 : marginX;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(75, 21, 30); // Primary Burgundy #4B151E
    doc.text('1966 CAFFE', titleLeft, 16);

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(36, 20, 22); // Deep Charcoal #241416
    doc.text('LAPORAN REKAPITULASI PENJUALAN & OMSET', titleLeft, 22);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 110, 110);
    doc.text('Specialty Coffee & Eatery • Sistem Rekapitulasi Finansial Terpadu', titleLeft, 27);

    // Decorative Dual Header Line (Burgundy & Terracotta)
    doc.setDrawColor(75, 21, 30);
    doc.setLineWidth(0.6);
    doc.line(marginX, 30, pageWidth - marginX, 30);

    doc.setDrawColor(184, 93, 54);
    doc.setLineWidth(0.3);
    doc.line(marginX, 31, pageWidth - marginX, 31);

    // 2. Metadata Parameter Box
    const metaY = 34;
    const metaHeight = 11;
    doc.setFillColor(251, 248, 245);
    doc.setDrawColor(232, 220, 209);
    doc.setLineWidth(0.2);
    doc.roundedRect(marginX, metaY, pageWidth - (marginX * 2), metaHeight, 1.5, 1.5, 'FD');

    const printedBy = currentUser ? `${currentUser.name} (${currentUser.role})` : 'Administrator POS';

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(110, 98, 89);
    doc.text('KATEGORI MENU:', marginX + 4, metaY + 4.5);
    doc.text('PERIODE REKAP:', marginX + 75, metaY + 4.5);
    doc.text('DICETAK PADA:', marginX + 150, metaY + 4.5);
    doc.text('OPERATOR / KASIR:', marginX + 215, metaY + 4.5);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(36, 20, 22);
    doc.text(serviceLabel, marginX + 4, metaY + 8.5);
    doc.text(periodLabel, marginX + 75, metaY + 8.5);
    doc.text(exportTimestamp, marginX + 150, metaY + 8.5);
    doc.text(printedBy, marginX + 215, metaY + 8.5);

    // 3. Compute Summary Statistics for KPI Cards
    let grandTotal = 0;
    let totalMinumanOmset = 0;
    let totalMinumanQty = 0;
    let totalMakananOmset = 0;
    let totalMakananQty = 0;

    const tableData = matchingTrx.map((trx, index) => {
      const s = getTrxServices(trx);
      let displayTotal = trx.total;
      let relevantItems = trx.items || [];
      let kategoriLayanan = 'Minuman';

      totalMinumanOmset += (s.kafeTotal || 0);
      totalMinumanQty += (s.kafeQty || 0);
      totalMakananOmset += (s.cuciTotal || 0);
      totalMakananQty += (s.cuciQty || 0);

      if (service === 'KAFE') {
        displayTotal = s.kafeTotal;
        relevantItems = relevantItems.filter(i => i.category === 'KAFE');
        kategoriLayanan = 'Minuman & Kopi';
      } else if (service === 'CUCI') {
        displayTotal = s.cuciTotal;
        relevantItems = relevantItems.filter(i => i.category === 'CUCI');
        kategoriLayanan = 'Makanan & Snack';
      } else {
        if (s.hasKafe && s.hasCuci) {
          kategoriLayanan = 'Minuman + Makanan';
        } else if (s.hasCuci) {
          kategoriLayanan = 'Makanan & Snack';
        } else {
          kategoriLayanan = 'Minuman & Kopi';
        }
      }

      grandTotal += displayTotal;
      const itemsSummary = relevantItems.map(i => `${i.qty}x ${i.name}`).join(', ') || '-';
      const orderTypeLabel = trx.type === 'DINE_IN' ? 'Dine In' : (trx.type === 'TAKE_AWAY' ? 'Takeaway' : (trx.type === 'DELIVERY' ? 'Delivery' : trx.type));

      return [
        index + 1,
        trx.id,
        `${trx.date}\n${trx.time} (${orderTypeLabel})`,
        trx.ref || '-',
        kategoriLayanan,
        itemsSummary,
        trx.method || 'CASH',
        formatRp(displayTotal)
      ];
    });

    const atv = matchingTrx.length > 0 ? Math.round(grandTotal / matchingTrx.length) : 0;

    // 4. KPI Executive Summary Cards
    const kpiY = 47;
    const kpiHeight = 12.5;
    const totalAvailWidth = pageWidth - (marginX * 2);
    const kpiGap = 4;
    const kpiWidth = (totalAvailWidth - (3 * kpiGap)) / 4;

    // Card 1: Total Omset
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(marginX, kpiY, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(153, 27, 27);
    doc.text('TOTAL OMSET PENJUALAN', marginX + 4, kpiY + 4.5);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(75, 21, 30);
    doc.text(formatRp(grandTotal), marginX + 4, kpiY + 9.5);

    // Card 2: Total Transaksi & ATV
    const kpi2X = marginX + kpiWidth + kpiGap;
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(kpi2X, kpiY, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(22, 101, 52);
    doc.text('TOTAL TRANSAKSI (AOV)', kpi2X + 4, kpiY + 4.5);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(21, 128, 61);
    doc.text(`${matchingTrx.length} Trx (avg ${formatRp(atv)})`, kpi2X + 4, kpiY + 9.5);

    // Card 3: Omset Minuman & Kopi
    const kpi3X = kpi2X + kpiWidth + kpiGap;
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(kpi3X, kpiY, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(30, 64, 175);
    doc.text('MINUMAN & KOPI', kpi3X + 4, kpiY + 4.5);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(29, 78, 216);
    doc.text(`${formatRp(totalMinumanOmset)} (${totalMinumanQty} item)`, kpi3X + 4, kpiY + 9.5);

    // Card 4: Omset Makanan & Snack
    const kpi4X = kpi3X + kpiWidth + kpiGap;
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(253, 230, 138);
    doc.roundedRect(kpi4X, kpiY, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(180, 83, 9);
    doc.text('MAKANAN & SNACK', kpi4X + 4, kpiY + 4.5);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(184, 93, 54);
    doc.text(`${formatRp(totalMakananOmset)} (${totalMakananQty} item)`, kpi4X + 4, kpiY + 9.5);

    // 5. Data Table (autoTable)
    autoTable(doc, {
      startY: 62,
      head: [['No', 'ID Trx', 'Waktu & Tipe', 'No. Meja / Ref', 'Kategori Menu', 'Rincian Pesanan Menu', 'Metode Bayar', 'Subtotal Omset']],
      body: tableData.length > 0 ? tableData : [['-', '-', '-', '-', '-', 'Tidak ada transaksi pada filter periode ini.', '-', 'Rp 0']],
      foot: [
        ['', '', '', '', '', '', 'TOTAL OMSET PENJUALAN', formatRp(grandTotal)]
      ],
      margin: { left: marginX, right: marginX, bottom: 22 },
      headStyles: {
        fillColor: [75, 21, 30], // #4B151E Burgundy
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'center',
        cellPadding: 3
      },
      styles: {
        fontSize: 8,
        textColor: [36, 20, 22],
        cellPadding: 2.2,
        lineColor: [232, 220, 209],
        lineWidth: 0.1,
        valign: 'middle'
      },
      alternateRowStyles: {
        fillColor: [252, 250, 248]
      },
      footStyles: {
        fillColor: [245, 238, 235],
        textColor: [75, 21, 30],
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'right'
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 28 },
        3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 26, halign: 'center' },
        5: { cellWidth: 97 },
        6: { cellWidth: 22, halign: 'center' },
        7: { cellWidth: 38, halign: 'right', fontStyle: 'bold' }
      },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 110, 110);
        doc.text(
          'Dokumen Rekapitulasi Penjualan Resmi 1966 Caffe • Sifat: Dokumen Finansial Internal',
          marginX,
          pageHeight - 7
        );
        doc.text(
          `Halaman ${data.pageNumber} dari ${pageCount}`,
          pageWidth - marginX - 25,
          pageHeight - 7
        );
      }
    });

    // 6. Verification & Signature Block
    let finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 8 : 120;
    if (finalY + 30 > pageHeight - 15) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(36, 20, 22);

    const sigCol1X = marginX + 15;
    const sigCol2X = pageWidth - marginX - 65;

    doc.text('Dibuat Oleh:', sigCol1X, finalY);
    doc.text('Mengetahui / Menyetujui:', sigCol2X, finalY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 100, 100);
    doc.text('Kasir / Pelaksana Operasional', sigCol1X, finalY + 4);
    doc.text('Manager Operasional / Owner', sigCol2X, finalY + 4);

    doc.setDrawColor(180, 180, 180);
    doc.line(sigCol1X, finalY + 18, sigCol1X + 45, finalY + 18);
    doc.line(sigCol2X, finalY + 18, sigCol2X + 50, finalY + 18);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(36, 20, 22);
    doc.text(`( ${printedBy} )`, sigCol1X, finalY + 22);
    doc.text('( 1966 Caffe Management )', sigCol2X, finalY + 22);

    // 7. Output Base64 and Save
    const pdfDataUri = doc.output('datauristring');
    const pdfBase64 = pdfDataUri.split(',')[1];
    const safeService = service.toLowerCase();
    const safeDate = now.toISOString().split('T')[0];
    const fileName = `Rekap_Omset_1966Caffe_${safeService}_${safeDate}.pdf`;

    const result = await saveFileToLocalDevice(fileName, pdfBase64, 'application/pdf', true);
    document.getElementById('modal-export-report').classList.remove('show');
    showToast(result.message, 'success');
  } catch (err) {
    console.error('PDF Generation Error:', err);
    showToast('Gagal membuat PDF: ' + err.message, 'error');
  }
}

async function generateExcelReport(matchingTrx, service, periodLabel) {
  const serviceLabel = getServiceLabel(service);
  const now = new Date();
  const exportTimestamp = now.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

  const printedBy = currentUser ? `${currentUser.name} (${currentUser.role})` : 'Administrator POS';

  let grandTotal = 0;
  let totalMinumanOmset = 0;
  let totalMinumanQty = 0;
  let totalMakananOmset = 0;
  let totalMakananQty = 0;

  const rows = matchingTrx.map((trx, index) => {
    const s = getTrxServices(trx);
    let displayTotal = trx.total;
    let relevantItems = trx.items || [];
    let kategoriLayanan = 'Minuman';

    totalMinumanOmset += (s.kafeTotal || 0);
    totalMinumanQty += (s.kafeQty || 0);
    totalMakananOmset += (s.cuciTotal || 0);
    totalMakananQty += (s.cuciQty || 0);

    if (service === 'KAFE') {
      displayTotal = s.kafeTotal;
      relevantItems = relevantItems.filter(i => i.category === 'KAFE');
      kategoriLayanan = 'Minuman & Kopi';
    } else if (service === 'CUCI') {
      displayTotal = s.cuciTotal;
      relevantItems = relevantItems.filter(i => i.category === 'CUCI');
      kategoriLayanan = 'Makanan & Snack';
    } else {
      if (s.hasKafe && s.hasCuci) {
        kategoriLayanan = 'Minuman + Makanan';
      } else if (s.hasCuci) {
        kategoriLayanan = 'Makanan & Snack';
      } else {
        kategoriLayanan = 'Minuman & Kopi';
      }
    }

    grandTotal += displayTotal;
    const itemsText = relevantItems.map(i => `${i.qty}x ${i.name} (@Rp ${i.price.toLocaleString('id-ID')})`).join('; ') || '-';
    const isZebra = index % 2 === 1 ? 'class="zebra"' : '';
    const orderTypeLabel = trx.type === 'DINE_IN' ? 'Dine In' : (trx.type === 'TAKE_AWAY' ? 'Takeaway' : (trx.type === 'DELIVERY' ? 'Delivery' : trx.type));

    return `
      <tr ${isZebra}>
        <td class="td-cell td-center">${index + 1}</td>
        <td class="td-cell td-center td-bold">${trx.id}</td>
        <td class="td-cell td-center">${trx.date}</td>
        <td class="td-cell td-center">${trx.time}</td>
        <td class="td-cell td-center">${orderTypeLabel}</td>
        <td class="td-cell td-center">${trx.ref || '-'}</td>
        <td class="td-cell td-center">${kategoriLayanan}</td>
        <td class="td-cell">${itemsText}</td>
        <td class="td-cell td-center">${trx.method || 'CASH'}</td>
        <td class="td-cell td-right td-bold">Rp ${displayTotal.toLocaleString('id-ID')}</td>
      </tr>
    `;
  }).join('');

  const atv = matchingTrx.length > 0 ? Math.round(grandTotal / matchingTrx.length) : 0;

  const excelContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Rekap Penjualan 1966 Caffe</x:Name>
              <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #241416; }
        table { border-collapse: collapse; width: 100%; }
        .brand-title { font-size: 16pt; font-weight: bold; color: #4B151E; text-align: left; }
        .brand-sub { font-size: 11.5pt; font-weight: bold; color: #B85D36; text-align: left; }
        .brand-note { font-size: 9.5pt; color: #786E6E; font-style: italic; text-align: left; }
        .meta-label { font-size: 10pt; font-weight: bold; color: #6E6259; background-color: #F8F9FA; border: 1px solid #D9C3B0; padding: 6px 10px; }
        .meta-val { font-size: 10pt; color: #241416; background-color: #FFFFFF; border: 1px solid #D9C3B0; padding: 6px 10px; }
        .kpi-box { font-size: 10pt; font-weight: bold; text-align: center; border: 1px solid #CBD5E1; padding: 10px; }
        .th-col { background-color: #4B151E; color: #FFFFFF; font-weight: bold; text-align: center; border: 1px solid #330D14; padding: 10px 8px; vertical-align: middle; }
        .td-cell { border: 1px solid #E2E8F0; padding: 8px 6px; font-size: 10pt; vertical-align: middle; }
        .td-center { text-align: center; }
        .td-right { text-align: right; }
        .td-bold { font-weight: bold; }
        .zebra { background-color: #FAF8F5; }
        .total-cell { background-color: #F5EEEB; font-weight: bold; color: #4B151E; border: 1px solid #D9C3B0; padding: 10px 8px; font-size: 11pt; }
        .sig-title { font-weight: bold; font-size: 10.5pt; text-align: center; padding-top: 15px; }
        .sig-line { font-weight: bold; text-align: center; padding-top: 45px; }
      </style>
    </head>
    <body>
      <table>
        <tr>
          <td colspan="10" class="brand-title">1966 CAFFE - SPECIALTY COFFEE & EATERY</td>
        </tr>
        <tr>
          <td colspan="10" class="brand-sub">LAPORAN REKAPITULASI PENJUALAN & OMSET</td>
        </tr>
        <tr>
          <td colspan="10" class="brand-note">Dokumen Ekspor Resmi Sistem Point of Sale (POS) 1966 Caffe • Rekapitulasi Finansial Terpadu</td>
        </tr>
        <tr><td colspan="10" style="height:10px;"></td></tr>

        <tr>
          <td colspan="2" class="meta-label">Kategori Menu:</td>
          <td colspan="3" class="meta-val"><strong>${serviceLabel}</strong></td>
          <td colspan="2" class="meta-label">Total Transaksi:</td>
          <td colspan="3" class="meta-val"><strong>${matchingTrx.length} Pesanan</strong></td>
        </tr>
        <tr>
          <td colspan="2" class="meta-label">Periode Rekap:</td>
          <td colspan="3" class="meta-val"><strong>${periodLabel}</strong></td>
          <td colspan="2" class="meta-label">Total Omset:</td>
          <td colspan="3" class="meta-val" style="font-weight:bold; color:#4B151E;">Rp ${grandTotal.toLocaleString('id-ID')}</td>
        </tr>
        <tr>
          <td colspan="2" class="meta-label">Dicetak Pada:</td>
          <td colspan="3" class="meta-val">${exportTimestamp}</td>
          <td colspan="2" class="meta-label">Operator / Kasir:</td>
          <td colspan="3" class="meta-val">${printedBy}</td>
        </tr>
        <tr><td colspan="10" style="height:12px;"></td></tr>

        <tr>
          <td colspan="2" class="kpi-box" style="background-color:#FEF2F2; color:#991B1B;">
            TOTAL OMSET<br><span style="font-size:13pt; color:#4B151E;">Rp ${grandTotal.toLocaleString('id-ID')}</span>
          </td>
          <td colspan="3" class="kpi-box" style="background-color:#F0FDF4; color:#166534;">
            TOTAL TRANSAKSI<br><span style="font-size:13pt; color:#15803D;">${matchingTrx.length}</span> Trx (avg Rp ${atv.toLocaleString('id-ID')})
          </td>
          <td colspan="3" class="kpi-box" style="background-color:#EFF6FF; color:#1E40AF;">
            MINUMAN & KOPI<br><span style="font-size:13pt; color:#1D4ED8;">Rp ${totalMinumanOmset.toLocaleString('id-ID')}</span> (${totalMinumanQty} item)
          </td>
          <td colspan="2" class="kpi-box" style="background-color:#FFFBEB; color:#B45309;">
            MAKANAN & SNACK<br><span style="font-size:13pt; color:#B85D36;">Rp ${totalMakananOmset.toLocaleString('id-ID')}</span> (${totalMakananQty} item)
          </td>
        </tr>
        <tr><td colspan="10" style="height:14px;"></td></tr>

        <thead>
          <tr>
            <th class="th-col" style="width:40px;">No</th>
            <th class="th-col" style="width:140px;">ID Transaksi</th>
            <th class="th-col" style="width:100px;">Tanggal</th>
            <th class="th-col" style="width:80px;">Jam</th>
            <th class="th-col" style="width:100px;">Tipe Pesanan</th>
            <th class="th-col" style="width:110px;">No. Meja / Ref</th>
            <th class="th-col" style="width:140px;">Kategori Menu</th>
            <th class="th-col" style="width:320px;">Rincian Menu & Qty</th>
            <th class="th-col" style="width:100px;">Metode Bayar</th>
            <th class="th-col" style="width:140px;">Subtotal Omset (Rp)</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="10" class="td-cell td-center">Tidak ada transaksi pada filter periode ini.</td></tr>'}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="9" class="total-cell" style="text-align:right;">TOTAL KESELURUHAN OMSET:</td>
            <td class="total-cell" style="text-align:right;">Rp ${grandTotal.toLocaleString('id-ID')}</td>
          </tr>
        </tfoot>
      </table>

      <table>
        <tr><td colspan="10" style="height:25px;"></td></tr>
        <tr>
          <td colspan="4" class="sig-title">Dibuat Oleh:</td>
          <td colspan="2"></td>
          <td colspan="4" class="sig-title">Mengetahui / Disetujui:</td>
        </tr>
        <tr>
          <td colspan="4" class="sig-line">(${printedBy})<br><span style="font-size:9pt; font-weight:normal; color:#786E6E;">Kasir / Pelaksana Operasional</span></td>
          <td colspan="2"></td>
          <td colspan="4" class="sig-line">( Manager Operasional / Owner )<br><span style="font-size:9pt; font-weight:normal; color:#786E6E;">1966 Caffe Management</span></td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const safeService = service.toLowerCase();
  const safeDate = now.toISOString().split('T')[0];
  const fileName = `Rekap_Omset_1966Caffe_${safeService}_${safeDate}.xls`;

  try {
    showToast('Menyimpan file rekap Excel ke memori lokal...', 'info');
    const result = await saveFileToLocalDevice(fileName, '\ufeff' + excelContent, 'application/vnd.ms-excel');
    document.getElementById('modal-export-report').classList.remove('show');
    showToast(result.message, 'success');
  } catch (err) {
    showToast('Gagal menyimpan file: ' + err.message, 'error');
  }
}

function processExport() {
  const customStart = document.getElementById('export-date-start')?.value || '';
  const customEnd = document.getElementById('export-date-end')?.value || '';
  const matching = filterTransactionsForExport(exportSelectedService, exportSelectedPeriod, customStart, customEnd);
  const periodLabel = getPeriodLabel(exportSelectedPeriod, customStart, customEnd);

  if (matching.length === 0) {
    if (!confirm('Tidak ada data transaksi yang cocok dengan filter yang dipilih. Tetap lanjutkan cetak/ekspor?')) {
      return;
    }
  }

  if (exportSelectedFormat === 'PDF') {
    generatePdfReport(matching, exportSelectedService, periodLabel);
  } else {
    generateExcelReport(matching, exportSelectedService, periodLabel);
  }

}

// --------------------------------------------------
// Global Exposures & Initial Run
// --------------------------------------------------
window.updateCartQty = updateCartQty;
window.deleteMenu = deleteMenu;
window.openEditMenu = openEditMenu;
window.openEditTrx = openEditTrx;
window.changeEditTrxItemQty = changeEditTrxItemQty;
window.removeEditTrxItem = removeEditTrxItem;
window.openExportReportModal = openExportReportModal;
window.openAddExpenseModal = openAddExpenseModal;
window.openEditExpense = openEditExpense;
window.deleteExpense = deleteExpense;
window.confirmReimbursement = confirmReimbursement;
window.openAddUserModal = openAddUserModal;
window.closeAddUserModal = closeAddUserModal;
window.saveNewUser = saveNewUser;
window.openEditUserModal = openEditUserModal;
window.closeEditUserModal = closeEditUserModal;
window.saveEditUser = saveEditUser;
window.deleteUser = deleteUser;

// User Management Modal Forms
document.getElementById('form-add-user')?.addEventListener('submit', (e) => {
  e.preventDefault();
  saveNewUser();
});
document.getElementById('btn-save-new-user')?.addEventListener('click', (e) => {
  e.preventDefault();
  saveNewUser();
});

document.getElementById('form-edit-user')?.addEventListener('submit', (e) => {
  e.preventDefault();
  saveEditUser();
});
document.getElementById('btn-save-edit-user')?.addEventListener('click', (e) => {
  e.preventDefault();
  saveEditUser();
});

// Open Export Modal
const btnOpenExport = document.getElementById('btn-open-export-modal');
if (btnOpenExport) {
  btnOpenExport.addEventListener('click', openExportReportModal);
}

// Service Radio Cards in Export Modal
document.querySelectorAll('.service-options .export-radio-card').forEach(card => {
  card.addEventListener('click', (e) => {
    document.querySelectorAll('.service-options .export-radio-card').forEach(c => c.classList.remove('active'));
    e.currentTarget.classList.add('active');
    exportSelectedService = e.currentTarget.dataset.exportService;
    updateExportModalPreview();
  });
});

// Format Radio Cards in Export Modal
document.querySelectorAll('.format-options .export-radio-card').forEach(card => {
  card.addEventListener('click', (e) => {
    document.querySelectorAll('.format-options .export-radio-card').forEach(c => c.classList.remove('active'));
    e.currentTarget.classList.add('active');
    exportSelectedFormat = e.currentTarget.dataset.exportFormat;
    updateExportModalPreview();
  });
});

// Period Select in Export Modal
const exportPeriodSelect = document.getElementById('export-period-select');
if (exportPeriodSelect) {
  exportPeriodSelect.addEventListener('change', (e) => {
    exportSelectedPeriod = e.target.value;
    const customContainer = document.getElementById('export-custom-date-container');
    if (customContainer) {
      customContainer.style.display = exportSelectedPeriod === 'custom' ? 'grid' : 'none';
    }
    updateExportModalPreview();
  });
}

// Custom Date Inputs
document.getElementById('export-date-start')?.addEventListener('input', updateExportModalPreview);
document.getElementById('export-date-end')?.addEventListener('input', updateExportModalPreview);

// Process Export Button
document.getElementById('btn-process-export')?.addEventListener('click', processExport);

// History Service Filter Tabs
document.querySelectorAll('.service-tab-btn[data-service]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.service-tab-btn[data-service]').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    currentHistoryFilter = e.currentTarget.dataset.service;
    renderHistory();
  });
});

// Reports Service Filter Tabs
document.querySelectorAll('.service-tab-btn[data-report-service]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.service-tab-btn[data-report-service]').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    currentReportFilter = e.currentTarget.dataset.reportService;
    renderReports();
  });
});

// Expense Filter Tabs & Touch-Scrollable Filter Chips
document.querySelectorAll('.filter-chip[data-expense-filter], .service-tab-btn[data-expense-filter]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.filter-chip[data-expense-filter], .service-tab-btn[data-expense-filter]').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    currentExpenseFilter = e.currentTarget.dataset.expenseFilter;
    renderExpense();
  });
});

// Multi-Tab & Window Database Synchronization
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEYS.HISTORY) {
    history = loadStorage(STORAGE_KEYS.HISTORY, defaultHistory);
    updateDashboardStats();
    renderHistory();
    renderReports();
  }
  if (e.key === STORAGE_KEYS.PRODUCTS) {
    products = loadStorage(STORAGE_KEYS.PRODUCTS, defaultProducts);
    renderPOS();
    renderMenuTable();
  }
  if (e.key === STORAGE_KEYS.EXPENSES) {
    expenses = loadStorage(STORAGE_KEYS.EXPENSES, defaultExpenses).map(normalizeExpense);
    renderExpense();
    updateDashboardStats();
    renderReports();
  }
  if (e.key === STORAGE_KEYS.TAXES) {
    taxes = loadStorage(STORAGE_KEYS.TAXES, defaultTaxes);
    renderTaxes();
    updateCart();
  }
  if (e.key === STORAGE_KEYS.USERS) {
    users = loadStorage(STORAGE_KEYS.USERS, defaultUsers);
    renderUsers();
    renderAttendanceKiosk();
  }
  if (e.key === STORAGE_KEYS.ATTENDANCE) {
    attendance = loadStorage(STORAGE_KEYS.ATTENDANCE, []);
    renderTodayAttendanceList();
    renderAttendanceReport();
  }
});

// ==================================================
// 12. FITUR ABSENSI KARYAWAN BERBASIS SELFIE (Full Offline)
// ==================================================

// State Kamera & Absensi
let activeCameraStream = null;
let capturedAttendancePhotoBase64 = null;
let currentPendingAttendanceAction = null;
let attClockTimer = null;

// Konfigurasi Shift Kerja 1966 Caffe (Dinamis & Persisten Offline)
const DEFAULT_SHIFTS = [
  { id: 'SHIFT_PAGI', name: 'Shift Pagi', startTime: '08:00', endTime: '16:00', graceMinutes: 15 },
  { id: 'SHIFT_SIANG', name: 'Shift Siang', startTime: '14:00', endTime: '22:00', graceMinutes: 15 },
  { id: 'SHIFT_FULL', name: 'Shift General', startTime: '09:00', endTime: '18:00', graceMinutes: 15 }
];

let workShifts = (() => {
  try {
    const saved = localStorage.getItem('1966_shifts');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(s => ({
          ...s,
          graceMinutes: Math.min(120, Math.max(0, parseInt(s.graceMinutes) || 15))
        }));
      }
    }
  } catch (e) {
    console.error('Error loading shifts:', e);
  }
  return [...DEFAULT_SHIFTS];
})();

function saveWorkShifts() {
  try {
    localStorage.setItem('1966_shifts', JSON.stringify(workShifts));
  } catch (e) {
    console.error('Error saving shifts:', e);
  }
}

function getShiftConfig(shiftId) {
  const s = workShifts.find(x => x.id === shiftId) || workShifts[0] || DEFAULT_SHIFTS[0];
  const [startH, startM] = (s.startTime || '08:00').split(':').map(Number);
  const [endH, endM] = (s.endTime || '16:00').split(':').map(Number);
  return {
    ...s,
    fullName: `${s.name} (${s.startTime} - ${s.endTime})`,
    startHour: isNaN(startH) ? 8 : startH,
    startMinute: isNaN(startM) ? 0 : startM,
    endHour: isNaN(endH) ? 16 : endH,
    endMinute: isNaN(endM) ? 0 : endM,
    graceMinutes: Number(s.graceMinutes) || 0
  };
}

// 1. Digital Clock Widget Ticker
function initAttendanceClock() {
  function tick() {
    const now = new Date();
    const timeEl = document.getElementById('att-clock-time');
    const dateEl = document.getElementById('att-clock-date');
    if (timeEl) {
      timeEl.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
  }
  tick();
  if (attClockTimer) clearInterval(attClockTimer);
  attClockTimer = setInterval(tick, 1000);
}

// 2. Modul Kamera (HTML5 Canvas Compression)
async function startCameraStream() {
  const videoEl = document.getElementById('att-camera-video');
  const previewImg = document.getElementById('att-captured-preview-img');
  const guideOverlay = document.getElementById('camera-guide-overlay');
  const liveControls = document.getElementById('cam-controls-live');
  const previewControls = document.getElementById('cam-controls-preview');

  if (previewImg) previewImg.style.display = 'none';
  if (videoEl) videoEl.style.display = 'block';
  if (guideOverlay) guideOverlay.style.display = 'flex';
  if (liveControls) liveControls.style.display = 'flex';
  if (previewControls) previewControls.style.display = 'none';
  capturedAttendancePhotoBase64 = null;

  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: false
      });
      activeCameraStream = stream;
      if (videoEl) {
        videoEl.srcObject = stream;
        await videoEl.play().catch(() => {});
      }
    } else {
      throw new Error('MediaDevices not supported');
    }
  } catch (err) {
    console.warn('Kamera web tidak dapat diakses langsung, beralih ke input kamera fallback:', err);
    showToast('Kamera web belum aktif. Anda bisa gunakan tombol alternatif upload/kamera HP.', 'info');
  }
}

function stopCameraStream() {
  if (activeCameraStream) {
    activeCameraStream.getTracks().forEach(track => track.stop());
    activeCameraStream = null;
  }
  const videoEl = document.getElementById('att-camera-video');
  if (videoEl) {
    videoEl.srcObject = null;
  }
}

function captureSelfiePhoto() {
  const videoEl = document.getElementById('att-camera-video');
  const canvasEl = document.getElementById('att-capture-canvas');
  const previewImg = document.getElementById('att-captured-preview-img');
  const guideOverlay = document.getElementById('camera-guide-overlay');
  const flashEl = document.getElementById('camera-flash');
  const liveControls = document.getElementById('cam-controls-live');
  const previewControls = document.getElementById('cam-controls-preview');

  if (!videoEl || !canvasEl || !videoEl.videoWidth) {
    showToast('Kamera belum siap, coba lagi dalam beberapa detik...', 'error');
    return;
  }

  // Flash visual feedback
  if (flashEl) {
    flashEl.classList.remove('flash-active');
    void flashEl.offsetWidth;
    flashEl.classList.add('flash-active');
  }

  const targetSize = 320;
  canvasEl.width = targetSize;
  canvasEl.height = targetSize;
  const ctx = canvasEl.getContext('2d');

  const minDim = Math.min(videoEl.videoWidth, videoEl.videoHeight);
  const sx = (videoEl.videoWidth - minDim) / 2;
  const sy = (videoEl.videoHeight - minDim) / 2;

  ctx.save();
  ctx.translate(targetSize, 0);
  ctx.scale(-1, 1); // Mirror horizontal
  ctx.drawImage(videoEl, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
  ctx.restore();

  capturedAttendancePhotoBase64 = canvasEl.toDataURL('image/jpeg', 0.65);

  if (previewImg) {
    previewImg.src = capturedAttendancePhotoBase64;
    previewImg.style.display = 'block';
  }
  videoEl.style.display = 'none';
  if (guideOverlay) guideOverlay.style.display = 'none';
  if (liveControls) liveControls.style.display = 'none';
  if (previewControls) previewControls.style.display = 'flex';
}

function retakeSelfiePhoto() {
  const videoEl = document.getElementById('att-camera-video');
  const previewImg = document.getElementById('att-captured-preview-img');
  const guideOverlay = document.getElementById('camera-guide-overlay');
  const liveControls = document.getElementById('cam-controls-live');
  const previewControls = document.getElementById('cam-controls-preview');

  capturedAttendancePhotoBase64 = null;
  if (previewImg) previewImg.style.display = 'none';
  if (videoEl) videoEl.style.display = 'block';
  if (guideOverlay) guideOverlay.style.display = 'flex';
  if (liveControls) liveControls.style.display = 'flex';
  if (previewControls) previewControls.style.display = 'none';
}

function handleFallbackFileInput(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    const img = new Image();
    img.onload = function() {
      const canvasEl = document.getElementById('att-capture-canvas');
      const previewImg = document.getElementById('att-captured-preview-img');
      const videoEl = document.getElementById('att-camera-video');
      const guideOverlay = document.getElementById('camera-guide-overlay');
      const liveControls = document.getElementById('cam-controls-live');
      const previewControls = document.getElementById('cam-controls-preview');

      const targetSize = 320;
      canvasEl.width = targetSize;
      canvasEl.height = targetSize;
      const ctx = canvasEl.getContext('2d');

      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

      capturedAttendancePhotoBase64 = canvasEl.toDataURL('image/jpeg', 0.65);

      if (previewImg) {
        previewImg.src = capturedAttendancePhotoBase64;
        previewImg.style.display = 'block';
      }
      if (videoEl) videoEl.style.display = 'none';
      if (guideOverlay) guideOverlay.style.display = 'none';
      if (liveControls) liveControls.style.display = 'none';
      if (previewControls) previewControls.style.display = 'flex';
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

// 3. Render & Logika Kios Absensi
function getTodayAttendanceForUser(userId) {
  const todayFormatted = new Date().toLocaleDateString('id-ID');
  const todayIso = new Date().toISOString().split('T')[0];
  return attendance.find(a => a.userId === userId && (a.date === todayFormatted || a.isoDate === todayIso));
}

function renderShiftSelectOptions() {
  const selectShift = document.getElementById('att-select-shift');
  if (!selectShift) return;
  const currentVal = selectShift.value;
  selectShift.innerHTML = workShifts.map(s => 
    `<option value="${s.id}">${s.name} (${s.startTime} - ${s.endTime})</option>`
  ).join('');
  if (currentVal && workShifts.some(s => s.id === currentVal)) {
    selectShift.value = currentVal;
  }
}

function renderAttendanceKiosk() {
  initAttendanceClock();
  renderShiftSelectOptions();

  const selectUser = document.getElementById('att-select-user');
  if (!selectUser) return;

  const currentVal = selectUser.value;
  selectUser.innerHTML = '<option value="">-- Pilih Nama Karyawan --</option>';
  
  const activeStaff = users.filter(u => u.status !== 'INACTIVE');
  activeStaff.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = `${u.name} (${u.role === 'ADMIN' ? 'Admin' : 'Kasir'})`;
    selectUser.appendChild(opt);
  });

  if (currentVal) {
    selectUser.value = currentVal;
  }
  updateKioskStatusForSelectedUser();
  renderTodayAttendanceList();
}

function updateKioskStatusForSelectedUser() {
  const selectUser = document.getElementById('att-select-user');
  const statusCard = document.getElementById('att-user-status-card');
  const statusDot = document.getElementById('att-status-dot');
  const statusText = document.getElementById('att-user-status-text');
  const btnClockIn = document.getElementById('btn-trigger-clockin');
  const btnClockOut = document.getElementById('btn-trigger-clockout');

  if (!selectUser || !selectUser.value) {
    if (statusCard) statusCard.style.display = 'none';
    if (btnClockIn) { btnClockIn.style.display = 'flex'; btnClockIn.disabled = true; btnClockIn.style.opacity = '0.65'; }
    if (btnClockOut) btnClockOut.style.display = 'none';
    return;
  }

  const userId = selectUser.value;
  const todayRec = getTodayAttendanceForUser(userId);

  if (statusCard) statusCard.style.display = 'flex';
  if (btnClockIn) btnClockIn.disabled = false;
  if (btnClockIn) btnClockIn.style.opacity = '1';

  if (!todayRec) {
    if (statusDot) { statusDot.className = 'att-status-dot'; }
    if (statusText) statusText.innerHTML = '<span style="color:var(--text-secondary);">Belum Absen Masuk Hari Ini</span>';
    if (btnClockIn) btnClockIn.style.display = 'flex';
    if (btnClockOut) btnClockOut.style.display = 'none';
  } else if (!todayRec.clockOutTime) {
    if (statusDot) { statusDot.className = 'att-status-dot active'; }
    const statusLabel = todayRec.clockInStatus === 'LATE' 
      ? `<span style="color:#B45309;">(Terlambat ${todayRec.lateMinutes} mnt)</span>` 
      : '<span style="color:#15803D;">(Tepat Waktu)</span>';
    if (statusText) statusText.innerHTML = `Sedang Bertugas • Masuk Jam <strong>${todayRec.clockInTime}</strong> ${statusLabel}`;
    if (btnClockIn) btnClockIn.style.display = 'none';
    if (btnClockOut) btnClockOut.style.display = 'flex';
  } else {
    if (statusDot) { statusDot.className = 'att-status-dot done'; }
    if (statusText) statusText.innerHTML = `Shift Hari Ini Selesai • <strong>${todayRec.clockInTime}</strong> s/d <strong>${todayRec.clockOutTime}</strong> (${todayRec.totalWorkDuration || '-'})`;
    if (btnClockIn) btnClockIn.style.display = 'none';
    if (btnClockOut) btnClockOut.style.display = 'none';
  }
}

function renderTodayAttendanceList() {
  const container = document.getElementById('att-today-list');
  const countBadge = document.getElementById('att-today-count-badge');
  if (!container) return;

  const todayFormatted = new Date().toLocaleDateString('id-ID');
  const todayIso = new Date().toISOString().split('T')[0];
  const todayRecords = attendance.filter(a => a.date === todayFormatted || a.isoDate === todayIso);

  if (countBadge) {
    countBadge.textContent = `${todayRecords.length} Karyawan Hadir Hari Ini`;
  }

  if (todayRecords.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:36px 16px; color:var(--text-muted);">
        <i data-lucide="clock" style="width:36px; height:36px; stroke-width:1.5; margin:0 auto 10px; opacity:0.6; display:block;"></i>
        <p style="font-size:13.5px; font-weight:600; color:var(--text-main); margin-bottom:4px;">Belum Ada Absensi Hari Ini</p>
        <p style="font-size:12px;">Pilih staf dan ambil foto selfie untuk mencatat jam masuk.</p>
      </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = '';
  todayRecords.forEach(rec => {
    const item = document.createElement('div');
    item.className = 'att-today-item';
    
    const isClockedOut = Boolean(rec.clockOutTime);
    const badgeClass = isClockedOut ? 'badge-done' : (rec.clockInStatus === 'LATE' ? 'badge-late' : 'badge-ontime');
    const badgeText = isClockedOut 
      ? 'Shift Selesai' 
      : (rec.clockInStatus === 'LATE' ? `Terlambat ${rec.lateMinutes}m` : 'Tepat Waktu');

    const thumbSrc = rec.clockInPhoto || '1966-logo-badge.png';

    item.innerHTML = `
      <img src="${thumbSrc}" class="att-today-thumb" title="Klik untuk lihat foto selfie" alt="Selfie ${rec.userName}">
      <div class="att-today-meta">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <span class="att-today-name">${rec.userName}</span>
          <span class="att-today-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="att-today-shift">
          <span>Masuk: <strong>${rec.clockInTime}</strong></span>
          ${rec.clockOutTime ? `<span>• Pulang: <strong>${rec.clockOutTime}</strong> (${rec.totalWorkDuration})</span>` : '<span>• Sedang bertugas</span>'}
        </div>
      </div>
    `;

    const imgEl = item.querySelector('.att-today-thumb');
    if (imgEl) {
      imgEl.onclick = () => openAttendancePhotoDetail(rec);
    }

    container.appendChild(item);
  });

  if (window.lucide) lucide.createIcons();
}

// 4. Trigger Clock In & Out Actions
function handleTriggerClockIn() {
  const selectUser = document.getElementById('att-select-user');
  const inputPin = document.getElementById('att-input-pin');
  const selectShift = document.getElementById('att-select-shift');
  const inputNotes = document.getElementById('att-input-notes');

  if (!selectUser.value) {
    showToast('Pilih nama karyawan terlebih dahulu!', 'error');
    selectUser.focus();
    return;
  }

  const user = users.find(u => u.id === selectUser.value);
  if (!user) return;

  const enteredPin = (inputPin.value || '').trim();
  const expectedPin = String(user.pin || '');
  if (!enteredPin) {
    showToast('Masukkan PIN karyawan untuk verifikasi!', 'error');
    inputPin.focus();
    return;
  }
  if (enteredPin !== expectedPin) {
    showToast('PIN Karyawan tidak cocok!', 'error');
    inputPin.select();
    return;
  }

  const shiftKey = selectShift.value || (workShifts[0] ? workShifts[0].id : 'SHIFT_PAGI');
  const shiftCfg = getShiftConfig(shiftKey);

  currentPendingAttendanceAction = {
    mode: 'CLOCK_IN',
    user: user,
    shiftKey: shiftKey,
    shiftName: shiftCfg.fullName,
    notes: (inputNotes.value || '').trim()
  };

  const modalTitle = document.getElementById('modal-cam-title');
  const modalUserName = document.getElementById('modal-cam-user-name');
  if (modalTitle) modalTitle.textContent = 'Foto Selfie Absen Masuk (Clock In)';
  if (modalUserName) modalUserName.textContent = `${user.name} • ${shiftCfg.fullName}`;

  const modal = document.getElementById('modal-camera-attendance');
  if (modal) modal.classList.add('show');
  startCameraStream();
}

function handleTriggerClockOut() {
  const selectUser = document.getElementById('att-select-user');
  const inputPin = document.getElementById('att-input-pin');

  if (!selectUser.value) {
    showToast('Pilih nama karyawan terlebih dahulu!', 'error');
    return;
  }

  const user = users.find(u => u.id === selectUser.value);
  if (!user) return;

  const enteredPin = (inputPin.value || '').trim();
  const expectedPin = String(user.pin || '');
  if (!enteredPin) {
    showToast('Masukkan PIN karyawan untuk verifikasi pulang!', 'error');
    inputPin.focus();
    return;
  }
  if (enteredPin !== expectedPin) {
    showToast('PIN Karyawan tidak cocok!', 'error');
    return;
  }

  const todayRec = getTodayAttendanceForUser(user.id);
  if (!todayRec) {
    showToast('Data absen masuk hari ini tidak ditemukan!', 'error');
    return;
  }

  if (confirm(`Konfirmasi Absen Pulang (Clock Out) untuk ${user.name}?`)) {
    executeClockOut(todayRec);
  }
}

function executeClockOut(record) {
  const now = new Date();
  const clockOutTimeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  let durationStr = '-';
  if (record.timestamp) {
    const diffMs = Math.max(0, now.getTime() - record.timestamp);
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    durationStr = `${diffHours} Jam ${diffMins} Menit`;
  }

  record.clockOutTime = clockOutTimeStr;
  record.totalWorkDuration = durationStr;
  record.clockOutTimestamp = now.getTime();

  saveAttendance();
  showToast(`Absen Pulang Berhasil! Terima kasih atas dedikasi Anda hari ini (${durationStr}).`, 'success');

  const inputPin = document.getElementById('att-input-pin');
  if (inputPin) inputPin.value = '';

  updateKioskStatusForSelectedUser();
  renderTodayAttendanceList();
  renderAttendanceReport();
}

function saveConfirmedAttendance() {
  if (!currentPendingAttendanceAction) return;

  const now = new Date();
  const todayFormatted = now.toLocaleDateString('id-ID');
  const todayIso = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (currentPendingAttendanceAction.mode === 'CLOCK_IN') {
    const shiftCfg = getShiftConfig(currentPendingAttendanceAction.shiftKey);
    
    const targetMin = shiftCfg.startHour * 60 + shiftCfg.startMinute;
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const lateDiff = currentMin - targetMin;

    let status = 'ON_TIME';
    let lateMins = 0;
    if (lateDiff > shiftCfg.graceMinutes) {
      status = 'LATE';
      lateMins = lateDiff;
    }

    const newRec = {
      id: 'ATT-' + Date.now(),
      userId: currentPendingAttendanceAction.user.id,
      userName: currentPendingAttendanceAction.user.name,
      userRole: currentPendingAttendanceAction.user.role,
      date: todayFormatted,
      isoDate: todayIso,
      shiftKey: currentPendingAttendanceAction.shiftKey,
      shiftName: currentPendingAttendanceAction.shiftName,
      clockInTime: timeStr,
      clockInPhoto: capturedAttendancePhotoBase64 || '',
      clockInStatus: status,
      lateMinutes: lateMins,
      clockOutTime: null,
      clockOutPhoto: null,
      totalWorkDuration: null,
      notes: currentPendingAttendanceAction.notes || '',
      timestamp: now.getTime()
    };

    attendance.unshift(newRec);
    saveAttendance();
    
    const lateMsg = status === 'LATE' ? ` (Terlambat ${lateMins} menit)` : ' (Tepat Waktu)';
    showToast(`Absen Masuk Berhasil! ${newRec.userName} siap bekerja${lateMsg}.`, 'success');
  }

  stopCameraStream();
  const modal = document.getElementById('modal-camera-attendance');
  if (modal) modal.classList.remove('show');
  currentPendingAttendanceAction = null;
  capturedAttendancePhotoBase64 = null;

  const inputPin = document.getElementById('att-input-pin');
  if (inputPin) inputPin.value = '';

  updateKioskStatusForSelectedUser();
  renderTodayAttendanceList();
  renderAttendanceReport();

  // KIOSK MODE: Jika sedang dalam standalone kiosk mode, beri notifikasi dan auto-return ke login
  if (document.body.classList.contains('standalone-kiosk-mode')) {
    showToast('Absensi berhasil! Layar kembali ke login dalam 5 detik...', 'success');
    cancelKioskAutoReturn();
    kioskAutoReturnTimer = setTimeout(() => {
      exitStandaloneAttendanceKiosk();
    }, 5000);
  }
}

function closeAttendanceCameraModal() {
  stopCameraStream();
  const modal = document.getElementById('modal-camera-attendance');
  if (modal) modal.classList.remove('show');
  currentPendingAttendanceAction = null;
  capturedAttendancePhotoBase64 = null;
}

// 5. Modal Detail Foto Selfie
function openAttendancePhotoDetail(record) {
  const modal = document.getElementById('modal-attendance-photo-detail');
  if (!modal) return;

  const imgEl = document.getElementById('att-detail-img');
  const nameEl = document.getElementById('att-detail-name');
  const datetimeEl = document.getElementById('att-detail-datetime');
  const timesEl = document.getElementById('att-detail-times');
  const statusEl = document.getElementById('att-detail-status');

  if (imgEl) imgEl.src = record.clockInPhoto || '1966-logo-badge.png';
  if (nameEl) nameEl.textContent = `${record.userName} (${record.userRole === 'ADMIN' ? 'Admin' : 'Kasir'})`;
  if (datetimeEl) datetimeEl.textContent = `${record.date} • ${record.shiftName || 'Shift Kafe'}`;
  if (timesEl) {
    timesEl.textContent = `${record.clockInTime || '-'} s/d ${record.clockOutTime || 'Sedang Bertugas'}`;
  }
  if (statusEl) {
    if (record.clockInStatus === 'LATE') {
      statusEl.innerHTML = `<span class="att-today-badge badge-late">Terlambat ${record.lateMinutes} Menit</span>`;
    } else {
      statusEl.innerHTML = `<span class="att-today-badge badge-ontime">Tepat Waktu</span>`;
    }
  }

  modal.classList.add('show');
}

function closeAttendancePhotoDetail() {
  const modal = document.getElementById('modal-attendance-photo-detail');
  if (modal) modal.classList.remove('show');
}
window.closeAttendancePhotoDetail = closeAttendancePhotoDetail;

// 6. Rekapitulasi & Audit Admin
function getFilteredAttendanceData() {
  const periodSelect = document.getElementById('att-report-period');
  const userFilterSelect = document.getElementById('att-report-user-filter');

  const selectedPeriod = periodSelect ? periodSelect.value : 'THIS_MONTH';
  const selectedUser = userFilterSelect ? userFilterSelect.value : 'ALL';

  const now = new Date();
  const todayFormatted = now.toLocaleDateString('id-ID');
  const todayIso = now.toISOString().split('T')[0];
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();

  const filtered = attendance.filter(rec => {
    if (selectedUser !== 'ALL' && rec.userId !== selectedUser) {
      return false;
    }

    if (selectedPeriod === 'TODAY') {
      return rec.date === todayFormatted || rec.isoDate === todayIso;
    }
    if (selectedPeriod === 'LAST_7_DAYS') {
      if (!rec.timestamp) return true;
      const daysDiff = (now.getTime() - rec.timestamp) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    }
    if (selectedPeriod === 'THIS_MONTH') {
      if (rec.timestamp) {
        const d = new Date(rec.timestamp);
        return d.getMonth() === curMonth && d.getFullYear() === curYear;
      }
      return true;
    }
    return true; // 'ALL' or other
  });

  let onTimeCount = 0;
  let lateCount = 0;
  let totalHoursAccum = 0;

  filtered.forEach(r => {
    if (r.clockInStatus === 'LATE') lateCount++;
    else onTimeCount++;

    if (r.totalWorkDuration) {
      const match = r.totalWorkDuration.match(/(\d+)\s*Jam/);
      if (match) totalHoursAccum += parseInt(match[1], 10);
    }
  });

  // Descriptive labels for reporting
  let periodLabel = 'Bulan Ini';
  if (selectedPeriod === 'TODAY') periodLabel = `Hari Ini (${todayFormatted})`;
  else if (selectedPeriod === 'LAST_7_DAYS') periodLabel = '7 Hari Terakhir';
  else if (selectedPeriod === 'ALL') periodLabel = 'Semua Riwayat Tercatat';

  let userLabel = 'Semua Karyawan';
  if (selectedUser !== 'ALL') {
    const foundUser = users.find(u => u.id === selectedUser);
    if (foundUser) userLabel = `${foundUser.name} (${foundUser.role || 'Karyawan'})`;
  }

  return {
    data: filtered,
    total: filtered.length,
    onTimeCount,
    lateCount,
    totalHoursAccum,
    periodLabel,
    userLabel,
    selectedPeriod,
    selectedUser
  };
}

function renderAttendanceReport() {
  const tbody = document.getElementById('table-attendance-report');
  const userFilterSelect = document.getElementById('att-report-user-filter');
  if (!tbody) return;

  if (userFilterSelect && userFilterSelect.options.length <= 1) {
    userFilterSelect.innerHTML = '<option value="ALL">Semua Karyawan</option>';
    users.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = u.name;
      userFilterSelect.appendChild(opt);
    });
  }

  const result = getFilteredAttendanceData();
  const filtered = result.data;

  const totalEl = document.getElementById('metric-att-total');
  const onTimeEl = document.getElementById('metric-att-ontime');
  const lateEl = document.getElementById('metric-att-late');
  const hoursEl = document.getElementById('metric-att-hours');

  if (totalEl) totalEl.textContent = result.total;
  if (onTimeEl) onTimeEl.textContent = result.onTimeCount;
  if (lateEl) lateEl.textContent = result.lateCount;
  if (hoursEl) hoursEl.textContent = `${result.totalHoursAccum} Jam`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center; padding:32px; color:var(--text-muted);">
          Tidak ada data riwayat absensi untuk filter ini.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = '';
  filtered.forEach(rec => {
    const tr = document.createElement('tr');
    const thumbSrc = rec.clockInPhoto || '1966-logo-badge.png';

    const isClockedOut = Boolean(rec.clockOutTime);
    const badgeClass = isClockedOut ? 'badge-done' : (rec.clockInStatus === 'LATE' ? 'badge-late' : 'badge-ontime');
    const badgeText = isClockedOut 
      ? 'Selesai' 
      : (rec.clockInStatus === 'LATE' ? `Terlambat ${rec.lateMinutes}m` : 'Tepat Waktu');

    tr.innerHTML = `
      <td style="text-align:center;">
        <img src="${thumbSrc}" class="att-table-thumb" title="Klik untuk perbesar selfie" alt="Selfie">
      </td>
      <td><strong>${rec.userName}</strong></td>
      <td>${rec.date}</td>
      <td><span style="font-size:12px; color:var(--text-secondary);">${rec.shiftName || 'Shift Kafe'}</span></td>
      <td><strong>${rec.clockInTime || '-'}</strong></td>
      <td>${rec.clockOutTime ? `<strong>${rec.clockOutTime}</strong>` : '<span style="color:var(--text-muted);">Sedang Bertugas</span>'}</td>
      <td>${rec.totalWorkDuration || '-'}</td>
      <td><span class="att-today-badge ${badgeClass}">${badgeText}</span></td>
      <td style="text-align:right;">
        <div class="att-action-group">
          <button type="button" class="btn-table-action view btn-att-detail" title="Lihat Foto Selfie & Detail">
            <i data-lucide="eye"></i>
          </button>
          <button type="button" class="btn-table-action delete btn-att-del" title="Hapus Data">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </td>
    `;

    tr.querySelector('.att-table-thumb').onclick = () => openAttendancePhotoDetail(rec);
    tr.querySelector('.btn-att-detail').onclick = () => openAttendancePhotoDetail(rec);
    tr.querySelector('.btn-att-del').onclick = () => {
      if (confirm(`Hapus catatan absensi ${rec.userName} pada tanggal ${rec.date}?`)) {
        attendance = attendance.filter(a => a.id !== rec.id);
        saveAttendance();
        showToast('Catatan absensi dihapus.', 'info');
        renderAttendanceReport();
        renderTodayAttendanceList();
      }
    };

    tbody.appendChild(tr);
  });

  if (window.lucide) lucide.createIcons();
}

// 7. Ekspor Laporan Absensi Profesional (Excel & PDF)
async function exportAttendanceExcel() {
  const result = getFilteredAttendanceData();
  const list = result.data;
  if (!list || list.length === 0) {
    showToast('Belum ada data absensi untuk diekspor pada filter ini!', 'warning');
    return;
  }

  const now = new Date();
  const exportDate = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

  const printedBy = currentUser ? `${currentUser.name} (${currentUser.role})` : 'Administrator POS';

  let html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Rekap Absensi 1966 Caffe</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #241416; }
    table { border-collapse: collapse; width: 100%; }
    .brand-title { font-size: 16pt; font-weight: bold; color: #4B151E; text-align: left; }
    .brand-sub { font-size: 11.5pt; font-weight: bold; color: #B85D36; text-align: left; }
    .brand-note { font-size: 9.5pt; color: #786E6E; font-style: italic; text-align: left; }
    .meta-label { font-size: 10pt; font-weight: bold; color: #6E6259; background-color: #F8F9FA; border: 1px solid #D9C3B0; padding: 6px 10px; }
    .meta-val { font-size: 10pt; color: #241416; background-color: #FFFFFF; border: 1px solid #D9C3B0; padding: 6px 10px; }
    .kpi-box { font-size: 10pt; font-weight: bold; text-align: center; border: 1px solid #CBD5E1; padding: 10px; }
    .th-col { background-color: #4B151E; color: #FFFFFF; font-weight: bold; text-align: center; border: 1px solid #330D14; padding: 10px 8px; vertical-align: middle; }
    .td-cell { border: 1px solid #E2E8F0; padding: 8px 6px; font-size: 10pt; vertical-align: middle; }
    .td-center { text-align: center; }
    .td-bold { font-weight: bold; }
    .zebra { background-color: #FAF8F5; }
    .pill-ontime { background-color: #DCFCE7; color: #15803D; font-weight: bold; text-align: center; }
    .pill-late { background-color: #FEE2E2; color: #B91C1C; font-weight: bold; text-align: center; }
    .sig-title { font-weight: bold; font-size: 10.5pt; text-align: center; padding-top: 15px; }
    .sig-line { font-weight: bold; text-align: center; padding-top: 45px; }
  </style>
</head>
<body>
  <table>
    <tr>
      <td colspan="11" class="brand-title">1966 CAFFE - SPECIALTY COFFEE & EATERY</td>
    </tr>
    <tr>
      <td colspan="11" class="brand-sub">LAPORAN REKAPITULASI & AUDIT KEHADIRAN KARYAWAN</td>
    </tr>
    <tr>
      <td colspan="11" class="brand-note">Dokumen Ekspor Resmi Sistem Point of Sale (POS) 1966 Caffe • Sifat Dokumen: Internal & Rahasia</td>
    </tr>
    <tr><td colspan="11" style="height:10px;"></td></tr>

    <tr>
      <td colspan="2" class="meta-label">Periode Laporan:</td>
      <td colspan="3" class="meta-val"><strong>${result.periodLabel}</strong></td>
      <td colspan="2" class="meta-label">Filter Karyawan:</td>
      <td colspan="4" class="meta-val"><strong>${result.userLabel}</strong></td>
    </tr>
    <tr>
      <td colspan="2" class="meta-label">Dicetak Pada:</td>
      <td colspan="3" class="meta-val">${exportDate}</td>
      <td colspan="2" class="meta-label">Operator / Kasir:</td>
      <td colspan="4" class="meta-val">${printedBy}</td>
    </tr>
    <tr><td colspan="11" style="height:12px;"></td></tr>

    <tr>
      <td colspan="2" class="kpi-box" style="background-color:#F1F5F9; color:#0F172A;">
        TOTAL KEHADIRAN<br><span style="font-size:13pt; color:#4B151E;">${result.total}</span> Catatan
      </td>
      <td colspan="3" class="kpi-box" style="background-color:#F0FDF4; color:#166534;">
        TEPAT WAKTU<br><span style="font-size:13pt; color:#15803D;">${result.onTimeCount}</span> Sesi (${result.total > 0 ? Math.round((result.onTimeCount / result.total) * 100) : 0}%)
      </td>
      <td colspan="3" class="kpi-box" style="background-color:#FEF2F2; color:#991B1B;">
        TERLAMBAT<br><span style="font-size:13pt; color:#B91C1C;">${result.lateCount}</span> Sesi (${result.total > 0 ? Math.round((result.lateCount / result.total) * 100) : 0}%)
      </td>
      <td colspan="3" class="kpi-box" style="background-color:#EFF6FF; color:#1E40AF;">
        TOTAL DURASI KERJA<br><span style="font-size:13pt; color:#1D4ED8;">${result.totalHoursAccum}</span> Jam
      </td>
    </tr>
    <tr><td colspan="11" style="height:14px;"></td></tr>

    <tr>
      <th class="th-col" style="width:40px;">No</th>
      <th class="th-col" style="width:160px;">Nama Karyawan</th>
      <th class="th-col" style="width:90px;">Role</th>
      <th class="th-col" style="width:110px;">Tanggal</th>
      <th class="th-col" style="width:150px;">Jadwal Shift</th>
      <th class="th-col" style="width:90px;">Jam Masuk</th>
      <th class="th-col" style="width:90px;">Jam Pulang</th>
      <th class="th-col" style="width:100px;">Durasi Kerja</th>
      <th class="th-col" style="width:140px;">Status Kehadiran</th>
      <th class="th-col" style="width:110px;">Keterlambatan</th>
      <th class="th-col" style="width:180px;">Catatan Tambahan</th>
    </tr>
  `;

  list.forEach((rec, idx) => {
    const isZebra = idx % 2 === 1 ? 'zebra' : '';
    const isClockedOut = Boolean(rec.clockOutTime);
    let statusClass = 'pill-ontime';
    let statusText = 'Tepat Waktu';

    if (rec.clockInStatus === 'LATE') {
      statusClass = 'pill-late';
      statusText = `Terlambat ${rec.lateMinutes || 0} Menit`;
    } else if (isClockedOut) {
      statusClass = 'pill-ontime';
      statusText = 'Tepat Waktu (Selesai)';
    }

    const lateText = rec.lateMinutes && rec.lateMinutes > 0 ? `${rec.lateMinutes} Menit` : '0 Menit';
    const safeNotes = rec.notes ? rec.notes.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '-';
    const roleText = rec.userRole === 'ADMIN' ? 'Administrator' : 'Kasir / Staf';

    html += `
    <tr class="${isZebra}">
      <td class="td-cell td-center">${idx + 1}</td>
      <td class="td-cell td-bold">${rec.userName || '-'}</td>
      <td class="td-cell td-center">${roleText}</td>
      <td class="td-cell td-center">${rec.date || '-'}</td>
      <td class="td-cell">${rec.shiftName || 'Shift Kafe'}</td>
      <td class="td-cell td-center td-bold">${rec.clockInTime || '-'}</td>
      <td class="td-cell td-center">${rec.clockOutTime || 'Sedang Bertugas'}</td>
      <td class="td-cell td-center">${rec.totalWorkDuration || '-'}</td>
      <td class="td-cell td-center ${statusClass}">${statusText}</td>
      <td class="td-cell td-center">${lateText}</td>
      <td class="td-cell">${safeNotes}</td>
    </tr>
    `;
  });

  html += `
    <tr><td colspan="11" style="height:25px;"></td></tr>
    <tr>
      <td colspan="4" class="sig-title">Dibuat Oleh:</td>
      <td colspan="3"></td>
      <td colspan="4" class="sig-title">Mengetahui / Disetujui:</td>
    </tr>
    <tr>
      <td colspan="4" class="sig-line">(${printedBy})<br><span style="font-size:9pt; font-weight:normal; color:#786E6E;">Kasir / Admin Operasional</span></td>
      <td colspan="3"></td>
      <td colspan="4" class="sig-line">( Manager Operasional / Owner )<br><span style="font-size:9pt; font-weight:normal; color:#786E6E;">1966 Caffe Management</span></td>
    </tr>
  </table>
</body>
</html>
  `;

  const filename = `Rekap_Absensi_1966Caffe_${new Date().toISOString().split('T')[0]}.xls`;
  await saveFileToLocalDevice(filename, '\ufeff' + html, 'application/vnd.ms-excel');
  showToast('Laporan Excel (.xls) berhasil diekspor dengan format rapi!', 'success');
}

async function exportAttendancePDF() {
  const result = getFilteredAttendanceData();
  const list = result.data;
  if (!list || list.length === 0) {
    showToast('Belum ada data absensi untuk dicetak pada filter ini!', 'warning');
    return;
  }

  try {
    showToast('Menyiapkan dokumen PDF Laporan Kehadiran...', 'info');

    // Menggunakan A4 Landscape agar seluruh 10 kolom laporan audit presensi muat lapang & rapi
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.width; // 297mm
    const pageHeight = doc.internal.pageSize.height; // 210mm
    const marginX = 14;

    // 1. Brand Logo & Header
    if (RAYA_LOGO_BLACK) {
      try {
        doc.addImage(RAYA_LOGO_BLACK, 'PNG', marginX, 10, 24, 18);
      } catch (imgErr) {
        console.warn('Logo image render warning in attendance PDF:', imgErr);
      }
    }

    const titleLeft = RAYA_LOGO_BLACK ? 42 : marginX;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(75, 21, 30); // Primary Burgundy #4B151E
    doc.text('1966 CAFFE', titleLeft, 16);

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(36, 20, 22); // Deep Charcoal #241416
    doc.text('LAPORAN REKAPITULASI & AUDIT KEHADIRAN KARYAWAN', titleLeft, 22);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 110, 110);
    doc.text('Specialty Coffee & Eatery • Sistem Presensi Digital & Verifikasi Terpadu', titleLeft, 27);

    // Decorative Dual Header Line (Burgundy & Terracotta)
    doc.setDrawColor(75, 21, 30);
    doc.setLineWidth(0.6);
    doc.line(marginX, 30, pageWidth - marginX, 30);

    doc.setDrawColor(184, 93, 54);
    doc.setLineWidth(0.3);
    doc.line(marginX, 31, pageWidth - marginX, 31);

    // 2. Metadata Parameter Box
    const metaY = 34;
    const metaHeight = 11;
    doc.setFillColor(251, 248, 245); // Warm subtle
    doc.setDrawColor(232, 220, 209);
    doc.setLineWidth(0.2);
    doc.roundedRect(marginX, metaY, pageWidth - (marginX * 2), metaHeight, 1.5, 1.5, 'FD');

    const now = new Date();
    const exportTimestamp = now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const printedBy = currentUser ? `${currentUser.name} (${currentUser.role})` : 'Administrator POS';

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(110, 98, 89);
    doc.text('PERIODE:', marginX + 4, metaY + 4.5);
    doc.text('FILTER STAF:', marginX + 75, metaY + 4.5);
    doc.text('DICETAK PADA:', marginX + 150, metaY + 4.5);
    doc.text('OPERATOR:', marginX + 215, metaY + 4.5);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(36, 20, 22);
    doc.text(result.periodLabel, marginX + 4, metaY + 8.5);
    doc.text(result.userLabel, marginX + 75, metaY + 8.5);
    doc.text(exportTimestamp, marginX + 150, metaY + 8.5);
    doc.text(printedBy, marginX + 215, metaY + 8.5);

    // 3. KPI Executive Summary Cards
    const kpiY = 47;
    const kpiHeight = 12.5;
    const totalAvailWidth = pageWidth - (marginX * 2);
    const kpiGap = 4;
    const kpiWidth = (totalAvailWidth - (3 * kpiGap)) / 4;

    const pctOnTime = result.total > 0 ? Math.round((result.onTimeCount / result.total) * 100) : 0;
    const pctLate = result.total > 0 ? Math.round((result.lateCount / result.total) * 100) : 0;

    // Card 1: Total
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(marginX, kpiY, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL KEHADIRAN', marginX + 4, kpiY + 4.5);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(75, 21, 30);
    doc.text(`${result.total} Catatan`, marginX + 4, kpiY + 9.5);

    // Card 2: On Time
    const kpi2X = marginX + kpiWidth + kpiGap;
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(kpi2X, kpiY, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(22, 101, 52);
    doc.text('TEPAT WAKTU', kpi2X + 4, kpiY + 4.5);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(21, 128, 61);
    doc.text(`${result.onTimeCount} Sesi (${pctOnTime}%)`, kpi2X + 4, kpiY + 9.5);

    // Card 3: Late
    const kpi3X = kpi2X + kpiWidth + kpiGap;
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(kpi3X, kpiY, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(153, 27, 27);
    doc.text('TERLAMBAT', kpi3X + 4, kpiY + 4.5);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);
    doc.text(`${result.lateCount} Sesi (${pctLate}%)`, kpi3X + 4, kpiY + 9.5);

    // Card 4: Hours
    const kpi4X = kpi3X + kpiWidth + kpiGap;
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(kpi4X, kpiY, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(30, 64, 175);
    doc.text('TOTAL JAM KERJA', kpi4X + 4, kpiY + 4.5);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(29, 78, 216);
    doc.text(`${result.totalHoursAccum} Jam Terakumulasi`, kpi4X + 4, kpiY + 9.5);

    // 4. Data Table (autoTable)
    const headers = [['No', 'Nama Karyawan', 'Role', 'Tanggal', 'Jadwal Shift', 'Masuk', 'Pulang', 'Durasi', 'Status Kehadiran', 'Catatan']];
    const rows = list.map((a, idx) => {
      let statusText = 'Tepat Waktu';
      if (a.clockInStatus === 'LATE') {
        statusText = `Terlambat ${a.lateMinutes || 0}m`;
      } else if (a.clockOutTime) {
        statusText = 'Tepat Waktu (Selesai)';
      } else {
        statusText = 'Tepat Waktu (Bertugas)';
      }

      return [
        idx + 1,
        a.userName || '-',
        a.userRole === 'ADMIN' ? 'Admin' : 'Kasir',
        a.date || '-',
        a.shiftName || 'Shift Kafe',
        a.clockInTime || '-',
        a.clockOutTime || 'Bertugas',
        a.totalWorkDuration || '-',
        statusText,
        a.notes || '-'
      ];
    });

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 62,
      margin: { left: marginX, right: marginX, bottom: 22 },
      headStyles: {
        fillColor: [75, 21, 30], // #4B151E Burgundy
        textColor: 255,
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 3
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.2,
        textColor: [36, 20, 22],
        lineColor: [232, 220, 209],
        lineWidth: 0.1,
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 40, fontStyle: 'bold' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 24, halign: 'center' },
        4: { cellWidth: 38 },
        5: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
        6: { cellWidth: 20, halign: 'center' },
        7: { cellWidth: 20, halign: 'center' },
        8: { cellWidth: 36, halign: 'center' },
        9: { cellWidth: 43 }
      },
      alternateRowStyles: {
        fillColor: [252, 250, 248]
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 8) {
          const val = String(data.cell.raw || '');
          if (val.includes('Terlambat')) {
            data.cell.styles.fillColor = [254, 242, 242];
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = 'bold';
          } else if (val.includes('Tepat Waktu')) {
            data.cell.styles.fillColor = [240, 253, 244];
            data.cell.styles.textColor = [21, 128, 61];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 110, 110);
        doc.text(
          'Dokumen Rekapitulasi & Audit Kehadiran Resmi 1966 Caffe • Sifat: Dokumen Internal & Rahasia',
          marginX,
          pageHeight - 7
        );
        doc.text(
          `Halaman ${data.pageNumber} dari ${pageCount}`,
          pageWidth - marginX - 25,
          pageHeight - 7
        );
      }
    });

    // 5. Verification & Signature Block
    let finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 8 : 120;
    if (finalY + 30 > pageHeight - 15) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(36, 20, 22);

    const sigCol1X = marginX + 15;
    const sigCol2X = pageWidth - marginX - 65;

    doc.text('Dibuat Oleh:', sigCol1X, finalY);
    doc.text('Mengetahui / Menyetujui:', sigCol2X, finalY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 100, 100);
    doc.text('Kasir / Admin Operasional', sigCol1X, finalY + 4);
    doc.text('Manager Operasional / Owner', sigCol2X, finalY + 4);

    doc.setDrawColor(180, 180, 180);
    doc.line(sigCol1X, finalY + 18, sigCol1X + 45, finalY + 18);
    doc.line(sigCol2X, finalY + 18, sigCol2X + 50, finalY + 18);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(36, 20, 22);
    doc.text(`( ${printedBy} )`, sigCol1X, finalY + 22);
    doc.text('( 1966 Caffe Management )', sigCol2X, finalY + 22);

    const pdfDataUri = doc.output('datauristring');
    const pdfBase64 = pdfDataUri.split(',')[1];
    const filename = `Laporan_Absensi_1966Caffe_${new Date().toISOString().split('T')[0]}.pdf`;
    await saveFileToLocalDevice(filename, pdfBase64, 'application/pdf', true);
    showToast('Laporan PDF Kehadiran berhasil dibuat & diunduh!', 'success');
  } catch (err) {
    console.error('Gagal cetak PDF absensi:', err);
    showToast('Gagal mencetak PDF absensi.', 'error');
  }
}

// 8. Kelola Jadwal Shift Kerja (CRUD Admin)
function openShiftManagerModal() {
  renderShiftManagerList();
  closeShiftEditForm();
  const modal = document.getElementById('modal-manage-shifts');
  if (modal) modal.classList.add('show');
}

function closeShiftManagerModal() {
  const modal = document.getElementById('modal-manage-shifts');
  if (modal) modal.classList.remove('show');
}

function renderShiftManagerList() {
  const container = document.getElementById('shift-manager-list');
  if (!container) return;

  if (workShifts.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:20px; color:var(--text-muted); font-size:12.5px;">
        Belum ada jadwal shift. Klik "Tambah Shift Baru" atau "Reset Default".
      </div>`;
    return;
  }

  container.innerHTML = workShifts.map(s => `
    <div class="shift-item-card" data-id="${s.id}">
      <div class="shift-item-info">
        <div class="shift-item-title">${s.name}</div>
        <div class="shift-item-time">
          <i data-lucide="clock" style="width:13px; height:13px; color:var(--primary);"></i>
          <strong>${s.startTime} - ${s.endTime}</strong>
          <span class="shift-item-grace-badge">Toleransi ${s.graceMinutes || 0} mnt</span>
        </div>
      </div>
      <div class="shift-item-actions">
        <button type="button" class="btn-table-action view btn-edit-shift" data-id="${s.id}" title="Edit Jadwal">
          <i data-lucide="edit-3"></i>
        </button>
        <button type="button" class="btn-table-action delete btn-del-shift" data-id="${s.id}" title="Hapus Shift">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();

  container.querySelectorAll('.btn-edit-shift').forEach(btn => {
    btn.onclick = () => openShiftEditForm(btn.dataset.id);
  });

  container.querySelectorAll('.btn-del-shift').forEach(btn => {
    btn.onclick = () => deleteShift(btn.dataset.id);
  });
}

function openShiftEditForm(shiftId = null) {
  const formCard = document.getElementById('shift-form-card');
  const titleEl = document.getElementById('shift-form-title');
  const idInput = document.getElementById('shift-form-id');
  const nameInput = document.getElementById('shift-form-name');
  const startInput = document.getElementById('shift-form-start');
  const endInput = document.getElementById('shift-form-end');
  const graceInput = document.getElementById('shift-form-grace');
  if (!formCard) return;

  if (shiftId) {
    const s = workShifts.find(x => x.id === shiftId);
    if (!s) return;
    titleEl.textContent = 'Edit Jadwal Shift';
    idInput.value = s.id;
    nameInput.value = s.name;
    startInput.value = s.startTime;
    endInput.value = s.endTime;
    graceInput.value = s.graceMinutes ?? 15;
  } else {
    titleEl.textContent = 'Tambah Shift Baru';
    idInput.value = '';
    nameInput.value = '';
    startInput.value = '08:00';
    endInput.value = '16:00';
    graceInput.value = 15;
  }

  formCard.style.display = 'block';
  nameInput.focus();
}

function closeShiftEditForm() {
  const formCard = document.getElementById('shift-form-card');
  if (formCard) formCard.style.display = 'none';
}

function saveShiftForm() {
  const idInput = document.getElementById('shift-form-id');
  const nameInput = document.getElementById('shift-form-name');
  const startInput = document.getElementById('shift-form-start');
  const endInput = document.getElementById('shift-form-end');
  const graceInput = document.getElementById('shift-form-grace');

  const name = (nameInput.value || '').trim();
  const startTime = startInput.value;
  const endTime = endInput.value;
  let graceMinutes = parseInt(graceInput.value);
  if (isNaN(graceMinutes) || graceMinutes < 0) graceMinutes = 0;
  if (graceMinutes > 120) graceMinutes = 120;

  if (!name) {
    showToast('Nama shift wajib diisi!', 'error');
    nameInput.focus();
    return;
  }
  if (!startTime || !endTime) {
    showToast('Jam mulai dan jam selesai wajib diisi!', 'error');
    return;
  }

  const existingId = idInput.value;
  if (existingId) {
    const idx = workShifts.findIndex(s => s.id === existingId);
    if (idx !== -1) {
      workShifts[idx] = {
        ...workShifts[idx],
        name,
        startTime,
        endTime,
        graceMinutes
      };
      showToast(`Jadwal "${name}" berhasil diperbarui!`, 'success');
    }
  } else {
    const newId = 'SHIFT_' + Date.now();
    workShifts.push({
      id: newId,
      name,
      startTime,
      endTime,
      graceMinutes
    });
    showToast(`Shift "${name}" berhasil ditambahkan!`, 'success');
  }

  saveWorkShifts();
  renderShiftManagerList();
  renderShiftSelectOptions();
  closeShiftEditForm();
}

function deleteShift(shiftId) {
  const s = workShifts.find(x => x.id === shiftId);
  if (!s) return;

  if (workShifts.length <= 1) {
    showToast('Minimal harus ada 1 shift aktif!', 'error');
    return;
  }

  if (confirm(`Hapus jadwal "${s.name}"?`)) {
    workShifts = workShifts.filter(x => x.id !== shiftId);
    saveWorkShifts();
    renderShiftManagerList();
    renderShiftSelectOptions();
    showToast(`Shift "${s.name}" dihapus.`, 'info');
  }
}

function resetDefaultShifts() {
  if (confirm('Kembalikan konfigurasi shift ke jadwal default 1966 Caffe (Pagi, Siang, General)?')) {
    workShifts = [...DEFAULT_SHIFTS];
    saveWorkShifts();
    renderShiftManagerList();
    renderShiftSelectOptions();
    closeShiftEditForm();
    showToast('Jadwal shift direset ke default.', 'info');
  }
}

// 9. Event Listeners Wiring untuk Fitur Absensi & Shift
const btnOpenManageShifts = document.getElementById('btn-open-manage-shifts');
if (btnOpenManageShifts) {
  btnOpenManageShifts.addEventListener('click', openShiftManagerModal);
}

const btnCloseManageShifts = document.getElementById('btn-close-manage-shifts');
if (btnCloseManageShifts) {
  btnCloseManageShifts.addEventListener('click', closeShiftManagerModal);
}

const btnAddNewShift = document.getElementById('btn-add-new-shift');
if (btnAddNewShift) {
  btnAddNewShift.addEventListener('click', () => openShiftEditForm(null));
}

const btnCancelShiftForm = document.getElementById('btn-cancel-shift-form');
if (btnCancelShiftForm) {
  btnCancelShiftForm.addEventListener('click', closeShiftEditForm);
}

const btnSaveShiftForm = document.getElementById('btn-save-shift-form');
if (btnSaveShiftForm) {
  btnSaveShiftForm.addEventListener('click', saveShiftForm);
}

const btnResetDefaultShifts = document.getElementById('btn-reset-default-shifts');
if (btnResetDefaultShifts) {
  btnResetDefaultShifts.addEventListener('click', resetDefaultShifts);
}
// --- STANDALONE SECURE ATTENDANCE KIOSK CONTROLS ---

function enterStandaloneAttendanceKiosk() {
  document.body.classList.add('standalone-kiosk-mode');
  cancelKioskAutoReturn();

  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('main-app').style.display = 'flex';

  pageViews.forEach(p => p.classList.remove('active'));
  navItems.forEach(n => n.classList.remove('active'));

  const attPage = document.getElementById('attendance');
  const attNav = document.getElementById('nav-btn-attendance');
  if (attPage) attPage.classList.add('active');
  if (attNav) attNav.classList.add('active');

  const pinInput = document.getElementById('att-input-pin');
  if (pinInput) pinInput.value = '';

  renderAttendanceKiosk();
}

function exitStandaloneAttendanceKiosk() {
  cancelKioskAutoReturn();
  document.body.classList.remove('standalone-kiosk-mode');

  if (typeof closeAttendanceCameraModal === 'function') {
    closeAttendanceCameraModal();
  }
  const photoDetailModal = document.getElementById('modal-attendance-photo-detail');
  if (photoDetailModal) photoDetailModal.classList.remove('show');

  const pinInput = document.getElementById('att-input-pin');
  if (pinInput) pinInput.value = '';

  document.getElementById('main-app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
}

const btnQuickAtt = document.getElementById('btn-login-quick-attendance');
if (btnQuickAtt) {
  btnQuickAtt.addEventListener('click', enterStandaloneAttendanceKiosk);
}

const btnKioskBackToLogin = document.getElementById('btn-kiosk-back-to-login');
if (btnKioskBackToLogin) {
  btnKioskBackToLogin.addEventListener('click', exitStandaloneAttendanceKiosk);
}

const selectAttUser = document.getElementById('att-select-user');
if (selectAttUser) {
  selectAttUser.addEventListener('change', () => {
    updateKioskStatusForSelectedUser();
  });
}

const btnClockInTrigger = document.getElementById('btn-trigger-clockin');
if (btnClockInTrigger) {
  btnClockInTrigger.addEventListener('click', handleTriggerClockIn);
}

const btnClockOutTrigger = document.getElementById('btn-trigger-clockout');
if (btnClockOutTrigger) {
  btnClockOutTrigger.addEventListener('click', handleTriggerClockOut);
}

const btnTakeSelfie = document.getElementById('btn-take-selfie');
if (btnTakeSelfie) {
  btnTakeSelfie.addEventListener('click', captureSelfiePhoto);
}

const btnRetakeSelfie = document.getElementById('btn-retake-selfie');
if (btnRetakeSelfie) {
  btnRetakeSelfie.addEventListener('click', retakeSelfiePhoto);
}

const btnConfirmSaveSelfie = document.getElementById('btn-confirm-save-selfie');
if (btnConfirmSaveSelfie) {
  btnConfirmSaveSelfie.addEventListener('click', saveConfirmedAttendance);
}

const btnCloseCameraModal = document.getElementById('btn-close-camera-modal');
if (btnCloseCameraModal) {
  btnCloseCameraModal.addEventListener('click', closeAttendanceCameraModal);
}

const btnUseFallbackUpload = document.getElementById('btn-use-fallback-upload');
const fallbackFileInput = document.getElementById('att-camera-file-input');
if (btnUseFallbackUpload && fallbackFileInput) {
  btnUseFallbackUpload.addEventListener('click', () => {
    fallbackFileInput.click();
  });
  fallbackFileInput.addEventListener('change', handleFallbackFileInput);
}

const btnRefreshAttToday = document.getElementById('btn-refresh-att-today');
if (btnRefreshAttToday) {
  btnRefreshAttToday.addEventListener('click', () => {
    renderTodayAttendanceList();
    showToast('Data kehadiran hari ini disegarkan.', 'info');
  });
}

const btnClosePhotoDetail = document.getElementById('btn-close-photo-detail');
if (btnClosePhotoDetail) {
  btnClosePhotoDetail.addEventListener('click', closeAttendancePhotoDetail);
}

const periodFilterEl = document.getElementById('att-report-period');
if (periodFilterEl) {
  periodFilterEl.addEventListener('change', renderAttendanceReport);
}

const userFilterEl = document.getElementById('att-report-user-filter');
if (userFilterEl) {
  userFilterEl.addEventListener('change', renderAttendanceReport);
}

const btnExportExcel = document.getElementById('btn-export-att-excel');
if (btnExportExcel) {
  btnExportExcel.addEventListener('click', exportAttendanceExcel);
}

const btnExportPDF = document.getElementById('btn-export-att-pdf');
if (btnExportPDF) {
  btnExportPDF.addEventListener('click', exportAttendancePDF);
}

// Initial Bootstrapping
renderPOS();
updateCart();
renderMenuTable();
renderHistory();
renderExpense();
renderTaxes();
renderReports();
renderUsers();
renderAttendanceKiosk();
updateDashboardStats();
