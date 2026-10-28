const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const QRCode = require('qrcode');
const os = require('os');
const crypto = require('crypto');

// Load environment variables from .env if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim().replace(/(^["']|["']$)/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    });
  } catch (e) {
    console.error('Error reading .env file:', e.message);
  }
}

// Staff PIN & Authentication Security
const STAFF_PIN = (process.env.STAFF_PIN || '1234').toString().trim();
const STAFF_SECRET = process.env.STAFF_SECRET || crypto.randomBytes(32).toString('hex');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  if (!password || !hash || !salt) return false;
  try {
    const check = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
  } catch (e) {
    return false;
  }
}

const defaultAdminCreds = hashPassword('admin123', 'tablemint_static_salt_2026');
const defaultUsers = [
  {
    id: 'user_admin',
    name: 'Admin Manager',
    email: 'admin@tablemint.com',
    hash: defaultAdminCreds.hash,
    salt: defaultAdminCreds.salt,
    role: 'admin',
    restaurantName: 'TableMint',
    createdAt: new Date().toISOString()
  }
];

function generateUserToken(user) {
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'admin',
    restaurantName: user.restaurantName || 'TableMint',
    time: Date.now()
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', STAFF_SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

function verifyUserToken(token) {
  if (!token || typeof token !== 'string') return null;
  if (token === STAFF_PIN) {
    return { id: 'staff_pin', name: 'POS Floor Staff', email: 'staff@tablemint.local', role: 'staff', restaurantName: 'TableMint' };
  }
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  try {
    const expected = crypto.createHmac('sha256', STAFF_SECRET).update(payload).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
    if (payload.startsWith('staff-')) {
      return { id: 'staff_pin', name: 'POS Floor Staff', email: 'staff@tablemint.local', role: 'staff', restaurantName: 'TableMint' };
    }
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return decoded;
  } catch (e) {
    return null;
  }
}

function generateStaffToken() {
  return generateUserToken({
    id: 'staff_pin',
    name: 'POS Floor Staff',
    email: 'staff@tablemint.local',
    role: 'staff',
    restaurantName: 'TableMint'
  });
}

function verifyStaffToken(token) {
  return Boolean(verifyUserToken(token));
}

function requireStaffAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const token = req.headers['x-staff-token'] || req.headers['x-auth-token'] || req.query.staff_token || bearerToken;
  const user = verifyUserToken(token);
  if (user) {
    req.user = user;
    return next();
  }
  return res.status(401).json({
    error: 'UNAUTHORIZED_STAFF',
    message: 'Authentication required. Please sign in or enter valid Staff PIN.'
  });
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH']
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
// Prevent aggressive browser caching of dashboard JS/CSS
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Serve React Vite dist build from frontend/dist
const distDir = fs.existsSync(path.join(__dirname, '..', 'frontend', 'dist'))
  ? path.join(__dirname, '..', 'frontend', 'dist')
  : path.join(__dirname, 'dist');
app.use(express.static(distDir));
app.use('/images', express.static(path.join(distDir, 'images')));

// SPA Fallback for all navigation routes
app.get(['/', '/dashboard', '/kitchen', '/admin', '/qr-stands', '/customer'], (req, res) => {
  const indexPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).send('React Vite build not found. Please run npm run build.');
});

// Helper to determine local network IP for real phone scanning
function getLocalIpAddress() {
  if (process.env.VERCEL) return 'localhost';
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254.')) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIpAddress();

// Bundled fallback data for serverless deployment
const defaultMenu = require('./data/menu.json');
const defaultTables = require('./data/tables.json');
const defaultOrders = require('./data/orders.json');

// Data file paths
const DEFAULT_DATA_DIR = path.join(__dirname, 'data');
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'data') : DEFAULT_DATA_DIR;

// Seed data files into /tmp if running on Vercel
if (process.env.VERCEL) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    console.error('Failed to initialize /tmp data dir on Vercel:', e);
  }
}

const MENU_FILE = path.join(DATA_DIR, 'menu.json');
const TABLES_FILE = path.join(DATA_DIR, 'tables.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const defaultSettings = {
  restaurantName: 'TableMint',
  tagline: 'Smart QR Dining & POS',
  phone: '+91 98765 43210',
  email: 'contact@tablemint.com',
  address: 'MG Road, Pune, Maharashtra 411001',
  currency: '₹',
  taxRate: 5,
  serviceCharge: 0,
  upiId: 'tablemint@upi',
  upiPayeeName: 'TableMint Restaurant',
  upiQrEnabled: true,
  acceptedPaymentMethods: ['UPI', 'Cash', 'Card'],
  soundAlerts: true,
  autoAcceptOrders: false,
  sessionTimeoutHours: 3
};

