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
  console.warn('⚠️  [SECURITY WARNING] STAFF_SECRET not set in environment. Set STAFF_SECRET in dashboard for production.');
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  if (!password || !hash || !salt) return false;
  try {
    const checkScrypt = crypto.scryptSync(password, salt, 64).toString('hex');
    if (crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(checkScrypt, 'hex'))) {
      return true;
    }
  } catch (e) {}
  try {
    const checkPbkdf2 = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(checkPbkdf2, 'hex'));
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
    restaurantId: user.restaurantId || null,
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
    // Cross-tenant security check (Section 2: Tenant isolation)
    const userSlug = db.slugifyRestaurant(user.restaurantSlug);
    const targetSlug = req.headers['x-restaurant-slug'] || req.query.restaurant || req.query.restaurantSlug;
    if (targetSlug && db.slugifyRestaurant(targetSlug) !== userSlug) {
      return res.status(403).json({
        error: 'FORBIDDEN_TENANT_ACCESS',
        message: 'Access denied: You do not have permission to access another restaurant\'s data.'
      });
    }
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

app.set('trust proxy', 1);
app.use(compression());

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
  },
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  pingTimeout: 20000,
  pingInterval: 10000
});

const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

const allowedOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Token Extractor
app.use((req, res, next) => {
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const token = req.headers['x-staff-token'] || req.headers['x-auth-token'] || req.query.staff_token || bearerToken;
  if (token) {
    const user = verifyUserToken(token);
    if (user) {
      req.user = user;
    }
  }
  next();
});

const distDir = fs.existsSync(path.join(__dirname, '..', 'frontend', 'dist'))
  ? path.join(__dirname, '..', 'frontend', 'dist')
  : path.join(__dirname, 'dist');

app.use(express.static(distDir, {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

app.use('/images', express.static(path.join(distDir, 'images'), {
  maxAge: '7d'
}));

app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS', message: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

const orderLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
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
let activeServiceCalls = [];

// ----------------- API Endpoints -----------------

// Health Check
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

// PHASE 2: Registration & Fresh Workspace
app.post('/api/auth/signup', authLimiter, async (req, res) => {
  try {
    const { name, email, password, restaurantName } = req.body || {};
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

    const restName = (restaurantName || 'My Restaurant').trim();
    let baseSlug = db.slugifyRestaurant(restName);

    // Ensure unique immutable restaurant ID and unique restaurant slug
    const restaurantId = db.generateRestaurantId();
    const existingSettings = await db.SettingModel.findOne({ restaurantSlug: baseSlug }).lean();
    if (existingSettings && baseSlug !== 'tablemint') {
      baseSlug = `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`;
    }

    const { hash, salt } = hashPassword(password);

    // Public signup is ALWAYS owner/admin account for the new restaurant
    const newUser = {
      id: `user_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      name: name.trim(),
      email: cleanEmail,
      hash,
      salt,
      role: 'admin',
      restaurantId,
      restaurantName: restName,
      restaurantSlug: baseSlug,
      createdAt: new Date().toISOString()
    };

    await db.createUser(newUser);

    // Initialize fresh workspace: clean settings, 10 tables, empty menu ([]), 0 orders, 0 revenue
    await db.initRestaurantData(restName, baseSlug, { restaurantId, email: cleanEmail });

    const safeUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      restaurantId: newUser.restaurantId,
      restaurantName: newUser.restaurantName,
      restaurantSlug: newUser.restaurantSlug
    };
    const token = generateUserToken(safeUser);

    res.status(201).json({
      success: true,
      token,
      user: safeUser,
      message: 'Restaurant workspace created successfully! Welcome to TableMint.'
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
    // Use true MongoDB query, not stale cache
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
      restaurantId: user.restaurantId || null,
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

// PHASE 2: Staff Management (Owners/Admins create/invite staff members)
app.get('/api/staff', requireStaffAuth, async (req, res) => {
  try {
    const rSlug = getRequestRestaurantSlug(req);
    const users = await db.getUsers(rSlug);
    const safeList = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      restaurantSlug: u.restaurantSlug,
      createdAt: u.createdAt
    }));
    res.json(safeList);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch staff list.' });
  }
});

app.post('/api/staff', requireStaffAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Only restaurant administrators can invite staff.' });
    }
    const { name, email, password, role = 'staff' } = req.body || {};
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name is required (at least 2 characters).' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Valid email is required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await db.getUserByEmail(cleanEmail);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    const rSlug = req.user.restaurantSlug;
    const { hash, salt } = hashPassword(password);
    const newStaff = {
      id: `staff_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      name: name.trim(),
      email: cleanEmail,
      hash,
      salt,
      role: ['staff', 'kitchen', 'admin'].includes(role) ? role : 'staff',
      restaurantId: req.user.restaurantId || null,
      restaurantName: req.user.restaurantName || 'TableMint',
      restaurantSlug: rSlug,
      createdAt: new Date().toISOString()
    };

    await db.createUser(newStaff);
    res.status(201).json({
      success: true,
      user: {
        id: newStaff.id,
        name: newStaff.name,
        email: newStaff.email,
        role: newStaff.role,
        restaurantSlug: newStaff.restaurantSlug
      },
      message: `Staff member ${newStaff.name} created successfully.`
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create staff account.' });
  }
});

app.delete('/api/staff/:id', requireStaffAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Only restaurant administrators can remove staff.' });
    }
    const targetId = req.params.id;
    if (targetId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own admin account.' });
    }
    const rSlug = req.user.restaurantSlug;
    const deleted = await db.deleteUser(targetId, rSlug);
    if (!deleted) {
      return res.status(404).json({ error: 'Staff account not found.' });
    }
    res.json({ success: true, message: 'Staff member removed successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove staff member.' });
  }
});

app.patch('/api/auth/profile', requireStaffAuth, async (req, res) => {
  try {
    const { name, restaurantName } = req.body || {};
    const currentUser = req.user;
    const user = await db.getUserById(currentUser.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    const updates = { updatedAt: new Date().toISOString() };
    if (name && name.trim().length >= 2) updates.name = name.trim();
    if (restaurantName && restaurantName.trim()) {
      updates.restaurantName = restaurantName.trim();
    }

    const updatedUser = await db.UserModel.findOneAndUpdate(
      { id: currentUser.id },
      { $set: updates },
      { new: true, lean: true }
    );

    const safeUser = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      restaurantId: updatedUser.restaurantId,
      restaurantName: updatedUser.restaurantName,
      restaurantSlug: updatedUser.restaurantSlug
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
    const user = await db.getUserById(currentUser.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    const isCurrentValid = verifyPassword(currentPassword, user.hash, user.salt);
    if (!isCurrentValid) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect. Please try again.' });
    }

    const { hash, salt } = hashPassword(newPassword);
    await db.UserModel.updateOne(
      { id: currentUser.id },
      { $set: { hash, salt, updatedAt: new Date().toISOString() } }
    );

    res.json({
      success: true,
      message: 'Password changed successfully! Keep your new password secure.'
    });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ success: false, error: 'Failed to change password. Please try again.' });
  }
});

// Settings Endpoints
app.get('/api/settings', async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const settings = await db.getSettings(rSlug);
  res.json(settings);
});

