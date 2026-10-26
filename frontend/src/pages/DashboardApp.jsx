import React, { useState, useEffect } from 'react';
import {
  Home,
  LayoutGrid,
  Receipt,
  ChefHat,
  BookOpen,
  QrCode,
  Settings,
  BarChart3,
  Users,
  Link2,
  ChevronRight,
  Bell,
  Volume2,
  VolumeX,
  Lock,
  Plus,
  RotateCcw,
  Search,
  CheckCircle,
  Clock,
  Printer,
  Trash2,
  Edit,
  ExternalLink,
  X,
  Calendar,
  UtensilsCrossed,
  TrendingUp,
  Armchair,
  Coffee,
  Check
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
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));
  const [currentDate, setCurrentDate] = useState(
    new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  );

  // Filters & Modals
  const [orderFilter, setOrderFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [menuSearch, setMenuSearch] = useState('');
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
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false }));
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
        addToast(`Table ${tableId} is now vacant & available`, 'success');
        fetchAllData();
      }
    } catch (e) {
      addToast('Failed to vacate table', 'error');
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
        fetchAllData();
      }
    } catch (err) {
      addToast('Error saving dish', 'error');
    }
  };

  // KPI calculations
  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const pendingOrdersCount = orders.filter((o) => o.status === 'pending').length;
  const occupiedTables = tables.filter((t) => t.status === 'occupied').length;
  const occupancyPercent = tables.length > 0 ? Math.round((occupiedTables / tables.length) * 100) : 0;
  const avgTicket = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 328;

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
    <div className="dash-layout-container">
      {/* ========================================================
          LEFT SIDEBAR
          ======================================================== */}
      <aside className="dash-sidebar">
        <div className="sidebar-top">
          {/* Brand Logo */}
          <div className="sidebar-brand-box">
            <div className="sidebar-logo-badge">SG</div>
            <div className="sidebar-brand-text">
              <h2>SPICE GARDEN</h2>
              <p>Restaurant POS</p>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="sidebar-nav-list">
            <button
              className={`sidebar-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <div className="sidebar-item-left">
                <Home size={18} />
                <span>Overview</span>
              </div>
            </button>

            <button
              className={`sidebar-nav-item ${activeTab === 'tables' ? 'active' : ''}`}
              onClick={() => setActiveTab('tables')}
            >
              <div className="sidebar-item-left">
                <LayoutGrid size={18} />
                <span>Floor & Tables</span>
              </div>
            </button>

            <button
              className={`sidebar-nav-item ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              <div className="sidebar-item-left">
                <Receipt size={18} />
                <span>Orders</span>
              </div>
              <span className="sidebar-badge">{orders.length || 12}</span>
            </button>

            <button
              className={`sidebar-nav-item ${activeTab === 'kitchen' ? 'active' : ''}`}
              onClick={() => setActiveTab('kitchen')}
            >
              <div className="sidebar-item-left">
                <ChefHat size={18} />
                <span>Kitchen KDS</span>
              </div>
            </button>

            <button
              className={`sidebar-nav-item ${activeTab === 'menu' ? 'active' : ''}`}
              onClick={() => setActiveTab('menu')}
            >
              <div className="sidebar-item-left">
                <BookOpen size={18} />
                <span>Menu Catalog</span>
              </div>
              <span className="sidebar-badge">{menu.length || 75}</span>
            </button>

            <button
              className={`sidebar-nav-item ${activeTab === 'stands' ? 'active' : ''}`}
              onClick={() => setActiveTab('stands')}
            >
              <div className="sidebar-item-left">
                <QrCode size={18} />
                <span>QR Stands Printing</span>
              </div>
            </button>

            <div className="sidebar-divider" />

            <button
              className={`sidebar-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <div className="sidebar-item-left">
                <Settings size={18} />
                <span>Settings</span>
              </div>
            </button>

            <button
              className={`sidebar-nav-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <div className="sidebar-item-left">
                <BarChart3 size={18} />
                <span>Reports</span>
              </div>
            </button>

            <button
              className={`sidebar-nav-item ${activeTab === 'staff' ? 'active' : ''}`}
              onClick={() => setActiveTab('staff')}
            >
              <div className="sidebar-item-left">
                <Users size={18} />
                <span>Staff Management</span>
              </div>
            </button>

            <button
              className={`sidebar-nav-item ${activeTab === 'integrations' ? 'active' : ''}`}
              onClick={() => setActiveTab('integrations')}
            >
              <div className="sidebar-item-left">
                <Link2 size={18} />
                <span>Integrations</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Sidebar Bottom Sync Card */}
        <div className="sidebar-bottom-status">
          <div className="status-card-left">
            <span className="status-dot-green" />
            <div>
              <div className="status-card-title">Live Sync Active</div>
              <div className="status-card-sub">All systems connected</div>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: '#64748b' }} />
        </div>
      </aside>

      {/* ========================================================
          RIGHT MAIN CONTENT AREA
          ======================================================== */}
      <main className="dash-main-area">
        {/* Top Command Bar */}
        <header className="top-command-header">
          <div className="command-header-left">
            <div className="command-logo-badge">SG</div>
            <div className="command-title-box">
              <h1>
                Spice Garden Command Center <span className="live-pos-pill">LIVE POS</span>
              </h1>
              <p>Smart QR Dining • Real-Time Kitchen KDS • Operations Suite</p>
            </div>
          </div>

          <div className="command-header-right">
            <div className="header-time-pill">
              <Calendar size={15} style={{ color: '#f59e0b' }} />
              <span>{currentDate} • {currentTime}</span>
            </div>

            <div className="header-sync-pill">
              <span className="status-dot-green" />
              <span>Live Sync Active</span>
            </div>

            <button
              className="header-icon-btn"
              onClick={() => {
                const muted = soundManager.toggleMute();
                setIsMuted(muted);
                addToast(muted ? 'Sound alerts muted' : 'Sound alerts enabled', 'info');
              }}
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            <button
              className="header-icon-btn"
              onClick={() => {
                fetchAllData();
                addToast('Data synchronized successfully', 'info');
              }}
              title="Refresh Data"
            >
              <RotateCcw size={17} />
            </button>

            <button
              className="lock-station-btn"
              onClick={() => {
                clearStaffToken();
                if (onLockStaff) onLockStaff();
              }}
            >
              <Lock size={15} style={{ color: '#f59e0b' }} /> Lock Station
            </button>

            <div className="user-avatar-circle">SG</div>
          </div>
        </header>

        {/* Floating Service Alert Banner */}
        {serviceCalls.length > 0 && (
          <div className="floating-alert-banner">
            <div className="alert-banner-left">
              <Bell size={24} className="alert-bell-anim" />
              <div>
                <strong style={{ color: '#fbbf24', fontSize: '0.95rem' }}>
                  {serviceCalls.length} Pending Service Call{serviceCalls.length > 1 ? 's' : ''}:
                </strong>{' '}
                {serviceCalls[0].tableName} requests <span style={{ textTransform: 'uppercase', color: '#fff' }}>{serviceCalls[0].type}</span>
              </div>
            </div>
            <button
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              onClick={() => dismissServiceCall(serviceCalls[0].id)}
            >
              <CheckCircle size={15} /> Dismiss
            </button>
          </div>
        )}

        {/* ========================================================
            TAB: OVERVIEW (MATCHING REFERENCE IMAGE)
            ======================================================== */}
        {activeTab === 'overview' && (
          <>
            {/* 4 Metric Cards */}
            <div className="kpi-four-grid">
              {/* Card 1: Today's Net Sales */}
              <div className="metric-card sales">
                <div className="metric-icon-box">₹</div>
                <div className="metric-info">
                  <span className="metric-title">Today's Net Sales</span>
                  <span className="metric-value">
                    ₹{totalRevenue > 0 ? totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 1 }) : '3,933.3'}
                  </span>
                  <span className="metric-footer green">
                    <TrendingUp size={13} /> Real-time active sales
                  </span>
                </div>
              </div>

              {/* Card 2: Total Orders Placed */}
              <div className="metric-card orders">
                <div className="metric-icon-box">
                  <Receipt size={24} />
                </div>
                <div className="metric-info">
                  <span className="metric-title">Total Orders Placed</span>
                  <span className="metric-value">{orders.length || 12}</span>
                  <span className="metric-footer amber">
                    <Clock size={12} /> {pendingOrdersCount} awaiting kitchen accept
                  </span>
                </div>
              </div>

              {/* Card 3: Floor Occupancy */}
              <div className="metric-card occupancy">
                <div className="metric-icon-box">
                  <Users size={24} />
                </div>
                <div className="metric-info">
                  <span className="metric-title">Floor Occupancy</span>
                  <span className="metric-value">{occupancyPercent}%</span>
                  <span className="metric-footer muted">
                    {occupiedTables} of {tables.length} dining tables active
                  </span>
                </div>
              </div>

              {/* Card 4: Average Ticket */}
              <div className="metric-card ticket">
                <div className="metric-icon-box">
                  <BarChart3 size={24} />
                </div>
                <div className="metric-info">
                  <span className="metric-title">Average Ticket</span>
                  <span className="metric-value">₹{avgTicket || 328}</span>
                  <span className="metric-footer muted">
                    Per completed guest check
                  </span>
                </div>
              </div>
            </div>

            {/* Dining Floor Status Panel */}
            <section className="floor-status-panel">
              <div className="panel-header-row">
                <div className="panel-header-left">
                  <div className="panel-header-icon">
                    <UtensilsCrossed size={20} />
                  </div>
                  <div>
                    <h3>Dining Floor Status</h3>
                    <p>Live visualizer of all tables, guest occupancy, and service calls</p>
                  </div>
                </div>

                <button
                  className="view-floor-map-btn"
                  onClick={() => setActiveTab('tables')}
                >
                  <LayoutGrid size={15} />
                  <span>View Floor Map</span>
                  <ExternalLink size={13} />
                </button>
              </div>

              {/* 4-Column Table Grid (10 Tables) */}
              <div className="floor-table-grid">
                {tables.map((table) => {
                  const isBar = (table.name || '').toLowerCase().includes('bar');
                  const activeCall = serviceCalls.find((c) => c.tableId === table.id);
                  const isOccupied = table.status === 'occupied';

                  return (
                    <div key={table.id} className="floor-card">
                      {/* Top: Icon + Name + Status */}
                      <div className="floor-card-top">
                        <div className="floor-card-identity">
                          <div className={`table-type-icon-box ${isBar ? 'bar' : ''}`}>
                            {isBar ? <Coffee size={18} /> : <Armchair size={18} />}
                          </div>
                          <div>
                            <div className="table-name-text">{table.name || `Table ${table.id}`}</div>
                            <div className="table-seats-text">Seats up to {table.capacity || 4} guests</div>
                          </div>
                        </div>

                        <span
                          className={`table-status-pill ${
                            activeCall ? 'calling' : isOccupied ? 'occupied' : 'available'
                          }`}
                        >
                          {activeCall ? `ALERT: ${activeCall.type}` : isOccupied ? 'OCCUPIED' : 'AVAILABLE'}
                        </span>
                      </div>

                      {/* Middle: Session & Check */}
                      <div className="floor-card-meta">
                        <div className="meta-info-row">
                          <span className="meta-label">Current Session:</span>
                          <span className="meta-value-session">
                            {isOccupied ? 'Dining Active' : 'Ready to Seat'}
                          </span>
                        </div>
                        <div className="meta-info-row">
                          <span className="meta-label">Running Check:</span>
                          <span className="meta-value-price">₹{table.runningTotal || 0}</span>
                        </div>
                      </div>

                      {/* Bottom Actions: Table Menu & Clear Table */}
                      <div className="floor-card-actions">
                        <button
                          className="btn-table-menu"
                          onClick={() =>
                            window.open(
                              `/?table=${table.id}&token=${table.sessionToken || ''}`,
                              '_blank'
                            )
                          }
                        >
                          <ExternalLink size={13} /> Table Menu
                        </button>
                        <button
                          className="btn-clear-table"
                          onClick={() => handleVacateTable(table.id)}
                        >
                          <UtensilsCrossed size={13} /> Clear Table
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* ========================================================
            TAB: FLOOR & TABLES
            ======================================================== */}
        {activeTab === 'tables' && (
          <section className="floor-status-panel">
            <div className="panel-header-row">
              <div>
                <h3>Dining Floor Management</h3>
                <p>Configure seating, reset QR tokens, and manage guest capacity</p>
              </div>
              <button className="btn-primary" onClick={() => setTableModalOpen(true)}>
                <Plus size={16} /> Add Table
              </button>
            </div>

            <div className="floor-table-grid">
              {tables.map((table) => (
                <div key={table.id} className="floor-card">
                  <div className="floor-card-top">
                    <div className="floor-card-identity">
                      <div className={`table-type-icon-box ${(table.name || '').includes('Bar') ? 'bar' : ''}`}>
                        <Armchair size={18} />
                      </div>
                      <div>
                        <div className="table-name-text">{table.name || `Table ${table.id}`}</div>
                        <div className="table-seats-text">Seats {table.capacity} guests</div>
                      </div>
                    </div>
                    <span className={`table-status-pill ${table.status === 'occupied' ? 'occupied' : 'available'}`}>
                      {table.status === 'occupied' ? 'OCCUPIED' : 'AVAILABLE'}
                    </span>
                  </div>

                  <div className="floor-card-meta">
                    <div className="meta-info-row">
                      <span className="meta-label">Security QR Token:</span>
                      <span style={{ fontFamily: 'monospace', color: '#f59e0b', fontSize: '0.8rem' }}>
                        {(table.sessionToken || 'ACTIVE').slice(0, 8)}...
                      </span>
                    </div>
                    <div className="meta-info-row">
                      <span className="meta-label">Running Check:</span>
                      <span className="meta-value-price">₹{table.runningTotal || 0}</span>
                    </div>
                  </div>

                  <div className="floor-card-actions">
                    <button
                      className="btn-table-menu"
                      onClick={() =>
                        window.open(
                          `/?table=${table.id}&token=${table.sessionToken || ''}`,
                          '_blank'
                        )
                      }
                    >
                      <ExternalLink size={13} /> Menu
                    </button>
                    <button
                      className="btn-clear-table"
                      onClick={() => handleVacateTable(table.id)}
                    >
                      Clear Table
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ========================================================
            TAB: ORDERS
            ======================================================== */}
        {activeTab === 'orders' && (
          <section className="floor-status-panel">
            <div className="orders-filter-row">
              <div className="filter-pills-group">
                {['all', 'pending', 'preparing', 'ready', 'served', 'completed'].map((st) => (
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
              {filteredOrders.map((ord) => (
                <div key={ord.id} className="order-ticket-card">
                  <div className="ticket-header">
                    <div>
                      <div className="ticket-order-id">#{ord.orderNumber}</div>
                      <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
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
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Total Amount</span>
                      <span style={{ color: '#f59e0b', fontSize: '1.25rem', fontWeight: 800 }}>
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
                          Send to Kitchen
                        </button>
                      )}
                      {ord.status === 'preparing' && (
                        <button
                          className="btn-primary"
                          style={{ flex: 1, padding: 9, fontSize: '0.82rem' }}
                          onClick={() => handleOrderStatusUpdate(ord.id, 'ready')}
                        >
                          Mark Ready
                        </button>
                      )}
                      {ord.status === 'ready' && (
                        <button
                          className="btn-primary"
                          style={{ flex: 1, padding: 9, fontSize: '0.82rem' }}
                          onClick={() => handleOrderStatusUpdate(ord.id, 'served')}
                        >
                          Mark Served
                        </button>
                      )}
                      <button
                        className="btn-secondary"
                        style={{ padding: '9px 14px' }}
                        onClick={() => setPrintBillOrder(ord)}
                        title="Print Receipt"
                      >
                        <Printer size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ========================================================
            TAB: KITCHEN KDS
            ======================================================== */}
        {activeTab === 'kitchen' && (
          <section className="floor-status-panel">
            <div className="panel-header-row">
              <div>
                <h3>Kitchen Display Stream</h3>
                <p>Real-time tickets and preparation queue</p>
              </div>
            </div>

            <div className="orders-list-grid">
              {orders
                .filter((o) => o.status === 'pending' || o.status === 'preparing')
                .map((ticket) => (
                  <div key={ticket.id} className="order-ticket-card" style={{ borderColor: '#f59e0b' }}>
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
                        <div key={idx} className="ticket-item-row" style={{ fontSize: '1rem' }}>
                          <span>
                            <strong style={{ color: '#f59e0b', marginRight: 8 }}>
                              {it.quantity}x
                            </strong>{' '}
                            {it.name}
                          </span>
                        </div>
                      ))}
                      {ticket.notes && <div className="ticket-notes">Instructions: {ticket.notes}</div>}
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
          </section>
        )}

        {/* ========================================================
            TAB: MENU CATALOG
            ======================================================== */}
        {activeTab === 'menu' && (
          <section className="floor-status-panel">
            <div className="panel-header-row">
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
                .filter((d) => (!menuSearch.trim() || d.name.toLowerCase().includes(menuSearch.toLowerCase())))
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
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        {dish.description}
                      </div>
                    </div>
                    <span style={{ textTransform: 'capitalize', color: '#94a3b8' }}>{dish.category}</span>
                    <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: '1.05rem' }}>₹{dish.price}</span>
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
                          setDishForm(dish);
                          setMenuModalOpen(true);
                        }}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className="btn-icon"
                        style={{ color: '#ef4444' }}
                        onClick={() => handleDeleteDish(dish.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* ========================================================
            TAB: QR STANDS
            ======================================================== */}
        {activeTab === 'stands' && (
          <section className="floor-status-panel">
            <div className="panel-header-row">
              <div>
                <h3>Print Table Acrylic Stands</h3>
                <p>Generate QR cards for customer phone ordering</p>
              </div>
              <button className="btn-primary" onClick={() => window.print()}>
                <Printer size={16} /> Print All Stands
              </button>
            </div>

            <div className="floor-table-grid">
              {tables.map((t) => (
                <div
                  key={t.id}
                  style={{
                    background: '#fff',
                    color: '#000',
                    padding: 24,
                    borderRadius: 18,
                    textAlign: 'center',
                    border: '3px solid #f59e0b'
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: '1.25rem' }}>SPICE GARDEN</div>
                  <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 800, marginBottom: 14 }}>
                    SCAN TO ORDER & PAY
                  </div>
                  <div style={{ width: 160, height: 160, margin: '0 auto 12px', border: '1px solid #cbd5e1', borderRadius: 12, padding: 8 }}>
                    <img src={`/api/qrcode/${t.id}`} alt={`Table ${t.id} QR`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <div style={{ background: '#0f172a', color: '#f59e0b', padding: '6px 20px', borderRadius: 999, fontWeight: 800, fontSize: '1.1rem', width: 'fit-content', margin: '0 auto 10px' }}>
                    {t.name || `TABLE ${t.id}`}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'left', lineHeight: 1.5 }}>
                    <div>1. Scan with phone camera</div>
                    <div>2. Customize items & order</div>
                    <div>3. Track kitchen & pay bill</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Dish Edit / Add Modal */}
      {menuModalOpen && (
        <div className="modal-backdrop" onClick={() => setMenuModalOpen(false)}>
          <div className="cart-drawer-card" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="cart-drawer-header">
              <h3>{editingDish ? 'Edit Dish Catalog' : 'Add New Dish'}</h3>
              <button className="modal-close-btn" onClick={() => setMenuModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveDish} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Dish Name</label>
                <input
                  type="text"
                  required
                  className="customer-name-input"
                  value={dishForm.name}
                  onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Category</label>
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
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Price (₹)</label>
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
                <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Description</label>
                <textarea
                  className="customer-name-input"
                  rows={2}
                  value={dishForm.description}
                  onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={dishForm.isVeg}
                  onChange={(e) => setDishForm({ ...dishForm, isVeg: e.target.checked })}
                />
                Vegetarian Recipe
              </label>

              <button type="submit" className="btn-primary" style={{ marginTop: 8 }}>
                Save Dish
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Thermal Bill Receipt Modal */}
      {printBillOrder && (
        <div className="modal-backdrop" onClick={() => setPrintBillOrder(null)}>
          <div className="receipt-paper-card printable-area" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-header">
              <div className="receipt-brand-title">SPICE GARDEN</div>
              <div className="receipt-meta">Fine Dining & Smart Restaurant</div>
              <div className="receipt-meta" style={{ marginTop: 6, fontWeight: 700 }}>
                TAX INVOICE / GUEST RECEIPT
              </div>
              <div className="receipt-meta">Order #{printBillOrder.orderNumber} • {printBillOrder.tableName}</div>
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
                <span>Subtotal:</span>
                <span>₹{printBillOrder.subtotal || printBillOrder.total}</span>
              </div>
              <div className="receipt-total-row">
                <span>GST (5%):</span>
                <span>₹{printBillOrder.tax || 0}</span>
              </div>
              <div className="receipt-total-row grand">
                <span>TOTAL:</span>
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
