require('dotenv').config();
const crypto = require('crypto');
const db = require('../db');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
let passed = 0;
let total = 8;

function assert(cond, msg) {
  if (!cond) throw new Error(`[ASSERTION FAILED]: ${msg}`);
}

async function runMenuAndSaasTests() {
  console.log('\n=============================================================');
  console.log('  TABLEMINT SMART MENU BUILDER & SAAS FEATURE TESTS');
  console.log('=============================================================\n');

  await db.initDatabase();
  const restSlug = `menu-test-${crypto.randomBytes(3).toString('hex')}`;
  const ownerEmail = `menu_owner_${Date.now()}@test.com`;
  const password = 'Password@123';

  // 1. Register new restaurant
  console.log('[TEST 1] Registering fresh restaurant...');
  const regRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Menu Owner',
      email: ownerEmail,
      password,
      restaurantName: `Menu Bistro ${restSlug}`
    })
  });
  const regData = await regRes.json();
  assert(regRes.status === 201 && regData.token, 'Signup failed');
  const token = regData.token;
  const slug = regData.user.restaurantSlug;
  console.log('✅ Test 1 Passed: Fresh restaurant created with token.');
  passed++;

  // 2. Verify empty menu & empty categories on signup (Section 3 & 4.A)
  console.log('\n[TEST 2] Verifying empty menu & empty categories by default...');
  const menuRes = await fetch(`${BASE_URL}/api/menu?restaurant=${slug}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const menu = await menuRes.json();
  assert(Array.isArray(menu) && menu.length === 0, `Expected 0 menu items, got ${menu.length}`);

  const catRes = await fetch(`${BASE_URL}/api/categories?restaurant=${slug}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const cats = await catRes.json();
  assert(Array.isArray(cats) && cats.length === 0, `Expected 0 categories, got ${cats.length}`);
  console.log('✅ Test 2 Passed: Fresh restaurant starts with empty menu and empty categories.');
  passed++;

  // 3. Category management & Seed Suggested (Section 4.B)
  console.log('\n[TEST 3] Adding suggested categories and creating custom category...');
  const seedCatRes = await fetch(`${BASE_URL}/api/categories/seed-suggested`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ categories: ['Starters', 'Biryani and Rice', 'Desserts'] })
  });
  const seedData = await seedCatRes.json();
  assert(seedData.success && seedData.categories.length === 3, 'Failed to seed suggested categories');

  // Add custom category
  const addCatRes = await fetch(`${BASE_URL}/api/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name: 'Chef Specials', description: 'Handcrafted signature recipes' })
  });
  const customCat = await addCatRes.json();
  assert(addCatRes.status === 201 && customCat.name === 'Chef Specials', 'Failed to create custom category');
  console.log('✅ Test 3 Passed: Seeded suggested categories and added custom category.');
  passed++;

  // 4. Create menu item with variants and add-ons (Section 4.C)
  console.log('\n[TEST 4] Creating item with variants (Half/Full) and add-ons...');
  const createItemRes = await fetch(`${BASE_URL}/api/menu`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Paneer Tikka',
      category: 'Starters',
      price: 140,
      variants: [
        { id: 'half', name: 'Half', price: 140 },
        { id: 'full', name: 'Full', price: 250 }
      ],
      addons: [
        { id: 'extra_cheese', name: 'Extra Cheese', price: 30 },
        { id: 'extra_butter', name: 'Extra Butter', price: 20 }
      ],
      isVeg: true,
      status: 'published'
    })
  });
  const createdItem = await createItemRes.json();
  assert(createItemRes.status === 201 && createdItem.variants.length === 2, 'Failed to create item with variants');
  const itemId = createdItem.id;
  console.log('✅ Test 4 Passed: Item created with Half/Full variants and add-ons.');
  passed++;

  // 5. Item Duplication (Section 16.C)
  console.log('\n[TEST 5] Testing menu item duplication...');
  const dupRes = await fetch(`${BASE_URL}/api/menu/${itemId}/duplicate`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const dupItem = await dupRes.json();
  assert(dupRes.status === 201 && dupItem.name === 'Paneer Tikka (Copy)', 'Failed to duplicate item');
  console.log('✅ Test 5 Passed: Successfully duplicated item:', dupItem.name);
  passed++;

  // 6. Bulk availability and publish updates (Section 4.F & 16.B)
  console.log('\n[TEST 6] Testing bulk availability and publish updates...');
  const bulkAvailRes = await fetch(`${BASE_URL}/api/menu/bulk-availability`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ itemIds: [itemId, dupItem.id], isAvailable: false })
  });
  const bulkAvailData = await bulkAvailRes.json();
  assert(bulkAvailData.success && bulkAvailData.count === 2, 'Bulk availability failed');

  const bulkPubRes = await fetch(`${BASE_URL}/api/menu/bulk-publish`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ itemIds: [itemId], status: 'published' })
  });
  const bulkPubData = await bulkPubRes.json();
  assert(bulkPubData.success && bulkPubData.count === 1, 'Bulk publish failed');
  console.log('✅ Test 6 Passed: Bulk availability and publish status updated.');
  passed++;

  // 7. CSV Import Preview & Confirm (Section 4.D)
  console.log('\n[TEST 7] Testing CSV / Excel import validation preview and confirmation...');
  const sampleCsvRows = [
    { 'Item Name': 'Mutton Biryani', 'Category': 'Biryani and Rice', 'Price': '380', 'Food Type': 'Non-Veg' },
    { 'Item Name': 'Gulab Jamun', 'Category': 'Desserts', 'Price': '90', 'Food Type': 'Veg' },
    { 'Item Name': '', 'Category': 'Invalid', 'Price': 'abc' } // Invalid row to test validation
  ];

  const previewRes = await fetch(`${BASE_URL}/api/menu/import-preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ rows: sampleCsvRows })
  });
  const previewData = await previewRes.json();
  assert(previewData.success && previewData.validCount === 2 && previewData.invalidCount === 1, 'Import preview validation failed');
  assert(previewData.rows[2].errors.length > 0, 'Invalid row not flagged with errors');

  // Confirm import with the valid rows
  const confirmRes = await fetch(`${BASE_URL}/api/menu/import-confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ items: previewData.rows.filter(r => r.isValid) })
  });
  const confirmData = await confirmRes.json();
  assert(confirmRes.status === 201 && confirmData.importedCount === 2, 'Import confirm failed');
  console.log('✅ Test 7 Passed: CSV import preview caught invalid rows; valid rows committed with auto-categories.');
  passed++;

  // 8. Audit History & OCR Abstraction (Section 16.H & 4.E)
  console.log('\n[TEST 8] Testing Audit history and OCR provider abstraction...');
  const auditRes = await fetch(`${BASE_URL}/api/audit-logs`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const auditData = await auditRes.json();
  assert(auditData.success && Array.isArray(auditData.logs) && auditData.logs.length > 0, 'Audit logs missing');

  const ocrRes = await fetch(`${BASE_URL}/api/menu/ocr-extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ imageBase64: 'fake_base64_data' })
  });
  const ocrData = await ocrRes.json();
  assert(ocrData.success !== undefined && (ocrData.configured === false || ocrData.configured === true), 'OCR abstraction response invalid');
  console.log('✅ Test 8 Passed: Audit log recorded actions and OCR provider abstraction responded properly.');
  passed++;

  console.log('\n=============================================================');
  console.log(`🎉 ALL ${passed}/${total} SMART MENU & SAAS TESTS PASSED SUCCESSFULLY!`);
  console.log('=============================================================\n');
  process.exit(0);
}

runMenuAndSaasTests().catch(e => {
  console.error('\n❌ TEST FAILED:', e.message);
  process.exit(1);
});