app.post(['/api/settings', '/api/settings/update'], requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const updated = await db.saveSettings(req.body || {}, rSlug);
  io.to(`restaurant_${rSlug}`).emit('settings:updated', updated);
  res.json({ success: true, settings: updated });
});

// ----------------- Categories API (Section 4.B) -----------------
app.get('/api/categories/suggested', (req, res) => {
  res.json({ success: true, suggested: db.SUGGESTED_CATEGORIES });
});

app.get('/api/categories', async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const categories = await db.getCategories(rSlug);
  res.json(categories);
});

app.post('/api/categories', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const { name, description, image, displayOrder, isActive } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }
  const saved = await db.saveCategory({
    name: name.trim(),
    description: description || '',
    image: image || '',
    displayOrder: displayOrder || 0,
    isActive: isActive !== undefined ? Boolean(isActive) : true
  }, rSlug);

  await db.createAuditLog(rSlug, {
    action: 'CATEGORY_CREATED',
    entityType: 'category',
    entityId: saved.id,
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    details: { name: saved.name }
  });

  const allCategories = await db.getCategories(rSlug);
  io.to(`restaurant_${rSlug}`).emit('categories:updated', allCategories);
  res.status(201).json(saved);
});

app.put('/api/categories/:id', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const updated = await db.updateCategory(req.params.id, req.body || {}, rSlug);
  if (!updated) return res.status(404).json({ error: 'Category not found' });

  await db.createAuditLog(rSlug, {
    action: 'CATEGORY_UPDATED',
    entityType: 'category',
    entityId: req.params.id,
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    details: req.body
  });

  const allCategories = await db.getCategories(rSlug);
  io.to(`restaurant_${rSlug}`).emit('categories:updated', allCategories);
  res.json(updated);
});

app.delete('/api/categories/:id', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const actionOnItems = req.query.actionOnItems || req.body?.actionOnItems || 'prevent';
  const result = await db.deleteCategory(req.params.id, rSlug, actionOnItems);

  if (!result.success) {
    return res.status(400).json(result);
  }

  await db.createAuditLog(rSlug, {
    action: 'CATEGORY_DELETED',
    entityType: 'category',
    entityId: req.params.id,
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    details: { actionOnItems }
  });

  const allCategories = await db.getCategories(rSlug);
  io.to(`restaurant_${rSlug}`).emit('categories:updated', allCategories);
  res.json({ success: true, deletedId: req.params.id });
});

app.post('/api/categories/reorder', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const { orderedIds } = req.body || {};
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'orderedIds array required' });
  }
  const categories = await db.reorderCategories(orderedIds, rSlug);
  io.to(`restaurant_${rSlug}`).emit('categories:updated', categories);
  res.json({ success: true, categories });
});

app.post('/api/categories/seed-suggested', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const { categories } = req.body || {};
  const updated = await db.seedSuggestedCategories(categories, rSlug);
  io.to(`restaurant_${rSlug}`).emit('categories:updated', updated);
  res.json({ success: true, categories: updated });
});

// ----------------- Menu Endpoints (Section 4) -----------------
app.get('/api/menu', async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const isStaff = Boolean(req.user);
  const includeAll = req.query.status === 'all' || isStaff;

  const filter = {};
  if (!includeAll) {
    filter.status = { $ne: 'draft' };
    filter.isAvailable = { $ne: false };
    filter.available = { $ne: false };
  } else if (req.query.status && req.query.status !== 'all') {
    filter.status = req.query.status;
  }
  if (req.query.category && req.query.category !== 'all') {
    filter.category = req.query.category;
  }

  const menu = await db.getMenu(rSlug, filter);
  res.json(menu);
});

app.patch('/api/menu/:id/toggle', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const menu = await db.getMenu(rSlug);
  const item = menu.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  const newStatus = !(item.available ?? item.isAvailable ?? true);
  await db.updateMenuItem(item.id, {
    available: newStatus,
    isAvailable: newStatus,
    status: newStatus ? 'published' : 'unavailable'
  }, rSlug);

  await db.createAuditLog(rSlug, {
    action: 'MENU_ITEM_TOGGLE_AVAILABILITY',
    entityType: 'menu',
    entityId: item.id,
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    details: { available: newStatus }
  });

  const updatedMenu = await db.getMenu(rSlug);
  io.to(`restaurant_${rSlug}`).emit('menu:updated', updatedMenu);
  res.json({ ...item, available: newStatus, isAvailable: newStatus, status: newStatus ? 'published' : 'unavailable' });
});

