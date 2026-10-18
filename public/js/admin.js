// Admin & Floor Management Logic
document.addEventListener('DOMContentLoaded', () => {
  let tables = [];
  let orders = [];
  let menu = [];

  const tablesGrid = document.getElementById('tablesGrid');
  const menuStockList = document.getElementById('menuStockList');
  const recentOrdersList = document.getElementById('recentOrdersList');
  const totalRevenueEl = document.getElementById('totalRevenue');
  const totalOrdersEl = document.getElementById('totalOrders');
  const activeTablesEl = document.getElementById('activeTables');
  const avgOrderValEl = document.getElementById('avgOrderVal');

  // Socket
  const socket = io();
  socket.emit('join', { role: 'admin' });

  socket.on('order:new', () => {
    refreshAllData();
  });

  socket.on('order:status_changed', () => {
    refreshAllData();
  });

  socket.on('service:call', (call) => {
    showToast(`${call.tableName} requested: ${call.type}`, 'warning');
  });

  refreshAllData();

  async function refreshAllData() {
    try {
      const [tablesRes, ordersRes, menuRes] = await Promise.all([
        fetch('/api/tables'),
        fetch('/api/orders'),
        fetch('/api/menu')
      ]);

      tables = await tablesRes.json();
      orders = await ordersRes.json();
      menu = await menuRes.json();

      renderStats();
      renderTables();
      renderMenuStock();
      renderRecentOrders();
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  }

  function renderStats() {
    const totalRev = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const count = orders.length;
    const occupiedCount = tables.filter(t => t.currentStatus === 'occupied').length;
    const avg = count > 0 ? (totalRev / count) : 0;

    if (totalRevenueEl) totalRevenueEl.textContent = `₹${totalRev.toFixed(2)}`;
    if (totalOrdersEl) totalOrdersEl.textContent = count;
    if (activeTablesEl) activeTablesEl.textContent = `${occupiedCount} / ${tables.length}`;
    if (avgOrderValEl) avgOrderValEl.textContent = `₹${avg.toFixed(2)}`;
  }

  function renderTables() {
    if (!tablesGrid) return;

    tablesGrid.innerHTML = tables.map(table => {
      const isOccupied = table.currentStatus === 'occupied';
      return `
        <div class="table-floor-card ${isOccupied ? 'occupied' : ''}" onclick="window.open('/index.html?table=${table.id}', '_blank')">
          <div class="table-card-top">
            <span class="table-card-title">${table.name}</span>
            <span class="table-card-status-dot"></span>
          </div>
          <div class="table-card-details">
            <div>${table.section} • ${table.capacity}p</div>
            <div style="margin-top:6px; font-weight:700; color:${isOccupied ? '#10b981' : '#94a3b8'};">
              ${isOccupied ? `Occupied (${table.activeOrdersCount} order)` : 'Vacant'}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderMenuStock() {
    if (!menuStockList) return;

    menuStockList.innerHTML = menu.map(item => {
      return `
        <div class="menu-item-row">
          <div>
            <div style="font-weight:700; font-size:14px;">${item.name}</div>
            <div style="font-size:12px; color:#64748b;">${item.category.toUpperCase()} • ₹${item.price}</div>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:12px; font-weight:600; color:${item.available ? '#10b981' : '#ef4444'};">
              ${item.available ? 'In Stock' : '86 / Out'}
            </span>
            <label class="switch">
              <input type="checkbox" ${item.available ? 'checked' : ''} onchange="toggleItemStock('${item.id}')">
              <span class="slider"></span>
            </label>
          </div>
        </div>
      `;
    }).join('');
  }

  window.toggleItemStock = async function(itemId) {
    try {
      const res = await fetch(`/api/menu/${itemId}/toggle`, { method: 'PATCH' });
      if (res.ok) {
        refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  function renderRecentOrders() {
    if (!recentOrdersList) return;

    const recent = orders.slice(0, 8);
    recentOrdersList.innerHTML = recent.map(order => {
      return `
        <div style="padding:12px 0; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-weight:700; font-size:14px;">#${order.orderNumber} - ${order.tableName}</div>
            <div style="font-size:12px; color:#64748b;">${order.items.length} items • ₹${order.total.toFixed(2)} • ${new Date(order.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
          </div>
          <span class="badge ${order.status === 'new' ? 'badge-new' : order.status === 'preparing' ? 'badge-preparing' : order.status === 'ready' ? 'badge-ready' : 'badge-served'}">
            ${order.status.toUpperCase()}
          </span>
        </div>
      `;
    }).join('');
  }

  // Toast
  window.showToast = function(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

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