// Read & Write helpers
function readData(file, fallback = []) {
  try {
    if (!fs.existsSync(file)) {
      if (file.includes('menu.json')) return defaultMenu;
      if (file.includes('tables.json')) return defaultTables;
      if (file.includes('orders.json')) return defaultOrders;
      if (file.includes('users.json')) return defaultUsers;
      if (file.includes('settings.json')) return defaultSettings;
      return fallback;
    }
    const content = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(content || '[]');
    if (Array.isArray(parsed) && parsed.length === 0) {
      if (file.includes('menu.json')) return defaultMenu;
      if (file.includes('tables.json')) return defaultTables;
      if (file.includes('users.json')) return defaultUsers;
    }
    return parsed;
  } catch (err) {
    if (file.includes('menu.json')) return defaultMenu;
    if (file.includes('tables.json')) return defaultTables;
    if (file.includes('orders.json')) return defaultOrders;
    if (file.includes('users.json')) return defaultUsers;
    if (file.includes('settings.json')) return defaultSettings;
    return fallback;
  }
}

function writeData(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error writing ${file}:`, err);
  }
}

function getUsers() {
  const users = readData(USERS_FILE, defaultUsers);
  if (!users || !Array.isArray(users) || users.length === 0) {
    writeData(USERS_FILE, defaultUsers);
    return defaultUsers;
  }
  return users;
}

function saveUsers(users) {
  writeData(USERS_FILE, users);
}

function getSettings() {
  const current = readData(SETTINGS_FILE, defaultSettings);
  if (!current || typeof current !== 'object' || Array.isArray(current)) {
    writeData(SETTINGS_FILE, defaultSettings);
    return defaultSettings;
  }
  return { ...defaultSettings, ...current };
}

function saveSettings(settings) {
  const merged = { ...getSettings(), ...settings, updatedAt: new Date().toISOString() };
  writeData(SETTINGS_FILE, merged);
  return merged;
}

// Session Token Helpers for Anti-Prank & Location Protection
function generateTableToken(tableId) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `T${tableId}-${rand}`;
}

function ensureTableTokens() {
  const tables = readData(TABLES_FILE);
  let modified = false;
  tables.forEach(t => {
    if (!t.sessionToken) {
      t.sessionToken = generateTableToken(t.id);
      t.tokenCreatedAt = new Date().toISOString();
      modified = true;
    }
  });
  if (modified) {
    writeData(TABLES_FILE, tables);
  }
}
ensureTableTokens();

// ----------------- API Endpoints -----------------

// Authentication Endpoints (Sign In, Sign Up, Quick PIN)
app.post('/api/auth/signup', (req, res) => {
  try {
    const { name, email, password, restaurantName, role } = req.body || {};
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Please enter your name (at least 2 characters).' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const users = getUsers();
    const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, error: 'An account with this email address already exists. Please sign in instead.' });
    }

    const { hash, salt } = hashPassword(password);
    const newUser = {
      id: `user_${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      hash,
      salt,
      role: role === 'staff' ? 'staff' : 'admin',
      restaurantName: (restaurantName || 'TableMint').trim(),
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    const safeUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      restaurantName: newUser.restaurantName
    };
    const token = generateUserToken(safeUser);

    res.status(201).json({
      success: true,
      token,
      user: safeUser,
      message: 'Account created successfully! Welcome to TableMint.'
    });
  } catch (err) {
    console.error('Error during signup:', err);
    res.status(500).json({ success: false, error: 'Internal server error during account creation.' });
  }
});

app.post('/api/auth/signin', (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide both email and password.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user || !verifyPassword(password, user.hash, user.salt)) {
      return res.status(401).json({ success: false, error: 'Invalid email address or password. Please try again.' });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      restaurantName: user.restaurantName
    };
    const token = generateUserToken(safeUser);

    res.json({
      success: true,
      token,
      user: safeUser,
      message: 'Signed in successfully. Welcome back!'
    });
  } catch (err) {
    console.error('Error during signin:', err);
    res.status(500).json({ success: false, error: 'Internal server error during sign in.' });
  }
});

app.post('/api/auth/verify-pin', (req, res) => {
  return res.status(403).json({ success: false, error: 'Staff PIN login is disabled. Please log in with your email and password.' });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers['x-staff-token'] || req.query.staff_token;
  const user = verifyUserToken(token);
  if (!user) {
    return res.status(401).json({ authenticated: false, error: 'Not authenticated' });
  }
  res.json({ authenticated: true, user });
});

app.get('/api/auth/check', (req, res) => {
  const token = req.headers['x-staff-token'] || req.query.staff_token;
  const user = verifyUserToken(token);
  res.json({ authenticated: Boolean(user), user: user || null });
});

