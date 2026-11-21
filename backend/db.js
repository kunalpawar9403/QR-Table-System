const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const siftLib = require('sift');
const sift = siftLib.default || siftLib;

// Prevent mongoose from buffering operations indefinitely when disconnected
mongoose.set('bufferCommands', false);

const CANONICAL_MENU_FILE = path.join(__dirname, 'data', 'canonical_menu.json');

function getCanonicalMenu() {
  try {
    if (fs.existsSync(CANONICAL_MENU_FILE)) {
      return JSON.parse(fs.readFileSync(CANONICAL_MENU_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[DB] Error loading canonical menu:', e.message);
  }
  return [];
}

// Default restaurant settings template
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
  sessionTimeoutHours: 3,
  subscriptionPlan: 'starter',
  planLimits: {
    maxTables: 50,
    maxMenuItems: 500,
    maxStaff: 20,
    advancedReports: true
  }
};

// Suggested Category Presets (Per requirement Section 4.B)
const SUGGESTED_CATEGORIES = [
  'Starters',
  'Soups',
  'Salads',
  'Main Course',
  'Indian Main Course',
  'Chinese',
  'South Indian',
  'North Indian',
  'Biryani and Rice',
  'Breads',
  'Beverages',
  'Desserts',
  'Snacks',
  'Combos',
  'Special Offers'
];

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

function generateRestaurantId() {
  return 'rest_' + crypto.randomBytes(6).toString('hex');
}

// ----------------- Mongoose Schemas (Multi-Tenant Compound-Indexed) -----------------

// CATEGORIES SCHEMA (Requirement Section 4.B)
const CategorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, index: true },
    restaurantId: { type: String, index: true },
    restaurantSlug: { type: String, required: true, default: 'tablemint', index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
  },
  { minimize: false }
);

CategorySchema.index({ restaurantSlug: 1, id: 1 }, { unique: true });
CategorySchema.index({ restaurantSlug: 1, displayOrder: 1 });
CategorySchema.index({ restaurantSlug: 1, name: 1 });

// ORDER SCHEMA
const OrderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, index: true },
    restaurantId: { type: String, index: true },
    restaurantSlug: { type: String, required: true, default: 'tablemint', index: true },
    orderNumber: { type: Number, index: true },
    tableId: { type: Number, required: true, index: true },
    tableName: { type: String, default: '' },
    guestName: { type: String, default: '' },
    items: { type: [mongoose.Schema.Types.Mixed], default: [] },
    notes: { type: String, default: '' },
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    serviceCharge: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['new', 'pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'],
      default: 'pending',
      index: true
    },
    paid: { type: Boolean, default: false, index: true },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending_verification', 'paid', 'refunded'],
      default: 'unpaid',
      index: true
    },
    paymentMethod: { type: String, default: 'Pay at Counter / UPI' },
    paymentNotes: { type: String, default: '' },
    transactionRef: { type: String, default: '' },
    paidAt: { type: String, default: null },
    completedAt: { type: String, default: null },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
  },
  { minimize: false }
);

OrderSchema.index({ restaurantSlug: 1, id: 1 }, { unique: true });
OrderSchema.index({ restaurantSlug: 1, createdAt: -1 });
OrderSchema.index({ restaurantSlug: 1, status: 1 });
OrderSchema.index({ restaurantSlug: 1, tableId: 1, status: 1 });
OrderSchema.index({ restaurantSlug: 1, paid: 1 });

// TABLE SCHEMA
const TableSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, index: true },
    restaurantId: { type: String, index: true },
    restaurantSlug: { type: String, required: true, default: 'tablemint', index: true },
    tableNo: { type: Number },
    name: { type: String, required: true },
    capacity: { type: Number, default: 4 },
    section: { type: String, default: 'Indoor Dining' },
    status: {
      type: String,
      enum: ['available', 'occupied', 'reserved', 'cleaning'],
      default: 'available',
      index: true
    },
    manualStatus: { type: String, default: 'vacant' },
    sessionToken: { type: String, index: true },
    tokenCreatedAt: { type: String, default: () => new Date().toISOString() },
    occupiedAt: { type: String, default: null },
    lastOrderAt: { type: String, default: null },
    lastClearedAt: { type: String, default: null }
  },
  { minimize: false }
);

TableSchema.index({ restaurantSlug: 1, id: 1 }, { unique: true });

// MENU ITEM SCHEMA (Requirement Section 4.C & 4.F)
const MenuItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, index: true },
    restaurantId: { type: String, index: true },
    restaurantSlug: { type: String, required: true, default: 'tablemint', index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, index: true, trim: true },
    price: { type: Number, required: true },
    isVeg: { type: Boolean, default: true },
    foodType: {
      type: String,
      enum: ['veg', 'non-veg', 'egg', 'vegan'],
      default: 'veg'
    },
    isAvailable: { type: Boolean, default: true, index: true },
    available: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['draft', 'published', 'unavailable'],
      default: 'published',
      index: true
    },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    spiceLevel: { type: Number, default: 0 },
    isSpecial: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    prepTime: { type: String, default: '10-15 mins' },
    displayOrder: { type: Number, default: 0 },
    taxRate: { type: Number, default: null },
    variants: { type: [mongoose.Schema.Types.Mixed], default: [] }, // [{ id, name, price, isDefault }]
    addons: { type: [mongoose.Schema.Types.Mixed], default: [] },   // [{ id, name, price }]
    customizations: { type: [mongoose.Schema.Types.Mixed], default: [] },
    dietaryLabels: { type: [String], default: [] },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
  },
  { minimize: false }
);

MenuItemSchema.index({ restaurantSlug: 1, id: 1 }, { unique: true });
MenuItemSchema.index({ restaurantSlug: 1, category: 1 });
MenuItemSchema.index({ restaurantSlug: 1, available: 1 });
MenuItemSchema.index({ restaurantSlug: 1, status: 1 });
MenuItemSchema.index({ restaurantSlug: 1, displayOrder: 1 });

// SETTING SCHEMA
const SettingSchema = new mongoose.Schema(
  {
    restaurantId: { type: String, index: true },
    restaurantSlug: { type: String, required: true, unique: true, index: true },
    restaurantName: { type: String, default: 'TableMint' },
    tagline: { type: String, default: 'Smart QR Dining & POS' },
    phone: { type: String, default: '+91 98765 43210' },
    email: { type: String, default: 'contact@tablemint.com' },
    address: { type: String, default: 'MG Road, Pune, Maharashtra 411001' },
    currency: { type: String, default: '₹' },
    taxRate: { type: Number, default: 5 },
    serviceCharge: { type: Number, default: 0 },
    upiId: { type: String, default: 'tablemint@upi' },
    upiPayeeName: { type: String, default: 'TableMint Restaurant' },
    upiQrEnabled: { type: Boolean, default: true },
    acceptedPaymentMethods: { type: [String], default: ['UPI', 'Cash', 'Card'] },
    soundAlerts: { type: Boolean, default: true },
    autoAcceptOrders: { type: Boolean, default: false },
    sessionTimeoutHours: { type: Number, default: 3 },
    subscriptionPlan: { type: String, enum: ['starter', 'pro', 'enterprise'], default: 'starter' },
    planLimits: {
      maxTables: { type: Number, default: 50 },
      maxMenuItems: { type: Number, default: 500 },
      maxStaff: { type: Number, default: 20 },
      advancedReports: { type: Boolean, default: true }
    },
    onboardingStep: { type: Number, default: 1 },
    isPublished: { type: Boolean, default: true },
    updatedAt: { type: String, default: () => new Date().toISOString() }
  },
  { minimize: false }
);

