require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const QRCode = require('qrcode');
const os = require('os');
const crypto = require('crypto');
const db = require('./db');

// Staff PIN & Authentication Security
const STAFF_PIN = (process.env.STAFF_PIN || '1234').toString().trim();
const STAFF_SECRET = process.env.STAFF_SECRET || 'tablemint_secure_jwt_secret_render_production_key_2026';

if (!process.env.STAFF_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  [SECURITY WARNING] STAFF_SECRET not set in environment. Set STAFF_SECRET in Render dashboard for production.');
}

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

function generateUserToken(user) {
  const rSlug = db.slugifyRestaurant(user.restaurantSlug || user.restaurantName);
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'admin',
    restaurantName: user.restaurantName || 'TableMint',
    restaurantSlug: rSlug,
    time: Date.now()
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', STAFF_SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

function verifyUserToken(token) {
  if (!token || typeof token !== 'string') return null;
  if (token === STAFF_PIN) {
    return {
      id: 'staff_pin',
      name: 'POS Floor Staff',
      email: 'staff@tablemint.local',
      role: 'staff',
      restaurantName: 'TableMint',
      restaurantSlug: 'tablemint'
    };
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
      return {
        id: 'staff_pin',
        name: 'POS Floor Staff',
        email: 'staff@tablemint.local',
        role: 'staff',
        restaurantName: 'TableMint',
        restaurantSlug: 'tablemint'
      };
    }
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!decoded.restaurantSlug) {
      decoded.restaurantSlug = db.slugifyRestaurant(decoded.restaurantName);
    }
    return decoded;
  } catch (e) {
    return null;
  }
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
    message: 'Authentication required. Please sign in or enter valid Staff credentials.'
  });
}

function getRequestRestaurantSlug(req) {
  if (req.user && (req.user.restaurantSlug || req.user.restaurantName)) {
    return db.slugifyRestaurant(req.user.restaurantSlug || req.user.restaurantName);
  }
  const fromHeader = req.headers['x-restaurant-slug'] || req.headers['x-restaurant-id'];
  if (fromHeader) return db.slugifyRestaurant(fromHeader);
  const fromQuery = req.query.restaurant || req.query.restaurantSlug;
  if (fromQuery) return db.slugifyRestaurant(fromQuery);
  if (req.body && (req.body.restaurantSlug || req.body.restaurant)) {
    return db.slugifyRestaurant(req.body.restaurantSlug || req.body.restaurant);
  }
  return 'tablemint';
}

const app = express();
const server = http.createServer(app);

// Enable reverse proxy support (Render, Vercel, Nginx, Cloudflare)
app.set('trust proxy', 1);

// High-speed response compression for production
app.use(compression());

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
  },
  pingTimeout: 30000,
  pingInterval: 15000
});

const PORT = process.env.PORT || 3000;

// Security Headers (configured to allow inline SVGs, QR images and canvas animations)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS Configuration
const allowedOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Asset Cache for Production Performance
const distDir = fs.existsSync(path.join(__dirname, '..', 'frontend', 'dist'))
  ? path.join(__dirname, '..', 'frontend', 'dist')
  : path.join(__dirname, 'dist');

app.use(express.static(distDir, {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

app.use('/images', express.static(path.join(distDir, 'images'), {
  maxAge: '7d'
}));

// Prevent aggressive browser caching of dynamic API requests
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Production Rate Limiters - Designed for high concurrency without false-positives on shared Wi-Fi
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS', message: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

const orderLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60, // 60 orders per 5 min per table
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    const table = req.body?.tableId || req.query?.table || 'generic';
    const rSlug = getRequestRestaurantSlug(req);
    return `${req.ip || 'ip'}_${rSlug}_T${table}`;
  },
  message: { error: 'TOO_MANY_REQUESTS', message: 'Order limit reached for this table. Please wait a moment before placing another order.' }
});

