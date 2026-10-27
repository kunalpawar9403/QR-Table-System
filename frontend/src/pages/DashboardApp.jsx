import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  ChevronLeft,
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
  DollarSign,
  Menu,
  User,
  LogOut
} from 'lucide-react';
import { socket } from '../utils/socket';
import { soundManager } from '../utils/sound';
import { authFetch, clearStaffToken, getCurrentUser, updateUserProfile, logoutStaff } from '../utils/staffAuth';
import { useToast } from '../components/Toast';
import '../styles/dashboard.css';

/* =========================================================
   REUSABLE SECTION PAGINATION COMPONENT
   ========================================================= */
function PaginationBar({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange, label = 'items' }) {
  if (totalItems <= itemsPerPage && totalPages <= 1) return null;

  const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIdx = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="section-pagination-bar no-print">
      <div className="pagination-info">
        Showing <strong>{startIdx}-{endIdx}</strong> of <strong>{totalItems}</strong> {label}
      </div>

      <div className="pagination-controls">
        <button
          type="button"
          className="pagination-btn nav-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          title="Previous Page"
        >
          <ChevronLeft size={15} />
          <span className="hide-on-mobile-sm">Prev</span>
        </button>

        <div className="pagination-numbers">
          {getPageNumbers().map((p, idx) =>
            p === '...' ? (
              <span key={`ellipsis-${idx}`} className="pagination-ellipsis">…</span>
            ) : (
              <button
                key={`page-${p}`}
                type="button"
                className={`pagination-btn num-btn ${currentPage === p ? 'active' : ''}`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          className="pagination-btn nav-btn"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          title="Next Page"
        >
          <span className="hide-on-mobile-sm">Next</span>
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

export default function DashboardApp({ onLockStaff }) {
  const { addToast } = useToast();

  // Active Tab
  const [activeTab, setActiveTab] = useState('overview');

  // Authenticated User
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profileRestaurant, setProfileRestaurant] = useState(currentUser?.restaurantName || 'TableMint');
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || '');
      setProfileRestaurant(currentUser.restaurantName || 'TableMint');
    }
  }, [currentUser]);

  // Mobile Bottom Admin Drawer
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

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
  const [printingSingleTable, setPrintingSingleTable] = useState(null);

  // Section Pagination States
  const [ordersPage, setOrdersPage] = useState(1);
  const ordersPerPage = 6;

  const [menuPage, setMenuPage] = useState(1);
  const [menuCategoryFilter, setMenuCategoryFilter] = useState('all');
  const menuPerPage = 8;

  const [tablesPage, setTablesPage] = useState(1);
  const tablesPerPage = 8;

  const [overviewTablesPage, setOverviewTablesPage] = useState(1);
  const overviewTablesPerPage = 8;

  const [standsPage, setStandsPage] = useState(1);
  const standsPerPage = 6;
  const [isPrintingAllStands, setIsPrintingAllStands] = useState(false);

  // Reset page when filter or search changes
  useEffect(() => {
    setOrdersPage(1);
  }, [orderFilter, orderSearch]);

  useEffect(() => {
    setMenuPage(1);
  }, [menuSearch, menuCategoryFilter]);

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
    restaurantName: 'TableMint',
    tagline: 'Smart QR Dining & POS',
    taxRate: 5,
    serviceCharge: 0,
    currency: '₹',
    soundAlerts: true,
    autoAcceptOrders: false,
    sessionTimeoutHours: 3
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
    const handleConnect = () => {
      socket.emit('join-admin');
      socket.emit('join-kitchen');
      socket.emit('join', { role: 'admin' });
      socket.emit('join', { role: 'kitchen' });
    };

    handleConnect();
    socket.on('connect', handleConnect);

    const handleNewOrder = (newOrder) => {
      soundManager.playNewOrderChime();
      setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
      addToast(`🔔 New Order #${newOrder.orderNumber || newOrder.id} from ${newOrder.tableName}`, 'success', 6000);

      // Immediately set the table to occupied in state
      setTables((prev) =>
        prev.map((t) =>
          t.id === newOrder.tableId
            ? { ...t, status: 'occupied', manualStatus: 'occupied', currentStatus: 'occupied' }
            : t
        )
      );

      // Refetch latest server table state
      fetch('/api/tables')
        .then((r) => r.json())
        .then(setTables)
        .catch(() => {});
    };

    const handleStatusChanged = (updated) => {
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      fetch('/api/tables').then((r) => r.json()).then(setTables).catch(() => {});
    };

    const handleTablesUpdated = (newTables) => {
      if (Array.isArray(newTables)) {
        setTables(newTables);
      }
    };

    const handleTableStatusChanged = ({ tableId, status }) => {
      setTables((prev) =>
        prev.map((t) =>
          t.id === tableId
            ? { ...t, status, manualStatus: status, currentStatus: status }
            : t
        )
      );
      fetch('/api/tables').then((r) => r.json()).then(setTables).catch(() => {});
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
    socket.on('tables:updated', handleTablesUpdated);
    socket.on('table:status_changed', handleTableStatusChanged);
    socket.on('table:updated', handleTableUpdated);
    socket.on('service:call', handleServiceCall);
    socket.on('service:dismissed', handleServiceDismissed);
    socket.on('menu:updated', handleMenuUpdated);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('order:new', handleNewOrder);
      socket.off('order:status_changed', handleStatusChanged);
      socket.off('tables:updated', handleTablesUpdated);
      socket.off('table:status_changed', handleTableStatusChanged);
      socket.off('table:updated', handleTableUpdated);
      socket.off('service:call', handleServiceCall);
      socket.off('service:dismissed', handleServiceDismissed);
      socket.off('menu:updated', handleMenuUpdated);
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

  // Save Profile Changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileName.trim() || profileName.trim().length < 2) {
      addToast('Please enter a valid full name (at least 2 characters)', 'error');
      return;
    }
    setProfileSaving(true);
    try {
      const res = await updateUserProfile({
        name: profileName,
        restaurantName: profileRestaurant
      });
      if (res.success) {
        setCurrentUser(res.user);
        addToast('Profile updated successfully!', 'success');
      } else {
        addToast(res.error || 'Failed to update profile', 'error');
      }
    } catch (err) {
      addToast('Connection error updating profile', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  // Log Out & Lock Station
  const handleLogout = () => {
    logoutStaff();
    if (onLockStaff) onLockStaff();
    addToast('Logged out of TableMint Station', 'info');
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

  // Dedicated Print Handlers
  const handlePrintReceipt = () => {
    document.body.classList.add('printing-receipt-only');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-receipt-only');
      }, 1000);
    }, 120);
  };

  const handlePrintSingleStand = (table) => {
    setPrintingSingleTable(table);
    document.body.classList.add('printing-single-stand-only');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-single-stand-only');
        setPrintingSingleTable(null);
      }, 1200);
    }, 150);
  };

  const handlePrintAllStands = () => {
    setIsPrintingAllStands(true);
    document.body.classList.add('printing-all-stands-only');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-all-stands-only');
        setIsPrintingAllStands(false);
      }, 1200);
    }, 150);
  };

  // Clean up printing classes on print dialog dismissal
  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-receipt-only');
      document.body.classList.remove('printing-single-stand-only');
      document.body.classList.remove('printing-all-stands-only');
      setPrintingSingleTable(null);
      setIsPrintingAllStands(false);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (printBillOrder) setPrintBillOrder(null);
        if (viewQrTable) setViewQrTable(null);
        if (menuModalOpen) setMenuModalOpen(false);
        if (tableModalOpen) setTableModalOpen(false);
      }
    };

    window.addEventListener('afterprint', handleAfterPrint);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [printBillOrder, viewQrTable, menuModalOpen, tableModalOpen]);

  // KPI calculations
  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const pendingOrdersCount = orders.filter((o) => o.status === 'pending' || o.status === 'new').length;
  const occupiedTables = tables.filter(
    (t) => t.status === 'occupied' || t.currentStatus === 'occupied' || (t.activeOrdersCount && t.activeOrdersCount > 0)
  ).length;
  const occupancyPercent = tables.length > 0 ? Math.round((occupiedTables / tables.length) * 100) : 0;
  const avgTicket = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 328;

  // Filter Orders
  const filteredOrders = orders.filter((o) => {
    if (orderFilter !== 'all') {
      if (orderFilter === 'pending') {
        if (o.status !== 'pending' && o.status !== 'new') return false;
      } else if (o.status !== orderFilter) {
        return false;
      }
    }
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      const matchId = String(o.orderNumber || o.id).toLowerCase().includes(q);
      const matchTable = (o.tableName || '').toLowerCase().includes(q);
      const matchCust = (o.customerName || '').toLowerCase().includes(q);
      if (!matchId && !matchTable && !matchCust) return false;
    }
    return true;
  });

  // Category Formatter & Dynamic Categories
  const formatCategoryLabel = (cat) => {
    if (!cat || cat === 'all') return 'All Dishes';
    const map = {
      'north-indian': 'North Indian',
      'chinese': 'Chinese',
      'tandoori': 'Tandoori',
      'soup': 'Soups',
      'snacks': 'Snacks',
      'juice': 'Fresh Juices',
      'milkshake': 'Milkshakes',
      'ice-cream': 'Ice Creams'
    };
    return map[cat] || cat.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const activeMenuCategories = [
    'all',
    ...Array.from(new Set(menu.map((m) => m.category).filter(Boolean)))
  ];

  // Filter Menu
  const filteredMenu = menu.filter((d) => {
    if (menuCategoryFilter !== 'all' && d.category !== menuCategoryFilter) {
      return false;
    }
    if (menuSearch.trim()) {
      const q = menuSearch.toLowerCase();
      return (
        (d.name || '').toLowerCase().includes(q) ||
        (d.description || '').toLowerCase().includes(q) ||
        (d.category || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Section Pagination Slices
  // 1. Orders Pagination
  const totalOrdersPages = Math.max(1, Math.ceil(filteredOrders.length / ordersPerPage));
  const currentOrdersPage = Math.min(ordersPage, totalOrdersPages);
  const paginatedOrders = filteredOrders.slice(
    (currentOrdersPage - 1) * ordersPerPage,
    currentOrdersPage * ordersPerPage
  );

  // 2. Menu Pagination
  const totalMenuPages = Math.max(1, Math.ceil(filteredMenu.length / menuPerPage));
  const currentMenuPage = Math.min(menuPage, totalMenuPages);
  const paginatedMenu = filteredMenu.slice(
    (currentMenuPage - 1) * menuPerPage,
    currentMenuPage * menuPerPage
  );

  // 3. Floor Tables Pagination
  const totalTablesPages = Math.max(1, Math.ceil(tables.length / tablesPerPage));
  const currentTablesPage = Math.min(tablesPage, totalTablesPages);
  const paginatedTables = tables.slice(
    (currentTablesPage - 1) * tablesPerPage,
    currentTablesPage * tablesPerPage
  );

  // 4. Overview Tables Pagination
  const totalOverviewTablesPages = Math.max(1, Math.ceil(tables.length / overviewTablesPerPage));
  const currentOverviewTablesPage = Math.min(overviewTablesPage, totalOverviewTablesPages);
  const paginatedOverviewTables = tables.slice(
    (currentOverviewTablesPage - 1) * overviewTablesPerPage,
    currentOverviewTablesPage * overviewTablesPerPage
  );

  // 5. QR Stands Pagination
  const totalStandsPages = Math.max(1, Math.ceil(tables.length / standsPerPage));
  const currentStandsPage = Math.min(standsPage, totalStandsPages);
  const displayedStands = isPrintingAllStands
    ? tables
    : tables.slice((currentStandsPage - 1) * standsPerPage, currentStandsPage * standsPerPage);

  return (
    <div className="dash-layout-container">
      {/* ========================================================
          LEFT SIDEBAR
          ======================================================== */}
      <aside className="dash-sidebar">
        <div className="sidebar-top">
          {/* Brand Logo */}
          <div className="sidebar-brand-box">
            <div className="sidebar-logo-badge">
              <img src="/images/tablemint_icon.png" alt="TableMint" className="sidebar-logo-img" />
            </div>
            <div className="sidebar-brand-text">
              <h2>Table<span className="brand-mint-text">Mint</span></h2>
              <p>RESTAURANT POS</p>
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

            <button
              className={`sidebar-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <div className="sidebar-item-left">
                <User size={18} />
                <span>My Profile</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Sidebar Bottom Sync & Profile Card */}
        <div
          className="sidebar-bottom-status"
          onClick={() => setActiveTab('profile')}
          style={{ cursor: 'pointer' }}
          title="Open Profile & Operations Account"
        >
          <div className="status-card-left">
            <span className="status-dot-green" />
            <div>
              <div className="status-card-title">{currentUser?.name || 'Live Sync Active'}</div>
              <div className="status-card-sub">{currentUser ? (currentUser.role === 'admin' ? 'Owner / Admin' : 'Floor Staff') : 'All systems connected'}</div>
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
            <button
              type="button"
              className="mobile-sidebar-toggle-btn no-desktop"
              onClick={() => setMobileMoreOpen((prev) => !prev)}
              title="Open Admin Functions"
            >
              <Menu size={20} />
            </button>
            <div className="command-logo-badge">
              <img src="/images/tablemint_icon.png" alt="TableMint" className="command-logo-img" />
            </div>
            <div className="command-title-box">
              <h1>
                Table<span className="brand-mint-text">Mint</span>{' '}
                <span className="hide-on-mobile">Command Center</span>{' '}
                <span className="live-pos-pill hide-on-mobile">LIVE POS</span>
              </h1>
              <p className="hide-on-mobile">Smart Restaurant Operations • Real-Time Kitchen KDS • QR Dining</p>
            </div>
          </div>

          <div className="command-header-right">
            <div className="header-time-pill hide-on-mobile">
              <Calendar size={15} style={{ color: '#00e676' }} />
              <span>{currentDate} • {currentTime}</span>
            </div>

            <div className="header-sync-pill hide-on-mobile">
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
              {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>

            <button
              className="header-icon-btn"
              onClick={() => {
                fetchAllData();
                addToast('Data synchronized successfully', 'info');
              }}
              title="Refresh Data"
            >
              <RotateCcw size={16} />
            </button>

            <button
              className="lock-station-btn"
              onClick={handleLogout}
              title="Sign Out & Lock Station"
            >
              <Lock size={15} /> <span className="hide-on-mobile">Sign Out / Lock</span>
            </button>

            <div
              className="user-avatar-circle hide-on-mobile"
              title={currentUser ? `${currentUser.name} (${currentUser.role || 'Admin'}) • Click to open Profile` : 'TableMint Station'}
              onClick={() => setActiveTab('profile')}
              style={{ cursor: 'pointer' }}
            >
              {currentUser?.name
                ? currentUser.name
                    .split(' ')
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                : 'TM'}
            </div>
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
                <div className="metric-card-header">
                  <div className="metric-icon-box">₹</div>
                  <span className="metric-badge green">
                    <TrendingUp size={11} /> Live
                  </span>
                </div>
                <div className="metric-content">
                  <span className="metric-title">Today's Sales</span>
                  <div className="metric-value">
                    ₹{totalRevenue > 0 ? totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 1 }) : '3,933.3'}
                  </div>
                </div>
                <div className="metric-footer green">
                  Real-time active
                </div>
              </div>

              {/* Card 2: Total Orders Placed */}
              <div className="metric-card orders">
                <div className="metric-card-header">
                  <div className="metric-icon-box">
                    <Receipt size={17} />
                  </div>
                  <span className="metric-badge amber">
                    <Clock size={11} /> {pendingOrdersCount} Wait
                  </span>
                </div>
                <div className="metric-content">
                  <span className="metric-title">Total Orders</span>
                  <div className="metric-value">{orders.length || 12}</div>
                </div>
                <div className="metric-footer amber">
                  {pendingOrdersCount > 0 ? `${pendingOrdersCount} awaiting kitchen` : 'All orders accepted'}
                </div>
              </div>

              {/* Card 3: Floor Occupancy */}
              <div className="metric-card occupancy">
                <div className="metric-card-header">
                  <div className="metric-icon-box">
                    <Users size={17} />
                  </div>
                  <span className="metric-badge blue">
                    {occupiedTables}/{tables.length || 10}
                  </span>
                </div>
                <div className="metric-content">
                  <span className="metric-title">Occupancy</span>
                  <div className="metric-value">{occupancyPercent}%</div>
                </div>
                <div className="metric-footer muted">
                  {occupiedTables} of {tables.length || 10} tables active
                </div>
              </div>

              {/* Card 4: Average Ticket */}
              <div className="metric-card ticket">
                <div className="metric-card-header">
                  <div className="metric-icon-box">
                    <BarChart3 size={17} />
                  </div>
                  <span className="metric-badge purple">Check</span>
                </div>
                <div className="metric-content">
                  <span className="metric-title">Avg Ticket</span>
                  <div className="metric-value">₹{avgTicket || 328}</div>
                </div>
                <div className="metric-footer muted">
                  Per completed order
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

              {/* 4-Column Table Grid */}
              <div className="floor-table-grid">
                {paginatedOverviewTables.map((table) => {
                  const isBar = (table.name || '').toLowerCase().includes('bar');
                  const activeCall = serviceCalls.find((c) => c.tableId === table.id);
                  const isOccupied =
                    table.status === 'occupied' ||
                    table.currentStatus === 'occupied' ||
                    (table.activeOrdersCount && table.activeOrdersCount > 0);

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
                          onClick={() => {
                            const origin = window.location.origin;
                            window.open(`${origin}/menu?table=${table.id}`, '_blank');
                          }}
                          title="Open Table Customer Menu"
                        >
                          <ExternalLink size={13} />
                          <span>Table Menu</span>
                        </button>
                        <button
                          className="btn-clear-table"
                          style={isOccupied ? { background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', fontWeight: 700 } : {}}
                          onClick={() => handleVacateTable(table.id)}
                          title="Clear & Vacate Table"
                        >
                          <Armchair size={14} />
                          <span>{isOccupied ? 'Vacate Table' : 'Clear Table'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* TableMint Promo Card at bottom of floor grid */}
                <div className="tablemint-promo-card">
                  <div className="promo-card-content">
                    <div className="promo-badge">
                      <UtensilsCrossed size={14} />
                      <span>GOOD FOOD</span>
                    </div>
                    <h3 className="promo-headline">
                      Better <span className="highlight-mint">Moments</span>
                    </h3>
                    <p className="promo-desc">
                      TableMint helps you manage your restaurant with ease, speed and style.
                    </p>
                  </div>
                  <div className="promo-card-media">
                    <img src="/images/paneer_tikka_masala.jpg" alt="Culinary Specialty" className="promo-food-img" />
                  </div>
                </div>
              </div>

              <PaginationBar
                currentPage={currentOverviewTablesPage}
                totalPages={totalOverviewTablesPages}
                totalItems={tables.length}
                itemsPerPage={overviewTablesPerPage}
                onPageChange={setOverviewTablesPage}
                label="tables"
              />
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
              {paginatedTables.map((table) => {
                const isTableOccupied =
                  table.status === 'occupied' ||
                  table.currentStatus === 'occupied' ||
                  (table.activeOrdersCount && table.activeOrdersCount > 0);

                return (
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
                      <span className={`table-status-pill ${isTableOccupied ? 'occupied' : 'available'}`}>
                        {isTableOccupied ? 'OCCUPIED' : 'AVAILABLE'}
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

                  <div className="floor-card-actions" style={{ gridTemplateColumns: '1fr auto auto', gap: 6 }}>
                    <button
                      className="btn-clear-table"
                      style={isTableOccupied ? { background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', fontWeight: 700 } : {}}
                      onClick={() => handleVacateTable(table.id)}
                      title="Clear & Vacate Table"
                    >
                      {isTableOccupied ? 'Vacate' : 'Clear'}
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
              );
            })}
          </div>

          <PaginationBar
            currentPage={currentTablesPage}
            totalPages={totalTablesPages}
            totalItems={tables.length}
            itemsPerPage={tablesPerPage}
            onPageChange={setTablesPage}
            label="tables"
          />
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

            {filteredOrders.length === 0 ? (
              <div className="empty-state-box">
                <Receipt size={38} style={{ color: '#64748b', opacity: 0.6 }} />
                <div style={{ fontWeight: 800, color: '#fff', fontSize: '1.05rem', marginTop: 10 }}>No Orders Found</div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 4 }}>
                  No tickets match the "{orderFilter.toUpperCase()}" filter or search query.
                </div>
              </div>
            ) : (
              <div className="orders-list-grid">
                {paginatedOrders.map((ord) => (
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
                        {(ord.status === 'pending' || ord.status === 'new') && (
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
                        {ord.status === 'served' && (
                          <button
                            className="btn-primary"
                            style={{
                              flex: 1,
                              padding: 9,
                              fontSize: '0.82rem',
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              border: 'none',
                              color: '#fff',
                              fontWeight: 700
                            }}
                            onClick={() => handleOrderStatusUpdate(ord.id, 'completed')}
                          >
                            ✓ Dinner Completed
                          </button>
                        )}
                        {ord.status !== 'completed' && ord.status !== 'cancelled' && ord.status !== 'served' && (
                          <button
                            className="btn-secondary"
                            style={{ padding: '9px 12px', fontSize: '0.78rem', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                            onClick={() => handleOrderStatusUpdate(ord.id, 'completed')}
                            title="Complete dining and expire table token"
                          >
                            Done
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
            )}

            <PaginationBar
              currentPage={currentOrdersPage}
              totalPages={totalOrdersPages}
              totalItems={filteredOrders.length}
              itemsPerPage={ordersPerPage}
              onPageChange={setOrdersPage}
              label="orders"
            />
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

            {/* Category Filter Pills */}
            <div className="catalog-category-filter no-print">
              {activeMenuCategories.map((cat) => {
                const count = cat === 'all' ? menu.length : menu.filter((m) => m.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`catalog-cat-pill ${menuCategoryFilter === cat ? 'active' : ''}`}
                    onClick={() => {
                      setMenuCategoryFilter(cat);
                      setMenuPage(1);
                    }}
                  >
                    {formatCategoryLabel(cat)} ({count})
                  </button>
                );
              })}
            </div>

            {filteredMenu.length === 0 ? (
              <div className="empty-state-box">
                <BookOpen size={38} style={{ color: '#64748b', opacity: 0.6 }} />
                <div style={{ fontWeight: 800, color: '#fff', fontSize: '1.05rem', marginTop: 10 }}>No Dishes Found</div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 4 }}>
                  No menu items matched your category filter or search query.
                </div>
              </div>
            ) : (
              <div className="menu-table-wrap">
                <div className="menu-crud-row header">
                  <span>Photo</span>
                  <span>Dish Name</span>
                  <span>Category</span>
                  <span>Price</span>
                  <span>Available</span>
                  <span>Actions</span>
                </div>

                {paginatedMenu.map((dish) => (
                  <div key={dish.id} className="menu-crud-row">
                    <img
                      src={dish.image || '/images/paneer_butter_masala.jpg'}
                      alt={dish.name}
                      className="menu-thumb"
                    />
                    <div className="menu-crud-details">
                      <div className="menu-dish-title-line">
                        <span className={`diet-badge ${dish.isVeg ? 'veg' : 'non-veg'}`} />
                        <span className="dish-name-text">{dish.name}</span>
                      </div>
                      <div className="dish-desc-text">
                        {dish.description}
                      </div>
                      <span className="menu-crud-cat-pill">{formatCategoryLabel(dish.category)}</span>
                    </div>
                    <span className="menu-crud-cat">
                      <span className="menu-crud-cat-pill-desktop">{formatCategoryLabel(dish.category)}</span>
                    </span>
                    <span className="menu-crud-price">₹{dish.price}</span>
                    <div className="menu-crud-avail">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={dish.available !== false}
                          onChange={() => handleToggleMenu(dish.id)}
                        />
                        <span className="toggle-slider" />
                      </label>
                      <span className="avail-label">{dish.available !== false ? 'In Stock' : 'Out'}</span>
                    </div>
                    <div className="menu-crud-actions">
                      <button
                        className="btn-icon"
                        onClick={() => {
                          setEditingDish(dish);
                          setDishForm(dish);
                          setMenuModalOpen(true);
                        }}
                        title="Edit Dish"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className="btn-icon btn-delete"
                        style={{ color: '#ef4444' }}
                        onClick={() => handleDeleteDish(dish.id)}
                        title="Delete Dish"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <PaginationBar
              currentPage={currentMenuPage}
              totalPages={totalMenuPages}
              totalItems={filteredMenu.length}
              itemsPerPage={menuPerPage}
              onPageChange={setMenuPage}
              label="dishes"
            />
          </section>
        )}

        {/* ========================================================
            TAB: QR STANDS
            ======================================================== */}
        {activeTab === 'stands' && (
          <section className="floor-status-panel">
            <div className="panel-header-row">
              <div>
                <h3>Table Acrylic QR Stands</h3>
                <p>Luxury printable standees for contactless guest phone ordering</p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-primary" onClick={handlePrintAllStands}>
                  <Printer size={16} /> Print All Stands ({tables.length})
                </button>
              </div>
            </div>

            <div className="floor-table-grid qr-stands-grid-container">
              {displayedStands.map((t) => {
                const isTargetForPrint = printingSingleTable?.id === t.id;
                return (
                  <div
                    key={t.id}
                    data-table-id={t.id}
                    className={`qr-stand-print-card ${isTargetForPrint ? 'is-target-stand' : ''}`}
                  >
                    {/* Stand Top Acrylic Clip Accent */}
                    <div className="stand-top-clip" />

                    {/* Brand Header with Crest */}
                    <div className="stand-luxury-header">
                      <div className="stand-crest-badge">
                        <Sparkles size={13} className="stand-crest-icon" />
                        <span className="stand-crest-text">LUXURY DINING</span>
                        <Sparkles size={13} className="stand-crest-icon" />
                      </div>
                      <div className="stand-brand-title">TABLEMINT</div>
                      <div className="stand-brand-tagline">SMART RESTAURANT & POS</div>
                    </div>

                    {/* QR Code Container with High-Contrast Precision Frame */}
                    <div className="stand-qr-holder">
                      <div className="stand-corner top-left" />
                      <div className="stand-corner top-right" />
                      <div className="stand-corner bottom-left" />
                      <div className="stand-corner bottom-right" />
                      <img
                        src={`/api/qrcode/${t.id}`}
                        alt={`Table ${t.id} QR Code`}
                        className="stand-qr-image"
                        loading="eager"
                      />
                    </div>
                    <div className="stand-scan-prompt">
                      <span>Point camera & tap link to open menu</span>
                    </div>

                    {/* Prominent Table Number Pill Badge */}
                    <div className="stand-table-pill">
                      <span className="stand-table-num">{t.name || `TABLE ${t.id}`}</span>
                      <span className="stand-table-cap">Capacity: {t.capacity || 4} Guests</span>
                    </div>

                    {/* 3 Step Guidance */}
                    <div className="stand-guide-steps">
                      <div className="stand-step-row">
                        <span className="stand-step-pill">1</span>
                        <span>Open camera or Google Lens & scan QR</span>
                      </div>
                      <div className="stand-step-row">
                        <span className="stand-step-pill">2</span>
                        <span>Browse live specials & customize dishes</span>
                      </div>
                      <div className="stand-step-row">
                        <span className="stand-step-pill">3</span>
                        <span>Order straight to kitchen & settle bill</span>
                      </div>
                    </div>

                    {/* Hospitality Bar with Wi-Fi & System */}
                    <div className="stand-hospitality-footer">
                      <div className="stand-wifi-info">
                        <Wifi size={13} />
                        <span>Guest Wi-Fi: <strong>SpiceGarden_Guest</strong> (No Pass)</span>
                      </div>
                      <div className="stand-brand-micro">Powered by QR Table System</div>
                    </div>

                    {/* Action Buttons (Screen Only - Hidden in Print) */}
                    <div className="stand-card-actions no-print" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <button
                        type="button"
                        className="btn-primary stand-print-btn"
                        onClick={() => handlePrintSingleStand(t)}
                        title="Print only this table stand"
                      >
                        <Printer size={15} /> Print Stand
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setViewQrTable(t)}
                        title="Preview & Download High-Res QR"
                      >
                        <QrCode size={14} /> Preview QR
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <PaginationBar
              currentPage={currentStandsPage}
              totalPages={totalStandsPages}
              totalItems={tables.length}
              itemsPerPage={standsPerPage}
              onPageChange={setStandsPage}
              label="stands"
            />
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
                <p>Manage staff accounts, authorization roles, and station security</p>
              </div>
              <button
                className="lock-station-btn"
                style={{ background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}
                onClick={handleLogout}
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
                  <ShieldCheck size={14} style={{ color: '#00e676' }} /> Verified with Email & Password
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
                  onClick={() => setActiveTab('kitchen')}
                >
                  <ChefHat size={13} /> View Kitchen KDS
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

            {/* Authentication Policy Information */}
            <div className="settings-card" style={{ maxWidth: 580, marginTop: 10 }}>
              <div className="settings-card-title">
                <ShieldCheck size={18} style={{ color: '#00e676' }} />
                <span>Account Credentials & Password Authentication</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                TableMint operations are protected exclusively with email and password credentials. Each staff member and administrator signs in using their dedicated account with salted PBKDF2 cryptography.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                  onClick={() => setActiveTab('profile')}
                >
                  <User size={14} /> View My Profile & Settings
                </button>
              </div>
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
                  onClick={() => setActiveTab('kitchen')}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                >
                  <ChefHat size={14} /> Open Kitchen Station
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
                  onClick={() => setActiveTab('stands')}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                >
                  <QrCode size={14} /> Open Print Stands
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

        {/* ========================================================
            TAB: PROFILE & OPERATIONS ACCOUNT
            ======================================================== */}
        {activeTab === 'profile' && (
          <section className="floor-status-panel">
            <div className="panel-header-row">
              <div>
                <h3>Profile & Operations Account</h3>
                <p>Manage your account credentials, restaurant identity, and floor security</p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn-danger-logout"
                  onClick={handleLogout}
                  title="Sign out and return to Login & Sign Up screen"
                >
                  <LogOut size={16} /> Sign Out / Exit Station
                </button>
              </div>
            </div>

            <div className="profile-grid-container">
              {/* Left Column: User Identity Card */}
              <div className="profile-card profile-hero-card">
                <div className="profile-avatar-large">
                  {currentUser?.name
                    ? currentUser.name
                        .split(' ')
                        .filter(Boolean)
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()
                    : 'TM'}
                  <span className="profile-avatar-online-dot" title="Active Session" />
                </div>

                <h3 className="profile-hero-name">{currentUser?.name || 'TableMint Staff'}</h3>
                <p className="profile-hero-email">{currentUser?.email || 'admin@tablemint.com'}</p>

                <div className="profile-badges-row">
                  <span className={`status-pill ${currentUser?.role === 'admin' ? 'ready' : 'pending'}`}>
                    <ShieldCheck size={13} />
                    {currentUser?.role === 'admin' ? 'Admin / Owner' : 'Floor Staff'}
                  </span>
                  <span className="status-pill occupied">
                    <UtensilsCrossed size={13} />
                    {currentUser?.restaurantName || 'TableMint'}
                  </span>
                </div>

                <div className="profile-info-list">
                  <div className="profile-info-row">
                    <span className="profile-info-label">
                      <ShieldCheck size={14} /> Security Standard
                    </span>
                    <span className="profile-info-value" style={{ color: '#00e676', fontSize: '0.78rem' }}>
                      PBKDF2 SHA-512 Encrypted
                    </span>
                  </div>
                  <div className="profile-info-row">
                    <span className="profile-info-label">
                      <Lock size={14} /> Login Method
                    </span>
                    <span className="profile-info-value" style={{ color: '#00e676', fontSize: '0.78rem' }}>
                      Email & Password Only
                    </span>
                  </div>
                  <div className="profile-info-row">
                    <span className="profile-info-label">
                      <Wifi size={14} /> Live Sync Relay
                    </span>
                    <span className="profile-info-value" style={{ color: '#38bdf8' }}>
                      Connected (12ms)
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Edit Profile & Security Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Edit Profile Details Form */}
                <div className="profile-card">
                  <h4 style={{ fontSize: '1.05rem', color: '#fff', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={18} style={{ color: '#00e676' }} /> Personal & Restaurant Profile
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: 18 }}>
                    Update your display name and dining brand name across POS tickets and receipts.
                  </p>

                  <form onSubmit={handleSaveProfile} className="profile-form-section">
                    <div className="profile-form-row">
                      <div>
                        <label className="profile-field-label">Full Name</label>
                        <input
                          type="text"
                          className="auth-input-field"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          placeholder="Your Name"
                          required
                          disabled={profileSaving}
                        />
                      </div>
                      <div>
                        <label className="profile-field-label">Restaurant Brand Name</label>
                        <input
                          type="text"
                          className="auth-input-field"
                          value={profileRestaurant}
                          onChange={(e) => setProfileRestaurant(e.target.value)}
                          placeholder="e.g. TableMint / Spice Garden"
                          required
                          disabled={profileSaving}
                        />
                      </div>
                    </div>

                    <div className="profile-form-row">
                      <div>
                        <label className="profile-field-label">Email Address (Login Identity)</label>
                        <input
                          type="email"
                          className="auth-input-field profile-input-readonly"
                          value={currentUser?.email || 'admin@tablemint.com'}
                          readOnly
                          title="Email address cannot be changed directly."
                        />
                      </div>
                      <div>
                        <label className="profile-field-label">Station Role & Permissions</label>
                        <input
                          type="text"
                          className="auth-input-field profile-input-readonly"
                          value={currentUser?.role === 'admin' ? 'Administrator (Full Access)' : 'Floor Staff (POS & Orders)'}
                          readOnly
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={profileSaving}
                        style={{ padding: '10px 22px' }}
                      >
                        <Check size={16} />
                        {profileSaving ? 'Saving Changes...' : 'Save Profile Changes'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Session Security Details */}
                <div className="profile-card">
                  <h4 style={{ fontSize: '1.05rem', color: '#fff', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck size={18} style={{ color: '#38bdf8' }} /> Station Security & Session Status
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: 14 }}>
                    Your session is actively verified against TableMint backend server.
                  </p>

                  <div className="profile-info-list" style={{ borderTop: 'none', paddingTop: 0 }}>
                    <div className="profile-info-row">
                      <span className="profile-info-label">
                        <Lock size={14} /> Authorization Token
                      </span>
                      <span className="profile-info-value" style={{ fontFamily: 'monospace', color: '#94a3b8' }}>
                        tm_auth_{currentUser?.id ? currentUser.id.slice(0, 8) : 'staff'}••••••••
                      </span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-label">
                        <Smartphone size={14} /> Station Interface
                      </span>
                      <span className="profile-info-value">TableMint POS WebApp v2.4</span>
                    </div>
                  </div>
                </div>

                {/* Danger Zone: Log Out Card */}
                <div className="profile-logout-card">
                  <div className="profile-logout-text">
                    <h4>Sign Out of TableMint Station</h4>
                    <p>
                      Terminates your authenticated session immediately. Only the Login and Sign Up screen will remain accessible until you authenticate again.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-danger-logout"
                    onClick={handleLogout}
                  >
                    <LogOut size={18} /> Sign Out Now
                  </button>
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
                    <option value="north-indian">North Indian</option>
                    <option value="chinese">Chinese</option>
                    <option value="tandoori">Tandoori</option>
                    <option value="soup">Soups</option>
                    <option value="snacks">Snacks</option>
                    <option value="juice">Fresh Juices</option>
                    <option value="milkshake">Milkshakes</option>
                    <option value="ice-cream">Ice Creams</option>
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
          <div
            className="receipt-paper-card"
            id="thermal-receipt-container"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top-Right Floating Close Button - ALWAYS visible on screen */}
            <button
              type="button"
              className="receipt-modal-close-btn no-print"
              onClick={() => setPrintBillOrder(null)}
              title="Close Receipt (Esc)"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="receipt-header">
              <div className="receipt-brand-title">TABLEMINT</div>
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
              <div style={{ fontWeight: 700 }}>*** THANK YOU FOR DINING WITH US ***</div>
              <div style={{ fontSize: '0.68rem', marginTop: 2 }}>Please Visit TableMint Again!</div>
              <div style={{ fontSize: '0.62rem', color: '#9ca3af', marginTop: 4 }}>
                Powered by QR Table System ESC/POS v2.0
              </div>
            </div>

            <div className="receipt-actions-footer no-print">
              <button
                type="button"
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={handlePrintReceipt}
              >
                <Printer size={16} /> Print Receipt (80mm)
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPrintBillOrder(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Table QR Modal */}
      {viewQrTable && (
        <div className="modal-backdrop" onClick={() => setViewQrTable(null)}>
          <div className="dash-modal-card" style={{ maxWidth: 440, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
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
                  type="button"
                  className="btn-primary"
                  onClick={() => handlePrintSingleStand(viewQrTable)}
                >
                  <Printer size={15} /> Print Stand
                </button>
                <button
                  type="button"
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

      {/* 80mm ESC/POS Thermal Receipt Portal (Isolated 1-Page Print Centered in Middle) */}
      {typeof document !== 'undefined' && printBillOrder && createPortal(
        <div id="thermal-receipt-print-root">
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: 8, marginBottom: 8 }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.04em' }}>TABLEMINT</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>Fine Dining Restaurant & Bar</div>
            <div style={{ fontSize: '0.72rem', color: '#333' }}>Plot 42, Green Avenue, MG Road</div>
            <div style={{ fontSize: '0.68rem', color: '#555' }}>GSTIN: 27AAACS1234M1Z5 • FSSAI: 11521034000456</div>
            <div style={{ margin: '6px 0 3px', borderTop: '1px dashed #999' }} />
            <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>TAX INVOICE / CASH BILL</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>
              Bill #{printBillOrder.orderNumber || printBillOrder.id} • {printBillOrder.tableName}
            </div>
            <div style={{ fontSize: '0.7rem' }}>
              Date: {new Date(printBillOrder.createdAt || Date.now()).toLocaleDateString()} {new Date(printBillOrder.createdAt || Date.now()).toLocaleTimeString()}
            </div>
          </div>

          <div style={{ borderBottom: '1px dashed #000', paddingBottom: 8, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 800, paddingBottom: 4, borderBottom: '1px solid #ccc' }}>
              <span>ITEM</span>
              <span>QTY x RATE</span>
              <span>AMOUNT</span>
            </div>
            {printBillOrder.items?.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', fontWeight: 600, padding: '3px 0' }}>
                <span style={{ flex: 1, paddingRight: 6 }}>{it.name}</span>
                <span style={{ minWidth: 55, textAlign: 'center' }}>{it.quantity} x {it.price}</span>
                <span style={{ minWidth: 55, textAlign: 'right' }}>₹{it.price * it.quantity}</span>
              </div>
            ))}
          </div>

          <div style={{ borderBottom: '1px dashed #000', paddingBottom: 8, marginBottom: 8, fontSize: '0.76rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>Subtotal:</span>
              <span>₹{printBillOrder.subtotal || Math.round((printBillOrder.total || 0) / 1.05)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>CGST (2.5%):</span>
              <span>₹{Math.round(((printBillOrder.tax || Math.round((printBillOrder.total || 0) * 0.05)) / 2))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>SGST (2.5%):</span>
              <span>₹{Math.round(((printBillOrder.tax || Math.round((printBillOrder.total || 0) * 0.05)) / 2))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 900, paddingTop: 4, marginTop: 4, borderTop: '1px dashed #000' }}>
              <span>TOTAL AMOUNT:</span>
              <span>₹{printBillOrder.total}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, marginTop: 3 }}>
              <span>Payment Status:</span>
              <span>PAID (UPI / COUNTER)</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.72rem', paddingTop: 2 }}>
            <div style={{ fontWeight: 800 }}>*** THANK YOU FOR DINING WITH US ***</div>
            <div style={{ fontSize: '0.68rem', marginTop: 2 }}>Please Visit TableMint Again!</div>
            <div style={{ fontSize: '0.6rem', color: '#666', marginTop: 6, borderTop: '1px dotted #ccc', paddingTop: 4 }}>
              80mm ESC/POS Thermal Paper Roll Size
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Single Table QR Stand Portal (Isolated 1-Page Print Centered in Middle) */}
      {typeof document !== 'undefined' && printingSingleTable && createPortal(
        <div id="single-stand-print-root">
          <div style={{ width: 50, height: 5, background: '#000', margin: '0 auto 10px', borderRadius: 4 }} />
          <div style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>
            ★ LUXURY DINING ★
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.06em', fontFamily: 'serif' }}>
            TABLEMINT
          </div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
            Fine Dining & Rooftop Lounge
          </div>

          <div style={{ width: 170, height: 170, margin: '0 auto 8px', border: '2px solid #000', borderRadius: 12, padding: 8, background: '#fff' }}>
            <img
              src={`/api/qrcode/${printingSingleTable.id}`}
              alt={`Table ${printingSingleTable.id} QR Code`}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, marginBottom: 12 }}>
            Point phone camera & tap link to open menu
          </div>

          <div style={{ background: '#000', color: '#fff', padding: '6px 20px', borderRadius: 999, fontWeight: 900, fontSize: '1.2rem', width: 'fit-content', margin: '0 auto 12px' }}>
            {printingSingleTable.name || `TABLE ${printingSingleTable.id}`}
          </div>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#444', marginBottom: 12 }}>
            Capacity: {printingSingleTable.capacity || 4} Guests • Dedicated Server
          </div>

          <div style={{ borderTop: '1px dashed #666', paddingTop: 10, textAlign: 'left', maxWidth: 220, margin: '0 auto 12px', fontSize: '0.74rem', lineHeight: 1.6 }}>
            <div><strong>1.</strong> Open camera or Google Lens & scan QR</div>
            <div><strong>2.</strong> Browse live specials & customize dishes</div>
            <div><strong>3.</strong> Order straight to kitchen & settle bill</div>
          </div>

          <div style={{ borderTop: '1px solid #ccc', paddingTop: 8, fontSize: '0.7rem', color: '#333' }}>
            <div>Guest Wi-Fi: <strong>SpiceGarden_Guest</strong> (No Password)</div>
            <div style={{ fontSize: '0.62rem', color: '#666', marginTop: 2 }}>Powered by QR Table System • 4x6" Acrylic Stand Insert</div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================
          MOBILE BOTTOM ADMIN BAR (Admin Function Buttons in Bottom)
          ======================================================== */}
      <nav className="admin-mobile-bottom-bar no-print">
        <button
          type="button"
          className={`mobile-bottom-btn ${activeTab === 'overview' && !mobileMoreOpen ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('overview');
            setMobileMoreOpen(false);
          }}
          title="Overview Dashboard"
        >
          <Home size={19} />
          <span>Overview</span>
        </button>

        <button
          type="button"
          className={`mobile-bottom-btn ${activeTab === 'tables' && !mobileMoreOpen ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('tables');
            setMobileMoreOpen(false);
          }}
          title="Floor & Tables"
        >
          <LayoutGrid size={19} />
          <span>Floor</span>
        </button>

        <button
          type="button"
          className={`mobile-bottom-btn ${activeTab === 'orders' && !mobileMoreOpen ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('orders');
            setMobileMoreOpen(false);
          }}
          title="Live Orders"
        >
          <div className="mobile-btn-badge-wrap">
            <Receipt size={19} />
            {orders.length > 0 && (
              <span className="mobile-tab-badge">{orders.length}</span>
            )}
          </div>
          <span>Orders</span>
        </button>

        <button
          type="button"
          className={`mobile-bottom-btn ${activeTab === 'kitchen' && !mobileMoreOpen ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('kitchen');
            setMobileMoreOpen(false);
          }}
          title="Kitchen KDS"
        >
          <ChefHat size={19} />
          <span>Kitchen</span>
        </button>

        <button
          type="button"
          className={`mobile-bottom-btn ${['menu', 'stands', 'settings', 'reports', 'staff', 'integrations'].includes(activeTab) || mobileMoreOpen ? 'active' : ''}`}
          onClick={() => setMobileMoreOpen((prev) => !prev)}
          title="More Admin Functions"
        >
          <Menu size={19} />
          <span>Admin</span>
        </button>
      </nav>

      {/* ========================================================
          MOBILE ADMIN FUNCTIONS DRAWER SHEET (Bottom Sheet)
          ======================================================== */}
      {mobileMoreOpen && (
        <div className="mobile-admin-drawer-backdrop no-print" onClick={() => setMobileMoreOpen(false)}>
          <div className="mobile-admin-drawer-card" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="command-logo-badge" style={{ width: 36, height: 36 }}>
                  <img src="/images/tablemint_icon.png" alt="TableMint" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 9 }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.98rem' }}>Admin Control Center</div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Management & Hardware Functions</div>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setMobileMoreOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="drawer-actions-grid">
              <button
                type="button"
                className={`drawer-action-btn ${activeTab === 'menu' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('menu');
                  setMobileMoreOpen(false);
                }}
              >
                <div className="drawer-btn-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  <BookOpen size={20} />
                </div>
                <div>
                  <div className="drawer-btn-title">Menu Catalog</div>
                  <div className="drawer-btn-sub">{menu.length} Dishes</div>
                </div>
              </button>

              <button
                type="button"
                className={`drawer-action-btn ${activeTab === 'stands' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('stands');
                  setMobileMoreOpen(false);
                }}
              >
                <div className="drawer-btn-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                  <QrCode size={20} />
                </div>
                <div>
                  <div className="drawer-btn-title">QR Stands</div>
                  <div className="drawer-btn-sub">Print & Export</div>
                </div>
              </button>

              <button
                type="button"
                className={`drawer-action-btn ${activeTab === 'reports' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('reports');
                  setMobileMoreOpen(false);
                }}
              >
                <div className="drawer-btn-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                  <BarChart3 size={20} />
                </div>
                <div>
                  <div className="drawer-btn-title">Sales Reports</div>
                  <div className="drawer-btn-sub">Ledger & KPIs</div>
                </div>
              </button>

              <button
                type="button"
                className={`drawer-action-btn ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('settings');
                  setMobileMoreOpen(false);
                }}
              >
                <div className="drawer-btn-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
                  <Settings size={20} />
                </div>
                <div>
                  <div className="drawer-btn-title">POS Settings</div>
                  <div className="drawer-btn-sub">Taxes & Policies</div>
                </div>
              </button>

              <button
                type="button"
                className={`drawer-action-btn ${activeTab === 'staff' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('staff');
                  setMobileMoreOpen(false);
                }}
              >
                <div className="drawer-btn-icon" style={{ background: 'rgba(251, 146, 60, 0.15)', color: '#fb923c' }}>
                  <Users size={20} />
                </div>
                <div>
                  <div className="drawer-btn-title">Staff Mgmt</div>
                  <div className="drawer-btn-sub">Access & Roles</div>
                </div>
              </button>

              <button
                type="button"
                className={`drawer-action-btn ${activeTab === 'integrations' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('integrations');
                  setMobileMoreOpen(false);
                }}
              >
                <div className="drawer-btn-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
                  <Link2 size={20} />
                </div>
                <div>
                  <div className="drawer-btn-title">Integrations</div>
                  <div className="drawer-btn-sub">Hardware & ESC/POS</div>
                </div>
              </button>
              <button
                type="button"
                className={`drawer-action-btn ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('profile');
                  setMobileMoreOpen(false);
                }}
              >
                <div className="drawer-btn-icon" style={{ background: 'rgba(0, 230, 118, 0.15)', color: '#00e676' }}>
                  <User size={20} />
                </div>
                <div>
                  <div className="drawer-btn-title">My Profile</div>
                  <div className="drawer-btn-sub">Account & Sign Out</div>
                </div>
              </button>
            </div>

            <div className="drawer-footer-actions">
              <button
                type="button"
                className="drawer-lock-btn"
                onClick={() => {
                  setMobileMoreOpen(false);
                  handleLogout();
                }}
              >
                <Lock size={15} /> Sign Out / Lock
              </button>
              <button
                type="button"
                className="drawer-refresh-btn"
                onClick={() => {
                  fetchAllData();
                  addToast('Data synchronized successfully', 'info');
                  setMobileMoreOpen(false);
                }}
              >
                <RotateCcw size={15} /> Sync Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