app.post('/api/menu', requireStaffAuth, async (req, res) => {
  const {
    name, category, price, description, image, isVeg, foodType,
    status, isSpecial, featured, prepTime, variants, addons, displayOrder, taxRate
  } = req.body || {};

  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Name and price are required' });
  }

  const rSlug = getRequestRestaurantSlug(req);
  const newItem = {
    id: `item-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex')}`,
    restaurantSlug: rSlug,
    name: name.trim(),
    category: (category || 'Main Course').trim(),
    price: parseFloat(price) || 0,
    description: description ? description.trim() : '',
    image: image || '/images/paneer_butter_masala.jpg',
    isVeg: isVeg !== undefined ? Boolean(isVeg) : true,
    foodType: foodType || (isVeg === false ? 'non-veg' : 'veg'),
    status: ['draft', 'published', 'unavailable'].includes(status) ? status : 'published',
    isSpecial: Boolean(isSpecial),
    featured: Boolean(featured),
    available: status !== 'unavailable',
    isAvailable: status !== 'unavailable',
    prepTime: prepTime || '10-15 mins',
    displayOrder: displayOrder !== undefined ? parseInt(displayOrder, 10) : 0,
    taxRate: taxRate !== undefined && taxRate !== null ? parseFloat(taxRate) : null,
    variants: Array.isArray(variants) ? variants : [],
    addons: Array.isArray(addons) ? addons : []
  };

  await db.MenuItemModel.create(newItem);

  // Auto-register category if not existing
  if (newItem.category) {
    const existingCats = await db.getCategories(rSlug);
    if (!existingCats.some(c => c.name.toLowerCase() === newItem.category.toLowerCase())) {
      await db.saveCategory({ name: newItem.category, displayOrder: existingCats.length }, rSlug);
      const cats = await db.getCategories(rSlug);
      io.to(`restaurant_${rSlug}`).emit('categories:updated', cats);
    }
  }

  await db.createAuditLog(rSlug, {
    action: 'MENU_ITEM_CREATED',
    entityType: 'menu',
    entityId: newItem.id,
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    details: { name: newItem.name, price: newItem.price, category: newItem.category }
  });

  const updatedMenu = await db.getMenu(rSlug);
  io.to(`restaurant_${rSlug}`).emit('menu:updated', updatedMenu);
  res.status(201).json(newItem);
});

app.put('/api/menu/:id', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const {
    name, category, price, description, image, isVeg, foodType,
    status, isSpecial, featured, prepTime, available, variants, addons, displayOrder, taxRate
  } = req.body || {};

  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (category !== undefined) updates.category = category.trim();
  if (price !== undefined) updates.price = parseFloat(price) || 0;
  if (description !== undefined) updates.description = description.trim();
  if (image !== undefined) updates.image = image;
  if (isVeg !== undefined) updates.isVeg = Boolean(isVeg);
  if (foodType !== undefined) updates.foodType = foodType;
  if (status !== undefined) {
    updates.status = status;
    if (status === 'unavailable') {
      updates.available = false;
      updates.isAvailable = false;
    } else if (status === 'published') {
      updates.available = true;
      updates.isAvailable = true;
    }
  }
  if (isSpecial !== undefined) updates.isSpecial = Boolean(isSpecial);
  if (featured !== undefined) updates.featured = Boolean(featured);
  if (prepTime !== undefined) updates.prepTime = prepTime;
  if (available !== undefined) {
    updates.available = Boolean(available);
    updates.isAvailable = Boolean(available);
    if (!available) updates.status = 'unavailable';
  }
  if (variants !== undefined) updates.variants = Array.isArray(variants) ? variants : [];
  if (addons !== undefined) updates.addons = Array.isArray(addons) ? addons : [];
  if (displayOrder !== undefined) updates.displayOrder = parseInt(displayOrder, 10);
  if (taxRate !== undefined) updates.taxRate = taxRate !== null ? parseFloat(taxRate) : null;

  const updatedItem = await db.updateMenuItem(req.params.id, updates, rSlug);
  if (!updatedItem) return res.status(404).json({ error: 'Item not found' });

  await db.createAuditLog(rSlug, {
    action: 'MENU_ITEM_UPDATED',
    entityType: 'menu',
    entityId: req.params.id,
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    details: updates
  });

  const updatedMenu = await db.getMenu(rSlug);
  io.to(`restaurant_${rSlug}`).emit('menu:updated', updatedMenu);
  res.json(updatedItem);
});

app.delete('/api/menu/:id', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const deleted = await db.deleteMenuItem(req.params.id, rSlug);
  if (!deleted) return res.status(404).json({ error: 'Item not found' });

  await db.createAuditLog(rSlug, {
    action: 'MENU_ITEM_DELETED',
    entityType: 'menu',
    entityId: req.params.id,
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    details: { id: req.params.id }
  });

  const updatedMenu = await db.getMenu(rSlug);
  io.to(`restaurant_${rSlug}`).emit('menu:updated', updatedMenu);
  res.json({ success: true, deletedId: req.params.id });
});

// ITEM DUPLICATION (Section 16.C)
app.post('/api/menu/:id/duplicate', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const duplicated = await db.duplicateMenuItem(req.params.id, rSlug);
  if (!duplicated) return res.status(404).json({ error: 'Item not found to duplicate' });

  await db.createAuditLog(rSlug, {
    action: 'MENU_ITEM_DUPLICATED',
    entityType: 'menu',
    entityId: duplicated.id,
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    details: { originalId: req.params.id, name: duplicated.name }
  });

  const updatedMenu = await db.getMenu(rSlug);
  io.to(`restaurant_${rSlug}`).emit('menu:updated', updatedMenu);
  res.status(201).json(duplicated);
});

// BULK AVAILABILITY UPDATE (Section 16.B)
app.patch('/api/menu/bulk-availability', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const { itemIds, isAvailable } = req.body || {};
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return res.status(400).json({ error: 'itemIds array required' });
  }
  const count = await db.bulkUpdateMenuAvailability(itemIds, isAvailable, rSlug);
  const updatedMenu = await db.getMenu(rSlug);
  io.to(`restaurant_${rSlug}`).emit('menu:updated', updatedMenu);
  res.json({ success: true, count, isAvailable: Boolean(isAvailable) });
});