// PATCH /api/auth/profile - Update user profile details
app.patch('/api/auth/profile', requireStaffAuth, (req, res) => {
  try {
    const { name, restaurantName } = req.body || {};
    const token = req.headers['x-staff-token'] || req.query.staff_token;
    const currentUser = verifyUserToken(token);
    if (!currentUser) {
      return res.status(401).json({ success: false, error: 'Unauthorized user session.' });
    }

    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    if (name && name.trim().length >= 2) {
      users[userIndex].name = name.trim();
    }
    if (restaurantName && restaurantName.trim().length >= 2) {
      users[userIndex].restaurantName = restaurantName.trim();
    }

    saveUsers(users);

    const safeUser = {
      id: users[userIndex].id,
      name: users[userIndex].name,
      email: users[userIndex].email,
      role: users[userIndex].role,
      restaurantName: users[userIndex].restaurantName
    };
    const freshToken = generateUserToken(safeUser);

    res.json({
      success: true,
      user: safeUser,
      token: freshToken,
      message: 'Profile updated successfully!'
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ success: false, error: 'Failed to update profile.' });
  }
});

// POST /api/auth/change-password - Change user password securely
app.post('/api/auth/change-password', requireStaffAuth, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword) {
      return res.status(400).json({ success: false, error: 'Please enter your current password.' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
    }

    const token = req.headers['x-staff-token'] || req.query.staff_token;
    const currentUser = verifyUserToken(token);
    if (!currentUser) {
      return res.status(401).json({ success: false, error: 'Unauthorized user session.' });
    }

    const users = getUsers();
    let targetUser = users.find(u => u.id === currentUser.id);
    if (!targetUser) {
      if (currentUser.id === 'staff_pin') {
        // Fallback to default admin if accessed from quick PIN station
        targetUser = users.find(u => u.role === 'admin') || users[0];
      }
    }

    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    // Verify current password
    const isCurrentValid = verifyPassword(currentPassword, targetUser.hash, targetUser.salt);
    if (!isCurrentValid) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect. Please try again.' });
    }

    // Hash and store new password
    const { hash, salt } = hashPassword(newPassword);
    targetUser.hash = hash;
    targetUser.salt = salt;
    targetUser.updatedAt = new Date().toISOString();

    saveUsers(users);

    res.json({
      success: true,
      message: 'Password changed successfully! Keep your new password secure.'
    });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ success: false, error: 'Failed to change password. Please try again.' });
  }
});

// Get Restaurant Settings (Public for both Admin and Customer)
app.get('/api/settings', (req, res) => {
  res.json(getSettings());
});

// Update Settings (Staff Protected)
app.post(['/api/settings', '/api/settings/update'], requireStaffAuth, (req, res) => {
  const updated = saveSettings(req.body || {});
  io.emit('settings:updated', updated);
  res.json({ success: true, settings: updated });
});

// Server info & host URLs for QR generation
app.get('/api/info', (req, res) => {
  const isVercel = Boolean(process.env.VERCEL);
  const host = req.headers.host || `localhost:${PORT}`;
  const isHttps = isVercel || req.headers['x-forwarded-proto'] === 'https' || (!host.includes('localhost') && !host.includes('127.0.0.1'));
  const protocol = isHttps ? 'https' : 'http';

  res.json({
    localIp: isVercel ? host : LOCAL_IP,
    port: PORT,
    localBaseUrl: isVercel ? `${protocol}://${host}` : `http://${LOCAL_IP}:${PORT}`,
    browserBaseUrl: `${protocol}://${host}`,
    isCloud: isVercel || (!host.includes('localhost') && !host.includes('127.0.0.1'))
  });
});

// Menu Endpoints (CRUD)
app.get('/api/menu', (req, res) => {
  const menu = readData(MENU_FILE);
  res.json(menu);
});

// Toggle Availability (86'd)
app.patch('/api/menu/:id/toggle', requireStaffAuth, (req, res) => {
  const menu = readData(MENU_FILE);
  const item = menu.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  item.available = !item.available;
  writeData(MENU_FILE, menu);
  io.emit('menu:updated', menu);
  res.json(item);
});

// Add New Menu Item
app.post('/api/menu', requireStaffAuth, (req, res) => {
  const { name, category, price, description, image, isVeg, isSpecial, prepTime } = req.body;
  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required' });
  }

  const menu = readData(MENU_FILE);
  const newItem = {
    id: `item-${Date.now().toString().slice(-5)}`,
    name: name.trim(),
    category: (category || 'north-indian').toLowerCase(),
    price: parseFloat(price) || 0,
    description: description ? description.trim() : '',
    image: image || '/images/paneer_butter_masala.jpg',
    isVeg: isVeg !== undefined ? Boolean(isVeg) : true,
    isSpicy: false,
    isSpecial: Boolean(isSpecial),
    available: true,
    prepTime: prepTime || '10-15 mins',
    customizations: []
  };

  menu.push(newItem);
  writeData(MENU_FILE, menu);
  io.emit('menu:updated', menu);
  res.status(201).json(newItem);
});

