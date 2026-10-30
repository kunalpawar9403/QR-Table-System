require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../db');

async function cleanDatabase() {
  await db.initDatabase();

  console.log('--- 1. CLEANING TEST ACCOUNTS & WORKSPACES ---');
  // Remove temporary test users
  const deleteUsersResult = await db.UserModel.deleteMany({
    $or: [
      { email: { $regex: /@test\.com$/i } },
      { email: { $regex: /^fresh_/i } },
      { restaurantSlug: { $regex: /^test-rest/i } },
      { restaurantSlug: { $regex: /^restaurant-[ab]-test/i } },
      { restaurantSlug: { $regex: /^fresh-bistro/i } }
    ]
  });
  console.log('Deleted temporary test users:', deleteUsersResult.deletedCount);

  // Remove settings for test slugs
  const deleteSettingsResult = await db.SettingModel.deleteMany({
    $or: [
      { restaurantSlug: { $regex: /^test-rest/i } },
      { restaurantSlug: { $regex: /^restaurant-[ab]-test/i } },
      { restaurantSlug: { $regex: /^fresh-bistro/i } }
    ]
  });
  console.log('Deleted temporary test settings:', deleteSettingsResult.deletedCount);

  // Remove tables for test slugs
  const deleteTablesResult = await db.TableModel.deleteMany({
    $or: [
      { restaurantSlug: { $regex: /^test-rest/i } },
      { restaurantSlug: { $regex: /^restaurant-[ab]-test/i } },
      { restaurantSlug: { $regex: /^fresh-bistro/i } }
    ]
  });
  console.log('Deleted temporary test tables:', deleteTablesResult.deletedCount);

  // Remove menu items for test slugs
  const deleteMenuResult = await db.MenuItemModel.deleteMany({
    $or: [
      { restaurantSlug: { $regex: /^test-rest/i } },
      { restaurantSlug: { $regex: /^restaurant-[ab]-test/i } },
      { restaurantSlug: { $regex: /^fresh-bistro/i } }
    ]
  });
  console.log('Deleted temporary test menu items:', deleteMenuResult.deletedCount);

  console.log('\n--- 2. FRESH ORDERS RESET (CLEAN SLATE: 0 ORDERS) ---');
  const deleteOrdersResult = await db.OrderModel.deleteMany({});
  console.log('Total orders purged for clean start:', deleteOrdersResult.deletedCount);

  console.log('\n--- 3. RESETTING ALL TABLES TO VACANT WITH FRESH TOKENS ---');
  const allTables = await db.TableModel.find().lean();
  for (const t of allTables) {
    const freshToken = db.generateTableToken(t.id);
    await db.TableModel.updateOne(
      { _id: t._id },
      {
        $set: {
          status: 'available',
          manualStatus: 'vacant',
          occupiedAt: null,
          lastOrderAt: null,
          lastClearedAt: null,
          sessionToken: freshToken,
          tokenCreatedAt: new Date().toISOString()
        }
      }
    );
  }
  console.log('Reset tables to vacant with fresh tokens:', allTables.length);

  console.log('\n--- 4. POPULATING CANONICAL STARTER MENU FOR ALL RESTAURANTS ---');
  const canonicalMenuPath = path.join(__dirname, '..', 'data', 'canonical_menu.json');
  const canonicalMenu = JSON.parse(fs.readFileSync(canonicalMenuPath, 'utf8'));
  const remainingUsers = await db.UserModel.find().lean();
  const validSlugs = Array.from(new Set(['tablemint', ...remainingUsers.map(u => u.restaurantSlug)]));

  for (const slug of validSlugs) {
    const existingCount = await db.MenuItemModel.countDocuments({ restaurantSlug: slug });
    if (existingCount === 0) {
      const itemsToInsert = canonicalMenu.map(m => ({
        ...m,
        id: slug === 'tablemint' ? m.id : `${slug}-${m.id}`,
        restaurantSlug: slug,
        available: true,
        isAvailable: true
      }));
      await db.MenuItemModel.insertMany(itemsToInsert);
      console.log(`Populated ${itemsToInsert.length} canonical menu items for ${slug}`);
    } else {
      console.log(`Restaurant "${slug}" has ${existingCount} menu items ready.`);
    }
  }

  console.log('\n--- 5. SYNCING CLEAN STATE TO LOCAL DATA FILES ---');
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'orders.json'), JSON.stringify([], null, 2), 'utf8');
  const freshTablesList = await db.TableModel.find().lean();
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'tables.json'), JSON.stringify(freshTablesList, null, 2), 'utf8');
  const freshUsersList = await db.UserModel.find().lean();
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'users.json'), JSON.stringify(freshUsersList, null, 2), 'utf8');

  console.log('\n=============================================================');
  console.log('✅ DATABASE CLEANUP COMPLETE! FRESH START READY.');
  console.log('=============================================================\n');
  process.exit(0);
}

cleanDatabase().catch(err => {
  console.error('Cleanup error:', err);
  process.exit(1);
});