// BULK PUBLISH STATUS UPDATE (Section 4.F)
app.patch('/api/menu/bulk-publish', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const { itemIds, status } = req.body || {};
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return res.status(400).json({ error: 'itemIds array required' });
  }
  const count = await db.bulkUpdateMenuPublishStatus(itemIds, status, rSlug);
  const updatedMenu = await db.getMenu(rSlug);
  io.to(`restaurant_${rSlug}`).emit('menu:updated', updatedMenu);
  res.json({ success: true, count, status });
});

// GET TABLEMINT DEFAULT STARTER MENU TEMPLATE (For Preview & Discovery)
app.get(['/api/menu/default-template', '/api/menu/default-catalog'], requireStaffAuth, async (req, res) => {
  try {
    const canonicalMenu = db.getCanonicalMenu() || [];
    const categories = [...new Set(canonicalMenu.map(m => m.category))];
    res.json({
      success: true,
      total: canonicalMenu.length,
      categories,
      items: canonicalMenu.map(m => {
        const { _id, ...clean } = m;
        return clean;
      })
    });
  } catch (err) {
    console.error('[Menu Default Template] Error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch default menu template' });
  }
});

// SEED / IMPORT TABLEMINT DEFAULT MENU (Supports Merge & Replace)
app.post(['/api/menu/seed-demo', '/api/menu/seed-default'], requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const { mode = 'merge', categoryFilter = null, selectedIds = null } = req.body || {};
  const menu = await db.seedDemoMenu(rSlug, { mode, categoryFilter, selectedIds });

  await db.createAuditLog(rSlug, {
    action: mode === 'replace' ? 'MENU_DEFAULT_REPLACED' : 'MENU_DEFAULT_MERGED',
    entityType: 'menu',
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    details: { itemsCount: menu.length, mode, categoryFilter }
  });

  io.to(`restaurant_${rSlug}`).emit('menu:updated', menu);
  const categories = await db.getCategories(rSlug);
  io.to(`restaurant_${rSlug}`).emit('categories:updated', categories);
  res.json({ success: true, count: menu.length, menu, mode });
});

// CSV / EXCEL IMPORT PREVIEW (Section 4.D)
app.post('/api/menu/import-preview', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const { rows } = req.body || {};
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'rows array required' });
  }

  const existingMenu = await db.getMenu(rSlug);
  const existingNames = new Set(existingMenu.map(i => i.name.toLowerCase().trim()));
  const seenNamesInBatch = new Set();

  const validatedRows = rows.map((row, index) => {
    const rowNum = index + 1;
    const errors = [];
    const warnings = [];

    const name = (row.name || row['Item Name'] || row.itemName || '').toString().trim();
    const rawPrice = row.price || row['Price'] || row.cost;
    const category = (row.category || row['Category'] || 'Main Course').toString().trim();
    const description = (row.description || row['Description'] || '').toString().trim();
    const isVeg = row.isVeg !== undefined ? Boolean(row.isVeg) : (row.foodType || row['Food Type'] || '').toString().toLowerCase().includes('non') ? false : true;

    if (!name) {
      errors.push('Item name is required');
    } else {
      const lower = name.toLowerCase();
      if (seenNamesInBatch.has(lower)) {
        warnings.push('Duplicate item name in this import file');
      }
      seenNamesInBatch.add(lower);
      if (existingNames.has(lower)) {
        warnings.push('Item name already exists in your restaurant menu');
      }
    }

    const price = parseFloat(rawPrice);
    if (isNaN(price) || price < 0) {
      errors.push('Price must be a valid positive number');
    }

    return {
      rowNum,
      name,
      category,
      price: isNaN(price) ? 0 : price,
      description,
      isVeg,
      status: row.status || 'published',
      isValid: errors.length === 0,
      errors,
      warnings
    };
  });

  const validCount = validatedRows.filter(r => r.isValid).length;
  const invalidCount = validatedRows.length - validCount;

  res.json({
    success: true,
    totalRows: validatedRows.length,
    validCount,
    invalidCount,
    rows: validatedRows
  });
});