const serviceLimiter = rateLimit({
  windowMs: 3 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    const table = req.body?.tableId || req.query?.table || 'generic';
    const rSlug = getRequestRestaurantSlug(req);
    return `${req.ip || 'ip'}_${rSlug}_T${table}`;
  },
  message: { error: 'TOO_MANY_REQUESTS', message: 'Assistance request received. A staff member is on their way.' }
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

// Active Service Calls (In-Memory Queue for Real-Time Dashboard per Restaurant)
let activeServiceCalls = [];

// ----------------- API Endpoints -----------------

// Health Check for Render zero-downtime monitoring
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'tablemint-qr-pos',
    uptime: Math.floor(process.uptime()),
    database: db.getIsConnectedToMongo() ? 'MongoDB Atlas' : 'Local File Storage',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString()
  });
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

// Authentication Endpoints
app.post('/api/auth/signup', authLimiter, async (req, res) => {
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
    const existing = await db.getUserByEmail(cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, error: 'An account with this email address already exists. Please sign in instead.' });
    }

    const restName = (restaurantName || 'TableMint').trim();
    const rSlug = db.slugifyRestaurant(restName);
    const { hash, salt } = hashPassword(password);

    const newUser = {
      id: `user_${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      hash,
      salt,
      role: role === 'staff' ? 'staff' : 'admin',
      restaurantName: restName,
      restaurantSlug: rSlug,
      createdAt: new Date().toISOString()
    };

    await db.createUser(newUser);

    // Auto-initialize tables and settings for this restaurant
    db.getTables(rSlug);
    db.getMenu(rSlug);
    db.getSettings(rSlug);

    const safeUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      restaurantName: newUser.restaurantName,
      restaurantSlug: newUser.restaurantSlug
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

app.post('/api/auth/signin', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide both email and password.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await db.getUserByEmail(cleanEmail);
    if (!user || !verifyPassword(password, user.hash, user.salt)) {
      return res.status(401).json({ success: false, error: 'Invalid email address or password. Please try again.' });
    }

    const rSlug = user.restaurantSlug || db.slugifyRestaurant(user.restaurantName);
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      restaurantName: user.restaurantName || 'TableMint',
      restaurantSlug: rSlug
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

app.patch('/api/auth/profile', requireStaffAuth, async (req, res) => {
  try {
    const { name, restaurantName } = req.body || {};
    const currentUser = req.user;
    const users = await db.getUsers();
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    if (name && name.trim().length >= 2) {
      users[userIndex].name = name.trim();
    }
    if (restaurantName && restaurantName.trim()) {
      users[userIndex].restaurantName = restaurantName.trim();
      users[userIndex].restaurantSlug = db.slugifyRestaurant(restaurantName);
    }
    users[userIndex].updatedAt = new Date().toISOString();

    await db.saveUsers(users);

    const safeUser = {
      id: users[userIndex].id,
      name: users[userIndex].name,
      email: users[userIndex].email,
      role: users[userIndex].role,
      restaurantName: users[userIndex].restaurantName,
      restaurantSlug: users[userIndex].restaurantSlug
    };
    const newToken = generateUserToken(safeUser);

    res.json({
      success: true,
      token: newToken,
      user: safeUser,
      message: 'Profile updated successfully!'
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ success: false, error: 'Failed to update profile.' });
  }
});

app.post('/api/auth/change-password', requireStaffAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword) {
      return res.status(400).json({ success: false, error: 'Please enter your current password.' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
    }

    const currentUser = req.user;
    const users = await db.getUsers();
    let targetUser = users.find(u => u.id === currentUser.id);
    if (!targetUser && currentUser.id === 'staff_pin') {
      targetUser = users.find(u => u.role === 'admin') || users[0];
    }

    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    const isCurrentValid = verifyPassword(currentPassword, targetUser.hash, targetUser.salt);
    if (!isCurrentValid) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect. Please try again.' });
    }

    const { hash, salt } = hashPassword(newPassword);
    targetUser.hash = hash;
    targetUser.salt = salt;
    targetUser.updatedAt = new Date().toISOString();

    await db.saveUsers(users);

    res.json({
      success: true,
      message: 'Password changed successfully! Keep your new password secure.'
    });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ success: false, error: 'Failed to change password. Please try again.' });
  }
});

// Settings Endpoints (Multi-Tenant Scoped)
app.get('/api/settings', async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const settings = await db.getSettings(rSlug);
  res.json(settings);
});

app.post(['/api/settings', '/api/settings/update'], requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const updated = await db.saveSettings(req.body || {}, rSlug);
  io.to(`restaurant_${rSlug}`).emit('settings:updated', updated);
  io.emit('settings:updated', updated);
  res.json({ success: true, settings: updated });
});

// Menu Endpoints (Multi-Tenant Scoped)
app.get('/api/menu', async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const menu = await db.getMenu(rSlug);
  res.json(menu);
});

app.patch('/api/menu/:id/toggle', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const menu = await db.getMenu(rSlug);
  const item = menu.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  item.available = !item.available;
  await db.updateMenuItem(item.id, { available: item.available }, rSlug);
  const updatedMenu = await db.getMenu(rSlug);
  io.to(`restaurant_${rSlug}`).emit('menu:updated', updatedMenu);
  io.emit('menu:updated', updatedMenu);
  res.json(item);
});

app.post('/api/menu', requireStaffAuth, async (req, res) => {
  const { name, category, price, description, image, isVeg, isSpecial, prepTime } = req.body;
  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required' });
  }

  const rSlug = getRequestRestaurantSlug(req);
  const menu = await db.getMenu(rSlug);
  const newItem = {
    id: `item-${Date.now().toString().slice(-6)}`,
    restaurantSlug: rSlug,
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
  await db.saveMenu(menu, rSlug);
  io.to(`restaurant_${rSlug}`).emit('menu:updated', menu);
  io.emit('menu:updated', menu);
  res.status(201).json(newItem);
});

app.put('/api/menu/:id', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const menu = await db.getMenu(rSlug);
  const idx = menu.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });

  const { name, category, price, description, image, isVeg, isSpecial, prepTime, available } = req.body;
  const updatedItem = {
    ...menu[idx],
    name: name ? name.trim() : menu[idx].name,
    category: category ? category.toLowerCase() : menu[idx].category,
    price: price !== undefined ? parseFloat(price) : menu[idx].price,
    description: description !== undefined ? description.trim() : menu[idx].description,
    image: image || menu[idx].image,
    isVeg: isVeg !== undefined ? Boolean(isVeg) : menu[idx].isVeg,
    isSpecial: isSpecial !== undefined ? Boolean(isSpecial) : menu[idx].isSpecial,
    prepTime: prepTime || menu[idx].prepTime,
    available: available !== undefined ? Boolean(available) : menu[idx].available
  };

  await db.updateMenuItem(req.params.id, updatedItem, rSlug);
  const updatedMenu = await db.getMenu(rSlug);
  io.to(`restaurant_${rSlug}`).emit('menu:updated', updatedMenu);
  io.emit('menu:updated', updatedMenu);
  res.json(updatedItem);
});

app.delete('/api/menu/:id', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const menu = await db.getMenu(rSlug);
  const exists = menu.some(i => i.id === req.params.id);
  if (!exists) return res.status(404).json({ error: 'Item not found' });

  await db.deleteMenuItem(req.params.id, rSlug);
  const updatedMenu = await db.getMenu(rSlug);
  io.to(`restaurant_${rSlug}`).emit('menu:updated', updatedMenu);
  io.emit('menu:updated', updatedMenu);
  res.json({ success: true, deletedId: req.params.id });
});

// Tables Endpoints (Multi-Tenant Scoped)
app.get('/api/tables', async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const tables = await db.getTables(rSlug);
  const orders = await db.getOrders(rSlug);

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

app.post('/api/tables', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const { name, capacity, section } = req.body;
  const tables = await db.getTables(rSlug);
  const nextId = tables.length > 0 ? Math.max(...tables.map(t => t.id || 0)) + 1 : 1;
  const newTable = {
    id: nextId,
    restaurantSlug: rSlug,
    name: name ? name.trim() : `Table ${nextId}`,
    capacity: parseInt(capacity, 10) || 4,
    section: section ? section.trim() : 'Indoor Dining',
    status: 'available',
    manualStatus: 'vacant',
    sessionToken: db.generateTableToken(nextId),
    tokenCreatedAt: new Date().toISOString()
  };
  tables.push(newTable);
  await db.saveTables(tables, rSlug);
  io.to(`restaurant_${rSlug}`).emit('tables:updated', tables);
  io.emit('tables:updated', tables);
  res.status(201).json(newTable);
});

app.put('/api/tables/:id', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const tableId = parseInt(req.params.id, 10);
  const tables = await db.getTables(rSlug);
  const idx = tables.findIndex(t => t.id === tableId);
  if (idx === -1) return res.status(404).json({ error: 'Table not found' });

  const { name, capacity, section } = req.body;
  tables[idx] = {
    ...tables[idx],
    name: name ? name.trim() : tables[idx].name,
    capacity: capacity !== undefined ? parseInt(capacity, 10) : tables[idx].capacity,
    section: section ? section.trim() : tables[idx].section
  };

  await db.saveTables(tables, rSlug);
  io.to(`restaurant_${rSlug}`).emit('tables:updated', tables);
  io.emit('tables:updated', tables);
  res.json(tables[idx]);
});

app.delete('/api/tables/:id', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const tableId = parseInt(req.params.id, 10);
  let tables = await db.getTables(rSlug);
  const exists = tables.some(t => t.id === tableId);
  if (!exists) return res.status(404).json({ error: 'Table not found' });

  tables = tables.filter(t => t.id !== tableId);
  await db.saveTables(tables, rSlug);
  io.to(`restaurant_${rSlug}`).emit('tables:updated', tables);
  io.emit('tables:updated', tables);
  res.json({ success: true, deletedId: tableId });
});

app.patch('/api/tables/:id/vacant', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const tableId = parseInt(req.params.id, 10);
  const tables = await db.getTables(rSlug);
  const table = tables.find(t => t.id === tableId);
  if (!table) return res.status(404).json({ error: 'Table not found' });

  table.manualStatus = 'vacant';
  table.status = 'available';
  table.lastClearedAt = new Date().toISOString();
  table.sessionToken = db.generateTableToken(table.id);
  table.tokenCreatedAt = new Date().toISOString();
  db.updateTable(table.id, table, rSlug);

  const orders = await db.getOrders(rSlug);
  orders.forEach(order => {
    if (order.tableId === tableId && !['completed', 'cancelled'].includes(order.status)) {
      order.status = 'completed';
      order.paymentStatus = 'paid';
      order.completedAt = new Date().toISOString();
      db.updateOrder(order.id, {
        status: 'completed',
        paymentStatus: 'paid',
        completedAt: order.completedAt
      }, rSlug);
      io.to(`restaurant_${rSlug}_table_${tableId}`).emit('order:status_changed', order);
      io.to(`table_${tableId}`).emit('order:status_changed', order);
      io.to(`restaurant_${rSlug}_kitchen`).emit('order:status_changed', order);
      io.to(`restaurant_${rSlug}_admin`).emit('order:status_changed', order);
    }
  });

  activeServiceCalls = activeServiceCalls.filter(c => !(c.tableId === tableId && (c.restaurantSlug || 'tablemint') === rSlug));
  io.to(`restaurant_${rSlug}`).emit('service:updated', activeServiceCalls);

  io.to(`restaurant_${rSlug}`).emit('tables:updated', tables);
  io.emit('tables:updated', tables);
  io.to(`restaurant_${rSlug}`).emit('table:status_changed', { tableId, status: 'vacant' });
  io.to(`restaurant_${rSlug}_table_${tableId}`).emit('table:vacated', { tableId });
  io.to(`table_${tableId}`).emit('table:session_expired', {
    tableId,
    tableName: table.name,
    message: 'Dining session has been completed by staff. Previous session links are expired.'
  });

  res.json({
    success: true,
    table,
    newToken: table.sessionToken,
    message: `${table.name} has been made VACANT. Session token refreshed.`
  });
});

app.get('/api/tables/:id/verify-token', async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const tableId = parseInt(req.params.id, 10);
  const token = req.query.token;
  const tables = await db.getTables(rSlug);
  const orders = await db.getOrders(rSlug);
  let table = tables.find(t => t.id === tableId);
  if (!table) {
    table = {
      id: tableId,
      restaurantSlug: rSlug,
      name: `Table ${tableId}`,
      capacity: 4,
      sessionToken: `T${tableId}-ACTIVE`,
      status: 'available'
    };
  }

  if (!table.sessionToken) {
    table.sessionToken = db.generateTableToken(table.id);
    table.tokenCreatedAt = new Date().toISOString();
    await db.updateTable(table.id, table, rSlug);
  }

  const activeOrders = orders.filter(
    o => o.tableId === table.id && !['completed', 'cancelled'].includes(o.status)
  );
  const isOccupied = activeOrders.length > 0 || table.manualStatus === 'occupied' || table.status === 'occupied';
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
      : 'Dining session has been completed by staff. Previous session links are expired. Please scan the current QR code on your table stand.'
  });
});

app.post('/api/tables/:id/regenerate-token', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const tableId = parseInt(req.params.id, 10);
  const tables = await db.getTables(rSlug);
  const table = tables.find(t => t.id === tableId);
  if (!table) return res.status(404).json({ error: 'Table not found' });

  table.sessionToken = db.generateTableToken(table.id);
  table.tokenCreatedAt = new Date().toISOString();
  await db.updateTable(table.id, table, rSlug);

  io.to(`restaurant_${rSlug}_table_${tableId}`).emit('table:session_expired', {
    tableId,
    tableName: table.name,
    message: 'Staff refreshed the table QR code. Please scan the new QR stand on your table.'
  });
  io.to(`table_${tableId}`).emit('table:session_expired', {
    tableId,
    tableName: table.name,
    message: 'Staff refreshed the table QR code. Please scan the new QR stand on your table.'
  });
  io.to(`restaurant_${rSlug}`).emit('tables:updated', tables);

  res.json({
    success: true,
    tableId,
    newToken: table.sessionToken,
    message: `Generated fresh QR token for ${table.name}`
  });
});

app.patch('/api/tables/:id/occupy', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const tableId = parseInt(req.params.id, 10);
  const tables = await db.getTables(rSlug);
  const table = tables.find(t => t.id === tableId);
  if (!table) return res.status(404).json({ error: 'Table not found' });

  table.manualStatus = 'occupied';
  table.status = 'occupied';
  table.occupiedAt = new Date().toISOString();
  db.updateTable(table.id, table, rSlug);

  io.to(`restaurant_${rSlug}`).emit('tables:updated', tables);
  io.to(`restaurant_${rSlug}`).emit('table:status_changed', { tableId, status: 'occupied' });

  res.json({ success: true, table, message: `${table.name} marked as OCCUPIED.` });
});

// Orders Endpoints (Multi-Tenant Scoped)
app.get('/api/orders', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const orders = await db.getOrders(rSlug);
  const sorted = [...orders].reverse();
  res.json(sorted);
});

app.get('/api/orders/table/:tableId', async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const tableId = parseInt(req.params.tableId, 10);
  const token = req.query.token || req.headers['x-table-token'];
  const tables = await db.getTables(rSlug);
  const table = tables.find(t => t.id === tableId);
  if (!table) return res.status(404).json({ error: 'Table not found' });

  if (table.sessionToken && (!token || token.trim() !== table.sessionToken.trim())) {
    return res.status(403).json({
      error: 'TOKEN_EXPIRED',
      message: 'Dining session has ended. Previous session token is expired. Please scan current table QR stand.'
    });
  }

  const orders = await db.getOrders(rSlug);
  const tableOrders = orders.filter(o => o.tableId === tableId);
  res.json(tableOrders);
});

app.post('/api/orders', orderLimiter, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const { tableId, items, notes, guestName } = req.body;
  const token = req.body.token || req.body.sessionToken;
  if (!tableId || !items || !items.length) {
    return res.status(400).json({ error: 'Invalid order parameters' });
  }

  const tables = await db.getTables(rSlug);
  const table = tables.find(t => t.id === parseInt(tableId, 10));
  if (!table) {
    return res.status(404).json({ error: 'Table not found' });
  }

  if (!table.sessionToken) {
    table.sessionToken = db.generateTableToken(table.id);
    table.tokenCreatedAt = new Date().toISOString();
    await db.updateTable(table.id, table, rSlug);
  }

  if (!token || typeof token !== 'string' || token.trim() !== table.sessionToken.trim()) {
    return res.status(403).json({
      error: 'TOKEN_EXPIRED',
      message: 'This dining session has ended. The previous session link is expired. Please scan the active QR code on your table to order.'
    });
  }

  const orders = await db.getOrders(rSlug);
  const orderNum = orders.length > 0 ? Math.max(...orders.map(o => o.orderNumber || 100)) + 1 : 101;
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = +(subtotal * 0.05).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);

  const menu = await db.getMenu(rSlug);
  const enrichedItems = items.map(item => {
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

  const newOrder = {
    id: `ORD-${orderNum}`,
    restaurantSlug: rSlug,
    orderNumber: orderNum,
    tableId: parseInt(tableId, 10),
    tableName: table.name,
    guestName: guestName || `${table.name} Guest`,
    status: 'pending',
    createdAt: new Date().toISOString(),
    items: enrichedItems,
    subtotal: +subtotal.toFixed(2),
    tax,
    total,
    notes: notes || '',
    paymentStatus: 'unpaid',
    paymentMethod: 'Pay at Counter / UPI'
  };

  db.saveOrder(newOrder);

  table.status = 'occupied';
  table.manualStatus = 'occupied';
  table.occupiedAt = new Date().toISOString();
  db.updateTable(table.id, {
    status: 'occupied',
    manualStatus: 'occupied',
    occupiedAt: table.occupiedAt
  }, rSlug);

  io.to(`restaurant_${rSlug}_kitchen`).emit('order:new', newOrder);
  io.to(`restaurant_${rSlug}_admin`).emit('order:new', newOrder);
  io.to(`restaurant_${rSlug}_table_${tableId}`).emit('order:updated', newOrder);
  io.to('kitchen').emit('order:new', newOrder);
  io.to('admin').emit('order:new', newOrder);
  io.to(`table_${tableId}`).emit('order:updated', newOrder);
  io.to(`restaurant_${rSlug}`).emit('table:status_changed', { tableId: parseInt(tableId, 10), status: 'occupied' });
  io.to(`restaurant_${rSlug}`).emit('tables:updated', tables);

  res.status(201).json({ success: true, order: newOrder, ...newOrder });
});

app.patch('/api/orders/:id/status', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const { status } = req.body;
  const validStatuses = ['new', 'pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const orders = await db.getOrders(rSlug);
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
  db.updateOrder(order.id, order, rSlug);

  io.to(`restaurant_${rSlug}_kitchen`).emit('order:status_changed', order);
  io.to(`restaurant_${rSlug}_admin`).emit('order:status_changed', order);
  io.to(`restaurant_${rSlug}_table_${order.tableId}`).emit('order:status_changed', order);
  io.to('kitchen').emit('order:status_changed', order);
  io.to('admin').emit('order:status_changed', order);
  io.to(`table_${order.tableId}`).emit('order:status_changed', order);

  if (status === 'completed') {
    const remainingActive = orders.filter(
      o => o.tableId === order.tableId && !['completed', 'cancelled'].includes(o.status)
    );
    if (remainingActive.length === 0) {
      const tables = await db.getTables(rSlug);
      const table = tables.find(t => t.id === order.tableId);
      if (table) {
        table.status = 'available';
        table.manualStatus = 'vacant';
        table.lastClearedAt = new Date().toISOString();
        table.sessionToken = db.generateTableToken(table.id);
        table.tokenCreatedAt = new Date().toISOString();
        db.updateTable(table.id, table, rSlug);

        io.to(`restaurant_${rSlug}_table_${table.id}`).emit('table:session_expired', {
          tableId: table.id,
          tableName: table.name,
          message: 'All orders for this table are completed! Dining session closed.'
        });
        io.to(`table_${table.id}`).emit('table:session_expired', {
          tableId: table.id,
          tableName: table.name,
          message: 'All orders for this table are completed! Dining session closed.'
        });
        io.to(`restaurant_${rSlug}`).emit('table:status_changed', { tableId: table.id, status: 'vacant' });
        io.to(`restaurant_${rSlug}`).emit('tables:updated', tables);
      }
    }
  }

  res.json(order);
});

app.post(['/api/orders/:id/pay', '/api/orders/:id/customer-pay'], async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const orderId = req.params.id;
  const { paymentMethod = 'UPI', transactionRef = '', token } = req.body || {};
  const orders = await db.getOrders(rSlug);
  const order = orders.find(o => o.id === orderId || o.orderNumber === parseInt(orderId, 10));
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const tables = await db.getTables(rSlug);
  const table = tables.find(t => t.id === order.tableId);
  if (table && table.sessionToken && token && token.trim() !== table.sessionToken.trim()) {
    return res.status(403).json({ error: 'TOKEN_EXPIRED', message: 'Session expired' });
  }

  order.paymentStatus = 'paid';
  order.paymentMethod = paymentMethod;
  order.paidAt = new Date().toISOString();
  if (transactionRef) order.transactionRef = transactionRef;
  db.updateOrder(order.id, order, rSlug);

  io.to(`restaurant_${rSlug}_admin`).emit('order:status_changed', order);
  io.to(`restaurant_${rSlug}_table_${order.tableId}`).emit('order:status_changed', order);
  io.to('admin').emit('order:status_changed', order);
  io.to(`table_${order.tableId}`).emit('order:status_changed', order);

  io.to(`restaurant_${rSlug}`).emit('service:payment_received', {
    orderId: order.id,
    tableId: order.tableId,
    tableName: order.tableName,
    amount: order.total,
    method: paymentMethod
  });

  res.json({ success: true, order, message: `Payment of ₹${order.total} marked as paid via ${paymentMethod}` });
});

app.get('/api/service-calls', requireStaffAuth, (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const filtered = activeServiceCalls.filter(c => (c.restaurantSlug || 'tablemint') === rSlug);
  res.json(filtered);
});

app.post(['/api/service-call', '/api/service/call'], serviceLimiter, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const { tableId, token, type, note } = req.body;
  const tables = await db.getTables(rSlug);
  const foundTable = tables.find(t => t.id === parseInt(tableId, 10));
  if (!foundTable) {
    return res.status(404).json({ error: 'Table not found' });
  }

  if (!token || typeof token !== 'string' || !foundTable.sessionToken || token.trim() !== foundTable.sessionToken.trim()) {
    return res.status(403).json({
      error: 'TOKEN_EXPIRED',
      message: 'Dining session has ended. Service call unavailable. Please scan the active table QR stand.'
    });
  }

  const tableName = foundTable.name || `Table ${tableId}`;
  const callPayload = {
    id: 'SVC-' + Date.now().toString().slice(-4),
    restaurantSlug: rSlug,
    tableId: parseInt(tableId, 10),
    tableName,
    type: type || 'Call Waiter',
    note: note || '',
    timestamp: new Date().toISOString()
  };

  activeServiceCalls.unshift(callPayload);
  if (activeServiceCalls.length > 50) activeServiceCalls = activeServiceCalls.slice(0, 50);

  io.to(`restaurant_${rSlug}_kitchen`).emit('service:call', callPayload);
  io.to(`restaurant_${rSlug}_admin`).emit('service:call', callPayload);
  io.to(`restaurant_${rSlug}`).emit('service:updated', activeServiceCalls.filter(c => (c.restaurantSlug || 'tablemint') === rSlug));
  io.to('kitchen').emit('service:call', callPayload);
  io.to('admin').emit('service:call', callPayload);

  res.json({ success: true, call: callPayload });
});

app.patch('/api/service-call/:id/dismiss', requireStaffAuth, (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  activeServiceCalls = activeServiceCalls.filter(c => c.id !== req.params.id);
  const filtered = activeServiceCalls.filter(c => (c.restaurantSlug || 'tablemint') === rSlug);
  io.to(`restaurant_${rSlug}`).emit('service:updated', filtered);
  res.json({ success: true, activeServiceCalls: filtered });
});

// QR Code Generator (Binary PNG Image or JSON data URL)
app.get('/api/qrcode/:tableId', async (req, res) => {
  try {
    const rSlug = getRequestRestaurantSlug(req);
    const tableId = parseInt(req.params.tableId, 10);
    const tables = await db.getTables(rSlug);
    const table = tables.find(t => t.id === tableId);

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    if (!table.sessionToken) {
      table.sessionToken = db.generateTableToken(table.id);
      table.tokenCreatedAt = new Date().toISOString();
      await db.updateTable(table.id, table, rSlug);
    }

    const isVercel = Boolean(process.env.VERCEL);
    let host = req.headers.host;

    if (!isVercel && (host.includes('localhost') || host.includes('127.0.0.1'))) {
      const port = PORT;
      if (LOCAL_IP && LOCAL_IP !== 'localhost') {
        host = `${LOCAL_IP}:${port}`;
      }
    }

    const isHttps = isVercel || req.headers['x-forwarded-proto'] === 'https' || (!host.includes('localhost') && !host.includes('127.0.0.1') && !host.startsWith('192.168.') && !host.startsWith('10.') && !host.startsWith('172.'));
    const protocol = isHttps ? 'https' : 'http';
    const restParam = rSlug !== 'tablemint' ? `&restaurant=${encodeURIComponent(rSlug)}` : '';
    const targetUrl = `${protocol}://${host}/?table=${tableId}&token=${table.sessionToken}${restParam}`;

    if (req.query.format === 'json') {
      const qrDataUrl = await QRCode.toDataURL(targetUrl, {
        width: 400,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });

      return res.json({
        tableId,
        restaurantSlug: rSlug,
        sessionToken: table.sessionToken,
        targetUrl,
        qrDataUrl
      });
    }

    const qrBuffer = await QRCode.toBuffer(targetUrl, {
      type: 'png',
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.send(qrBuffer);
  } catch (err) {
    console.error('Failed to generate QR Code:', err);
    res.status(500).json({ error: 'Failed to generate QR Code' });
  }
});

