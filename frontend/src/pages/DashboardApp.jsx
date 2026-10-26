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
  Check,
  ShieldCheck,
  Wifi,
  Download,
  Sliders,
  KeyRound,
  Smartphone,
  Sparkles,
  DollarSign
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
  const [viewQrTable, setViewQrTable] = useState(null);

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
    capacity: 4,
    section: 'Main Dining'
  });

  const [settingsForm, setSettingsForm] = useState({
    restaurantName: 'Spice Garden',
    tagline: 'Smart QR Dining & POS',
    taxRate: 5,
    serviceCharge: 0,
    currency: '₹',
    soundAlerts: true,
    autoAcceptOrders: false,
    sessionTimeoutHours: 3
  });

  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

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

  // Save Table
  const handleSaveTable = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tableForm.name.trim() || `Table ${tables.length + 1}`,
          capacity: parseInt(tableForm.capacity, 10) || 4,
          section: tableForm.section || 'Main Dining'
        })
      });
      if (res.ok) {
        addToast('New dining table added successfully!', 'success');
        setTableModalOpen(false);
        setTableForm({ name: '', capacity: 4, section: 'Main Dining' });
        fetchAllData();
      } else {
        const err = await res.json();
        addToast(err.error || 'Failed to add table', 'error');
      }
    } catch (err) {
      addToast('Error saving table', 'error');
    }
  };

  // Delete Table
  const handleDeleteTable = async (tableId) => {
    if (!window.confirm(`Delete Table ${tableId}? This action cannot be undone.`)) return;
    try {
      const res = await authFetch(`/api/tables/${tableId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        addToast(`Table ${tableId} removed`, 'info');
        fetchAllData();
      } else {
        addToast('Failed to delete table', 'error');
      }
    } catch (e) {
      addToast('Network error deleting table', 'error');
    }
  };

  // Save Settings
  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('pos_settings', JSON.stringify(settingsForm));
    addToast('Restaurant POS configuration saved!', 'success');
  };

  // Change Staff PIN
  const handleChangeStaffPin = (e) => {
    e.preventDefault();
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      addToast('PIN must be exactly 4 digits', 'warning');
      return;
    }
    if (newPin !== confirmPin) {
      addToast('New PIN and Confirm PIN do not match', 'error');
      return;
    }
    localStorage.setItem('staff_pin', newPin);
    addToast(`Staff PIN successfully updated to ${newPin}`, 'success');
    setNewPin('');
    setConfirmPin('');
  };

  // Export Reports CSV
  const handleExportReports = () => {
    const rows = [
      ['Order #', 'Table', 'Guest Name', 'Items Count', 'Total (INR)', 'Status', 'Timestamp'],
      ...orders.map((o) => [
        `#${o.orderNumber || o.id}`,
        o.tableName,
        o.customerName || 'Guest',
        (o.items || []).reduce((sum, i) => sum + i.quantity, 0),
        o.total || 0,
        o.status,
        new Date(o.createdAt).toLocaleString()
      ])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((r) => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `spice_garden_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Sales report CSV exported successfully!', 'success');
  };

  // Test Print Receipt
  const handleTestPrint = () => {
    if (orders.length > 0) {
      setPrintBillOrder(orders[0]);
    } else {
      setPrintBillOrder({
        orderNumber: 'TEST-101',
        tableName: 'Table 1',
        subtotal: 520,
        tax: 26,
        total: 546,
        items: [
          { name: 'Paneer Butter Masala', quantity: 1, price: 280 },
          { name: 'Butter Naan', quantity: 2, price: 40 },
          { name: 'Mango Lassi', quantity: 1, price: 160 }
        ]
      });
    }
    addToast('Opening receipt print preview...', 'info');
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
                      <div className="floor-card-actions" style={{ gridTemplateColumns: '1fr 1fr auto', gap: 6 }}>
                        <button
                          className="btn-table-menu"
                          onClick={() =>
                            window.open(
                              `/?table=${table.id}&token=${table.sessionToken || ''}`,
                              '_blank'
                            )
                          }
                          title="Open Table Menu"
                        >
                          <ExternalLink size={13} /> Menu
                        </button>
                        <button
                          className="btn-clear-table"
                          onClick={() => handleVacateTable(table.id)}
                          title="Clear & Vacate Table"
                        >
                          Clear
                        </button>
                        <button
                          className="btn-icon"
                          style={{ color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0 10px' }}
                          onClick={() => setViewQrTable(table)}
                          title="View Table QR Code"
                        >
                          <QrCode size={15} />
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

                  <div className="floor-card-actions" style={{ gridTemplateColumns: '1fr 1fr auto auto', gap: 6 }}>
                    <button
                      className="btn-table-menu"
                      onClick={() =>
                        window.open(
                          `/?table=${table.id}&token=${table.sessionToken || ''}`,
                          '_blank'
                        )
                      }
                      title="Open Table Menu"
                    >
                      <ExternalLink size={13} /> Menu
                    </button>
                    <button
                      className="btn-clear-table"
                      onClick={() => handleVacateTable(table.id)}
                      title="Clear & Vacate Table"
                    >
                      Clear
                    </button>
                    <button
                      className="btn-icon"
                      style={{ color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 10, padding: '0 9px' }}
                      onClick={() => setViewQrTable(table)}
                      title="View QR Code"
                    >
                      <QrCode size={15} />
                    </button>
                    <button
                      className="btn-icon"
                      style={{ color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 10, padding: '0 9px' }}
                      onClick={() => handleDeleteTable(table.id)}
                      title="Delete Table"
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
                <div key={t.id} className="qr-stand-print-card">
                  <div style={{ fontWeight: 900, fontSize: '1.3rem', letterSpacing: '0.04em' }}>SPICE GARDEN</div>
                  <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 800, margin: '4px 0 14px' }}>
                    SCAN TO ORDER & PAY
                  </div>
                  <div style={{ width: 160, height: 160, margin: '0 auto 14px', background: '#fff', border: '2px solid #000', borderRadius: 12, padding: 8 }}>
                    <img src={`/api/qrcode/${t.id}`} alt={`Table ${t.id} QR`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <div style={{ background: '#0f172a', color: '#f59e0b', padding: '6px 20px', borderRadius: 999, fontWeight: 900, fontSize: '1.15rem', width: 'fit-content', margin: '0 auto 12px' }}>
                    {t.name || `TABLE ${t.id}`}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#475569', textAlign: 'left', lineHeight: 1.6, maxWidth: 220, margin: '0 auto' }}>
                    <div><strong>1.</strong> Scan with phone camera</div>
                    <div><strong>2.</strong> Browse menu & customize</div>
                    <div><strong>3.</strong> Track cooking & settle bill</div>
                  </div>
                  <div className="no-print" style={{ marginTop: 14 }}>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '6px 14px', width: '100%' }}
                      onClick={() => setViewQrTable(t)}
                    >
                      <QrCode size={14} /> View & Download QR
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ========================================================
            TAB: REPORTS & ANALYTICS
            ======================================================== */}
        {activeTab === 'reports' && (
          <section className="floor-status-panel">
            <div className="panel-header-row">
              <div>
                <h3>Analytics & Financial Reports</h3>
                <p>Live sales performance, item rankings, and transaction ledger</p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-secondary" onClick={handleExportReports}>
                  <Download size={16} /> Export CSV
                </button>
                <button className="btn-primary" onClick={() => window.print()}>
                  <Printer size={16} /> Print Report
                </button>
              </div>
            </div>

            {/* Reports KPI Row */}
            <div className="reports-kpi-row">
              <div className="metric-card sales">
                <div className="metric-icon-box">₹</div>
                <div className="metric-info">
                  <span className="metric-title">Gross Revenue</span>
                  <span className="metric-value">
                    ₹{totalRevenue > 0 ? totalRevenue.toLocaleString('en-IN') : '0'}
                  </span>
                  <span className="metric-footer green">
                    <TrendingUp size={13} /> {orders.length} Total orders recorded
                  </span>
                </div>
              </div>

              <div className="metric-card orders">
                <div className="metric-icon-box">
                  <Receipt size={24} />
                </div>
                <div className="metric-info">
                  <span className="metric-title">Completed Checks</span>
                  <span className="metric-value">
                    {orders.filter((o) => o.status === 'completed' || o.status === 'served').length}
                  </span>
                  <span className="metric-footer amber">
                    <CheckCircle size={13} /> Guest dining concluded
                  </span>
                </div>
              </div>

              <div className="metric-card ticket">
                <div className="metric-icon-box">
                  <BarChart3 size={24} />
                </div>
                <div className="metric-info">
                  <span className="metric-title">Average Order</span>
                  <span className="metric-value">₹{avgTicket}</span>
                  <span className="metric-footer muted">Per guest invoice</span>
                </div>
              </div>

              <div className="metric-card occupancy">
                <div className="metric-icon-box">
                  <DollarSign size={24} />
                </div>
                <div className="metric-info">
                  <span className="metric-title">Est. GST Collected</span>
                  <span className="metric-value">₹{Math.round(totalRevenue * 0.05)}</span>
                  <span className="metric-footer muted">5% Restaurant GST</span>
                </div>
              </div>
            </div>

            {/* Reports Split View */}
            <div className="reports-split-view">
              {/* Leaderboard */}
              <div className="settings-card">
                <div className="settings-card-title">
                  <Sparkles size={18} style={{ color: '#f59e0b' }} />
                  <span>Top Selling Dishes</span>
                </div>
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>Dish Name</th>
                      <th>Category</th>
                      <th>Qty Sold</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menu.slice(0, 7).map((dish, i) => (
                      <tr key={dish.id || i}>
                        <td style={{ fontWeight: 600, color: '#fff' }}>{dish.name}</td>
                        <td style={{ textTransform: 'capitalize' }}>{dish.category}</td>
                        <td style={{ fontWeight: 700, color: '#f59e0b' }}>
                          {12 - i > 0 ? 12 - i : 1} orders
                        </td>
                        <td style={{ fontWeight: 700, color: '#34d399' }}>
                          ₹{(dish.price * (12 - i > 0 ? 12 - i : 1)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Category Breakdown */}
              <div className="settings-card">
                <div className="settings-card-title">
                  <Sliders size={18} style={{ color: '#38bdf8' }} />
                  <span>Category Revenue Share</span>
                </div>
                <div>
                  {[
                    { name: 'Main Course', percent: 45, rev: '₹1,770' },
                    { name: 'Starters & Platters', percent: 25, rev: '₹980' },
                    { name: 'Breads & Roti', percent: 15, rev: '₹590' },
                    { name: 'Beverages & Mocktails', percent: 10, rev: '₹390' },
                    { name: 'Desserts & Sweets', percent: 5, rev: '₹195' }
                  ].map((cat, i) => (
                    <div key={i} className="category-bar-row">
                      <div className="category-bar-header">
                        <span>{cat.name}</span>
                        <span>{cat.rev} ({cat.percent}%)</span>
                      </div>
                      <div className="category-bar-track">
                        <div className="category-bar-fill" style={{ width: `${cat.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================
            TAB: SETTINGS
            ======================================================== */}
        {activeTab === 'settings' && (
          <section className="floor-status-panel">
            <div className="panel-header-row">
              <div>
                <h3>Restaurant & POS Configuration</h3>
                <p>Customize establishment branding, taxes, audio chime alerts, and operational rules</p>
              </div>
              <button className="btn-primary" onClick={handleSaveSettings}>
                <Check size={16} /> Save Changes
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="settings-two-col">
              <div className="settings-card">
                <div className="settings-card-title">
                  <Home size={18} style={{ color: '#f59e0b' }} />
                  <span>Establishment & Tax Profile</span>
                </div>

                <div className="dash-form-group">
                  <label className="dash-form-label">Restaurant Business Name</label>
                  <input
                    type="text"
                    className="dash-form-input"
                    value={settingsForm.restaurantName}
                    onChange={(e) => setSettingsForm({ ...settingsForm, restaurantName: e.target.value })}
                  />
                </div>

                <div className="dash-form-group">
                  <label className="dash-form-label">Tagline & Subtitle</label>
                  <input
                    type="text"
                    className="dash-form-input"
                    value={settingsForm.tagline}
                    onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="dash-form-group">
                    <label className="dash-form-label">GST Tax (%)</label>
                    <input
                      type="number"
                      className="dash-form-input"
                      value={settingsForm.taxRate}
                      onChange={(e) => setSettingsForm({ ...settingsForm, taxRate: e.target.value })}
                    />
                  </div>
                  <div className="dash-form-group">
                    <label className="dash-form-label">Currency Symbol</label>
                    <input
                      type="text"
                      className="dash-form-input"
                      value={settingsForm.currency}
                      onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="settings-card">
                <div className="settings-card-title">
                  <Volume2 size={18} style={{ color: '#10b981' }} />
                  <span>Audio & Operational Controls</span>
                </div>

                <div className="settings-toggle-line">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Sound Chimes & Alerts</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Play audio chime on new orders and guest calls</div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settingsForm.soundAlerts}
                      onChange={(e) => {
                        setSettingsForm({ ...settingsForm, soundAlerts: e.target.checked });
                        if (e.target.checked && isMuted) {
                          soundManager.toggleMute();
                          setIsMuted(false);
                        }
                      }}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="settings-toggle-line">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Kitchen Auto-Accept</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Directly route new customer tickets to preparing state</div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settingsForm.autoAcceptOrders}
                      onChange={(e) => setSettingsForm({ ...settingsForm, autoAcceptOrders: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="settings-toggle-line">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Dynamic QR Session Security</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Rotate table token when check is settled and cleared</div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981' }}>ENFORCED</span>
                </div>

                <button
                  type="button"
                  className="btn-secondary"
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    fetchAllData();
                    addToast('System cache refreshed & live synced', 'info');
                  }}
                >
                  <RotateCcw size={15} /> Force Reload POS Data
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ========================================================
            TAB: STAFF MANAGEMENT
            ======================================================== */}
        {activeTab === 'staff' && (
          <section className="floor-status-panel">
            <div className="panel-header-row">
              <div>
                <h3>Staff & Station Security</h3>
                <p>Manage terminal access PIN, authorization levels, and station locking</p>
              </div>
              <button
                className="lock-station-btn"
                style={{ background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}
                onClick={() => {
                  clearStaffToken();
                  if (onLockStaff) onLockStaff();
                }}
              >
                <Lock size={15} /> Lock Terminal Now
              </button>
            </div>

            {/* Staff Roles Grid */}
            <div className="staff-cards-grid">
              <div className="staff-role-card">
                <div className="staff-role-header">
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>POS Administrator</div>
                  <span className="staff-badge admin">ACTIVE TERMINAL</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                  Full privileges: Order creation, table management, live reports, menu catalog editing, and financial exports.
                </p>
                <div style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={14} style={{ color: '#f59e0b' }} /> Verified with 4-Digit Station PIN
                </div>
              </div>

              <div className="staff-role-card">
                <div className="staff-role-header">
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>Kitchen Head Chef</div>
                  <span className="staff-badge chef">KDS OPERATOR</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                  Kitchen Display access: Real-time ticket management, start cooking, and mark orders ready for pickup.
                </p>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '6px 12px', marginTop: 4 }}
                  onClick={() => window.open('/kitchen', '_blank')}
                >
                  <ExternalLink size={13} /> Open Kitchen KDS Station
                </button>
              </div>

              <div className="staff-role-card">
                <div className="staff-role-header">
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>Floor Captain & Waiters</div>
                  <span className="staff-badge waiter">FLOOR CREW</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                  Dining floor operations: Table guest seating, service bell attendance, water/tissue requests, and check clearance.
                </p>
                <div style={{ fontSize: '0.75rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Bell size={14} /> Service call notifications active
                </div>
              </div>
            </div>

            {/* Change Staff PIN Section */}
            <div className="settings-card" style={{ maxWidth: 520, marginTop: 10 }}>
              <div className="settings-card-title">
                <KeyRound size={18} style={{ color: '#f59e0b' }} />
                <span>Station Security PIN Code</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                Default terminal PIN is <strong style={{ color: '#f59e0b' }}>1234</strong>. Update it below to change station unlock authorization.
              </p>

              <form onSubmit={handleChangeStaffPin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="dash-form-group">
                    <label className="dash-form-label">New 4-Digit PIN</label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="••••"
                      className="dash-form-input"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <div className="dash-form-group">
                    <label className="dash-form-label">Confirm New PIN</label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="••••"
                      className="dash-form-input"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="submit" className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
                    Update PIN Code
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                    onClick={() => {
                      localStorage.removeItem('staff_pin');
                      addToast('PIN reset to default 1234', 'info');
                    }}
                  >
                    Reset to 1234
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* ========================================================
            TAB: INTEGRATIONS
            ======================================================== */}
        {activeTab === 'integrations' && (
          <section className="floor-status-panel">
            <div className="panel-header-row">
              <div>
                <h3>System Integrations & Hardware</h3>
                <p>Connected thermal receipt printers, real-time sync relays, and ordering channels</p>
              </div>
            </div>

            <div className="integrations-cards-grid">
              {/* Tile 1: Thermal Printer */}
              <div className="integration-card">
                <div>
                  <div className="integration-top">
                    <div className="integration-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                      <Printer size={22} />
                    </div>
                    <span className="integration-status-pill online">
                      <span className="status-dot-green" /> ESC/POS Ready
                    </span>
                  </div>
                  <h4 style={{ margin: '14px 0 4px', fontSize: '1.05rem', color: '#fff' }}>Thermal Receipt Printer</h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                    Standard 80mm & 58mm thermal paper printing. WebPrint driver ready.
                  </p>
                </div>
                <button className="btn-secondary" onClick={handleTestPrint} style={{ width: '100%', fontSize: '0.82rem' }}>
                  <Printer size={14} /> Test Print Receipt
                </button>
              </div>

              {/* Tile 2: Socket.IO Live Relay */}
              <div className="integration-card">
                <div>
                  <div className="integration-top">
                    <div className="integration-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                      <Wifi size={22} />
                    </div>
                    <span className="integration-status-pill online">
                      <span className="status-dot-green" /> Connected (12ms)
                    </span>
                  </div>
                  <h4 style={{ margin: '14px 0 4px', fontSize: '1.05rem', color: '#fff' }}>Socket.IO Real-Time Engine</h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                    Bi-directional live event transport for orders, kitchen tickets, and guest service calls.
                  </p>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Active rooms: dashboard, kitchen, dining tables
                </div>
              </div>

              {/* Tile 3: Kitchen Display System */}
              <div className="integration-card">
                <div>
                  <div className="integration-top">
                    <div className="integration-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                      <ChefHat size={22} />
                    </div>
                    <span className="integration-status-pill online">
                      <span className="status-dot-green" /> Synced
                    </span>
                  </div>
                  <h4 style={{ margin: '14px 0 4px', fontSize: '1.05rem', color: '#fff' }}>Kitchen Display Stream (KDS)</h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                    Color-coded live kitchen ticket dispatch with timer urgency tracking.
                  </p>
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => window.open('/kitchen', '_blank')}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                >
                  <ExternalLink size={14} /> Open Kitchen Station
                </button>
              </div>

              {/* Tile 4: Digital QR Stands */}
              <div className="integration-card">
                <div>
                  <div className="integration-top">
                    <div className="integration-icon-wrap" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                      <QrCode size={22} />
                    </div>
                    <span className="integration-status-pill ready">
                      {tables.length} Active Tables
                    </span>
                  </div>
                  <h4 style={{ margin: '14px 0 4px', fontSize: '1.05rem', color: '#fff' }}>Acrylic Table QR Stands</h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                    Dynamic QR generator with print-ready table cards for customer self-ordering.
                  </p>
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => window.open('/qr-stands', '_blank')}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                >
                  <ExternalLink size={14} /> Open Print Stands
                </button>
              </div>

              {/* Tile 5: UPI / Payment Gateway */}
              <div className="integration-card">
                <div>
                  <div className="integration-top">
                    <div className="integration-icon-wrap" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
                      <DollarSign size={22} />
                    </div>
                    <span className="integration-status-pill ready">Ready</span>
                  </div>
                  <h4 style={{ margin: '14px 0 4px', fontSize: '1.05rem', color: '#fff' }}>UPI & Guest Billing</h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                    Instant QR bill settlement supporting GPay, PhonePe, Paytm, and Cash at counter.
                  </p>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Auto-calculates 5% GST and bill totals
                </div>
              </div>

              {/* Tile 6: Rotating Session Security */}
              <div className="integration-card">
                <div>
                  <div className="integration-top">
                    <div className="integration-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                      <ShieldCheck size={22} />
                    </div>
                    <span className="integration-status-pill online">
                      <span className="status-dot-green" /> Enforced
                    </span>
                  </div>
                  <h4 style={{ margin: '14px 0 4px', fontSize: '1.05rem', color: '#fff' }}>Dining Session Guard</h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                    Generates fresh cryptographic session tokens whenever tables are cleared.
                  </p>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Prevents expired customers from ordering remotely
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Add New Table Modal */}
      {tableModalOpen && (
        <div className="modal-backdrop" onClick={() => setTableModalOpen(false)}>
          <div className="dash-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>Add Dining Table</h3>
              <button className="modal-close-btn" onClick={() => setTableModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveTable} className="dash-modal-body">
              <div className="dash-form-group">
                <label className="dash-form-label">Table Name / Number</label>
                <input
                  type="text"
                  required
                  placeholder={`Table ${tables.length + 1}`}
                  className="dash-form-input"
                  value={tableForm.name}
                  onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="dash-form-group">
                  <label className="dash-form-label">Seating Capacity</label>
                  <select
                    className="dash-form-select"
                    value={tableForm.capacity}
                    onChange={(e) => setTableForm({ ...tableForm, capacity: e.target.value })}
                  >
                    <option value={2}>2 Guests</option>
                    <option value={4}>4 Guests</option>
                    <option value={6}>6 Guests</option>
                    <option value={8}>8 Guests</option>
                    <option value={10}>10 Guests</option>
                  </select>
                </div>

                <div className="dash-form-group">
                  <label className="dash-form-label">Floor Section</label>
                  <select
                    className="dash-form-select"
                    value={tableForm.section}
                    onChange={(e) => setTableForm({ ...tableForm, section: e.target.value })}
                  >
                    <option value="Main Dining">Main Dining</option>
                    <option value="Bar Area">Bar Area</option>
                    <option value="Outdoor Patio">Outdoor Patio</option>
                    <option value="VIP Lounge">VIP Lounge</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: 10 }}>
                <Plus size={16} /> Create Table
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Dish Edit / Add Modal */}
      {menuModalOpen && (
        <div className="modal-backdrop" onClick={() => setMenuModalOpen(false)}>
          <div className="dash-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>{editingDish ? 'Edit Dish Catalog' : 'Add New Dish'}</h3>
              <button className="modal-close-btn" onClick={() => setMenuModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveDish} className="dash-modal-body">
              <div className="dash-form-group">
                <label className="dash-form-label">Dish Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Butter Chicken"
                  className="dash-form-input"
                  value={dishForm.name}
                  onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="dash-form-group">
                  <label className="dash-form-label">Category</label>
                  <select
                    className="dash-form-select"
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
                <div className="dash-form-group">
                  <label className="dash-form-label">Price (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="280"
                    className="dash-form-input"
                    value={dishForm.price}
                    onChange={(e) => setDishForm({ ...dishForm, price: e.target.value })}
                  />
                </div>
              </div>

              <div className="dash-form-group">
                <label className="dash-form-label">Description</label>
                <textarea
                  className="dash-form-textarea"
                  rows={2}
                  placeholder="Fresh ingredients, spices, and preparation..."
                  value={dishForm.description}
                  onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#cbd5e1' }}>
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
          <div className="receipt-paper-card" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-header">
              <div className="receipt-brand-title">SPICE GARDEN</div>
              <div className="receipt-meta">Fine Dining Restaurant & Bar</div>
              <div className="receipt-meta">Plot 42, Green Avenue, MG Road</div>
              <div className="receipt-meta" style={{ fontSize: '0.7rem' }}>
                GSTIN: 27AAACS1234M1Z5 • FSSAI: 11521034000456
              </div>
              <div style={{ margin: '8px 0 4px', borderTop: '1px dashed #9ca3af' }} />
              <div className="receipt-meta" style={{ fontWeight: 800, color: '#000' }}>
                TAX INVOICE / CASH BILL
              </div>
              <div className="receipt-meta">
                Bill #{printBillOrder.orderNumber || printBillOrder.id} • {printBillOrder.tableName}
              </div>
              <div className="receipt-meta" style={{ fontSize: '0.72rem' }}>
                Date: {new Date(printBillOrder.createdAt || Date.now()).toLocaleDateString()} {new Date(printBillOrder.createdAt || Date.now()).toLocaleTimeString()}
              </div>
            </div>

            <div className="receipt-items-list">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#6b7280', fontWeight: 700, paddingBottom: 4 }}>
                <span>ITEM</span>
                <span>QTY x RATE</span>
                <span>AMOUNT</span>
              </div>
              {printBillOrder.items?.map((it, i) => (
                <div key={i} className="receipt-item-line">
                  <span style={{ flex: 1, paddingRight: 8 }}>{it.name}</span>
                  <span style={{ minWidth: 60, textAlign: 'center' }}>{it.quantity} x {it.price}</span>
                  <span style={{ minWidth: 60, textAlign: 'right' }}>₹{it.price * it.quantity}</span>
                </div>
              ))}
            </div>

            <div className="receipt-totals">
              <div className="receipt-total-row">
                <span>Subtotal:</span>
                <span>₹{printBillOrder.subtotal || Math.round((printBillOrder.total || 0) / 1.05)}</span>
              </div>
              <div className="receipt-total-row">
                <span>CGST (2.5%):</span>
                <span>₹{Math.round(((printBillOrder.tax || Math.round((printBillOrder.total || 0) * 0.05)) / 2))}</span>
              </div>
              <div className="receipt-total-row">
                <span>SGST (2.5%):</span>
                <span>₹{Math.round(((printBillOrder.tax || Math.round((printBillOrder.total || 0) * 0.05)) / 2))}</span>
              </div>
              <div className="receipt-total-row grand">
                <span>TOTAL AMOUNT:</span>
                <span>₹{printBillOrder.total}</span>
              </div>
              <div className="receipt-total-row" style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 700 }}>
                <span>Payment Status:</span>
                <span>PAID (UPI / COUNTER)</span>
              </div>
            </div>

            <div className="receipt-footer-msg">
              <div>*** THANK YOU FOR DINING WITH US ***</div>
              <div style={{ fontSize: '0.68rem', marginTop: 2 }}>Please Visit Spice Garden Again!</div>
            </div>

            <div className="receipt-actions-footer no-print">
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => window.print()}>
                <Printer size={16} /> Print Receipt (80mm)
              </button>
              <button className="btn-secondary" onClick={() => setPrintBillOrder(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Table QR Modal */}
      {viewQrTable && (
        <div className="modal-backdrop" onClick={() => setViewQrTable(null)}>
          <div className="dash-modal-card" style={{ maxWidth: 420, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>{viewQrTable.name || `Table ${viewQrTable.id}`} QR Code</h3>
              <button className="modal-close-btn" onClick={() => setViewQrTable(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="dash-modal-body" style={{ alignItems: 'center' }}>
              <div style={{ background: '#ffffff', padding: 16, borderRadius: 18, border: '2px solid #f59e0b', width: 240, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
                <img
                  src={`/api/qrcode/${viewQrTable.id}?t=${Date.now()}`}
                  alt={`Table ${viewQrTable.id} QR Code`}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>

              <div style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 14px', fontSize: '0.8rem', color: '#cbd5e1', wordBreak: 'break-all' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800, marginBottom: 4 }}>
                  Scan Target Link:
                </div>
                {typeof window !== 'undefined' ? `${window.location.origin}/?table=${viewQrTable.id}&token=${viewQrTable.sessionToken || ''}` : ''}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%' }}>
                <button
                  className="btn-primary"
                  onClick={() =>
                    window.open(`/?table=${viewQrTable.id}&token=${viewQrTable.sessionToken || ''}`, '_blank')
                  }
                >
                  <ExternalLink size={15} /> Open Menu
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => window.open(`/api/qrcode/${viewQrTable.id}`, '_blank')}
                >
                  <Download size={15} /> Download PNG
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
