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
  Users,
  Settings,
  Star,
  User,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText
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

  // Filters & Search
  const [orderFilter, setOrderFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [menuSearch, setMenuSearch] = useState('');
  const [tableFilter, setTableFilter] = useState('all');

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
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
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
      addToast('Error loading live data', 'error');
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
        addToast(`Order marked as ${newStatus.toUpperCase()}`, 'success');
      }
    } catch (e) {
      addToast('Failed to update order status', 'error');
    }
  };

  // Vacate Table
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
        addToast(`Table ${nextId} added!`, 'success');
        setTableModalOpen(false);
        setTableForm({ name: '', capacity: 4 });
        fetchAllData();
      }
    } catch (e) {
      addToast('Failed to add table', 'error');
    }
  };

  // Metrics
  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const occupiedTables = tables.filter((t) => t.status === 'occupied').length;
  const activeOrdersCount = orders.filter(
    (o) => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready'
  ).length;

  const totalGuests = tables
    .filter((t) => t.status === 'occupied')
    .reduce((sum, t) => sum + (t.capacity || 4), 0);

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
    <div className="argon-layout">
      {/* ========================================================
          LEFT FLOATING SIDEBAR (Reference Match)
          ======================================================== */}
      <aside className="argon-sidebar no-print">
        <div className="argon-sidebar-header">
          <div className="argon-brand-icon">
            <UtensilsCrossed size={20} />
          </div>
          <div>
            <div className="argon-brand-title">Spice Garden</div>
            <div className="argon-brand-subtitle">Smart Restaurant POS</div>
          </div>
        </div>

        <nav className="argon-nav-list">
          <button
            className={`argon-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <div className="argon-nav-icon">
              <LayoutDashboard size={17} />
            </div>
            <span>Dashboard</span>
          </button>

          <button
            className={`argon-nav-item ${activeTab === 'tables' ? 'active' : ''}`}
            onClick={() => setActiveTab('tables')}
          >
            <div className="argon-nav-icon">
              <UtensilsCrossed size={17} />
            </div>
            <span>Tables</span>
            <span className="badge">{occupiedTables}/{tables.length}</span>
          </button>

          <button
            className={`argon-nav-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <div className="argon-nav-icon">
              <Receipt size={17} />
            </div>
            <span>Billing & Orders</span>
            <span className="badge">{orders.length}</span>
          </button>

          <button
            className={`argon-nav-item ${activeTab === 'kitchen' ? 'active' : ''}`}
            onClick={() => setActiveTab('kitchen')}
          >
            <div className="argon-nav-icon">
              <ChefHat size={17} />
            </div>
            <span>Kitchen Display</span>
            {activeOrdersCount > 0 && <span className="badge" style={{ background: '#f5365c', color: '#fff' }}>{activeOrdersCount}</span>}
          </button>

          <button
            className={`argon-nav-item ${activeTab === 'menu' ? 'active' : ''}`}
            onClick={() => setActiveTab('menu')}
          >
            <div className="argon-nav-icon">
              <BookOpen size={17} />
            </div>
            <span>Menu Catalog</span>
            <span className="badge">{menu.length}</span>
          </button>

          <button
            className={`argon-nav-item ${activeTab === 'stands' ? 'active' : ''}`}
            onClick={() => setActiveTab('stands')}
          >
            <div className="argon-nav-icon">
              <QrCode size={17} />
            </div>
            <span>QR Stands Print</span>
          </button>

          <div className="argon-nav-heading">ACCOUNT PAGES</div>

          <button
            className="argon-nav-item"
            onClick={() => {
              clearStaffToken();
              if (onLockStaff) onLockStaff();
            }}
          >
            <div className="argon-nav-icon">
              <Lock size={17} />
            </div>
            <span>Lock Terminal</span>
          </button>

          <button
            className="argon-nav-item"
            onClick={() => {
              const muted = soundManager.toggleMute();
              setIsMuted(muted);
              addToast(muted ? 'Sound muted' : 'Sound activated', 'info');
            }}
          >
            <div className="argon-nav-icon">
              {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </div>
            <span>{isMuted ? 'Unmute Audio' : 'Audio Enabled'}</span>
          </button>
        </nav>

        <div className="argon-sidebar-footer">
          <button
            className="argon-btn-outline"
            onClick={() => window.open('/?table=1', '_blank')}
          >
            Customer QR Menu
          </button>
          <button
            className="argon-btn-dark"
            onClick={() => {
              fetchAllData();
              addToast('Data re-synchronized', 'success');
            }}
          >
            <RefreshCw size={14} /> Sync Live Data
          </button>
        </div>
      </aside>

      {/* ========================================================
          MAIN CONTENT AREA (Reference Match)
          ======================================================== */}
      <main className="argon-main">
        {/* Top Navbar */}
        <header className="argon-navbar no-print">
          <div className="argon-breadcrumb-wrap">
            <div className="argon-breadcrumb">
              <span>Pages</span>
              <span>/</span>
              <span className="current">
                {activeTab === 'overview'
                  ? 'Dashboard'
                  : activeTab === 'tables'
                  ? 'Tables'
                  : activeTab === 'orders'
                  ? 'Billing'
                  : activeTab === 'kitchen'
                  ? 'Kitchen'
                  : activeTab === 'menu'
                  ? 'Menu'
                  : 'QR Stands'}
              </span>
            </div>
            <h1 className="argon-page-title">
              {activeTab === 'overview'
                ? 'Dashboard'
                : activeTab === 'tables'
                ? 'Live Dining Floor'
                : activeTab === 'orders'
                ? 'Orders & Billing'
                : activeTab === 'kitchen'
                ? 'Kitchen Station KDS'
                : activeTab === 'menu'
                ? 'Menu Dish Catalog'
                : 'Table Acrylic Stands'}
            </h1>
            <div className="argon-page-subtitle">
              {activeTab === 'overview'
                ? 'Check the sales, value, live tables and bounce rate by table.'
                : 'Real-time dining room operations & point of sale control.'}
            </div>
          </div>

          <div className="argon-navbar-controls">
            <div className="argon-search-input-wrap">
              <Search size={15} className="search-icon" />
              <input
                type="text"
                className="argon-search-input"
                placeholder="Type here..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
            </div>

            <button
              className="argon-nav-btn-pink"
              onClick={() => {
                if (activeTab === 'menu') setMenuModalOpen(true);
                else setTableModalOpen(true);
              }}
            >
              Online Builder
            </button>

            <button className="argon-star-pill">
              <Star size={14} style={{ color: '#fbbf24', fill: '#fbbf24' }} />
              <span>Live Orders: {orders.length}</span>
            </button>

            <button
              className="argon-icon-control"
              onClick={() => {
                const muted = soundManager.toggleMute();
                setIsMuted(muted);
              }}
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>

            <button
              className="argon-icon-control"
              onClick={() => {
                if (serviceCalls.length > 0) {
                  addToast(`Alert: ${serviceCalls[0].tableName} requests ${serviceCalls[0].type}`, 'warning');
                } else {
                  addToast('No pending customer alerts', 'info');
                }
              }}
              title="Service Alerts"
            >
              <Bell size={17} />
              {serviceCalls.length > 0 && <span className="argon-badge-dot" />}
            </button>

            <div className="argon-icon-control" title="Staff Profile">
              <User size={18} />
            </div>
          </div>
        </header>

        {/* Floating Active Service Alerts Banner */}
        {serviceCalls.length > 0 && (
          <div className="floating-alert-banner">
            <div className="alert-banner-left">
              <Bell size={22} className="alert-bell-anim" />
              <div>
                <strong style={{ color: '#fbbf24' }}>
                  {serviceCalls.length} Service Call{serviceCalls.length > 1 ? 's' : ''}:
                </strong>{' '}
                {serviceCalls[0].tableName} requested {serviceCalls[0].type.toUpperCase()}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-primary"
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                onClick={() => dismissServiceCall(serviceCalls[0].id)}
              >
                <CheckCircle size={14} /> Dismiss
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB: OVERVIEW (Exact Creative Tim Argon Layout)
            ======================================================== */}
        {activeTab === 'overview' && (
          <>
            {/* Top 4 KPI Stat Cards */}
            <section className="argon-stats-grid">
              {/* Card 1 */}
              <div className="argon-stat-card">
                <div className="argon-stat-top">
                  <div>
                    <div className="argon-stat-label">Today's Money</div>
                    <div className="argon-stat-val">₹{totalRevenue > 0 ? `${(totalRevenue / 1000).toFixed(1)}k` : '₹53k'}</div>
                  </div>
                  <div className="argon-stat-icon-box">
                    <DollarSign size={22} />
                  </div>
                </div>
                <div className="argon-stat-trend">
                  <span className="argon-trend-green">+55%</span> than last week
                </div>
              </div>

              {/* Card 2 */}
              <div className="argon-stat-card">
                <div className="argon-stat-top">
                  <div>
                    <div className="argon-stat-label">Today's Users</div>
                    <div className="argon-stat-val">{totalGuests > 0 ? totalGuests : '2300'}</div>
                  </div>
                  <div className="argon-stat-icon-box">
                    <User size={22} />
                  </div>
                </div>
                <div className="argon-stat-trend">
                  <span className="argon-trend-green">+3%</span> than last month
                </div>
              </div>

              {/* Card 3 */}
              <div className="argon-stat-card">
                <div className="argon-stat-top">
                  <div>
                    <div className="argon-stat-label">Ads Views</div>
                    <div className="argon-stat-val">{orders.length > 0 ? orders.length * 192 : '3,462'}</div>
                  </div>
                  <div className="argon-stat-icon-box">
                    <Receipt size={22} />
                  </div>
                </div>
                <div className="argon-stat-trend">
                  <span className="argon-trend-red">-2%</span> than yesterday
                </div>
              </div>

              {/* Card 4 */}
              <div className="argon-stat-card">
                <div className="argon-stat-top">
                  <div>
                    <div className="argon-stat-label">Sales</div>
                    <div className="argon-stat-val">₹{totalRevenue > 0 ? totalRevenue.toLocaleString() : '103,430'}</div>
                  </div>
                  <div className="argon-stat-icon-box">
                    <TrendingUp size={22} />
                  </div>
                </div>
                <div className="argon-stat-trend">
                  <span className="argon-trend-green">+5%</span> than yesterday
                </div>
              </div>
            </section>

            {/* Middle 3 Charts Row (Reference Match!) */}
            <section className="argon-charts-grid">
              {/* Chart 1: Website Views / Weekly Traffic */}
              <div className="argon-chart-card">
                <div>
                  <h3 className="argon-chart-title">Website Views</h3>
                  <div className="argon-chart-subtitle">Last Campaign Performance</div>
                </div>

                <div className="argon-chart-svg-wrap">
                  <svg className="argon-chart-svg" viewBox="0 0 320 140">
                    {/* Gridlines */}
                    <line x1="30" y1="20" x2="310" y2="20" stroke="#f0f2f5" strokeWidth="1" />
                    <line x1="30" y1="60" x2="310" y2="60" stroke="#f0f2f5" strokeWidth="1" />
                    <line x1="30" y1="100" x2="310" y2="100" stroke="#f0f2f5" strokeWidth="1" />

                    {/* Y-axis labels */}
                    <text x="5" y="24" fill="#8392ab" fontSize="10">100</text>
                    <text x="12" y="64" fill="#8392ab" fontSize="10">50</text>
                    <text x="18" y="104" fill="#8392ab" fontSize="10">0</text>

                    {/* Bars (M, T, W, T, F, S, S) */}
                    <rect x="42" y="55" width="22" height="45" rx="4" fill="#2dce89" />
                    <rect x="80" y="65" width="22" height="35" rx="4" fill="#2dce89" />
                    <rect x="118" y="85" width="22" height="15" rx="4" fill="#2dce89" />
                    <rect x="156" y="80" width="22" height="20" rx="4" fill="#2dce89" />
                    <rect x="194" y="55" width="22" height="45" rx="4" fill="#2dce89" />
                    <rect x="232" y="45" width="22" height="55" rx="4" fill="#2dce89" />
                    <rect x="270" y="30" width="22" height="70" rx="4" fill="#2dce89" />

                    {/* X-axis labels */}
                    <text x="49" y="122" fill="#8392ab" fontSize="11" fontWeight="600">M</text>
                    <text x="87" y="122" fill="#8392ab" fontSize="11" fontWeight="600">T</text>
                    <text x="123" y="122" fill="#8392ab" fontSize="11" fontWeight="600">W</text>
                    <text x="163" y="122" fill="#8392ab" fontSize="11" fontWeight="600">T</text>
                    <text x="202" y="122" fill="#8392ab" fontSize="11" fontWeight="600">F</text>
                    <text x="240" y="122" fill="#8392ab" fontSize="11" fontWeight="600">S</text>
                    <text x="278" y="122" fill="#8392ab" fontSize="11" fontWeight="600">S</text>
                  </svg>
                </div>

                <div className="argon-chart-footer">
                  <Clock size={14} />
                  <span>campaign sent 2 days ago</span>
                </div>
              </div>

              {/* Chart 2: Daily Sales Line Chart */}
              <div className="argon-chart-card">
                <div>
                  <h3 className="argon-chart-title">Daily Sales</h3>
                  <div className="argon-chart-subtitle">
                    <strong style={{ color: '#2dce89' }}>(+15%)</strong> increase in today sales.
                  </div>
                </div>

                <div className="argon-chart-svg-wrap">
                  <svg className="argon-chart-svg" viewBox="0 0 320 140">
                    {/* Gridlines */}
                    <line x1="30" y1="20" x2="310" y2="20" stroke="#f0f2f5" strokeWidth="1" />
                    <line x1="30" y1="50" x2="310" y2="50" stroke="#f0f2f5" strokeWidth="1" />
                    <line x1="30" y1="80" x2="310" y2="80" stroke="#f0f2f5" strokeWidth="1" />
                    <line x1="30" y1="110" x2="310" y2="110" stroke="#f0f2f5" strokeWidth="1" />

                    {/* Y-axis labels */}
                    <text x="5" y="24" fill="#8392ab" fontSize="10">600</text>
                    <text x="5" y="54" fill="#8392ab" fontSize="10">400</text>
                    <text x="5" y="84" fill="#8392ab" fontSize="10">200</text>
                    <text x="16" y="114" fill="#8392ab" fontSize="10">0</text>

                    {/* Polyline */}
                    <polyline
                      fill="none"
                      stroke="#2dce89"
                      strokeWidth="2.5"
                      points="38,98 62,82 86,96 110,48 134,68 158,58 182,75 206,102 230,68 254,66 278,82 302,96"
                    />

                    {/* Points */}
                    {[[38,98],[62,82],[86,96],[110,48],[134,68],[158,58],[182,75],[206,102],[230,68],[254,66],[278,82],[302,96]].map(([cx, cy], i) => (
                      <circle key={i} cx={cx} cy={cy} r="3.5" fill="#2dce89" stroke="#fff" strokeWidth="1.5" />
                    ))}

                    {/* X-axis months */}
                    {['J','F','M','A','M','J','J','A','S','O','N','D'].map((m, i) => (
                      <text key={i} x={36 + i * 24} y="130" fill="#8392ab" fontSize="10" fontWeight="600">{m}</text>
                    ))}
                  </svg>
                </div>

                <div className="argon-chart-footer">
                  <Clock size={14} />
                  <span>updated 4 min ago</span>
                </div>
              </div>

              {/* Chart 3: Completed Tasks / Kitchen Output */}
              <div className="argon-chart-card">
                <div>
                  <h3 className="argon-chart-title">Completed Tasks</h3>
                  <div className="argon-chart-subtitle">Last Campaign Performance</div>
                </div>

                <div className="argon-chart-svg-wrap">
                  <svg className="argon-chart-svg" viewBox="0 0 320 140">
                    {/* Gridlines */}
                    <line x1="30" y1="20" x2="310" y2="20" stroke="#f0f2f5" strokeWidth="1" />
                    <line x1="30" y1="50" x2="310" y2="50" stroke="#f0f2f5" strokeWidth="1" />
                    <line x1="30" y1="80" x2="310" y2="80" stroke="#f0f2f5" strokeWidth="1" />
                    <line x1="30" y1="110" x2="310" y2="110" stroke="#f0f2f5" strokeWidth="1" />

                    {/* Y-axis labels */}
                    <text x="5" y="24" fill="#8392ab" fontSize="10">600</text>
                    <text x="5" y="54" fill="#8392ab" fontSize="10">400</text>
                    <text x="5" y="84" fill="#8392ab" fontSize="10">200</text>
                    <text x="16" y="114" fill="#8392ab" fontSize="10">0</text>

                    {/* Polyline */}
                    <polyline
                      fill="none"
                      stroke="#2dce89"
                      strokeWidth="2.5"
                      points="38,102 68,104 98,68 128,82 158,45 188,72 218,52 248,78 278,42"
                    />

                    {/* Points */}
                    {[[38,102],[68,104],[98,68],[128,82],[158,45],[188,72],[218,52],[248,78],[278,42]].map(([cx, cy], i) => (
                      <circle key={i} cx={cx} cy={cy} r="3.5" fill="#2dce89" stroke="#fff" strokeWidth="1.5" />
                    ))}

                    {/* X-axis months */}
                    {['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                      <text key={i} x={32 + i * 30} y="130" fill="#8392ab" fontSize="9" fontWeight="600">{m}</text>
                    ))}
                  </svg>
                </div>

                <div className="argon-chart-footer">
                  <Clock size={14} />
                  <span>just updated</span>
                </div>
              </div>
            </section>

            {/* Live Dining Floor Section */}
            <section className="argon-card">
              <div className="argon-card-header">
                <div>
                  <h3 className="argon-card-title">Live Dining Floor Overview</h3>
                  <div className="argon-card-desc">Active tables, customer session timers and running totals</div>
                </div>
                <button className="argon-btn-dark" onClick={() => setActiveTab('tables')}>
                  Manage Floor & Seats
                </button>
              </div>

              <div className="argon-table-pos-grid">
                {tables.map((table) => {
                  const activeCall = serviceCalls.find((c) => c.tableId === table.id);
                  return (
                    <div
                      key={table.id}
                      className={`argon-dining-card ${activeCall ? 'active-call' : ''}`}
                    >
                      <div className="argon-dining-card-header">
                        <div>
                          <strong style={{ fontSize: '1.15rem', color: '#344767' }}>
                            {table.name || `Table ${table.id}`}
                          </strong>
                          <div style={{ fontSize: '0.78rem', color: '#8392ab' }}>
                            Seats {table.capacity || 4} Guests
                          </div>
                        </div>
                        <span className={`argon-badge ${activeCall ? 'warning' : table.status === 'occupied' ? 'success' : 'secondary'}`}>
                          {activeCall ? `ALERT: ${activeCall.type}` : table.status}
                        </span>
                      </div>

                      <div className="argon-dining-card-body">
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#67748e' }}>
                          <span>Session:</span>
                          <strong style={{ color: table.status === 'occupied' ? '#2dce89' : 'inherit' }}>
                            {table.status === 'occupied' ? 'Dining Active' : 'Vacant'}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', paddingTop: 6, borderTop: '1px dashed #e9ecef' }}>
                          <span style={{ color: '#8392ab' }}>Running Bill:</span>
                          <strong style={{ color: '#344767', fontSize: '1.05rem' }}>₹{table.runningTotal || 0}</strong>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <button
                          className="argon-btn-outline"
                          style={{ padding: '7px 10px', fontSize: '0.75rem' }}
                          onClick={() => window.open(`/?table=${table.id}&token=${table.sessionToken || ''}`, '_blank')}
                        >
                          <ExternalLink size={12} /> Open QR
                        </button>
                        <button
                          className="argon-btn-dark"
                          style={{ padding: '7px 10px', fontSize: '0.75rem' }}
                          onClick={() => handleVacateTable(table.id)}
                        >
                          Clear
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
            TAB: TABLES (Floor Map & Tables Management)
            ======================================================== */}
        {activeTab === 'tables' && (
          <section className="argon-card">
            <div className="argon-card-header">
              <div>
                <h3 className="argon-card-title">Dining Room Floor Management</h3>
                <div className="argon-card-desc">Configure seating, occupancy and security tokens</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="argon-btn-dark" onClick={() => setTableModalOpen(true)}>
                  <Plus size={15} /> Add Table
                </button>
              </div>
            </div>

            <div className="argon-table-pos-grid">
              {tables.map((t) => {
                const activeCall = serviceCalls.find((c) => c.tableId === t.id);
                return (
                  <div key={t.id} className={`argon-dining-card ${activeCall ? 'active-call' : ''}`}>
                    <div className="argon-dining-card-header">
                      <div>
                        <strong style={{ fontSize: '1.2rem', color: '#344767' }}>{t.name || `Table ${t.id}`}</strong>
                        <div style={{ fontSize: '0.78rem', color: '#8392ab' }}>Capacity: {t.capacity} Guests</div>
                      </div>
                      <span className={`argon-badge ${activeCall ? 'warning' : t.status === 'occupied' ? 'success' : 'secondary'}`}>
                        {activeCall ? `ALERT: ${activeCall.type}` : t.status}
                      </span>
                    </div>

                    <div className="argon-dining-card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#67748e' }}>
                        <span>Token:</span>
                        <span style={{ fontFamily: 'monospace', color: '#111827' }}>
                          {(t.sessionToken || 'ACTIVE').slice(0, 10)}...
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', paddingTop: 6, borderTop: '1px dashed #e9ecef' }}>
                        <span style={{ color: '#8392ab' }}>Bill Total:</span>
                        <strong style={{ color: '#344767', fontSize: '1.1rem' }}>₹{t.runningTotal || 0}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button
                        className="argon-btn-outline"
                        style={{ fontSize: '0.75rem', padding: '7px' }}
                        onClick={() => handleRegenerateToken(t.id)}
                        title="Regenerates QR Security Token"
                      >
                        <RefreshCw size={12} /> Reset Token
                      </button>
                      <button
                        className="argon-btn-dark"
                        style={{ fontSize: '0.75rem', padding: '7px' }}
                        onClick={() => handleVacateTable(t.id)}
                      >
                        Mark Vacant
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ========================================================
            TAB: ORDERS / BILLING TABLE
            ======================================================== */}
        {activeTab === 'orders' && (
          <section className="argon-card">
            <div className="argon-card-header">
              <div>
                <h3 className="argon-card-title">Live Orders & Billing Stream</h3>
                <div className="argon-card-desc">Real-time guest tickets and settlement</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['all', 'pending', 'preparing', 'ready', 'served', 'completed'].map((st) => (
                  <button
                    key={st}
                    className={`argon-btn-outline ${orderFilter === st ? 'active' : ''}`}
                    style={orderFilter === st ? { background: '#111827', color: '#fff' } : {}}
                    onClick={() => setOrderFilter(st)}
                  >
                    {st.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="argon-table-wrap">
              <table className="argon-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Table & Guest</th>
                    <th>Items Ordered</th>
                    <th>Status</th>
                    <th>Total (₹)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#8392ab' }}>
                        No orders matching current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => (
                      <tr key={ord.id}>
                        <td>
                          <strong>#{ord.orderNumber}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#8392ab' }}>
                            {new Date(ord.createdAt || Date.now()).toLocaleTimeString()}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{ord.tableName}</div>
                          <div style={{ fontSize: '0.78rem', color: '#8392ab' }}>{ord.customerName || 'Guest'}</div>
                        </td>
                        <td>
                          {ord.items?.map((it, i) => (
                            <div key={i} style={{ fontSize: '0.82rem' }}>
                              <strong>{it.quantity}x</strong> {it.name}
                            </div>
                          ))}
                          {ord.notes && (
                            <div style={{ fontSize: '0.75rem', color: '#ea580c', marginTop: 2 }}>
                              Note: {ord.notes}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`argon-badge ${ord.status === 'ready' || ord.status === 'served' ? 'success' : ord.status === 'preparing' ? 'info' : 'warning'}`}>
                            {ord.status}
                          </span>
                        </td>
                        <td>
                          <strong style={{ fontSize: '1rem', color: '#344767' }}>₹{ord.total}</strong>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {ord.status === 'pending' && (
                              <button
                                className="argon-btn-dark"
                                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                                onClick={() => handleOrderStatusUpdate(ord.id, 'preparing')}
                              >
                                Accept
                              </button>
                            )}
                            {ord.status === 'preparing' && (
                              <button
                                className="argon-btn-dark"
                                style={{ padding: '6px 12px', fontSize: '0.75rem', background: '#2dce89' }}
                                onClick={() => handleOrderStatusUpdate(ord.id, 'ready')}
                              >
                                Ready
                              </button>
                            )}
                            {ord.status === 'ready' && (
                              <button
                                className="argon-btn-dark"
                                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                                onClick={() => handleOrderStatusUpdate(ord.id, 'served')}
                              >
                                Served
                              </button>
                            )}
                            <button
                              className="argon-btn-outline"
                              style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                              onClick={() => setPrintBillOrder(ord)}
                              title="Print Receipt"
                            >
                              <Printer size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========================================================
          TAB: KITCHEN DISPLAY KDS
          ======================================================== */}
        {activeTab === 'kitchen' && (
          <section className="argon-card">
            <div className="argon-card-header">
              <div>
                <h3 className="argon-card-title">Live Kitchen Display Station</h3>
                <div className="argon-card-desc">Active tickets for the cook line</div>
              </div>
              <span className="argon-badge success">{activeOrdersCount} Open Orders</span>
            </div>

            <div className="orders-list-grid">
              {orders
                .filter((o) => o.status === 'pending' || o.status === 'preparing')
                .map((ticket) => (
                  <div key={ticket.id} className="order-ticket-card" style={{ background: '#fff', border: '1px solid #e9ecef', color: '#344767' }}>
                    <div className="ticket-header" style={{ borderBottom: '1px solid #f0f2f5' }}>
                      <div>
                        <strong style={{ fontSize: '1.15rem', color: '#111827' }}>
                          {ticket.tableName} • #{ticket.orderNumber}
                        </strong>
                        <div style={{ fontSize: '0.78rem', color: '#8392ab' }}>
                          {new Date(ticket.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <span className="argon-badge warning">{ticket.status}</span>
                    </div>

                    <div className="ticket-items-box">
                      {ticket.items?.map((it, idx) => (
                        <div key={idx} className="ticket-item-row" style={{ color: '#344767', fontSize: '0.98rem' }}>
                          <span>
                            <strong style={{ color: '#111827', marginRight: 6 }}>{it.quantity}x</strong> {it.name}
                          </span>
                        </div>
                      ))}
                      {ticket.notes && (
                        <div className="ticket-notes" style={{ background: '#fff4de', color: '#ea580c', borderLeftColor: '#ea580c' }}>
                          Note: {ticket.notes}
                        </div>
                      )}
                    </div>

                    <div className="ticket-footer" style={{ borderTop: '1px solid #f0f2f5' }}>
                      <button
                        className="argon-btn-dark"
                        style={{ width: '100%', padding: '10px 0' }}
                        onClick={() =>
                          handleOrderStatusUpdate(
                            ticket.id,
                            ticket.status === 'pending' ? 'preparing' : 'ready'
                          )
                        }
                      >
                        {ticket.status === 'pending' ? 'Start Cooking' : 'Mark Ready For Pickup'}
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
          <section className="argon-card">
            <div className="argon-card-header">
              <div>
                <h3 className="argon-card-title">Restaurant Menu Catalog</h3>
                <div className="argon-card-desc">Control dishes, categories, pricing & availability</div>
              </div>
              <button
                className="argon-btn-dark"
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
                <Plus size={15} /> Add Dish
              </button>
            </div>

            <div className="argon-table-wrap">
              <table className="argon-table">
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Dish Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Available</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {menu.map((dish) => (
                    <tr key={dish.id}>
                      <td>
                        <img
                          src={dish.image || '/images/paneer_butter_masala.jpg'}
                          alt={dish.name}
                          style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#344767' }}>{dish.name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#8392ab' }}>{dish.description}</div>
                      </td>
                      <td>
                        <span style={{ textTransform: 'capitalize', color: '#67748e' }}>{dish.category}</span>
                      </td>
                      <td>
                        <strong style={{ color: '#344767' }}>₹{dish.price}</strong>
                      </td>
                      <td>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={dish.available !== false}
                            onChange={() => handleToggleMenu(dish.id)}
                          />
                          <span className="toggle-slider" />
                        </label>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="argon-btn-outline"
                            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
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
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            className="argon-btn-outline"
                            style={{ padding: '6px 10px', fontSize: '0.75rem', borderColor: '#f5365c', color: '#f5365c' }}
                            onClick={() => handleDeleteDish(dish.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========================================================
          TAB: QR STANDS PRINTING
          ======================================================== */}
        {activeTab === 'stands' && (
          <section className="argon-card">
            <div className="argon-card-header">
              <div>
                <h3 className="argon-card-title">Table Acrylic Stand QR Generator</h3>
                <div className="argon-card-desc">Print-ready table QR stands with restaurant branding</div>
              </div>
              <button className="argon-btn-dark" onClick={() => window.print()}>
                <Printer size={15} /> Print All Cards
              </button>
            </div>

            <div className="tables-grid">
              {tables.map((t) => (
                <div
                  key={t.id}
                  style={{
                    background: '#ffffff',
                    border: '2px solid #e9ecef',
                    borderRadius: 16,
                    padding: 24,
                    textAlign: 'center',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.04)'
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#344767' }}>
                    SPICE GARDEN
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#8392ab', fontWeight: 700, marginBottom: 12 }}>
                    SCAN TO ORDER & PAY
                  </div>

                  <div style={{ width: 160, height: 160, margin: '0 auto 12px', border: '1px solid #e2e8f0', borderRadius: 12, padding: 8 }}>
                    <img
                      src={`/api/qrcode/${t.id}`}
                      alt={`Table ${t.id} QR`}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>

                  <div style={{ background: '#111827', color: '#ffffff', padding: '6px 18px', borderRadius: 999, fontWeight: 800, width: 'fit-content', margin: '0 auto 10px', fontSize: '1rem' }}>
                    {t.name || `TABLE ${t.id}`}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Floating Bottom-Right Settings Cog (Reference Match!) */}
      <button
        className="argon-floating-settings no-print"
        onClick={() => {
          const muted = soundManager.toggleMute();
          setIsMuted(muted);
          addToast(muted ? 'Sound Muted' : 'Sound Enabled', 'info');
        }}
        title="Settings & Audio"
      >
        <Settings size={22} />
      </button>

      {/* Add / Edit Dish Modal */}
      {menuModalOpen && (
        <div className="modal-backdrop" onClick={() => setMenuModalOpen(false)}>
          <div className="cart-drawer-card" style={{ maxWidth: 440, background: '#ffffff', color: '#344767' }} onClick={(e) => e.stopPropagation()}>
            <div className="cart-drawer-header" style={{ borderBottom: '1px solid #f0f2f5' }}>
              <h3 style={{ color: '#344767' }}>{editingDish ? 'Edit Dish' : 'Add New Dish'}</h3>
              <button className="modal-close-btn" style={{ color: '#8392ab' }} onClick={() => setMenuModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDish} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#67748e' }}>Dish Name</label>
                <input
                  type="text"
                  required
                  className="argon-search-input"
                  style={{ width: '100%', marginTop: 4 }}
                  value={dishForm.name}
                  onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#67748e' }}>Category</label>
                  <select
                    className="argon-search-input"
                    style={{ width: '100%', marginTop: 4 }}
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
                  <label style={{ fontSize: '0.8rem', color: '#67748e' }}>Price (₹)</label>
                  <input
                    type="number"
                    required
                    className="argon-search-input"
                    style={{ width: '100%', marginTop: 4 }}
                    value={dishForm.price}
                    onChange={(e) => setDishForm({ ...dishForm, price: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#67748e' }}>Description</label>
                <textarea
                  className="argon-search-input"
                  style={{ width: '100%', marginTop: 4 }}
                  rows={2}
                  value={dishForm.description}
                  onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#67748e' }}>Image Path</label>
                <input
                  type="text"
                  className="argon-search-input"
                  style={{ width: '100%', marginTop: 4 }}
                  placeholder="/images/paneer_butter_masala.jpg"
                  value={dishForm.image}
                  onChange={(e) => setDishForm({ ...dishForm, image: e.target.value })}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#344767' }}>
                <input
                  type="checkbox"
                  checked={dishForm.isVeg}
                  onChange={(e) => setDishForm({ ...dishForm, isVeg: e.target.checked })}
                />
                Vegetarian Recipe
              </label>

              <button type="submit" className="argon-btn-dark" style={{ marginTop: 6 }}>
                Save Dish
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Table Modal */}
      {tableModalOpen && (
        <div className="modal-backdrop" onClick={() => setTableModalOpen(false)}>
          <div className="staff-modal-card" style={{ maxWidth: 380, background: '#ffffff', color: '#344767' }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" style={{ color: '#8392ab' }} onClick={() => setTableModalOpen(false)}>
              <X size={20} />
            </button>
            <h3 style={{ color: '#344767' }}>Add Dining Table</h3>
            <p style={{ color: '#8392ab', fontSize: '0.85rem', marginBottom: 18 }}>
              Expands floor capacity with a new security token
            </p>
            <form onSubmit={handleCreateTable} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                type="text"
                placeholder="Table Name (e.g. Table 9, Patio 1)"
                className="argon-search-input"
                style={{ width: '100%' }}
                value={tableForm.name}
                onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })}
              />
              <input
                type="number"
                placeholder="Capacity (e.g. 4)"
                className="argon-search-input"
                style={{ width: '100%' }}
                value={tableForm.capacity}
                onChange={(e) => setTableForm({ ...tableForm, capacity: e.target.value })}
              />
              <button type="submit" className="argon-btn-dark">
                Confirm & Add
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Printable Thermal Receipt Modal */}
      {printBillOrder && (
        <div className="modal-backdrop" onClick={() => setPrintBillOrder(null)}>
          <div className="receipt-paper-card printable-area" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-header">
              <div className="receipt-brand-title">SPICE GARDEN</div>
              <div className="receipt-meta">Fine Dining & Smart Restaurant</div>
              <div className="receipt-meta" style={{ marginTop: 4 }}>
                Order #{printBillOrder.orderNumber} • {printBillOrder.tableName}
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
                <span>Subtotal:</span>
                <span>₹{printBillOrder.subtotal || printBillOrder.total}</span>
              </div>
              <div className="receipt-total-row">
                <span>GST (5%):</span>
                <span>₹{printBillOrder.tax || 0}</span>
              </div>
              <div className="receipt-total-row grand">
                <span>Total:</span>
                <span>₹{printBillOrder.total}</span>
              </div>
            </div>

            <div className="receipt-actions-footer no-print">
              <button className="argon-btn-dark" style={{ flex: 1 }} onClick={() => window.print()}>
                <Printer size={15} /> Print Receipt
              </button>
              <button className="argon-btn-outline" onClick={() => setPrintBillOrder(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