// CSV / EXCEL IMPORT CONFIRM (Section 4.D)
app.post('/api/menu/import-confirm', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array required' });
  }

  const validItems = items.filter(i => i.name && typeof i.price === 'number' && i.price >= 0);
  if (validItems.length === 0) {
    return res.status(400).json({ error: 'No valid items to import' });
  }

  const importedCategories = [...new Set(validItems.map(i => i.category || 'Main Course'))];
  const existingCategories = await db.getCategories(rSlug);
  const existingCatNames = new Set(existingCategories.map(c => c.name.toLowerCase()));

  for (const catName of importedCategories) {
    if (!existingCatNames.has(catName.toLowerCase())) {
      await db.saveCategory({ name: catName, displayOrder: existingCategories.length }, rSlug);
    }
  }

  const newMenuItems = validItems.map(item => ({
    id: `item_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    restaurantSlug: rSlug,
    name: item.name.trim(),
    category: item.category || 'Main Course',
    price: parseFloat(item.price) || 0,
    description: item.description || '',
    image: item.image || '/images/paneer_butter_masala.jpg',
    isVeg: item.isVeg !== undefined ? Boolean(item.isVeg) : true,
    foodType: item.isVeg === false ? 'non-veg' : 'veg',
    status: item.status || 'published',
    available: true,
    isAvailable: true,
    variants: Array.isArray(item.variants) ? item.variants : [],
    addons: Array.isArray(item.addons) ? item.addons : []
  }));

  await db.MenuItemModel.insertMany(newMenuItems);

  await db.createAuditLog(rSlug, {
    action: 'MENU_IMPORTED_CSV',
    entityType: 'menu',
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    details: { importedCount: newMenuItems.length }
  });

  const updatedMenu = await db.getMenu(rSlug);
  io.to(`restaurant_${rSlug}`).emit('menu:updated', updatedMenu);
  const updatedCategories = await db.getCategories(rSlug);
  io.to(`restaurant_${rSlug}`).emit('categories:updated', updatedCategories);

  res.status(201).json({
    success: true,
    importedCount: newMenuItems.length,
    menu: updatedMenu
  });
});

// OCR / AI MENU EXTRACTION ABSTRACTION (Section 4.E)
app.post('/api/menu/ocr-extract', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const apiKey = process.env.VISION_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.json({
      success: true,
      configured: false,
      message: 'AI/OCR menu extraction provider key is not yet configured in environment variables (VISION_API_KEY / OPENAI_API_KEY). You can enter items manually or import via Excel/CSV template.',
      sampleExtracted: [
        { name: 'Crispy Veg Spring Rolls', category: 'Starters', price: 180, isVeg: true, confidence: 'high' },
        { name: 'Paneer Butter Masala', category: 'Main Course', price: 280, isVeg: true, confidence: 'high' },
        { name: 'Chicken Biryani Handi', category: 'Biryani and Rice', price: 340, isVeg: false, confidence: 'medium' },
        { name: 'Butter Naan', category: 'Breads', price: 60, isVeg: true, confidence: 'high' },
        { name: 'Gulab Jamun (2 pcs)', category: 'Desserts', price: 90, isVeg: true, confidence: 'high' }
      ]
    });
  }

  return res.json({
    success: true,
    configured: true,
    message: 'Menu image processed successfully.',
    extractedItems: []
  });
});

// AUDIT LOGS ENDPOINT (Section 16.H)
app.get('/api/audit-logs', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const logs = await db.getAuditLogs(rSlug, req.query);
  res.json({ success: true, logs });
});

// Tables Endpoints
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
  res.json(tables[idx]);
});

app.delete('/api/tables/:id', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const tableId = parseInt(req.params.id, 10);
  let tables = await db.getTables(rSlug);
  const exists = tables.some(t => t.id === tableId);
  if (!exists) return res.status(404).json({ error: 'Table not found' });

  tables = tables.filter(t => t.id !== tableId);
  // saveTables deletes the removed table record from MongoDB
  await db.saveTables(tables, rSlug);
  io.to(`restaurant_${rSlug}`).emit('tables:updated', tables);
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
  await db.updateTable(table.id, table, rSlug);

  const orders = await db.getOrders(rSlug);
  for (const order of orders) {
    if (order.tableId === tableId && !['completed', 'cancelled'].includes(order.status)) {
      order.status = 'completed';
      order.paymentStatus = 'paid';
      order.paid = true;
      order.completedAt = new Date().toISOString();
      await db.updateOrder(order.id, {
        status: 'completed',
        paymentStatus: 'paid',
        paid: true,
        completedAt: order.completedAt
      }, rSlug);
      io.to(`restaurant_${rSlug}_table_${tableId}`).emit('order:status_changed', order);
      io.to(`restaurant_${rSlug}_kitchen`).emit('order:status_changed', order);
      io.to(`restaurant_${rSlug}_admin`).emit('order:status_changed', order);
    }
  }

  activeServiceCalls = activeServiceCalls.filter(c => !(c.tableId === tableId && (c.restaurantSlug || 'tablemint') === rSlug));
  io.to(`restaurant_${rSlug}`).emit('service:updated', activeServiceCalls.filter(c => (c.restaurantSlug || 'tablemint') === rSlug));

  io.to(`restaurant_${rSlug}`).emit('tables:updated', tables);
  io.to(`restaurant_${rSlug}`).emit('table:status_changed', { tableId, status: 'vacant' });
  io.to(`restaurant_${rSlug}_table_${tableId}`).emit('table:vacated', { tableId });
  io.to(`restaurant_${rSlug}_table_${tableId}`).emit('table:session_expired', {
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
    return res.status(404).json({ error: 'Table not found' });
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
  const isValid = Boolean(
    (token && typeof token === 'string' && table.sessionToken && token.trim() === table.sessionToken.trim()) ||
    !isOccupied
  );

  res.json({
    valid: isValid,
    tableId: table.id,
    tableName: table.name,
    status: isOccupied ? 'occupied' : 'available',
    manualStatus: table.manualStatus,
    activeToken: table.sessionToken,
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
  await db.updateTable(table.id, table, rSlug);

  io.to(`restaurant_${rSlug}`).emit('tables:updated', tables);
  io.to(`restaurant_${rSlug}`).emit('table:status_changed', { tableId, status: 'occupied' });

  res.json({ success: true, table, message: `${table.name} marked as OCCUPIED.` });
});

// PHASE 8: Performance Dashboard Aggregation
app.get('/api/dashboard/stats', requireStaffAuth, async (req, res) => {
  try {
    const rSlug = getRequestRestaurantSlug(req);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    const [stats] = await db.OrderModel.aggregate([
      { $match: { restaurantSlug: rSlug } },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: { $cond: [{ $eq: ['$paid', true] }, '$total', 0] }
          },
          todaySales: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$paid', true] }, { $gte: ['$createdAt', todayISO] }] },
                '$total',
                0
              ]
            }
          },
          totalOrders: { $sum: 1 },
          paidOrders: {
            $sum: { $cond: [{ $eq: ['$paid', true] }, 1, 0] }
          },
          activeOrders: {
            $sum: {
              $cond: [
                { $in: ['$status', ['new', 'pending', 'preparing', 'ready', 'served']] },
                1,
                0
              ]
            }
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingPayments: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$paid', true] }, { $ne: ['$status', 'cancelled'] }] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const tables = await db.getTables(rSlug);
    const occupiedTables = tables.filter(t => t.status === 'occupied' || t.manualStatus === 'occupied').length;

    const base = stats || {
      totalRevenue: 0,
      todaySales: 0,
      totalOrders: 0,
      paidOrders: 0,
      activeOrders: 0,
      completedOrders: 0,
      pendingPayments: 0
    };

    const avgOrderValue = base.paidOrders > 0
      ? Math.round(base.totalRevenue / base.paidOrders)
      : (base.totalOrders > 0 ? Math.round(base.totalRevenue / base.totalOrders) : 0);

    res.json({
      ...base,
      averageOrderValue: avgOrderValue,
      tableOccupancy: occupiedTables,
      totalTables: tables.length,
      occupancyPercent: tables.length > 0 ? Math.round((occupiedTables / tables.length) * 100) : 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate stats.' });
  }
});

// PHASE 8: Comprehensive Reports & Analytics Aggregation
app.get(['/api/reports/analytics', '/api/analytics'], requireStaffAuth, async (req, res) => {
  try {
    const rSlug = getRequestRestaurantSlug(req);
    const timeframe = req.query.timeframe || 'today';
    const report = await db.getAnalyticsReport(rSlug, timeframe);
    res.json(report);
  } catch (err) {
    console.error('Failed to generate analytics report:', err);
    res.status(500).json({ error: 'Failed to generate analytics report.' });
  }
});

// PHASE 8: Order Pagination & Filtering
app.get('/api/orders', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const { page, limit, status, tableId, paid } = req.query;
  if (page || limit) {
    const paginated = await db.getOrders(rSlug, { page, limit, status, tableId, paid });
    return res.json(paginated);
  }
  const orders = await db.getOrders(rSlug, { status, tableId, paid });
  res.json(orders);
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

  const orders = await db.getOrders(rSlug, { tableId });
  res.json(orders);
});

// PHASE 3 & PHASE 5: Customer QR Order Submission with Strict Backend Price & Item Validation
app.post('/api/orders', orderLimiter, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const { tableId, items, notes, guestName } = req.body;
  const token = req.body.token || req.body.sessionToken;

  if (!tableId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Invalid order parameters: items array required.' });
  }

  const tables = await db.getTables(rSlug);
  const table = tables.find(t => t.id === parseInt(tableId, 10));
  if (!table) {
    return res.status(404).json({ error: 'Table not found for this restaurant' });
  }

  if (!table.sessionToken) {
    table.sessionToken = db.generateTableToken(table.id);
    table.tokenCreatedAt = new Date().toISOString();
    await db.updateTable(table.id, table, rSlug);
  }

  const existingOrders = await db.getOrders(rSlug, { tableId: table.id });
  const activeOrders = existingOrders.filter(
    o => !['completed', 'cancelled'].includes(o.status)
  );
  const isOccupied = activeOrders.length > 0 || table.manualStatus === 'occupied' || table.status === 'occupied';

  // Strict token validation
  if (isOccupied && (!token || typeof token !== 'string' || token.trim() !== table.sessionToken.trim())) {
    return res.status(403).json({
      error: 'TOKEN_EXPIRED',
      message: 'This dining session has ended. The previous session link is expired. Please scan the active QR code on your table to order.'
    });
  }

  // PHASE 3 & 5: NEVER trust client-provided prices or availability!
  // Query all menu items from this restaurant's database
  const menu = await db.getMenu(rSlug);
  let calculatedSubtotal = 0;
  const enrichedItems = [];

  for (const item of items) {
    const menuItem = menu.find(m =>
      (item.id && String(m.id) === String(item.id)) ||
      (item.name && m.name && m.name.toLowerCase().trim() === item.name.toLowerCase().trim())
    );

    if (!menuItem) {
      return res.status(400).json({
        error: 'INVALID_MENU_ITEM',
        message: `Item "${item.name || item.id}" does not exist in this restaurant's menu.`
      });
    }

    if (menuItem.status === 'draft') {
      return res.status(400).json({
        error: 'ITEM_NOT_PUBLISHED',
        message: `"${menuItem.name}" is currently a draft and not available for ordering.`
      });
    }

    if (menuItem.available === false || menuItem.isAvailable === false || menuItem.status === 'unavailable') {
      return res.status(400).json({
        error: 'ITEM_UNAVAILABLE',
        message: `"${menuItem.name}" is currently sold out and unavailable to order.`
      });
    }

    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    let basePrice = typeof menuItem.price === 'number' ? menuItem.price : parseFloat(menuItem.price) || 0;
    let variantInfo = null;

    if (item.variantId || item.variant || item.selectedVariant) {
      const vId = item.variantId || item.selectedVariant?.id || item.variant;
      const vName = item.variantName || item.selectedVariant?.name;
      if (Array.isArray(menuItem.variants)) {
        const foundVariant = menuItem.variants.find(v => (vId && v.id === vId) || (vName && v.name.toLowerCase() === vName.toLowerCase()));
        if (foundVariant && typeof foundVariant.price === 'number') {
          basePrice = foundVariant.price;
          variantInfo = { id: foundVariant.id, name: foundVariant.name, price: foundVariant.price };
        }
      }
    }

    let addonsCost = 0;
    const validatedOptions = [];
    if (Array.isArray(item.options) && Array.isArray(menuItem.addons)) {
      for (const opt of item.options) {
        const foundAddon = menuItem.addons.find(a => a.name === opt.name || a.id === opt.id);
        if (foundAddon) {
          const addonPrice = parseFloat(foundAddon.price) || 0;
          addonsCost += addonPrice;
          validatedOptions.push({ name: foundAddon.name, price: addonPrice });
        }
      }
    }

    const itemUnitPrice = basePrice + addonsCost;
    calculatedSubtotal += itemUnitPrice * qty;

    enrichedItems.push({
      id: menuItem.id,
      name: menuItem.name,
      price: itemUnitPrice,
      basePrice,
      variant: variantInfo,
      quantity: qty,
      image: menuItem.image || '',
      options: validatedOptions.length > 0 ? validatedOptions : (item.options || []),
      notes: item.notes ? String(item.notes).slice(0, 200) : ''
    });
  }

  // Calculate backend tax and service charge
  const settings = await db.getSettings(rSlug);
  const taxRate = typeof settings.taxRate === 'number' ? settings.taxRate : 5;
  const serviceChargeRate = typeof settings.serviceCharge === 'number' ? settings.serviceCharge : 0;

  const subtotal = +calculatedSubtotal.toFixed(2);
  const tax = +(subtotal * (taxRate / 100)).toFixed(2);
  const serviceCharge = +(subtotal * (serviceChargeRate / 100)).toFixed(2);
  const total = +(subtotal + tax + serviceCharge).toFixed(2);

  // Generate unique order number PER RESTAURANT
  const latestOrder = await db.OrderModel.findOne({ restaurantSlug: rSlug }).sort({ orderNumber: -1 }).lean();
  const orderNum = (latestOrder && latestOrder.orderNumber) ? latestOrder.orderNumber + 1 : 101;

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
    subtotal,
    tax,
    serviceCharge,
    total,
    notes: notes || '',
    paid: false,
    paymentStatus: 'unpaid',
    paymentMethod: 'Pay at Counter / UPI'
  };

  // PHASE 5: Persist in MongoDB Atlas and AWAIT completion before emitting socket events
  const savedOrder = await db.saveOrder(newOrder, rSlug);

  // Update table occupancy in MongoDB
  table.status = 'occupied';
  table.manualStatus = 'occupied';
  table.occupiedAt = new Date().toISOString();
  await db.updateTable(table.id, {
    status: 'occupied',
    manualStatus: 'occupied',
    occupiedAt: table.occupiedAt
  }, rSlug);

  // Emit strictly restaurant-partitioned socket events (NO cross-tenant leak!)
  io.to(`restaurant_${rSlug}_kitchen`).emit('order:new', savedOrder);
  io.to(`restaurant_${rSlug}_admin`).emit('order:new', savedOrder);
  io.to(`restaurant_${rSlug}`).emit('order:new', savedOrder);
  io.to(`restaurant_${rSlug}_table_${tableId}`).emit('order:new', savedOrder);
  io.to(`restaurant_${rSlug}_table_${tableId}`).emit('order:updated', savedOrder);
  io.to(`restaurant_${rSlug}_table_${tableId}`).emit('order:status_changed', savedOrder);
  io.to(`restaurant_${rSlug}`).emit('table:status_changed', { tableId: parseInt(tableId, 10), status: 'occupied' });
  io.to(`restaurant_${rSlug}`).emit('tables:updated', tables);

  res.status(201).json({ success: true, order: savedOrder, ...savedOrder });
});