// USER SCHEMA
const UserSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    hash: { type: String, required: true },
    salt: { type: String, required: true },
    role: { type: String, enum: ['admin', 'staff', 'kitchen'], default: 'staff' },
    restaurantId: { type: String, index: true },
    restaurantName: { type: String, default: 'TableMint' },
    restaurantSlug: { type: String, required: true, default: 'tablemint', index: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
  },
  { minimize: false }
);

UserSchema.index({ restaurantSlug: 1, role: 1 });

// AUDIT LOG SCHEMA (Requirement Section 16.H)
const AuditLogSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, index: true },
    restaurantId: { type: String, index: true },
    restaurantSlug: { type: String, required: true, index: true },
    actorId: { type: String, default: 'system' },
    actorName: { type: String, default: 'Staff' },
    actorRole: { type: String, default: 'admin' },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true },
    entityId: { type: String, default: '' },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: String, default: () => new Date().toISOString(), index: true }
  },
  { minimize: false }
);

AuditLogSchema.index({ restaurantSlug: 1, createdAt: -1 });

// Local JSON Storage Engine for Offline / Local File Storage Mode
class LocalStore {
  constructor(name, filePath, defaultData = []) {
    this.name = name;
    this.filePath = filePath;
    this.defaultData = defaultData;
    this.items = [];
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        this.items = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        this.items = JSON.parse(JSON.stringify(this.defaultData));
        this.save();
      }
    } catch (e) {
      console.warn(`[LocalStore ${this.name}] Failed to load, using default:`, e.message);
      this.items = JSON.parse(JSON.stringify(this.defaultData));
    }
  }

  save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tempPath = `${this.filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.items, null, 2), 'utf8');
      fs.renameSync(tempPath, this.filePath);
    } catch (e) {
      console.error(`[LocalStore ${this.name}] Failed to write file:`, e.message);
    }
  }

  _clone(doc) {
    return doc ? JSON.parse(JSON.stringify(doc)) : doc;
  }

  _sortItems(items, sortObj) {
    if (!sortObj || typeof sortObj !== 'object') return items;
    return items.sort((a, b) => {
      for (const [key, dir] of Object.entries(sortObj)) {
        const valA = a[key];
        const valB = b[key];
        if (valA === valB) continue;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        const comp = valA > valB ? 1 : -1;
        return dir === -1 || dir === 'desc' ? -comp : comp;
      }
      return 0;
    });
  }

  find(filter = {}) {
    const matcher = sift(filter || {});
    let result = this.items.filter(matcher);

    const query = {
      _sort: null,
      _skip: 0,
      _limit: null,
      sort: (s) => { query._sort = s; return query; },
      skip: (n) => { query._skip = n; return query; },
      limit: (n) => { query._limit = n; return query; },
      select: () => query,
      lean: () => query.exec(),
      exec: async () => {
        let docs = [...result];
        if (query._sort) docs = this._sortItems(docs, query._sort);
        if (query._skip) docs = docs.slice(query._skip);
        if (query._limit) docs = docs.slice(0, query._limit);
        return this._clone(docs);
      },
      then: (resolve, reject) => query.exec().then(resolve, reject)
    };
    return query;
  }

  findOne(filter = {}) {
    const matcher = sift(filter || {});
    let result = this.items.filter(matcher);

    const query = {
      _sort: null,
      sort: (s) => { query._sort = s; return query; },
      select: () => query,
      lean: () => query.exec(),
      exec: async () => {
        let docs = [...result];
        if (query._sort) docs = this._sortItems(docs, query._sort);
        return docs.length > 0 ? this._clone(docs[0]) : null;
      },
      then: (resolve, reject) => query.exec().then(resolve, reject)
    };
    return query;
  }

  findOneAndUpdate(filter = {}, update = {}, options = {}) {
    const matcher = sift(filter || {});
    const idx = this.items.findIndex(matcher);

    let doc;
    if (idx >= 0) {
      const existing = this.items[idx];
      const updates = update.$set ? { ...update.$set } : { ...update };
      delete updates.$set;
      doc = { ...existing, ...updates, updatedAt: updates.updatedAt || new Date().toISOString() };
      this.items[idx] = doc;
      this.save();
    } else if (options && options.upsert) {
      const updates = update.$set ? { ...update.$set } : { ...update };
      delete updates.$set;
      doc = {
        _id: 'local_' + crypto.randomBytes(8).toString('hex'),
        ...filter,
        ...updates,
        createdAt: updates.createdAt || new Date().toISOString(),
        updatedAt: updates.updatedAt || new Date().toISOString()
      };
      this.items.push(doc);
      this.save();
    } else {
      doc = null;
    }

    const cloned = this._clone(doc);
    return {
      lean: async () => cloned,
      exec: async () => cloned,
      then: (resolve, reject) => Promise.resolve(cloned).then(resolve, reject)
    };
  }

  async updateOne(filter = {}, update = {}) {
    const matcher = sift(filter || {});
    const idx = this.items.findIndex(matcher);
    if (idx >= 0) {
      const existing = this.items[idx];
      const updates = update.$set ? { ...update.$set } : { ...update };
      delete updates.$set;
      this.items[idx] = { ...existing, ...updates, updatedAt: updates.updatedAt || new Date().toISOString() };
      this.save();
      return { acknowledged: true, modifiedCount: 1, matchedCount: 1 };
    }
    return { acknowledged: true, modifiedCount: 0, matchedCount: 0 };
  }

  async updateMany(filter = {}, update = {}) {
    const matcher = sift(filter || {});
    let modifiedCount = 0;
    const updates = update.$set ? { ...update.$set } : { ...update };
    delete updates.$set;
    for (let i = 0; i < this.items.length; i++) {
      if (matcher(this.items[i])) {
        this.items[i] = { ...this.items[i], ...updates, updatedAt: updates.updatedAt || new Date().toISOString() };
        modifiedCount++;
      }
    }
    if (modifiedCount > 0) this.save();
    return { acknowledged: true, modifiedCount, matchedCount: modifiedCount };
  }

  async create(docOrDocs) {
    if (Array.isArray(docOrDocs)) {
      return this.insertMany(docOrDocs);
    }
    const doc = {
      _id: docOrDocs._id || ('local_' + crypto.randomBytes(8).toString('hex')),
      ...docOrDocs,
      createdAt: docOrDocs.createdAt || new Date().toISOString(),
      updatedAt: docOrDocs.updatedAt || new Date().toISOString()
    };
    this.items.push(doc);
    this.save();
    const cloned = this._clone(doc);
    cloned.toObject = () => ({ ...cloned });
    return cloned;
  }

  async insertMany(docs = []) {
    const inserted = docs.map(d => ({
      _id: d._id || ('local_' + crypto.randomBytes(8).toString('hex')),
      ...d,
      createdAt: d.createdAt || new Date().toISOString(),
      updatedAt: d.updatedAt || new Date().toISOString()
    }));
    this.items.push(...inserted);
    this.save();
    return this._clone(inserted);
  }

  async deleteOne(filter = {}) {
    const matcher = sift(filter || {});
    const idx = this.items.findIndex(matcher);
    if (idx >= 0) {
      this.items.splice(idx, 1);
      this.save();
      return { acknowledged: true, deletedCount: 1 };
    }
    return { acknowledged: true, deletedCount: 0 };
  }

  async deleteMany(filter = {}) {
    const matcher = sift(filter || {});
    const initialLen = this.items.length;
    this.items = this.items.filter(item => !matcher(item));
    const deletedCount = initialLen - this.items.length;
    if (deletedCount > 0) this.save();
    return { acknowledged: true, deletedCount };
  }

  async countDocuments(filter = {}) {
    const matcher = sift(filter || {});
    return this.items.filter(matcher).length;
  }

  async bulkWrite(ops = []) {
    let modified = 0;
    for (const op of ops) {
      if (op.updateOne) {
        const { filter, update, upsert } = op.updateOne;
        await this.findOneAndUpdate(filter, update, { upsert });
        modified++;
      } else if (op.deleteOne) {
        await this.deleteOne(op.deleteOne.filter);
        modified++;
      }
    }
    return { ok: 1, nModified: modified };
  }

  async syncIndexes() {
    return true;
  }

  async aggregate(pipeline = []) {
    let result = [...this.items];
    for (const stage of pipeline) {
      if (stage.$match) {
        const matcher = sift(stage.$match);
        result = result.filter(matcher);
      } else if (stage.$group) {
        const totalRev = result.reduce((sum, o) => sum + (o.paid ? (Number(o.total) || 0) : 0), 0);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayISO = todayStart.toISOString();
        const todaySales = result.reduce((sum, o) => {
          if (o.paid && o.createdAt >= todayISO) return sum + (Number(o.total) || 0);
          return sum;
        }, 0);
        return [{ totalRevenue: totalRev, todaySales: todaySales }];
      }
    }
    return result;
  }
}

// Model instantiations (Raw Mongoose)
const rawCategoryModel = mongoose.models.Category || mongoose.model('Category', CategorySchema);
const rawOrderModel = mongoose.models.Order || mongoose.model('Order', OrderSchema);
const rawTableModel = mongoose.models.Table || mongoose.model('Table', TableSchema);
const rawMenuItemModel = mongoose.models.MenuItem || mongoose.model('MenuItem', MenuItemSchema);
const rawSettingModel = mongoose.models.Setting || mongoose.model('Setting', SettingSchema);
const rawUserModel = mongoose.models.User || mongoose.model('User', UserSchema);
const rawAuditLogModel = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);

// Local File Storage Instances
const categoryStore = new LocalStore('Category', path.join(__dirname, 'data', 'categories.json'));
const orderStore = new LocalStore('Order', path.join(__dirname, 'data', 'orders.json'));
const tableStore = new LocalStore('Table', path.join(__dirname, 'data', 'tables.json'));
const menuStore = new LocalStore('MenuItem', path.join(__dirname, 'data', 'menu.json'));
const settingStore = new LocalStore('Setting', path.join(__dirname, 'data', 'settings.json'), [defaultSettings]);
const userStore = new LocalStore('User', path.join(__dirname, 'data', 'users.json'));
const auditLogStore = new LocalStore('AuditLog', path.join(__dirname, 'data', 'audit_logs.json'));

let isConnectedToMongo = false;

function createModelProxy(mongooseModel, localStore) {
  return new Proxy(mongooseModel, {
    get(target, prop) {
      if (!isConnectedToMongo) {
        if (typeof localStore[prop] === 'function') {
          return localStore[prop].bind(localStore);
        }
        return localStore[prop];
      }
      return target[prop];
    }
  });
}

// Proxied Models that seamlessly route to MongoDB Atlas when connected, or LocalStore when offline
const CategoryModel = createModelProxy(rawCategoryModel, categoryStore);
const OrderModel = createModelProxy(rawOrderModel, orderStore);
const TableModel = createModelProxy(rawTableModel, tableStore);
const MenuItemModel = createModelProxy(rawMenuItemModel, menuStore);
const SettingModel = createModelProxy(rawSettingModel, settingStore);
const UserModel = createModelProxy(rawUserModel, userStore);
const AuditLogModel = createModelProxy(rawAuditLogModel, auditLogStore);

// ----------------- Database Initialization -----------------
async function initDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('----------------------------------------------------');
    console.log('  [DB] Running in High-Speed Local File Storage Mode.');
    console.log('  [DB] For cloud persistence on Render, set MONGODB_URI in environment.');
    console.log('----------------------------------------------------');
    isConnectedToMongo = false;
    return false;
  }

  try {
    console.log('[DB] Connecting to MongoDB Atlas with high-concurrency pool...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      maxPoolSize: 50,
      minPoolSize: 5,
      family: 4
    });
    isConnectedToMongo = true;
    console.log('✅ [DB] Connected to MongoDB Atlas successfully as single source of truth.');

    // Ensure compound indexes are synced in MongoDB
    await Promise.all([
      rawCategoryModel.syncIndexes().catch(e => console.warn('[DB] Category indexes sync:', e.message)),
      rawOrderModel.syncIndexes().catch(e => console.warn('[DB] Order indexes sync:', e.message)),
      rawTableModel.syncIndexes().catch(e => console.warn('[DB] Table indexes sync:', e.message)),
      rawMenuItemModel.syncIndexes().catch(e => console.warn('[DB] MenuItem indexes sync:', e.message)),
      rawSettingModel.syncIndexes().catch(e => console.warn('[DB] Setting indexes sync:', e.message)),
      rawUserModel.syncIndexes().catch(e => console.warn('[DB] User indexes sync:', e.message)),
      rawAuditLogModel.syncIndexes().catch(e => console.warn('[DB] AuditLog indexes sync:', e.message))
    ]);

    return true;
  } catch (err) {
    console.warn('⚠️  [DB] MongoDB Atlas connection failed:', err.message);
    console.log('  [DB] Falling back to safe atomic local file storage.');
    isConnectedToMongo = false;
    return false;
  }
}

// ----------------- AUDIT LOG OPERATIONS -----------------
async function createAuditLog(restaurantSlug, logData = {}) {
  try {
    const slug = slugifyRestaurant(restaurantSlug);
    const newLog = {
      id: `audit_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      restaurantSlug: slug,
      restaurantId: logData.restaurantId || '',
      actorId: logData.actorId || 'system',
      actorName: logData.actorName || 'Staff',
      actorRole: logData.actorRole || 'admin',
      action: logData.action || 'ACTION',
      entityType: logData.entityType || 'general',
      entityId: logData.entityId || '',
      details: logData.details || {},
      createdAt: new Date().toISOString()
    };
    return await AuditLogModel.create(newLog);
  } catch (e) {
    console.warn('[DB] Failed to create audit log:', e.message);
    return null;
  }
}