// Update / Edit Existing Menu Item
app.put('/api/menu/:id', requireStaffAuth, (req, res) => {
  const menu = readData(MENU_FILE);
  const idx = menu.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });

  const { name, category, price, description, image, isVeg, isSpecial, prepTime } = req.body;
  menu[idx] = {
    ...menu[idx],
    name: name ? name.trim() : menu[idx].name,
    category: category ? category.toLowerCase() : menu[idx].category,
    price: price !== undefined ? parseFloat(price) : menu[idx].price,
    description: description !== undefined ? description.trim() : menu[idx].description,
    image: image || menu[idx].image,
    isVeg: isVeg !== undefined ? Boolean(isVeg) : menu[idx].isVeg,
    isSpecial: isSpecial !== undefined ? Boolean(isSpecial) : menu[idx].isSpecial,
    prepTime: prepTime || menu[idx].prepTime
  };

  writeData(MENU_FILE, menu);
  io.emit('menu:updated', menu);
  res.json(menu[idx]);
});

// Delete Menu Item
app.delete('/api/menu/:id', requireStaffAuth, (req, res) => {
  let menu = readData(MENU_FILE);
  const exists = menu.some(i => i.id === req.params.id);
  if (!exists) return res.status(404).json({ error: 'Item not found' });

  menu = menu.filter(i => i.id !== req.params.id);
  writeData(MENU_FILE, menu);
  io.emit('menu:updated', menu);
  res.json({ success: true, deletedId: req.params.id });
});

// Tables Endpoints (CRUD & Occupancy Controls)
app.post('/api/tables', requireStaffAuth, (req, res) => {
  const { name, capacity, section } = req.body;
  const tables = readData(TABLES_FILE);
  const nextId = tables.length > 0 ? Math.max(...tables.map(t => t.id || 0)) + 1 : 1;
  const newTable = {
    id: nextId,
    name: name ? name.trim() : `Table ${nextId}`,
    capacity: parseInt(capacity, 10) || 4,
    section: section ? section.trim() : 'Indoor Dining',
    status: 'available',
    manualStatus: 'vacant',
    sessionToken: generateTableToken(nextId),
    tokenCreatedAt: new Date().toISOString()
  };
  tables.push(newTable);
  writeData(TABLES_FILE, tables);
  io.emit('tables:updated', tables);
  res.status(201).json(newTable);
});

// Update / Edit Table details (Name, Capacity, Section)
app.put('/api/tables/:id', requireStaffAuth, (req, res) => {
  const tableId = parseInt(req.params.id, 10);
  const tables = readData(TABLES_FILE);
  const idx = tables.findIndex(t => t.id === tableId);
  if (idx === -1) return res.status(404).json({ error: 'Table not found' });

  const { name, capacity, section } = req.body;
  tables[idx] = {
    ...tables[idx],
    name: name ? name.trim() : tables[idx].name,
    capacity: capacity !== undefined ? parseInt(capacity, 10) : tables[idx].capacity,
    section: section ? section.trim() : tables[idx].section
  };

  writeData(TABLES_FILE, tables);
  io.emit('tables:updated', tables);
  res.json(tables[idx]);
});

// Delete Table
app.delete('/api/tables/:id', requireStaffAuth, (req, res) => {
  const tableId = parseInt(req.params.id, 10);
  let tables = readData(TABLES_FILE);
  const exists = tables.some(t => t.id === tableId);
  if (!exists) return res.status(404).json({ error: 'Table not found' });

  tables = tables.filter(t => t.id !== tableId);
  writeData(TABLES_FILE, tables);
  io.emit('tables:updated', tables);
  res.json({ success: true, deletedId: tableId });
});