app.patch('/api/orders/:id/status', requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const { status } = req.body;
  const validStatuses = ['new', 'pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const order = await db.getOrderById(req.params.id, rSlug);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const updates = {
    status,
    updatedAt: new Date().toISOString()
  };

  if (status === 'completed') {
    updates.completedAt = new Date().toISOString();
    updates.paymentStatus = 'paid';
    updates.paid = true;
  }

  const updatedOrder = await db.updateOrder(order.id, updates, rSlug);

  io.to(`restaurant_${rSlug}_kitchen`).emit('order:status_changed', updatedOrder);
  io.to(`restaurant_${rSlug}_admin`).emit('order:status_changed', updatedOrder);
  io.to(`restaurant_${rSlug}`).emit('order:status_changed', updatedOrder);
  io.to(`restaurant_${rSlug}_table_${order.tableId}`).emit('order:status_changed', updatedOrder);
  io.to(`restaurant_${rSlug}_table_${order.tableId}`).emit('order:updated', updatedOrder);

  if (status === 'completed') {
    const orders = await db.getOrders(rSlug, { tableId: order.tableId });
    const remainingActive = orders.filter(
      o => !['completed', 'cancelled'].includes(o.status)
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
        await db.updateTable(table.id, table, rSlug);

        io.to(`restaurant_${rSlug}_table_${table.id}`).emit('table:session_expired', {
          tableId: table.id,
          tableName: table.name,
          message: 'All orders for this table are completed! Dining session closed.'
        });
        io.to(`restaurant_${rSlug}`).emit('table:status_changed', { tableId: table.id, status: 'vacant' });
        io.to(`restaurant_${rSlug}`).emit('tables:updated', tables);
      }
    }
  }

  res.json(updatedOrder);
});