async function getAuditLogs(restaurantSlug, options = {}) {
  const slug = slugifyRestaurant(restaurantSlug);
  const filter = { restaurantSlug: slug };
  if (options.action) filter.action = options.action;
  if (options.entityType) filter.entityType = options.entityType;

  const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 50));
  return await AuditLogModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
}

// ----------------- CATEGORY OPERATIONS (Section 4.B) -----------------
async function getCategories(restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug);
  let categories = await CategoryModel.find({ restaurantSlug: slug }).sort({ displayOrder: 1, name: 1 }).lean();
  return categories || [];
}

async function saveCategory(categoryData, restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug || categoryData.restaurantSlug);
  const catId = categoryData.id || `cat_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
  const now = new Date().toISOString();

  const toSave = {
    ...categoryData,
    id: catId,
    restaurantSlug: slug,
    name: categoryData.name.trim(),
    displayOrder: categoryData.displayOrder !== undefined ? parseInt(categoryData.displayOrder, 10) : 0,
    isActive: categoryData.isActive !== undefined ? Boolean(categoryData.isActive) : true,
    updatedAt: now
  };
  if (!toSave.createdAt) toSave.createdAt = now;

  const saved = await CategoryModel.findOneAndUpdate(
    { id: catId, restaurantSlug: slug },
    { $set: toSave },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, lean: true }
  );

  return saved;
}

async function updateCategory(id, updates, restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug);
  const now = new Date().toISOString();

  const updated = await CategoryModel.findOneAndUpdate(
    { id, restaurantSlug: slug },
    { $set: { ...updates, updatedAt: now } },
    { returnDocument: 'after', lean: true }
  );

  return updated;
}

async function deleteCategory(id, restaurantSlug = 'tablemint', actionOnItems = 'prevent') {
  const slug = slugifyRestaurant(restaurantSlug);
  const category = await CategoryModel.findOne({ id, restaurantSlug: slug }).lean();
  if (!category) return { success: false, error: 'CATEGORY_NOT_FOUND' };

  // Check if items exist under this category
  const itemsCount = await MenuItemModel.countDocuments({
    restaurantSlug: slug,
    category: category.name
  });

  if (itemsCount > 0) {
    if (actionOnItems === 'prevent') {
      return {
        success: false,
        error: 'CATEGORY_HAS_ITEMS',
        itemsCount,
        message: `Cannot delete category "${category.name}" because it contains ${itemsCount} menu item(s). Please move or delete the items first.`
      };
    } else if (actionOnItems === 'delete_items') {
      await MenuItemModel.deleteMany({ restaurantSlug: slug, category: category.name });
    }
  }

  const res = await CategoryModel.deleteOne({ id, restaurantSlug: slug });
  return { success: res.deletedCount > 0 };
}

async function reorderCategories(orderedIds, restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug);
  if (!Array.isArray(orderedIds)) return [];

  const bulkOps = orderedIds.map((id, index) => ({
    updateOne: {
      filter: { id, restaurantSlug: slug },
      update: { $set: { displayOrder: index, updatedAt: new Date().toISOString() } }
    }
  }));

  if (bulkOps.length > 0) {
    await CategoryModel.bulkWrite(bulkOps);
  }

  return await getCategories(slug);
}

async function seedSuggestedCategories(categoryNames, restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug);
  const names = Array.isArray(categoryNames) && categoryNames.length > 0 ? categoryNames : SUGGESTED_CATEGORIES;
  const existing = await getCategories(slug);
  const existingNames = new Set(existing.map(c => c.name.toLowerCase()));

  const toInsert = [];
  names.forEach((name, idx) => {
    if (!existingNames.has(name.toLowerCase())) {
      toInsert.push({
        id: `cat_${slugifyRestaurant(name)}_${crypto.randomBytes(2).toString('hex')}`,
        restaurantSlug: slug,
        name: name.trim(),
        displayOrder: existing.length + idx,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  });

  if (toInsert.length > 0) {
    await CategoryModel.insertMany(toInsert);
  }

  return await getCategories(slug);
}

// ----------------- ORDERS -----------------
async function getOrders(restaurantSlug = 'tablemint', options = {}) {
  const slug = slugifyRestaurant(restaurantSlug);
  const filter = { restaurantSlug: slug };

  if (options.status) {
    filter.status = options.status;
  }
  if (options.tableId) {
    filter.tableId = parseInt(options.tableId, 10);
  }
  if (options.paid !== undefined) {
    filter.paid = Boolean(options.paid);
  }

  const query = OrderModel.find(filter).sort({ createdAt: -1 });

  if (options.page && options.limit) {
    const page = Math.max(1, parseInt(options.page, 10) || 1);
    const limit = Math.max(1, parseInt(options.limit, 10) || 50);
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      query.skip(skip).limit(limit).lean(),
      OrderModel.countDocuments(filter)
    ]);
    return {
      orders: orders || [],
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  const orders = await query.lean();
  return orders || [];
}

async function getOrderById(id, restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug);
  return await OrderModel.findOne({ id, restaurantSlug: slug }).lean();
}

async function saveOrder(order, restaurantSlug = null) {
  const slug = slugifyRestaurant(restaurantSlug || order.restaurantSlug);
  const now = new Date().toISOString();
  const cleanOrder = {
    ...order,
    restaurantSlug: slug,
    updatedAt: now
  };
  if (!cleanOrder.createdAt) cleanOrder.createdAt = now;

  const saved = await OrderModel.findOneAndUpdate(
    { id: order.id, restaurantSlug: slug },
    { $set: cleanOrder },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, lean: true }
  );

  return saved;
}

async function updateOrder(id, updates, restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug);
  const now = new Date().toISOString();

  const updated = await OrderModel.findOneAndUpdate(
    { id, restaurantSlug: slug },
    { $set: { ...updates, updatedAt: now } },
    { returnDocument: 'after', lean: true }
  );

  return updated;
}

// ----------------- TABLES -----------------
async function getTables(restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug);
  let tables = await TableModel.find({ restaurantSlug: slug }).sort({ id: 1 }).lean();

  if (!tables || tables.length === 0) {
    // If tablemint legacy without tables in mongo, seed default 10
    if (slug === 'tablemint') {
      const default10 = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        restaurantSlug: 'tablemint',
        name: `Table ${i + 1}`,
        capacity: 4,
        section: i < 5 ? 'Indoor Main Hall' : 'Outdoor Patio',
        status: 'available',
        manualStatus: 'vacant',
        sessionToken: generateTableToken(i + 1),
        tokenCreatedAt: new Date().toISOString()
      }));
      await TableModel.insertMany(default10);
      tables = default10;
    }
  }

  return tables || [];
}

async function findTableByToken(token, restaurantSlug = null) {
  if (!token || typeof token !== 'string') return null;
  const clean = token.trim();
  const filter = { sessionToken: clean };
  if (restaurantSlug) {
    filter.restaurantSlug = slugifyRestaurant(restaurantSlug);
  }
  return await TableModel.findOne(filter).lean();
}

async function saveTables(tables, restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug);
  if (!Array.isArray(tables)) return [];

  const newTableIds = tables.map(t => parseInt(t.id, 10)).filter(n => !isNaN(n));

  // 1. Remove deleted tables from MongoDB
  await TableModel.deleteMany({
    restaurantSlug: slug,
    id: { $nin: newTableIds }
  });

  // 2. Upsert current tables
  if (tables.length > 0) {
    const bulkOps = tables.map(t => ({
      updateOne: {
        filter: { id: parseInt(t.id, 10), restaurantSlug: slug },
        update: {
          $set: {
            ...t,
            id: parseInt(t.id, 10),
            restaurantSlug: slug
          }
        },
        upsert: true
      }
    }));
    await TableModel.bulkWrite(bulkOps);
  }

  return await TableModel.find({ restaurantSlug: slug }).sort({ id: 1 }).lean();
}

async function updateTable(id, updates, restaurantSlug = 'tablemint') {
  const tableId = parseInt(id, 10);
  const slug = slugifyRestaurant(restaurantSlug);

  const updated = await TableModel.findOneAndUpdate(
    { id: tableId, restaurantSlug: slug },
    { $set: updates },
    { returnDocument: 'after', lean: true }
  );

  return updated;
}

async function deleteTable(id, restaurantSlug = 'tablemint') {
  const tableId = parseInt(id, 10);
  const slug = slugifyRestaurant(restaurantSlug);
  const res = await TableModel.deleteOne({ id: tableId, restaurantSlug: slug });
  return res.deletedCount > 0;
}

// ----------------- MENU (Requirement Section 3 & 4) -----------------
// Fresh restaurants ALWAYS start with an empty menu ([])
// NEVER auto-copy canonical menu into new restaurant accounts.
async function getMenu(restaurantSlug = 'tablemint', filter = {}) {
  const slug = slugifyRestaurant(restaurantSlug);
  const query = { restaurantSlug: slug, ...filter };
  const items = await MenuItemModel.find(query).sort({ displayOrder: 1, category: 1, name: 1 }).lean();
  return items || [];
}

async function saveMenu(menu, restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug);
  if (!Array.isArray(menu)) return [];

  const newItemIds = menu.map(m => m.id);

  // Delete removed menu items for this restaurant
  await MenuItemModel.deleteMany({
    restaurantSlug: slug,
    id: { $nin: newItemIds }
  });

  if (menu.length > 0) {
    const bulkOps = menu.map(m => ({
      updateOne: {
        filter: { id: m.id, restaurantSlug: slug },
        update: {
          $set: {
            ...m,
            restaurantSlug: slug,
            available: m.available !== undefined ? Boolean(m.available) : true,
            isAvailable: m.isAvailable !== undefined ? Boolean(m.isAvailable) : true,
            status: m.status || (m.available !== false ? 'published' : 'unavailable')
          }
        },
        upsert: true
      }
    }));
    await MenuItemModel.bulkWrite(bulkOps);
  }

  return await MenuItemModel.find({ restaurantSlug: slug }).sort({ displayOrder: 1, category: 1, name: 1 }).lean();
}

async function updateMenuItem(id, updates, restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug);
  const normalized = { ...updates, updatedAt: new Date().toISOString() };
  if (normalized.available !== undefined && normalized.isAvailable === undefined) {
    normalized.isAvailable = normalized.available;
  }
  if (normalized.isAvailable !== undefined && normalized.available === undefined) {
    normalized.available = normalized.isAvailable;
  }

  const updated = await MenuItemModel.findOneAndUpdate(
    { id, restaurantSlug: slug },
    { $set: normalized },
    { returnDocument: 'after', lean: true }
  );

  return updated;
}

async function deleteMenuItem(id, restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug);
  const res = await MenuItemModel.deleteOne({ id, restaurantSlug: slug });
  return res.deletedCount > 0;
}

// DUPLICATE MENU ITEM (Requirement Section 16.C)
async function duplicateMenuItem(id, restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug);
  const original = await MenuItemModel.findOne({ id, restaurantSlug: slug }).lean();
  if (!original) return null;

  const { _id, __v, ...rest } = original;
  const newId = `item_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
  const duplicated = {
    ...rest,
    id: newId,
    name: `${original.name} (Copy)`,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const created = await MenuItemModel.create(duplicated);
  return created.toObject ? created.toObject() : created;
}