// MAKE VACANT: Called when customer finishes food / settles bill
app.patch('/api/tables/:id/vacant', requireStaffAuth, (req, res) => {
  const tableId = parseInt(req.params.id, 10);
  const tables = readData(TABLES_FILE);
  const table = tables.find(t => t.id === tableId);
  if (!table) return res.status(404).json({ error: 'Table not found' });

  // Update table manual status to vacant
  table.manualStatus = 'vacant';
  table.status = 'available';
  table.lastClearedAt = new Date().toISOString();

  // ROTATE TOKEN: Old customer links/bookmarks are now expired!
  const oldToken = table.sessionToken;
  table.sessionToken = generateTableToken(table.id);
  table.tokenCreatedAt = new Date().toISOString();
  writeData(TABLES_FILE, tables);

  // Close out any active orders on this table as completed
  const orders = readData(ORDERS_FILE);
  let completedCount = 0;
  orders.forEach(order => {
    if (order.tableId === tableId && !['completed', 'cancelled'].includes(order.status)) {
      order.status = 'completed';
      order.paymentStatus = 'paid';
      order.completedAt = new Date().toISOString();
      completedCount++;
      // Notify table and kitchen
      io.to(`table_${tableId}`).emit('order:status_changed', order);
      io.to('kitchen').emit('order:status_changed', order);
      io.to('admin').emit('order:status_changed', order);
    }
  });

  if (completedCount > 0) {
    writeData(ORDERS_FILE, orders);
  }

  // Clear any active service calls for this table
  activeServiceCalls = activeServiceCalls.filter(c => c.tableId !== tableId);
  io.emit('service:updated', activeServiceCalls);

  // Broadcast table cleared and notify connected customer phones that session expired
  io.emit('tables:updated', tables);
  io.emit('table:status_changed', { tableId, status: 'vacant' });
  io.to(`table_${tableId}`).emit('table:vacated', { tableId });
  io.to(`table_${tableId}`).emit('table:session_expired', {
    tableId,
    tableName: table.name,
    message: 'Dining session has been completed by staff. Previous session links are expired.'
  });

  res.json({
    success: true,
    table,
    newToken: table.sessionToken,
    completedOrders: completedCount,
    message: `Table ${table.name} is now VACANT. New QR token generated: ${table.sessionToken}`
  });
});

// Verify Table Token & Session
app.get('/api/tables/:id/verify-token', (req, res) => {
  const tableId = parseInt(req.params.id, 10);
  const token = req.query.token;
  const tables = readData(TABLES_FILE);
  const orders = readData(ORDERS_FILE);
  let table = tables.find(t => t.id === tableId);
  if (!table) {
    table = {
      id: tableId,
      name: `Table ${tableId}`,
      capacity: 4,
      sessionToken: `T${tableId}-ACTIVE`,
      status: 'available'
    };
  }

  if (!table.sessionToken) {
    table.sessionToken = generateTableToken(table.id);
    table.tokenCreatedAt = new Date().toISOString();
    writeData(TABLES_FILE, tables);
  }

  const activeOrders = orders.filter(
    o => o.tableId === table.id && !['completed', 'cancelled'].includes(o.status)
  );
  const isOccupied = activeOrders.length > 0 || table.manualStatus === 'occupied' || table.status === 'occupied';

  // STRICT TOKEN VERIFICATION:
  // Must provide a valid token AND it must strictly match the table's current sessionToken
  const isValid = Boolean(token && typeof token === 'string' && table.sessionToken && token.trim() === table.sessionToken.trim());

  res.json({
    valid: isValid,
    tableId: table.id,
    tableName: table.name,
    status: isOccupied ? 'occupied' : 'available',
    manualStatus: table.manualStatus,
    activeToken: isValid ? table.sessionToken : undefined,
    message: isValid
      ? 'Table session is active and verified.'
      : 'Dining session has been completed by staff. Previous session links and tokens are expired. Please scan the current QR code on your table stand.'
  });
});

// Manually Regenerate Table Token (from Admin Dashboard)
app.post('/api/tables/:id/regenerate-token', requireStaffAuth, (req, res) => {
  const tableId = parseInt(req.params.id, 10);
  const tables = readData(TABLES_FILE);
  const table = tables.find(t => t.id === tableId);
  if (!table) return res.status(404).json({ error: 'Table not found' });

  table.sessionToken = generateTableToken(table.id);
  table.tokenCreatedAt = new Date().toISOString();
  writeData(TABLES_FILE, tables);

  // Invalidate any phone connected with old token
  io.to(`table_${tableId}`).emit('table:session_expired', {
    tableId,
    tableName: table.name,
    message: 'Staff refreshed the table QR code. Please scan the new QR stand on your table.'
  });
  io.emit('tables:updated', tables);

  res.json({
    success: true,
    tableId,
    newToken: table.sessionToken,
    message: `Generated fresh QR token ${table.sessionToken} for ${table.name}`
  });
});

// MARK OCCUPIED: Staff seats walk-in guests before QR scan
app.patch('/api/tables/:id/occupy', requireStaffAuth, (req, res) => {
  const tableId = parseInt(req.params.id, 10);
  const tables = readData(TABLES_FILE);
  const table = tables.find(t => t.id === tableId);
  if (!table) return res.status(404).json({ error: 'Table not found' });

  table.manualStatus = 'occupied';
  table.status = 'occupied';
  table.occupiedAt = new Date().toISOString();
  writeData(TABLES_FILE, tables);

  io.emit('tables:updated', tables);
  io.emit('table:status_changed', { tableId, status: 'occupied' });

  res.json({ success: true, table, message: `${table.name} marked as OCCUPIED.` });
});