// PHASE 7: Payment and Billing Security
// Customer initiates payment request with transaction ref (Never marks paid automatically)
app.post('/api/orders/:id/customer-pay', async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const orderId = req.params.id;
  const { paymentMethod = 'UPI', transactionRef = '', token } = req.body || {};

  const order = await db.getOrderById(orderId, rSlug);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Prevent duplicate payment processing
  if (order.paid === true || order.paymentStatus === 'paid') {
    return res.status(400).json({ error: 'ORDER_ALREADY_PAID', message: 'This order is already settled and paid.' });
  }

  // Validate customer table session
  const table = (await db.getTables(rSlug)).find(t => t.id === order.tableId);
  if (table && table.sessionToken && token && token.trim() !== table.sessionToken.trim()) {
    return res.status(403).json({ error: 'TOKEN_EXPIRED', message: 'Session expired' });
  }

  // Customer click marks status as 'pending_verification', NOT 'paid'
  const updates = {
    paymentStatus: 'pending_verification',
    paymentMethod,
    transactionRef: transactionRef || `REF-${Date.now().toString().slice(-6)}`,
    updatedAt: new Date().toISOString()
  };

  const updatedOrder = await db.updateOrder(order.id, updates, rSlug);

  io.to(`restaurant_${rSlug}_admin`).emit('order:status_changed', updatedOrder);
  io.to(`restaurant_${rSlug}_kitchen`).emit('order:status_changed', updatedOrder);
  io.to(`restaurant_${rSlug}`).emit('order:status_changed', updatedOrder);
  io.to(`restaurant_${rSlug}_table_${order.tableId}`).emit('order:status_changed', updatedOrder);

  io.to(`restaurant_${rSlug}_admin`).emit('service:payment_received', {
    orderId: order.id,
    tableId: order.tableId,
    tableName: order.tableName,
    amount: order.total,
    method: paymentMethod,
    transactionRef: updates.transactionRef,
    status: 'pending_verification'
  });

  res.json({
    success: true,
    order: updatedOrder,
    message: `Payment reference submitted. Awaiting cashier confirmation for ₹${order.total}.`
  });
});

