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

// ----------------- High-Speed In-Memory Cache (RAM speed: 0.1ms) -----------------
const cache = {
  orders: [],
  tables: [],
  menu: [],
  settings: { ...defaultSettings },
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

// ----------------- Mongoose Schemas -----------------
const OrderSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, required: true, index: true },
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

const TableSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, required: true, index: true },
    tableNo: Number,
    name: String,
    capacity: Number,
    status: { type: String, default: 'vacant' },
    sessionToken: String,
    tokenCreatedAt: String,
    lastOrderAt: String
  },
  { minimize: false }
);

const MenuItemSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, required: true, index: true },
    name: { type: String, required: true },
    category: { type: String, required: true, index: true },
    price: { type: Number, required: true },
    isVeg: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
    description: String,
    image: String,
    spiceLevel: Number,
    addons: [mongoose.Schema.Types.Mixed]
  },
  { minimize: false }
);

const SettingSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true },
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
      const [tables, menu, users, settingsDoc, orders] = await Promise.all([
        TableModel.find().sort({ id: 1 }).lean(),
        MenuItemModel.find().lean(),
        UserModel.find().lean(),
        SettingModel.findOne({ key: 'global' }).lean(),
        OrderModel.find().lean()
      ]);

      cache.tables = tables && tables.length > 0 ? tables : readJsonFile(TABLES_FILE, defaultTables);
      cache.menu = menu && menu.length > 0 ? menu : readJsonFile(MENU_FILE, defaultMenu);
      cache.users = users && users.length > 0 ? users : readJsonFile(USERS_FILE, defaultUsers);
      cache.orders = orders && orders.length > 0 ? orders : readJsonFile(ORDERS_FILE, defaultOrders);
      if (settingsDoc) {
        const { _id, __v, key, ...clean } = settingsDoc;
        cache.settings = { ...defaultSettings, ...clean };
      } else {
        cache.settings = { ...defaultSettings, ...readJsonFile(SETTINGS_FILE, defaultSettings) };
      }

      console.log(`⚡ [DB Cache Ready] Instant RAM Cache: ${cache.menu.length} menu items, ${cache.tables.length} tables, ${cache.orders.length} orders.`);
      return;
    } catch (err) {
      console.error('[DB Cache Init Error]:', err.message);
    }
  }

  // Fallback to local files
  cache.tables = readJsonFile(TABLES_FILE, defaultTables);
  cache.menu = readJsonFile(MENU_FILE, defaultMenu);
  cache.users = readJsonFile(USERS_FILE, defaultUsers);
  cache.settings = { ...defaultSettings, ...readJsonFile(SETTINGS_FILE, defaultSettings) };
  cache.orders = readJsonFile(ORDERS_FILE, defaultOrders);
  console.log(`⚡ [DB Cache Ready] File mode cache loaded into RAM.`);
}

async function seedMongoIfEmpty() {
  try {
    const tableCount = await TableModel.countDocuments();
    if (tableCount === 0) {
      const initialTables = readJsonFile(TABLES_FILE, defaultTables);
      if (initialTables.length > 0) {
        await TableModel.insertMany(initialTables);
        console.log(`[DB Seed] Migrated ${initialTables.length} tables to MongoDB Atlas.`);
      }
    }

    const menuCount = await MenuItemModel.countDocuments();
    if (menuCount === 0) {
      const initialMenu = readJsonFile(MENU_FILE, defaultMenu);
      if (initialMenu.length > 0) {
        await MenuItemModel.insertMany(initialMenu);
        console.log(`[DB Seed] Migrated ${initialMenu.length} menu items to MongoDB Atlas.`);
      }
    }

    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      const initialUsers = readJsonFile(USERS_FILE, defaultUsers);
      if (initialUsers.length > 0) {
        await UserModel.insertMany(initialUsers);
        console.log(`[DB Seed] Migrated ${initialUsers.length} staff accounts to MongoDB Atlas.`);
      }
    }

    const settingCount = await SettingModel.countDocuments();
    if (settingCount === 0) {
      const initialSettings = readJsonFile(SETTINGS_FILE, defaultSettings);
      await SettingModel.create({ key: 'global', ...initialSettings });
      console.log('[DB Seed] Migrated restaurant settings to MongoDB Atlas.');
    }

    const orderCount = await OrderModel.countDocuments();
    if (orderCount === 0 && defaultOrders.length > 0) {
      await OrderModel.insertMany(defaultOrders);
      console.log(`[DB Seed] Migrated ${defaultOrders.length} orders to MongoDB Atlas.`);
    }
  } catch (err) {
    console.error('[DB Seed Error] Auto-seed failed:', err.message);
  }
}

