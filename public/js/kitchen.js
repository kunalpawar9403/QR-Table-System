// Kitchen Display System (KDS) Logic
document.addEventListener('DOMContentLoaded', () => {
  let orders = [];
  let currentFilter = 'active'; // 'active', 'new', 'preparing', 'ready', 'all'
  let audioMuted = false;

  // DOM Elements
  const kdsBoard = document.getElementById('kdsBoard');
  const clockEl = document.getElementById('kdsClock');
  const activeCountEl = document.getElementById('activeCount');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const serviceAlertBanner = document.getElementById('serviceAlertBanner');
  const serviceAlertText = document.getElementById('serviceAlertText');

  // Clock
  function updateClock() {
    const now = new Date();
    if (clockEl) {
      clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  // Socket.io Connection
  const socket = io();

  socket.emit('join', { role: 'kitchen' });

  // Sound Toggle
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      audioMuted = window.soundManager.toggleMute();
      if (audioMuted) {
        soundToggleBtn.classList.add('muted');
        soundToggleBtn.innerHTML = `<span>🔇 Audio Muted</span>`;
      } else {
        soundToggleBtn.classList.remove('muted');
        soundToggleBtn.innerHTML = `<span>🔔 Chime Active</span>`;
        window.soundManager.playNewOrderChime();
      }
    });
  }

  // Socket Events
  socket.on('order:new', (newOrder) => {
    // Play loud authentic brass service bell!
    if (window.soundManager) {
      window.soundManager.playNewOrderChime();
    }

    // Add to orders
    orders = orders.filter(o => o.id !== newOrder.id);
    orders.unshift(newOrder);
    renderBoard();

    // Show flash toast
    showToast(`New Order from ${newOrder.tableName}!`, 'success');
  });

  socket.on('order:status_changed', (updatedOrder) => {
    const idx = orders.findIndex(o => o.id === updatedOrder.id);
    if (idx !== -1) {
      orders[idx] = updatedOrder;
      renderBoard();
    }
  });

  socket.on('service:call', (serviceCall) => {
    if (window.soundManager) {
      window.soundManager.playServiceBell();
    }
    showServiceCallAlert(serviceCall);
    showToast(`🚨 ${serviceCall.tableName}: ${serviceCall.type.toUpperCase()}`, 'warning');
    showFloatingServiceBanner(serviceCall);
  });

  // Service Alert Banner
  function showServiceCallAlert(call) {
    if (!serviceAlertBanner || !serviceAlertText) return;
    serviceAlertText.textContent = `🚨 ${call.tableName} CALL: ${call.type.toUpperCase()} requested just now!`;
    serviceAlertBanner.style.display = 'flex';
  }

  function showFloatingServiceBanner(call) {
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
    const icon = isWater ? '💧' : isBill ? '💳' : '🙋‍♂️';
    const titleText = isWater ? 'Water Requested!' : isBill ? 'Bill / Check Requested!' : 'Waiter Call!';

    const alertId = 'alert-' + (call.id || Date.now());
    const existing = document.getElementById(alertId);
    if (existing) existing.remove();

    const alertEl = document.createElement('div');
    alertEl.id = alertId;
    alertEl.className = `service-alert-box ${typeClass}`;
    alertEl.innerHTML = `
      <div class="service-alert-icon">${icon}</div>
      <div class="service-alert-content">
        <div class="service-alert-title">
          <span>${call.tableName || 'Table'}</span>
          <span>•</span>
          <span>${titleText}</span>
        </div>
        <div class="service-alert-sub">${call.type} • Tap when attended</div>
      </div>
      <button class="btn-service-attended" onclick="this.closest('.service-alert-box').remove()">
        ✓ Attended / Clear
      </button>
    `;

    bannerContainer.prepend(alertEl);
    setTimeout(() => {
      if (document.getElementById(alertId)) {
        alertEl.style.transition = 'all 0.4s ease';
        alertEl.style.opacity = '0';
        alertEl.style.transform = 'translateY(-20px)';
        setTimeout(() => alertEl.remove(), 400);
      }
    }, 15000);
  }

  window.dismissServiceAlert = function() {
    if (serviceAlertBanner) serviceAlertBanner.style.display = 'none';
  };

  // Filter Tabs
  const filterTabs = document.querySelectorAll('.kds-filter-tab');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      renderBoard();
    });
  });

  // Fetch Existing Orders
  fetchOrders();

  async function fetchOrders() {
    try {
      const res = await fetch('/api/orders');
      orders = await res.json();
      renderBoard();
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  }

  // Elapsed time formatter
  function getElapsedMinutes(dateString) {
    const diffMs = Date.now() - new Date(dateString).getTime();
    return Math.floor(diffMs / 60000);
  }

  function formatTimeAgo(dateString) {
    const mins = getElapsedMinutes(dateString);
    if (mins < 1) return 'Just now';
    if (mins === 1) return '1m ago';
    return `${mins}m ago`;
  }

  // Periodically refresh elapsed timers
  setInterval(() => {
    document.querySelectorAll('.ticket-timer').forEach(el => {
      const createdAt = el.dataset.time;
      if (createdAt) {
        const mins = getElapsedMinutes(createdAt);
        el.textContent = `⏱️ ${formatTimeAgo(createdAt)}`;
        el.className = 'ticket-timer';
        if (mins >= 15) el.classList.add('timer-urgent');
        else if (mins >= 8) el.classList.add('timer-warn');
      }
    });
  }, 10000);

  // Render KDS Board
  function renderBoard() {
    if (!kdsBoard) return;

    // Filter orders
    let filtered = orders;
    if (currentFilter === 'active') {
      filtered = orders.filter(o => ['new', 'preparing', 'ready'].includes(o.status));
    } else if (currentFilter !== 'all') {
      filtered = orders.filter(o => o.status === currentFilter);
    }

    // Update active count
    const activeOrders = orders.filter(o => ['new', 'preparing', 'ready'].includes(o.status));
    if (activeCountEl) {
      activeCountEl.textContent = `${activeOrders.length} Active`;
    }

    if (filtered.length === 0) {
      kdsBoard.innerHTML = `
        <div class="kds-empty-state">
          <div class="kds-empty-icon">🍳</div>
          <h3 style="font-size:20px; color:#cbd5e1; margin-bottom:8px;">All Orders Caught Up!</h3>
          <p style="font-size:14px;">Incoming orders placed via Table QR codes will immediately ring and appear here.</p>
        </div>
      `;
      return;
    }

    kdsBoard.innerHTML = filtered.map(order => {
      const elapsedMins = getElapsedMinutes(order.createdAt);
      const timerClass = elapsedMins >= 15 ? 'timer-urgent' : elapsedMins >= 8 ? 'timer-warn' : '';

      return `
        <div class="ticket-card status-${order.status}" id="ticket-${order.id}">
          <!-- Header -->
          <div class="ticket-header">
            <div class="ticket-table-name">
              <span>${order.tableName}</span>
              <span class="ticket-table-num-pill">${order.status.toUpperCase()}</span>
            </div>
            <div class="ticket-meta">
              <div class="ticket-id">#${order.orderNumber}</div>
              <div class="ticket-timer ${timerClass}" data-time="${order.createdAt}">
                ⏱️ ${formatTimeAgo(order.createdAt)}
              </div>
            </div>
          </div>

          <!-- Body -->
          <div class="ticket-body">
            ${order.notes ? `
              <div class="ticket-guest-note">
                <strong>Customer Note:</strong> "${order.notes}"
              </div>
            ` : ''}

            <ul class="ticket-items-list">
              ${order.items.map((item, idx) => `
                <li class="ticket-item" onclick="toggleItemDone(this)">
                  <div class="ticket-item-qty">${item.quantity}x</div>
                  <div class="ticket-item-details">
                    <div class="ticket-item-name">${item.name}</div>
                    ${item.options && item.options.length ? `
                      <div class="ticket-item-options">${item.options.join(' • ')}</div>
                    ` : ''}
                  </div>
                </li>
              `).join('')}
            </ul>
          </div>

          <!-- Bump Bar Actions -->
          <div class="ticket-footer">
            ${order.status === 'new' ? `
              <button class="btn-bump btn-bump-cook" onclick="updateOrderStatus('${order.id}', 'preparing')">
                <span>Start Cooking 🍳</span>
              </button>
            ` : ''}

            ${order.status === 'preparing' ? `
              <button class="btn-bump btn-bump-ready" onclick="updateOrderStatus('${order.id}', 'ready')">
                <span>Mark Ready 🛎️</span>
              </button>
            ` : ''}

            ${order.status === 'ready' ? `
              <button class="btn-bump btn-bump-serve" onclick="updateOrderStatus('${order.id}', 'served')">
                <span>Served / Done ✅</span>
              </button>
            ` : ''}

            ${order.status === 'served' ? `
              <button class="btn-bump btn-bump-serve" onclick="updateOrderStatus('${order.id}', 'completed')">
                <span>Archive Order</span>
              </button>
            ` : ''}

            <button class="btn btn-secondary btn-sm" onclick="printKOT('${order.id}')" title="Print Kitchen Ticket" style="background:#0f172a; color:#94a3b8; border-color:#334155;">
              🖨️ KOT
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Toggle item strike-through
  window.toggleItemDone = function(el) {
    el.classList.toggle('done');
  };

  // Update Status Endpoint
  window.updateOrderStatus = async function(orderId, nextStatus) {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!res.ok) throw new Error('Status update failed');
      const updated = await res.json();

      const idx = orders.findIndex(o => o.id === updated.id);
      if (idx !== -1) {
        orders[idx] = updated;
        renderBoard();
      }

      if (nextStatus === 'ready' && window.soundManager) {
        window.soundManager.playOrderReady();
      }

      showToast(`Order #${updated.orderNumber} updated to ${nextStatus.toUpperCase()}!`, 'info');
    } catch (err) {
      console.error(err);
      showToast('Failed to update status', 'warning');
    }
  };

  // Quick Print KOT Modal / Window
  window.printKOT = function(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const printWin = window.open('', '', 'width=380,height=520');
    printWin.document.write(`
      <html>
        <head>
          <title>KOT #${order.orderNumber} - ${order.tableName}</title>
          <style>
            body { font-family: monospace; padding: 20px; font-size: 14px; line-height: 1.4; color: black; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed black; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 16px;">SPICE GARDEN - KITCHEN TICKET</div>
          <div class="center">${order.tableName} | ORDER #${order.orderNumber}</div>
          <div class="center">${new Date(order.createdAt).toLocaleTimeString()}</div>
          <div class="divider"></div>
          ${order.items.map(i => `
            <div style="display:flex; justify-content:space-between; margin: 6px 0;">
              <span><strong>${i.quantity}x</strong> ${i.name}</span>
            </div>
            ${i.options.length ? `<div style="font-size:12px; margin-left: 20px;">- ${i.options.join(', ')}</div>` : ''}
          `).join('')}
          <div class="divider"></div>
          ${order.notes ? `<div><strong>NOTE:</strong> ${order.notes}</div><div class="divider"></div>` : ''}
          <div class="center bold">*** END OF ORDER ***</div>
          <script>window.print(); setTimeout(() => window.close(), 500);</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // Simple Toast
  window.showToast = function(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${msg}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };
});
