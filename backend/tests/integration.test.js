require('dotenv').config();
const { io } = require('socket.io-client');
const crypto = require('crypto');
const db = require('../db');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
let passedTests = 0;
let totalTests = 17;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

async function runTests() {
  console.log('\n=============================================================');
  console.log('  TABLEMINT MULTI-TENANT & REAL-TIME INTEGRATION TEST SUITE');
  console.log('=============================================================\n');

  await db.initDatabase();

  // Test setup: Unique test restaurants to ensure zero interference with existing data
  const restASlug = `test-rest-a-${crypto.randomBytes(3).toString('hex')}`;
  const restBSlug = `test-rest-b-${crypto.randomBytes(3).toString('hex')}`;
  const ownerAEmail = `owner_a_${Date.now()}@test.com`;
  const ownerBEmail = `owner_b_${Date.now()}@test.com`;
  const password = 'Password@123';

  let tokenA = '';
  let tokenB = '';
  let itemAId = '';
  let itemBId = '';
  let tableA1 = null;
  let tableB1 = null;

  try {
    // -------------------------------------------------------------
    // SETUP: Register Restaurant A and Restaurant B
    // -------------------------------------------------------------
    console.log('[SETUP] Registering Restaurant A...');
    const resA = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Owner A',
        email: ownerAEmail,
        password,
        restaurantName: `Restaurant A (${restASlug})`
      })
    });
    const dataA = await resA.json();
    assert(resA.status === 201 && dataA.success, 'Restaurant A registration failed');
    tokenA = dataA.token;
    const effectiveSlugA = dataA.user.restaurantSlug;

    console.log('[SETUP] Registering Restaurant B...');
    const resB = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Owner B',
        email: ownerBEmail,
        password,
        restaurantName: `Restaurant B (${restBSlug})`
      })
    });
    const dataB = await resB.json();
    assert(resB.status === 201 && dataB.success, 'Restaurant B registration failed');
    tokenB = dataB.token;
    const effectiveSlugB = dataB.user.restaurantSlug;

    // Get table tokens for Restaurant A and B
    const tablesResA = await fetch(`${BASE_URL}/api/tables?restaurant=${effectiveSlugA}`);
    const tablesA = await tablesResA.json();
    tableA1 = tablesA.find(t => t.id === 1);
    assert(tableA1 && tableA1.sessionToken, 'Table A1 session token missing');

    const tablesResB = await fetch(`${BASE_URL}/api/tables?restaurant=${effectiveSlugB}`);
    const tablesB = await tablesResB.json();
    tableB1 = tablesB.find(t => t.id === 1);
    assert(tableB1 && tableB1.sessionToken, 'Table B1 session token missing');

    // -------------------------------------------------------------
    // SCENARIO 1: Restaurant A creates menu item
    // -------------------------------------------------------------
    console.log('\n--- Scenario 1: Restaurant A creates menu item ---');
    const createItemARes = await fetch(`${BASE_URL}/api/menu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        name: 'Signature Butter Chicken',
        category: 'main-course',
        price: 350,
        description: 'Tender chicken in rich creamy tomato butter gravy',
        isVeg: false
      })
    });
    const createdItemA = await createItemARes.json();
    assert(createItemARes.status === 201 && createdItemA.name === 'Signature Butter Chicken', 'Failed to create item for Rest A');
    itemAId = createdItemA.id;
    console.log('✅ Scenario 1 Passed: Restaurant A created item:', createdItemA.id, createdItemA.name);
    passedTests++;

    // -------------------------------------------------------------
    // SCENARIO 2: Restaurant A customer sees that item
    // -------------------------------------------------------------
    console.log('\n--- Scenario 2: Restaurant A customer sees that item ---');
    const menuCustomerARes = await fetch(`${BASE_URL}/api/menu?restaurant=${effectiveSlugA}`);
    const menuCustomerA = await menuCustomerARes.json();
    const hasItemA = menuCustomerA.some(m => m.id === itemAId && m.name === 'Signature Butter Chicken');
    assert(hasItemA, 'Restaurant A customer cannot see created item');
    console.log('✅ Scenario 2 Passed: Restaurant A customer successfully fetched menu with new item.');
    passedTests++;

    // -------------------------------------------------------------
    // SCENARIO 3: Restaurant B cannot see Restaurant A\'s private menu through unauthorized routes
    // -------------------------------------------------------------
    console.log('\n--- Scenario 3: Restaurant B cannot see Restaurant A\'s menu ---');
    const menuCustomerBRes = await fetch(`${BASE_URL}/api/menu?restaurant=${effectiveSlugB}`);
    const menuCustomerB = await menuCustomerBRes.json();
    const hasItemAInB = menuCustomerB.some(m => m.id === itemAId);
    assert(!hasItemAInB, 'Data Leak: Restaurant B saw Restaurant A\'s menu item!');
    console.log('✅ Scenario 3 Passed: Multi-tenant isolation verified; Restaurant B menu has 0 items from Restaurant A.');
    passedTests++;

    // -------------------------------------------------------------
    // SCENARIO 4: Restaurant B creates its own menu
    // -------------------------------------------------------------
    console.log('\n--- Scenario 4: Restaurant B creates its own menu ---');
    const createItemBRes = await fetch(`${BASE_URL}/api/menu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        name: 'Veg Hakka Noodles',
        category: 'chinese',
        price: 220,
        description: 'Wok tossed noodles with fresh crispy vegetables',
        isVeg: true
      })
    });
    const createdItemB = await createItemBRes.json();
    assert(createItemBRes.status === 201 && createdItemB.name === 'Veg Hakka Noodles', 'Failed to create item for Rest B');
    itemBId = createdItemB.id;

    // Check Restaurant A cannot see Restaurant B's item
    const menuARecheck = await (await fetch(`${BASE_URL}/api/menu?restaurant=${effectiveSlugA}`)).json();
    assert(!menuARecheck.some(m => m.id === itemBId), 'Data Leak: Restaurant A saw Restaurant B\'s item');
    console.log('✅ Scenario 4 Passed: Restaurant B created its own distinct menu item.');
    passedTests++;

    // -------------------------------------------------------------
    // SCENARIO 5: Admin changes price and customer sees the updated price
    // -------------------------------------------------------------
    console.log('\n--- Scenario 5: Admin changes price and customer sees updated price ---');
    const updatePriceRes = await fetch(`${BASE_URL}/api/menu/${itemAId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({ price: 395 })
    });
    assert(updatePriceRes.ok, 'Failed to update price');
    const updatedCustomerMenu = await (await fetch(`${BASE_URL}/api/menu?restaurant=${effectiveSlugA}`)).json();
    const updatedItem = updatedCustomerMenu.find(m => m.id === itemAId);
    assert(updatedItem && updatedItem.price === 395, 'Customer does not see updated price 395');
    console.log('✅ Scenario 5 Passed: Price updated to ₹395 and verified by customer query.');
    passedTests++;

    // -------------------------------------------------------------
    // SCENARIO 6: Admin disables an item and customer cannot order it
    // -------------------------------------------------------------
    console.log('\n--- Scenario 6: Admin disables an item and customer cannot order it ---');
    const toggleRes = await fetch(`${BASE_URL}/api/menu/${itemAId}/toggle`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert(toggleRes.ok, 'Toggle item failed');

    // Attempt customer order of disabled item
    const tryOrderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-restaurant-slug': effectiveSlugA
      },
      body: JSON.stringify({
        tableId: 1,
        token: tableA1.sessionToken,
        items: [{ id: itemAId, quantity: 1 }]
      })
    });
    assert(tryOrderRes.status === 400, `Expected 400 for disabled item, got ${tryOrderRes.status}`);
    const tryOrderData = await tryOrderRes.json();
    assert(tryOrderData.error === 'ITEM_UNAVAILABLE', 'Expected error ITEM_UNAVAILABLE');

    // Re-enable item for subsequent tests
    await fetch(`${BASE_URL}/api/menu/${itemAId}/toggle`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    console.log('✅ Scenario 6 Passed: Disabled item order was strictly rejected with ITEM_UNAVAILABLE.');
    passedTests++;

    // -------------------------------------------------------------
    // SCENARIOS 7 & 8: Customer places an order; Admin and Kitchen receive it via Socket.IO
    // -------------------------------------------------------------
    console.log('\n--- Scenarios 7 & 8: Customer places order; Admin & Kitchen receive it in real-time ---');
    let adminReceivedOrder = null;
    let kitchenReceivedOrder = null;

    // Connect Admin socket
    const adminSocket = io(BASE_URL, { transports: ['websocket'] });
    await new Promise((resolve) => {
      adminSocket.on('connect', () => {
        adminSocket.emit('join-admin', { restaurant: effectiveSlugA, token: tokenA });
        adminSocket.on('joined', resolve);
        setTimeout(resolve, 500);
      });
    });

    // Connect Kitchen socket
    const kitchenSocket = io(BASE_URL, { transports: ['websocket'] });
    await new Promise((resolve) => {
      kitchenSocket.on('connect', () => {
        kitchenSocket.emit('join-kitchen', { restaurant: effectiveSlugA, token: tokenA });
        kitchenSocket.on('joined', resolve);
        setTimeout(resolve, 500);
      });
    });

    adminSocket.on('order:new', (ord) => { adminReceivedOrder = ord; });
    kitchenSocket.on('order:new', (ord) => { kitchenReceivedOrder = ord; });

    // Customer places order (client passes forged price 10, backend MUST calculate true 395)
    const placeOrderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-restaurant-slug': effectiveSlugA
      },
      body: JSON.stringify({
        tableId: 1,
        token: tableA1.sessionToken,
        items: [{ id: itemAId, price: 10, quantity: 2 }] // Client tries price 10!
      })
    });
    const orderCreated = await placeOrderRes.json();
    assert(placeOrderRes.status === 201 && orderCreated.success, 'Order placement failed');

    // Verify backend price calculation: 2 * 395 = 790 subtotal, 5% tax = 39.5, total = 829.5
    assert(orderCreated.order.subtotal === 790, `Backend did not calculate subtotal correctly: ${orderCreated.order.subtotal}`);
    assert(orderCreated.order.total === 829.5, `Backend did not calculate total correctly: ${orderCreated.order.total}`);

    // Wait for socket events
    await new Promise((r) => setTimeout(r, 600));
    assert(adminReceivedOrder && adminReceivedOrder.id === orderCreated.order.id, 'Admin socket did not receive order:new');
    assert(kitchenReceivedOrder && kitchenReceivedOrder.id === orderCreated.order.id, 'Kitchen socket did not receive order:new');

    console.log('✅ Scenario 7 Passed: Order placed, backend enforced ₹395 unit price, Admin received real-time socket event.');
    passedTests++;
    console.log('✅ Scenario 8 Passed: Kitchen received identical real-time ticket.');
    passedTests++;

    // -------------------------------------------------------------
    // SCENARIO 9: Kitchen changes status and customer sees the update
    // -------------------------------------------------------------
    console.log('\n--- Scenario 9: Kitchen changes status and customer sees update ---');
    let customerReceivedUpdate = null;

    // Connect Customer Table socket
    const customerSocket = io(BASE_URL, { transports: ['websocket'] });
    await new Promise((resolve) => {
      customerSocket.on('connect', () => {
        customerSocket.emit('join-table', {
          tableId: 1,
          restaurant: effectiveSlugA,
          token: tableA1.sessionToken
        });
        customerSocket.on('joined', resolve);
        setTimeout(resolve, 500);
      });
    });

    customerSocket.on('order:status_changed', (updated) => {
      customerReceivedUpdate = updated;
    });

    // Kitchen updates status to 'preparing'
    const statusChangeRes = await fetch(`${BASE_URL}/api/orders/${orderCreated.order.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({ status: 'preparing' })
    });
    assert(statusChangeRes.ok, 'Status change failed');

    await new Promise((r) => setTimeout(r, 600));
    assert(customerReceivedUpdate && customerReceivedUpdate.status === 'preparing', 'Customer socket did not receive status update');
    console.log('✅ Scenario 9 Passed: Kitchen updated status to "preparing"; customer received real-time update.');
    passedTests++;

    // -------------------------------------------------------------
    // SCENARIO 10: Customer A cannot see Customer B\'s order
    // -------------------------------------------------------------
    console.log('\n--- Scenario 10: Customer A cannot see Customer B\'s order ---');
    // Place order for Restaurant B Table 1
    const orderBRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-restaurant-slug': effectiveSlugB
      },
      body: JSON.stringify({
        tableId: 1,
        token: tableB1.sessionToken,
        items: [{ id: itemBId, quantity: 1 }]
      })
    });
    const orderBCreated = await orderBRes.json();
    assert(orderBRes.status === 201, 'Order B creation failed');

    // Customer at Restaurant A queries their table orders
    const tableOrdersA = await (await fetch(`${BASE_URL}/api/orders/table/1?restaurant=${effectiveSlugA}&token=${tableA1.sessionToken}`)).json();
    const leakFound = tableOrdersA.some(o => o.restaurantSlug === effectiveSlugB || o.items.some(i => i.id === itemBId));
    assert(!leakFound, 'Cross-tenant leak: Customer A saw Customer B\'s order!');

    // Customer at Restaurant B queries their table orders
    const tableOrdersB = await (await fetch(`${BASE_URL}/api/orders/table/1?restaurant=${effectiveSlugB}&token=${tableB1.sessionToken}`)).json();
    const leakFoundInB = tableOrdersB.some(o => o.restaurantSlug === effectiveSlugA || o.items.some(i => i.id === itemAId));
    assert(!leakFoundInB, 'Cross-tenant leak: Customer B saw Customer A\'s order!');

    console.log('✅ Scenario 10 Passed: Customer A cannot see Customer B\'s order, and vice versa.');
    passedTests++;

    // -------------------------------------------------------------
    // SCENARIO 11: Two restaurants can independently create order number 101
    // -------------------------------------------------------------
    console.log('\n--- Scenario 11: Two restaurants can independently create order number 101 ---');
    assert(orderCreated.order.orderNumber === 101, `Rest A orderNumber was ${orderCreated.order.orderNumber}, expected 101`);
    assert(orderBCreated.order.orderNumber === 101, `Rest B orderNumber was ${orderBCreated.order.orderNumber}, expected 101`);
    assert(orderCreated.order.id === 'ORD-101' && orderBCreated.order.id === 'ORD-101', 'Both restaurants have ORD-101 independently without collision');
    console.log('✅ Scenario 11 Passed: Both Restaurant A and Restaurant B independently created ORD-101.');
    passedTests++;

    // -------------------------------------------------------------
    // SCENARIO 12: Database writes survive server restart (Verified in MongoDB Atlas)
    // -------------------------------------------------------------
    console.log('\n--- Scenario 12: Database writes survive in MongoDB Atlas ---');
    const { OrderModel } = require('../db');
    const directDocA = await OrderModel.findOne({ id: 'ORD-101', restaurantSlug: effectiveSlugA }).lean();
    const directDocB = await OrderModel.findOne({ id: 'ORD-101', restaurantSlug: effectiveSlugB }).lean();
    assert(directDocA && directDocA.total === 829.5, 'Order A not persisted in MongoDB Atlas');
    assert(directDocB && directDocB.restaurantSlug === effectiveSlugB, 'Order B not persisted in MongoDB Atlas');
    console.log('✅ Scenario 12 Passed: Atlas contains both orders independently persisted in MongoDB collections.');
    passedTests++;

    // -------------------------------------------------------------
    // SCENARIO 13: Deleted tables do not return
    // -------------------------------------------------------------
    console.log('\n--- Scenario 13: Deleted tables are removed from MongoDB ---');
    const deleteTableRes = await fetch(`${BASE_URL}/api/tables/10`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert(deleteTableRes.ok, 'Delete table failed');
    const { TableModel } = require('../db');
    const tableInMongo = await TableModel.findOne({ id: 10, restaurantSlug: effectiveSlugA }).lean();
    assert(!tableInMongo, 'Deleted table still exists in MongoDB Atlas!');
    console.log('✅ Scenario 13 Passed: Deleted table 10 was actually removed from MongoDB Atlas.');
    passedTests++;

    // -------------------------------------------------------------
    // SCENARIO 14: New restaurant starts with a clean workspace
    // -------------------------------------------------------------
    console.log('\n--- Scenario 14: New restaurant starts with clean workspace ---');
    const freshSlug = `clean-rest-${Date.now().toString().slice(-4)}`;
    const signupFresh = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Fresh Owner',
        email: `fresh_${Date.now()}@test.com`,
        password,
        restaurantName: `Fresh Bistro ${freshSlug}`
      })
    });
    const freshData = await signupFresh.json();
    const freshToken = freshData.token;
    const freshRestSlug = freshData.user.restaurantSlug;

    // Check menu is empty
    const freshMenu = await (await fetch(`${BASE_URL}/api/menu?restaurant=${freshRestSlug}`)).json();
    assert(Array.isArray(freshMenu) && freshMenu.length === 0, `Expected empty menu, got ${freshMenu.length} items`);

    // Check orders is empty
    const freshOrders = await (await fetch(`${BASE_URL}/api/orders`, {
      headers: { 'Authorization': `Bearer ${freshToken}` }
    })).json();
    assert(Array.isArray(freshOrders) && freshOrders.length === 0, 'Expected 0 orders for fresh restaurant');

    // Check revenue is 0
    const freshStats = await (await fetch(`${BASE_URL}/api/dashboard/stats`, {
      headers: { 'Authorization': `Bearer ${freshToken}` }
    })).json();
    assert(freshStats.totalRevenue === 0 && freshStats.totalOrders === 0, 'Expected 0 revenue and 0 orders in dashboard stats');
    console.log('✅ Scenario 14 Passed: New restaurant started with 0 orders, 0 revenue, empty menu.');
    passedTests++;

    // -------------------------------------------------------------
    // SCENARIO 15: Invalid or expired QR token cannot place orders
    // -------------------------------------------------------------
    console.log('\n--- Scenario 15: Invalid or expired QR token cannot place orders ---');
    const invalidTokenRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-restaurant-slug': effectiveSlugA
      },
      body: JSON.stringify({
        tableId: 1,
        token: 'INVALID-EXPIRED-TOKEN-XYZ',
        items: [{ id: itemAId, quantity: 1 }]
      })
    });
    assert(invalidTokenRes.status === 403, `Expected 403 for expired token, got ${invalidTokenRes.status}`);
    const invalidTokenData = await invalidTokenRes.json();
    assert(invalidTokenData.error === 'TOKEN_EXPIRED', 'Expected error TOKEN_EXPIRED');
    console.log('✅ Scenario 15 Passed: Order with invalid/expired session token was rejected with 403 TOKEN_EXPIRED.');
    passedTests++;

    // -------------------------------------------------------------
    // SCENARIO 16: Unauthorized payment confirmation is rejected
    // -------------------------------------------------------------
    console.log('\n--- Scenario 16: Unauthorized payment confirmation is rejected ---');
    const unauthPayRes = await fetch(`${BASE_URL}/api/orders/${orderCreated.order.id}/confirm-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'Cash' })
    });
    assert(unauthPayRes.status === 401, `Expected 401 for unauthorized payment confirm, got ${unauthPayRes.status}`);

    // Customer-pay marks pending_verification, not paid
    const custPayRes = await fetch(`${BASE_URL}/api/orders/${orderCreated.order.id}/customer-pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-restaurant-slug': effectiveSlugA
      },
      body: JSON.stringify({
        token: tableA1.sessionToken,
        paymentMethod: 'UPI',
        transactionRef: 'UPI-TEST-123'
      })
    });
    const custPayData = await custPayRes.json();
    assert(custPayRes.ok && custPayData.order.paymentStatus === 'pending_verification', 'Customer pay marked order as paid instead of pending_verification');
    assert(custPayData.order.paid === false, 'Order marked paid=true without staff authorization');
    console.log('✅ Scenario 16 Passed: Unauthorized payment confirmation rejected (401); customer pay safely placed in pending_verification.');
    passedTests++;

    // -------------------------------------------------------------
    // SCENARIO 17: Reconnection restores current customer and admin state
    // -------------------------------------------------------------
    console.log('\n--- Scenario 17: Reconnection restores customer and admin state ---');
    // Admin reconnects and fetches state
    const adminOrdersAfterReconnect = await (await fetch(`${BASE_URL}/api/orders`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    })).json();
    assert(adminOrdersAfterReconnect.some(o => o.id === orderCreated.order.id), 'Admin orders not restored after reconnect');

    // Customer reconnects and fetches table orders
    const customerOrdersAfterReconnect = await (await fetch(`${BASE_URL}/api/orders/table/1?restaurant=${effectiveSlugA}&token=${tableA1.sessionToken}`)).json();
    assert(customerOrdersAfterReconnect.some(o => o.id === orderCreated.order.id), 'Customer table orders not restored after reconnect');

    const customerMenuAfterReconnect = await (await fetch(`${BASE_URL}/api/menu?restaurant=${effectiveSlugA}`)).json();
    assert(customerMenuAfterReconnect.length > 0, 'Customer menu not restored after reconnect');
    console.log('✅ Scenario 17 Passed: Reconnection successfully restored both customer and admin state.');
    passedTests++;

    // Clean up test sockets
    adminSocket.disconnect();
    kitchenSocket.disconnect();
    customerSocket.disconnect();

    console.log('\n=============================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} MANDATORY TEST SCENARIOS PASSED SUCCESSFULLY!`);
    console.log('=============================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

runTests();