async function initDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('----------------------------------------------------');
    console.log(' [DB] Running in Local File-Storage Mode.');
    console.log(' [DB] For cloud persistence on Render, set MONGODB_URI');
    console.log('----------------------------------------------------');
    isConnectedToMongo = false;
    await loadCacheFromMongoOrDisk();
    return false;
  }

  try {
    console.log('[DB] Connecting to MongoDB Atlas...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10
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

// ----------------- Ultra-Fast In-Memory Data APIs (Sub-Millisecond Speed) -----------------

// ORDERS (Instant RAM access + Background DB write)
function getOrders() {
  return cache.orders;
}

function saveOrder(order) {
  const idx = cache.orders.findIndex(o => o.id === order.id);
  const updatedOrder = { ...order, updatedAt: new Date().toISOString() };
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

function updateOrder(id, updates) {
  const idx = cache.orders.findIndex(o => o.id === id);
  if (idx >= 0) {
    cache.orders[idx] = { ...cache.orders[idx], ...updates, updatedAt: new Date().toISOString() };
    const updated = cache.orders[idx];

    // Non-blocking background sync to MongoDB
    if (isConnectedToMongo) {
      OrderModel.updateOne(
        { id },
        { $set: { ...updates, updatedAt: updated.updatedAt } }
      ).catch(e => console.error('[DB BG Update Order Error]:', e.message));
    }

    scheduleFileWrite(ORDERS_FILE, cache.orders);
    return updated;
  }
  return null;
}

function setAllOrders(orders) {
  cache.orders = orders;
  scheduleFileWrite(ORDERS_FILE, cache.orders);
  return cache.orders;
}

// TABLES (Instant RAM access + Background DB write)
function getTables() {
  return cache.tables;
}

function saveTables(tables) {
  cache.tables = tables;
  if (isConnectedToMongo && Array.isArray(tables)) {
    // Bulk write in background - 1 network call instead of 10 sequential queries
    const bulkOps = tables.map(t => ({
      updateOne: {
        filter: { id: t.id },
        update: { $set: t },
        upsert: true
      }
    }));
    TableModel.bulkWrite(bulkOps).catch(e => console.error('[DB BG Tables Bulk Error]:', e.message));
  }
  scheduleFileWrite(TABLES_FILE, cache.tables);
  return cache.tables;
}

function updateTable(id, updates) {
  const tableId = parseInt(id, 10);
  const idx = cache.tables.findIndex(t => t.id === tableId);
  if (idx >= 0) {
    cache.tables[idx] = { ...cache.tables[idx], ...updates };
    const updated = cache.tables[idx];

    // Non-blocking background sync to MongoDB
    if (isConnectedToMongo) {
      TableModel.updateOne(
        { id: tableId },
        { $set: updates }
      ).catch(e => console.error('[DB BG Update Table Error]:', e.message));
    }

    scheduleFileWrite(TABLES_FILE, cache.tables);
    return updated;
  }
  return null;
}

// MENU (Instant RAM access + Background DB write)
function getMenu() {
  return cache.menu;
}

function saveMenu(menu) {
  cache.menu = menu;
  if (isConnectedToMongo && Array.isArray(menu)) {
    MenuItemModel.deleteMany({}).then(() => {
      if (menu.length > 0) MenuItemModel.insertMany(menu);
    }).catch(e => console.error('[DB BG Menu Save Error]:', e.message));
  }
  scheduleFileWrite(MENU_FILE, cache.menu);
  return cache.menu;
}

function updateMenuItem(id, updates) {
  const idx = cache.menu.findIndex(m => m.id === id);
  if (idx >= 0) {
    cache.menu[idx] = { ...cache.menu[idx], ...updates };
    const updated = cache.menu[idx];

    if (isConnectedToMongo) {
      MenuItemModel.updateOne(
        { id },
        { $set: updates }
      ).catch(e => console.error('[DB BG Menu Update Error]:', e.message));
    }

    scheduleFileWrite(MENU_FILE, cache.menu);
    return updated;
  }
  return null;
}

function deleteMenuItem(id) {
  cache.menu = cache.menu.filter(m => m.id !== id);
  if (isConnectedToMongo) {
    MenuItemModel.deleteOne({ id }).catch(e => console.error('[DB BG Menu Delete Error]:', e.message));
  }
  scheduleFileWrite(MENU_FILE, cache.menu);
  return true;
}

// SETTINGS (Instant RAM access + Background DB write)
function getSettings() {
  return cache.settings;
}

function saveSettings(newSettings) {
  cache.settings = { ...defaultSettings, ...cache.settings, ...newSettings, updatedAt: new Date().toISOString() };
  if (isConnectedToMongo) {
    SettingModel.findOneAndUpdate(
      { key: 'global' },
      { $set: cache.settings },
      { upsert: true }
    ).catch(e => console.error('[DB BG Settings Error]:', e.message));
  }
  scheduleFileWrite(SETTINGS_FILE, cache.settings);
  return cache.settings;
}

// USERS (Instant RAM access + Background DB write)
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
  cache.users.push(userData);
  if (isConnectedToMongo) {
    UserModel.create(userData).catch(e => console.error('[DB BG Create User Error]:', e.message));
  }
  scheduleFileWrite(USERS_FILE, cache.users);
  return userData;
}

module.exports = {
  initDatabase,
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