// Socket.io Connection Logic (Multi-Tenant Partitioned)
io.on('connection', (socket) => {
  socket.on('join', (data = {}) => {
    const { role, tableId, restaurant } = typeof data === 'object' ? data : {};
    const rSlug = db.slugifyRestaurant(restaurant);

    socket.join(`restaurant_${rSlug}`);
    if (role === 'kitchen') {
      socket.join(`restaurant_${rSlug}_kitchen`);
      socket.join('kitchen');
    }
    if (role === 'admin') {
      socket.join(`restaurant_${rSlug}_admin`);
      socket.join('admin');
    }
    if (tableId) {
      socket.join(`restaurant_${rSlug}_table_${tableId}`);
      socket.join(`table_${tableId}`);
    }
  });

  socket.on('join-admin', (data = {}) => {
    const rSlug = db.slugifyRestaurant(data?.restaurant);
    socket.join(`restaurant_${rSlug}_admin`);
    socket.join('admin');
  });

  socket.on('join-kitchen', (data = {}) => {
    const rSlug = db.slugifyRestaurant(data?.restaurant);
    socket.join(`restaurant_${rSlug}_kitchen`);
    socket.join('kitchen');
  });

  socket.on('join-table', (data = {}) => {
    const tableId = typeof data === 'object' ? data.tableId : data;
    const rSlug = db.slugifyRestaurant(data?.restaurant);
    if (tableId) {
      socket.join(`restaurant_${rSlug}_table_${tableId}`);
      socket.join(`table_${tableId}`);
    }
  });

  socket.on('disconnect', () => {});
});

// SPA Fallback for all client routes (Must be after API routes)
app.get(['/', '/dashboard', '/kitchen', '/admin', '/qr-stands', '/customer'], (req, res) => {
  const indexPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).send('React Vite build not found. Please run npm run build.');
});

async function startServer() {
  await db.initDatabase();
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`  TableMint Multi-Restaurant POS Ready for Production!`);
    console.log(`  Access URL:        http://localhost:${PORT}      `);
    console.log(`  Network Access:    http://${LOCAL_IP}:${PORT}    `);
    console.log(`  Database Mode:     ${db.getIsConnectedToMongo() ? 'MongoDB Atlas' : 'Local File Storage'}`);
    console.log(`====================================================`);
  });
}

// Global safety error handlers for high concurrency stability
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]:', reason);
});

const handleGracefulShutdown = (signal) => {
  console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('[Server] Closed HTTP and WebSocket connections.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[Server] Forced exit after timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

if (!process.env.VERCEL) {
  startServer();
}

module.exports = app;
module.exports.server = server;
module.exports.startServer = startServer;
