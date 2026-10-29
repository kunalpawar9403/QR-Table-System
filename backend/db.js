const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const MENU_FILE = path.join(DATA_DIR, 'menu.json');
const TABLES_FILE = path.join(DATA_DIR, 'tables.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Bundled fallbacks
const defaultMenu = require('./data/menu.json');
const defaultTables = require('./data/tables.json');
let defaultOrders = [];
try {
  defaultOrders = require('./data/orders.json');
} catch (e) {
  defaultOrders = [];
}
let defaultUsers = [];
try {
  defaultUsers = require('./data/users.json');
} catch (e) {
  defaultUsers = [];
}

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

// ----------------- Multi-Tenant Slug Utility -----------------
function slugifyRestaurant(name) {
  if (!name || typeof name !== 'string') return 'tablemint';
  const clean = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return clean || 'tablemint';
}

function generateTableToken(tableId) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `T${tableId}-${rand}`;
}

// ----------------- High-Speed In-Memory Cache (RAM speed: 0.1ms) -----------------
const cache = {
  orders: [],
  tables: [],
  menu: [],
  settings: new Map(), // keyed by restaurantSlug
  users: []
};

// Non-blocking Debounced File Writer
const pendingWrites = new Map();
function scheduleFileWrite(filePath, data) {
  if (pendingWrites.has(filePath)) {
    clearTimeout(pendingWrites.get(filePath));
  }
  const timer = setTimeout(() => {
    pendingWrites.delete(filePath);
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tempPath, filePath);
    } catch (err) {
      console.error(`[DB Cache File Error] ${filePath}:`, err.message);
    }
  }, 400); // 400ms debounce
  pendingWrites.set(filePath, timer);
}

function readJsonFile(filePath, fallback = []) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw || 'null') ?? fallback;
  } catch (e) {
    return fallback;
  }
}

// ----------------- Mongoose Schemas (Multi-Tenant & High-Concurrency Indexed) -----------------
const OrderSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, required: true, index: true },
    restaurantSlug: { type: String, default: 'tablemint', index: true },
    orderNumber: { type: Number, index: true },
    tableId: { type: Number, required: true, index: true },
    tableName: String,
    guestName: String,
    items: [mongoose.Schema.Types.Mixed],
    notes: String,
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    serviceCharge: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'],
      default: 'pending',
      index: true
    },
    paid: { type: Boolean, default: false, index: true },
    paymentMethod: String,
    paymentNotes: String,
    paidAt: String,
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
  },
  { minimize: false }
);

OrderSchema.index({ restaurantSlug: 1, createdAt: -1 });
OrderSchema.index({ restaurantSlug: 1, tableId: 1, status: 1 });

const TableSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, index: true },
    restaurantSlug: { type: String, default: 'tablemint', index: true },
    tableNo: Number,
    name: String,
    capacity: Number,
    section: String,
    status: { type: String, default: 'vacant' },
    manualStatus: { type: String, default: 'vacant' },
    sessionToken: String,
    tokenCreatedAt: String,
    lastOrderAt: String,
    lastClearedAt: String
  },
  { minimize: false }
);

TableSchema.index({ restaurantSlug: 1, id: 1 }, { unique: true });

const MenuItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, index: true },
    restaurantSlug: { type: String, default: 'tablemint', index: true },
    name: { type: String, required: true },
    category: { type: String, required: true, index: true },
    price: { type: Number, required: true },
    isVeg: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
    available: { type: Boolean, default: true },
    description: String,
    image: String,
    spiceLevel: Number,
    isSpecial: Boolean,
    prepTime: String,
    addons: [mongoose.Schema.Types.Mixed]
  },
  { minimize: false }
);

MenuItemSchema.index({ restaurantSlug: 1, id: 1 }, { unique: true });
MenuItemSchema.index({ restaurantSlug: 1, category: 1 });

const SettingSchema = new mongoose.Schema(
  {
    key: { type: String, index: true },
    restaurantSlug: { type: String, default: 'tablemint', unique: true, index: true },
    restaurantName: String,
    tagline: String,
    phone: String,
    email: String,
    address: String,
    currency: String,
    taxRate: Number,
    serviceCharge: Number,
    upiId: String,
    upiPayeeName: String,
    upiQrEnabled: Boolean,
    acceptedPaymentMethods: [String],
    soundAlerts: Boolean,
    autoAcceptOrders: Boolean,
    sessionTimeoutHours: Number,
    updatedAt: String
  },
  { minimize: false }
);

const UserSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, required: true, index: true },
    name: String,
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    hash: String,
    salt: String,
    role: { type: String, default: 'staff' },
    restaurantName: String,
    restaurantSlug: { type: String, default: 'tablemint', index: true },
    createdAt: String,
    updatedAt: String
  },
  { minimize: false }
);

const OrderModel = mongoose.models.Order || mongoose.model('Order', OrderSchema);
const TableModel = mongoose.models.Table || mongoose.model('Table', TableSchema);
const MenuItemModel = mongoose.models.MenuItem || mongoose.model('MenuItem', MenuItemSchema);
const SettingModel = mongoose.models.Setting || mongoose.model('Setting', SettingSchema);
const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);

let isConnectedToMongo = false;

// Populate cache into memory on startup
async function loadCacheFromMongoOrDisk() {
  if (isConnectedToMongo) {
    try {
      console.log('[DB Cache] Loading data into ultra-fast in-memory cache...');
      const [tables, menu, users, settingsList, orders] = await Promise.all([
        TableModel.find().sort({ id: 1 }).lean(),
        MenuItemModel.find().lean(),
        UserModel.find().lean(),
        SettingModel.find().lean(),
        OrderModel.find().lean()
      ]);

      cache.tables = tables && tables.length > 0 ? tables.map(t => ({ ...t, restaurantSlug: t.restaurantSlug || 'tablemint' })) : readJsonFile(TABLES_FILE, defaultTables).map(t => ({ ...t, restaurantSlug: t.restaurantSlug || 'tablemint' }));
      cache.menu = menu && menu.length > 0 ? menu.map(m => ({ ...m, restaurantSlug: m.restaurantSlug || 'tablemint' })) : readJsonFile(MENU_FILE, defaultMenu).map(m => ({ ...m, restaurantSlug: m.restaurantSlug || 'tablemint' }));
      cache.users = users && users.length > 0 ? users.map(u => ({ ...u, restaurantSlug: u.restaurantSlug || slugifyRestaurant(u.restaurantName) })) : readJsonFile(USERS_FILE, defaultUsers).map(u => ({ ...u, restaurantSlug: u.restaurantSlug || slugifyRestaurant(u.restaurantName) }));
      cache.orders = orders && orders.length > 0 ? orders.map(o => ({ ...o, restaurantSlug: o.restaurantSlug || 'tablemint' })) : readJsonFile(ORDERS_FILE, defaultOrders).map(o => ({ ...o, restaurantSlug: o.restaurantSlug || 'tablemint' }));
      
      cache.settings.clear();
      if (settingsList && settingsList.length > 0) {
        settingsList.forEach(s => {
          const { _id, __v, key, ...clean } = s;
          const slug = clean.restaurantSlug || 'tablemint';
          cache.settings.set(slug, { ...defaultSettings, ...clean, restaurantSlug: slug });
        });
      } else {
        const fileSettings = readJsonFile(SETTINGS_FILE, defaultSettings);
        cache.settings.set('tablemint', { ...defaultSettings, ...fileSettings, restaurantSlug: 'tablemint' });
      }

      console.log(`⚡ [DB Cache Ready] Instant RAM Cache: ${cache.menu.length} menu items, ${cache.tables.length} tables, ${cache.orders.length} orders across ${cache.settings.size || 1} restaurants.`);
      return;
    } catch (err) {
      console.error('[DB Cache Init Error]:', err.message);
    }
  }

  // Fallback to local files
  cache.tables = readJsonFile(TABLES_FILE, defaultTables).map(t => ({ ...t, restaurantSlug: t.restaurantSlug || 'tablemint' }));
  cache.menu = readJsonFile(MENU_FILE, defaultMenu).map(m => ({ ...m, restaurantSlug: m.restaurantSlug || 'tablemint' }));
  cache.users = readJsonFile(USERS_FILE, defaultUsers).map(u => ({ ...u, restaurantSlug: u.restaurantSlug || slugifyRestaurant(u.restaurantName) }));
  cache.orders = readJsonFile(ORDERS_FILE, defaultOrders).map(o => ({ ...o, restaurantSlug: o.restaurantSlug || 'tablemint' }));
  const fileSettings = readJsonFile(SETTINGS_FILE, defaultSettings);
  cache.settings.clear();
  cache.settings.set('tablemint', { ...defaultSettings, ...fileSettings, restaurantSlug: 'tablemint' });
  console.log(`⚡ [DB Cache Ready] File mode cache loaded into RAM.`);
}