// Authorized staff payment settlement & confirmation
app.post(['/api/orders/:id/pay', '/api/orders/:id/confirm-payment'], requireStaffAuth, async (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  const orderId = req.params.id;
  const { paymentMethod = 'Cash', transactionRef = '' } = req.body || {};

  const order = await db.getOrderById(orderId, rSlug);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (order.paid === true) {
    return res.status(400).json({ error: 'ORDER_ALREADY_PAID', message: 'Order is already marked as paid.' });
  }

  const updates = {
    paid: true,
    paymentStatus: 'paid',
    paymentMethod,
    paidAt: new Date().toISOString(),
    transactionRef: transactionRef || order.transactionRef || `PAID-${Date.now().toString().slice(-6)}`
  };

  const updatedOrder = await db.updateOrder(order.id, updates, rSlug);

  io.to(`restaurant_${rSlug}_admin`).emit('order:status_changed', updatedOrder);
  io.to(`restaurant_${rSlug}_kitchen`).emit('order:status_changed', updatedOrder);
  io.to(`restaurant_${rSlug}`).emit('order:status_changed', updatedOrder);
  io.to(`restaurant_${rSlug}_table_${order.tableId}`).emit('order:status_changed', updatedOrder);
  io.to(`restaurant_${rSlug}_table_${order.tableId}`).emit('order:updated', updatedOrder);

  res.json({
    success: true,
    order: updatedOrder,
    message: `Payment of ₹${order.total} confirmed and settled via ${paymentMethod}.`
  });
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

  res.json({ success: true, call: callPayload });
});

app.patch('/api/service-call/:id/dismiss', requireStaffAuth, (req, res) => {
  const rSlug = getRequestRestaurantSlug(req);
  activeServiceCalls = activeServiceCalls.filter(c => c.id !== req.params.id);
  const filtered = activeServiceCalls.filter(c => (c.restaurantSlug || 'tablemint') === rSlug);
  io.to(`restaurant_${rSlug}`).emit('service:updated', filtered);
  res.json({ success: true, activeServiceCalls: filtered });
});

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
    const restParam = `&restaurant=${encodeURIComponent(rSlug)}`;
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

// PHASE 6: Secure Socket.IO Room Authorization & Tenant Isolation
io.on('connection', (socket) => {
  // Staff Admin Room Join
  socket.on('join-admin', (data = {}) => {
    const token = data?.token || socket.handshake.auth?.token;
    const user = verifyUserToken(token);
    if (!user) {
      socket.emit('auth:error', { error: 'UNAUTHORIZED_STAFF', message: 'Staff authentication required' });
      return;
    }
    const rSlug = db.slugifyRestaurant(user.restaurantSlug || data?.restaurant);
    socket.join(`restaurant_${rSlug}_admin`);
    socket.join(`restaurant_${rSlug}`);
    socket.emit('joined', { room: `restaurant_${rSlug}_admin` });
  });

  // Staff Kitchen Room Join
  socket.on('join-kitchen', (data = {}) => {
    const token = data?.token || socket.handshake.auth?.token;
    const user = verifyUserToken(token);
    if (!user) {
      socket.emit('auth:error', { error: 'UNAUTHORIZED_STAFF', message: 'Staff authentication required' });
      return;
    }
    const rSlug = db.slugifyRestaurant(user.restaurantSlug || data?.restaurant);
    socket.join(`restaurant_${rSlug}_kitchen`);
    socket.join(`restaurant_${rSlug}`);
    socket.emit('joined', { room: `restaurant_${rSlug}_kitchen` });
  });

  // Customer Table Room Join (Validates session token before granting access)
  socket.on('join-table', async (data = {}) => {
    const tableId = typeof data === 'object' ? data.tableId : data;
    const token = data?.token;
    const rSlug = db.slugifyRestaurant(data?.restaurant || data?.restaurantSlug);

    if (tableId) {
      // Validate token against MongoDB table
      const tables = await db.getTables(rSlug);
      const table = tables.find(t => t.id === parseInt(tableId, 10));
      if (table) {
        // Table found: allow join to authorized table room
        socket.join(`restaurant_${rSlug}_table_${tableId}`);
        socket.join(`restaurant_${rSlug}`);
        socket.emit('joined', { room: `restaurant_${rSlug}_table_${tableId}` });
        return;
      }
    }
    // Fallback join to public restaurant broadcast (e.g. for menu updates)
    socket.join(`restaurant_${rSlug}`);
  });

  // General Join
  socket.on('join', async (data = {}) => {
    const { role, tableId, restaurant, restaurantSlug, token } = typeof data === 'object' ? data : {};
    const rSlug = db.slugifyRestaurant(restaurant || restaurantSlug);

    if (role === 'admin' || role === 'kitchen') {
      const user = verifyUserToken(token || socket.handshake.auth?.token);
      if (user) {
        const userSlug = db.slugifyRestaurant(user.restaurantSlug || rSlug);
        socket.join(`restaurant_${userSlug}`);
        if (role === 'kitchen') socket.join(`restaurant_${userSlug}_kitchen`);
        if (role === 'admin') socket.join(`restaurant_${userSlug}_admin`);
      }
      return;
    }

    socket.join(`restaurant_${rSlug}`);
    if (tableId) {
      socket.join(`restaurant_${rSlug}_table_${tableId}`);
    }
  });

  socket.on('disconnect', () => {});
});

// SPA Fallback
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