// Get all tables with real-time occupancy status
app.get('/api/tables', (req, res) => {
  const tables = readData(TABLES_FILE);
  const orders = readData(ORDERS_FILE);
  
  const enriched = tables.map(table => {
    const activeOrders = orders.filter(
      o => o.tableId === table.id && !['completed', 'cancelled'].includes(o.status)
    );

    const isOccupied = activeOrders.length > 0 || table.manualStatus === 'occupied' || table.status === 'occupied';
    const currentStatus = isOccupied ? 'occupied' : 'vacant';
    const status = isOccupied ? 'occupied' : 'available';
    const runningTotal = activeOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    return {
      ...table,
      status,
      currentStatus,
      activeOrdersCount: activeOrders.length,
      runningTotal: +runningTotal.toFixed(2),
      latestOrder: activeOrders[activeOrders.length - 1] || null
    };
  });
  
  res.json(enriched);
});

// Orders
app.get('/api/orders', (req, res) => {
  const orders = readData(ORDERS_FILE);
  // Sort latest first
  const sorted = [...orders].reverse();
  res.json(sorted);
});

app.get('/api/orders/table/:tableId', (req, res) => {
  const tableId = parseInt(req.params.tableId, 10);
  const token = req.query.token || req.headers['x-table-token'];
  const tables = readData(TABLES_FILE);
  const table = tables.find(t => t.id === tableId);
  if (!table) return res.status(404).json({ error: 'Table not found' });

  // STRICT TOKEN ENFORCEMENT:
  // Must provide matching active session token; otherwise return 403 TOKEN_EXPIRED
  if (table.sessionToken && (!token || token.trim() !== table.sessionToken.trim())) {
    return res.status(403).json({
      error: 'TOKEN_EXPIRED',
      message: 'Dining session has ended. Previous session token is expired. Please scan current table QR stand.'
    });
  }

  const orders = readData(ORDERS_FILE);
  const tableOrders = orders.filter(o => o.tableId === tableId);
  res.json(tableOrders);
});

// Place new order
app.post('/api/orders', (req, res) => {
  const { tableId, items, notes, guestName } = req.body;
  const token = req.body.token || req.body.sessionToken;
  if (!tableId || !items || !items.length) {
    return res.status(400).json({ error: 'Invalid order parameters' });
  }

  const tables = readData(TABLES_FILE);
  const table = tables.find(t => t.id === parseInt(tableId, 10));
  if (!table) {
    return res.status(404).json({ error: 'Table not found' });
  }

  // Ensure table has an active token
  if (!table.sessionToken) {
    table.sessionToken = generateTableToken(table.id);
    table.tokenCreatedAt = new Date().toISOString();
    writeData(TABLES_FILE, tables);
  }

  // STRICT TOKEN SECURITY:
  // Customers MUST provide the current active table sessionToken from the scanned QR code
  if (!token || typeof token !== 'string' || token.trim() !== table.sessionToken.trim()) {
    return res.status(403).json({
      error: 'TOKEN_EXPIRED',
      message: 'This dining session has ended. The previous session link is expired. Please scan the active QR code on your table to order.'
    });
  }

  const orders = readData(ORDERS_FILE);

  const orderNum = orders.length > 0 ? Math.max(...orders.map(o => o.orderNumber || 100)) + 1 : 101;
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = +(subtotal * 0.05).toFixed(2); // 5% GST
  const total = +(subtotal + tax).toFixed(2);

  const newOrder = {
    id: `ORD-${orderNum}`,
    orderNumber: orderNum,
    tableId: parseInt(tableId, 10),
    tableName: table.name,
    guestName: guestName || `${table.name} Guest`,
    status: 'pending', // pending -> preparing -> ready -> served -> completed
    createdAt: new Date().toISOString(),
    items: (() => {
      const menu = readData(MENU_FILE);
      return items.map(item => {
        const match = menu.find(m =>
          (item.id && String(m.id) === String(item.id)) ||
          (item.name && m.name && m.name.toLowerCase().trim() === item.name.toLowerCase().trim())
        );
        return {
          id: item.id || (match ? match.id : undefined),
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image || (match ? match.image : undefined),
          options: item.options || [],
          notes: item.notes || ''
        };
      });
    })(),
    subtotal: +subtotal.toFixed(2),
    tax,
    total,
    notes: notes || '',
    paymentStatus: 'unpaid',
    paymentMethod: 'Pay at Counter / UPI'
  };

  orders.push(newOrder);
  writeData(ORDERS_FILE, orders);

  // Update table occupancy status to OCCUPIED
  table.status = 'occupied';
  table.manualStatus = 'occupied';
  table.occupiedAt = new Date().toISOString();
  writeData(TABLES_FILE, tables);

  // Notify Kitchen Display System, Admin, Table room, and Floor dashboards
  io.emit('order:new', newOrder);
  io.to('kitchen').emit('order:new', newOrder);
  io.to('admin').emit('order:new', newOrder);
  io.to(`table_${tableId}`).emit('order:updated', newOrder);
  io.emit('table:status_changed', { tableId: parseInt(tableId, 10), status: 'occupied' });
  io.emit('tables:updated', tables);

  res.status(201).json({ success: true, order: newOrder, ...newOrder });
});

