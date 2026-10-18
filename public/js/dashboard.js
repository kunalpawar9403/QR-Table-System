// Master Executive Restaurant Dashboard Logic with Menu CRUD
document.addEventListener('DOMContentLoaded', () => {
  // Global State
  let orders = [];
  let tables = [];
  let menu = [];
  let serviceCalls = [];
  let activeTab = 'overview';
  let kitchenFilter = 'active';
  let menuCategoryFilter = 'all';
  let selectedStandTable = 3;
  let serverInfo = { localIp: 'localhost', port: 3000 };
  let pendingDeleteId = null;

  // DOM Elements
  const kdsBoard = document.getElementById('dashKdsBoard');
  const dashTablesGrid = document.getElementById('dashTablesGrid');
  const dashOrdersList = document.getElementById('dashOrdersList');
  const dashMenuList = document.getElementById('dashMenuList');
  const kpiRevenue = document.getElementById('kpiRevenue');
  const kpiOrders = document.getElementById('kpiOrders');
  const kpiOccupancy = document.getElementById('kpiOccupancy');
  const kpiAvgTicket = document.getElementById('kpiAvgTicket');
  const liveClock = document.getElementById('liveClock');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const kitchenBadgeCount = document.getElementById('kitchenBadgeCount');
  const overviewKdsStream = document.getElementById('overviewKdsStream');
  const overviewTablesMiniGrid = document.getElementById('overviewTablesMiniGrid');
  const dashSearchInput = document.getElementById('dashSearchInput');
  const headerAlertsBell = document.getElementById('headerAlertsBell');
  const serviceAlertsCount = document.getElementById('serviceAlertsCount');
  const serviceAlertsDropdown = document.getElementById('serviceAlertsDropdown');
  const serviceAlertsDropdownList = document.getElementById('serviceAlertsDropdownList');
  const serviceAlertFloatingBanner = document.getElementById('serviceAlertFloatingBanner');

  // Professional SVG Icons Library
  const ICONS = {
    water: `<svg class="svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
    bill: `<svg class="svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
    waiter: `<svg class="svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    print: `<svg class="svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`,
    edit: `<svg class="svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    mobile: `<svg class="svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
    trash: `<svg class="svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    check: `<svg class="svg-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    clock: `<svg class="svg-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    soundActive: `<svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    soundMuted: `<svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/></svg>`
  };

  // Clock
  function updateClock() {
    const now = new Date();
    if (liveClock) {
      liveClock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  // Socket.io Connection
  const socket = typeof io !== 'undefined' ? io() : null;
  if (socket) {
    socket.emit('join', { role: 'kitchen' });
    socket.emit('join', { role: 'admin' });

    socket.on('order:new', (newOrder) => {
      if (window.soundManager) window.soundManager.playNewOrderChime();
      orders = orders.filter(o => o.id !== newOrder.id);
      orders.unshift(newOrder);
      refreshAllViews();
      showToast(`New Order #${newOrder.orderNumber} from ${newOrder.tableName}`, 'success');
    });

    socket.on('order:status_changed', (updated) => {
      const idx = orders.findIndex(o => o.id === updated.id);
      if (idx !== -1) {
        orders[idx] = updated;
        refreshAllViews();
      }
    });

    socket.on('service:call', (call) => {
      if (window.soundManager) window.soundManager.playServiceBell();
      const exists = serviceCalls.some(c => c.id === call.id);
      if (!exists) {
        serviceCalls.unshift(call);
      }
      renderServiceAlerts();
      if (typeof window.showFloatingServiceBanner === 'function') {
        window.showFloatingServiceBanner(call);
      }
      if (typeof window.showToast === 'function') {
        window.showToast(`${call.tableName}: ${call.type.toUpperCase()}`, 'warning');
      }
      // Browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`${call.tableName} - ${call.type}`, {
            body: `Customer at ${call.tableName} requested ${call.type}! Tap to view.`
          });
        } catch(e) {}
      }
      renderTablesFloor();
      renderOverviewPanels();
    });

    socket.on('service:updated', (updatedCalls) => {
      serviceCalls = updatedCalls || [];
      renderServiceAlerts();
      renderTablesFloor();
      renderOverviewPanels();
    });

    socket.on('menu:updated', (newMenu) => {
      menu = newMenu;
      renderMenuCRUD();
    });

    socket.on('tables:updated', (newTables) => {
      tables = newTables;
      renderKPIs();
      renderOverviewPanels();
      renderTablesFloor();
    });

    socket.on('table:status_changed', () => {
      loadAllData();
    });
  }

  // Sound Toggle
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      const isMuted = window.soundManager.toggleMute();
      if (isMuted) {
        soundToggleBtn.classList.add('muted');
        soundToggleBtn.innerHTML = `${ICONS.soundMuted} <span>Sound Off</span>`;
      } else {
        soundToggleBtn.classList.remove('muted');
        soundToggleBtn.innerHTML = `${ICONS.soundActive} <span>Sound Active</span>`;
        window.soundManager.playNewOrderChime();
      }
    });
  }

  // Global Tab Switcher (Desktop Sidebar + Mobile Bottom Navigation)
  window.switchTab = function(tabName) {
    activeTab = tabName;

    document.querySelectorAll('.nav-item-btn, .mobile-nav-btn').forEach(btn => {
      if (btn.dataset.tab === tabName) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.remove('active');
    });

    const targetPanel = document.getElementById(`panel-${tabName}`);
    if (targetPanel) {
      targetPanel.classList.add('active');
      const canvas = document.querySelector('.dash-content-canvas');
      if (canvas) canvas.scrollTop = 0;
    }

    if (window.closeMobileSidebar) window.closeMobileSidebar();
  };

  document.querySelectorAll('.nav-item-btn, .mobile-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab) switchTab(tab);
    });
  });

  // Mobile Sidebar & Quick Actions Controls
  window.toggleMobileSidebar = function() {
    const sidebar = document.getElementById('dashSidebar');
    const backdrop = document.getElementById('mobileSidebarBackdrop');
    if (sidebar) {
      const isOpen = sidebar.classList.toggle('mobile-open');
      if (backdrop) backdrop.classList.toggle('active', isOpen);
    }
  };

  window.closeMobileSidebar = function() {
    const sidebar = document.getElementById('dashSidebar');
    const backdrop = document.getElementById('mobileSidebarBackdrop');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.remove('active');
  };

  window.toggleQuickActionsSheet = function() {
    const sheet = document.getElementById('mobileQuickActionSheet');
    const backdrop = document.getElementById('mobileQuickActionBackdrop');
    if (sheet) {
      const isOpen = sheet.classList.toggle('active');
      if (backdrop) backdrop.classList.toggle('active', isOpen);
    }
  };

  window.closeQuickActionsSheet = function() {
    const sheet = document.getElementById('mobileQuickActionSheet');
    const backdrop = document.getElementById('mobileQuickActionBackdrop');
    if (sheet) sheet.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
  };

  // Kitchen Filter Tabs
  document.querySelectorAll('.kds-filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.kds-filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      kitchenFilter = btn.dataset.filter;
      renderKitchenBoard();
    });
  });

  // Search input filter
  if (dashSearchInput) {
    dashSearchInput.addEventListener('input', () => {
      const term = dashSearchInput.value.toLowerCase().trim();
      if (!term) {
        renderOrdersAudit();
        return;
      }
      const filtered = orders.filter(o => 
        o.tableName.toLowerCase().includes(term) ||
        o.orderNumber.toString().includes(term) ||
        o.items.some(i => i.name.toLowerCase().includes(term))
      );
      renderOrdersAudit(filtered);
    });
  }

  // Load Initial Data
  loadAllData();

  async function loadAllData() {
    try {
      const [infoRes, tablesRes, ordersRes, menuRes, serviceRes] = await Promise.all([
        fetch('/api/info'),
        fetch('/api/tables'),
        fetch('/api/orders'),
        fetch('/api/menu'),
        fetch('/api/service-calls').catch(() => null)
      ]);

      serverInfo = await infoRes.json();
      tables = await tablesRes.json();
      orders = await ordersRes.json();
      menu = await menuRes.json();
      if (serviceRes && serviceRes.ok) {
        serviceCalls = await serviceRes.json();
      } else {
        serviceCalls = [];
      }

      renderServiceAlerts();
      refreshAllViews();
      loadStandPreview(selectedStandTable);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }

  // Automatic live sync polling (vital for Vercel & serverless environments where WebSockets cannot persist)
  setInterval(async () => {
    try {
      const [tablesRes, ordersRes, serviceRes] = await Promise.all([
        fetch('/api/tables'),
        fetch('/api/orders'),
        fetch('/api/service-calls').catch(() => null)
      ]);

      if (ordersRes && ordersRes.ok) {
        const latestOrders = await ordersRes.json();
        if (latestOrders.length > orders.length) {
          if (window.soundManager) window.soundManager.playNewOrderChime();
          const newest = latestOrders[0];
          showToast(`New Order #${newest?.orderNumber} from ${newest?.tableName}`, 'success');
        }
        orders = latestOrders;
      }

      if (tablesRes && tablesRes.ok) {
        tables = await tablesRes.json();
      }

      if (serviceRes && serviceRes.ok) {
        const latestCalls = await serviceRes.json();
        if (latestCalls.length > serviceCalls.length) {
          if (window.soundManager) window.soundManager.playServiceBell();
          const newCall = latestCalls[0];
          if (typeof window.showFloatingServiceBanner === 'function') {
            window.showFloatingServiceBanner(newCall);
          }
        }
        serviceCalls = latestCalls;
        renderServiceAlerts();
      }

      refreshAllViews();
    } catch (e) {}
  }, 3000);

  function refreshAllViews() {
    renderKPIs();
    renderOverviewPanels();
    renderKitchenBoard();
    renderTablesFloor();
    renderOrdersAudit();
    renderMenuCRUD();
  }

  // 1. KPI Cards
  function renderKPIs() {
    const totalRev = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const count = orders.length;
    const occupiedCount = tables.filter(t => t.currentStatus === 'occupied').length;
    const avg = count > 0 ? (totalRev / count) : 0;
    const activeKitchenOrders = orders.filter(o => ['new', 'preparing', 'ready'].includes(o.status));

    if (kpiRevenue) kpiRevenue.textContent = `₹${totalRev.toFixed(2)}`;
    if (kpiOrders) kpiOrders.textContent = count;
    if (kpiOccupancy) kpiOccupancy.textContent = `${occupiedCount} / ${tables.length}`;
    if (kpiAvgTicket) kpiAvgTicket.textContent = `₹${avg.toFixed(2)}`;
    
    // Sync kitchen active badges on both desktop sidebar and mobile bottom nav
    document.querySelectorAll('.kitchen-badge-count').forEach(el => {
      el.textContent = `${activeKitchenOrders.length}`;
      if (activeKitchenOrders.length > 0) {
        el.style.display = 'inline-flex';
      } else {
        el.style.display = 'none';
      }
    });
  }

  // 2. Overview Live Stream & Mini Grid (Matching Reference Image)
  function renderOverviewPanels() {
    // Dynamic greeting based on time of day
    const hour = new Date().getHours();
    const greetingEl = document.getElementById('overviewGreeting');
    if (greetingEl) {
      if (hour < 12) greetingEl.textContent = 'Good Morning!';
      else if (hour < 17) greetingEl.textContent = 'Good Afternoon!';
      else greetingEl.textContent = 'Good Evening!';
    }

    if (overviewKdsStream) {
      const activeTickets = orders.filter(o => ['new', 'preparing', 'ready'].includes(o.status)).slice(0, 5);
      if (activeTickets.length === 0) {
        overviewKdsStream.innerHTML = `
          <div style="text-align:center; padding:24px 10px; color:#64748b; width:100%;">
            <p style="font-weight:600; font-size:13px;">All kitchen orders are cleared!</p>
          </div>
        `;
      } else {
        overviewKdsStream.innerHTML = activeTickets.map(order => {
          const itemCount = order.items.reduce((sum, i) => sum + (i.quantity || 1), 0);
          const mins = Math.max(1, Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000));
          const isReady = order.status === 'ready';
          const isPrep = order.status === 'preparing';
          const btnClass = isReady ? 'ready' : isPrep ? 'cooking' : 'preparing';
          const btnText = isReady ? 'Ready' : isPrep ? 'Cooking' : 'Preparing';

          return `
            <div class="mini-ticket-chip" onclick="switchTab('kitchen')">
              <div>
                <div class="mini-ticket-number">#${order.orderNumber}</div>
                <div class="mini-ticket-sub">${itemCount} Items • ${mins} mins</div>
              </div>
              <button class="mini-btn-status ${btnClass}">
                ${btnText}
              </button>
            </div>
          `;
        }).join('');
      }
    }

    if (overviewTablesMiniGrid) {
      overviewTablesMiniGrid.innerHTML = tables.slice(0, 10).map(t => {
        const isOccupied = t.currentStatus === 'occupied';
        const hasCall = serviceCalls.some(c => c.tableId === t.id);
        const shortName = t.name.startsWith('Table ') ? `T${t.name.replace('Table ', '')}` : t.name;
        return `
          <div class="mini-table-cell ${isOccupied ? 'occupied' : ''} ${hasCall ? 'has-service-alert' : ''}" onclick="switchTab('tables'); selectAndShowStand(${t.id});" style="${hasCall ? 'border: 2px solid #ef4444; background: #fff1f2;' : ''}">
            <div class="mini-table-name">${shortName} ${hasCall ? '<span class="status-indicator-dot occupied" style="margin-left:3px;"></span>' : ''}</div>
            <div class="mini-table-status" style="${hasCall ? 'color: #e11d48; font-weight:800;' : ''}">${hasCall ? 'CALLING' : isOccupied ? 'Occupied' : 'Vacant'}</div>
          </div>
        `;
      }).join('');
    }
  }

  // 3. Kitchen Display Board (3 Columns Matching Reference Image)
  function renderKitchenBoard() {
    if (!kdsBoard) return;

    let targetOrders = orders;
    if (kitchenFilter === 'active') {
      targetOrders = orders.filter(o => ['new', 'preparing', 'ready'].includes(o.status));
    } else if (kitchenFilter !== 'all') {
      targetOrders = orders.filter(o => o.status === kitchenFilter);
    }

    const newOrders = targetOrders.filter(o => o.status === 'new');
    const cookingOrders = targetOrders.filter(o => o.status === 'preparing');
    const readyOrders = targetOrders.filter(o => o.status === 'ready');

    kdsBoard.innerHTML = `
      <!-- Column 1: New Orders (Red Accent) -->
      <div class="kds-column">
        <div class="kds-column-header new">
          <span style="display:inline-flex; align-items:center; gap:6px;"><span class="status-indicator-dot occupied"></span> NEW ORDERS</span>
          <span>${newOrders.length}</span>
        </div>
        ${newOrders.length === 0 
          ? `<div style="text-align:center; padding:30px 10px; color:#94a3b8; font-size:12px; background:#fff; border-radius:10px; border:1px dashed #e2e8f0;">No new orders</div>` 
          : newOrders.map(order => renderKdsTicketCard(order, 'new')).join('')
        }
      </div>

      <!-- Column 2: Cooking (Orange Accent) -->
      <div class="kds-column">
        <div class="kds-column-header cooking">
          <span style="display:inline-flex; align-items:center; gap:6px;"><span class="status-indicator-dot" style="background:#f59e0b;"></span> COOKING</span>
          <span>${cookingOrders.length}</span>
        </div>
        ${cookingOrders.length === 0 
          ? `<div style="text-align:center; padding:30px 10px; color:#94a3b8; font-size:12px; background:#fff; border-radius:10px; border:1px dashed #e2e8f0;">No cooking orders</div>` 
          : cookingOrders.map(order => renderKdsTicketCard(order, 'cooking')).join('')
        }
      </div>

      <!-- Column 3: Ready (Green Accent) -->
      <div class="kds-column">
        <div class="kds-column-header ready">
          <span style="display:inline-flex; align-items:center; gap:6px;"><span class="status-indicator-dot vacant"></span> READY</span>
          <span>${readyOrders.length}</span>
        </div>
        ${readyOrders.length === 0 
          ? `<div style="text-align:center; padding:30px 10px; color:#94a3b8; font-size:12px; background:#fff; border-radius:10px; border:1px dashed #e2e8f0;">No ready orders</div>` 
          : readyOrders.map(order => renderKdsTicketCard(order, 'ready')).join('')
        }
      </div>
    `;
  }

  function renderKdsTicketCard(order, colType) {
    const mins = Math.max(1, Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000));
    const itemCount = order.items.reduce((sum, i) => sum + (i.quantity || 1), 0);

    return `
      <div class="kds-ticket-card" id="ticket-${order.id}">
        <div class="kds-ticket-top">
          <div>
            <div class="kds-ticket-id">#${order.orderNumber}</div>
            <div class="kds-ticket-table">${order.tableName}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px; font-weight:700; color:#64748b;">${itemCount} Items • ${mins} mins</div>
          </div>
        </div>

        <div class="kds-ticket-items">
          ${order.items.map(item => `
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span>• ${item.quantity}x ${item.name}</span>
            </div>
          `).join('')}
        </div>

        <div>
          ${colType === 'new' 
            ? `<button class="kds-action-btn btn-start" onclick="updateOrderStatus('${order.id}', 'preparing')">Start Cooking</button>`
            : colType === 'cooking'
            ? `<button class="kds-action-btn btn-ready" onclick="updateOrderStatus('${order.id}', 'ready')">Mark Ready</button>`
            : `<button class="kds-action-btn btn-serve" onclick="updateOrderStatus('${order.id}', 'served')">Mark Served</button>`
          }
        </div>
      </div>
    `;
  }

  window.setKdsFilter = function(filter, btnEl) {
    kitchenFilter = filter;
    document.querySelectorAll('.kds-filter-tab').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    renderKitchenBoard();
  };

  window.updateOrderStatus = async function(orderId, nextStatus) {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        const idx = orders.findIndex(o => o.id === updated.id);
        if (idx !== -1) orders[idx] = updated;
        refreshAllViews();
        if (nextStatus === 'ready' && window.soundManager) {
          window.soundManager.playOrderReady();
        }
      }
    } catch(err) {
      console.error(err);
    }
  };

  window.printKOT = function(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const printWin = window.open('', '', 'width=380,height=520');
    printWin.document.write(`
      <html><head><title>KOT #${order.orderNumber} - ${order.tableName}</title></head>
      <body style="font-family:monospace; padding:20px; font-size:14px;">
        <h3 style="text-align:center;">SPICE GARDEN - KITCHEN ORDER TICKET</h3>
        <p style="text-align:center;">${order.tableName} | ORDER #${order.orderNumber}</p>
        <p style="text-align:center;">${new Date(order.createdAt).toLocaleTimeString()}</p>
        <hr style="border-top:1px dashed #000;">
        ${order.items.map(i => `<p><strong>${i.quantity}x</strong> ${i.name} ${i.options.length ? `(${i.options.join(', ')})` : ''}</p>`).join('')}
        ${order.notes ? `<hr style="border-top:1px dashed #000;"><p>NOTE: ${order.notes}</p>` : ''}
        <hr style="border-top:1px dashed #000;">
        <p style="text-align:center; font-weight:bold;">*** END ***</p>
        <script>window.print(); setTimeout(() => window.close(), 500);</script>
      </body></html>
    `);
    printWin.document.close();
  };

  // State for Table Floor Filtering & Deletion
  let tableFloorFilter = 'all';
  let pendingDeleteTableId = null;

  // 4. Tables Floor Map & Acrylic Stand Viewer
  window.filterFloorTables = function(status, btnEl) {
    tableFloorFilter = status;
    document.querySelectorAll('.table-filter-pill').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    renderTablesFloor();
  };

  function renderTablesFloor() {
    if (!dashTablesGrid) return;

    // Update count badges
    const totalCount = tables.length;
    const occupiedCount = tables.filter(t => t.currentStatus === 'occupied').length;
    const vacantCount = tables.filter(t => t.currentStatus !== 'occupied').length;

    const countAllEl = document.getElementById('countAllTables');
    const countOccEl = document.getElementById('countOccupiedTables');
    const countVacEl = document.getElementById('countVacantTables');
    if (countAllEl) countAllEl.textContent = totalCount;
    if (countOccEl) countOccEl.textContent = occupiedCount;
    if (countVacEl) countVacEl.textContent = vacantCount;

    let filtered = tables;
    if (tableFloorFilter === 'occupied') {
      filtered = tables.filter(t => t.currentStatus === 'occupied');
    } else if (tableFloorFilter === 'vacant') {
      filtered = tables.filter(t => t.currentStatus !== 'occupied');
    }

    if (filtered.length === 0) {
      dashTablesGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align:center; padding:50px 20px; color:#64748b;">
          <div class="modal-icon-badge" style="margin:0 auto 12px;">
            <svg class="svg-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>
          </div>
          <p style="font-size:15px; font-weight:600; margin-bottom:10px;">No tables found matching "${tableFloorFilter}".</p>
          <button class="btn btn-primary btn-sm" onclick="openAddTableModal()">+ Add New Table</button>
        </div>
      `;
      return;
    }

    dashTablesGrid.innerHTML = filtered.map(table => {
      const isOccupied = table.currentStatus === 'occupied';
      const isSelected = table.id === selectedStandTable;
      const tableCalls = serviceCalls.filter(c => c.tableId === table.id);
      const hasCalls = tableCalls.length > 0;
      const activeCall = hasCalls ? tableCalls[0] : null;
      const isWater = activeCall && (activeCall.type || '').toLowerCase().includes('water');
      const isBill = activeCall && (activeCall.type || '').toLowerCase().includes('bill');
      const callIcon = isWater ? ICONS.water : isBill ? ICONS.bill : ICONS.waiter;
      const callClass = isWater ? 'type-water' : isBill ? 'type-bill' : 'type-waiter';

      return `
        <div class="dash-table-card ${isOccupied ? 'occupied' : 'vacant'} ${isSelected ? 'selected' : ''}" onclick="selectAndShowStand(${table.id})">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:8px;">
              <span class="dash-table-name" style="font-size:15px; font-weight:800; white-space:nowrap;">${table.name}</span>
              ${isOccupied 
                ? `<span class="badge" style="background:rgba(244,63,94,0.18); color:#f43f5e; border:1px solid rgba(244,63,94,0.3); font-size:9.5px; font-weight:800; display:inline-flex; align-items:center; gap:4px; padding:2px 6px; border-radius:6px; white-space:nowrap;">
                     <span class="pulse-dot-red"></span> OCCUPIED
                   </span>`
                : `<span class="badge" style="background:rgba(16,185,129,0.18); color:#00874e; border:1px solid rgba(16,185,129,0.3); font-size:9.5px; font-weight:800; display:inline-flex; align-items:center; gap:4px; padding:2px 6px; border-radius:6px; white-space:nowrap;">
                     <span class="pulse-dot-green"></span> VACANT
                   </span>`
              }
            </div>

            <div style="font-size:12px; color:#94a3b8; line-height:1.4;">
              <div>${table.section} • ${table.capacity} Guests</div>
              <div style="margin-top:6px; font-weight:600; color:${isOccupied ? '#f43f5e' : '#34d399'}; font-size:11.5px;">
                ${isOccupied 
                  ? `Active: ${table.activeOrdersCount || 1} • Dining` 
                  : 'Cleaned & ready'}
              </div>
            </div>

            ${hasCalls ? `
              <div class="table-card-service-alert ${callClass}">
                <span style="display:inline-flex; align-items:center; gap:4px;">${callIcon} ${activeCall.type}</span>
                <button class="btn-service-mini-done" onclick="event.stopPropagation(); dismissServiceCall('${activeCall.id}')" title="Mark request resolved">
                  Clear
                </button>
              </div>
            ` : ''}
          </div>

          <div>
            <!-- OCCUPANCY CONTROL ACTION -->
            ${isOccupied 
              ? `<button class="btn-table-primary-action btn-table-vacant" onclick="event.stopPropagation(); makeTableVacant(${table.id})" title="Click when customer finishes food to clear table">
                   <span>Clear Table</span>
                 </button>`
              : `<button class="btn-table-primary-action btn-table-occupy" onclick="event.stopPropagation(); markTableOccupied(${table.id})" title="Mark occupied for walk-in guests">
                   <span>Seat Guests</span>
                 </button>`
            }

            <!-- SECONDARY ACTIONS: QR STAND, EDIT, CUSTOMER MENU, DELETE -->
            <div class="table-secondary-actions">
              <button class="btn-table-icon" onclick="event.stopPropagation(); selectAndShowStand(${table.id})" title="View Acrylic Stand">
                ${ICONS.print}
              </button>
              <button class="btn-table-icon" onclick="event.stopPropagation(); openEditTableModal(${table.id})" title="Edit Table Details">
                ${ICONS.edit}
              </button>
              <button class="btn-table-icon" onclick="event.stopPropagation(); window.open('/?table=${table.id}', '_blank')" title="Open Customer Menu">
                ${ICONS.mobile}
              </button>
              <button class="btn-table-icon delete" onclick="event.stopPropagation(); confirmDeleteTable(${table.id})" title="Delete Table">
                ${ICONS.trash}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // MAKE VACANT: Staff marks table vacant after customer completes food
  window.makeTableVacant = async function(tableId) {
    try {
      const res = await fetch(`/api/tables/${tableId}/vacant`, { method: 'PATCH' });
      if (res.ok) {
        const data = await res.json();
        if (window.soundManager) window.soundManager.playReadyChime();
        showToast(`Table ${tableId} is now VACANT and ready for new guests`, 'success');
        await loadData();
      } else {
        showToast('Failed to update table status', 'warning');
      }
    } catch(err) {
      console.error(err);
      showToast('Error updating table status', 'warning');
    }
  };

  // MARK OCCUPIED: Staff seats walk-in guests before QR scan
  window.markTableOccupied = async function(tableId) {
    try {
      const res = await fetch(`/api/tables/${tableId}/occupy`, { method: 'PATCH' });
      if (res.ok) {
        showToast(`Table ${tableId} marked as OCCUPIED`, 'info');
        await loadData();
      } else {
        showToast('Failed to update table status', 'warning');
      }
    } catch(err) {
      console.error(err);
    }
  };

  window.selectAndShowStand = function(tableId) {
    selectedStandTable = tableId;
    renderTablesFloor();
    loadStandPreview(tableId);
  };

  async function loadStandPreview(tableId) {
    const standPreviewTitle = document.getElementById('dashStandTitle');
    const standQrImg = document.getElementById('dashStandQrImg');
    const standUrlLink = document.getElementById('dashStandUrl');
    const standStatusBadge = document.getElementById('dashStandStatusBadge');
    const standQuickActions = document.getElementById('dashStandQuickActions');

    const table = tables.find(t => t.id === tableId) || { id: tableId, name: `Table ${tableId}`, currentStatus: 'vacant' };
    const isOccupied = table.currentStatus === 'occupied';

    if (standPreviewTitle) standPreviewTitle.textContent = (table.name || `TABLE ${tableId}`).toUpperCase();

    if (standStatusBadge) {
      if (isOccupied) {
        standStatusBadge.className = 'badge';
        standStatusBadge.style.cssText = 'background:rgba(244,63,94,0.2); color:#f43f5e; border:1px solid rgba(244,63,94,0.4); font-size:11px; font-weight:800;';
        standStatusBadge.innerHTML = `<span class="pulse-dot-red"></span> OCCUPIED`;
      } else {
        standStatusBadge.className = 'badge';
        standStatusBadge.style.cssText = 'background:rgba(16,185,129,0.2); color:#34d399; border:1px solid rgba(16,185,129,0.4); font-size:11px; font-weight:800;';
        standStatusBadge.innerHTML = `<span class="pulse-dot-green"></span> VACANT / READY`;
      }
    }

    if (standQuickActions) {
      standQuickActions.innerHTML = `
        <div style="display:flex; gap:8px;">
          ${isOccupied 
            ? `<button class="btn btn-primary btn-sm" style="flex:1; background:linear-gradient(135deg, #059669 0%, #10b981 100%); font-size:11px; padding:8px 10px; display:inline-flex; align-items:center; justify-content:center; gap:6px;" onclick="makeTableVacant(${table.id})">
                 <span>Clear Table (Vacant)</span>
               </button>`
            : `<button class="btn btn-secondary btn-sm" style="flex:1; background:#1e293b; color:#cbd5e1; font-size:11px; padding:8px 10px; display:inline-flex; align-items:center; justify-content:center; gap:6px;" onclick="markTableOccupied(${table.id})">
                 <span>Seat Guests</span>
               </button>`
          }
          <button class="btn btn-secondary btn-sm" style="background:#111624; border-color:var(--dash-border); color:#f8fafc; font-size:11px; padding:8px 10px; display:inline-flex; align-items:center; gap:6px;" onclick="openEditTableModal(${table.id})">
            ${ICONS.edit}
            <span>Edit Table</span>
          </button>
        </div>
      `;
    }

    const standTokenBadge = document.getElementById('dashStandTokenBadge');

    try {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const hostToUse = (isLocal && serverInfo.localIp && serverInfo.localIp !== 'localhost' && !serverInfo.localIp.startsWith('169.254.'))
        ? `${serverInfo.localIp}:${serverInfo.port}`
        : window.location.host;
      const res = await fetch(`/api/qrcode/${tableId}?host=${encodeURIComponent(hostToUse)}`);
      const data = await res.json();

      if (standQrImg) standQrImg.src = data.qrDataUrl;
      if (standUrlLink) {
        standUrlLink.textContent = data.targetUrl;
        standUrlLink.href = data.targetUrl;
      }
      if (standTokenBadge) {
        standTokenBadge.textContent = data.sessionToken || 'ACTIVE';
      }
    } catch(err) {
      console.error(err);
    }
  }

  window.regenerateSelectedTableToken = async function() {
    if (!selectedStandTable) return;
    try {
      const res = await fetch(`/api/tables/${selectedStandTable}/regenerate-token`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showToast(`Generated new QR Token: ${data.newToken}! Previous links expired.`, 'success');
        await loadData();
        loadStandPreview(selectedStandTable);
      } else {
        showToast('Failed to regenerate token', 'warning');
      }
    } catch(err) {
      console.error(err);
      showToast('Error regenerating token', 'warning');
    }
  };

  window.printDashStand = function() {
    window.print();
  };

  // ADD / EDIT TABLE MODAL HANDLERS
  window.openAddTableModal = function() {
    const modal = document.getElementById('tableModal');
    const title = document.getElementById('tableModalTitle');
    const form = document.getElementById('tableForm');
    const editId = document.getElementById('tableEditId');
    const btnSave = document.getElementById('btnSaveTable');

    if (form) form.reset();
    if (editId) editId.value = '';
    if (title) title.textContent = 'Add New Table';
    if (btnSave) btnSave.innerHTML = `<span>Save Table</span>`;
    
    const nextNum = tables.length > 0 ? Math.max(...tables.map(t => t.id || 0)) + 1 : 1;
    document.getElementById('tableNameInput').value = `Table ${nextNum}`;
    document.getElementById('tableCapacityInput').value = '4';
    document.getElementById('tableSectionInput').value = 'Indoor Dining';

    if (modal) modal.classList.add('active');
  };

  window.openEditTableModal = function(tableId) {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    const modal = document.getElementById('tableModal');
    const title = document.getElementById('tableModalTitle');
    const editId = document.getElementById('tableEditId');
    const btnSave = document.getElementById('btnSaveTable');

    if (editId) editId.value = table.id;
    if (title) title.textContent = `Edit Table: ${table.name}`;
    if (btnSave) btnSave.innerHTML = `<span>Update Table</span>`;

    document.getElementById('tableNameInput').value = table.name;
    document.getElementById('tableCapacityInput').value = table.capacity || 4;
    document.getElementById('tableSectionInput').value = table.section || 'Indoor Dining';

    if (modal) modal.classList.add('active');
  };

  window.handleTableFormSubmit = async function(e) {
    e.preventDefault();

    const editId = document.getElementById('tableEditId').value;
    const name = document.getElementById('tableNameInput').value.trim();
    const capacity = parseInt(document.getElementById('tableCapacityInput').value, 10);
    const section = document.getElementById('tableSectionInput').value.trim();

    const payload = { name, capacity, section };
    const isEdit = Boolean(editId);
    const url = isEdit ? `/api/tables/${editId}` : '/api/tables';
    const method = isEdit ? 'PUT' : 'POST';

    const btnSave = document.getElementById('btnSaveTable');
    if (btnSave) {
      btnSave.disabled = true;
      btnSave.innerHTML = `<span>Saving...</span>`;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save table');
      const saved = await res.json();

      closeModal('tableModal');
      await loadData();
      showToast(isEdit ? `Table "${saved.name}" updated!` : `Added "${saved.name}"!`, 'success');

      if (!isEdit) {
        selectAndShowStand(saved.id);
      }
    } catch(err) {
      console.error(err);
      showToast('Error saving table', 'warning');
    } finally {
      if (btnSave) {
        btnSave.disabled = false;
        btnSave.innerHTML = `<span>Save Table</span>`;
      }
    }
  };

  // DELETE TABLE MODAL HANDLERS
  window.confirmDeleteTable = function(tableId) {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    pendingDeleteTableId = tableId;
    const confirmText = document.getElementById('deleteTableConfirmText');
    if (confirmText) {
      confirmText.textContent = `Are you sure you want to permanently delete "${table.name}" (${table.section}) and its QR stand?`;
    }

    const modal = document.getElementById('deleteTableModal');
    if (modal) modal.classList.add('active');
  };

  const btnConfirmDeleteTable = document.getElementById('btnConfirmDeleteTable');
  if (btnConfirmDeleteTable) {
    btnConfirmDeleteTable.addEventListener('click', async () => {
      if (!pendingDeleteTableId) return;

      btnConfirmDeleteTable.disabled = true;
      btnConfirmDeleteTable.textContent = 'Deleting...';

      try {
        const res = await fetch(`/api/tables/${pendingDeleteTableId}`, { method: 'DELETE' });
        if (res.ok) {
          showToast('Table deleted successfully', 'info');
          closeModal('deleteTableModal');
          pendingDeleteTableId = null;
          await loadData();
          if (tables.length > 0) {
            selectAndShowStand(tables[0].id);
          }
        } else {
          showToast('Failed to delete table', 'warning');
        }
      } catch(err) {
        console.error(err);
      } finally {
        btnConfirmDeleteTable.disabled = false;
        btnConfirmDeleteTable.textContent = 'Delete Table';
      }
    });
  }

  // 5. Orders Audit Table Ledger (Matching Reference Image)
  let orderChannelFilter = 'all';
  let orderSearchFilterText = '';

  window.filterOrdersLedger = function(val) {
    orderSearchFilterText = val.toLowerCase().trim();
    applyOrdersLedgerFilters();
  };

  window.filterOrderChannel = function(channel, btnEl) {
    orderChannelFilter = channel;
    document.querySelectorAll('.order-channel-pill').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    applyOrdersLedgerFilters();
  };

  function applyOrdersLedgerFilters() {
    let filtered = orders;
    if (orderSearchFilterText) {
      filtered = filtered.filter(o => 
        o.orderNumber.toString().includes(orderSearchFilterText) ||
        o.tableName.toLowerCase().includes(orderSearchFilterText) ||
        o.items.some(i => i.name.toLowerCase().includes(orderSearchFilterText))
      );
    }
    renderOrdersAudit(filtered);
  }

  function renderOrdersAudit(ordersToRender = orders) {
    const tableBody = document.getElementById('dashOrdersTableBody');
    if (!tableBody) return;

    if (ordersToRender.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:36px; color:#64748b; font-weight:600;">No orders found matching search.</td></tr>`;
      return;
    }

    tableBody.innerHTML = ordersToRender.map(order => {
      const timeStr = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const itemsListStr = order.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
      const isServed = ['served', 'completed'].includes(order.status);
      const isCooking = order.status === 'preparing';
      const badgeClass = isServed ? 'badge-ready' : isCooking ? 'badge-preparing' : 'badge-new';
      const badgeText = isServed ? 'Served' : isCooking ? 'Cooking' : 'New';

      return `
        <tr>
          <td><strong style="color:#0f172a; font-family:var(--font-display);">#${order.orderNumber}</strong></td>
          <td style="color:#64748b; font-size:12px;">${timeStr}</td>
          <td><strong style="color:#0f172a;">${order.tableName}</strong></td>
          <td style="max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#475569;" title="${itemsListStr}">
            ${itemsListStr}
          </td>
          <td>
            <span class="badge ${badgeClass}">${badgeText}</span>
          </td>
          <td><strong style="color:#00874e; font-size:14px; font-family:var(--font-display);">₹${order.total.toFixed(2)}</strong></td>
          <td style="text-align:right;">
            <button class="btn btn-secondary btn-sm" onclick="printKOT('${order.id}')" style="padding:4px 10px; font-size:11px; display:inline-flex; align-items:center; gap:4px;">
              ${ICONS.print} Receipt
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.exportOrdersSummary = function() {
    let csv = 'Order,Time,Table,Items,Status,Amount\n';
    orders.forEach(o => {
      const items = o.items.map(i => `${i.quantity}x ${i.name}`).join('; ');
      csv += `"${o.orderNumber}","${new Date(o.createdAt).toLocaleTimeString()}","${o.tableName}","${items}","${o.status}","${o.total}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spice-garden-orders-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    showToast('Orders exported to CSV!', 'success');
  };

  // ==========================================================
  // 6. MENU INVENTORY & CRUD OPERATIONS (ADD, EDIT, DELETE)
  // ==========================================================
  window.filterDashMenu = function(category, btnEl) {
    menuCategoryFilter = category;
    document.querySelectorAll('.dash-menu-cat').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    renderMenuCRUD();
  };

  function renderMenuCRUD() {
    if (!dashMenuList) return;

    let filtered = menuCategoryFilter === 'all' 
      ? menu 
      : menu.filter(item => item.category === menuCategoryFilter);

    if (filtered.length === 0) {
      dashMenuList.innerHTML = `
        <div style="grid-column: 1 / -1; text-align:center; padding:50px 20px; color:#64748b;">
          <p style="font-size:16px; font-weight:600; margin-bottom:10px;">No dishes in this category.</p>
          <button class="btn btn-primary btn-sm" onclick="openAddDishModal()">+ Add A Dish</button>
        </div>
      `;
      return;
    }

    dashMenuList.innerHTML = filtered.map(item => {
      return `
        <div class="menu-crud-card" id="dish-card-${item.id}">
          <div class="menu-crud-top">
            <img src="${item.image}" alt="${item.name}" class="menu-crud-thumb" onerror="this.src='/images/veggie_burger.jpg'">
            <div class="menu-crud-info">
              <div class="menu-crud-title">
                <div style="display:flex; align-items:center; gap:6px; min-width:0;">
                  <span class="dietary-badge ${item.isVeg ? 'veg' : 'non-veg'}" title="${item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}"></span>
                  <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:700;">${item.name}</span>
                </div>
                ${item.isSpecial ? '<span class="menu-special-pill">Special</span>' : ''}
              </div>
              <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:3px;">
                <span class="menu-crud-cat-pill">${item.category}</span>
                <span style="font-size:11px; color:#64748b; display:inline-flex; align-items:center; gap:3px;">${ICONS.clock} ${item.prepTime || '12-15 mins'}</span>
                <span class="badge ${item.available ? 'badge-ready' : 'badge-new'}" style="font-size:9.5px; padding:2px 7px; display:inline-flex; align-items:center; gap:4px;">
                  <span class="status-indicator-dot ${item.available ? 'vacant' : 'occupied'}"></span> ${item.available ? 'In Stock' : '86\'d'}
                </span>
              </div>
              <p class="menu-crud-desc">${item.description || 'Artisanal culinary preparation.'}</p>
            </div>
          </div>

          <div class="menu-crud-actions-bar">
            <div>
              <span class="menu-crud-price">₹${item.price}</span>
            </div>

            <div class="menu-crud-actions-right">
              <!-- 86'd Toggle Switch -->
              <div class="menu-crud-switch-wrap">
                <label class="switch" style="transform:scale(0.85);" title="Toggle In Stock / 86'd">
                  <input type="checkbox" ${item.available ? 'checked' : ''} onchange="toggleItemStock('${item.id}')">
                  <span class="slider"></span>
                </label>
              </div>

              <!-- Action buttons: Edit & Delete -->
              <div class="menu-crud-btns">
                <button class="btn-action-edit" onclick="openEditDishModal('${item.id}')" title="Edit Item">
                  ${ICONS.edit}<span class="btn-edit-label"> Edit</span>
                </button>
                <button class="btn-action-delete" onclick="confirmDeleteDish('${item.id}')" title="Delete Item">
                  ${ICONS.trash}
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Toggle Stock
  window.toggleItemStock = async function(itemId) {
    try {
      const res = await fetch(`/api/menu/${itemId}/toggle`, { method: 'PATCH' });
      if (res.ok) {
        const updated = await res.json();
        const idx = menu.findIndex(m => m.id === updated.id);
        if (idx !== -1) menu[idx] = updated;
        renderMenuCRUD();
        showToast(`Stock updated for ${updated.name}`, 'info');
      }
    } catch(err) {
      console.error(err);
    }
  };

  // Open Add Modal
  window.openAddDishModal = function() {
    const modal = document.getElementById('dishModal');
    const title = document.getElementById('dishModalTitle');
    const form = document.getElementById('dishForm');
    const editId = document.getElementById('dishEditId');
    const btnSave = document.getElementById('btnSaveDish');

    if (form) form.reset();
    if (editId) editId.value = '';
    if (title) title.textContent = 'Add New Dish';
    if (btnSave) btnSave.innerHTML = `<span>Save Dish to Menu</span>`;
    document.getElementById('dishImage').value = '/images/veggie_burger.jpg';

    if (modal) modal.classList.add('active');
  };

  // Open Edit Modal
  window.openEditDishModal = function(itemId) {
    const item = menu.find(i => i.id === itemId);
    if (!item) return;

    const modal = document.getElementById('dishModal');
    const title = document.getElementById('dishModalTitle');
    const editId = document.getElementById('dishEditId');
    const btnSave = document.getElementById('btnSaveDish');

    if (editId) editId.value = item.id;
    if (title) title.textContent = `Edit Dish: ${item.name}`;
    if (btnSave) btnSave.innerHTML = `<span>Update Dish Changes</span>`;

    document.getElementById('dishName').value = item.name;
    document.getElementById('dishCategory').value = item.category || 'burgers';
    document.getElementById('dishPrice').value = item.price;
    document.getElementById('dishDescription').value = item.description || '';
    document.getElementById('dishImage').value = item.image || '/images/veggie_burger.jpg';
    document.getElementById('dishIsVeg').value = item.isVeg ? 'true' : 'false';
    document.getElementById('dishPrepTime').value = item.prepTime || '12-15 mins';
    document.getElementById('dishIsSpecial').checked = Boolean(item.isSpecial);

    if (modal) modal.classList.add('active');
  };

  // Set Preset Image
  window.setDishImagePreset = function(url) {
    const imgInput = document.getElementById('dishImage');
    if (imgInput) imgInput.value = url;
  };

  // Handle Add/Edit Submit
  window.handleDishFormSubmit = async function(e) {
    e.preventDefault();

    const editId = document.getElementById('dishEditId').value;
    const name = document.getElementById('dishName').value;
    const category = document.getElementById('dishCategory').value;
    const price = parseFloat(document.getElementById('dishPrice').value);
    const description = document.getElementById('dishDescription').value;
    const image = document.getElementById('dishImage').value || '/images/veggie_burger.jpg';
    const isVeg = document.getElementById('dishIsVeg').value === 'true';
    const prepTime = document.getElementById('dishPrepTime').value || '12-15 mins';
    const isSpecial = document.getElementById('dishIsSpecial').checked;

    const payload = {
      name,
      category,
      price,
      description,
      image,
      isVeg,
      prepTime,
      isSpecial
    };

    const isEdit = Boolean(editId);
    const url = isEdit ? `/api/menu/${editId}` : '/api/menu';
    const method = isEdit ? 'PUT' : 'POST';

    const btnSave = document.getElementById('btnSaveDish');
    if (btnSave) {
      btnSave.disabled = true;
      btnSave.innerHTML = `<span>Saving...</span>`;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save dish');
      const saved = await res.json();

      if (isEdit) {
        const idx = menu.findIndex(m => m.id === editId);
        if (idx !== -1) menu[idx] = saved;
        showToast(`Updated "${saved.name}" successfully!`, 'success');
      } else {
        menu.push(saved);
        showToast(`Added "${saved.name}" to menu!`, 'success');
      }

      closeModal('dishModal');
      renderMenuCRUD();

    } catch(err) {
      console.error(err);
      showToast('Error saving dish. Please check inputs.', 'warning');
    } finally {
      if (btnSave) {
        btnSave.disabled = false;
        btnSave.innerHTML = `<span>Save Dish</span>`;
      }
    }
  };

  // Delete Confirmation Modal
  window.confirmDeleteDish = function(itemId) {
    const item = menu.find(i => i.id === itemId);
    if (!item) return;

    pendingDeleteId = itemId;
    const confirmText = document.getElementById('deleteConfirmText');
    if (confirmText) {
      confirmText.textContent = `Are you sure you want to permanently delete "${item.name}" (₹${item.price})? It will be removed from customer menus immediately.`;
    }

    const modal = document.getElementById('deleteConfirmModal');
    if (modal) modal.classList.add('active');
  };

  const btnConfirmDelete = document.getElementById('btnConfirmDelete');
  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener('click', async () => {
      if (!pendingDeleteId) return;

      btnConfirmDelete.disabled = true;
      btnConfirmDelete.textContent = 'Deleting...';

      try {
        const res = await fetch(`/api/menu/${pendingDeleteId}`, { method: 'DELETE' });
        if (res.ok) {
          menu = menu.filter(m => m.id !== pendingDeleteId);
          renderMenuCRUD();
          showToast('Dish deleted successfully', 'info');
          closeModal('deleteConfirmModal');
        } else {
          showToast('Failed to delete dish', 'warning');
        }
      } catch(err) {
        console.error(err);
      } finally {
        btnConfirmDelete.disabled = false;
        btnConfirmDelete.textContent = 'Delete Dish';
        pendingDeleteId = null;
      }
    });
  }

  // Modal Closer
  window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  };

  // Service Alerts Management
  window.toggleServiceAlertsDrawer = function() {
    const drawer = document.getElementById('serviceAlertsDropdown');
    if (drawer) {
      drawer.classList.toggle('active');
    }
  };

  function renderServiceAlerts() {
    const bellBtn = document.getElementById('headerAlertsBell');
    const countBadge = document.getElementById('serviceAlertsCount');
    const dropdownList = document.getElementById('serviceAlertsDropdownList');

    const count = serviceCalls.length;
    document.querySelectorAll('.service-alerts-count-badge').forEach(badge => {
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    });

    document.querySelectorAll('.header-alerts-bell').forEach(bell => {
      if (count > 0) bell.classList.add('has-alerts');
      else bell.classList.remove('has-alerts');
    });

    if (dropdownList) {
      if (count === 0) {
        dropdownList.innerHTML = `<div style="padding:24px 16px; text-align:center; color:#94a3b8; font-size:12px;">No active service calls</div>`;
      } else {
        dropdownList.innerHTML = serviceCalls.map(c => {
          const isWater = (c.type || '').toLowerCase().includes('water');
          const isBill = (c.type || '').toLowerCase().includes('bill');
          const icon = isWater ? ICONS.water : isBill ? ICONS.bill : ICONS.waiter;
          return `
            <div class="alert-item-row">
              <div style="display:flex; align-items:center; gap:10px;">
                <span style="display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:8px; background:#f1f5f9;">${icon}</span>
                <div>
                  <div style="font-weight:800; font-size:13px; color:#0f172a;">${c.tableName}</div>
                  <div style="font-size:11px; color:#64748b;">${c.type}</div>
                </div>
              </div>
              <button class="btn-service-mini-done" onclick="dismissServiceCall('${c.id}')" style="display:inline-flex; align-items:center; gap:4px;">
                ${ICONS.check} Attended
              </button>
            </div>
          `;
        }).join('');
      }
    }
  }

  window.showFloatingServiceBanner = function(call) {
    let bannerContainer = document.getElementById('serviceAlertFloatingBanner');
    if (!bannerContainer) {
      bannerContainer = document.createElement('div');
      bannerContainer.id = 'serviceAlertFloatingBanner';
      bannerContainer.className = 'service-alert-floating-banner';
      document.body.prepend(bannerContainer);
    }

    const isWater = (call.type || '').toLowerCase().includes('water');
    const isBill = (call.type || '').toLowerCase().includes('bill');
    const typeClass = isWater ? 'type-water' : isBill ? 'type-bill' : 'type-waiter';
    const icon = isWater ? ICONS.water : isBill ? ICONS.bill : ICONS.waiter;
    const titleText = isWater ? 'Water Requested!' : isBill ? 'Bill / Check Requested!' : 'Waiter Call!';

    const alertId = 'alert-' + (call.id || Date.now());

    // Remove if already showing
    const existing = document.getElementById(alertId);
    if (existing) existing.remove();

    const alertEl = document.createElement('div');
    alertEl.id = alertId;
    alertEl.className = `service-alert-box ${typeClass}`;
    alertEl.innerHTML = `
      <div class="service-alert-icon" style="display:flex; align-items:center; justify-content:center;">${icon}</div>
      <div class="service-alert-content">
        <div class="service-alert-title">
          <span>${call.tableName || 'Table'}</span>
          <span>•</span>
          <span>${titleText}</span>
        </div>
        <div class="service-alert-sub">${call.type} • Tap when attended</div>
      </div>
      <button class="btn-service-attended" onclick="dismissServiceCall('${call.id}', '${alertId}')" style="display:inline-flex; align-items:center; gap:6px;">
        ${ICONS.check} Attended / Clear
      </button>
    `;

    bannerContainer.prepend(alertEl);

    // Keep banner visible for 15s then slide out smoothly (still remains in dropdown drawer & table cards)
    setTimeout(() => {
      if (document.getElementById(alertId)) {
        alertEl.style.transition = 'all 0.4s ease';
        alertEl.style.opacity = '0';
        alertEl.style.transform = 'translateY(-20px)';
        setTimeout(() => alertEl.remove(), 400);
      }
    }, 15000);
  };

  window.dismissServiceCall = async function(callId, alertElemId) {
    if (alertElemId) {
      const el = document.getElementById(alertElemId);
      if (el) el.remove();
    }
    const bannerEl = document.getElementById('alert-' + callId);
    if (bannerEl) bannerEl.remove();

    try {
      const res = await fetch(`/api/service-call/${callId}/dismiss`, { method: 'PATCH' });
      if (res.ok) {
        serviceCalls = serviceCalls.filter(c => c.id !== callId);
        renderServiceAlerts();
        renderTablesFloor();
        renderOverviewPanels();
        showToast('Service call resolved', 'info');
      }
    } catch (e) {
      console.error('Failed to dismiss service call:', e);
    }
  };

  // Toast
  window.showToast = function(msg, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  };
});