// BULK AVAILABILITY UPDATE (Requirement Section 16.B)
async function bulkUpdateMenuAvailability(itemIds, isAvailable, restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug);
  if (!Array.isArray(itemIds) || itemIds.length === 0) return 0;

  const avail = Boolean(isAvailable);
  const res = await MenuItemModel.updateMany(
    { id: { $in: itemIds }, restaurantSlug: slug },
    {
      $set: {
        isAvailable: avail,
        available: avail,
        status: avail ? 'published' : 'unavailable',
        updatedAt: new Date().toISOString()
      }
    }
  );

  return res.modifiedCount;
}

// BULK PUBLISH STATUS UPDATE (Requirement Section 4.F)
async function bulkUpdateMenuPublishStatus(itemIds, status, restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug);
  if (!Array.isArray(itemIds) || itemIds.length === 0) return 0;

  const validStatus = ['draft', 'published', 'unavailable'].includes(status) ? status : 'published';
  const res = await MenuItemModel.updateMany(
    { id: { $in: itemIds }, restaurantSlug: slug },
    {
      $set: {
        status: validStatus,
        isAvailable: validStatus !== 'unavailable',
        available: validStatus !== 'unavailable',
        updatedAt: new Date().toISOString()
      }
    }
  );

  return res.modifiedCount;
}