// Update order status
app.patch('/api/orders/:id/status', requireStaffAuth, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['new', 'pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const orders = readData(ORDERS_FILE);
  const order = orders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();
  if (status === 'completed') {
    order.completedAt = new Date().toISOString();
    order.paymentStatus = 'paid';
  }
  writeData(ORDERS_FILE, orders);

  // Broadcast to kitchen, admin, and the table room
  io.emit('order:status_changed', order);
  io.to('kitchen').emit('order:status_changed', order);
  io.to('admin').emit('order:status_changed', order);
  io.to(`table_${order.tableId}`).emit('order:status_changed', order);

  // If order is completed, check if all active orders for this table are now completed
  if (status === 'completed') {
    const remainingActive = orders.filter(
      o => o.tableId === order.tableId && !['completed', 'cancelled'].includes(o.status)
    );
    if (remainingActive.length === 0) {
      // All orders for this table are completed! Automatically generate fresh token for next guests.
      const tables = readData(TABLES_FILE);
      const table = tables.find(t => t.id === order.tableId);
      if (table) {
        table.status = 'available';
        table.manualStatus = 'vacant';
        table.lastClearedAt = new Date().toISOString();
        const oldToken = table.sessionToken;
        table.sessionToken = generateTableToken(table.id);
        table.tokenCreatedAt = new Date().toISOString();
        writeData(TABLES_FILE, tables);

        // Notify customer app that dining session completed and token expired
        io.to(`table_${table.id}`).emit('table:session_expired', {
          tableId: table.id,
          tableName: table.name,
          message: 'All orders for this table are completed! Dining session closed.'
        });
        io.emit('table:status_changed', { tableId: table.id, status: 'vacant' });
        io.emit('tables:updated', tables);
      }
    }
  }

  res.json(order);
});

// Customer settles bill / marks payment at the end
app.post(['/api/orders/:id/pay', '/api/orders/:id/customer-pay'], (req, res) => {
  const orderId = req.params.id;
  const { paymentMethod = 'UPI', transactionRef = '', token } = req.body || {};
  const orders = readData(ORDERS_FILE);
  const order = orders.find(o => o.id === orderId || o.orderNumber === parseInt(orderId, 10));
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Token validation if table sessionToken is set
  const tables = readData(TABLES_FILE);
  const table = tables.find(t => t.id === order.tableId);
  if (table && table.sessionToken && token && token.trim() !== table.sessionToken.trim()) {
    return res.status(403).json({ error: 'TOKEN_EXPIRED', message: 'Session expired' });
  }

  order.paymentStatus = 'paid';
  order.paymentMethod = paymentMethod;
  order.paidAt = new Date().toISOString();
  if (transactionRef) order.transactionRef = transactionRef;
  writeData(ORDERS_FILE, orders);

  // Broadcast to kitchen, admin, and table
  io.emit('order:status_changed', order);
  io.to('admin').emit('order:status_changed', order);
  io.to(`table_${order.tableId}`).emit('order:status_changed', order);

  // Send high-priority alert to admin/staff
  io.emit('service:payment_received', {
    orderId: order.id,
    tableId: order.tableId,
    tableName: order.tableName,
    amount: order.total,
    method: paymentMethod
  });

  res.json({ success: true, order, message: `Payment of ₹${order.total} marked as paid via ${paymentMethod}` });
});

// Active Service Calls (In-Memory Queue for Real-Time Dashboard)
let activeServiceCalls = [];

// Get active service calls
app.get('/api/service-calls', (req, res) => {
  res.json(activeServiceCalls);
});

