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

function generateStaffToken() {
  const payload = `staff-${Date.now()}`;
  const signature = crypto.createHmac('sha256', STAFF_SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

function verifyStaffToken(token) {
  if (!token || typeof token !== 'string') return false;
  if (token === STAFF_PIN) return true;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  try {
    const expected = crypto.createHmac('sha256', STAFF_SECRET).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch (e) {
    return false;
  }
}

function requireStaffAuth(req, res, next) {
  const token = req.headers['x-staff-token'] || req.query.staff_token;
  if (verifyStaffToken(token)) {
    return next();
  }
  return res.status(401).json({
    error: 'UNAUTHORIZED_STAFF',
    message: 'Staff authentication required. Please enter valid Staff PIN.'
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

// Read & Write helpers
function readData(file, fallback = []) {
  try {
    if (!fs.existsSync(file)) {
      if (file.includes('menu.json')) return defaultMenu;
      if (file.includes('tables.json')) return defaultTables;
      if (file.includes('orders.json')) return defaultOrders;
      return fallback;
    }
    const content = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(content || '[]');
    if (Array.isArray(parsed) && parsed.length === 0) {
      if (file.includes('menu.json')) return defaultMenu;
      if (file.includes('tables.json')) return defaultTables;
    }
    return parsed;
  } catch (err) {
    if (file.includes('menu.json')) return defaultMenu;
    if (file.includes('tables.json')) return defaultTables;
    if (file.includes('orders.json')) return defaultOrders;
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

// Staff Authentication Endpoints
app.post('/api/auth/verify-pin', (req, res) => {
  const { pin } = req.body || {};
  if (!pin || pin.toString().trim() !== STAFF_PIN) {
    return res.status(401).json({ success: false, error: 'Incorrect Staff PIN. Please try again.' });
  }
  const token = generateStaffToken();
  res.json({ success: true, token, message: 'Authentication successful' });
});

app.get('/api/auth/check', (req, res) => {
  const token = req.headers['x-staff-token'] || req.query.staff_token;
  const isValid = verifyStaffToken(token);
  res.json({ authenticated: isValid });
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

  // Verify token matches the active rotated sessionToken
  const isValid = Boolean(token && token.trim() === table.sessionToken.trim());

  res.json({
    valid: isValid,
    tableId: table.id,
    tableName: table.name,
    status: table.status,
    manualStatus: table.manualStatus,
    activeToken: table.sessionToken,
    message: isValid
      ? 'Table session is active and verified.'
      : 'Dining session has been completed by staff. Previous session links are expired. Please scan the active QR code on your table to order.'
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

    // If active orders exist, table is occupied
    // Otherwise check table.manualStatus
    let currentStatus = 'vacant';
    if (activeOrders.length > 0) {
      currentStatus = 'occupied';
    } else if (table.manualStatus) {
      currentStatus = table.manualStatus;
    }

    return {
      ...table,
      activeOrdersCount: activeOrders.length,
      currentStatus,
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
  const orders = readData(ORDERS_FILE);
  const tableOrders = orders.filter(o => o.tableId === tableId);
  res.json(tableOrders);
});

// Place new order
app.post('/api/orders', (req, res) => {
  const { tableId, token, items, notes, guestName } = req.body;
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

  // ENFORCE TOKEN SECURITY:
  // Reject order if token is missing or does not match the active session token
  if (!token || token.trim() !== table.sessionToken.trim()) {
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
    status: 'new', // new -> preparing -> ready -> served -> completed
    createdAt: new Date().toISOString(),
    items: items.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      options: item.options || [],
      notes: item.notes || ''
    })),
    subtotal: +subtotal.toFixed(2),
    tax,
    total,
    notes: notes || '',
    paymentStatus: 'unpaid',
    paymentMethod: 'Pay at Counter / UPI'
  };

  orders.push(newOrder);
  writeData(ORDERS_FILE, orders);

  // Notify Kitchen Display System, Admin, and Table
  io.to('kitchen').emit('order:new', newOrder);
  io.to('admin').emit('order:new', newOrder);
  io.to(`table_${tableId}`).emit('order:updated', newOrder);
  io.emit('table:status_changed', { tableId: parseInt(tableId, 10), status: 'occupied' });

  res.status(201).json(newOrder);
});

// Update order status
app.patch('/api/orders/:id/status', requireStaffAuth, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['new', 'preparing', 'ready', 'served', 'completed', 'cancelled'];
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
        io.emit('tables:updated', tables);
      }
    }
  }

  res.json(order);
});

// Active Service Calls (In-Memory Queue for Real-Time Dashboard)
let activeServiceCalls = [];

// Get active service calls
app.get('/api/service-calls', (req, res) => {
  res.json(activeServiceCalls);
});

// Call Waiter / Service Request
app.post('/api/service-call', (req, res) => {
  const { tableId, type, note } = req.body;
  const tables = readData(TABLES_FILE);
  const foundTable = tables.find(t => t.id === parseInt(tableId, 10));
  const tableName = foundTable ? foundTable.name : `Table ${tableId}`;

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

// QR Code Generator (Data URL PNG)
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

    const isHttps = isVercel || req.headers['x-forwarded-proto'] === 'https' || (req.headers.host && !req.headers.host.includes('localhost') && !req.headers.host.includes('127.0.0.1'));
    const protocol = isHttps ? 'https' : 'http';
    const targetUrl = `${protocol}://${host}/?table=${tableId}&token=${table.sessionToken}`;
    
    const qrDataUrl = await QRCode.toDataURL(targetUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0f3825',
        light: '#ffffff'
      }
    });

    res.json({
      tableId,
      sessionToken: table.sessionToken,
      targetUrl,
      qrDataUrl
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR Code' });
  }
});

// Socket.io Connection Logic
io.on('connection', (socket) => {
  // Join role or table room
  socket.on('join', ({ role, tableId }) => {
    if (role === 'kitchen') {
      socket.join('kitchen');
    } else if (role === 'admin') {
      socket.join('admin');
    }
    
    if (tableId) {
      socket.join(`table_${tableId}`);
    }
  });

  socket.on('disconnect', () => {
    // Left room
  });
});

// Start server if executed directly (e.g., node server.js) and not in Vercel serverless
if (require.main === module && !process.env.VERCEL) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`  Smart Restaurant QR Ordering System Started!     `);
    console.log(`  Local Access:      http://localhost:${PORT}      `);
    console.log(`  Phone on Wi-Fi:    http://${LOCAL_IP}:${PORT}    `);
    console.log(`  Kitchen Display:   http://localhost:${PORT}/kitchen.html `);
    console.log(`  Table QR Stands:   http://localhost:${PORT}/qr-stands.html`);
    console.log(`  Admin Dashboard:   http://localhost:${PORT}/admin.html   `);
    console.log(`====================================================`);
  });
}

module.exports = app;
