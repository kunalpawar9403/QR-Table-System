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

// Safe atomic file writer
function atomicWriteFileSync(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`[DB File Error] Failed atomic write to ${filePath}:`, err.message);
  }
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
    return false;
  }

  try {
    console.log('[DB] Connecting to MongoDB Atlas...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 7000
    });
    isConnectedToMongo = true;
    console.log('✅ [DB] Connected to MongoDB Atlas successfully.');
    await seedMongoIfEmpty();
    return true;
  } catch (err) {
    console.error('⚠️  [DB] MongoDB Atlas connection failed:', err.message);
    console.log(' [DB] Falling back to safe atomic local storage.');
    isConnectedToMongo = false;
    return false;
  }
}

// ----------------- Unified Data Access APIs -----------------

// ORDERS
async function getOrders() {
  if (isConnectedToMongo) {
    try {
      const docs = await OrderModel.find().lean();
      return docs || [];
    } catch (e) {
      console.error('[DB] getOrders error:', e.message);
    }
  }
  return readJsonFile(ORDERS_FILE, defaultOrders);
}

async function saveOrder(order) {
  if (isConnectedToMongo) {
    try {
      const updated = await OrderModel.findOneAndUpdate(
        { id: order.id },
        { ...order, updatedAt: new Date().toISOString() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
      return updated;
    } catch (e) {
      console.error('[DB] saveOrder error:', e.message);
    }
  }
  // File fallback
  const orders = readJsonFile(ORDERS_FILE, defaultOrders);
  const idx = orders.findIndex(o => o.id === order.id);
  if (idx >= 0) {
    orders[idx] = { ...orders[idx], ...order, updatedAt: new Date().toISOString() };
  } else {
    orders.push(order);
  }
  atomicWriteFileSync(ORDERS_FILE, orders);
  return order;
}

async function updateOrder(id, updates) {
  if (isConnectedToMongo) {
    try {
      const doc = await OrderModel.findOneAndUpdate(
        { id },
        { ...updates, updatedAt: new Date().toISOString() },
        { new: true }
      ).lean();
      return doc;
    } catch (e) {
      console.error('[DB] updateOrder error:', e.message);
    }
  }
  // File fallback
  const orders = readJsonFile(ORDERS_FILE, defaultOrders);
  const idx = orders.findIndex(o => o.id === id);
  if (idx >= 0) {
    orders[idx] = { ...orders[idx], ...updates, updatedAt: new Date().toISOString() };
    atomicWriteFileSync(ORDERS_FILE, orders);
    return orders[idx];
  }
  return null;
}

// TABLES
async function getTables() {
  if (isConnectedToMongo) {
    try {
      const docs = await TableModel.find().sort({ id: 1 }).lean();
      if (docs && docs.length > 0) return docs;
    } catch (e) {
      console.error('[DB] getTables error:', e.message);
    }
  }
  return readJsonFile(TABLES_FILE, defaultTables);
}

async function saveTables(tables) {
  if (isConnectedToMongo) {
    try {
      for (const t of tables) {
        await TableModel.findOneAndUpdate(
          { id: t.id },
          t,
          { upsert: true, new: true }
        );
      }
    } catch (e) {
      console.error('[DB] saveTables error:', e.message);
    }
  }
  atomicWriteFileSync(TABLES_FILE, tables);
  return tables;
}

async function updateTable(id, updates) {
  const tableId = parseInt(id, 10);
  if (isConnectedToMongo) {
    try {
      const doc = await TableModel.findOneAndUpdate(
        { id: tableId },
        updates,
        { new: true }
      ).lean();
      if (doc) return doc;
    } catch (e) {
      console.error('[DB] updateTable error:', e.message);
    }
  }
  // File fallback
  const tables = readJsonFile(TABLES_FILE, defaultTables);
  const idx = tables.findIndex(t => t.id === tableId);
  if (idx >= 0) {
    tables[idx] = { ...tables[idx], ...updates };
    atomicWriteFileSync(TABLES_FILE, tables);
    return tables[idx];
  }
  return null;
}

// MENU
async function getMenu() {
  if (isConnectedToMongo) {
    try {
      const docs = await MenuItemModel.find().lean();
      if (docs && docs.length > 0) return docs;
    } catch (e) {
      console.error('[DB] getMenu error:', e.message);
    }
  }
  return readJsonFile(MENU_FILE, defaultMenu);
}

async function saveMenu(menu) {
  if (isConnectedToMongo) {
    try {
      await MenuItemModel.deleteMany({});
      if (menu && menu.length > 0) {
        await MenuItemModel.insertMany(menu);
      }
    } catch (e) {
      console.error('[DB] saveMenu error:', e.message);
    }
  }
  atomicWriteFileSync(MENU_FILE, menu);
  return menu;
}

async function updateMenuItem(id, updates) {
  if (isConnectedToMongo) {
    try {
      const doc = await MenuItemModel.findOneAndUpdate(
        { id },
        updates,
        { new: true }
      ).lean();
      if (doc) return doc;
    } catch (e) {
      console.error('[DB] updateMenuItem error:', e.message);
    }
  }
  const menu = readJsonFile(MENU_FILE, defaultMenu);
  const idx = menu.findIndex(m => m.id === id);
  if (idx >= 0) {
    menu[idx] = { ...menu[idx], ...updates };
    atomicWriteFileSync(MENU_FILE, menu);
    return menu[idx];
  }
  return null;
}

async function deleteMenuItem(id) {
  if (isConnectedToMongo) {
    try {
      await MenuItemModel.deleteOne({ id });
    } catch (e) {
      console.error('[DB] deleteMenuItem error:', e.message);
    }
  }
  const menu = readJsonFile(MENU_FILE, defaultMenu).filter(m => m.id !== id);
  atomicWriteFileSync(MENU_FILE, menu);
  return true;
}

// SETTINGS
async function getSettings() {
  if (isConnectedToMongo) {
    try {
      const doc = await SettingModel.findOne({ key: 'global' }).lean();
      if (doc) {
        const { _id, __v, key, ...cleanSettings } = doc;
        return { ...defaultSettings, ...cleanSettings };
      }
    } catch (e) {
      console.error('[DB] getSettings error:', e.message);
    }
  }
  const current = readJsonFile(SETTINGS_FILE, defaultSettings);
  return { ...defaultSettings, ...current };
}

async function saveSettings(newSettings) {
  const merged = { ...defaultSettings, ...(await getSettings()), ...newSettings, updatedAt: new Date().toISOString() };
  if (isConnectedToMongo) {
    try {
      await SettingModel.findOneAndUpdate(
        { key: 'global' },
        merged,
        { upsert: true, new: true }
      );
    } catch (e) {
      console.error('[DB] saveSettings error:', e.message);
    }
  }
  atomicWriteFileSync(SETTINGS_FILE, merged);
  return merged;
}

// USERS
async function getUsers() {
  if (isConnectedToMongo) {
    try {
      const docs = await UserModel.find().lean();
      if (docs && docs.length > 0) return docs;
    } catch (e) {
      console.error('[DB] getUsers error:', e.message);
    }
  }
  const users = readJsonFile(USERS_FILE, defaultUsers);
  if (!users || !Array.isArray(users) || users.length === 0) {
    atomicWriteFileSync(USERS_FILE, defaultUsers);
    return defaultUsers;
  }
  return users;
}

async function saveUsers(users) {
  if (isConnectedToMongo) {
    try {
      for (const u of users) {
        await UserModel.findOneAndUpdate(
          { id: u.id },
          u,
          { upsert: true, new: true }
        );
      }
    } catch (e) {
      console.error('[DB] saveUsers error:', e.message);
    }
  }
  atomicWriteFileSync(USERS_FILE, users);
  return users;
}

async function getUserByEmail(email) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (isConnectedToMongo) {
    try {
      const user = await UserModel.findOne({ email: cleanEmail }).lean();
      if (user) return user;
    } catch (e) {
      console.error('[DB] getUserByEmail error:', e.message);
    }
  }
  const users = await getUsers();
  return users.find(u => (u.email || '').toLowerCase() === cleanEmail) || null;
}

async function createUser(userData) {
  if (isConnectedToMongo) {
    try {
      const created = await UserModel.create(userData);
      return created.toObject();
    } catch (e) {
      console.error('[DB] createUser error:', e.message);
    }
  }
  const users = await getUsers();
  users.push(userData);
  await saveUsers(users);
  return userData;
}

module.exports = {
  initDatabase,
  getOrders,
  saveOrder,
  updateOrder,
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