async function seedMongoIfEmpty() {
  try {
    const tableCount = await TableModel.countDocuments();
    if (tableCount === 0) {
      const initialTables = readJsonFile(TABLES_FILE, defaultTables).map(t => ({
        ...t,
        restaurantSlug: t.restaurantSlug || 'tablemint'
      }));
      if (initialTables.length > 0) {
        await TableModel.insertMany(initialTables);
        console.log(`[DB Seed] Migrated ${initialTables.length} tables to MongoDB Atlas.`);
      }
    }

    const menuCount = await MenuItemModel.countDocuments();
    if (menuCount === 0) {
      const initialMenu = readJsonFile(MENU_FILE, defaultMenu).map(m => ({
        ...m,
        restaurantSlug: m.restaurantSlug || 'tablemint'
      }));
      if (initialMenu.length > 0) {
        await MenuItemModel.insertMany(initialMenu);
        console.log(`[DB Seed] Migrated ${initialMenu.length} menu items to MongoDB Atlas.`);
      }
    }

    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      const initialUsers = readJsonFile(USERS_FILE, defaultUsers).map(u => ({
        ...u,
        restaurantSlug: u.restaurantSlug || slugifyRestaurant(u.restaurantName)
      }));
      if (initialUsers.length > 0) {
        await UserModel.insertMany(initialUsers);
        console.log(`[DB Seed] Migrated ${initialUsers.length} staff accounts to MongoDB Atlas.`);
      }
    }

    const settingCount = await SettingModel.countDocuments();
    if (settingCount === 0) {
      const initialSettings = readJsonFile(SETTINGS_FILE, defaultSettings);
      await SettingModel.create({ key: 'global', restaurantSlug: 'tablemint', ...initialSettings });
      console.log('[DB Seed] Migrated restaurant settings to MongoDB Atlas.');
    }

    const orderCount = await OrderModel.countDocuments();
    if (orderCount === 0 && defaultOrders.length > 0) {
      const ordersWithSlug = defaultOrders.map(o => ({
        ...o,
        restaurantSlug: o.restaurantSlug || 'tablemint'
      }));
      await OrderModel.insertMany(ordersWithSlug);
      console.log(`[DB Seed] Migrated ${ordersWithSlug.length} orders to MongoDB Atlas.`);
    }
  } catch (err) {
    console.error('[DB Seed Error] Auto-seed failed:', err.message);
  }
}

async function initDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('----------------------------------------------------');
    console.log(' [DB] Running in High-Speed Local File Storage Mode.');
    console.log(' [DB] For cloud persistence on Render, set MONGODB_URI');
    console.log('----------------------------------------------------');
    isConnectedToMongo = false;
    await loadCacheFromMongoOrDisk();
    return false;
  }

  try {
    console.log('[DB] Connecting to MongoDB Atlas with high-concurrency pool...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      maxPoolSize: 50, // Concurrency: 50 persistent connections for burst traffic
      minPoolSize: 5,
      family: 4
    });
    isConnectedToMongo = true;
    console.log('✅ [DB] Connected to MongoDB Atlas successfully.');
    await seedMongoIfEmpty();
    await loadCacheFromMongoOrDisk();
    return true;
  } catch (err) {
    console.error('⚠️  [DB] MongoDB Atlas connection failed:', err.message);
    console.log(' [DB] Falling back to safe atomic local storage.');
    isConnectedToMongo = false;
    await loadCacheFromMongoOrDisk();
    return false;
  }
}

// ----------------- Ultra-Fast In-Memory Data APIs with Multi-Restaurant Support -----------------

// ORDERS
function getOrders(restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug);
  return cache.orders.filter(o => (o.restaurantSlug || 'tablemint') === slug);
}

function saveOrder(order) {
  const slug = slugifyRestaurant(order.restaurantSlug);
  const updatedOrder = {
    ...order,
    restaurantSlug: slug,
    updatedAt: new Date().toISOString()
  };

  const idx = cache.orders.findIndex(o => o.id === order.id);
  if (idx >= 0) {
    cache.orders[idx] = updatedOrder;
  } else {
    cache.orders.push(updatedOrder);
  }

  // Non-blocking background sync to MongoDB
  if (isConnectedToMongo) {
    OrderModel.findOneAndUpdate(
      { id: order.id },
      updatedOrder,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).catch(e => console.error('[DB BG Order Error]:', e.message));
  }

  scheduleFileWrite(ORDERS_FILE, cache.orders);
  return updatedOrder;
}