// Call Waiter / Service Request
app.post(['/api/service-call', '/api/service/call'], (req, res) => {
  const { tableId, token, type, note } = req.body;
  const tables = readData(TABLES_FILE);
  const foundTable = tables.find(t => t.id === parseInt(tableId, 10));
  if (!foundTable) {
    return res.status(404).json({ error: 'Table not found' });
  }

  // Strict token verification for service call
  if (!token || typeof token !== 'string' || !foundTable.sessionToken || token.trim() !== foundTable.sessionToken.trim()) {
    return res.status(403).json({
      error: 'TOKEN_EXPIRED',
      message: 'Dining session has ended. Service call unavailable. Please scan the active table QR stand.'
    });
  }

  const tableName = foundTable.name || `Table ${tableId}`;

  const callPayload = {
    id: 'SVC-' + Date.now().toString().slice(-4),
    tableId: parseInt(tableId, 10),
    tableName,
    type: type || 'Call Waiter', // 'Call Waiter', 'Water Request', 'Bill Request'
    note: note || '',
    timestamp: new Date().toISOString()
  };

  activeServiceCalls.unshift(callPayload);
  if (activeServiceCalls.length > 30) activeServiceCalls = activeServiceCalls.slice(0, 30);

  // Broadcast to all sockets, plus rooms
  io.emit('service:call', callPayload);
  io.emit('service:updated', activeServiceCalls);
  io.to('kitchen').emit('service:call', callPayload);
  io.to('admin').emit('service:call', callPayload);

  res.json({ success: true, call: callPayload });
});

// Dismiss / Attended service call
app.patch('/api/service-call/:id/dismiss', requireStaffAuth, (req, res) => {
  activeServiceCalls = activeServiceCalls.filter(c => c.id !== req.params.id);
  io.emit('service:updated', activeServiceCalls);
  res.json({ success: true, activeServiceCalls });
});

// QR Code Generator (Binary PNG Image or JSON data URL)
app.get('/api/qrcode/:tableId', async (req, res) => {
  try {
    const tableId = parseInt(req.params.tableId, 10);
    const tables = readData(TABLES_FILE);
    const table = tables.find(t => t.id === tableId);
    if (!table) return res.status(404).json({ error: 'Table not found' });

    if (!table.sessionToken) {
      table.sessionToken = generateTableToken(table.id);
      table.tokenCreatedAt = new Date().toISOString();
      writeData(TABLES_FILE, tables);
    }

    const isVercel = Boolean(process.env.VERCEL);
    let host = req.headers.host || `localhost:${PORT}`;
    
    // Only use req.query.host if provided, not on Vercel, and not an internal link-local 169.254.x.x IP
    if (!isVercel && req.query.host && !req.query.host.startsWith('169.254.')) {
      host = req.query.host;
    }

    // For local development on Wi-Fi, ensure real phones can scan the QR code using the machine's LAN IP
    if (!isVercel && LOCAL_IP && LOCAL_IP !== 'localhost') {
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        const isVite = (req.headers.referer && req.headers.referer.includes(':5173')) || host.includes('5173');
        const port = isVite ? '5173' : (host.split(':')[1] || '5173');
        host = `${LOCAL_IP}:${port}`;
      }
    }

    const isHttps = isVercel || req.headers['x-forwarded-proto'] === 'https' || (!host.includes('localhost') && !host.includes('127.0.0.1') && !host.startsWith('192.168.') && !host.startsWith('10.') && !host.startsWith('172.'));
    const protocol = isHttps ? 'https' : 'http';
    const targetUrl = `${protocol}://${host}/?table=${tableId}&token=${table.sessionToken}`;
    
    if (req.query.format === 'json') {
      const qrDataUrl = await QRCode.toDataURL(targetUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      return res.json({
        tableId,
        sessionToken: table.sessionToken,
        targetUrl,
        qrDataUrl
      });
    }

    // Default: Return raw PNG image stream so <img src="/api/qrcode/:id"> displays natively
    const qrBuffer = await QRCode.toBuffer(targetUrl, {
      type: 'png',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.send(qrBuffer);
  } catch (err) {
    console.error('Failed to generate QR Code:', err);
    res.status(500).json({ error: 'Failed to generate QR Code' });
  }
});

// Socket.io Connection Logic
io.on('connection', (socket) => {
  // Join role or table room
  socket.on('join', (data = {}) => {
    const { role, tableId } = typeof data === 'object' ? data : {};
    if (role === 'kitchen') socket.join('kitchen');
    if (role === 'admin') socket.join('admin');
    if (tableId) socket.join(`table_${tableId}`);
  });

  socket.on('join-admin', () => {
    socket.join('admin');
  });

  socket.on('join-kitchen', () => {
    socket.join('kitchen');
  });

  socket.on('join-table', (data = {}) => {
    const tableId = typeof data === 'object' ? data.tableId : data;
    if (tableId) socket.join(`table_${tableId}`);
  });

  socket.on('disconnect', () => {
    // Left room
  });
});

function startServer() {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`  Smart Restaurant QR Ordering System Started!     `);
    console.log(`  Access URL:        http://localhost:${PORT}      `);
    console.log(`  Network Access:    http://${LOCAL_IP}:${PORT}    `);
    console.log(`====================================================`);
  });
}

// Start server if not in Vercel serverless environment
if (!process.env.VERCEL) {
  startServer();
}

module.exports = app;
module.exports.server = server;
module.exports.startServer = startServer;
