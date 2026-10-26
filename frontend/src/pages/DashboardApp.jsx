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
  AlertCircle
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
    id: '',
    name: '',
    capacity: 4
  });

  // Digital Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
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
      addToast('Error loading live dashboard data', 'error');
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
      // Refresh tables to reflect occupancy
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

  // Service Call Dismiss
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

  // Save Dish (Create or Update)
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

  // KPIs
  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const activeOrdersCount = orders.filter(
    (o) => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready'
  ).length;

  const occupiedTables = tables.filter((t) => t.status === 'occupied').length;
  const occupancyPercent = tables.length > 0 ? Math.round((occupiedTables / tables.length) * 100) : 0;
  const avgTicket = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;

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
      {/* Top Header */}
      <header className="dash-header">
        <div className="dash-header-left">
          <div className="dash-logo-badge">SG</div>
          <div className="dash-title-wrap">
            <h1>Spice Garden Command Center</h1>
            <p>Smart QR Dining & POS Operations</p>
          </div>
        </div>

        <div className="dash-header-center">
          <div className="live-clock-badge">
            <Clock size={16} /> {currentTime}
          </div>
          <div className="socket-indicator">
            <span className="socket-dot" /> Live Sync
          </div>
        </div>

        <div className="dash-header-right">
          <button
            className="btn-icon"
            onClick={() => {
              const muted = soundManager.toggleMute();
              setIsMuted(muted);
            }}
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <button
            className="btn-secondary"
            onClick={() => {
              clearStaffToken();
              if (onLockStaff) onLockStaff();
            }}
          >
            <Lock size={15} /> Lock POS
          </button>
        </div>
      </header>

      {/* Floating Active Service Alerts Banner */}
      {serviceCalls.length > 0 && (
        <div className="floating-alert-banner">
          <div className="alert-banner-left">
            <Bell size={22} className="alert-bell-anim" />
            <div>
              <strong style={{ color: '#fbbf24' }}>
                {serviceCalls.length} Pending Service Call{serviceCalls.length > 1 ? 's' : ''}:
              </strong>{' '}
              {serviceCalls[0].tableName} requests {serviceCalls[0].type.toUpperCase()}
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

      {/* Navigation Tabs */}
      <nav className="dash-nav-bar">
        <button
          className={`dash-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <LayoutDashboard size={17} /> Overview
        </button>
        <button
          className={`dash-tab-btn ${activeTab === 'tables' ? 'active' : ''}`}
          onClick={() => setActiveTab('tables')}
        >
          <UtensilsCrossed size={17} /> Live Tables ({tables.length})
        </button>
        <button
          className={`dash-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <Receipt size={17} /> Orders ({orders.length})
        </button>
        <button
          className={`dash-tab-btn ${activeTab === 'kitchen' ? 'active' : ''}`}
          onClick={() => setActiveTab('kitchen')}
        >
          <ChefHat size={17} /> Kitchen KDS ({activeOrdersCount})
        </button>
        <button
          className={`dash-tab-btn ${activeTab === 'menu' ? 'active' : ''}`}
          onClick={() => setActiveTab('menu')}
        >
          <BookOpen size={17} /> Menu Manager ({menu.length})
        </button>
        <button
          className={`dash-tab-btn ${activeTab === 'stands' ? 'active' : ''}`}
          onClick={() => setActiveTab('stands')}
        >
          <QrCode size={17} /> QR Stand Printing
        </button>
      </nav>

      {/* ========================================================
          TAB 1: OVERVIEW
          ======================================================== */}
      {activeTab === 'overview' && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon-wrap rev">₹</div>
              <div className="kpi-info-wrap">
                <h4>Today's Revenue</h4>
                <div className="kpi-value">₹{totalRevenue.toLocaleString()}</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-wrap ord">
                <Receipt size={22} />
              </div>
              <div className="kpi-info-wrap">
                <h4>Total Orders</h4>
                <div className="kpi-value">{orders.length}</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-wrap occ">
                <UtensilsCrossed size={22} />
              </div>
              <div className="kpi-info-wrap">
                <h4>Table Occupancy</h4>
                <div className="kpi-value">{occupancyPercent}%</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-wrap tkt">
                <Clock size={22} />
              </div>
              <div className="kpi-info-wrap">
                <h4>Avg Ticket Size</h4>
                <div className="kpi-value">₹{avgTicket}</div>
              </div>
            </div>
          </div>

          {/* Quick Tables Stream */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 14 }}>Live Dining Room Status</h3>
            <div className="tables-grid">
              {tables.map((table) => {
                const activeCall = serviceCalls.find((c) => c.tableId === table.id);
                return (
                  <div
                    key={table.id}
                    className={`table-pos-card ${activeCall ? 'status-calling' : ''}`}
                  >
                    <div className="table-card-top">
                      <span className="table-card-number">{table.name || `Table ${table.id}`}</span>
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
                        <span>Capacity: {table.capacity || 4} Guests</span>
                        <span>{table.currentOrderId ? `Order #${table.currentOrderId}` : 'No Order'}</span>
                      </div>
                      <div className="table-bill-row">
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Bill:</span>
                        <span className="table-bill-amount">₹{table.runningTotal || 0}</span>
                      </div>
                    </div>

                    <div className="table-card-actions">
                      <button
                        className="btn-secondary"
                        style={{ fontSize: '0.78rem', padding: '6px 10px' }}
                        onClick={() => window.open(`/?table=${table.id}&token=${table.sessionToken || ''}`, '_blank')}
                      >
                        <ExternalLink size={13} /> Open Menu
                      </button>
                      <button
                        className="btn-primary"
                        style={{ fontSize: '0.78rem', padding: '6px 10px' }}
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
          TAB 2: LIVE TABLES
          ======================================================== */}
      {activeTab === 'tables' && (
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
            <h3>Restaurant Floor & Tables</h3>
            <button className="btn-primary" onClick={() => setTableModalOpen(true)}>
              <Plus size={16} /> Add Table
            </button>
          </div>

          <div className="tables-grid">
            {tables.map((t) => (
              <div key={t.id} className="table-pos-card">
                <div className="table-card-top">
                  <div>
                    <div className="table-card-number">{t.name || `Table ${t.id}`}</div>
                    <div className="table-capacity">Seats {t.capacity} guests</div>
                  </div>
                  <span className={`status-pill ${t.status}`}>{t.status}</span>
                </div>

                <div className="table-card-body">
                  <div className="table-timer-row">
                    <span>Security Token:</span>
                    <span style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>
                      {(t.sessionToken || 'ACTIVE').slice(0, 10)}...
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
                    title="Regenerates QR Security Token"
                  >
                    <RefreshCw size={13} /> Reset Token
                  </button>
                  <button
                    className="btn-primary"
                    style={{ fontSize: '0.78rem' }}
                    onClick={() => handleVacateTable(t.id)}
                  >
                    Mark Vacant
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: ORDERS MANAGER
          ======================================================== */}
      {activeTab === 'orders' && (
        <div className="glass-panel" style={{ padding: 20 }}>
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

            <div className="search-input-box" style={{ maxWidth: 280 }}>
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search orders, table..."
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
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
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
                      <span>₹{it.price * it.quantity}</span>
                    </div>
                  ))}
                  {ord.notes && <div className="ticket-notes">Note: {ord.notes}</div>}
                </div>

                <div className="ticket-footer">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                    <span>Total Amount</span>
                    <span style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>
                      ₹{ord.total}
                    </span>
                  </div>

                  <div className="ticket-actions-row">
                    {ord.status === 'pending' && (
                      <button
                        className="btn-primary"
                        style={{ flex: 1, padding: 8, fontSize: '0.8rem' }}
                        onClick={() => handleOrderStatusUpdate(ord.id, 'preparing')}
                      >
                        Accept to Kitchen
                      </button>
                    )}
                    {ord.status === 'preparing' && (
                      <button
                        className="btn-primary"
                        style={{ flex: 1, padding: 8, fontSize: '0.8rem' }}
                        onClick={() => handleOrderStatusUpdate(ord.id, 'ready')}
                      >
                        Mark Ready
                      </button>
                    )}
                    {ord.status === 'ready' && (
                      <button
                        className="btn-primary"
                        style={{ flex: 1, padding: 8, fontSize: '0.8rem' }}
                        onClick={() => handleOrderStatusUpdate(ord.id, 'served')}
                      >
                        Mark Served
                      </button>
                    )}
                    <button
                      className="btn-secondary"
                      style={{ padding: '8px 12px' }}
                      onClick={() => setPrintBillOrder(ord)}
                      title="Print Bill Receipt"
                    >
                      <Printer size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4: KITCHEN KDS
          ======================================================== */}
      {activeTab === 'kitchen' && (
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
            <h3>Kitchen Display Stream</h3>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Real-time cook station tickets
            </span>
          </div>

          <div className="orders-list-grid">
            {orders
              .filter((o) => o.status === 'pending' || o.status === 'preparing')
              .map((ticket) => (
                <div key={ticket.id} className="order-ticket-card" style={{ borderColor: '#f59e0b' }}>
                  <div className="ticket-header" style={{ background: 'rgba(245,158,11,0.1)' }}>
                    <div>
                      <div className="ticket-order-id" style={{ color: '#fbbf24' }}>
                        {ticket.tableName} • #{ticket.orderNumber}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                        {new Date(ticket.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <span className={`status-pill ${ticket.status}`}>{ticket.status}</span>
                  </div>

                  <div className="ticket-items-box" style={{ padding: 10 }}>
                    {ticket.items?.map((it, idx) => (
                      <div key={idx} className="ticket-item-row" style={{ fontSize: '1rem', padding: '4px 0' }}>
                        <span>
                          <strong style={{ color: 'var(--primary)', marginRight: 6 }}>
                            {it.quantity}x
                          </strong>{' '}
                          {it.name}
                        </span>
                      </div>
                    ))}
                    {ticket.notes && (
                      <div className="ticket-notes" style={{ marginTop: 8 }}>
                        Chef Note: {ticket.notes}
                      </div>
                    )}
                  </div>

                  <div className="ticket-footer">
                    <button
                      className="btn-primary"
                      style={{ width: '100%', padding: '10px 0' }}
                      onClick={() =>
                        handleOrderStatusUpdate(
                          ticket.id,
                          ticket.status === 'pending' ? 'preparing' : 'ready'
                        )
                      }
                    >
                      {ticket.status === 'pending' ? 'Start Cooking' : 'Ready For Pickup'}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 5: MENU MANAGER
          ======================================================== */}
      {activeTab === 'menu' && (
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="search-input-box" style={{ width: 260 }}>
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Filter dishes..."
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                />
              </div>
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
              <span>Image</span>
              <span>Dish Name</span>
              <span>Category</span>
              <span>Price</span>
              <span>In-Stock</span>
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
                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
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
                  <span style={{ fontWeight: 800, color: 'var(--primary)' }}>₹{dish.price}</span>
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
          TAB 6: QR STAND PRINTING
          ======================================================== */}
      {activeTab === 'stands' && (
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3>Table Acrylic QR Stands</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Print high-resolution table QR codes with security tokens
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
                  background: '#fff',
                  color: '#000',
                  padding: 24,
                  borderRadius: 18,
                  textAlign: 'center',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                  border: '3px solid #f59e0b'
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '0.05em' }}>
                  SPICE GARDEN
                </div>
                <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 700, marginBottom: 12 }}>
                  SCAN TO ORDER & PAY
                </div>

                <div
                  style={{
                    width: 170,
                    height: 170,
                    margin: '0 auto 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 12,
                    padding: 8
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
                    padding: '6px 18px',
                    borderRadius: 999,
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    width: 'fit-content',
                    margin: '0 auto 10px'
                  }}
                >
                  {t.name || `TABLE ${t.id}`}
                </div>

                <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'left' }}>
                  <div>1. Scan with phone camera</div>
                  <div>2. Customize items & order</div>
                  <div>3. Track kitchen & pay bill</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dish Modal (Add / Edit) */}
      {menuModalOpen && (
        <div className="modal-backdrop" onClick={() => setMenuModalOpen(false)}>
          <div
            className="cart-drawer-card"
            style={{ maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cart-drawer-header">
              <h3>{editingDish ? 'Edit Dish' : 'Add New Dish'}</h3>
              <button className="modal-close-btn" onClick={() => setMenuModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDish} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Image URL or Path</label>
                <input
                  type="text"
                  className="customer-name-input"
                  placeholder="/images/paneer_butter_masala.jpg"
                  value={dishForm.image}
                  onChange={(e) => setDishForm({ ...dishForm, image: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={dishForm.isVeg}
                    onChange={(e) => setDishForm({ ...dishForm, isVeg: e.target.checked })}
                  />
                  Vegetarian Dish
                </label>
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: 10 }}>
                Save Dish
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Printable Thermal Receipt Modal */}
      {printBillOrder && (
        <div className="modal-backdrop" onClick={() => setPrintBillOrder(null)}>
          <div
            className="cart-drawer-card printable-area"
            style={{ maxWidth: 360, background: '#fff', color: '#000' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', padding: 18, borderBottom: '1px dashed #cbd5e1' }}>
              <h2 style={{ color: '#000', fontSize: '1.4rem' }}>SPICE GARDEN</h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Fine Dining & Smart Restaurant</p>
              <div style={{ fontSize: '0.8rem', marginTop: 6 }}>
                Order #{printBillOrder.orderNumber} • {printBillOrder.tableName}
              </div>
            </div>

            <div style={{ padding: '14px 18px', borderBottom: '1px dashed #cbd5e1' }}>
              {printBillOrder.items?.map((it, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', margin: '4px 0' }}>
                  <span>{it.quantity}x {it.name}</span>
                  <span>₹{it.price * it.quantity}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>Subtotal:</span>
                <span>₹{printBillOrder.subtotal || printBillOrder.total}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>GST (5%):</span>
                <span>₹{printBillOrder.tax || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', marginTop: 8 }}>
                <span>Grand Total:</span>
                <span>₹{printBillOrder.total}</span>
              </div>

              <div className="no-print" style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button className="btn-primary" style={{ flex: 1 }} onClick={() => window.print()}>
                  <Printer size={16} /> Print Receipt
                </button>
                <button className="btn-secondary" onClick={() => setPrintBillOrder(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