function updateOrder(id, updates, restaurantSlug = null) {
  const idx = cache.orders.findIndex(o => o.id === id);
  if (idx >= 0) {
    const slug = restaurantSlug ? slugifyRestaurant(restaurantSlug) : (cache.orders[idx].restaurantSlug || 'tablemint');
    cache.orders[idx] = {
      ...cache.orders[idx],
      ...updates,
      restaurantSlug: slug,
      updatedAt: new Date().toISOString()
    };
    const updated = cache.orders[idx];

    if (isConnectedToMongo) {
      OrderModel.updateOne(
        { id },
        { $set: { ...updates, updatedAt: updated.updatedAt, restaurantSlug: slug } }
      ).catch(e => console.error('[DB BG Update Order Error]:', e.message));
    }

    scheduleFileWrite(ORDERS_FILE, cache.orders);
    return updated;
  }
  return null;
}

function setAllOrders(orders, restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug);
  // Keep orders of other restaurants intact
  cache.orders = [
    ...cache.orders.filter(o => (o.restaurantSlug || 'tablemint') !== slug),
    ...orders.map(o => ({ ...o, restaurantSlug: slug }))
  ];
  scheduleFileWrite(ORDERS_FILE, cache.orders);
  return getOrders(slug);
}

// TABLES
function getTables(restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug);
  const tables = cache.tables.filter(t => (t.restaurantSlug || 'tablemint') === slug);
  if (tables.length > 0) return tables;

  // Auto-initialize standard 10 tables for a new restaurant
  const brandTables = defaultTables.map(t => ({
    ...t,
    restaurantSlug: slug,
    sessionToken: generateTableToken(t.id),
    tokenCreatedAt: new Date().toISOString()
  }));

  brandTables.forEach(t => cache.tables.push(t));
  if (isConnectedToMongo) {
    const bulkOps = brandTables.map(t => ({
      updateOne: {
        filter: { id: t.id, restaurantSlug: slug },
        update: { $set: t },
        upsert: true
      }
    }));
    TableModel.bulkWrite(bulkOps).catch(e => console.error('[DB Auto-Seed Tables Error]:', e.message));
  }
  scheduleFileWrite(TABLES_FILE, cache.tables);
  return brandTables;
}

function saveTables(tables, restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug);
  // Remove existing tables for this slug from cache, replace with new
  cache.tables = [
    ...cache.tables.filter(t => (t.restaurantSlug || 'tablemint') !== slug),
    ...tables.map(t => ({ ...t, restaurantSlug: slug }))
  ];

  if (isConnectedToMongo && Array.isArray(tables)) {
    const bulkOps = tables.map(t => ({
      updateOne: {
        filter: { id: t.id, restaurantSlug: slug },
        update: { $set: { ...t, restaurantSlug: slug } },
        upsert: true
      }
    }));
    TableModel.bulkWrite(bulkOps).catch(e => console.error('[DB BG Tables Bulk Error]:', e.message));
  }

  scheduleFileWrite(TABLES_FILE, cache.tables);
  return getTables(slug);
}

function updateTable(id, updates, restaurantSlug = 'tablemint') {
  const tableId = parseInt(id, 10);
  const slug = slugifyRestaurant(restaurantSlug);
  const idx = cache.tables.findIndex(t => t.id === tableId && (t.restaurantSlug || 'tablemint') === slug);

  if (idx >= 0) {
    cache.tables[idx] = { ...cache.tables[idx], ...updates, restaurantSlug: slug };
    const updated = cache.tables[idx];

    if (isConnectedToMongo) {
      TableModel.updateOne(
        { id: tableId, restaurantSlug: slug },
        { $set: updates }
      ).catch(e => console.error('[DB BG Update Table Error]:', e.message));
    }

    scheduleFileWrite(TABLES_FILE, cache.tables);
    return updated;
  }
  return null;
}

// MENU
function getMenu(restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug);
  const menu = cache.menu.filter(m => (m.restaurantSlug || 'tablemint') === slug);
  if (menu.length > 0) return menu;

  // Auto-initialize standard menu for a new restaurant
  const brandMenu = defaultMenu.map(m => ({
    ...m,
    restaurantSlug: slug
  }));

  brandMenu.forEach(m => cache.menu.push(m));
  if (isConnectedToMongo) {
    MenuItemModel.insertMany(brandMenu).catch(e => console.error('[DB Auto-Seed Menu Error]:', e.message));
  }
  scheduleFileWrite(MENU_FILE, cache.menu);
  return brandMenu;
}