// EXPLICIT DEMO / DEFAULT SEED ACTION ONLY (Section 3)
// Never called automatically on signup! Only when owner explicitly asks to load TableMint default catalog.
async function seedDemoMenu(restaurantSlug = 'tablemint', options = {}) {
  const opts = typeof options === 'string' ? { mode: options } : (options || {});
  const { mode = 'replace', categoryFilter = null, selectedIds = null } = opts;
  const slug = slugifyRestaurant(restaurantSlug);
  const canonicalMenu = getCanonicalMenu();
  if (!canonicalMenu || canonicalMenu.length === 0) return [];

  let itemsToSeed = [...canonicalMenu];
  if (selectedIds && Array.isArray(selectedIds) && selectedIds.length > 0) {
    itemsToSeed = itemsToSeed.filter(i => selectedIds.includes(i.id) || selectedIds.includes(String(i._id)));
  } else if (categoryFilter && categoryFilter !== 'all') {
    itemsToSeed = itemsToSeed.filter(i => i.category === categoryFilter);
  }

  if (mode === 'replace') {
    // Delete existing menu items for this restaurant
    await MenuItemModel.deleteMany({ restaurantSlug: slug });
  }

  // If mode === 'merge', filter out dishes whose names already exist in this restaurant's menu
  let existingNames = new Set();
  if (mode === 'merge') {
    const currentItems = await MenuItemModel.find({ restaurantSlug: slug }).select('name').lean();
    existingNames = new Set(currentItems.map(i => (i.name || '').trim().toLowerCase()));
  }

  // Map canonical menu without fixed MongoDB _id to prevent duplicate key collision
  const demoItems = itemsToSeed
    .filter(m => !existingNames.has((m.name || '').trim().toLowerCase()))
    .map((m, idx) => {
      const { _id, ...clean } = m;
      return {
        ...clean,
        id: `${slug}-item-${Date.now()}-${idx + 1}`,
        restaurantSlug: slug,
        status: 'published',
        available: true,
        isAvailable: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

  if (demoItems.length > 0) {
    await MenuItemModel.insertMany(demoItems);
  }

  // Seed default categories matching canonical menu
  const distinctCategories = [...new Set(demoItems.map(i => i.category))];
  if (distinctCategories.length > 0) {
    await seedSuggestedCategories(distinctCategories, slug);
  }

  return await MenuItemModel.find({ restaurantSlug: slug }).sort({ category: 1, name: 1 }).lean();
}

// ----------------- SETTINGS -----------------
async function getSettings(restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug);
  let settings = await SettingModel.findOne({ restaurantSlug: slug }).lean();

  if (!settings) {
    settings = {
      ...defaultSettings,
      restaurantSlug: slug,
      restaurantName: slug === 'tablemint' ? 'TableMint' : slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      updatedAt: new Date().toISOString()
    };
    await SettingModel.findOneAndUpdate(
      { restaurantSlug: slug },
      { $set: settings },
      { upsert: true, returnDocument: 'after', lean: true }
    );
  }

  const { _id, __v, ...clean } = settings;
  return clean;
}

async function saveSettings(newSettings, restaurantSlug = 'tablemint') {
  const slug = slugifyRestaurant(restaurantSlug || newSettings.restaurantSlug);
  const existing = await getSettings(slug);
  const updated = {
    ...existing,
    ...newSettings,
    restaurantSlug: slug,
    updatedAt: new Date().toISOString()
  };

  const saved = await SettingModel.findOneAndUpdate(
    { restaurantSlug: slug },
    { $set: updated },
    { upsert: true, returnDocument: 'after', lean: true }
  );

  const { _id, __v, ...clean } = saved;
  return clean;
}

// ----------------- USERS -----------------
async function getUsers(restaurantSlug = null) {
  const filter = restaurantSlug ? { restaurantSlug: slugifyRestaurant(restaurantSlug) } : {};
  return await UserModel.find(filter).lean();
}

async function getUserByEmail(email) {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();
  return await UserModel.findOne({ email: cleanEmail }).lean();
}

async function getUserById(id) {
  return await UserModel.findOne({ id }).lean();
}

async function createUser(userData) {
  const slug = slugifyRestaurant(userData.restaurantSlug || userData.restaurantName);
  const newUser = {
    ...userData,
    restaurantSlug: slug,
    createdAt: userData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const created = await UserModel.create(newUser);
  return created.toObject ? created.toObject() : created;
}

async function deleteUser(id, restaurantSlug) {
  const slug = slugifyRestaurant(restaurantSlug);
  const res = await UserModel.deleteOne({ id, restaurantSlug: slug });
  return res.deletedCount > 0;
}

// ----------------- RESTAURANT REGISTRATION & FRESH WORKSPACE (Section 3) -----------------
// Every newly registered restaurant MUST have:
// - Empty menu categories ([])
// - Empty menu items ([])
// - Zero orders
// - Zero previous sales/bills
// - Independent settings
// - 10 fresh vacant tables with secure tokens
// - No copied data from any other restaurant
async function initRestaurantData(restaurantName, restaurantSlug, options = {}) {
  const slug = slugifyRestaurant(restaurantSlug || restaurantName);
  const name = (restaurantName || 'TableMint').trim();
  const restId = options.restaurantId || generateRestaurantId();

  // 1. Independent Restaurant Settings
  const newSettings = {
    ...defaultSettings,
    restaurantId: restId,
    restaurantName: name,
    restaurantSlug: slug,
    email: options.email || `contact@${slug}.com`,
    phone: options.phone || '+91 98765 43210',
    address: options.address || 'Dining Hall & Kitchen',
    updatedAt: new Date().toISOString()
  };
  await saveSettings(newSettings, slug);

  // 2. Fresh Tables (10 clean vacant tables with unique, secure session tokens)
  const freshTables = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    restaurantId: restId,
    restaurantSlug: slug,
    name: `Table ${i + 1}`,
    capacity: 4,
    section: i < 5 ? 'Indoor Main' : 'Terrace',
    status: 'available',
    manualStatus: 'vacant',
    sessionToken: generateTableToken(i + 1),
    tokenCreatedAt: new Date().toISOString()
  }));
  await saveTables(freshTables, slug);

  // 3. EMPTY MENU: Per Section 3 & 4.A, every new restaurant starts with an EMPTY menu!
  // Do NOT copy canonical menu items into new restaurant accounts.
  await MenuItemModel.deleteMany({ restaurantSlug: slug });
  await CategoryModel.deleteMany({ restaurantSlug: slug });

  // 4. Zero orders, zero revenue
  await OrderModel.deleteMany({ restaurantSlug: slug });

  // 5. Initial Audit Log
  await createAuditLog(slug, {
    restaurantId: restId,
    action: 'RESTAURANT_ONBOARDED',
    entityType: 'restaurant',
    entityId: restId,
    actorId: options.userId || 'owner',
    actorName: options.userName || 'Owner',
    actorRole: 'admin',
    details: { restaurantName: name, slug }
  });

  return {
    restaurantId: restId,
    restaurantSlug: slug,
    settings: newSettings,
    tables: freshTables,
    menu: [],
    categories: []
  };
}

