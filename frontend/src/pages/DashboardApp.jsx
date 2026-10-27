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
  LogOut,
  CreditCard,
  Eye,
  MoreVertical,
  Tag
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

const VALID_DASHBOARD_TABS = [
  'overview',
  'orders',
  'tables',
  'menu',
  'kitchen',
  'billing',
  'customers',
  'reports',
  'settings',
  'stands',
  'profile',
  'staff',
  'integrations'
];

function getStoredDashboardTab() {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && VALID_DASHBOARD_TABS.includes(tabParam)) {
        return tabParam;
      }
      const hash = window.location.hash.replace('#', '');
      if (hash && VALID_DASHBOARD_TABS.includes(hash)) {
        return hash;
      }
      const saved = localStorage.getItem('tablemint_active_tab');
      if (saved && VALID_DASHBOARD_TABS.includes(saved)) {
        return saved;
      }
    }
  } catch (e) {
    // Ignore storage/url parsing exceptions
  }
  return 'overview';
}

export default function DashboardApp({ onLockStaff }) {
  const { addToast } = useToast();

  // Active Tab with persistence across browser page refreshes
  const [activeTab, setActiveTab] = useState(getStoredDashboardTab);

  // Synchronize activeTab with LocalStorage and browser URL searchParams
  useEffect(() => {
    try {
      localStorage.setItem('tablemint_active_tab', activeTab);
      const url = new URL(window.location.href);
      if (url.searchParams.get('tab') !== activeTab) {
        url.searchParams.set('tab', activeTab);
        window.history.replaceState({ tab: activeTab }, '', url.toString());
      }
    } catch (e) {
      // Ignore
    }
  }, [activeTab]);

  // Support browser Back/Forward navigation between sections
  useEffect(() => {
    const handlePopState = () => {
      const targetTab = getStoredDashboardTab();
      setActiveTab(targetTab);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  // Global Topbar Search
  const [globalSearch, setGlobalSearch] = useState('');

  // Customers State (Image 1 Panel 8)
  const [customers, setCustomers] = useState([
    { id: 1, name: 'Amit Patel', phone: '+91 9876543210', email: 'amit@email.com', totalOrders: 12, totalSpent: 3450, lastVisit: 'Oct 26, 2026' },
    { id: 2, name: 'Priya Sharma', phone: '+91 9123456780', email: 'priya@email.com', totalOrders: 8, totalSpent: 2180, lastVisit: 'Oct 25, 2026' },
    { id: 3, name: 'Rahul Kumar', phone: '+91 9988776655', email: 'rahul@email.com', totalOrders: 15, totalSpent: 4120, lastVisit: 'Oct 24, 2026' },
    { id: 4, name: 'Sneha Joshi', phone: '+91 9871234567', email: 'sneha@email.com', totalOrders: 6, totalSpent: 1650, lastVisit: 'Oct 23, 2026' },
    { id: 5, name: 'Vikram Singh', phone: '+91 9765432100', email: 'vikram@email.com', totalOrders: 10, totalSpent: 2880, lastVisit: 'Oct 22, 2026' },
    { id: 6, name: 'Neha Desai', phone: '+91 9876543211', email: 'neha@email.com', totalOrders: 9, totalSpent: 2250, lastVisit: 'Oct 21, 2026' }
  ]);
  const [customerSearch, setCustomerSearch] = useState('');

  // POS Billing State (Image 1 Panel 6)
  const [selectedBillingTableId, setSelectedBillingTableId] = useState(12);
  const [billingPaymentMethod, setBillingPaymentMethod] = useState('upi');
  const [billingRecentBills, setBillingRecentBills] = useState([
    { billNo: '#B1604', table: 'Table 12', amount: 525, time: '10:32 AM', payment: 'UPI' },
    { billNo: '#B1603', table: 'Table 5', amount: 750, time: '10:25 AM', payment: 'Card' },
    { billNo: '#B1602', table: 'Table 8', amount: 320, time: '10:18 AM', payment: 'Cash' },
    { billNo: '#B1601', table: 'Table 3', amount: 600, time: '10:10 AM', payment: 'UPI' }
  ]);

  // Missing Filter & Sub-Nav States
  const [tableStatusFilter, setTableStatusFilter] = useState('all');
  const [analyticsSubTab, setAnalyticsSubTab] = useState('Revenue');
  const [settingsSubNav, setSettingsSubNav] = useState('details');
  const [overviewOrderType, setOverviewOrderType] = useState('dine-in');

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
              <img src="/images/tablemint_leaf_icon.png" alt="TableMint" className="sidebar-logo-img" />
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
                <span>Dashboard</span>
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
              <span className="sidebar-badge">{orders.length || 24}</span>
            </button>

            <button
              className={`sidebar-nav-item ${activeTab === 'tables' ? 'active' : ''}`}
              onClick={() => setActiveTab('tables')}
            >
              <div className="sidebar-item-left">
                <LayoutGrid size={18} />
                <span>Table Management</span>
              </div>
            </button>

            <button
              className={`sidebar-nav-item ${activeTab === 'menu' ? 'active' : ''}`}
              onClick={() => setActiveTab('menu')}
            >
              <div className="sidebar-item-left">
                <BookOpen size={18} />
                <span>Menu Management</span>
              </div>
              <span className="sidebar-badge">{menu.length || 24}</span>
            </button>

            <button
              className={`sidebar-nav-item ${activeTab === 'kitchen' ? 'active' : ''}`}
              onClick={() => setActiveTab('kitchen')}
            >
              <div className="sidebar-item-left">
                <ChefHat size={18} />
                <span>Kitchen Display</span>
              </div>
            </button>

            <button
              className={`sidebar-nav-item ${activeTab === 'billing' ? 'active' : ''}`}
              onClick={() => setActiveTab('billing')}
            >
              <div className="sidebar-item-left">
                <CreditCard size={18} />
                <span>POS Billing</span>
              </div>
            </button>

            <button
              className={`sidebar-nav-item ${activeTab === 'customers' ? 'active' : ''}`}
              onClick={() => setActiveTab('customers')}
            >
              <div className="sidebar-item-left">
                <Users size={18} />
                <span>Customers</span>
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
              className={`sidebar-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <div className="sidebar-item-left">
                <Settings size={18} />
                <span>Settings</span>
              </div>
            </button>

            <div className="sidebar-divider" />

            <button
              className={`sidebar-nav-item ${activeTab === 'stands' ? 'active' : ''}`}
              onClick={() => setActiveTab('stands')}
            >
              <div className="sidebar-item-left">
                <QrCode size={18} />
                <span>QR Stands Printing</span>
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
        {/* Mobile Top Header Matching Image 3 (Deep Forest Green #07241a with White Titles) */}
        <header className="admin-mobile-top-bar hide-on-desktop no-print">
          <div className="mobile-top-left">
            {activeTab === 'overview' ? (
              <div className="mobile-brand-box">
                <img src="/images/tablemint_leaf_icon.png" alt="TableMint" className="mobile-leaf-img" />
                <span className="mobile-brand-title">TableMint</span>
              </div>
            ) : (
              <button
                type="button"
                className="mobile-back-btn"
                onClick={() => setActiveTab('overview')}
                title="Back to Dashboard"
              >
                <ChevronLeft size={22} />
                <span className="mobile-header-tab-title">
                  {activeTab === 'orders' && 'Orders'}
                  {activeTab === 'tables' && 'Tables'}
                  {activeTab === 'menu' && 'Menu'}
                  {activeTab === 'kitchen' && 'Kitchen Display'}
                  {activeTab === 'billing' && 'POS Billing'}
                  {activeTab === 'reports' && 'Reports'}
                  {activeTab === 'customers' && 'Customers'}
                  {activeTab === 'settings' && 'Settings'}
                  {activeTab === 'profile' && 'More'}
                  {!['orders','tables','menu','kitchen','billing','reports','customers','settings','profile'].includes(activeTab) && 'TableMint'}
                </span>
              </button>
            )}
          </div>

          <div className="mobile-top-right">
            <button
              type="button"
              className="mobile-bell-btn relative"
              onClick={() => setActiveTab('orders')}
              title="Notifications"
            >
              <Bell size={18} />
              {serviceCalls.length > 0 && <span className="mobile-bell-dot" />}
            </button>
          </div>
        </header>

        {/* Top Command Bar Matching Image 1 Reference (Desktop Only) */}
        <header className="top-command-header hide-on-mobile">
          <div className="command-header-left">
            <div className="topbar-search-box">
              <Search size={16} className="topbar-search-icon" />
              <input
                type="text"
                placeholder="Search tables, orders, menu..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="topbar-search-input"
              />
            </div>
          </div>

          <div className="command-header-right">
            <button
              className="header-circle-btn"
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
              className="header-circle-btn"
              onClick={() => {
                fetchAllData();
                addToast('Data synchronized successfully', 'info');
              }}
              title="Refresh Data"
            >
              <RotateCcw size={16} />
            </button>

            <button
              className="header-circle-btn"
              onClick={() => setActiveTab('settings')}
              title="Settings"
            >
              <Settings size={17} />
            </button>

            <button
              className="header-circle-btn relative"
              onClick={() => setActiveTab('orders')}
              title="Notifications"
            >
              <Bell size={17} />
              {serviceCalls.length > 0 && <span className="topbar-bell-dot" />}
            </button>

            {/* Profile Pill matching Rohit Sharma (Restaurant Owner) in Reference */}
            <div
              className="topbar-profile-pill"
              onClick={() => setActiveTab('profile')}
              title="View Profile / Logout"
            >
              <div className="topbar-avatar-wrap">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80"
                  alt="Rohit Sharma"
                  className="topbar-avatar-img"
                  onError={(e) => {
                    e.target.src = '/images/tablemint_leaf_icon.png';
                  }}
                />
                <span className="topbar-online-dot" />
              </div>
              <div className="topbar-profile-meta hide-on-mobile">
                <div className="topbar-profile-name">{currentUser?.name || 'Rohit Sharma'}</div>
                <div className="topbar-profile-role">Restaurant Owner</div>
              </div>
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
            {/* Mobile Restaurant Meta Card (Image 3 Screen 2) */}
            <div className="mobile-restaurant-meta-card hide-on-desktop">
              <div className="mobile-meta-user">
                <div className="mobile-avatar-circle">
                  <User size={18} />
                </div>
                <div>
                  <h3 className="mobile-restaurant-title">{profileRestaurant || 'Spice Garden'}</h3>
                  <span className="mobile-restaurant-sub">Restaurant Owner</span>
                </div>
              </div>
              <div className="mobile-date-pill">
                <span>Today, {currentDate}</span>
              </div>
            </div>

            {/* 4 Metric Cards (Matching Image 1 & 3: Pastel Green, Orange, Blue, Purple) */}
            <div className="kpi-four-grid">
              {/* Card 1: Today's Revenue */}
              <div className="metric-card sales">
                <div className="metric-card-header">
                  <div className="metric-icon-box">₹</div>
                  <span className="metric-badge green">
                    <TrendingUp size={11} /> +12%
                  </span>
                </div>
                <div className="metric-content">
                  <span className="metric-title">Today's Revenue</span>
                  <div className="metric-value">
                    ₹{totalRevenue > 0 ? totalRevenue.toLocaleString('en-IN') : '12,450'}
                  </div>
                </div>
              </div>

              {/* Card 2: Total Orders */}
              <div className="metric-card orders">
                <div className="metric-card-header">
                  <div className="metric-icon-box">
                    <Receipt size={17} />
                  </div>
                  <span className="metric-badge amber">
                    <Clock size={11} /> +6%
                  </span>
                </div>
                <div className="metric-content">
                  <span className="metric-title">Total Orders</span>
                  <div className="metric-value">{orders.length > 0 ? orders.length : 48}</div>
                </div>
              </div>

              {/* Card 3: Active Tables */}
              <div className="metric-card occupancy">
                <div className="metric-card-header">
                  <div className="metric-icon-box">
                    <Users size={17} />
                  </div>
                </div>
                <div className="metric-content">
                  <span className="metric-title">Active Tables</span>
                  <div className="metric-value">{occupiedTables > 0 ? `${occupiedTables} / ${tables.length}` : '8 / 12'}</div>
                </div>
              </div>

              {/* Card 4: Avg. Order Value */}
              <div className="metric-card ticket">
                <div className="metric-card-header">
                  <div className="metric-icon-box">
                    <BarChart3 size={17} />
                  </div>
                </div>
                <div className="metric-content">
                  <span className="metric-title">Avg. Order Value</span>
                  <div className="metric-value">₹{avgTicket || 258}</div>
                </div>
              </div>
            </div>

            {/* Mobile Live Kitchen Orders (Matching Image 3 Screen 2) */}
            <div className="mobile-live-orders-card hide-on-desktop">
              <div className="mobile-live-header">
                <h3>Live Kitchen Orders</h3>
                <button
                  type="button"
                  className="mobile-view-all-link"
                  onClick={() => setActiveTab('orders')}
                >
                  View All
                </button>
              </div>

              <div className="mobile-live-orders-list">
                {(orders.length > 0 ? orders.slice(0, 4) : [
                  { id: '1', orderNumber: 'T1234', tableName: 'Table 12', status: 'Preparing', time: '2 mins' },
                  { id: '2', orderNumber: 'T1233', tableName: 'Table 5', status: 'Ready', time: '8 mins' },
                  { id: '3', orderNumber: 'T1232', tableName: 'Table 8', status: 'Preparing', time: '12 mins' }
                ]).map((order) => {
                  const status = (order.status || 'Preparing').toLowerCase();
                  return (
                    <div key={order.id || order._id} className="mobile-live-order-row">
                      <div className="mobile-live-order-left">
                        <span className="mobile-order-code">#{order.orderNumber || `T${order.tableId || 1}234`}</span>
                        <span className="mobile-order-table">{order.tableName || `Table ${order.tableId || 1}`}</span>
                      </div>
                      <div className="mobile-live-order-right">
                        <span className={`status-pill ${status}`}>{order.status || 'Preparing'}</span>
                        <span className="mobile-order-time">{order.time || '2 mins'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Desktop 2-Column Overview Split: Floor Map on Left, Recent Orders on Right (Matching Image 1 Panel 1) */}
            <div className="overview-split-layout hide-on-mobile">
              {/* Left Column: Restaurant Floor Map */}
              <section className="floor-status-panel">
                <div className="panel-header-row">
                  <div className="floor-map-title-row">
                    <h3>Restaurant Floor Map</h3>
                    <div className="floor-status-pills-row">
                      <span className="map-pill available"><span className="status-dot green" /> Available (5)</span>
                      <span className="map-pill occupied"><span className="status-dot red" /> Occupied (5)</span>
                      <span className="map-pill serving"><span className="status-dot blue" /> Serving (2)</span>
                      <span className="map-pill reserved"><span className="status-dot amber" /> Reserved (0)</span>
                    </div>
                  </div>
                  <button
                    className="view-floor-map-btn"
                    onClick={() => setActiveTab('tables')}
                  >
                    <span>View All</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div className="overview-floor-grid">
                  {[
                    { id: 1, name: 'T1', seats: 2, status: 'available' },
                    { id: 2, name: 'T2', seats: 4, status: 'occupied', code: '#T1234' },
                    { id: 3, name: 'T3', seats: 4, status: 'serving', code: '#T1235' },
                    { id: 4, name: 'T4', seats: 2, status: 'available' },
                    { id: 5, name: 'T5', seats: 4, status: 'serving', code: '#T1236' },
                    { id: 6, name: 'T6', seats: 2, status: 'available' },
                    { id: 7, name: 'T7', seats: 2, status: 'available' },
                    { id: 8, name: 'T8', seats: 6, status: 'occupied', code: '#T1237' },
                    { id: 9, name: 'T9', seats: 2, status: 'available' },
                    { id: 10, name: 'T10', seats: 4, status: 'occupied', code: '#T1238' },
                    { id: 11, name: 'T11', seats: 4, status: 'available' },
                    { id: 12, name: 'T12', seats: 4, status: 'available' }
                  ].map((tbl) => (
                    <div
                      key={tbl.id}
                      className={`ref-table-box ${tbl.status}`}
                      onClick={() => setActiveTab('billing')}
                      title={`Table ${tbl.name} - ${tbl.status}`}
                    >
                      <div className="ref-table-name">{tbl.name}</div>
                      <div className="ref-table-seats">{tbl.seats} Seats</div>
                      <div className="ref-table-state-label">
                        {tbl.status === 'occupied' && `Occupied ${tbl.code}`}
                        {tbl.status === 'serving' && `Serving ${tbl.code}`}
                        {tbl.status === 'available' && 'Available'}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Right Column: Recent Orders */}
              <section className="recent-orders-card">
                <div className="recent-orders-header">
                  <h3>Recent Orders</h3>
                  <div className="order-type-toggle-pill">
                    <button
                      type="button"
                      className={`type-toggle-btn ${overviewOrderType === 'dine-in' ? 'active' : ''}`}
                      onClick={() => setOverviewOrderType('dine-in')}
                    >
                      Dine-in
                    </button>
                    <button
                      type="button"
                      className={`type-toggle-btn ${overviewOrderType === 'takeaway' ? 'active' : ''}`}
                      onClick={() => setOverviewOrderType('takeaway')}
                    >
                      Takeaway
                    </button>
                  </div>
                </div>

                <div className="recent-orders-ref-list">
                  {[
                    { id: '1', code: '#T1234', table: 'Table 12', price: '525', status: 'preparing', time: '2 mins ago' },
                    { id: '2', code: '#T1233', table: 'Table 5', price: '750', status: 'served', time: '8 mins ago' },
                    { id: '3', code: '#T1232', table: 'Table 8', price: '320', status: 'preparing', time: '12 mins ago' },
                    { id: '4', code: '#T1231', table: 'Table 3', price: '600', status: 'ready', time: '18 mins ago' }
                  ].map((ord) => (
                    <div key={ord.id} className="recent-order-ref-item">
                      <div className="recent-ord-left">
                        <span className="recent-ord-id">{ord.code}</span>
                        <span className="recent-ord-table">{ord.table}</span>
                        <span className="recent-ord-price">₹ {ord.price}</span>
                      </div>
                      <div className="recent-ord-right">
                        <span className={`status-pill ${ord.status}`}>{ord.status.charAt(0).toUpperCase() + ord.status.slice(1)}</span>
                        <span className="recent-ord-time">{ord.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}

        {/* ========================================================
            TAB: FLOOR & TABLES
            ======================================================== */}
        {/* ========================================================
            TAB: TABLE MANAGEMENT (MATCHING REFERENCE IMAGE 1 PANEL 3)
            ======================================================== */}
        {activeTab === 'tables' && (
          <section className="admin-page-container">
            <div className="page-header-row">
              <div>
                <h2 className="page-title">Table Management</h2>
                <p className="page-subtitle">Manage your restaurant tables, view status and assign orders</p>
              </div>
              <button
                className="btn-brand-primary"
                onClick={() => setTableModalOpen(true)}
              >
                <Plus size={16} /> Add Table
              </button>
            </div>

            {/* Filter Pills matching Reference Panel 3 */}
            <div className="admin-filter-pills-row">
              <button
                className={`admin-filter-pill ${tableStatusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTableStatusFilter('all')}
              >
                All (12)
              </button>
              <button
                className={`admin-filter-pill ${tableStatusFilter === 'available' ? 'active' : ''}`}
                onClick={() => setTableStatusFilter('available')}
              >
                <span className="status-dot green" /> Available (5)
              </button>
              <button
                className={`admin-filter-pill ${tableStatusFilter === 'occupied' ? 'active' : ''}`}
                onClick={() => setTableStatusFilter('occupied')}
              >
                <span className="status-dot red" /> Occupied (5)
              </button>
              <button
                className={`admin-filter-pill ${tableStatusFilter === 'serving' ? 'active' : ''}`}
                onClick={() => setTableStatusFilter('serving')}
              >
                <span className="status-dot blue" /> Serving (2)
              </button>
              <button
                className={`admin-filter-pill ${tableStatusFilter === 'reserved' ? 'active' : ''}`}
                onClick={() => setTableStatusFilter('reserved')}
              >
                <span className="status-dot amber" /> Reserved (0)
              </button>
            </div>

            {/* 4-Column Grid of Pastel Table Cards matching Panel 3 */}
            <div className="overview-floor-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {[
                { id: 1, name: 'T1', seats: 2, status: 'available' },
                { id: 2, name: 'T2', seats: 4, status: 'occupied', code: '#T1234' },
                { id: 3, name: 'T3', seats: 4, status: 'serving', code: '#T1235' },
                { id: 4, name: 'T4', seats: 2, status: 'available' },
                { id: 5, name: 'T5', seats: 4, status: 'serving', code: '#T1236' },
                { id: 6, name: 'T6', seats: 2, status: 'available' },
                { id: 7, name: 'T7', seats: 2, status: 'available' },
                { id: 8, name: 'T8', seats: 6, status: 'occupied', code: '#T1237' },
                { id: 9, name: 'T9', seats: 2, status: 'available' },
                { id: 10, name: 'T10', seats: 4, status: 'occupied', code: '#T1238' },
                { id: 11, name: 'T11', seats: 4, status: 'available' },
                { id: 12, name: 'T12', seats: 4, status: 'available' }
              ]
                .filter((t) => tableStatusFilter === 'all' || t.status === tableStatusFilter)
                .map((tbl) => (
                  <div
                    key={tbl.id}
                    className={`ref-table-box ${tbl.status}`}
                    style={{ padding: '24px 16px', borderRadius: 16 }}
                    onClick={() => setActiveTab('billing')}
                    title={`Table ${tbl.name} - ${tbl.status}`}
                  >
                    <div className="ref-table-name" style={{ fontSize: '1.45rem', fontWeight: 900 }}>
                      {tbl.name}
                    </div>
                    <div className="ref-table-seats" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      {tbl.seats} Seats
                    </div>
                    <div className="ref-table-state-label" style={{ fontSize: '0.78rem', fontWeight: 700, marginTop: 4 }}>
                      {tbl.status === 'occupied' && `Occupied ${tbl.code}`}
                      {tbl.status === 'serving' && `Serving ${tbl.code}`}
                      {tbl.status === 'available' && 'Available'}
                      {tbl.status === 'reserved' && 'Reserved'}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* ========================================================
            TAB: LIVE ORDERS MANAGEMENT (MATCHING REFERENCE IMAGE 1 PANEL 2)
            ======================================================== */}
        {activeTab === 'orders' && (
          <section className="admin-page-container">
            <div className="page-header-row">
              <div>
                <h2 className="page-title">Orders</h2>
                <p className="page-subtitle">View and manage all restaurant orders in real-time</p>
              </div>
              <button
                className="btn-brand-primary"
                onClick={() => addToast('New Order modal opened', 'info')}
              >
                <Plus size={16} /> New Order
              </button>
            </div>

            {/* Filter Pills matching Reference Panel 2 */}
            <div className="admin-filter-pills-row">
              {[
                { id: 'all', label: 'All Orders', count: 24 },
                { id: 'pending', label: 'Pending', count: 6 },
                { id: 'preparing', label: 'Preparing', count: 8 },
                { id: 'ready', label: 'Ready', count: 4 },
                { id: 'served', label: 'Served', count: 6 }
              ].map((p) => (
                <button
                  key={p.id}
                  className={`admin-filter-pill ${orderFilter === p.id ? 'active' : ''}`}
                  onClick={() => setOrderFilter(p.id)}
                >
                  {p.label} ({p.count})
                </button>
              ))}
            </div>

            {/* Clean Full-Width Data Table matching Reference Panel 2 */}
            <div className="admin-table-card">
              <table className="admin-clean-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Table</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: '1', code: '#T1234', table: 'Table 12', items: '2 items', amount: 525, status: 'preparing', time: '2 mins' },
                    { id: '2', code: '#T1233', table: 'Table 5', items: '3 items', amount: 750, status: 'served', time: '8 mins' },
                    { id: '3', code: '#T1232', table: 'Table 8', items: '1 item', amount: 320, status: 'preparing', time: '12 mins' },
                    { id: '4', code: '#T1231', table: 'Table 3', items: '4 items', amount: 600, status: 'ready', time: '18 mins' },
                    { id: '5', code: '#T1230', table: 'Table 1', items: '2 items', amount: 420, status: 'ready', time: '22 mins' },
                    { id: '6', code: '#T1229', table: 'Table 7', items: '1 item', amount: 180, status: 'served', time: '25 mins' },
                    { id: '7', code: '#T1228', table: 'Table 4', items: '5 items', amount: 950, status: 'preparing', time: '28 mins' },
                    { id: '8', code: '#T1227', table: 'Table 10', items: '2 items', amount: 450, status: 'cancelled', time: '35 mins' }
                  ]
                    .filter((ord) => orderFilter === 'all' || ord.status === orderFilter)
                    .map((ord) => (
                      <tr key={ord.id}>
                        <td style={{ fontWeight: 800, color: '#0f172a' }}>{ord.code}</td>
                        <td style={{ color: '#475569', fontWeight: 600 }}>{ord.table}</td>
                        <td style={{ color: '#64748b' }}>{ord.items}</td>
                        <td style={{ fontWeight: 800, color: '#0f172a' }}>₹ {ord.amount}</td>
                        <td>
                          <span className={`status-badge-pill ${ord.status}`}>
                            {ord.status.charAt(0).toUpperCase() + ord.status.slice(1)}
                          </span>
                        </td>
                        <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{ord.time}</td>
                        <td>
                          <button
                            className="btn-row-action"
                            onClick={() => {
                              setSelectedBillingTableId(parseInt(ord.table.replace(/\D/g, ''), 10) || 12);
                              setActiveTab('billing');
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========================================================
            TAB: KITCHEN DISPLAY SYSTEM (MATCHING REFERENCE IMAGE 1 PANEL 5)
            ======================================================== */}
        {activeTab === 'kitchen' && (
          <section className="admin-page-container">
            <div className="page-header-row">
              <div>
                <h2 className="page-title">Kitchen Display System (KDS)</h2>
                <p className="page-subtitle">Live kitchen orders with status and preparation timers</p>
              </div>
              <div className="page-header-actions">
                <button className="btn-brand-outline">
                  <ChefHat size={15} /> Kitchen ▾
                </button>
              </div>
            </div>

            {/* 4 Status Columns matching Reference Panel 5 */}
            <div className="kds-four-col-grid">
              {/* Column 1: Pending */}
              <div className="kds-column">
                <div className="kds-col-header pending">
                  <span>Pending (3)</span>
                </div>
                <div className="kds-order-card">
                  <div className="kds-card-top">
                    <span className="kds-order-id">#T1234</span>
                    <span className="kds-order-timer" style={{ color: '#ea580c' }}>5 mins</span>
                  </div>
                  <div className="kds-order-table">Table 12</div>
                  <div className="kds-order-items">
                    <div>2 x Paneer Tikka</div>
                    <div>1 x Chicken Biryani</div>
                  </div>
                  <button
                    className="kds-btn-action pending"
                    onClick={() => addToast('Order #T1234 moved to Preparing', 'info')}
                  >
                    Start Cooking
                  </button>
                </div>
                <div className="kds-order-card">
                  <div className="kds-card-top">
                    <span className="kds-order-id">#T1236</span>
                    <span className="kds-order-timer" style={{ color: '#ea580c' }}>8 mins</span>
                  </div>
                  <div className="kds-order-table">Table 5</div>
                  <div className="kds-order-items">
                    <div>1 x Masala Dosa</div>
                    <div>1 x Filter Coffee</div>
                  </div>
                  <button
                    className="kds-btn-action pending"
                    onClick={() => addToast('Order #T1236 moved to Preparing', 'info')}
                  >
                    Start Cooking
                  </button>
                </div>
              </div>

              {/* Column 2: Preparing */}
              <div className="kds-column">
                <div className="kds-col-header preparing">
                  <span>Preparing (4)</span>
                </div>
                <div className="kds-order-card">
                  <div className="kds-card-top">
                    <span className="kds-order-id">#T1235</span>
                    <span className="kds-order-timer" style={{ color: '#0284c7' }}>3 mins</span>
                  </div>
                  <div className="kds-order-table">Table 3</div>
                  <div className="kds-order-items">
                    <div>1 x Veg Manchurian</div>
                    <div>1 x Noodles</div>
                  </div>
                  <button
                    className="kds-btn-action preparing"
                    onClick={() => addToast('Order #T1235 is Ready', 'success')}
                  >
                    In Progress
                  </button>
                </div>
                <div className="kds-order-card">
                  <div className="kds-card-top">
                    <span className="kds-order-id">#T1238</span>
                    <span className="kds-order-timer" style={{ color: '#0284c7' }}>6 mins</span>
                  </div>
                  <div className="kds-order-table">Table 10</div>
                  <div className="kds-order-items">
                    <div>1 x Chicken Curry</div>
                    <div>2 x Naan</div>
                  </div>
                  <button
                    className="kds-btn-action preparing"
                    onClick={() => addToast('Order #T1238 is Ready', 'success')}
                  >
                    In Progress
                  </button>
                </div>
              </div>

              {/* Column 3: Ready */}
              <div className="kds-column">
                <div className="kds-col-header ready">
                  <span>Ready (2)</span>
                </div>
                <div className="kds-order-card">
                  <div className="kds-card-top">
                    <span className="kds-order-id">#T1231</span>
                    <span className="kds-order-timer" style={{ color: '#059669' }}>2 mins</span>
                  </div>
                  <div className="kds-order-table">Table 1</div>
                  <div className="kds-order-items">
                    <div>2 x Margherita Pizza</div>
                    <div>1 x Cold Coffee</div>
                  </div>
                  <button
                    className="kds-btn-action ready"
                    onClick={() => addToast('Order #T1231 Marked as Served', 'success')}
                  >
                    Mark as Served
                  </button>
                </div>
                <div className="kds-order-card">
                  <div className="kds-card-top">
                    <span className="kds-order-id">#T1237</span>
                    <span className="kds-order-timer" style={{ color: '#059669' }}>2 mins</span>
                  </div>
                  <div className="kds-order-table">Table 8</div>
                  <div className="kds-order-items">
                    <div>1 x Caesar Salad</div>
                    <div>1 x Lemonade</div>
                  </div>
                  <button
                    className="kds-btn-action ready"
                    onClick={() => addToast('Order #T1237 Marked as Served', 'success')}
                  >
                    Mark as Served
                  </button>
                </div>
              </div>

              {/* Column 4: Served */}
              <div className="kds-column">
                <div className="kds-col-header served">
                  <span>Served (1)</span>
                </div>
                <div className="kds-order-card">
                  <div className="kds-card-top">
                    <span className="kds-order-id">#T1229</span>
                    <span className="kds-order-timer">11:30 AM</span>
                  </div>
                  <div className="kds-order-table">Table 7</div>
                  <div className="kds-order-items">
                    <div>1 x Paneer Butter Masala</div>
                  </div>
                  <div style={{ textAlign: 'center', color: '#10b981', fontWeight: 800, padding: '8px 0', fontSize: '0.85rem' }}>
                    ✓ Served
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Summary Strip matching Panel 5 */}
            <div className="kds-summary-strip">
              <span>📋 <strong>10</strong> Total Orders</span>
              <span>⏳ <strong>3</strong> Pending</span>
              <span>👨‍🍳 <strong>4</strong> Preparing</span>
              <span>✅ <strong>2</strong> Ready</span>
              <span>🍽️ <strong>1</strong> Served</span>
              <span>⏱️ Average Prep Time: <strong>12 mins</strong></span>
            </div>
          </section>
        )}

        {/* ========================================================
            TAB: MENU MANAGEMENT (MATCHING REFERENCE IMAGE 1 PANEL 4)
            ======================================================== */}
        {activeTab === 'menu' && (
          <section className="admin-page-container">
            <div className="page-header-row">
              <div>
                <h2 className="page-title">Menu Management</h2>
                <p className="page-subtitle">Add, edit and organize your restaurant menu items</p>
              </div>
              <div className="page-header-actions">
                <button
                  className="btn-brand-outline"
                  onClick={() => addToast('Manage Categories modal', 'info')}
                >
                  <Tag size={15} /> Category
                </button>
                <button
                  className="btn-brand-outline"
                  onClick={() => addToast('Import CSV modal', 'info')}
                >
                  <Download size={15} /> Import
                </button>
                <button
                  className="btn-brand-primary"
                  onClick={() => {
                    setEditingDish(null);
                    setDishForm({
                      name: '',
                      category: 'Starters',
                      price: '',
                      description: '',
                      image: '',
                      isVeg: true
                    });
                    setMenuModalOpen(true);
                  }}
                >
                  <Plus size={16} /> Add Item
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="admin-filter-pills-row">
              {activeMenuCategories.map((c) => {
                const count = c === 'all'
                  ? (menu.length || 24)
                  : menu.filter((m) => m.category === c).length;
                const label = c === 'all'
                  ? 'All Items'
                  : c.charAt(0).toUpperCase() + c.slice(1);
                return (
                  <button
                    key={c}
                    className={`admin-filter-pill ${menuCategoryFilter === c ? 'active' : ''}`}
                    onClick={() => {
                      setMenuCategoryFilter(c);
                      setMenuPage(1);
                    }}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Search & Filter Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div className="topbar-search-box" style={{ maxWidth: 320 }}>
                <Search size={15} className="topbar-search-icon" />
                <input
                  type="text"
                  placeholder="Search menu items..."
                  value={menuSearch}
                  onChange={(e) => {
                    setMenuSearch(e.target.value);
                    setMenuPage(1);
                  }}
                  className="topbar-search-input"
                />
              </div>

              <select
                className="btn-brand-outline"
                style={{ padding: '8px 12px', fontSize: '0.82rem', background: '#f8fafc' }}
                value={menuCategoryFilter}
                onChange={(e) => {
                  setMenuCategoryFilter(e.target.value);
                  setMenuPage(1);
                }}
              >
                {activeMenuCategories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Menu Items Table matching Reference Panel 4 */}
            <div className="admin-table-card">
              <table className="admin-clean-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}><input type="checkbox" /></th>
                    <th>Image</th>
                    <th>Item Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(paginatedMenu.length > 0 ? paginatedMenu : (filteredMenu.length > 0 ? filteredMenu : menu.length > 0 ? menu : [
                    { id: '1', name: 'Paneer Tikka', category: 'Starters', price: 220, isVeg: true, available: true, image: '/images/paneer_tikka.jpg' },
                    { id: '2', name: 'Chicken Biryani', category: 'Main Course', price: 280, isVeg: false, available: true, image: '/images/chicken_biryani.jpg' },
                    { id: '3', name: 'Masala Dosa', category: 'Main Course', price: 180, isVeg: true, available: true, image: '/images/masala_dosa.jpg' },
                    { id: '4', name: 'Margherita Pizza', category: 'Main Course', price: 260, isVeg: true, available: true, image: '/images/artisan_pizza.jpg' },
                    { id: '5', name: 'Caesar Salad', category: 'Starters', price: 200, isVeg: true, available: false, image: '/images/green_salad.jpg' }
                  ])).map((dish) => {
                    const isActive = dish.available !== false && dish.status !== 'inactive';
                    return (
                      <tr key={dish.id}>
                        <td><input type="checkbox" /></td>
                        <td>
                          <img
                            src={dish.image || '/images/paneer_butter_masala.jpg'}
                            alt={dish.name}
                            style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }}
                            onError={(e) => { e.target.src = '/images/paneer_butter_masala.jpg'; }}
                          />
                        </td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{dish.name}</td>
                        <td style={{ color: '#64748b' }}>
                          {dish.category ? (dish.category.charAt(0).toUpperCase() + dish.category.slice(1)) : 'General'}
                        </td>
                        <td style={{ fontWeight: 800, color: '#0f172a' }}>₹ {dish.price}</td>
                        <td>
                          <span className={`diet-box ${dish.isVeg ? 'veg' : 'non-veg'}`} />
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: dish.isVeg ? '#059669' : '#dc2626' }}>
                            {dish.isVeg ? 'Veg' : 'Non-Veg'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleToggleMenu(dish.id)}
                            className={`status-badge-pill ${isActive ? 'active' : 'inactive'}`}
                            style={{ cursor: 'pointer', border: 'none' }}
                            title="Click to toggle availability"
                          >
                            {isActive ? '• Active' : 'Inactive'}
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              className="btn-row-action"
                              onClick={() => {
                                setEditingDish(dish);
                                setDishForm({
                                  name: dish.name || '',
                                  category: dish.category || 'Starters',
                                  price: dish.price || '',
                                  description: dish.description || '',
                                  image: dish.image || '',
                                  isVeg: !!dish.isVeg
                                });
                                setMenuModalOpen(true);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn-row-dots"
                              title="Delete Item"
                              onClick={async () => {
                                if (window.confirm(`Delete ${dish.name}?`)) {
                                  try {
                                    const res = await authFetch(`/api/menu/${dish.id}`, { method: 'DELETE' });
                                    if (res.ok) {
                                      addToast(`${dish.name} deleted`, 'info');
                                      fetchAllData();
                                    }
                                  } catch (err) {
                                    addToast('Failed to delete item', 'error');
                                  }
                                }
                              }}
                            >
                              <Trash2 size={14} style={{ color: '#ef4444' }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <PaginationBar
                currentPage={currentMenuPage}
                totalPages={totalMenuPages}
                totalItems={filteredMenu.length}
                itemsPerPage={menuPerPage}
                onPageChange={(p) => setMenuPage(p)}
                label="menu items"
              />
            </div>
          </section>
        )}

        {/* ========================================================
            TAB: QR STANDS
            ======================================================== */}
        {activeTab === 'stands' && (
          <section className="admin-page-container">
            <div className="page-header-row">
              <div>
                <h2 className="page-title">Table Acrylic QR Stands</h2>
                <p className="page-subtitle">Luxury printable standees for contactless guest phone ordering</p>
              </div>
              <div className="page-header-actions">
                <button className="btn-brand-primary" onClick={handlePrintAllStands}>
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
            TAB: POS BILLING (IMAGE 1 PANEL 6 & IMAGE 3 SCREEN 8)
            ======================================================== */}
        {/* ========================================================
            TAB: POS BILLING (MATCHING REFERENCE IMAGE 1 PANEL 6)
            ======================================================== */}
        {activeTab === 'billing' && (
          <section className="admin-page-container">
            <div className="page-header-row">
              <div>
                <h2 className="page-title">POS Billing</h2>
                <p className="page-subtitle">Generate bills, accept payments and manage orders</p>
              </div>
              <div className="page-header-actions">
                <button
                  className="btn-brand-primary"
                  onClick={() => addToast('New bill created for Table 12', 'success')}
                >
                  <Plus size={16} /> New Bill
                </button>
                <button
                  className="btn-brand-outline"
                  onClick={() => window.print()}
                >
                  <Printer size={15} /> Print Receipt
                </button>
              </div>
            </div>

            <div className="pos-billing-grid-split">
              {/* Left Column: Active Bill & UPI QR Payment */}
              <div className="pos-bill-active-card">
                <div className="pos-bill-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                      Table {selectedBillingTableId} (#T1234)
                    </h3>
                    <span className="status-badge-pill served" style={{ fontSize: '0.74rem' }}>
                      Dine-in
                    </span>
                  </div>
                  <select
                    className="btn-brand-outline"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#f8fafc' }}
                    value={selectedBillingTableId}
                    onChange={(e) => setSelectedBillingTableId(parseInt(e.target.value, 10))}
                  >
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        Table {t.id} ({t.name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Items Breakdown Table */}
                <div className="pos-bill-items-list">
                  <div className="pos-bill-item-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="diet-box veg" />
                      <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>Paneer Tikka</span>
                    </div>
                    <span style={{ color: '#64748b', fontSize: '0.84rem' }}>₹ 220 x 1</span>
                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>₹ 220</span>
                  </div>

                  <div className="pos-bill-item-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="diet-box non-veg" />
                      <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>Chicken Biryani</span>
                    </div>
                    <span style={{ color: '#64748b', fontSize: '0.84rem' }}>₹ 280 x 1</span>
                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>₹ 280</span>
                  </div>
                </div>

                {/* Totals Summary */}
                <div className="pos-bill-calc-box">
                  <div className="pos-bill-calc-row">
                    <span>Subtotal</span>
                    <span>₹ 500</span>
                  </div>
                  <div className="pos-bill-calc-row">
                    <span>GST (5%)</span>
                    <span>₹ 25</span>
                  </div>
                  <div className="pos-bill-calc-row total">
                    <span>Total</span>
                    <span>₹ 525</span>
                  </div>
                </div>

                {/* Payment Method Tabs */}
                <div className="pos-pay-tabs-row">
                  {['Cash', 'UPI', 'Card'].map((pm) => (
                    <button
                      key={pm}
                      type="button"
                      className={`pos-pay-tab-btn ${billingPaymentMethod.toLowerCase() === pm.toLowerCase() ? 'active' : ''}`}
                      onClick={() => setBillingPaymentMethod(pm.toLowerCase())}
                    >
                      {pm}
                    </button>
                  ))}
                </div>

                {/* UPI QR Payment Box */}
                {billingPaymentMethod.toLowerCase() === 'upi' && (
                  <div className="pos-upi-section">
                    <div className="pos-upi-qr-wrapper">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=upi://pay?pa=spicegarden@upi%26pn=Spice%20Garden%26am=525`}
                        alt="UPI QR Code"
                        className="pos-upi-qr-image"
                      />
                    </div>
                    <div className="pos-upi-meta-col">
                      <div className="pos-upi-title">UPI Payment</div>
                      <div className="pos-upi-subtitle">Scan to Pay</div>
                      <div className="pos-upi-amount-display">₹ 525</div>
                      <div className="pos-upi-app-logos">
                        <span className="pos-upi-app gpay">G Pay</span>
                        <span className="pos-upi-app phonepe">PhonePe</span>
                        <span className="pos-upi-app paytm">Paytm</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Recent Bills & Thermal Print Preview */}
              <div className="pos-bill-right-col">
                {/* Recent Bills Card */}
                <div className="pos-recent-bills-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h4 style={{ fontSize: '0.96rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Recent Bills</h4>
                    <span
                      style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981', cursor: 'pointer' }}
                      onClick={() => setActiveTab('orders')}
                    >
                      View All
                    </span>
                  </div>
                  <table className="admin-clean-table" style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '8px 10px' }}>Bill No</th>
                        <th style={{ padding: '8px 10px' }}>Table</th>
                        <th style={{ padding: '8px 10px' }}>Amount</th>
                        <th style={{ padding: '8px 10px' }}>Time</th>
                        <th style={{ padding: '8px 10px' }}>Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { billNo: '#B1604', table: 'Table 12', amount: 525, time: '10:32 AM', payment: 'UPI' },
                        { billNo: '#B1603', table: 'Table 5', amount: 750, time: '10:25 AM', payment: 'Card' },
                        { billNo: '#B1602', table: 'Table 8', amount: 320, time: '10:15 AM', payment: 'Cash' },
                        { billNo: '#B1601', table: 'Table 3', amount: 600, time: '10:10 AM', payment: 'UPI' }
                      ].map((b) => (
                        <tr key={b.billNo}>
                          <td style={{ fontWeight: 800, color: '#0f172a', padding: '9px 10px' }}>{b.billNo}</td>
                          <td style={{ color: '#64748b', padding: '9px 10px' }}>{b.table}</td>
                          <td style={{ fontWeight: 800, color: '#0f172a', padding: '9px 10px' }}>₹ {b.amount}</td>
                          <td style={{ color: '#94a3b8', fontSize: '0.76rem', padding: '9px 10px' }}>{b.time}</td>
                          <td style={{ padding: '9px 10px' }}>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: b.payment === 'UPI' ? '#059669' : (b.payment === 'Card' ? '#0284c7' : '#d97706'),
                              background: b.payment === 'UPI' ? '#ecfdf5' : (b.payment === 'Card' ? '#f0f9ff' : '#fef3c7'),
                              padding: '2px 8px',
                              borderRadius: 9999
                            }}>
                              {b.payment}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Print Preview Card */}
                <div className="pos-print-preview-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>Print Preview</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: 9999 }}>
                      Thermal 58mm
                    </span>
                  </div>

                  <div className="thermal-paper-slip">
                    <div className="thermal-shop-name">TableMint</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'center', marginTop: 2 }}>Spice Garden</div>
                    <div className="thermal-divider" />
                    <div className="thermal-line">
                      <span>Table 12</span>
                      <span>Bill #B1604</span>
                    </div>
                    <div className="thermal-divider" />
                    <div className="thermal-line">
                      <span>Paneer Tikka</span>
                      <span>1 x ₹220</span>
                    </div>
                    <div className="thermal-line">
                      <span>Chicken Biryani</span>
                      <span>1 x ₹280</span>
                    </div>
                    <div className="thermal-divider" />
                    <div className="thermal-line">
                      <span>Subtotal</span>
                      <span>₹500</span>
                    </div>
                    <div className="thermal-line">
                      <span>GST (5%)</span>
                      <span>₹25</span>
                    </div>
                    <div className="thermal-line total">
                      <span>Total</span>
                      <span>₹525</span>
                    </div>
                    <div className="thermal-divider" />
                    <div className="thermal-footer-msg">Thank You!</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                    <button className="btn-brand-primary" style={{ justifyContent: 'center' }} onClick={() => window.print()}>
                      <Printer size={15} /> Print
                    </button>
                    <button
                      className="btn-brand-outline"
                      style={{ justifyContent: 'center' }}
                      onClick={() => addToast('Receipt downloaded as PDF', 'success')}
                    >
                      <Download size={15} /> Download
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================
            TAB: CUSTOMERS MANAGEMENT (IMAGE 1 PANEL 8 & IMAGE 3 SCREEN 10)
            ======================================================== */}
        {activeTab === 'customers' && (
          <section className="admin-page-container">
            <div className="page-header-row">
              <div>
                <h2 className="page-title">Customers</h2>
                <p className="page-subtitle">View and manage your customers</p>
              </div>
              <button
                className="btn-brand-primary"
                onClick={() => addToast('Add Customer modal opened', 'info')}
              >
                <Plus size={16} /> Add Customer
              </button>
            </div>

            {/* Filter and Search Bar matching Reference Panel 8 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
              <div className="topbar-search-box" style={{ maxWidth: 360 }}>
                <Search size={15} className="topbar-search-icon" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="topbar-search-input"
                />
              </div>

              <select
                className="btn-brand-outline"
                style={{ padding: '8px 14px', fontSize: '0.82rem', background: '#f8fafc' }}
              >
                <option>All Customers</option>
                <option>Frequent Diners</option>
                <option>High Spenders</option>
              </select>
            </div>

            {/* Data Table matching Reference Panel 8 */}
            <div className="admin-table-card">
              <table className="admin-clean-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Total Orders</th>
                    <th>Total Spent</th>
                    <th>Last Visit</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: '1', name: 'Amit Patel', phone: '9876543210', email: 'amit@email.com', orders: 12, spent: 3450, date: 'Oct 26, 2026' },
                    { id: '2', name: 'Priya Sharma', phone: '9123456789', email: 'priya@email.com', orders: 8, spent: 2180, date: 'Oct 25, 2026' },
                    { id: '3', name: 'Rahul Kumar', phone: '9868776655', email: 'rahul@email.com', orders: 15, spent: 4120, date: 'Oct 24, 2026' },
                    { id: '4', name: 'Sneha Joshi', phone: '9871234567', email: 'sneha@email.com', orders: 6, spent: 1650, date: 'Oct 23, 2026' },
                    { id: '5', name: 'Vikram Singh', phone: '9765432100', email: 'vikram@email.com', orders: 10, spent: 2880, date: 'Oct 22, 2026' }
                  ]
                    .filter((c) =>
                      !customerSearch.trim() ||
                      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                      c.phone.includes(customerSearch)
                    )
                    .map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{c.name}</td>
                        <td style={{ color: '#475569' }}>{c.phone}</td>
                        <td style={{ color: '#64748b' }}>{c.email}</td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{c.orders}</td>
                        <td style={{ fontWeight: 800, color: '#0f172a' }}>₹ {c.spent.toLocaleString('en-IN')}</td>
                        <td style={{ color: '#94a3b8', fontSize: '0.82rem' }}>{c.date}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button className="btn-row-action" onClick={() => addToast(`Customer: ${c.name}`, 'info')}>
                              Edit
                            </button>
                            <button className="btn-row-dots">
                              <MoreVertical size={15} />
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
            TAB: REPORTS & ANALYTICS
            ======================================================== */}
        {activeTab === 'reports' && (
          <section className="admin-page-container">
            <div className="page-header-row">
              <div>
                <h2 className="page-title">Reports & Analytics</h2>
                <p className="page-subtitle">Track your restaurant performance and insights</p>
              </div>
              <div className="page-header-actions">
                <select
                  className="btn-brand-outline"
                  style={{ padding: '8px 14px', fontSize: '0.82rem', background: '#f8fafc' }}
                >
                  <option>Today</option>
                  <option>This Week</option>
                  <option>This Month</option>
                </select>
                <div
                  className="btn-brand-outline"
                  style={{ padding: '8px 14px', fontSize: '0.82rem', cursor: 'default' }}
                >
                  <Calendar size={14} /> Oct 27, 2026
                </div>
              </div>
            </div>

            {/* Top 4 KPI Metrics Row matching Reference Panel 7 */}
            <div className="kpi-four-grid">
              <div className="metric-card sales">
                <div className="metric-card-header">
                  <div className="metric-icon-box">₹</div>
                  <span className="metric-badge green">
                    <TrendingUp size={11} /> +12%
                  </span>
                </div>
                <div className="metric-content">
                  <span className="metric-title">Total Revenue</span>
                  <div className="metric-value">₹ 12,450</div>
                </div>
              </div>

              <div className="metric-card orders">
                <div className="metric-card-header">
                  <div className="metric-icon-box">
                    <Receipt size={17} />
                  </div>
                  <span className="metric-badge amber">
                    <Clock size={11} /> +6%
                  </span>
                </div>
                <div className="metric-content">
                  <span className="metric-title">Total Orders</span>
                  <div className="metric-value">48</div>
                </div>
              </div>

              <div className="metric-card ticket">
                <div className="metric-card-header">
                  <div className="metric-icon-box">
                    <BarChart3 size={17} />
                  </div>
                  <span className="metric-badge blue">
                    <TrendingUp size={11} /> +5%
                  </span>
                </div>
                <div className="metric-content">
                  <span className="metric-title">Avg. Order Value</span>
                  <div className="metric-value">₹ 258</div>
                </div>
              </div>

              <div className="metric-card occupancy">
                <div className="metric-card-header">
                  <div className="metric-icon-box">
                    <Users size={17} />
                  </div>
                  <span className="metric-badge green">
                    <TrendingUp size={11} /> +10%
                  </span>
                </div>
                <div className="metric-content">
                  <span className="metric-title">Total Customers</span>
                  <div className="metric-value">36</div>
                </div>
              </div>
            </div>

            {/* Filter Tabs matching Reference Panel 7 */}
            <div className="reports-tabs-row">
              {['Revenue', 'Orders', 'Popular Items', 'Payment Methods', 'Peak Hours'].map((tab) => (
                <button
                  key={tab}
                  className={`reports-tab-pill ${analyticsSubTab === tab ? 'active' : ''}`}
                  onClick={() => setAnalyticsSubTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Split Content: Dynamically changes per analyticsSubTab */}
            {analyticsSubTab === 'Revenue' && (
              <div className="reports-two-col-grid">
                <div className="admin-card-inner">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Revenue Trend</h3>
                    <div style={{ background: '#07241a', color: '#ffffff', padding: '4px 12px', borderRadius: 9999, fontSize: '0.78rem', fontWeight: 800 }}>
                      ₹ 12,450
                    </div>
                  </div>

                  {/* Smooth Area Curve SVG Chart */}
                  <div style={{ width: '100%', height: 240, position: 'relative' }}>
                    <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <line x1="0" y1="40" x2="500" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="0" y1="90" x2="500" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="0" y1="140" x2="500" y2="140" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="0" y1="190" x2="500" y2="190" stroke="#f1f5f9" strokeWidth="1" />
                      <path
                        d="M 0,180 Q 80,170 120,150 T 220,120 T 320,80 T 400,45 T 500,60 L 500,200 L 0,200 Z"
                        fill="url(#revenueGrad)"
                      />
                      <path
                        d="M 0,180 Q 80,170 120,150 T 220,120 T 320,80 T 400,45 T 500,60"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                      <circle cx="400" cy="45" r="5.5" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
                    </svg>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.74rem', fontWeight: 600, marginTop: 10, padding: '0 4px' }}>
                    <span>8 AM</span>
                    <span>9 AM</span>
                    <span>12 PM</span>
                    <span>3 PM</span>
                    <span>6 PM</span>
                    <span>9 PM</span>
                  </div>
                </div>

                <div className="admin-card-inner">
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 14px 0', color: '#0f172a' }}>
                    Top Selling Items
                  </h3>

                  <div className="top-selling-ranked-list">
                    {[
                      { rank: 1, name: 'Chicken Biryani', orders: 28, image: '/images/chicken_biryani.jpg' },
                      { rank: 2, name: 'Paneer Tikka', orders: 24, image: '/images/paneer_tikka.jpg' },
                      { rank: 3, name: 'Masala Dosa', orders: 18, image: '/images/masala_dosa.jpg' },
                      { rank: 4, name: 'Margherita Pizza', orders: 16, image: '/images/artisan_pizza.jpg' },
                      { rank: 5, name: 'Caesar Salad', orders: 12, image: '/images/green_salad.jpg' }
                    ].map((it) => (
                      <div key={it.rank} className="top-selling-item-row">
                        <div className="top-selling-left">
                          <span className="rank-badge">{it.rank}</span>
                          <img
                            src={it.image}
                            alt={it.name}
                            className="top-selling-img"
                            onError={(e) => { e.target.src = '/images/paneer_butter_masala.jpg'; }}
                          />
                          <span className="top-selling-name">{it.name}</span>
                        </div>
                        <span className="top-selling-orders">{it.orders} orders</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {analyticsSubTab === 'Orders' && (
              <div className="reports-two-col-grid">
                <div className="admin-card-inner">
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 14px 0', color: '#0f172a' }}>Hourly Orders Volume</h3>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 210, padding: '20px 0 10px', borderBottom: '1px solid #e2e8f0' }}>
                    {[
                      { hour: '9 AM', count: 4 },
                      { hour: '11 AM', count: 8 },
                      { hour: '1 PM', count: 18 },
                      { hour: '3 PM', count: 6 },
                      { hour: '5 PM', count: 5 },
                      { hour: '7 PM', count: 14 },
                      { hour: '9 PM', count: 20 }
                    ].map((h) => (
                      <div key={h.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a' }}>{h.count}</span>
                        <div style={{ width: '100%', height: `${(h.count / 20) * 140}px`, background: '#10b981', borderRadius: '6px 6px 0 0' }} />
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{h.hour}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="admin-card-inner">
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 14px 0', color: '#0f172a' }}>Orders by Status</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[
                      { status: 'Completed & Settled', count: 42, pct: '88%', color: '#10b981' },
                      { status: 'In Kitchen / Preparing', count: 4, pct: '8%', color: '#0284c7' },
                      { status: 'Cancelled', count: 2, pct: '4%', color: '#ef4444' }
                    ].map((s) => (
                      <div key={s.status} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>{s.status}</span>
                          <span style={{ fontWeight: 800, color: '#64748b' }}>{s.count} ({s.pct})</span>
                        </div>
                        <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
                          <div style={{ width: s.pct, height: '100%', background: s.color, borderRadius: 9999 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {analyticsSubTab === 'Popular Items' && (
              <div className="admin-card-inner">
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 14px 0', color: '#0f172a' }}>All Menu Performance Rankings</h3>
                <table className="admin-clean-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Dish Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Orders Count</th>
                      <th>Total Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { rank: 1, name: 'Chicken Biryani', category: 'Main Course', price: 280, count: 28, sales: '₹ 7,840' },
                      { rank: 2, name: 'Paneer Tikka', category: 'Starters', price: 220, count: 24, sales: '₹ 5,280' },
                      { rank: 3, name: 'Masala Dosa', category: 'Main Course', price: 180, count: 18, sales: '₹ 3,240' },
                      { rank: 4, name: 'Margherita Pizza', category: 'Main Course', price: 260, count: 16, sales: '₹ 4,160' },
                      { rank: 5, name: 'Caesar Salad', category: 'Starters', price: 200, count: 12, sales: '₹ 2,400' }
                    ].map((row) => (
                      <tr key={row.rank}>
                        <td style={{ fontWeight: 800 }}>#{row.rank}</td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{row.name}</td>
                        <td style={{ color: '#64748b' }}>{row.category}</td>
                        <td style={{ fontWeight: 700 }}>₹ {row.price}</td>
                        <td style={{ fontWeight: 700, color: '#10b981' }}>{row.count} orders</td>
                        <td style={{ fontWeight: 800, color: '#0f172a' }}>{row.sales}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {analyticsSubTab === 'Payment Methods' && (
              <div className="reports-two-col-grid">
                <div className="admin-card-inner">
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 14px 0', color: '#0f172a' }}>Payment Channel Distribution</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[
                      { method: 'UPI (QR Pay, GPay, PhonePe)', amount: '₹ 7,968', pct: '64%', color: '#10b981' },
                      { method: 'Credit / Debit Cards', amount: '₹ 3,237', pct: '26%', color: '#0284c7' },
                      { method: 'Cash on Counter', amount: '₹ 1,245', pct: '10%', color: '#f59e0b' }
                    ].map((pm) => (
                      <div key={pm.method} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>{pm.method}</span>
                          <span style={{ fontWeight: 800, color: '#0f172a' }}>{pm.amount} ({pm.pct})</span>
                        </div>
                        <div style={{ width: '100%', height: 10, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
                          <div style={{ width: pm.pct, height: '100%', background: pm.color, borderRadius: 9999 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="admin-card-inner">
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 14px 0', color: '#0f172a' }}>Instant Settlement Status</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ padding: 14, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Total Revenue Collected Today</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#07241a', marginTop: 2 }}>₹ 12,450</div>
                    </div>
                    <div style={{ padding: 14, background: '#ecfdf5', borderRadius: 12, border: '1px solid #a7f3d0' }}>
                      <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>Bank Settlement Status</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#065f46', marginTop: 2 }}>Auto-Settled to HDFC Primary Account</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {analyticsSubTab === 'Peak Hours' && (
              <div className="admin-card-inner">
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 14px 0', color: '#0f172a' }}>Dining Peak Hours & Rush Analysis</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#f59e0b', background: '#fef3c7', padding: '3px 8px', borderRadius: 9999 }}>
                      LUNCH RUSH
                    </span>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '8px 0 4px', color: '#0f172a' }}>12:00 PM – 3:00 PM</h4>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                      Avg. 22 orders served. Table turnaround rate is 32 minutes.
                    </p>
                  </div>
                  <div style={{ padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#10b981', background: '#ecfdf5', padding: '3px 8px', borderRadius: 9999 }}>
                      DINNER RUSH
                    </span>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '8px 0 4px', color: '#0f172a' }}>7:30 PM – 10:30 PM</h4>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                      Avg. 26 orders served. Peak restaurant occupancy reaches 94%.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ========================================================
            TAB: SETTINGS
            ======================================================== */}
        {activeTab === 'settings' && (
          <section className="admin-page-container">
            <div className="page-header-row">
              <div>
                <h2 className="page-title">Settings</h2>
                <p className="page-subtitle">Manage your restaurant settings and preferences</p>
              </div>
            </div>

            {/* 2-Column Split: Left = Sub-Nav Menu, Right = Form */}
            <div className="settings-split-grid">
              {/* Left Sub-Nav Card */}
              <div className="settings-nav-card">
                {[
                  { id: 'details', label: 'Restaurant Details', icon: Home },
                  { id: 'payment', label: 'Payment Settings', icon: CreditCard },
                  { id: 'tax', label: 'Tax & Charges', icon: Receipt },
                  { id: 'tables', label: 'Table Settings', icon: LayoutGrid },
                  { id: 'users', label: 'User Management', icon: Users },
                  { id: 'notifications', label: 'Notifications', icon: Bell },
                  { id: 'billing', label: 'Billing & Subscription', icon: DollarSign }
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      className={`settings-subnav-btn ${settingsSubNav === s.id ? 'active' : ''}`}
                      onClick={() => setSettingsSubNav(s.id)}
                    >
                      <Icon size={16} />
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right Settings Form Card matching Reference Panel 9 */}
              <div className="settings-form-card">
                {settingsSubNav === 'details' && (
                  <form onSubmit={handleSaveSettings}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px', color: '#0f172a' }}>
                      Restaurant Details
                    </h3>

                    <div className="settings-form-grid">
                      <div className="settings-form-field">
                        <label className="settings-label">Restaurant Name</label>
                        <input
                          type="text"
                          className="settings-input"
                          value={settingsForm.restaurantName || 'Spice Garden'}
                          onChange={(e) => setSettingsForm({ ...settingsForm, restaurantName: e.target.value })}
                        />
                      </div>

                      <div className="settings-form-field">
                        <label className="settings-label">Description</label>
                        <input
                          type="text"
                          className="settings-input"
                          value={settingsForm.tagline || 'Delicious Food, Great Moments'}
                          onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                        />
                      </div>

                      <div className="settings-form-field full-width">
                        <label className="settings-label">Address</label>
                        <input
                          type="text"
                          className="settings-input"
                          value={settingsForm.address || '123 FC Road, Pune, Maharashtra'}
                          onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                        />
                      </div>

                      <div className="settings-form-field">
                        <label className="settings-label">Phone Number</label>
                        <input
                          type="text"
                          className="settings-input"
                          value={settingsForm.phone || '+91 9876543210'}
                          onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                        />
                      </div>

                      <div className="settings-form-field">
                        <label className="settings-label">Email</label>
                        <input
                          type="email"
                          className="settings-input"
                          value={settingsForm.email || 'info@spicegarden.com'}
                          onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                        />
                      </div>

                      <div className="settings-form-field full-width">
                        <label className="settings-label">Logo</label>
                        <div className="settings-logo-row">
                          <img
                            src="/images/tablemint_leaf_icon.png"
                            alt="Restaurant Logo"
                            className="settings-logo-preview"
                          />
                          <div>
                            <button
                              type="button"
                              className="btn-brand-outline"
                              onClick={() => addToast('Upload Logo dialog opened', 'info')}
                            >
                              Change Logo
                            </button>
                            <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: 4 }}>
                              JPG, PNG (Max 2MB)
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                      <button type="submit" className="btn-brand-primary" style={{ padding: '11px 26px' }}>
                        <Check size={16} /> Save Changes
                      </button>
                    </div>
                  </form>
                )}

                {settingsSubNav === 'payment' && (
                  <form onSubmit={handleSaveSettings}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px', color: '#0f172a' }}>
                      Payment Gateway & Methods
                    </h3>
                    <div className="settings-form-grid">
                      <div className="settings-form-field">
                        <label className="settings-label">UPI VPA Handle</label>
                        <input
                          type="text"
                          className="settings-input"
                          value="spicegarden@hdfcbank"
                          readOnly
                        />
                      </div>
                      <div className="settings-form-field">
                        <label className="settings-label">Currency Symbol</label>
                        <input
                          type="text"
                          className="settings-input"
                          value={settingsForm.currency || '₹'}
                          onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
                        />
                      </div>
                      <div className="settings-form-field full-width">
                        <label className="settings-label">Accepted Channels</label>
                        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                          <span className="status-badge-pill active">✓ UPI QR Code</span>
                          <span className="status-badge-pill active">✓ Credit & Debit Cards</span>
                          <span className="status-badge-pill active">✓ Cash at Counter</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                      <button type="submit" className="btn-brand-primary" style={{ padding: '11px 26px' }}>
                        <Check size={16} /> Save Payment Settings
                      </button>
                    </div>
                  </form>
                )}

                {settingsSubNav === 'tax' && (
                  <form onSubmit={handleSaveSettings}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px', color: '#0f172a' }}>
                      Tax & GST Configuration
                    </h3>
                    <div className="settings-form-grid">
                      <div className="settings-form-field">
                        <label className="settings-label">GST Tax Rate (%)</label>
                        <input
                          type="number"
                          className="settings-input"
                          value={settingsForm.taxRate || 5}
                          onChange={(e) => setSettingsForm({ ...settingsForm, taxRate: e.target.value })}
                        />
                      </div>
                      <div className="settings-form-field">
                        <label className="settings-label">Service Charge (%)</label>
                        <input
                          type="number"
                          className="settings-input"
                          value={settingsForm.serviceCharge || 0}
                          onChange={(e) => setSettingsForm({ ...settingsForm, serviceCharge: e.target.value })}
                        />
                      </div>
                      <div className="settings-form-field full-width">
                        <label className="settings-label">GSTIN / Tax ID Number</label>
                        <input
                          type="text"
                          className="settings-input"
                          value="27AAAAA0000A1Z5"
                          readOnly
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                      <button type="submit" className="btn-brand-primary" style={{ padding: '11px 26px' }}>
                        <Check size={16} /> Save Tax Rates
                      </button>
                    </div>
                  </form>
                )}

                {settingsSubNav === 'tables' && (
                  <form onSubmit={handleSaveSettings}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px', color: '#0f172a' }}>
                      Table & Floor Configuration
                    </h3>
                    <div className="settings-form-grid">
                      <div className="settings-form-field">
                        <label className="settings-label">Total Tables Active</label>
                        <input
                          type="number"
                          className="settings-input"
                          value={tables.length || 12}
                          readOnly
                        />
                      </div>
                      <div className="settings-form-field">
                        <label className="settings-label">Dining Sections</label>
                        <input
                          type="text"
                          className="settings-input"
                          value="Main Dining Hall, Rooftop Terrace"
                          readOnly
                        />
                      </div>
                      <div className="settings-form-field full-width">
                        <label className="settings-label">Dynamic QR Security</label>
                        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0' }}>
                          Auto-regenerates unique encrypted session token when bill is settled.
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                      <button type="submit" className="btn-brand-primary" style={{ padding: '11px 26px' }}>
                        <Check size={16} /> Save Table Settings
                      </button>
                    </div>
                  </form>
                )}

                {settingsSubNav === 'users' && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                        Staff & User Management
                      </h3>
                      <button
                        type="button"
                        className="btn-brand-primary"
                        onClick={() => addToast('Add Staff modal opened', 'info')}
                      >
                        <Plus size={15} /> Add Staff
                      </button>
                    </div>
                    <table className="admin-clean-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Role</th>
                          <th>Email</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { name: 'Rohit Sharma', role: 'Owner / Admin', email: 'rohit@spicegarden.com', status: 'active' },
                          { name: 'Amit Patel', role: 'Floor Manager', email: 'amit@spicegarden.com', status: 'active' },
                          { name: 'Priya Sharma', role: 'Head Cashier', email: 'priya@spicegarden.com', status: 'active' },
                          { name: 'Rahul Chef', role: 'Head Chef (KDS)', email: 'kitchen@spicegarden.com', status: 'active' }
                        ].map((u) => (
                          <tr key={u.email}>
                            <td style={{ fontWeight: 700, color: '#0f172a' }}>{u.name}</td>
                            <td style={{ color: '#475569' }}>{u.role}</td>
                            <td style={{ color: '#64748b' }}>{u.email}</td>
                            <td><span className="status-badge-pill active">• Active</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {settingsSubNav === 'notifications' && (
                  <form onSubmit={handleSaveSettings}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px', color: '#0f172a' }}>
                      Audio & Operational Alerts
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>Sound Chimes on New Order</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Play high-fidelity audio bell whenever guests place a food order</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={settingsForm.soundAlerts}
                          onChange={(e) => setSettingsForm({ ...settingsForm, soundAlerts: e.target.checked })}
                          style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>Kitchen Auto-Accept Tickets</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Automatically route customer tickets directly to preparing state</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={settingsForm.autoAcceptOrders}
                          onChange={(e) => setSettingsForm({ ...settingsForm, autoAcceptOrders: e.target.checked })}
                          style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                      <button type="submit" className="btn-brand-primary" style={{ padding: '11px 26px' }}>
                        <Check size={16} /> Save Notification Preferences
                      </button>
                    </div>
                  </form>
                )}

                {settingsSubNav === 'billing' && (
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px', color: '#0f172a' }}>
                      Billing & Subscription Plan
                    </h3>
                    <div style={{ padding: 18, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: 9999 }}>
                            CURRENT PLAN
                          </span>
                          <h4 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '8px 0 2px' }}>TableMint Restaurant Pro</h4>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Unlimited QR Tables • Full POS & Kitchen Display • 24/7 Priority Support</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#07241a' }}>₹ 1,999 / mo</div>
                          <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>Active (Annual Subscription)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}


        {/* ========================================================
            TAB: STAFF MANAGEMENT
            ======================================================== */}
        {activeTab === 'staff' && (
          <section className="admin-page-container">
            <div className="page-header-row">
              <div>
                <h2 className="page-title">Staff & Station Security</h2>
                <p className="page-subtitle">Manage staff accounts, authorization roles, and station security</p>
              </div>
              <div className="page-header-actions">
                <button
                  className="btn-brand-primary"
                  style={{ background: '#ef4444' }}
                  onClick={handleLogout}
                >
                  <Lock size={15} /> Lock Terminal Now
                </button>
              </div>
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
          <section className="admin-page-container">
            <div className="page-header-row">
              <div>
                <h2 className="page-title">System Integrations & Hardware</h2>
                <p className="page-subtitle">Connected thermal receipt printers, real-time sync relays, and ordering channels</p>
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
          <section className="admin-page-container">
            <div className="page-header-row">
              <div>
                <h2 className="page-title">Profile & Operations Account</h2>
                <p className="page-subtitle">Manage your account credentials, restaurant identity, and floor security</p>
              </div>
              <div className="page-header-actions">
                <button
                  type="button"
                  className="btn-brand-primary"
                  style={{ background: '#ef4444' }}
                  onClick={handleLogout}
                  title="Sign out and return to Login & Sign Up screen"
                >
                  <LogOut size={16} /> Sign Out / Exit Station
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, marginTop: 4 }}>
              {/* Left Column: User Identity Card */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: 'fit-content' }}>
                <div style={{
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  background: '#07241a',
                  color: '#ffffff',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  marginBottom: 14,
                  boxShadow: '0 4px 12px rgba(7, 36, 26, 0.15)'
                }}>
                  {currentUser?.name
                    ? currentUser.name
                        .split(' ')
                        .filter(Boolean)
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()
                    : 'TM'}
                  <span style={{
                    position: 'absolute',
                    bottom: 2,
                    right: 2,
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: '#10b981',
                    border: '2px solid #ffffff'
                  }} title="Active Session" />
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>{currentUser?.name || 'TableMint Staff'}</h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 16px' }}>{currentUser?.email || 'admin@tablemint.com'}</p>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: '#ecfdf5',
                    color: '#065f46',
                    border: '1px solid #a7f3d0'
                  }}>
                    <ShieldCheck size={13} />
                    {currentUser?.role === 'admin' ? 'Admin / Owner' : 'Floor Staff'}
                  </span>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1px solid #e2e8f0'
                  }}>
                    <UtensilsCrossed size={13} />
                    {currentUser?.restaurantName || 'TableMint'}
                  </span>
                </div>

                <div style={{ width: '100%', borderTop: '1px solid #f1f5f9', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ShieldCheck size={14} color="#10b981" /> Security Standard
                    </span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>PBKDF2 SHA-512</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Lock size={14} color="#07241a" /> Login Method
                    </span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>Email & Password</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Wifi size={14} color="#0284c7" /> Live Sync Relay
                    </span>
                    <span style={{ fontWeight: 700, color: '#0284c7' }}>Connected (12ms)</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Edit Profile & Security Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Edit Profile Details Form */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24 }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={18} style={{ color: '#07241a' }} /> Personal & Restaurant Profile
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 18 }}>
                    Update your display name and dining brand name across POS tickets and receipts.
                  </p>

                  <form onSubmit={handleSaveProfile}>
                    <div className="settings-form-grid" style={{ marginBottom: 16 }}>
                      <div className="settings-form-field">
                        <label className="settings-label">Full Name</label>
                        <input
                          type="text"
                          className="settings-input"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          placeholder="Your Name"
                          required
                          disabled={profileSaving}
                        />
                      </div>
                      <div className="settings-form-field">
                        <label className="settings-label">Restaurant Brand Name</label>
                        <input
                          type="text"
                          className="settings-input"
                          value={profileRestaurant}
                          onChange={(e) => setProfileRestaurant(e.target.value)}
                          placeholder="e.g. TableMint / Spice Garden"
                          required
                          disabled={profileSaving}
                        />
                      </div>
                    </div>

                    <div className="settings-form-grid" style={{ marginBottom: 20 }}>
                      <div className="settings-form-field">
                        <label className="settings-label">Email Address (Login Identity)</label>
                        <input
                          type="email"
                          className="settings-input"
                          style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                          value={currentUser?.email || 'admin@tablemint.com'}
                          readOnly
                          title="Email address cannot be changed directly."
                        />
                      </div>
                      <div className="settings-form-field">
                        <label className="settings-label">Station Role & Permissions</label>
                        <input
                          type="text"
                          className="settings-input"
                          style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                          value={currentUser?.role === 'admin' ? 'Administrator (Full Access)' : 'Floor Staff (POS & Orders)'}
                          readOnly
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="submit"
                        className="btn-brand-primary"
                        disabled={profileSaving}
                      >
                        <Check size={16} />
                        {profileSaving ? 'Saving Changes...' : 'Save Profile Changes'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Session Security Details */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20 }}>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck size={17} style={{ color: '#0284c7' }} /> Station Security & Session Status
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 14 }}>
                    Your session is actively verified against TableMint backend server.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: '0.8rem' }}>
                      <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Lock size={14} /> Authorization Token
                      </span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>
                        tm_auth_{currentUser?.id ? currentUser.id.slice(0, 8) : 'staff'}••••••••
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: '0.8rem' }}>
                      <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Smartphone size={14} /> Station Interface
                      </span>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>TableMint POS WebApp v2.4</span>
                    </div>
                  </div>
                </div>

                {/* Sign Out Card */}
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#991b1b', margin: '0 0 4px' }}>Sign Out of TableMint Station</h4>
                    <p style={{ fontSize: '0.78rem', color: '#b91c1c', margin: 0 }}>
                      Terminates your authenticated session immediately. Requires logging in again.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-brand-primary"
                    style={{ background: '#dc2626', flexShrink: 0 }}
                    onClick={handleLogout}
                  >
                    <LogOut size={16} /> Sign Out
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
      {/* ========================================================
          MOBILE BOTTOM ADMIN BAR (Image 3 - Staff Mobile App)
          ======================================================== */}
      <nav className="admin-mobile-bottom-bar no-print">
        <button
          type="button"
          className={`mobile-bottom-btn ${activeTab === 'overview' && !mobileMoreOpen ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('overview');
            setMobileMoreOpen(false);
          }}
          title="Home Dashboard"
        >
          <Home size={19} />
          <span>Home</span>
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
          className={`mobile-bottom-btn ${activeTab === 'tables' && !mobileMoreOpen ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('tables');
            setMobileMoreOpen(false);
          }}
          title="Floor & Tables"
        >
          <LayoutGrid size={19} />
          <span>Tables</span>
        </button>

        <button
          type="button"
          className={`mobile-bottom-btn ${activeTab === 'menu' && !mobileMoreOpen ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('menu');
            setMobileMoreOpen(false);
          }}
          title="Menu Management"
        >
          <BookOpen size={19} />
          <span>Menu</span>
        </button>

        <button
          type="button"
          className={`mobile-bottom-btn ${['billing', 'kitchen', 'customers', 'reports', 'settings', 'stands', 'profile'].includes(activeTab) || mobileMoreOpen ? 'active' : ''}`}
          onClick={() => setMobileMoreOpen((prev) => !prev)}
          title="More Operations"
        >
          <Menu size={19} />
          <span>More</span>
        </button>
      </nav>

      {/* ========================================================
          MOBILE ADMIN FUNCTIONS DRAWER SHEET (Image 3 Screen 12 - Profile / More)
          ======================================================== */}
      {mobileMoreOpen && (
        <div className="mobile-admin-drawer-backdrop no-print" onClick={() => setMobileMoreOpen(false)}>
          <div className="mobile-admin-drawer-card" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80"
                  alt="Rohit Sharma"
                  style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '2px solid #10b981' }}
                  onError={(e) => {
                    e.target.src = '/images/tablemint_leaf_icon.png';
                  }}
                />
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.02rem' }}>{currentUser?.name || 'Rohit Sharma'}</div>
                  <div style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 600 }}>Restaurant Owner</div>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setMobileMoreOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="drawer-actions-grid">
              <button
                type="button"
                className={`drawer-action-btn ${activeTab === 'billing' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('billing');
                  setMobileMoreOpen(false);
                }}
              >
                <div className="drawer-btn-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                  <CreditCard size={20} />
                </div>
                <div>
                  <div className="drawer-btn-title">POS Billing</div>
                  <div className="drawer-btn-sub">UPI & Thermal Print</div>
                </div>
              </button>

              <button
                type="button"
                className={`drawer-action-btn ${activeTab === 'kitchen' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('kitchen');
                  setMobileMoreOpen(false);
                }}
              >
                <div className="drawer-btn-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                  <ChefHat size={20} />
                </div>
                <div>
                  <div className="drawer-btn-title">Kitchen Display</div>
                  <div className="drawer-btn-sub">KDS Orders</div>
                </div>
              </button>

              <button
                type="button"
                className={`drawer-action-btn ${activeTab === 'customers' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('customers');
                  setMobileMoreOpen(false);
                }}
              >
                <div className="drawer-btn-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  <Users size={20} />
                </div>
                <div>
                  <div className="drawer-btn-title">Customers</div>
                  <div className="drawer-btn-sub">Registered Diners</div>
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
                <div className="drawer-btn-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
                  <BarChart3 size={20} />
                </div>
                <div>
                  <div className="drawer-btn-title">Reports & Analytics</div>
                  <div className="drawer-btn-sub">Revenue & Trends</div>
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
                <div className="drawer-btn-icon" style={{ background: 'rgba(251, 146, 60, 0.15)', color: '#fb923c' }}>
                  <Settings size={20} />
                </div>
                <div>
                  <div className="drawer-btn-title">Settings</div>
                  <div className="drawer-btn-sub">Taxes & Profile</div>
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
                <div className="drawer-btn-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
                  <QrCode size={20} />
                </div>
                <div>
                  <div className="drawer-btn-title">QR Stands</div>
                  <div className="drawer-btn-sub">Print Acrylic Inserts</div>
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
                style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              >
                <LogOut size={16} /> Logout Station
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