function saveMenu(menu, restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug);
  cache.menu = [
    ...cache.menu.filter(m => (m.restaurantSlug || 'tablemint') !== slug),
    ...menu.map(m => ({ ...m, restaurantSlug: slug }))
  ];

  if (isConnectedToMongo && Array.isArray(menu)) {
    MenuItemModel.deleteMany({ restaurantSlug: slug }).then(() => {
      if (menu.length > 0) {
        const toInsert = menu.map(m => ({ ...m, restaurantSlug: slug }));
        MenuItemModel.insertMany(toInsert);
      }
    }).catch(e => console.error('[DB BG Menu Save Error]:', e.message));
  }

  scheduleFileWrite(MENU_FILE, cache.menu);
  return getMenu(slug);
}

function updateMenuItem(id, updates, restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug);
  const idx = cache.menu.findIndex(m => m.id === id && (m.restaurantSlug || 'tablemint') === slug);

  if (idx >= 0) {
    cache.menu[idx] = { ...cache.menu[idx], ...updates, restaurantSlug: slug };
    const updated = cache.menu[idx];

    if (isConnectedToMongo) {
      MenuItemModel.updateOne(
        { id, restaurantSlug: slug },
        { $set: updates }
      ).catch(e => console.error('[DB BG Menu Update Error]:', e.message));
    }

    scheduleFileWrite(MENU_FILE, cache.menu);
    return updated;
  }
  return null;
}

function deleteMenuItem(id, restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug);
  cache.menu = cache.menu.filter(m => !(m.id === id && (m.restaurantSlug || 'tablemint') === slug));

  if (isConnectedToMongo) {
    MenuItemModel.deleteOne({ id, restaurantSlug: slug }).catch(e => console.error('[DB BG Menu Delete Error]:', e.message));
  }

  scheduleFileWrite(MENU_FILE, cache.menu);
  return true;
}

// SETTINGS
function getSettings(restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug);
  if (cache.settings.has(slug)) {
    return cache.settings.get(slug);
  }
  // Fallback to tablemint settings or default
  const base = cache.settings.get('tablemint') || defaultSettings;
  const newSet = { ...base, restaurantSlug: slug };
  cache.settings.set(slug, newSet);
  return newSet;
}

function saveSettings(newSettings, restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug || newSettings.restaurantSlug);
  const existing = getSettings(slug);
  const updated = {
    ...existing,
    ...newSettings,
    restaurantSlug: slug,
    updatedAt: new Date().toISOString()
  };

  cache.settings.set(slug, updated);

  if (isConnectedToMongo) {
    SettingModel.findOneAndUpdate(
      { restaurantSlug: slug },
      { $set: updated },
      { upsert: true }
    ).catch(e => console.error('[DB BG Settings Error]:', e.message));
  }

  scheduleFileWrite(SETTINGS_FILE, Array.from(cache.settings.values()));
  return updated;
}

// USERS
function getUsers() {
  return cache.users;
}

function saveUsers(users) {
  cache.users = users;
  if (isConnectedToMongo && Array.isArray(users)) {
    const bulkOps = users.map(u => ({
      updateOne: {
        filter: { id: u.id },
        update: { $set: u },
        upsert: true
      }
    }));
    UserModel.bulkWrite(bulkOps).catch(e => console.error('[DB BG Users Bulk Error]:', e.message));
  }
  scheduleFileWrite(USERS_FILE, cache.users);
  return cache.users;
}

function getUserByEmail(email) {
  const cleanEmail = (email || '').trim().toLowerCase();
  return cache.users.find(u => (u.email || '').toLowerCase() === cleanEmail) || null;
}

function createUser(userData) {
  const user = {
    ...userData,
    restaurantSlug: slugifyRestaurant(userData.restaurantSlug || userData.restaurantName)
  };
  cache.users.push(user);
  if (isConnectedToMongo) {
    UserModel.create(user).catch(e => console.error('[DB BG Create User Error]:', e.message));
  }
  scheduleFileWrite(USERS_FILE, cache.users);
  return user;
}

module.exports = {
  initDatabase,
  slugifyRestaurant,
  generateTableToken,
  getOrders,
  saveOrder,
  updateOrder,
  setAllOrders,
  getTables,
  saveTables,
  updateTable,
  getMenu,
  saveMenu,
  updateMenuItem,
  deleteMenuItem,
  getSettings,
  saveSettings,
  getUsers,
  saveUsers,
  getUserByEmail,
  createUser,
  getIsConnectedToMongo: () => isConnectedToMongo
};