// ----------------- REPORTS & ANALYTICS AGGREGATION -----------------
async function getAnalyticsReport(restaurantSlug = 'tablemint', timeframe = 'today') {
  const slug = slugifyRestaurant(restaurantSlug);
  const now = new Date();
  const tf = (timeframe || 'today').toLowerCase().trim();

  let startDate;
  let prevStartDate;
  let prevEndDate;
  let dateRangeLabel = '';

  if (tf === 'today' || tf === 'daily') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    prevStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
    prevEndDate = new Date(startDate.getTime());
    dateRangeLabel = `Today, ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  } else if (tf === '7days' || tf === 'week' || tf === '7dayes') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
    prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    prevEndDate = new Date(startDate.getTime());
    dateRangeLabel = `Last 7 Days (${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
  } else if (tf === 'month' || tf === 'months' || tf === 'monthly') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    prevEndDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    dateRangeLabel = `This Month (${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`;
  } else if (tf === 'year' || tf === 'years' || tf === 'yearly') {
    startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    prevStartDate = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
    prevEndDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    dateRangeLabel = `Year ${now.getFullYear()}`;
  } else {
    // all time
    startDate = new Date(0);
    prevStartDate = new Date(0);
    prevEndDate = new Date(0);
    dateRangeLabel = 'All Time';
  }

  const [currentOrders, prevOrders, menuItems] = await Promise.all([
    OrderModel.find({
      restaurantSlug: slug,
      createdAt: { $gte: startDate.toISOString() }
    }).lean(),
    tf !== 'all' ? OrderModel.find({
      restaurantSlug: slug,
      createdAt: { $gte: prevStartDate.toISOString(), $lt: prevEndDate.toISOString() }
    }).lean() : Promise.resolve([]),
    MenuItemModel.find({ restaurantSlug: slug }).lean()
  ]);

  // Menu image & category lookup
  const menuMap = new Map();
  (menuItems || []).forEach(m => {
    menuMap.set((m.name || '').toLowerCase().trim(), m);
  });

  // Calculate KPIs
  const nonCancelledOrders = (currentOrders || []).filter(o => o.status !== 'cancelled');
  const paidOrders = (currentOrders || []).filter(o => o.paid === true || o.status === 'completed' || o.paymentStatus === 'paid');
  const revenueEligibleOrders = paidOrders.length > 0 ? paidOrders : nonCancelledOrders;

  const totalRevenue = revenueEligibleOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalOrders = (currentOrders || []).length;
  const avgOrderValue = revenueEligibleOrders.length > 0
    ? Math.round(totalRevenue / revenueEligibleOrders.length)
    : 0;

  const uniqueTables = new Set((currentOrders || []).map(o => o.tableId).filter(Boolean));
  const totalCustomers = uniqueTables.size || (totalOrders > 0 ? totalOrders : 0);

  // Growth calculations
  const prevPaidOrders = (prevOrders || []).filter(o => o.paid === true || o.status === 'completed' || o.paymentStatus === 'paid');
  const prevRevenueOrders = prevPaidOrders.length > 0 ? prevPaidOrders : (prevOrders || []).filter(o => o.status !== 'cancelled');
  const prevRevenue = prevRevenueOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const prevTotalOrders = (prevOrders || []).length;

  let revenueGrowthPct = 0;
  if (prevRevenue > 0) {
    revenueGrowthPct = Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100);
  } else if (totalRevenue > 0) {
    revenueGrowthPct = 100;
  }

  let ordersGrowthPct = 0;
  if (prevTotalOrders > 0) {
    ordersGrowthPct = Math.round(((totalOrders - prevTotalOrders) / prevTotalOrders) * 100);
  } else if (totalOrders > 0) {
    ordersGrowthPct = 100;
  }

  // Revenue Trend & Hourly Volume
  let trendBuckets = [];
  let hourlyBuckets = [];

  if (tf === 'today' || tf === 'daily') {
    const intervals = [
      { label: '6 AM', startHour: 0, endHour: 7 },
      { label: '9 AM', startHour: 8, endHour: 10 },
      { label: '12 PM', startHour: 11, endHour: 13 },
      { label: '3 PM', startHour: 14, endHour: 16 },
      { label: '6 PM', startHour: 17, endHour: 19 },
      { label: '9 PM', startHour: 20, endHour: 23 }
    ];

    trendBuckets = intervals.map(int => {
      const bucketOrders = revenueEligibleOrders.filter(o => {
        const d = new Date(o.createdAt);
        const h = d.getHours();
        return h >= int.startHour && h <= int.endHour;
      });
      const rev = bucketOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      return { label: int.label, revenue: rev, count: bucketOrders.length };
    });

    const hours = [
      { label: '9 AM', h: 9 },
      { label: '11 AM', h: 11 },
      { label: '1 PM', h: 13 },
      { label: '3 PM', h: 15 },
      { label: '5 PM', h: 17 },
      { label: '7 PM', h: 19 },
      { label: '9 PM', h: 21 }
    ];
    hourlyBuckets = hours.map(hb => {
      const count = nonCancelledOrders.filter(o => new Date(o.createdAt).getHours() === hb.h).length;
      return { hour: hb.label, count };
    });
  } else if (tf === '7days' || tf === 'week' || tf === '7dayes') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const dEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      const dayLabel = `${days[d.getDay()]} ${d.getDate()}`;
      const dayRevOrders = revenueEligibleOrders.filter(o => {
        const t = new Date(o.createdAt).getTime();
        return t >= dStart.getTime() && t <= dEnd.getTime();
      });
      const dayAll = nonCancelledOrders.filter(o => {
        const t = new Date(o.createdAt).getTime();
        return t >= dStart.getTime() && t <= dEnd.getTime();
      });
      const rev = dayRevOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      trendBuckets.push({ label: dayLabel, revenue: rev, count: dayRevOrders.length });
      hourlyBuckets.push({ hour: dayLabel, count: dayAll.length });
    }
  } else if (tf === 'month' || tf === 'months' || tf === 'monthly') {
    const intervals = [
      { label: '1-6', startDay: 1, endDay: 6 },
      { label: '7-12', startDay: 7, endDay: 12 },
      { label: '13-18', startDay: 13, endDay: 18 },
      { label: '19-24', startDay: 19, endDay: 24 },
      { label: '25-End', startDay: 25, endDay: 31 }
    ];
    trendBuckets = intervals.map(int => {
      const bOrders = revenueEligibleOrders.filter(o => {
        const d = new Date(o.createdAt);
        const day = d.getDate();
        return day >= int.startDay && day <= int.endDay;
      });
      const rev = bOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      return { label: `Day ${int.label}`, revenue: rev, count: bOrders.length };
    });
    hourlyBuckets = intervals.map(int => {
      const bAll = nonCancelledOrders.filter(o => {
        const d = new Date(o.createdAt);
        const day = d.getDate();
        return day >= int.startDay && day <= int.endDay;
      });
      return { hour: `Day ${int.label}`, count: bAll.length };
    });
  } else if (tf === 'year' || tf === 'years' || tf === 'yearly') {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    trendBuckets = monthNames.map((mName, mIdx) => {
      const mOrders = revenueEligibleOrders.filter(o => {
        const d = new Date(o.createdAt);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === mIdx;
      });
      const rev = mOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      return { label: mName, revenue: rev, count: mOrders.length };
    });
    hourlyBuckets = monthNames.map((mName, mIdx) => {
      const mAll = nonCancelledOrders.filter(o => {
        const d = new Date(o.createdAt);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === mIdx;
      });
      return { hour: mName, count: mAll.length };
    });
  } else {
    for (let w = 4; w >= 1; w--) {
      const wStart = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
      const wEnd = new Date(now.getTime() - (w - 1) * 7 * 24 * 60 * 60 * 1000);
      const wPaid = revenueEligibleOrders.filter(o => {
        const t = new Date(o.createdAt).getTime();
        return t >= wStart.getTime() && t < wEnd.getTime();
      });
      const wAll = nonCancelledOrders.filter(o => {
        const t = new Date(o.createdAt).getTime();
        return t >= wStart.getTime() && t < wEnd.getTime();
      });
      const rev = wPaid.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      trendBuckets.push({ label: `Wk ${5 - w}`, revenue: rev, count: wPaid.length });
      hourlyBuckets.push({ hour: `Wk ${5 - w}`, count: wAll.length });
    }
  }

  // Top Selling Items from order item lines
  const itemAgg = new Map();
  nonCancelledOrders.forEach(o => {
    (o.items || []).forEach(it => {
      const name = it.name || 'Dish';
      const key = name.toLowerCase().trim();
      const current = itemAgg.get(key) || {
        name,
        count: 0,
        sales: 0,
        category: it.category || 'General',
        image: it.image || '/images/paneer_butter_masala.jpg',
        price: Number(it.price) || 0
      };
      const qty = Number(it.quantity) || 1;
      const itemPrice = Number(it.price) || 0;
      current.count += qty;
      current.sales += qty * itemPrice;
      const lookup = menuMap.get(key);
      if (lookup) {
        if (lookup.image) current.image = lookup.image;
        if (lookup.category) current.category = lookup.category;
      }
      itemAgg.set(key, current);
    });
  });

  const topSellingItems = Array.from(itemAgg.values())
    .sort((a, b) => b.count - a.count || b.sales - a.sales)
    .slice(0, 10)
    .map((item, idx) => ({
      rank: idx + 1,
      ...item
    }));

  // Status Breakdown
  const completedCount = (currentOrders || []).filter(o => o.status === 'completed' || o.paid === true).length;
  const inKitchenCount = (currentOrders || []).filter(o => ['pending', 'preparing', 'cooking', 'in-progress', 'ready', 'served'].includes(o.status) && !o.paid).length;
  const cancelledCount = (currentOrders || []).filter(o => o.status === 'cancelled').length;
  const totalStatus = totalOrders || 1;

  const statusBreakdown = [
    {
      status: 'Completed & Settled',
      count: completedCount,
      pct: `${Math.round((completedCount / totalStatus) * 100)}%`,
      color: '#10b981'
    },
    {
      status: 'In Kitchen / Active',
      count: inKitchenCount,
      pct: `${Math.round((inKitchenCount / totalStatus) * 100)}%`,
      color: '#0284c7'
    },
    {
      status: 'Cancelled',
      count: cancelledCount,
      pct: `${Math.round((cancelledCount / totalStatus) * 100)}%`,
      color: '#ef4444'
    }
  ];

  // Payment Method Breakdown
  const methodMap = {
    'UPI': { count: 0, amount: 0, color: '#10b981' },
    'Cards': { count: 0, amount: 0, color: '#0284c7' },
    'Cash': { count: 0, amount: 0, color: '#f59e0b' }
  };

  paidOrders.forEach(o => {
    const m = (o.paymentMethod || '').toLowerCase();
    const tot = Number(o.total) || 0;
    if (m.includes('upi') || m.includes('gpay') || m.includes('phonepe') || m.includes('qr')) {
      methodMap['UPI'].count++;
      methodMap['UPI'].amount += tot;
    } else if (m.includes('card') || m.includes('credit') || m.includes('debit') || m.includes('pos')) {
      methodMap['Cards'].count++;
      methodMap['Cards'].amount += tot;
    } else {
      methodMap['Cash'].count++;
      methodMap['Cash'].amount += tot;
    }
  });

  const totalPaidRevenue = totalRevenue || 1;
  const paymentBreakdown = [
    {
      method: 'UPI (QR Pay, GPay, PhonePe)',
      amount: `₹ ${(methodMap['UPI'].amount).toLocaleString('en-IN')}`,
      rawAmount: methodMap['UPI'].amount,
      pct: totalRevenue > 0 ? `${Math.round((methodMap['UPI'].amount / totalPaidRevenue) * 100)}%` : '0%',
      color: '#10b981'
    },
    {
      method: 'Credit / Debit Cards',
      amount: `₹ ${(methodMap['Cards'].amount).toLocaleString('en-IN')}`,
      rawAmount: methodMap['Cards'].amount,
      pct: totalRevenue > 0 ? `${Math.round((methodMap['Cards'].amount / totalPaidRevenue) * 100)}%` : '0%',
      color: '#0284c7'
    },
    {
      method: 'Cash on Counter',
      amount: `₹ ${(methodMap['Cash'].amount).toLocaleString('en-IN')}`,
      rawAmount: methodMap['Cash'].amount,
      pct: totalRevenue > 0 ? `${Math.round((methodMap['Cash'].amount / totalPaidRevenue) * 100)}%` : '0%',
      color: '#f59e0b'
    }
  ];

  // Peak Hours Calculation
  const lunchOrders = nonCancelledOrders.filter(o => {
    const h = new Date(o.createdAt).getHours();
    return h >= 12 && h < 16;
  }).length;

  const dinnerOrders = nonCancelledOrders.filter(o => {
    const h = new Date(o.createdAt).getHours();
    return h >= 19 && h < 23;
  }).length;

  // Turnaround time calculation (in minutes)
  const durations = [];
  (currentOrders || []).forEach(o => {
    if (o.createdAt && o.completedAt) {
      const diff = Math.round((new Date(o.completedAt) - new Date(o.createdAt)) / 60000);
      if (diff > 0 && diff < 300) durations.push(diff);
    }
  });
  const avgTurnaround = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 25;

  const peakHours = {
    lunchRush: {
      title: 'LUNCH RUSH',
      hours: '12:00 PM – 4:00 PM',
      count: lunchOrders,
      turnaround: avgTurnaround,
      summary: lunchOrders > 0
        ? `${lunchOrders} orders served. Table turnaround is ~${avgTurnaround} mins.`
        : 'No lunch orders recorded in this period.'
    },
    dinnerRush: {
      title: 'DINNER RUSH',
      hours: '7:00 PM – 11:00 PM',
      count: dinnerOrders,
      turnaround: avgTurnaround,
      summary: dinnerOrders > 0
        ? `${dinnerOrders} orders served. Evening dining rush period.`
        : 'No dinner orders recorded in this period.'
    }
  };

  return {
    timeframe,
    dateRangeLabel,
    kpis: {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      totalCustomers,
      revenueGrowthPct,
      ordersGrowthPct
    },
    revenueTrend: trendBuckets,
    hourlyVolume: hourlyBuckets,
    topSellingItems,
    statusBreakdown,
    paymentBreakdown,
    peakHours
  };
}

module.exports = {
  CategoryModel,
  OrderModel,
  TableModel,
  MenuItemModel,
  SettingModel,
  UserModel,
  AuditLogModel,
  initDatabase,
  slugifyRestaurant,
  generateTableToken,
  generateRestaurantId,
  findTableByToken,
  initRestaurantData,
  createAuditLog,
  getAuditLogs,
  getCategories,
  saveCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  seedSuggestedCategories,
  SUGGESTED_CATEGORIES,
  getOrders,
  getOrderById,
  saveOrder,
  updateOrder,
  getTables,
  saveTables,
  updateTable,
  deleteTable,
  getMenu,
  saveMenu,
  updateMenuItem,
  deleteMenuItem,
  duplicateMenuItem,
  bulkUpdateMenuAvailability,
  bulkUpdateMenuPublishStatus,
  seedDemoMenu,
  getCanonicalMenu,
  getSettings,
  saveSettings,
  getUsers,
  getUserByEmail,
  getUserById,
  createUser,
  deleteUser,
  getAnalyticsReport,
  getIsConnectedToMongo: () => isConnectedToMongo
};
