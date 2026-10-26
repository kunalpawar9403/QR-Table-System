import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Receipt,
  ChefHat,
  BookOpen,
  QrCode,
  Bell,
  Volume2,
  VolumeX,
  Lock,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  Clock,
  Printer,
  Trash2,
  Edit,
  ExternalLink,
  X,
  AlertCircle,
  Sparkles,
  Users,
  Flame,
  Check,
  TrendingUp,
  CircleDot
} from 'lucide-react';
import { socket } from '../utils/socket';
import { soundManager } from '../utils/sound';
import { authFetch, clearStaffToken } from '../utils/staffAuth';
import { useToast } from '../components/Toast';
import '../styles/dashboard.css';

export default function DashboardApp({ onLockStaff }) {
  const { addToast } = useToast();

  // Active Tab
  const [activeTab, setActiveTab] = useState('overview');

  // State
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [menu, setMenu] = useState([]);
  const [serviceCalls, setServiceCalls] = useState([]);
  const [isMuted, setIsMuted] = useState(soundManager.isMuted());
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [currentDate, setCurrentDate] = useState(
    new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  );

  // Filters & Search
  const [tableFilter, setTableFilter] = useState('all');
  const [orderFilter, setOrderFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [menuSearch, setMenuSearch] = useState('');
  const [menuCategoryFilter, setMenuCategoryFilter] = useState('all');

  // Modals
  const [printBillOrder, setPrintBillOrder] = useState(null);
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [tableModalOpen, setTableModalOpen] = useState(false);

  // Form states
  const [dishForm, setDishForm] = useState({
    name: '',
    category: 'mains',
    price: '',
    description: '',
    image: '',
    isVeg: true,
    spiceLevel: 1
  });

  const [tableForm, setTableForm] = useState({
    name: '',
    capacity: 4
  });

  // Digital Clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Initial Data
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [tablesRes, ordersRes, menuRes, callsRes] = await Promise.all([
        fetch('/api/tables'),
        fetch('/api/orders'),
        fetch('/api/menu'),
        fetch('/api/service-calls')
      ]);

      if (tablesRes.ok) setTables(await tablesRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (menuRes.ok) setMenu(await menuRes.json());
      if (callsRes.ok) setServiceCalls(await callsRes.json());
    } catch (e) {
      addToast('Error loading live operations data', 'error');
    }
  };

  // Socket setup
  useEffect(() => {
    socket.emit('join-dashboard');
    socket.emit('join-kitchen');

    const handleNewOrder = (newOrder) => {
      soundManager.playNewOrderChime();
      setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
      addToast(`New Order #${newOrder.orderNumber} from ${newOrder.tableName}`, 'success', 5000);
      fetch('/api/tables').then((r) => r.json()).then(setTables).catch(() => {});
    };

    const handleStatusChanged = (updated) => {
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    };

    const handleServiceCall = (call) => {
      soundManager.playServiceBell();
      setServiceCalls((prev) => [call, ...prev.filter((c) => c.id !== call.id)]);
      addToast(`🔔 ${call.tableName}: ${call.type.toUpperCase()}`, 'warning', 6000);
    };

    const handleServiceDismissed = (data) => {
      setServiceCalls((prev) => prev.filter((c) => c.id !== data.id));
    };

    const handleMenuUpdated = (newMenu) => {
      setMenu(newMenu);
    };

    const handleTableUpdated = (updatedTable) => {
      setTables((prev) => prev.map((t) => (t.id === updatedTable.id ? updatedTable : t)));
    };

    socket.on('order:new', handleNewOrder);
    socket.on('order:status_changed', handleStatusChanged);
    socket.on('service:call', handleServiceCall);
    socket.on('service:dismissed', handleServiceDismissed);
    socket.on('menu:updated', handleMenuUpdated);
    socket.on('table:updated', handleTableUpdated);

    return () => {
      socket.off('order:new', handleNewOrder);
      socket.off('order:status_changed', handleStatusChanged);
      socket.off('service:call', handleServiceCall);
      socket.off('service:dismissed', handleServiceDismissed);
      socket.off('menu:updated', handleMenuUpdated);
      socket.off('table:updated', handleTableUpdated);
    };
  }, []);

  // Dismiss Service Call
  const dismissServiceCall = async (callId) => {
    try {
      const res = await authFetch(`/api/service-call/${callId}/dismiss`, {
        method: 'PATCH'
      });
      if (res.ok) {
        setServiceCalls((prev) => prev.filter((c) => c.id !== callId));
        soundManager.playClick();
      }
    } catch (e) {
      addToast('Failed to dismiss alert', 'error');
    }
  };

  // Change Order Status
  const handleOrderStatusUpdate = async (orderId, newStatus) => {
    try {
      const res = await authFetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        soundManager.playClick();
        if (newStatus === 'ready') soundManager.playOrderReady();
        addToast(`Order updated to ${newStatus.toUpperCase()}`, 'success');
      }
    } catch (e) {
      addToast('Failed to update order status', 'error');
    }
  };

  // Vacate Table (Clear & Complete)
  const handleVacateTable = async (tableId) => {
    if (!window.confirm(`Clear and reset Table ${tableId}? This marks orders as completed and frees the table.`)) {
      return;
    }
    try {
      const res = await authFetch(`/api/tables/${tableId}/vacant`, {
        method: 'PATCH'
      });
      if (res.ok) {
        addToast(`Table ${tableId} is now vacant & clean`, 'success');
        fetchAllData();
      }
    } catch (e) {
      addToast('Failed to vacate table', 'error');
    }
  };

  // Regenerate Security Token
  const handleRegenerateToken = async (tableId) => {
    try {
      const res = await authFetch(`/api/tables/${tableId}/regenerate-token`, {
        method: 'POST'
      });
      if (res.ok) {
        addToast(`New security QR token generated for Table ${tableId}`, 'success');
        fetchAllData();
      }
    } catch (e) {
      addToast('Failed to regenerate token', 'error');
    }
  };

  // Toggle Dish Availability
  const handleToggleMenu = async (dishId) => {
    try {
      const res = await authFetch(`/api/menu/${dishId}/toggle`, {
        method: 'PATCH'
      });
      if (res.ok) {
        soundManager.playClick();
        fetchAllData();
      }
    } catch (e) {
      addToast('Failed to toggle item availability', 'error');
    }
  };

  // Delete Dish
  const handleDeleteDish = async (dishId) => {
    if (!window.confirm('Are you sure you want to delete this menu dish?')) return;
    try {
      const res = await authFetch(`/api/menu/${dishId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        addToast('Dish deleted successfully', 'success');
        fetchAllData();
      }
    } catch (e) {
      addToast('Failed to delete dish', 'error');
    }
  };

  // Save Dish
  const handleSaveDish = async (e) => {
    e.preventDefault();
    try {
      const url = editingDish ? `/api/menu/${editingDish.id}` : '/api/menu';
      const method = editingDish ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...dishForm,
          price: parseFloat(dishForm.price)
        })
      });

      if (res.ok) {
        addToast(editingDish ? 'Dish updated!' : 'New dish added!', 'success');
        setMenuModalOpen(false);
        setEditingDish(null);
        setDishForm({
          name: '',
          category: 'mains',
          price: '',
          description: '',
          image: '',
          isVeg: true,
          spiceLevel: 1
        });
        fetchAllData();
      }
    } catch (err) {
      addToast('Error saving dish', 'error');
    }
  };

  // Create Table
  const handleCreateTable = async (e) => {
    e.preventDefault();
    try {
      const nextId = tables.length > 0 ? Math.max(...tables.map((t) => t.id || 0)) + 1 : 1;
      const res = await authFetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: nextId,
          name: tableForm.name || `Table ${nextId}`,
          capacity: parseInt(tableForm.capacity, 10) || 4
        })
      });
      if (res.ok) {
        addToast(`Table ${nextId} added to dining floor!`, 'success');
        setTableModalOpen(false);
        setTableForm({ name: '', capacity: 4 });
        fetchAllData();
      }
    } catch (e) {
      addToast('Failed to create table', 'error');
    }
  };

  // KPIs
  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const pendingOrdersCount = orders.filter((o) => o.status === 'pending').length;
  const activeOrdersCount = orders.filter(
    (o) => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready'
  ).length;

  const occupiedTables = tables.filter((t) => t.status === 'occupied').length;
  const occupancyPercent = tables.length > 0 ? Math.round((occupiedTables / tables.length) * 100) : 0;
  const avgTicket = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;

  // Filter Tables
  const filteredTables = tables.filter((t) => {
    const hasCall = serviceCalls.some((c) => c.tableId === t.id);
    if (tableFilter === 'occupied') return t.status === 'occupied';
    if (tableFilter === 'vacant') return t.status !== 'occupied';
    if (tableFilter === 'alerts') return hasCall;
    return true;
  });

  // Filter Orders
  const filteredOrders = orders.filter((o) => {
    if (orderFilter !== 'all' && o.status !== orderFilter) return false;
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      const matchId = String(o.orderNumber || o.id).toLowerCase().includes(q);
      const matchTable = (o.tableName || '').toLowerCase().includes(q);
      const matchCust = (o.customerName || '').toLowerCase().includes(q);
      if (!matchId && !matchTable && !matchCust) return false;
    }
    return true;
  });

  return (
    <div className="dash-container">
      {/* Executive Command Header */}
      <header className="dash-header">
        <div className="dash-header-left">
          <div className="dash-logo-badge">SG</div>
          <div className="dash-title-wrap">
            <h1>
              Spice Garden Command Center <span className="dash-title-tag">LIVE POS</span>
            </h1>
            <p>Smart QR Dining • Real-Time Kitchen KDS • Operations Suite</p>
          </div>
        </div>

        <div className="dash-header-center">
          <div className="live-clock-badge">
            <Clock size={16} style={{ color: 'var(--primary)' }} />
            <span>{currentDate}</span>
            <span style={{ opacity: 0.4 }}>•</span>
            <strong style={{ color: '#fff' }}>{currentTime}</strong>
          </div>

          <div className="socket-indicator">
            <span className="socket-dot" />
            <span>Live Sync Active</span>
          </div>
        </div>

        <div className="dash-header-right">
          <button
            className="btn-icon"
            onClick={() => {
              const muted = soundManager.toggleMute();
              setIsMuted(muted);
              addToast(muted ? 'Sound alerts muted' : 'Sound alerts enabled', 'info');
            }}
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} style={{ color: '#fbbf24' }} />}
          </button>

          <button
            className="btn-icon"
            onClick={() => {
              fetchAllData();
              addToast('Syncing restaurant data...', 'info');
            }}
            title="Refresh All Operations"
          >
            <RefreshCw size={17} />
          </button>

          <button
            className="btn-secondary"
            onClick={() => {
              clearStaffToken();
              if (onLockStaff) onLockStaff();
            }}
            style={{ padding: '8px 14px' }}
          >
            <Lock size={14} style={{ color: 'var(--primary)' }} /> Lock Station
          </button>
        </div>
      </header>

      {/* Floating Active Service Alerts Banner */}
      {serviceCalls.length > 0 && (
        <div className="floating-alert-banner">
          <div className="alert-banner-left">
            <Bell size={24} className="alert-bell-anim" />
            <div>
              <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.95rem' }}>
                {serviceCalls.length} Service Summon{serviceCalls.length > 1 ? 's' : ''} Requiring Staff Attention
              </div>
              <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
                <strong>{serviceCalls[0].tableName}</strong> requested{' '}
                <span style={{ textTransform: 'uppercase', color: '#fef08a' }}>{serviceCalls[0].type}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              onClick={() => dismissServiceCall(serviceCalls[0].id)}
            >
              <CheckCircle size={15} /> Acknowledge & Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <nav className="dash-nav-bar">
        <button
          className={`dash-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <LayoutDashboard size={18} /> Overview
        </button>
        <button
          className={`dash-tab-btn ${activeTab === 'tables' ? 'active' : ''}`}
          onClick={() => setActiveTab('tables')}
        >
          <UtensilsCrossed size={18} /> Floor & Tables
          <span className="tab-counter-badge">{occupiedTables}/{tables.length}</span>
        </button>
        <button
          className={`dash-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <Receipt size={18} /> Orders
          <span className="tab-counter-badge">{orders.length}</span>
        </button>
        <button
          className={`dash-tab-btn ${activeTab === 'kitchen' ? 'active' : ''}`}
          onClick={() => setActiveTab('kitchen')}
        >
          <ChefHat size={18} /> Kitchen KDS
          <span className="tab-counter-badge" style={activeOrdersCount > 0 ? { background: '#ef4444', color: '#fff' } : {}}>
            {activeOrdersCount}
          </span>
        </button>
        <button
          className={`dash-tab-btn ${activeTab === 'menu' ? 'active' : ''}`}
          onClick={() => setActiveTab('menu')}
        >
          <BookOpen size={18} /> Menu Catalog
          <span className="tab-counter-badge">{menu.length}</span>
        </button>
        <button
          className={`dash-tab-btn ${activeTab === 'stands' ? 'active' : ''}`}
          onClick={() => setActiveTab('stands')}
        >
          <QrCode size={18} /> QR Stands Printing
        </button>
      </nav>

      {/* ========================================================
          TAB 1: OVERVIEW
          ======================================================== */}
      {activeTab === 'overview' && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card rev">
              <div className="kpi-icon-wrap rev">₹</div>
              <div className="kpi-info-wrap">
                <h4>Today's Net Sales</h4>
                <div className="kpi-value">₹{totalRevenue.toLocaleString()}</div>
                <div className="kpi-subtext pos">
                  <TrendingUp size={13} /> Real-time active sales
                </div>
              </div>
            </div>

            <div className="kpi-card ord">
              <div className="kpi-icon-wrap ord">
                <Receipt size={24} />
              </div>
              <div className="kpi-info-wrap">
                <h4>Total Orders Placed</h4>
                <div className="kpi-value">{orders.length}</div>
                <div className="kpi-subtext highlight">
                  <CircleDot size={12} /> {pendingOrdersCount} awaiting kitchen accept
                </div>
              </div>
            </div>

            <div className="kpi-card occ">
              <div className="kpi-icon-wrap occ">
                <Users size={24} />
              </div>
              <div className="kpi-info-wrap">
                <h4>Floor Occupancy</h4>
                <div className="kpi-value">{occupancyPercent}%</div>
                <div className="kpi-subtext">
                  {occupiedTables} of {tables.length} dining tables active
                </div>
              </div>
            </div>

            <div className="kpi-card tkt">
              <div className="kpi-icon-wrap tkt">
                <Sparkles size={24} />
              </div>
              <div className="kpi-info-wrap">
                <h4>Average Ticket</h4>
                <div className="kpi-value">₹{avgTicket}</div>
                <div className="kpi-subtext">Per completed guest check</div>
              </div>
            </div>
          </div>

          {/* Dining Floor Preview */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: 2 }}>Dining Floor Status</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Live visualizer of all tables, guest occupancy, and service calls
                </p>
              </div>
              <button className="btn-secondary" onClick={() => setActiveTab('tables')}>
                View Floor Map <ExternalLink size={14} />
              </button>
            </div>

            <div className="tables-grid">
              {tables.map((table) => {
                const activeCall = serviceCalls.find((c) => c.tableId === table.id);
                return (
                  <div
                    key={table.id}
                    className={`table-pos-card ${activeCall ? 'status-calling' : ''}`}
                  >
                    <div className="table-card-top">
                      <div>
                        <div className="table-card-number">{table.name || `Table ${table.id}`}</div>
                        <div className="table-capacity">Seats up to {table.capacity || 4} guests</div>
                      </div>
                      <span
                        className={`status-pill ${
                          activeCall ? 'calling' : table.status === 'occupied' ? 'occupied' : 'vacant'
                        }`}
                      >
                        {activeCall ? `ALERT: ${activeCall.type}` : table.status}
                      </span>
                    </div>

                    <div className="table-card-body">
                      <div className="table-timer-row">
                        <span>Current Session:</span>
                        <span style={{ color: table.status === 'occupied' ? '#34d399' : 'inherit' }}>
                          {table.status === 'occupied' ? 'Dining Active' : 'Ready to Seat'}
                        </span>
                      </div>
                      <div className="table-bill-row">
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Running Check:</span>
                        <span className="table-bill-amount">₹{table.runningTotal || 0}</span>
                      </div>
                    </div>

                    <div className="table-card-actions">
                      <button
                        className="btn-secondary"
                        style={{ fontSize: '0.78rem', padding: '8px' }}
                        onClick={() => window.open(`/?table=${table.id}&token=${table.sessionToken || ''}`, '_blank')}
                      >
                        <ExternalLink size={13} /> Table Menu
                      </button>
                      <button
                        className="btn-primary"
                        style={{ fontSize: '0.78rem', padding: '8px' }}
                        onClick={() => handleVacateTable(table.id)}
                      >
                        Clear Table
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ========================================================
          TAB 2: FLOOR & TABLES
          ======================================================== */}
      {activeTab === 'tables' && (
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
            <div className="filter-pills-group">
              <button
                className={`filter-pill-btn ${tableFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTableFilter('all')}
              >
                ALL TABLES ({tables.length})
              </button>
              <button
                className={`filter-pill-btn ${tableFilter === 'occupied' ? 'active' : ''}`}
                onClick={() => setTableFilter('occupied')}
              >
                OCCUPIED ({occupiedTables})
              </button>
              <button
                className={`filter-pill-btn ${tableFilter === 'vacant' ? 'active' : ''}`}
                onClick={() => setTableFilter('vacant')}
              >
                VACANT ({tables.length - occupiedTables})
              </button>
              <button
                className={`filter-pill-btn ${tableFilter === 'alerts' ? 'active' : ''}`}
                onClick={() => setTableFilter('alerts')}
              >
                ATTENTION ALERTS ({serviceCalls.length})
              </button>
            </div>

            <button className="btn-primary" onClick={() => setTableModalOpen(true)}>
              <Plus size={16} /> Add Table
            </button>
          </div>

          <div className="tables-grid">
            {filteredTables.map((t) => {
              const activeCall = serviceCalls.find((c) => c.tableId === t.id);
              return (
                <div key={t.id} className={`table-pos-card ${activeCall ? 'status-calling' : ''}`}>
                  <div className="table-card-top">
                    <div>
                      <div className="table-card-number">{t.name || `Table ${t.id}`}</div>
                      <div className="table-capacity">Seats {t.capacity} guests</div>
                    </div>
                    <span className={`status-pill ${activeCall ? 'calling' : t.status}`}>{activeCall ? `ALERT: ${activeCall.type}` : t.status}</span>
                  </div>

                  <div className="table-card-body">
                    <div className="table-timer-row">
                      <span>Security Token:</span>
                      <span style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>
                        {(t.sessionToken || 'ACTIVE').slice(0, 8)}...
                      </span>
                    </div>
                    <div className="table-bill-row">
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Running Total:</span>
                      <span className="table-bill-amount">₹{t.runningTotal || 0}</span>
                    </div>
                  </div>

                  <div className="table-card-actions">
                    <button
                      className="btn-secondary"
                      style={{ fontSize: '0.78rem' }}
                      onClick={() => handleRegenerateToken(t.id)}
                      title="Regenerates QR Security Token to prevent old link reuse"
                    >
                      <RefreshCw size={13} /> Reset QR
                    </button>
                    <button
                      className="btn-primary"
                      style={{ fontSize: '0.78rem' }}
                      onClick={() => handleVacateTable(t.id)}
                    >
                      Mark Clean
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: ORDERS
          ======================================================== */}
      {activeTab === 'orders' && (
        <div className="glass-panel" style={{ padding: 24 }}>
          <div className="orders-filter-row">
            <div className="filter-pills-group">
              {['all', 'pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'].map((st) => (
                <button
                  key={st}
                  className={`filter-pill-btn ${orderFilter === st ? 'active' : ''}`}
                  onClick={() => setOrderFilter(st)}
                >
                  {st.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="search-input-box" style={{ width: 280 }}>
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search orders, table, guest..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="orders-list-grid">
            {filteredOrders.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <Receipt size={48} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
                <h3>No Orders Found</h3>
                <p>No orders matching filter "{orderFilter.toUpperCase()}"</p>
              </div>
            ) : (
              filteredOrders.map((ord) => (
                <div key={ord.id} className="order-ticket-card">
                  <div className="ticket-header">
                    <div>
                      <div className="ticket-order-id">#{ord.orderNumber}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {ord.tableName} • {ord.customerName || 'Guest'}
                      </div>
                    </div>
                    <span className={`status-pill ${ord.status}`}>{ord.status}</span>
                  </div>

                  <div className="ticket-items-box">
                    {ord.items?.map((it, idx) => (
                      <div key={idx} className="ticket-item-row">
                        <span>
                          <span className="ticket-item-qty">{it.quantity}x</span> {it.name}
                        </span>
                        <span style={{ fontWeight: 600 }}>₹{it.price * it.quantity}</span>
                      </div>
                    ))}
                    {ord.notes && <div className="ticket-notes">Chef Note: {ord.notes}</div>}
                  </div>

                  <div className="ticket-footer">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Bill Total (incl. GST)</span>
                      <span style={{ color: 'var(--primary)', fontSize: '1.25rem', fontWeight: 800 }}>
                        ₹{ord.total}
                      </span>
                    </div>

                    <div className="ticket-actions-row">
                      {ord.status === 'pending' && (
                        <button
                          className="btn-primary"
                          style={{ flex: 1, padding: 9, fontSize: '0.82rem' }}
                          onClick={() => handleOrderStatusUpdate(ord.id, 'preparing')}
                        >
                          <Flame size={14} /> Send to Kitchen
                        </button>
                      )}
                      {ord.status === 'preparing' && (
                        <button
                          className="btn-primary"
                          style={{ flex: 1, padding: 9, fontSize: '0.82rem' }}
                          onClick={() => handleOrderStatusUpdate(ord.id, 'ready')}
                        >
                          <Check size={14} /> Mark Ready
                        </button>
                      )}
                      {ord.status === 'ready' && (
                        <button
                          className="btn-primary"
                          style={{ flex: 1, padding: 9, fontSize: '0.82rem' }}
                          onClick={() => handleOrderStatusUpdate(ord.id, 'served')}
                        >
                          <UtensilsCrossed size={14} /> Mark Served
                        </button>
                      )}
                      <button
                        className="btn-secondary"
                        style={{ padding: '9px 14px' }}
                        onClick={() => setPrintBillOrder(ord)}
                        title="Print Guest Receipt"
                      >
                        <Printer size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4: KITCHEN KDS STREAM
          ======================================================== */}
      {activeTab === 'kitchen' && (
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: '1.25rem' }}>Active Kitchen Tickets</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Cook station pipeline with live elapsed timers
              </p>
            </div>
            <span className="status-pill occupied">{activeOrdersCount} Open Tickets</span>
          </div>

          <div className="orders-list-grid">
            {orders
              .filter((o) => o.status === 'pending' || o.status === 'preparing')
              .map((ticket) => (
                <div key={ticket.id} className="order-ticket-card" style={{ borderColor: 'rgba(245, 158, 11, 0.4)' }}>
                  <div className="ticket-header" style={{ background: 'rgba(245, 158, 11, 0.08)', margin: '-20px -20px 14px', padding: '14px 20px' }}>
                    <div>
                      <div className="ticket-order-id" style={{ color: '#fbbf24' }}>
                        {ticket.tableName} • #{ticket.orderNumber}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                        Received: {new Date(ticket.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <span className={`status-pill ${ticket.status}`}>{ticket.status}</span>
                  </div>

                  <div className="ticket-items-box">
                    {ticket.items?.map((it, idx) => (
                      <div key={idx} className="ticket-item-row" style={{ fontSize: '1.02rem' }}>
                        <span>
                          <strong style={{ color: 'var(--primary)', marginRight: 8 }}>
                            {it.quantity}x
                          </strong>{' '}
                          {it.name}
                        </span>
                      </div>
                    ))}
                    {ticket.notes && (
                      <div className="ticket-notes">
                        Special Instructions: {ticket.notes}
                      </div>
                    )}
                  </div>

                  <div className="ticket-footer">
                    <button
                      className="btn-primary"
                      style={{ width: '100%', padding: '11px 0' }}
                      onClick={() =>
                        handleOrderStatusUpdate(
                          ticket.id,
                          ticket.status === 'pending' ? 'preparing' : 'ready'
                        )
                      }
                    >
                      {ticket.status === 'pending' ? '🔥 Start Cooking' : '✅ Ready For Pickup'}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 5: MENU CATALOG
          ======================================================== */}
      {activeTab === 'menu' && (
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
            <div className="search-input-box" style={{ width: 280 }}>
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search dish by name..."
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
              />
            </div>

            <button
              className="btn-primary"
              onClick={() => {
                setEditingDish(null);
                setDishForm({
                  name: '',
                  category: 'mains',
                  price: '',
                  description: '',
                  image: '',
                  isVeg: true,
                  spiceLevel: 1
                });
                setMenuModalOpen(true);
              }}
            >
              <Plus size={16} /> Add New Dish
            </button>
          </div>

          <div className="menu-table-wrap">
            <div className="menu-crud-row header">
              <span>Photo</span>
              <span>Dish Name</span>
              <span>Category</span>
              <span>Price</span>
              <span>Available</span>
              <span>Actions</span>
            </div>

            {menu
              .filter((dish) => {
                if (menuSearch.trim()) {
                  return dish.name.toLowerCase().includes(menuSearch.toLowerCase());
                }
                return true;
              })
              .map((dish) => (
                <div key={dish.id} className="menu-crud-row">
                  <img
                    src={dish.image || '/images/paneer_butter_masala.jpg'}
                    alt={dish.name}
                    className="menu-thumb"
                  />
                  <div>
                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`diet-badge ${dish.isVeg ? 'veg' : 'non-veg'}`} />
                      {dish.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {dish.description}
                    </div>
                  </div>
                  <span style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>
                    {dish.category}
                  </span>
                  <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.05rem' }}>₹{dish.price}</span>
                  <div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={dish.available !== false}
                        onChange={() => handleToggleMenu(dish.id)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn-icon"
                      onClick={() => {
                        setEditingDish(dish);
                        setDishForm({
                          name: dish.name,
                          category: dish.category,
                          price: dish.price,
                          description: dish.description || '',
                          image: dish.image || '',
                          isVeg: dish.isVeg !== false,
                          spiceLevel: dish.spiceLevel || 1
                        });
                        setMenuModalOpen(true);
                      }}
                      title="Edit Dish"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => handleDeleteDish(dish.id)}
                      title="Delete Dish"
                      style={{ color: '#ef4444' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 6: QR STANDS PRINTING
          ======================================================== */}
      {activeTab === 'stands' && (
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: '1.25rem' }}>Printable Table QR Stands</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                High-resolution QR code stands for guest smartphone ordering
              </p>
            </div>
            <button className="btn-primary" onClick={() => window.print()}>
              <Printer size={16} /> Print All Stands
            </button>
          </div>

          <div className="tables-grid">
            {tables.map((t) => (
              <div
                key={t.id}
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  padding: 24,
                  borderRadius: 18,
                  textAlign: 'center',
                  boxShadow: '0 12px 35px rgba(0,0,0,0.4)',
                  border: '3px solid #f59e0b'
                }}
              >
                <div style={{ fontWeight: 900, fontSize: '1.25rem', letterSpacing: '0.05em' }}>
                  SPICE GARDEN
                </div>
                <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 800, marginBottom: 14 }}>
                  SCAN TO ORDER & PAY
                </div>

                <div
                  style={{
                    width: 170,
                    height: 170,
                    margin: '0 auto 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 14,
                    padding: 8,
                    background: '#fff'
                  }}
                >
                  <img
                    src={`/api/qrcode/${t.id}`}
                    alt={`Table ${t.id} QR`}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>

                <div
                  style={{
                    background: '#0f172a',
                    color: '#f59e0b',
                    padding: '6px 20px',
                    borderRadius: 999,
                    fontWeight: 800,
                    fontSize: '1.15rem',
                    width: 'fit-content',
                    margin: '0 auto 12px'
                  }}
                >
                  {t.name || `TABLE ${t.id}`}
                </div>

                <div style={{ fontSize: '0.78rem', color: '#475569', textAlign: 'left', lineHeight: 1.5 }}>
                  <div>1. Scan with phone camera</div>
                  <div>2. Customize items & order</div>
                  <div>3. Track kitchen status & pay bill</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dish Modal (Add / Edit) with Live Preview */}
      {menuModalOpen && (
        <div className="modal-backdrop" onClick={() => setMenuModalOpen(false)}>
          <div
            className="cart-drawer-card"
            style={{ maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cart-drawer-header">
              <h3>{editingDish ? 'Edit Dish Catalog' : 'Add New Dish'}</h3>
              <button className="modal-close-btn" onClick={() => setMenuModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDish} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dish Name</label>
                <input
                  type="text"
                  required
                  className="customer-name-input"
                  value={dishForm.name}
                  onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Category</label>
                  <select
                    className="customer-name-input"
                    value={dishForm.category}
                    onChange={(e) => setDishForm({ ...dishForm, category: e.target.value })}
                  >
                    <option value="starters">Starters</option>
                    <option value="soups">Soups</option>
                    <option value="mains">Main Course</option>
                    <option value="breads">Breads & Roti</option>
                    <option value="beverages">Beverages</option>
                    <option value="desserts">Desserts</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Price (₹)</label>
                  <input
                    type="number"
                    required
                    className="customer-name-input"
                    value={dishForm.price}
                    onChange={(e) => setDishForm({ ...dishForm, price: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Description</label>
                <textarea
                  className="customer-name-input"
                  rows={2}
                  value={dishForm.description}
                  onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Image Path or URL</label>
                <input
                  type="text"
                  className="customer-name-input"
                  placeholder="/images/paneer_butter_masala.jpg"
                  value={dishForm.image}
                  onChange={(e) => setDishForm({ ...dishForm, image: e.target.value })}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={dishForm.isVeg}
                  onChange={(e) => setDishForm({ ...dishForm, isVeg: e.target.checked })}
                />
                Vegetarian Recipe
              </label>

              <button type="submit" className="btn-primary" style={{ marginTop: 8 }}>
                Save Dish to Menu
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Table Modal */}
      {tableModalOpen && (
        <div className="modal-backdrop" onClick={() => setTableModalOpen(false)}>
          <div className="staff-modal-card" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setTableModalOpen(false)}>
              <X size={20} />
            </button>
            <h3>Add Dining Table</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 18 }}>
              Expands floor capacity with a new security token
            </p>
            <form onSubmit={handleCreateTable} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                type="text"
                placeholder="Table Name (e.g. Table 9, Patio 1)"
                className="customer-name-input"
                value={tableForm.name}
                onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })}
              />
              <input
                type="number"
                placeholder="Seating Capacity (e.g. 4)"
                className="customer-name-input"
                value={tableForm.capacity}
                onChange={(e) => setTableForm({ ...tableForm, capacity: e.target.value })}
              />
              <button type="submit" className="btn-primary">
                Confirm & Add Table
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Realistic Thermal Receipt Modal */}
      {printBillOrder && (
        <div className="modal-backdrop" onClick={() => setPrintBillOrder(null)}>
          <div
            className="receipt-paper-card printable-area"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="receipt-header">
              <div className="receipt-brand-title">SPICE GARDEN</div>
              <div className="receipt-meta">Fine Dining & Smart Restaurant</div>
              <div className="receipt-meta" style={{ marginTop: 6, fontWeight: 700 }}>
                TAX INVOICE / GUEST RECEIPT
              </div>
              <div className="receipt-meta" style={{ marginTop: 4 }}>
                Order #{printBillOrder.orderNumber} • {printBillOrder.tableName}
              </div>
              <div className="receipt-meta">
                {new Date(printBillOrder.createdAt || Date.now()).toLocaleString()}
              </div>
            </div>

            <div className="receipt-items-list">
              {printBillOrder.items?.map((it, i) => (
                <div key={i} className="receipt-item-line">
                  <span>{it.quantity}x {it.name}</span>
                  <span>₹{it.price * it.quantity}</span>
                </div>
              ))}
            </div>

            <div className="receipt-totals">
              <div className="receipt-total-row">
                <span>Items Subtotal:</span>
                <span>₹{printBillOrder.subtotal || printBillOrder.total}</span>
              </div>
              <div className="receipt-total-row">
                <span>CGST (2.5%):</span>
                <span>₹{Math.round((printBillOrder.tax || 0) / 2)}</span>
              </div>
              <div className="receipt-total-row">
                <span>SGST (2.5%):</span>
                <span>₹{Math.round((printBillOrder.tax || 0) / 2)}</span>
              </div>
              <div className="receipt-total-row grand">
                <span>GRAND TOTAL:</span>
                <span>₹{printBillOrder.total}</span>
              </div>
            </div>

            <div className="receipt-actions-footer no-print">
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => window.print()}>
                <Printer size={16} /> Print Receipt
              </button>
              <button className="btn-secondary" onClick={() => setPrintBillOrder(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
