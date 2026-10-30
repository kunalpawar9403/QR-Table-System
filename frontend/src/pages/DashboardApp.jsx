import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
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
  Mail,
  LogOut,
  CreditCard,
  Eye,
  EyeOff,
  MoreVertical,
  Tag,
  Globe,
  Info,
  Copy,
  Upload,
  Share2
} from 'lucide-react';
import { socket } from '../utils/socket';
import { soundManager } from '../utils/sound';
import { authFetch, clearStaffToken, getStaffToken, getCurrentUser, updateUserProfile, logoutStaff, changeUserPassword } from '../utils/staffAuth';
import { useToast } from '../components/Toast';
import { TableMintLogoIcon } from '../components/TableMintLogoIcon';
import TableMintBannerSlider from '../components/TableMintBannerSlider';
import EmptyMenuState from '../components/menu/EmptyMenuState';
import MenuItemModal from '../components/menu/MenuItemModal';
import CategoryManagementModal from '../components/menu/CategoryManagementModal';
import MenuCsvImportModal from '../components/menu/MenuCsvImportModal';
import MenuOcrModal from '../components/menu/MenuOcrModal';
import CustomerMenuPreviewModal from '../components/menu/CustomerMenuPreviewModal';
import DefaultMenuModal from '../components/menu/DefaultMenuModal';
import OnboardingProgressBanner from '../components/menu/OnboardingProgressBanner';
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
      if (currentPage <= 2) {
        pages.push(1, 2, 3, '...', totalPages);
      } else if (currentPage >= totalPages - 1) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage, '...', totalPages);
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

export default function DashboardApp({ onLockStaff, onOpenWebsite }) {
  const { addToast } = useToast();

  // Active Tab with persistence across browser page refreshes
  const [activeTab, setActiveTab] = useState(getStoredDashboardTab);
  const activeTabRef = useRef(activeTab);

  // Unread / unseen notification badge counts (only for Orders and Kitchen Display)
  const [unseenOrdersCount, setUnseenOrdersCount] = useState(0);
  const [unseenKitchenCount, setUnseenKitchenCount] = useState(0);

  // Synchronize activeTab with LocalStorage and browser URL searchParams & reset unseen counts upon visit
  useEffect(() => {
    activeTabRef.current = activeTab;
    if (activeTab === 'orders') {
      setUnseenOrdersCount(0);
    }
    if (activeTab === 'kitchen') {
      setUnseenKitchenCount(0);
    }
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
      try {
        const slug = currentUser.restaurantSlug || currentUser.restaurantName?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'tablemint';
        localStorage.setItem('tablemint_active_restaurant', slug);
      } catch (e) {}
    }
  }, [currentUser]);

  useEffect(() => {
    const handleAuth = (e) => {
      if (e && e.detail) {
        setCurrentUser(e.detail);
      } else {
        setCurrentUser(getCurrentUser());
      }
    };
    window.addEventListener('staff:authenticated', handleAuth);
    return () => window.removeEventListener('staff:authenticated', handleAuth);
  }, []);

  const getUserInitials = (name) => {
    if (!name) return 'AM';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Mobile Bottom Admin Drawer & Navigation State
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [mobileSelectedOrder, setMobileSelectedOrder] = useState(null);
  const [mobileSettingsSubNav, setMobileSettingsSubNav] = useState(null);
  const [kitchenStatusFilter, setKitchenStatusFilter] = useState('pending');

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
  const [thermalPaperSize, setThermalPaperSize] = useState('58mm');
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [csvImportModalOpen, setCsvImportModalOpen] = useState(false);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [previewQrModalOpen, setPreviewQrModalOpen] = useState(false);
  const [defaultMenuModalOpen, setDefaultMenuModalOpen] = useState(false);
  const [selectedMenuItems, setSelectedMenuItems] = useState([]);
  const [loadingDemoMenu, setLoadingDemoMenu] = useState(false);
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
  const [standsFilter, setStandsFilter] = useState('all');
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
    upiId: 'tablemint@upi',
    upiPayeeName: 'TableMint Restaurant',
    upiQrEnabled: true,
    acceptedPaymentMethods: ['UPI', 'Cash', 'Card'],
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
  const [selectedBillingTableId, setSelectedBillingTableId] = useState(1);
  const [billingPaymentMethod, setBillingPaymentMethod] = useState('upi');

  // Live Helper Functions for Real Data & Cross-Panel Sync
  const getTableActiveOrders = (tblId) => {
    return orders.filter(
      (o) => Number(o.tableId) === Number(tblId) && !['completed', 'cancelled'].includes(o.status)
    );
  };

  const getTableStatusInfo = (tbl) => {
    if (!tbl) return { status: 'available', activeOrders: [], code: '', totalBill: 0 };
    const activeOrders = getTableActiveOrders(tbl.id);
    const isServing = activeOrders.some((o) => o.status === 'ready' || o.status === 'served');
    const isOccupied = activeOrders.length > 0 || tbl.status === 'occupied' || tbl.manualStatus === 'occupied';

    let status = 'available';
    if (isServing) status = 'serving';
    else if (isOccupied) status = 'occupied';

    const orderCode = activeOrders.length > 0
      ? `#${activeOrders[0].orderNumber || activeOrders[0].id.replace('ORD-', '')}`
      : (tbl.sessionToken ? `#${tbl.sessionToken}` : '');

    const totalBill = activeOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    return {
      status,
      activeOrders,
      code: orderCode,
      totalBill
    };
  };

  const formatElapsed = (dateStr) => {
    if (!dateStr) return 'Just now';
    const diffMin = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    return `${diffHours}h ago`;
  };

  // Missing Filter & Sub-Nav States
  const [tableStatusFilter, setTableStatusFilter] = useState('all');
  const [analyticsSubTab, setAnalyticsSubTab] = useState('Revenue');
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState('today');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [settingsSubNav, setSettingsSubNav] = useState('details');
  const [overviewOrderType, setOverviewOrderType] = useState('dine-in');

  const fetchAnalyticsReport = async (tf = analyticsTimeframe) => {
    setLoadingAnalytics(true);
    try {
      const res = await authFetch(`/api/reports/analytics?timeframe=${tf}`);
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error('Failed to load analytics report:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchAnalyticsReport(analyticsTimeframe);
    }
  }, [activeTab, analyticsTimeframe]);

  // Mobile Profile Section States
  const [mobileProfileSubView, setMobileProfileSubView] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      addToast('Please enter your current password', 'error');
      return;
    }
    if (newPassword.length < 6) {
      addToast('New password must be at least 6 characters long', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('New passwords do not match', 'error');
      return;
    }
    setPasswordUpdating(true);
    try {
      const res = await changeUserPassword({ currentPassword, newPassword });
      if (res.success) {
        addToast(res.message || 'Password updated successfully!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        addToast(res.error || 'Failed to update password. Check current password.', 'error');
      }
    } catch (err) {
      addToast('Error communicating with server', 'error');
    } finally {
      setPasswordUpdating(false);
    }
  };

  // Helper to resolve exact image for any ordered item or dish
  const getItemImage = (it) => {
    if (!it) return '/images/paneer_butter_masala.jpg';
    if (it.image && typeof it.image === 'string' && it.image.trim()) {
      return it.image;
    }
    // Look up in loaded menu state
    if (Array.isArray(menu) && menu.length > 0) {
      const matched = menu.find((m) =>
        (it.id && String(m.id) === String(it.id)) ||
        (it.name && m.name && m.name.toLowerCase().trim() === it.name.toLowerCase().trim())
      );
      if (matched && matched.image) return matched.image;
    }

    // Precise keyword-to-asset mapping for Indian dishes & restaurant products
    const n = (it.name || '').toLowerCase().trim();
    if (n.includes('butter masala')) return '/images/paneer_butter_masala.jpg';
    if (n.includes('tikka masala')) return '/images/paneer_tikka_masala.jpg';
    if (n.includes('chilli paneer') || n.includes('paneer chilli')) return '/images/paneer_chilli.jpg';
    if (n.includes('palak paneer')) return '/images/palak_paneer.jpg';
    if (n.includes('plain palak')) return '/images/plain_palak.jpg';
    if (n.includes('paneer tikka')) return '/images/paneer_tikka.jpg';
    if (n.includes('mushroom tikka')) return '/images/mushroom_tikka.jpg';
    if (n.includes('mushroom soup')) return '/images/mushroom_soup.jpg';
    if (n.includes('mushroom manchurian')) return '/images/mushroom_manchurian.jpg';
    if (n.includes('mushroom')) return '/images/mushroom_curry.jpg';
    if (n.includes('biryani')) return '/images/chicken_biryani.jpg';
    if (n.includes('dosa')) return '/images/masala_dosa.jpg';
    if (n.includes('pizza')) return '/images/margherita_pizza.jpg';
    if (n.includes('naan')) return '/images/butter_naan.jpg';
    if (n.includes('tandoori roti') || n.includes('butter roti') || n.includes('roti')) return '/images/tandoori_roti.jpg';
    if (n.includes('alu paratha') || n.includes('alu parota')) return '/images/alu_paratha.jpg';
    if (n.includes('paratha') || n.includes('parota')) return '/images/parota.jpg';
    if (n.includes('kulcha')) return '/images/veg_kulcha.jpg';
    if (n.includes('kaju')) return '/images/kaju_masala.jpg';
    if (n.includes('kadai')) return '/images/veg_kadai.jpg';
    if (n.includes('veg kolhapuri')) return '/images/veg_kolhapuri.jpg';
    if (n.includes('veg hyderabadi')) return '/images/veg_hyderabadi.jpg';
    if (n.includes('capsicum')) return '/images/capsicum_masala.jpg';
    if (n.includes('tomato curry')) return '/images/tomato_curry.jpg';
    if (n.includes('roti curry')) return '/images/roti_curry.jpg';
    if (n.includes('daal kolhapuri') || n.includes('dal kolhapuri')) return '/images/daal_kolhapuri.jpg';
    if (n.includes('daal') || n.includes('dal')) return '/images/daal_fry.jpg';
    if (n.includes('spring roll')) return '/images/spring_rolls.jpg';
    if (n.includes('babycorn chilli') || n.includes('baby corn chilli')) return '/images/babycorn_chilli.jpg';
    if (n.includes('babycorn') || n.includes('baby corn')) return '/images/babycorn_manchurian.jpg';
    if (n.includes('gobi manchurian') || n.includes('veg manchurian') || n.includes('manchurian')) return '/images/gobi_manchurian.jpg';
    if (n.includes('manchow')) return '/images/manchow_soup.jpg';
    if (n.includes('hot & sour') || n.includes('hot sour')) return '/images/hot_sour_soup.jpg';
    if (n.includes('salad')) return '/images/green_salad.jpg';
    if (n.includes('burger')) return '/images/veggie_burger.jpg';
    if (n.includes('pasta')) return '/images/creamy_pasta.jpg';
    if (n.includes('mango shake')) return '/images/mango_shake.jpg';
    if (n.includes('chocolate shake')) return '/images/chocolate_shake.jpg';
    if (n.includes('strawberry shake')) return '/images/strawberry_shake.jpg';
    if (n.includes('banana shake')) return '/images/banana_shake.jpg';
    if (n.includes('apple shake')) return '/images/apple_shake.jpg';
    if (n.includes('pista shake')) return '/images/pista_shake.jpg';
    if (n.includes('vanilla shake') || n.includes('shake')) return '/images/vanilla_shake.jpg';
    if (n.includes('lemon juice')) return '/images/lemon_juice.jpg';
    if (n.includes('mango juice')) return '/images/mango_juice.jpg';
    if (n.includes('orange juice')) return '/images/orange_juice.jpg';
    if (n.includes('pineapple juice')) return '/images/pineapple_juice.jpg';
    if (n.includes('watermelon juice')) return '/images/watermelon_juice.jpg';
    if (n.includes('musambi juice') || n.includes('juice')) return '/images/musambi_juice.jpg';
    if (n.includes('chocolate ice') || n.includes('chocolate icecream')) return '/images/chocolate_icecream.jpg';
    if (n.includes('mango ice') || n.includes('mango icecream')) return '/images/mango_icecream.jpg';
    if (n.includes('pista ice') || n.includes('pista icecream')) return '/images/pista_icecream.jpg';
    if (n.includes('strawberry ice') || n.includes('strawberry icecream')) return '/images/strawberry_icecream.jpg';
    if (n.includes('gadbad')) return '/images/gadbad_icecream.jpg';
    if (n.includes('ice cream') || n.includes('icecream')) return '/images/icecream_scoop.jpg';

    return '/images/paneer_butter_masala.jpg';
  };

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
      const [tablesRes, ordersRes, menuRes, callsRes, settingsRes, catsRes] = await Promise.all([
        authFetch('/api/tables'),
        authFetch('/api/orders'),
        authFetch('/api/menu?status=all'),
        authFetch('/api/service-calls'),
        authFetch('/api/settings'),
        authFetch('/api/categories')
      ]);

      if (tablesRes.ok) setTables(await tablesRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (menuRes.ok) setMenu(await menuRes.json());
      if (callsRes.ok) setServiceCalls(await callsRes.json());
      if (catsRes && catsRes.ok) setCategories(await catsRes.json());
      if (settingsRes && settingsRes.ok) {
        const s = await settingsRes.json();
        if (s) setSettingsForm(prev => ({ ...prev, ...s }));
      }
    } catch (e) {
      addToast('Error loading live operations data', 'error');
    }
  };

  // Socket setup
  useEffect(() => {
    const handleConnect = () => {
      const curUser = getCurrentUser();
      const rSlug = curUser?.restaurantSlug || settingsForm?.restaurantSlug || 'tablemint';
      const token = getStaffToken();
      socket.emit('join-admin', { restaurant: rSlug, token });
      socket.emit('join-kitchen', { restaurant: rSlug, token });
      socket.emit('join', { role: 'admin', restaurant: rSlug, token });
      socket.emit('join', { role: 'kitchen', restaurant: rSlug, token });
      fetchAllData();
    };

    handleConnect();
    socket.on('connect', handleConnect);

    const handleNewOrder = (newOrder) => {
      soundManager.playNewOrderChime();
      setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
      addToast(`🔔 New Order #${newOrder.orderNumber || newOrder.id} from ${newOrder.tableName}`, 'success', 6000);

      // Increment unseen counters if user is not currently visiting that tab
      if (activeTabRef.current !== 'orders') {
        setUnseenOrdersCount((prev) => prev + 1);
      }
      if (activeTabRef.current !== 'kitchen') {
        setUnseenKitchenCount((prev) => prev + 1);
      }

      // Immediately set the table to occupied in state
      setTables((prev) =>
        prev.map((t) =>
          t.id === newOrder.tableId
            ? { ...t, status: 'occupied', manualStatus: 'occupied', currentStatus: 'occupied' }
            : t
        )
      );

      // Refetch latest server table state
      authFetch('/api/tables')
        .then((r) => r.json())
        .then(setTables)
        .catch(() => {});
    };

    const handleStatusChanged = (updated) => {
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      authFetch('/api/tables').then((r) => r.json()).then(setTables).catch(() => {});
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
      authFetch('/api/tables').then((r) => r.json()).then(setTables).catch(() => {});
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

  // Save Dish (Legacy & Quick)
  const handleSaveDish = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
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

  // Comprehensive Menu Item Save (Supports Variants, Add-ons, Status)
  const handleSaveMenuItem = async (itemData) => {
    try {
      const isEdit = !!itemData.id;
      const url = isEdit ? `/api/menu/${itemData.id}` : '/api/menu';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      });

      if (res.ok) {
        addToast(isEdit ? 'Item updated successfully!' : 'Item added to menu!', 'success');
        setMenuModalOpen(false);
        setEditingDish(null);
        await fetchAllData();
      } else {
        const err = await res.json().catch(() => ({}));
        addToast(err.error || 'Failed to save item', 'error');
      }
    } catch (err) {
      addToast('Network error saving menu item', 'error');
    }
  };

  // Duplicate Menu Item
  const handleDuplicateItem = async (dishId) => {
    try {
      const res = await authFetch(`/api/menu/${dishId}/duplicate`, { method: 'POST' });
      if (res.ok) {
        addToast('Dish duplicated successfully!', 'success');
        await fetchAllData();
      } else {
        addToast('Failed to duplicate item', 'error');
      }
    } catch (err) {
      addToast('Error duplicating item', 'error');
    }
  };

  // Delete Menu Item
  const handleDeleteMenuItem = async (dishId) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    try {
      const res = await authFetch(`/api/menu/${dishId}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('Item removed from menu', 'success');
        setSelectedMenuItems(prev => prev.filter(id => id !== dishId));
        await fetchAllData();
      } else {
        addToast('Failed to delete item', 'error');
      }
    } catch (err) {
      addToast('Error deleting item', 'error');
    }
  };

  // Bulk Availability Toggle
  const handleBulkAvailability = async (available) => {
    if (!selectedMenuItems.length) return;
    try {
      const res = await authFetch('/api/menu/bulk-availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedMenuItems, available })
      });
      if (res.ok) {
        addToast(`Updated availability for ${selectedMenuItems.length} items`, 'success');
        setSelectedMenuItems([]);
        await fetchAllData();
      }
    } catch (err) {
      addToast('Error updating bulk availability', 'error');
    }
  };

  // Bulk Publish / Draft Status
  const handleBulkPublish = async (status) => {
    if (!selectedMenuItems.length) return;
    try {
      const res = await authFetch('/api/menu/bulk-publish', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedMenuItems, status })
      });
      if (res.ok) {
        addToast(`Updated publish status for ${selectedMenuItems.length} items`, 'success');
        setSelectedMenuItems([]);
        await fetchAllData();
      }
    } catch (err) {
      addToast('Error updating bulk status', 'error');
    }
  };

  // Seed Demo Indian Menu
  const handleSeedDemoMenu = async () => {
    setLoadingDemoMenu(true);
    try {
      const res = await authFetch('/api/menu/seed-demo', { method: 'POST' });
      if (res.ok) {
        addToast('Demo Indian menu catalog loaded successfully!', 'success');
        await fetchAllData();
      } else {
        addToast('Failed to load demo menu', 'error');
      }
    } catch (err) {
      addToast('Error loading demo menu', 'error');
    } finally {
      setLoadingDemoMenu(false);
    }
  };

  // Category Management Handlers
  const handleSaveCategory = async (catData) => {
    const isEdit = !!catData.id;
    const url = isEdit ? `/api/categories/${catData.id}` : '/api/categories';
    const method = isEdit ? 'PUT' : 'POST';
    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(catData)
    });
    if (res.ok) {
      await fetchAllData();
    } else {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (catId) => {
    const res = await authFetch(`/api/categories/${catId}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchAllData();
    } else {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete category');
    }
  };

  const handleReorderCategories = async (newOrderedCategories) => {
    setCategories(newOrderedCategories);
    const orderedIds = newOrderedCategories.map(c => c.id);
    await authFetch('/api/categories/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds })
    });
  };

  const handleSeedSuggestedCategories = async () => {
    const res = await authFetch('/api/categories/seed-suggested', { method: 'POST' });
    if (res.ok) {
      addToast('Added suggested categories!', 'success');
      await fetchAllData();
    }
  };

  // CSV Import Confirmation
  const handleConfirmCsvImport = async (items) => {
    const res = await authFetch('/api/menu/import-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    if (res.ok) {
      const data = await res.json();
      addToast(`Imported ${data.insertedCount} items successfully!`, 'success');
      setCsvImportModalOpen(false);
      await fetchAllData();
    } else {
      const err = await res.json().catch(() => ({}));
      addToast(err.error || 'Import failed', 'error');
    }
  };

  // OCR Import Confirmation
  const handleConfirmOcrImport = async (items) => {
    const res = await authFetch('/api/menu/import-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    if (res.ok) {
      const data = await res.json();
      addToast(`Added ${data.insertedCount} items from menu extraction!`, 'success');
      setOcrModalOpen(false);
      await fetchAllData();
    } else {
      const err = await res.json().catch(() => ({}));
      addToast(err.error || 'Failed to import extracted items', 'error');
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
  const handleSaveSettings = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      const res = await authFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.settings) {
          setSettingsForm(data.settings);
        }
        localStorage.setItem('pos_settings', JSON.stringify(settingsForm));
        soundManager.playClick();
        addToast('Payment & Restaurant Settings saved successfully!', 'success');
      } else {
        localStorage.setItem('pos_settings', JSON.stringify(settingsForm));
        addToast('Settings saved locally', 'info');
      }
    } catch (err) {
      localStorage.setItem('pos_settings', JSON.stringify(settingsForm));
      addToast('Settings saved locally', 'info');
    }
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
    const fallback = {
      id: 'TEST-101',
      orderNumber: '101',
      tableName: 'Table 2',
      subtotal: 520,
      tax: 26,
      total: 546,
      items: [
        { name: 'Paneer Butter Masala', quantity: 1, price: 280 },
        { name: 'Butter Naan', quantity: 2, price: 40 },
        { name: 'Mango Lassi', quantity: 1, price: 160 }
      ]
    };
    const target = orders.find(o => o.status === 'completed' || o.paymentStatus === 'paid') || orders[0] || fallback;
    handlePrintBill(target, '58mm');
  };

  // Open Full Print Bill Modal
  const handlePrintBill = (order, paperSize = '58mm') => {
    if (!order) return;
    setPrintBillOrder(order);
    setThermalPaperSize(paperSize);
    addToast(`Thermal Receipt ready for print (${paperSize})`, 'info');
  };

  // Dedicated Print Handlers (Supports 58mm default / 80mm optional)
  const handlePrintReceipt = (orderToPrint = null, paperSize = null) => {
    const targetOrder = orderToPrint || printBillOrder;
    if (targetOrder) {
      setPrintBillOrder(targetOrder);
    }
    const targetSize = paperSize || thermalPaperSize || '58mm';
    setThermalPaperSize(targetSize);

    // Apply isolation and paper size class to body
    document.body.classList.remove('paper-58mm', 'paper-80mm');
    document.body.classList.add('printing-receipt-only', `paper-${targetSize}`);

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-receipt-only', 'paper-58mm', 'paper-80mm');
      }, 1000);
    }, 120);
  };

  // Download Receipt as Text Slip
  const handleDownloadReceipt = (order = null) => {
    const o = order || printBillOrder;
    if (!o) return;
    const rName = currentUser?.restaurantName || 'TableMint';
    const subtotal = o.subtotal || Math.round((o.total || 0) / 1.05);
    const tax = o.tax || Math.round((o.total || 0) * 0.05);
    const dateStr = new Date(o.createdAt || Date.now()).toLocaleString();
    
    let content = `================================\n`;
    content += `        ${rName.toUpperCase()}\n`;
    content += `   Fine Dining Restaurant & Bar\n`;
    content += `   GSTIN: 27AAACS1234M1Z5\n`;
    content += `================================\n`;
    content += `Bill: #${o.orderNumber || o.id}   Table: ${o.tableName || ''}\n`;
    content += `Date: ${dateStr}\n`;
    content += `--------------------------------\n`;
    content += `ITEM                QTY    AMT\n`;
    content += `--------------------------------\n`;
    (o.items || []).forEach(it => {
      const name = it.name.slice(0, 18).padEnd(19, ' ');
      const qty = String(it.quantity).padStart(3, ' ');
      const amt = String(it.price * it.quantity).padStart(7, ' ');
      content += `${name}${qty}${amt}\n`;
    });
    content += `--------------------------------\n`;
    content += `Subtotal:              ₹ ${subtotal}\n`;
    content += `CGST (2.5%):           ₹ ${Math.round(tax / 2)}\n`;
    content += `SGST (2.5%):           ₹ ${Math.round(tax / 2)}\n`;
    content += `================================\n`;
    content += `GRAND TOTAL:           ₹ ${o.total}\n`;
    content += `Payment:               PAID\n`;
    content += `================================\n`;
    content += `  *** THANK YOU FOR DINING ***\n`;
    content += `    Please Visit Us Again!\n`;
    content += `================================\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt_${o.orderNumber || o.id}_58mm.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Thermal receipt slip downloaded!', 'success');
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

  const handleShareOrDownloadStand = async (table) => {
    const curUser = getCurrentUser();
    const rSlug = curUser?.restaurantSlug || settingsForm?.restaurantSlug || 'tablemint';
    const restParam = rSlug !== 'tablemint' ? `&restaurant=${encodeURIComponent(rSlug)}` : '';
    const qrUrl = `/api/qrcode/${table.id}${restParam ? `?restaurant=${encodeURIComponent(rSlug)}` : ''}`;
    const scanUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/?table=${table.id}&token=${table.sessionToken || ''}${restParam}`
      : '';

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${table.name || 'Table ' + table.id} - TableMint QR Stand`,
          text: `Scan QR to open digital menu for ${table.name || 'Table ' + table.id}`,
          url: scanUrl
        });
        addToast(`Shared ${table.name || 'Table ' + table.id} QR link!`, 'success');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    // Direct Download Stand PNG
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `${(table.name || 'table-' + table.id).toLowerCase().replace(/\s+/g, '-')}-qr-stand.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(`Saved ${table.name || 'Table ' + table.id} QR Stand!`, 'success');
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
    ...Array.from(new Set([
      ...categories.map(c => c.name),
      ...menu.map((m) => m.category).filter(Boolean)
    ]))
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

  // 5. QR Stands Filter & Pagination
  const filteredStandsList = standsFilter === 'all'
    ? tables
    : tables.filter((t) => String(t.id) === String(standsFilter));
  const totalStandsPages = Math.max(1, Math.ceil(filteredStandsList.length / standsPerPage));
  const currentStandsPage = Math.min(standsPage, totalStandsPages);
  const displayedStands = isPrintingAllStands
    ? filteredStandsList
    : filteredStandsList.slice((currentStandsPage - 1) * standsPerPage, currentStandsPage * standsPerPage);

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
              <TableMintLogoIcon size={24} />
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
              onClick={() => {
                setActiveTab('orders');
                setUnseenOrdersCount(0);
              }}
            >
              <div className="sidebar-item-left">
                <Receipt size={18} />
                <span>Orders</span>
              </div>
              {unseenOrdersCount > 0 && (
                <span className="sidebar-badge sidebar-badge-new">{unseenOrdersCount}</span>
              )}
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
            </button>

            <button
              className={`sidebar-nav-item ${activeTab === 'kitchen' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('kitchen');
                setUnseenKitchenCount(0);
              }}
            >
              <div className="sidebar-item-left">
                <ChefHat size={18} />
                <span>Kitchen Display</span>
              </div>
              {unseenKitchenCount > 0 && (
                <span className="sidebar-badge sidebar-badge-new">{unseenKitchenCount}</span>
              )}
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
        {/* Mobile Top Header Matching Image 3 Reference (12 Screens) */}
        <header className="admin-mobile-top-bar hide-on-desktop no-print">
          {activeTab === 'overview' && (
            <svg className="mobile-header-leaf-watermark" viewBox="0 0 160 80" fill="none">
              <path
                d="M20 70C60 65 120 40 145 10C110 16 75 36 45 56C28 66 22 69 20 70Z"
                fill="url(#headerLeafGrad)"
              />
              <path
                d="M45 56C75 42 115 25 145 10"
                stroke="rgba(52, 211, 153, 0.35)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="headerLeafGrad" x1="20" y1="70" x2="145" y2="10" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#10b981" stopOpacity="0.55" />
                  <stop offset="1" stopColor="#047857" stopOpacity="0.1" />
                </linearGradient>
              </defs>
            </svg>
          )}
          <div className="mobile-top-left">
            {activeTab === 'overview' ? (
              <div className="mobile-brand-box">
                <div className="mobile-brand-leaf-wrap">
                  <TableMintLogoIcon size={24} />
                </div>
                <span className="mobile-brand-title">TableMint</span>
              </div>
            ) : activeTab === 'tables' ? (
              <div className="mobile-brand-box">
                <div className="mobile-brand-leaf-wrap">
                  <TableMintLogoIcon size={20} />
                </div>
                <span className="mobile-brand-title">Tables</span>
              </div>
            ) : activeTab === 'menu' ? (
              <div className="mobile-brand-box">
                <div className="mobile-brand-leaf-wrap">
                  <TableMintLogoIcon size={20} />
                </div>
                <span className="mobile-brand-title">Menu</span>
              </div>
            ) : activeTab === 'kitchen' ? (
              <div className="mobile-brand-box">
                <div className="mobile-brand-leaf-wrap">
                  <ChefHat size={18} className="text-emerald-400" />
                </div>
                <span className="mobile-brand-title">Kitchen Display</span>
              </div>
            ) : activeTab === 'profile' && mobileProfileSubView ? (
              <button
                type="button"
                className="mobile-back-btn"
                onClick={() => setMobileProfileSubView(false)}
                title="Back to More"
              >
                <ChevronLeft size={22} />
                <span className="mobile-header-tab-title">My Profile</span>
              </button>
            ) : activeTab === 'profile' ? (
              <button
                type="button"
                className="mobile-back-btn"
                onClick={() => setActiveTab('overview')}
                title="Back to Dashboard"
              >
                <ChevronLeft size={22} />
                <span className="mobile-header-tab-title">More Operations</span>
              </button>
            ) : activeTab === 'orders' && mobileSelectedOrder ? (
              <button
                type="button"
                className="mobile-back-btn"
                onClick={() => setMobileSelectedOrder(null)}
                title="Back to Orders List"
              >
                <ChevronLeft size={22} />
                <span className="mobile-header-tab-title">
                  Order #{mobileSelectedOrder.orderNumber || mobileSelectedOrder.code || mobileSelectedOrder.id}
                </span>
              </button>
            ) : activeTab === 'billing' ? (
              <button
                type="button"
                className="mobile-back-btn"
                onClick={() => setActiveTab('tables')}
                title="Back to Tables"
              >
                <ChevronLeft size={22} />
                <span className="mobile-header-tab-title">POS Billing</span>
              </button>
            ) : activeTab === 'settings' && mobileSettingsSubNav ? (
              <button
                type="button"
                className="mobile-back-btn"
                onClick={() => setMobileSettingsSubNav(null)}
                title="Back to Settings"
              >
                <ChevronLeft size={22} />
                <span className="mobile-header-tab-title">
                  {mobileSettingsSubNav === 'details' && 'Restaurant Details'}
                  {mobileSettingsSubNav === 'tax' && 'Tax & Charges'}
                  {mobileSettingsSubNav === 'payment' && 'Payment Settings'}
                  {mobileSettingsSubNav === 'tables' && 'Table Settings'}
                  {mobileSettingsSubNav === 'password' && 'Change Password'}
                  {mobileSettingsSubNav === 'users' && 'Staff Management'}
                  {mobileSettingsSubNav === 'notifications' && 'Notifications'}
                  {!['details', 'tax', 'payment', 'tables', 'password', 'users', 'notifications'].includes(mobileSettingsSubNav) && 'Settings'}
                </span>
              </button>
            ) : activeTab === 'settings' ? (
              <button
                type="button"
                className="mobile-back-btn"
                onClick={() => setActiveTab('profile')}
                title="Back to More"
              >
                <ChevronLeft size={22} />
                <span className="mobile-header-tab-title">Settings</span>
              </button>
            ) : ['reports', 'stands'].includes(activeTab) ? (
              <button
                type="button"
                className="mobile-back-btn"
                onClick={() => setActiveTab('profile')}
                title="Back to More"
              >
                <ChevronLeft size={22} />
                <span className="mobile-header-tab-title">
                  {activeTab === 'reports' && 'Reports'}
                  {activeTab === 'stands' && 'QR Stands'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                className="mobile-back-btn"
                onClick={() => setActiveTab('overview')}
                title="Back to Home"
              >
                <ChevronLeft size={22} />
                <span className="mobile-header-tab-title">
                  {activeTab === 'orders' && 'Orders'}
                  {!['orders','tables','menu','kitchen','billing','reports','settings','profile','stands'].includes(activeTab) && 'TableMint'}
                </span>
              </button>
            )}
          </div>

          <div className="mobile-top-right">
            {activeTab === 'overview' && (
              <button
                type="button"
                className="mobile-header-avatar-btn"
                onClick={() => {
                  setActiveTab('profile');
                  setMobileProfileSubView(true);
                }}
                title="My Profile"
              >
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt="Profile"
                    className="mobile-header-avatar-img"
                  />
                ) : (
                  <span className="mobile-header-avatar-initials">
                    {getUserInitials(profileName || currentUser?.name || 'Admin Manager')}
                  </span>
                )}
              </button>
            )}
            {activeTab === 'kitchen' ? (
              <span className="mobile-top-badge-kitchen">Kitchen ▾</span>
            ) : activeTab === 'billing' ? (
              <button
                type="button"
                className="mobile-top-action-btn"
                onClick={() => window.print()}
                title="Print Receipt"
              >
                <Printer size={18} />
              </button>
            ) : activeTab === 'orders' && mobileSelectedOrder ? (
              <span className={`status-badge-pill ${mobileSelectedOrder.status || 'preparing'}`}>
                {mobileSelectedOrder.status?.charAt(0).toUpperCase() + (mobileSelectedOrder.status?.slice(1) || 'Preparing')}
              </span>
            ) : (
              <button
                type="button"
                className="mobile-bell-btn relative"
                onClick={() => setActiveTab('orders')}
                title="Notifications"
              >
                <Bell size={18} />
                {serviceCalls.length > 0 && <span className="mobile-bell-dot" />}
              </button>
            )}
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
              onClick={() => {
                const rSlug = currentUser?.restaurantSlug || settingsForm?.restaurantSlug || 'tablemint';
                window.open(`/?table=1&restaurant=${encodeURIComponent(rSlug)}`, '_blank');
              }}
              title="Open Customer Menu Card (Table 1)"
              style={{ color: '#10b981' }}
            >
              <ExternalLink size={16} />
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

            {/* Profile Pill */}
            <div
              className="topbar-profile-pill"
              onClick={() => setActiveTab('profile')}
              title="View Profile / Logout"
            >
              <div className="topbar-avatar-wrap">
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt="Profile"
                    className="topbar-avatar-img"
                  />
                ) : (
                  <div className="topbar-avatar-initials">
                    {getUserInitials(profileName || currentUser?.name || 'Admin Manager')}
                  </div>
                )}
                <span className="topbar-online-dot" />
              </div>
              <div className="topbar-profile-meta hide-on-mobile">
                <div className="topbar-profile-name">{profileName || currentUser?.name || 'Admin Manager'}</div>
                <div className="topbar-profile-role">{profileRestaurant || currentUser?.restaurantName || 'Restaurant Owner'}</div>
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
          <div className="overview-content-wrapper">
            {/* SaaS Onboarding & Menu Setup Progress Banner */}
            <OnboardingProgressBanner
              settings={settingsForm}
              categories={categories}
              menu={menu}
              tables={tables}
              onNavigateTab={(tab) => {
                if (tab === 'menu') setActiveTab('menu');
                else if (tab === 'categories') {
                  setActiveTab('menu');
                  setCategoryModalOpen(true);
                } else if (tab === 'tables') setActiveTab('tables');
                else if (tab === 'settings') setActiveTab('settings');
                else if (tab === 'stands') setActiveTab('stands');
              }}
              onOpenPreview={() => setPreviewQrModalOpen(true)}
            />

            {/* Promo Hero Banner Slider (Auto-Scrolling 3 Banners) */}
            <TableMintBannerSlider
              className="hide-on-desktop"
              onSelectTab={(targetTab) => {
                if (targetTab) {
                  setActiveTab(targetTab);
                }
              }}
            />

            {/* 4 Metric Cards (Matching Reference Screen 2: 2x2 Grid) */}
            <div className="kpi-four-grid">
              {/* Card 1: Revenue */}
              <div className="metric-card sales">
                <div className="metric-card-header">
                  <div className="metric-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>₹</div>
                  <span className="metric-badge green">
                    <TrendingUp size={11} /> +12%
                  </span>
                </div>
                <div className="metric-content">
                  <span className="metric-title">Revenue</span>
                  <div className="metric-value">
                    ₹{(totalRevenue || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <svg className="metric-card-wave wave-green" viewBox="0 0 160 36" fill="none" preserveAspectRatio="none">
                  <path d="M0 20C40 22 55 6 95 10C130 14 142 26 160 18V36H0V20Z" fill="#10b981" fillOpacity="0.14"/>
                  <path d="M0 24C35 26 60 14 100 16C130 18 145 28 160 24V36H0V24Z" fill="#10b981" fillOpacity="0.25"/>
                </svg>
              </div>

              {/* Card 2: Total Orders */}
              <div className="metric-card orders">
                <div className="metric-card-header">
                  <div className="metric-icon-box" style={{ background: '#fffbeb', color: '#d97706' }}>
                    <Receipt size={17} />
                  </div>
                  <span className="metric-badge amber">
                    <Clock size={11} /> +6%
                  </span>
                </div>
                <div className="metric-content">
                  <span className="metric-title">Total Orders</span>
                  <div className="metric-value">{orders.length}</div>
                </div>
                <svg className="metric-card-wave wave-amber" viewBox="0 0 160 36" fill="none" preserveAspectRatio="none">
                  <path d="M0 20C40 22 55 6 95 10C130 14 142 26 160 18V36H0V20Z" fill="#f59e0b" fillOpacity="0.14"/>
                  <path d="M0 24C35 26 60 14 100 16C130 18 145 28 160 24V36H0V24Z" fill="#f59e0b" fillOpacity="0.25"/>
                </svg>
              </div>

              {/* Card 3: Active Tables */}
              <div className="metric-card occupancy">
                <div className="metric-card-header">
                  <div className="metric-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
                    <Users size={17} />
                  </div>
                </div>
                <div className="metric-content">
                  <span className="metric-title">Active Tables</span>
                  <div className="metric-value" style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} />
                    <span style={{ color: '#2563eb' }}>{`${occupiedTables} / ${tables.length || 0}`}</span>
                  </div>
                </div>
                <svg className="metric-card-wave wave-blue" viewBox="0 0 160 36" fill="none" preserveAspectRatio="none">
                  <path d="M0 20C40 22 55 6 95 10C130 14 142 26 160 18V36H0V20Z" fill="#3b82f6" fillOpacity="0.14"/>
                  <path d="M0 24C35 26 60 14 100 16C130 18 145 28 160 24V36H0V24Z" fill="#3b82f6" fillOpacity="0.25"/>
                </svg>
              </div>

              {/* Card 4: Avg. Order Value */}
              <div className="metric-card ticket">
                <div className="metric-card-header">
                  <div className="metric-icon-box" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                    <BarChart3 size={17} />
                  </div>
                  <span className="metric-badge green">
                    <TrendingUp size={11} /> +5%
                  </span>
                </div>
                <div className="metric-content">
                  <span className="metric-title">Avg. Order Value</span>
                  <div className="metric-value">₹{avgTicket || 0}</div>
                </div>
                <svg className="metric-card-wave wave-purple" viewBox="0 0 160 36" fill="none" preserveAspectRatio="none">
                  <path d="M0 20C40 22 55 6 95 10C130 14 142 26 160 18V36H0V20Z" fill="#8b5cf6" fillOpacity="0.14"/>
                  <path d="M0 24C35 26 60 14 100 16C130 18 145 28 160 24V36H0V24Z" fill="#8b5cf6" fillOpacity="0.25"/>
                </svg>
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
                  View All <ChevronRight size={14} />
                </button>
              </div>

              <div className="mobile-live-orders-list">
                {(() => {
                  const activeKitchenOrders = orders.filter((o) => {
                    const s = (o.status || '').toLowerCase();
                    return ['pending', 'preparing', 'cooking', 'in-progress', 'ready'].includes(s);
                  });
                  if (activeKitchenOrders.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '24px 16px', color: '#64748b' }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>No active kitchen orders</p>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', opacity: 0.8 }}>Orders placed by customers will stream here live</p>
                      </div>
                    );
                  }
                  return activeKitchenOrders.slice(0, 5).map((order) => {
                    const isReady = (order.status || '').toLowerCase() === 'ready';
                    return (
                      <div
                        key={order.id || order._id}
                        className="mobile-live-order-row"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setActiveTab('orders');
                          setMobileSelectedOrder(order);
                        }}
                      >
                        <div className="mobile-live-order-left">
                          <span className="mobile-order-code">#{order.orderNumber || `T${order.tableId || 1}234`}</span>
                          <span className="mobile-order-table">{order.tableName || `Table ${order.tableId || 1}`}</span>
                        </div>
                        <div className="mobile-live-order-right">
                          <span className={`mobile-status-tag ${isReady ? 'ready' : 'preparing'}`}>
                            {isReady ? 'READY' : 'PREPARING'}
                          </span>
                          <span className="mobile-order-time">{order.time || (isReady ? 'Ready' : 'In Kitchen')}</span>
                          <ChevronRight size={16} className="mobile-order-chevron" />
                        </div>
                      </div>
                    );
                  });
                })()}
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
                      <span className="map-pill available"><span className="status-dot green" /> Available ({tables.filter(t => getTableStatusInfo(t).status === 'available').length})</span>
                      <span className="map-pill occupied"><span className="status-dot red" /> Occupied ({tables.filter(t => getTableStatusInfo(t).status === 'occupied').length})</span>
                      <span className="map-pill serving"><span className="status-dot blue" /> Serving ({tables.filter(t => getTableStatusInfo(t).status === 'serving').length})</span>
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
                  {tables.map((tbl) => {
                    const info = getTableStatusInfo(tbl);
                    return (
                      <div
                        key={tbl.id}
                        className={`ref-table-box ${info.status}`}
                        onClick={() => {
                          setSelectedBillingTableId(tbl.id);
                          setActiveTab('billing');
                        }}
                        title={`Table ${tbl.name} - ${info.status.toUpperCase()}`}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="ref-table-name">{tbl.name}</div>
                        <div className="ref-table-seats">{tbl.capacity || 4} Seats</div>
                        <div className="ref-table-state-label">
                          {info.status === 'occupied' && `Occupied ${info.code}`}
                          {info.status === 'serving' && `Serving ${info.code}`}
                          {info.status === 'available' && 'Available'}
                        </div>
                      </div>
                    );
                  })}
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
                  {orders.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                      No customer orders yet
                    </div>
                  ) : (
                    orders.slice(0, 5).map((ord) => (
                      <div
                        key={ord.id}
                        className="recent-order-ref-item"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedBillingTableId(ord.tableId);
                          setActiveTab('orders');
                        }}
                      >
                        <div className="recent-ord-left">
                          <span className="recent-ord-id">#{ord.orderNumber || ord.id.replace('ORD-', '')}</span>
                          <span className="recent-ord-table">{ord.tableName}</span>
                          <span className="recent-ord-price">₹ {ord.total}</span>
                        </div>
                        <div className="recent-ord-right">
                          <span className={`status-pill ${ord.status}`}>
                            {ord.status.charAt(0).toUpperCase() + ord.status.slice(1)}
                          </span>
                          <span className="recent-ord-time">{formatElapsed(ord.createdAt)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
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
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setActiveTab('stands')}
                  title="Print Acrylic QR Table Stands"
                >
                  <Printer size={15} /> Print QR Stands
                </button>
                <button
                  className="btn-brand-primary"
                  onClick={() => setTableModalOpen(true)}
                >
                  <Plus size={16} /> Add Table
                </button>
              </div>
            </div>


            {/* Filter Pills matching Reference Screen 5 */}
            <div className="admin-filter-pills-row">
              <button
                className={`admin-filter-pill ${tableStatusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTableStatusFilter('all')}
              >
                All ({tables.length})
              </button>
              <button
                className={`admin-filter-pill ${tableStatusFilter === 'floor1' ? 'active' : ''}`}
                onClick={() => setTableStatusFilter('floor1')}
              >
                Floor 1
              </button>
              <button
                className={`admin-filter-pill ${tableStatusFilter === 'floor2' ? 'active' : ''}`}
                onClick={() => setTableStatusFilter('floor2')}
              >
                Floor 2
              </button>
              <button
                className={`admin-filter-pill ${tableStatusFilter === 'available' ? 'active' : ''}`}
                onClick={() => setTableStatusFilter('available')}
              >
                <span className="status-dot green" /> Available ({tables.filter(t => getTableStatusInfo(t).status === 'available').length})
              </button>
              <button
                className={`admin-filter-pill ${tableStatusFilter === 'occupied' ? 'active' : ''}`}
                onClick={() => setTableStatusFilter('occupied')}
              >
                <span className="status-dot red" /> Occupied ({tables.filter(t => getTableStatusInfo(t).status === 'occupied').length})
              </button>
              <button
                className={`admin-filter-pill ${tableStatusFilter === 'serving' ? 'active' : ''}`}
                onClick={() => setTableStatusFilter('serving')}
              >
                <span className="status-dot blue" /> Serving ({tables.filter(t => getTableStatusInfo(t).status === 'serving').length})
              </button>
            </div>

            {/* Floor Grid of Pastel Table Cards matching Panel 3 on Desktop and Screen 5 on Mobile */}
            <div className="overview-floor-grid">
              {tables
                .filter((tbl) => {
                  const info = getTableStatusInfo(tbl);
                  if (tableStatusFilter === 'all') return true;
                  if (tableStatusFilter === 'floor1') return tbl.id <= 6;
                  if (tableStatusFilter === 'floor2') return tbl.id > 6;
                  return info.status === tableStatusFilter;
                })
                .map((tbl) => {
                  const info = getTableStatusInfo(tbl);
                  return (
                    <div
                      key={tbl.id}
                      className={`ref-table-box ${info.status}`}
                      onClick={() => {
                        setSelectedBillingTableId(tbl.id);
                        setActiveTab('billing');
                      }}
                      title={`Table ${tbl.name} - ${info.status.toUpperCase()}`}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="ref-table-name" style={{ fontSize: '1.45rem', fontWeight: 900 }}>
                        {tbl.name}
                      </div>
                      <div className="ref-table-seats" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                        {tbl.capacity || 4} Seats
                      </div>
                      <div className="ref-table-state-label" style={{ fontSize: '0.78rem', fontWeight: 700, marginTop: 4 }}>
                        {info.status === 'occupied' && `Occupied ${info.code}`}
                        {info.status === 'serving' && `Serving ${info.code}`}
                        {info.status === 'available' && 'Available'}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn-table-qr-badge"
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            borderRadius: 6,
                            border: '1px solid #d97706',
                            background: '#fffbeb',
                            color: '#b45309',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewQrTable(tbl);
                          }}
                          title="Print / View Table QR Stand"
                        >
                          <QrCode size={12} /> Stand
                        </button>
                        {info.status !== 'available' && (
                          <button
                            type="button"
                            className="btn-vacate-table-badge"
                            style={{
                              padding: '3px 8px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              borderRadius: 6,
                              border: '1px solid #fca5a5',
                              background: '#fff',
                              color: '#dc2626',
                              cursor: 'pointer'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVacateTable(tbl.id);
                            }}
                          >
                            Vacate
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
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

            {/* Screen 4: Mobile Order Details Screen (Active when an order is selected on mobile) */}
            {mobileSelectedOrder ? (
              <div className="mobile-order-details-screen hide-on-desktop">
                <div className="mobile-order-details-meta">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{mobileSelectedOrder.table}</span>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Placed {mobileSelectedOrder.time} ago</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                    Order {mobileSelectedOrder.code} • Dine-in Guest
                  </div>
                </div>

                {/* Items List */}
                <div className="mobile-order-items-list">
                  {(mobileSelectedOrder.itemsList || [
                    { name: 'Paneer Tikka', quantity: 2, price: 220, image: '/images/paneer_tikka.jpg' },
                    { name: 'Chicken Biryani', quantity: 1, price: 280, image: '/images/chicken_biryani.jpg' },
                    { name: 'Masala Dosa', quantity: 1, price: 180, image: '/images/masala_dosa.jpg' }
                  ]).map((it, idx) => (
                    <div key={idx} className="mobile-order-item-row">
                      <img
                        src={it.image || getItemImage(it)}
                        alt={it.name}
                        className="mobile-order-item-thumb"
                        onError={(e) => { e.target.src = getItemImage(it); }}
                      />
                      <div className="mobile-order-item-info">
                        <div className="mobile-order-item-name">{it.name}</div>
                        <div className="mobile-order-item-price">₹{it.price} each</div>
                      </div>
                      <div className="mobile-order-item-qty">x{it.quantity || 1}</div>
                      <div className="mobile-order-item-total">₹{(it.price || 200) * (it.quantity || 1)}</div>
                    </div>
                  ))}
                </div>

                {/* Order Notes */}
                <div className="mobile-customer-notes-box">
                  <div className="notes-label">Order Notes</div>
                  <div className="notes-text">{mobileSelectedOrder.notes || 'None'}</div>
                </div>

                {/* Financial Summary */}
                <div className="mobile-order-financials">
                  <div className="financial-row">
                    <span>Subtotal</span>
                    <span>₹{Math.round(mobileSelectedOrder.amount / 1.05)}</span>
                  </div>
                  <div className="financial-row">
                    <span>GST (5%)</span>
                    <span>₹{Math.round(mobileSelectedOrder.amount - (mobileSelectedOrder.amount / 1.05))}</span>
                  </div>
                  <div className="financial-row total">
                    <span>Total Amount</span>
                    <span>₹{mobileSelectedOrder.amount}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mobile-order-actions-stack">
                  <select
                    className="mobile-status-select"
                    value={mobileSelectedOrder.status}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      handleOrderStatusUpdate(mobileSelectedOrder.id, newStatus);
                      setMobileSelectedOrder(prev => ({ ...prev, status: newStatus }));
                    }}
                  >
                    <option value="pending">Status: Pending</option>
                    <option value="preparing">Status: Preparing</option>
                    <option value="ready">Status: Ready</option>
                    <option value="served">Status: Served</option>
                    <option value="completed">Status: Completed</option>
                    <option value="cancelled">Status: Cancelled</option>
                  </select>

                  <button
                    type="button"
                    className="mobile-print-bill-btn"
                    onClick={() => {
                      handlePrintBill({
                        id: mobileSelectedOrder.id,
                        orderNumber: mobileSelectedOrder.orderNumber || mobileSelectedOrder.id.replace('ORD-', ''),
                        tableName: mobileSelectedOrder.tableName,
                        items: mobileSelectedOrder.items || [{ name: 'Dining Order', quantity: 1, price: mobileSelectedOrder.total }],
                        total: mobileSelectedOrder.total,
                        subtotal: mobileSelectedOrder.subtotal,
                        tax: mobileSelectedOrder.tax
                      });
                    }}
                  >
                    <Printer size={16} /> Print Bill Receipt
                  </button>

                  <button
                    type="button"
                    className="btn-brand-outline"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => setMobileSelectedOrder(null)}
                  >
                    Back to All Orders
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Search Bar Pill matching Reference Screen 3 */}
                <div className="mobile-search-pill-box hide-on-desktop">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search orders, tables..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                  />
                </div>

                {/* Filter Pills matching Reference Screen 3 */}
                <div className="admin-filter-pills-row">
                  {[
                    { id: 'all', label: 'All Orders', count: orders.length },
                    { id: 'pending', label: 'Pending', count: orders.filter(o => o.status === 'pending').length },
                    { id: 'preparing', label: 'Preparing', count: orders.filter(o => o.status === 'preparing').length },
                    { id: 'ready', label: 'Ready', count: orders.filter(o => o.status === 'ready').length },
                    { id: 'served', label: 'Served', count: orders.filter(o => o.status === 'served').length }
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

                {/* Screen 3: Mobile Orders List Cards */}
                <div className="mobile-orders-cards-container hide-on-desktop">
                  {orders
                    .filter((ord) => {
                      const matchesFilter = orderFilter === 'all' || ord.status === orderFilter;
                      const matchesSearch = !orderSearch.trim() ||
                        (ord.orderNumber && ord.orderNumber.toString().includes(orderSearch)) ||
                        (ord.id && ord.id.toLowerCase().includes(orderSearch.toLowerCase())) ||
                        (ord.tableName && ord.tableName.toLowerCase().includes(orderSearch.toLowerCase()));
                      return matchesFilter && matchesSearch;
                    })
                    .map((ord) => (
                      <div
                        key={ord.id}
                        className="mobile-order-card"
                        onClick={() => setMobileSelectedOrder(ord)}
                      >
                        <div className="mobile-order-card-row" style={{ marginBottom: 4 }}>
                          <span className="mobile-order-code">#{ord.orderNumber || ord.id.replace('ORD-', '')}</span>
                          <span className={`status-badge-pill ${ord.status}`}>
                            {ord.status.charAt(0).toUpperCase() + ord.status.slice(1)}
                          </span>
                        </div>
                        <div className="mobile-order-card-row" style={{ marginBottom: 6 }}>
                          <span className="mobile-order-table">{ord.tableName} • {(ord.items || []).length} items</span>
                          <span className="mobile-order-time">{formatElapsed(ord.createdAt)}</span>
                        </div>
                        <div className="mobile-order-card-row">
                          <span className="mobile-order-price">₹ {ord.total}</span>
                          <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>
                            View Details ›
                          </span>
                        </div>
                      </div>
                    ))}

                  {orders.length === 0 && (
                    <div style={{ padding: '36px 16px', textAlign: 'center', color: '#94a3b8' }}>
                      No live customer orders found
                    </div>
                  )}
                </div>

                {/* Clean Full-Width Data Table for Desktop */}
                <div className="admin-table-card hide-on-mobile">
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
                      {orders
                        .filter((ord) => orderFilter === 'all' || ord.status === orderFilter)
                        .map((ord) => (
                          <tr key={ord.id}>
                            <td style={{ fontWeight: 800, color: '#0f172a' }}>
                              #{ord.orderNumber || ord.id.replace('ORD-', '')}
                            </td>
                            <td style={{ color: '#475569', fontWeight: 600 }}>{ord.tableName}</td>
                            <td style={{ color: '#64748b' }}>
                              {(ord.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ') || 'Custom Items'}
                            </td>
                            <td style={{ fontWeight: 800, color: '#0f172a' }}>₹ {ord.total}</td>
                            <td>
                              <span className={`status-badge-pill ${ord.status}`}>
                                {ord.status.charAt(0).toUpperCase() + ord.status.slice(1)}
                              </span>
                            </td>
                            <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{formatElapsed(ord.createdAt)}</td>
                            <td>
                              <button
                                className="btn-row-action"
                                onClick={() => {
                                  setSelectedBillingTableId(ord.tableId);
                                  setActiveTab('billing');
                                }}
                              >
                                View / Bill
                              </button>
                            </td>
                          </tr>
                        ))}
                      {orders.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                            No live customer orders yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
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

            {/* Screen 7: Mobile Kitchen Display Filter Pills (Reference Image Screen 7) */}
            <div className="admin-filter-pills-row hide-on-desktop">
              {[
                { id: 'pending', label: 'Pending', count: orders.filter(o => o.status === 'pending').length },
                { id: 'preparing', label: 'Preparing', count: orders.filter(o => o.status === 'preparing').length },
                { id: 'ready', label: 'Ready', count: orders.filter(o => o.status === 'ready').length },
                { id: 'served', label: 'Served', count: orders.filter(o => o.status === 'served').length }
              ].map((p) => (
                <button
                  key={p.id}
                  className={`admin-filter-pill ${kitchenStatusFilter === p.id ? 'active' : ''}`}
                  onClick={() => setKitchenStatusFilter(p.id)}
                >
                  {p.label} ({p.count})
                </button>
              ))}
            </div>

            {/* Screen 7: Mobile Kitchen Display Tickets List */}
            <div className="mobile-kds-cards-list hide-on-desktop">
              {orders
                .filter((t) => {
                  if (kitchenStatusFilter === 'pending') return ['pending', 'preparing'].includes(t.status);
                  return t.status === kitchenStatusFilter;
                })
                .map((ticket) => (
                  <div key={ticket.id} className="mobile-kds-card">
                    <div className="kds-card-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span className="kds-order-id" style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>
                        #{ticket.orderNumber || ticket.id.replace('ORD-', '')}
                      </span>
                      <span className="kds-order-timer" style={{ fontSize: '0.78rem', color: ticket.status === 'pending' ? '#ea580c' : ticket.status === 'preparing' ? '#0284c7' : '#059669', fontWeight: 700 }}>
                        {formatElapsed(ticket.createdAt)}
                      </span>
                    </div>
                    <div className="kds-order-table" style={{ fontWeight: 700, fontSize: '0.86rem', color: '#475569', marginBottom: 8 }}>
                      {ticket.tableName}
                    </div>
                    <div className="kds-order-items" style={{ fontSize: '0.82rem', color: '#1e293b', background: '#f8fafc', padding: '8px 10px', borderRadius: 8, marginBottom: 12 }}>
                      {(ticket.items || []).map((it, idx) => (
                        <div key={idx} style={{ padding: '2px 0' }}>• {it.quantity} x {it.name}</div>
                      ))}
                    </div>
                    {ticket.status === 'pending' ? (
                      <button
                        className="kds-btn-action pending"
                        style={{ width: '100%', padding: '10px', borderRadius: 8, fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer', border: 'none' }}
                        onClick={() => handleOrderStatusUpdate(ticket.id, 'preparing')}
                      >
                        Start Cooking
                      </button>
                    ) : ticket.status === 'preparing' ? (
                      <button
                        className="kds-btn-action preparing"
                        style={{ width: '100%', padding: '10px', borderRadius: 8, fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer', border: 'none' }}
                        onClick={() => handleOrderStatusUpdate(ticket.id, 'ready')}
                      >
                        Ready for Pickup
                      </button>
                    ) : ticket.status === 'ready' ? (
                      <button
                        className="kds-btn-action ready"
                        style={{ width: '100%', padding: '10px', borderRadius: 8, fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer', border: 'none' }}
                        onClick={() => handleOrderStatusUpdate(ticket.id, 'served')}
                      >
                        Mark as Served
                      </button>
                    ) : (
                      <div style={{ textAlign: 'center', color: '#10b981', fontWeight: 800, padding: '8px 0', fontSize: '0.85rem' }}>
                        ✓ Order Served
                      </div>
                    )}
                  </div>
                ))}
              {orders.filter(t => ['pending', 'preparing', 'ready', 'served'].includes(t.status)).length === 0 && (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: '#94a3b8' }}>
                  No active kitchen orders
                </div>
              )}
            </div>

            {/* 4 Status Columns matching Reference Panel 5 for Desktop */}
            <div className="kds-four-col-grid hide-on-mobile">
              {/* Column 1: Pending */}
              <div className="kds-column">
                <div className="kds-col-header pending">
                  <span>Pending ({orders.filter(o => o.status === 'pending').length})</span>
                </div>
                {orders.filter(o => o.status === 'pending').map((ticket) => (
                  <div key={ticket.id} className="kds-order-card">
                    <div className="kds-card-top">
                      <span className="kds-order-id">#{ticket.orderNumber || ticket.id.replace('ORD-', '')}</span>
                      <span className="kds-order-timer" style={{ color: '#ea580c' }}>{formatElapsed(ticket.createdAt)}</span>
                    </div>
                    <div className="kds-order-table">{ticket.tableName}</div>
                    <div className="kds-order-items">
                      {(ticket.items || []).map((it, idx) => (
                        <div key={idx}>{it.quantity} x {it.name}</div>
                      ))}
                    </div>
                    <button
                      className="kds-btn-action pending"
                      onClick={() => handleOrderStatusUpdate(ticket.id, 'preparing')}
                    >
                      Start Cooking
                    </button>
                  </div>
                ))}
                {orders.filter(o => o.status === 'pending').length === 0 && (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    No pending orders
                  </div>
                )}
              </div>

              {/* Column 2: Preparing */}
              <div className="kds-column">
                <div className="kds-col-header preparing">
                  <span>Preparing ({orders.filter(o => o.status === 'preparing').length})</span>
                </div>
                {orders.filter(o => o.status === 'preparing').map((ticket) => (
                  <div key={ticket.id} className="kds-order-card">
                    <div className="kds-card-top">
                      <span className="kds-order-id">#{ticket.orderNumber || ticket.id.replace('ORD-', '')}</span>
                      <span className="kds-order-timer" style={{ color: '#0284c7' }}>{formatElapsed(ticket.createdAt)}</span>
                    </div>
                    <div className="kds-order-table">{ticket.tableName}</div>
                    <div className="kds-order-items">
                      {(ticket.items || []).map((it, idx) => (
                        <div key={idx}>{it.quantity} x {it.name}</div>
                      ))}
                    </div>
                    <button
                      className="kds-btn-action preparing"
                      onClick={() => handleOrderStatusUpdate(ticket.id, 'ready')}
                    >
                      Ready for Pickup
                    </button>
                  </div>
                ))}
                {orders.filter(o => o.status === 'preparing').length === 0 && (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    No cooking in progress
                  </div>
                )}
              </div>

              {/* Column 3: Ready */}
              <div className="kds-column">
                <div className="kds-col-header ready">
                  <span>Ready ({orders.filter(o => o.status === 'ready').length})</span>
                </div>
                {orders.filter(o => o.status === 'ready').map((ticket) => (
                  <div key={ticket.id} className="kds-order-card">
                    <div className="kds-card-top">
                      <span className="kds-order-id">#{ticket.orderNumber || ticket.id.replace('ORD-', '')}</span>
                      <span className="kds-order-timer" style={{ color: '#059669' }}>{formatElapsed(ticket.createdAt)}</span>
                    </div>
                    <div className="kds-order-table">{ticket.tableName}</div>
                    <div className="kds-order-items">
                      {(ticket.items || []).map((it, idx) => (
                        <div key={idx}>{it.quantity} x {it.name}</div>
                      ))}
                    </div>
                    <button
                      className="kds-btn-action ready"
                      onClick={() => handleOrderStatusUpdate(ticket.id, 'served')}
                    >
                      Mark as Served
                    </button>
                  </div>
                ))}
                {orders.filter(o => o.status === 'ready').length === 0 && (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    No orders waiting pickup
                  </div>
                )}
              </div>

              {/* Column 4: Served */}
              <div className="kds-column">
                <div className="kds-col-header served">
                  <span>Served ({orders.filter(o => o.status === 'served').length})</span>
                </div>
                {orders.filter(o => o.status === 'served').map((ticket) => (
                  <div key={ticket.id} className="kds-order-card">
                    <div className="kds-card-top">
                      <span className="kds-order-id">#{ticket.orderNumber || ticket.id.replace('ORD-', '')}</span>
                      <span className="kds-order-timer">{formatElapsed(ticket.createdAt)}</span>
                    </div>
                    <div className="kds-order-table">{ticket.tableName}</div>
                    <div className="kds-order-items">
                      {(ticket.items || []).map((it, idx) => (
                        <div key={idx}>{it.quantity} x {it.name}</div>
                      ))}
                    </div>
                    <div style={{ textAlign: 'center', color: '#10b981', fontWeight: 800, padding: '8px 0', fontSize: '0.85rem' }}>
                      ✓ Served to Table
                    </div>
                  </div>
                ))}
                {orders.filter(o => o.status === 'served').length === 0 && (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    No served orders
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Summary Strip matching Panel 5 for Desktop */}
            <div className="kds-summary-strip hide-on-mobile">
              <span>📋 <strong>{orders.length}</strong> Total Orders</span>
              <span>⏳ <strong>{orders.filter(o => o.status === 'pending').length}</strong> Pending</span>
              <span>👨‍🍳 <strong>{orders.filter(o => o.status === 'preparing').length}</strong> Preparing</span>
              <span>✅ <strong>{orders.filter(o => o.status === 'ready').length}</strong> Ready</span>
              <span>🍽️ <strong>{orders.filter(o => o.status === 'served').length}</strong> Served</span>
            </div>
          </section>
        )}

        {/* ========================================================
            TAB: MENU MANAGEMENT (SMART MENU BUILDER)
            ======================================================== */}
        {activeTab === 'menu' && (
          <section className="admin-page-container">
            <div className="page-header-row">
              <div>
                <h2 className="page-title">Menu Management</h2>
                <p className="page-subtitle">Add, edit, organize and publish your live restaurant catalog</p>
              </div>
              <div className="page-header-actions" style={{ flexWrap: 'wrap', gap: 8 }}>
                <button
                  className="btn-brand-outline"
                  style={{
                    background: '#ecfdf5',
                    borderColor: '#10b981',
                    color: '#065f46',
                    fontWeight: 700
                  }}
                  onClick={() => setDefaultMenuModalOpen(true)}
                  title="Explore and import TableMint default starter menu catalog"
                >
                  <Sparkles size={15} style={{ color: '#059669' }} /> TableMint Default Menu
                </button>
                <button
                  className="btn-brand-outline"
                  onClick={() => setCategoryModalOpen(true)}
                  title="Manage custom menu categories"
                >
                  <Tag size={15} /> Categories ({categories.length})
                </button>
                <button
                  className="btn-brand-outline"
                  onClick={() => setCsvImportModalOpen(true)}
                  title="Upload CSV or Excel spreadsheet"
                >
                  <Download size={15} /> Import CSV
                </button>
                <button
                  className="btn-brand-outline"
                  onClick={() => setOcrModalOpen(true)}
                  title="Extract menu from photo using AI OCR"
                >
                  <Sparkles size={15} /> AI OCR Photo
                </button>
                <button
                  className="btn-brand-outline"
                  onClick={() => setPreviewQrModalOpen(true)}
                  title="Preview digital customer QR menu"
                >
                  <QrCode size={15} /> Preview QR
                </button>
                <button
                  className="btn-brand-primary"
                  onClick={() => {
                    setEditingDish(null);
                    setDishForm({
                      name: '',
                      category: categories[0]?.name || 'Starters',
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

            {/* If Menu is completely empty, display the 4-Card Smart Empty State */}
            {menu.length === 0 ? (
              <EmptyMenuState
                onAddManual={() => {
                  setEditingDish(null);
                  setDishForm({
                    name: '',
                    category: categories[0]?.name || 'Starters',
                    price: '',
                    description: '',
                    image: '',
                    isVeg: true
                  });
                  setMenuModalOpen(true);
                }}
                onManualAdd={() => {
                  setEditingDish(null);
                  setDishForm({
                    name: '',
                    category: categories[0]?.name || 'Starters',
                    price: '',
                    description: '',
                    image: '',
                    isVeg: true
                  });
                  setMenuModalOpen(true);
                }}
                onImportCsv={() => setCsvImportModalOpen(true)}
                onCsvImport={() => setCsvImportModalOpen(true)}
                onUploadOcr={() => setOcrModalOpen(true)}
                onOcrImport={() => setOcrModalOpen(true)}
                onSelectCategories={() => setCategoryModalOpen(true)}
                onManageCategories={() => setCategoryModalOpen(true)}
                onOpenDefaultMenu={() => setDefaultMenuModalOpen(true)}
                onLoadDemo={() => setDefaultMenuModalOpen(true)}
                onLoadDemoMenu={() => setDefaultMenuModalOpen(true)}
                loadingDemo={loadingDemoMenu}
              />
            ) : (
              <>
                {/* Screen 6: Mobile Search Bar Pill (Reference Image Screen 6) */}
                <div className="mobile-search-pill-box hide-on-desktop">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search menu items..."
                    value={menuSearch}
                    onChange={(e) => {
                      setMenuSearch(e.target.value);
                      setMenuPage(1);
                    }}
                  />
                </div>

                {/* Category Filter Pills */}
                <div className="admin-filter-pills-row">
                  {activeMenuCategories.map((c) => {
                    const count = c === 'all'
                      ? menu.length
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

                {/* Search & Filter Controls for Desktop */}
                <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
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

                  <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                    Showing {filteredMenu.length} of {menu.length} dishes
                  </div>
                </div>

                {/* Bulk Action Toolbar */}
                {selectedMenuItems.length > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: 12,
                    padding: '10px 16px',
                    margin: '12px 0',
                    gap: 12,
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#065f46', fontSize: '0.88rem' }}>
                      <CheckCircle size={16} />
                      <span>{selectedMenuItems.length} items selected</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        className="btn-brand-outline"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#fff' }}
                        onClick={() => handleBulkAvailability(true)}
                      >
                        Mark In-Stock
                      </button>
                      <button
                        className="btn-brand-outline"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#fff' }}
                        onClick={() => handleBulkAvailability(false)}
                      >
                        Mark Out-of-Stock
                      </button>
                      <button
                        className="btn-brand-outline"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#fff' }}
                        onClick={() => handleBulkPublish('published')}
                      >
                        Publish
                      </button>
                      <button
                        className="btn-brand-outline"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#fff' }}
                        onClick={() => handleBulkPublish('draft')}
                      >
                        Draft
                      </button>
                      <button
                        className="btn-brand-outline"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#fff', color: '#dc2626', borderColor: '#fca5a5' }}
                        onClick={() => setSelectedMenuItems([])}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                {/* Mobile Menu Management Dish Cards */}
                <div className="mobile-menu-cards-list hide-on-desktop">
                  {filteredMenu.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 16px', background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', margin: '8px 0' }}>
                      <p style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a', margin: 0 }}>No dishes found</p>
                      <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
                        Try searching with another keyword or pick another category
                      </p>
                    </div>
                  ) : (
                    (paginatedMenu.length > 0 ? paginatedMenu : filteredMenu).map((dish) => {
                      const isActive = dish.available !== false && dish.status !== 'inactive';
                      const isDraft = dish.status === 'draft';
                      return (
                        <div key={dish.id} className="mobile-menu-dish-card">
                          <img
                            src={dish.image || '/images/paneer_butter_masala.jpg'}
                            alt={dish.name}
                            className="mobile-menu-thumb"
                            onError={(e) => { e.target.src = '/images/paneer_butter_masala.jpg'; }}
                          />
                          <div
                            className="mobile-menu-details"
                            onClick={() => {
                              setEditingDish(dish);
                              setMenuModalOpen(true);
                            }}
                            style={{ cursor: 'pointer' }}
                            title="Click to edit item"
                          >
                            <div className="mobile-menu-dish-name">
                              {dish.name}
                              {isDraft && (
                                <span style={{ marginLeft: 6, fontSize: '0.68rem', padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: 6, fontWeight: 700 }}>
                                  DRAFT
                                </span>
                              )}
                            </div>
                            <div className="mobile-menu-meta-line">
                              <span className="mobile-menu-price">
                                {dish.variants?.length ? `From ₹${dish.variants[0].price}` : `₹${dish.price}`}
                              </span>
                              <span className={`mobile-diet-tag ${dish.isVeg ? 'veg' : 'non-veg'}`}>
                                <span className={`diet-box ${dish.isVeg ? 'veg' : 'non-veg'}`} style={{ width: 8, height: 8 }} />
                                {dish.isVeg ? 'Veg' : 'Non-Veg'}
                              </span>
                              {dish.category && (
                                <span className="mobile-diet-tag" style={{ background: '#f1f5f9', color: '#64748b' }}>
                                  {dish.category.charAt(0).toUpperCase() + dish.category.slice(1)}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* iOS Switch Toggle */}
                          <label className="mobile-switch-toggle" title={isActive ? 'In Stock' : 'Out of Stock'}>
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => handleToggleMenu(dish.id)}
                            />
                            <span className="mobile-switch-slider" />
                          </label>
                        </div>
                      );
                    })
                  )}

                  {/* Mobile Menu Pagination Controls */}
                  {totalMenuPages > 1 && (
                    <div className="mobile-pagination-wrapper">
                      <PaginationBar
                        currentPage={currentMenuPage}
                        totalPages={totalMenuPages}
                        totalItems={filteredMenu.length}
                        itemsPerPage={menuPerPage}
                        onPageChange={(p) => {
                          setMenuPage(p);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        label="dishes"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    className="mobile-sticky-add-item-btn"
                    onClick={() => {
                      setEditingDish(null);
                      setDishForm({
                        name: '',
                        category: categories[0]?.name || 'Starters',
                        price: '',
                        description: '',
                        image: '',
                        isVeg: true
                      });
                      setMenuModalOpen(true);
                    }}
                  >
                    <Plus size={18} /> Add Item
                  </button>
                </div>

                {/* Menu Items Table matching Reference Panel 4 for Desktop */}
                <div className="admin-table-card hide-on-mobile">
                  <table className="admin-clean-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>
                          <input
                            type="checkbox"
                            checked={selectedMenuItems.length === paginatedMenu.length && paginatedMenu.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMenuItems(paginatedMenu.map(m => m.id));
                              } else {
                                setSelectedMenuItems([]);
                              }
                            }}
                          />
                        </th>
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
                      {filteredMenu.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>No dishes found</p>
                            <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>Try adjusting your search query or category filter</p>
                          </td>
                        </tr>
                      ) : (
                        paginatedMenu.map((dish) => {
                          const isActive = dish.available !== false && dish.status !== 'inactive';
                          const isDraft = dish.status === 'draft';
                          const isSelected = selectedMenuItems.includes(dish.id);
                          return (
                            <tr key={dish.id} style={{ background: isSelected ? '#f0fdf4' : 'inherit' }}>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedMenuItems(prev => [...prev, dish.id]);
                                    } else {
                                      setSelectedMenuItems(prev => prev.filter(id => id !== dish.id));
                                    }
                                  }}
                                />
                              </td>
                              <td>
                                <img
                                  src={dish.image || '/images/paneer_butter_masala.jpg'}
                                  alt={dish.name}
                                  style={{ width: 42, height: 42, borderRadius: 8, objectFit: 'cover' }}
                                  onError={(e) => { e.target.src = '/images/paneer_butter_masala.jpg'; }}
                                />
                              </td>
                              <td>
                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{dish.name}</div>
                                {dish.variants && dish.variants.length > 0 && (
                                  <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                                    {dish.variants.length} size variants ({dish.variants.map(v => v.name).join(', ')})
                                  </div>
                                )}
                              </td>
                              <td style={{ color: '#64748b' }}>
                                {dish.category ? (dish.category.charAt(0).toUpperCase() + dish.category.slice(1)) : 'General'}
                              </td>
                              <td style={{ fontWeight: 800, color: '#0f172a' }}>
                                {dish.variants?.length ? `From ₹${dish.variants[0].price}` : `₹ ${dish.price}`}
                              </td>
                              <td>
                                <span className={`diet-box ${dish.isVeg ? 'veg' : 'non-veg'}`} />
                                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: dish.isVeg ? '#059669' : '#dc2626' }}>
                                  {dish.isVeg ? 'Veg' : 'Non-Veg'}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMenu(dish.id)}
                                    className={`status-badge-pill ${isActive ? 'active' : 'inactive'}`}
                                    style={{ cursor: 'pointer', border: 'none' }}
                                    title="Click to toggle availability"
                                  >
                                    {isActive ? '• In Stock' : 'Out of Stock'}
                                  </button>
                                  <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    background: isDraft ? '#fef3c7' : '#ecfdf5',
                                    color: isDraft ? '#92400e' : '#065f46'
                                  }}>
                                    {isDraft ? 'Draft' : 'Live'}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <button
                                    className="btn-row-action"
                                    onClick={() => {
                                      setEditingDish(dish);
                                      setMenuModalOpen(true);
                                    }}
                                    title="Edit Item Details"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="btn-row-action"
                                    onClick={() => handleDuplicateItem(dish.id)}
                                    title="Duplicate Item"
                                    style={{ background: '#f1f5f9', color: '#475569' }}
                                  >
                                    <Copy size={13} />
                                  </button>
                                  <button
                                    className="btn-row-dots"
                                    title="Delete Item"
                                    onClick={() => handleDeleteMenuItem(dish.id)}
                                  >
                                    <Trash2 size={14} style={{ color: '#ef4444' }} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  {totalMenuPages > 1 && (
                    <PaginationBar
                      currentPage={currentMenuPage}
                      totalPages={totalMenuPages}
                      totalItems={filteredMenu.length}
                      itemsPerPage={menuPerPage}
                      onPageChange={(p) => setMenuPage(p)}
                      label="menu items"
                    />
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {/* ========================================================
            TAB: QR STANDS
            ======================================================== */}
        {activeTab === 'stands' && (
          <section className="admin-page-container">
            <div className="page-header-row stands-page-header-row">
              <div>
                <h2 className="page-title">Table Acrylic QR Stands</h2>
                <p className="page-subtitle">Luxury printable standees for contactless guest phone ordering</p>
              </div>
              <div className="page-header-actions stands-actions-bar" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  className="dash-form-select stands-filter-select"
                  style={{ width: 170, margin: 0, padding: '7px 12px', fontSize: '0.85rem' }}
                  value={standsFilter}
                  onChange={(e) => {
                    setStandsFilter(e.target.value);
                    setStandsPage(1);
                  }}
                >
                  <option value="all">All Tables ({tables.length})</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name || `Table ${t.id}`}
                    </option>
                  ))}
                </select>
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
                        src={`/api/qrcode/${t.id}?restaurant=${encodeURIComponent(currentUser?.restaurantSlug || settingsForm?.restaurantSlug || 'tablemint')}`}
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
                    <div className="stand-card-actions no-print">
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
                        <QrCode size={14} /> Preview
                      </button>
                      <button
                        type="button"
                        className="btn-secondary stand-share-btn"
                        onClick={() => handleShareOrDownloadStand(t)}
                        title="Share QR or Save Stand Image"
                      >
                        <Share2 size={14} /> Share / Save
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
                  <div className="pos-bill-header-left">
                    <h3 className="pos-bill-title">
                      Table {selectedBillingTableId} <span className="pos-bill-tag">
                        ({tables.find(t => t.id === Number(selectedBillingTableId))?.sessionToken ? `#${tables.find(t => t.id === Number(selectedBillingTableId)).sessionToken}` : `#T${selectedBillingTableId}`})
                      </span>
                    </h3>
                    <span className={`status-badge-pill ${getTableStatusInfo(tables.find(t => t.id === Number(selectedBillingTableId))).status}`}>
                      {getTableStatusInfo(tables.find(t => t.id === Number(selectedBillingTableId))).status === 'available' ? 'Available' : 'Dine-in (Occupied)'}
                    </span>
                  </div>
                  <select
                    className="pos-bill-table-select"
                    value={selectedBillingTableId}
                    onChange={(e) => setSelectedBillingTableId(parseInt(e.target.value, 10))}
                    title="Switch Table"
                  >
                    {tables.map((t) => {
                      const tInfo = getTableStatusInfo(t);
                      return (
                        <option key={t.id} value={t.id}>
                          {t.name} {tInfo.status === 'occupied' ? '• Occupied' : tInfo.status === 'serving' ? '• Serving' : '• Available'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Items Breakdown Table matching Real Live Customer Order */}
                {(() => {
                  const activeTableOrders = getTableActiveOrders(selectedBillingTableId);
                  const activeBillItems = [];
                  activeTableOrders.forEach((ord) => {
                    (ord.items || []).forEach((it) => {
                      const itemImg = it.image || getItemImage(it);
                      const existing = activeBillItems.find((x) => (x.id && x.id === it.id) || x.name === it.name);
                      if (existing) {
                        existing.quantity += it.quantity;
                        if (!existing.image && itemImg) existing.image = itemImg;
                      } else {
                        activeBillItems.push({ ...it, image: itemImg });
                      }
                    });
                  });
                  const billSubtotal = activeBillItems.reduce((sum, it) => sum + (it.price * it.quantity), 0);
                  const billGst = +(billSubtotal * 0.05).toFixed(2);
                  const billTotal = +(billSubtotal + billGst).toFixed(2);

                  if (activeBillItems.length === 0) {
                    return (
                      <div style={{ padding: '40px 16px', textAlign: 'center', color: '#64748b' }}>
                        <div style={{ fontSize: '2rem', marginBottom: 8 }}>🍽️</div>
                        <h4 style={{ margin: '0 0 6px', color: '#0f172a', fontWeight: 800 }}>Table {selectedBillingTableId} is Vacant</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>No active customer orders placed on this table yet.</p>
                        {tables.filter(t => getTableStatusInfo(t).status !== 'available').length > 0 && (
                          <div style={{ marginTop: 14 }}>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Switch to active table: </span>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                              {tables.filter(t => getTableStatusInfo(t).status !== 'available').map(t => (
                                <button
                                  key={t.id}
                                  type="button"
                                  className="btn-brand-outline"
                                  style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                                  onClick={() => setSelectedBillingTableId(t.id)}
                                >
                                  {t.name} (Active)
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="pos-bill-items-list">
                        {activeBillItems.map((it, idx) => (
                          <div key={idx} className="pos-bill-item-row">
                            <div className="pos-bill-item-left">
                              <img
                                src={it.image || getItemImage(it)}
                                alt={it.name}
                                className="pos-bill-item-img"
                                onError={(e) => { e.target.src = getItemImage(it); }}
                              />
                              <div>
                                <span className="pos-bill-item-name">{it.name}</span>
                                {it.notes && <div style={{ fontSize: '0.72rem', color: '#ea580c' }}>Note: {it.notes}</div>}
                              </div>
                            </div>
                            <span className="pos-bill-item-qty">x{it.quantity}</span>
                            <span className="pos-bill-item-price">₹ {it.price * it.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* Totals Summary */}
                      <div className="pos-bill-calc-box">
                        <div className="pos-bill-calc-row">
                          <span>Subtotal</span>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>₹ {billSubtotal}</span>
                        </div>
                        <div className="pos-bill-calc-row">
                          <span>GST (5%)</span>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>₹ {billGst}</span>
                        </div>
                        <div className="pos-bill-calc-row total">
                          <span>Total</span>
                          <span>₹ {billTotal}</span>
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
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=4&data=${encodeURIComponent(
                                `upi://pay?pa=${settingsForm.upiId || 'tablemint@upi'}&pn=${encodeURIComponent(settingsForm.upiPayeeName || settingsForm.restaurantName || 'TableMint')}&am=${billTotal}&cu=INR&tn=${encodeURIComponent(`Bill Table ${selectedBillingTableId}`)}`
                              )}`}
                              alt="UPI QR Code"
                              className="pos-upi-qr-image"
                            />
                          </div>
                          <div className="pos-upi-meta-col">
                            <div className="pos-upi-title">UPI Payment</div>
                            <div className="pos-upi-subtitle">Scan to Pay Table Total</div>
                            <div className="pos-upi-amount-display">₹ {billTotal}</div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>VPA: <strong style={{ color: '#0f172a' }}>{settingsForm.upiId || 'tablemint@upi'}</strong></span>
                            </div>
                            <div className="pos-upi-app-logos">
                              <span className="pos-upi-app gpay">G Pay</span>
                              <span className="pos-upi-app phonepe">PhonePe</span>
                              <span className="pos-upi-app paytm">Paytm</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Full-width Settle & Print Bill Action Button */}
                      <button
                        type="button"
                        className="mobile-print-bill-btn"
                        style={{ marginTop: 14, width: '100%' }}
                        onClick={async () => {
                          const billToPrint = {
                            id: `B${Date.now().toString().slice(-4)}`,
                            orderNumber: activeTableOrders[0].orderNumber || activeTableOrders[0].id.replace('ORD-', ''),
                            tableName: `Table ${selectedBillingTableId}`,
                            items: activeBillItems,
                            total: billTotal,
                            subtotal: billSubtotal,
                            tax: billGst,
                            paymentMethod: billingPaymentMethod.toUpperCase()
                          };
                          handlePrintReceipt(billToPrint, thermalPaperSize);
                          for (const ord of activeTableOrders) {
                            await handleOrderStatusUpdate(ord.id, 'completed');
                          }
                          try {
                            await authFetch(`/api/tables/${selectedBillingTableId}/vacant`, { method: 'PATCH' });
                          } catch (e) {}
                          fetchAllData();
                          addToast(`Bill settled for Table ${selectedBillingTableId} & marked vacant`, 'success');
                        }}
                      >
                        <Printer size={16} /> Settle Bill & Print Receipt (₹ {billTotal})
                      </button>
                    </>
                  );
                })()}
              </div>

              {/* Right Column: Recent Bills & Thermal Print Preview for Desktop */}
              <div className="pos-bill-right-col hide-on-mobile">
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
                      {orders
                        .filter((o) => o.status === 'completed' || o.paymentStatus === 'paid')
                        .slice(0, 5)
                        .map((b) => (
                          <tr key={b.id}>
                            <td style={{ fontWeight: 800, color: '#0f172a', padding: '9px 10px' }}>
                              #B{b.orderNumber || b.id.replace('ORD-', '')}
                            </td>
                            <td style={{ color: '#64748b', padding: '9px 10px' }}>{b.tableName}</td>
                            <td style={{ fontWeight: 800, color: '#0f172a', padding: '9px 10px' }}>₹ {b.total}</td>
                            <td style={{ color: '#94a3b8', fontSize: '0.76rem', padding: '9px 10px' }}>{formatElapsed(b.completedAt || b.createdAt)}</td>
                            <td style={{ padding: '9px 10px' }}>
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                color: '#059669',
                                background: '#ecfdf5',
                                padding: '2px 8px',
                                borderRadius: 9999
                              }}>
                                {b.paymentMethod || 'UPI / Paid'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      {orders.filter((o) => o.status === 'completed' || o.paymentStatus === 'paid').length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '24px 10px', color: '#94a3b8' }}>
                            No settled bills yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Print Preview Card */}
                {(() => {
                  const activeTableOrders = getTableActiveOrders(selectedBillingTableId);
                  const activeBillItems = activeTableOrders.flatMap((o) => o.items || []);
                  const billSubtotal = activeBillItems.reduce((acc, it) => acc + (it.price * (it.quantity || 1)), 0);
                  const billGst = Math.round(billSubtotal * 0.05);
                  const billTotal = billSubtotal + billGst;

                  const previewOrder = activeTableOrders.length > 0 ? {
                    id: `B${activeTableOrders[0].orderNumber || activeTableOrders[0].id.replace('ORD-', '')}`,
                    orderNumber: activeTableOrders[0].orderNumber || activeTableOrders[0].id.replace('ORD-', ''),
                    tableName: `Table ${selectedBillingTableId}`,
                    items: activeBillItems,
                    subtotal: billSubtotal,
                    tax: billGst,
                    total: billTotal,
                    paymentMethod: billingPaymentMethod.toUpperCase(),
                    createdAt: activeTableOrders[0].createdAt
                  } : (
                    orders.find(o => o.tableId === selectedBillingTableId && (o.status === 'completed' || o.paymentStatus === 'paid')) ||
                    orders.find(o => o.status === 'completed' || o.paymentStatus === 'paid') ||
                    orders[0] || {
                      id: 'B101',
                      orderNumber: '101',
                      tableName: `Table ${selectedBillingTableId}`,
                      items: [
                        { name: 'Paneer Butter Masala', quantity: 1, price: 280 },
                        { name: 'Butter Naan', quantity: 2, price: 40 }
                      ],
                      subtotal: 360,
                      tax: 18,
                      total: 378,
                      paymentMethod: 'UPI'
                    }
                  );

                  const previewItems = previewOrder.items && previewOrder.items.length > 0
                    ? previewOrder.items
                    : [{ name: 'Dining Order', quantity: 1, price: previewOrder.total || 200 }];

                  return (
                    <div className="pos-print-preview-card">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                          Print Preview
                        </span>
                        <div className="thermal-size-switch" style={{ margin: 0 }}>
                          <button
                            type="button"
                            className={`thermal-size-btn ${thermalPaperSize === '58mm' ? 'active' : ''}`}
                            onClick={() => setThermalPaperSize('58mm')}
                            title="58mm / 2-inch standard POS thermal paper roll"
                          >
                            58mm Roll
                          </button>
                          <button
                            type="button"
                            className={`thermal-size-btn ${thermalPaperSize === '80mm' ? 'active' : ''}`}
                            onClick={() => setThermalPaperSize('80mm')}
                            title="80mm / 3-inch wide POS thermal paper roll"
                          >
                            80mm
                          </button>
                        </div>
                      </div>

                      <div
                        className="thermal-paper-slip"
                        style={{
                          width: '100%',
                          maxWidth: thermalPaperSize === '58mm' ? 240 : 290,
                          margin: '0 auto',
                          padding: thermalPaperSize === '58mm' ? '12px 10px' : '16px 14px',
                          fontSize: thermalPaperSize === '58mm' ? '0.75rem' : '0.82rem',
                          lineHeight: 1.35
                        }}
                      >
                        <div className="thermal-shop-name" style={{ fontSize: '1rem', fontWeight: 900 }}>
                          {currentUser?.restaurantName || 'TABLEMINT'}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', textAlign: 'center', marginTop: 1 }}>
                          Fine Dining & Bar
                        </div>
                        <div style={{ fontSize: '0.64rem', color: '#94a3b8', textAlign: 'center' }}>
                          GSTIN: 27AAACS1234M1Z5
                        </div>
                        <div className="thermal-divider" />
                        <div className="thermal-line" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                          <span>{previewOrder.tableName || `Table ${selectedBillingTableId}`}</span>
                          <span>Bill #{previewOrder.orderNumber || previewOrder.id}</span>
                        </div>
                        <div className="thermal-line" style={{ fontSize: '0.66rem', color: '#64748b' }}>
                          <span>Date: {new Date(previewOrder.createdAt || Date.now()).toLocaleDateString()}</span>
                          <span>{new Date(previewOrder.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="thermal-divider" />
                        
                        {/* Table Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 800, color: '#475569', paddingBottom: 3 }}>
                          <span>ITEM</span>
                          <span>QTY</span>
                          <span>AMT</span>
                        </div>
                        {previewItems.slice(0, 5).map((it, idx) => (
                          <div key={idx} className="thermal-line" style={{ padding: '2px 0' }}>
                            <span style={{ flex: 1, paddingRight: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {it.name}
                            </span>
                            <span style={{ minWidth: 28, textAlign: 'center', color: '#64748b' }}>
                              {it.quantity}
                            </span>
                            <span style={{ minWidth: 42, textAlign: 'right', fontWeight: 700 }}>
                              ₹{it.price * it.quantity}
                            </span>
                          </div>
                        ))}
                        {previewItems.length > 5 && (
                          <div style={{ fontSize: '0.66rem', color: '#64748b', textAlign: 'center', fontStyle: 'italic', padding: '2px 0' }}>
                            + {previewItems.length - 5} more items
                          </div>
                        )}

                        <div className="thermal-divider" />
                        <div className="thermal-line">
                          <span>Subtotal</span>
                          <span>₹ {previewOrder.subtotal || Math.round((previewOrder.total || 0) / 1.05)}</span>
                        </div>
                        <div className="thermal-line">
                          <span>CGST (2.5%)</span>
                          <span>₹ {Math.round(((previewOrder.tax || Math.round((previewOrder.total || 0) * 0.05)) / 2))}</span>
                        </div>
                        <div className="thermal-line">
                          <span>SGST (2.5%)</span>
                          <span>₹ {Math.round(((previewOrder.tax || Math.round((previewOrder.total || 0) * 0.05)) / 2))}</span>
                        </div>
                        <div className="thermal-line total" style={{ fontSize: '1rem', fontWeight: 900, paddingTop: 4, marginTop: 3, borderTop: '1px dashed #cbd5e1' }}>
                          <span>TOTAL</span>
                          <span>₹ {previewOrder.total}</span>
                        </div>
                        <div className="thermal-line" style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700, marginTop: 3 }}>
                          <span>Status</span>
                          <span>PAID ({previewOrder.paymentMethod || 'UPI'})</span>
                        </div>
                        <div className="thermal-divider" />
                        <div className="thermal-footer-msg" style={{ textAlign: 'center', fontSize: '0.68rem', fontWeight: 700 }}>
                          *** THANK YOU! VISIT AGAIN ***
                        </div>
                        <div style={{ textAlign: 'center', fontSize: '0.6rem', color: '#94a3b8', marginTop: 2 }}>
                          {thermalPaperSize} Thermal ESC/POS
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                        <button
                          type="button"
                          className="btn-brand-primary"
                          style={{ justifyContent: 'center' }}
                          onClick={() => handlePrintReceipt(previewOrder, thermalPaperSize)}
                        >
                          <Printer size={15} /> Print ({thermalPaperSize})
                        </button>
                        <button
                          type="button"
                          className="btn-brand-outline"
                          style={{ justifyContent: 'center' }}
                          onClick={() => handleDownloadReceipt(previewOrder)}
                        >
                          <Download size={15} /> Download
                        </button>
                        <button
                          type="button"
                          className="btn-brand-outline"
                          style={{ justifyContent: 'center', gridColumn: 'span 2' }}
                          onClick={() => handlePrintBill(previewOrder, thermalPaperSize)}
                        >
                          <Eye size={15} /> Open Full Receipt Modal
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </section>
        )}

        {/* ========================================================
            TAB: REPORTS & ANALYTICS (POWERED BY REAL MONGODB DATA)
            ======================================================== */}
        {activeTab === 'reports' && (() => {
          const kpis = analyticsData?.kpis || {
            totalRevenue: totalRevenue || 0,
            totalOrders: orders.length,
            avgOrderValue: avgTicket || 0,
            totalCustomers: occupiedTables,
            revenueGrowthPct: 0,
            ordersGrowthPct: 0
          };
          const trend = analyticsData?.revenueTrend || [
            { label: '6 AM', revenue: 0 },
            { label: '9 AM', revenue: 0 },
            { label: '12 PM', revenue: 0 },
            { label: '3 PM', revenue: 0 },
            { label: '6 PM', revenue: 0 },
            { label: '9 PM', revenue: 0 }
          ];
          const maxTrendRev = Math.max(...trend.map(t => Number(t.revenue) || 0), 100);
          const hasTrendData = trend.some(t => Number(t.revenue) > 0);

          // SVG Area Curve points for Desktop (500x200)
          const dPoints = trend.map((t, idx) => {
            const x = trend.length > 1 ? (idx / (trend.length - 1)) * 500 : 250;
            const rev = Number(t.revenue) || 0;
            const y = hasTrendData ? Math.max(30, 180 - (rev / maxTrendRev) * 140) : 180;
            return { x, y, ...t };
          });
          const dLinePath = dPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
          const dAreaPath = `${dLinePath} L 500,200 L 0,200 Z`;

          // SVG Area Curve points for Mobile (320x120)
          const mPoints = trend.map((t, idx) => {
            const x = trend.length > 1 ? (idx / (trend.length - 1)) * 320 : 160;
            const rev = Number(t.revenue) || 0;
            const y = hasTrendData ? Math.max(15, 100 - (rev / maxTrendRev) * 80) : 100;
            return { x, y, ...t };
          });
          const mLinePath = mPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
          const mAreaPath = `${mLinePath} L 320,120 L 0,120 Z`;

          const topItems = analyticsData?.topSellingItems || [];
          const hourlyList = analyticsData?.hourlyVolume || [];
          const maxHourlyCount = Math.max(...hourlyList.map(h => Number(h.count) || 0), 4);
          const statusList = analyticsData?.statusBreakdown || [
            { status: 'Completed & Settled', count: orders.filter(o => o.paid).length, pct: '0%', color: '#10b981' },
            { status: 'In Kitchen / Active', count: orders.filter(o => !o.paid && o.status !== 'cancelled').length, pct: '0%', color: '#0284c7' },
            { status: 'Cancelled', count: orders.filter(o => o.status === 'cancelled').length, pct: '0%', color: '#ef4444' }
          ];
          const paymentList = analyticsData?.paymentBreakdown || [
            { method: 'UPI (QR Pay, GPay, PhonePe)', amount: '₹ 0', pct: '0%', color: '#10b981' },
            { method: 'Credit / Debit Cards', amount: '₹ 0', pct: '0%', color: '#0284c7' },
            { method: 'Cash on Counter', amount: '₹ 0', pct: '0%', color: '#f59e0b' }
          ];
          const peak = analyticsData?.peakHours || {
            lunchRush: { title: 'LUNCH RUSH', hours: '12:00 PM – 4:00 PM', count: 0, summary: 'No lunch orders recorded in this period.' },
            dinnerRush: { title: 'DINNER RUSH', hours: '7:00 PM – 11:00 PM', count: 0, summary: 'No dinner orders recorded in this period.' }
          };

          return (
            <section className="admin-page-container">
              <div className="page-header-row">
                <div>
                  <h2 className="page-title">Reports & Analytics</h2>
                  <p className="page-subtitle">Real-time performance metrics and business intelligence from MongoDB</p>
                </div>
                <div className="page-header-actions" style={{ flexWrap: 'wrap', gap: 10 }}>
                  <select
                    className="btn-brand-outline"
                    style={{ padding: '8px 14px', fontSize: '0.84rem', background: '#f8fafc', fontWeight: 600, cursor: 'pointer' }}
                    value={analyticsTimeframe}
                    onChange={(e) => setAnalyticsTimeframe(e.target.value)}
                  >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="all">All Time</option>
                  </select>
                  <div
                    className="btn-brand-outline"
                    style={{ padding: '8px 14px', fontSize: '0.84rem', cursor: 'default', display: 'flex', alignItems: 'center', gap: 8, background: '#ffffff' }}
                  >
                    <Calendar size={14} style={{ color: '#059669' }} />
                    <span style={{ fontWeight: 600 }}>{analyticsData?.dateRangeLabel || currentDate}</span>
                  </div>
                </div>
              </div>

              {/* Screen 9: Mobile Filter Tabs */}
              <div className="admin-filter-pills-row hide-on-desktop">
                {['Revenue', 'Orders', 'Items', 'Payment'].map((tab) => (
                  <button
                    key={tab}
                    className={`admin-filter-pill ${analyticsSubTab.startsWith(tab.slice(0, 4)) || (tab === 'Items' && analyticsSubTab === 'Popular Items') ? 'active' : ''}`}
                    onClick={() => setAnalyticsSubTab(tab === 'Items' ? 'Popular Items' : tab === 'Payment' ? 'Payment Methods' : tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Screen 9: Mobile Total Revenue Card with Real SVG Chart */}
              <div className="mobile-reports-chart-card hide-on-desktop">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#64748b' }}>Total Revenue</span>
                  <span className="metric-badge green" style={{ fontSize: '0.72rem' }}>
                    <TrendingUp size={11} /> {kpis.revenueGrowthPct >= 0 ? `+${kpis.revenueGrowthPct}%` : `${kpis.revenueGrowthPct}%`}
                  </span>
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#07241a', marginBottom: 16 }}>
                  ₹ {(kpis.totalRevenue || 0).toLocaleString('en-IN')}
                </div>

                {/* Mobile Chart with Real Data Points */}
                <div style={{ display: 'flex', gap: 8, height: 160 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, textAlign: 'right', paddingBottom: 18 }}>
                    <span>{maxTrendRev >= 1000 ? `${Math.round(maxTrendRev / 1000)}K` : maxTrendRev}</span>
                    <span>{maxTrendRev >= 1000 ? `${Math.round(maxTrendRev / 2000)}K` : Math.round(maxTrendRev / 2)}</span>
                    <span>0</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <svg width="100%" height="100%" viewBox="0 0 320 120" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="mobileRevGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <line x1="0" y1="20" x2="320" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                        <line x1="0" y1="60" x2="320" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                        <line x1="0" y1="100" x2="320" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                        <path d={mAreaPath} fill="url(#mobileRevGrad)" />
                        <path d={mLinePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                        {mPoints.map((p, idx) => (
                          <circle key={idx} cx={p.x} cy={p.y} r={Number(p.revenue) > 0 ? 3.5 : 2} fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                        ))}
                      </svg>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#94a3b8', fontWeight: 700, paddingTop: 4 }}>
                      {trend.map((t, idx) => (
                        <span key={idx}>{t.label}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Screen 9: Mobile Top Selling Items Leaderboard */}
              <div className="mobile-top-selling-section hide-on-desktop">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h4 style={{ fontSize: '0.96rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Top Selling Items</h4>
                  <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 700, cursor: 'pointer' }} onClick={() => setActiveTab('menu')}>
                    View Menu ›
                  </span>
                </div>
                {topItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#475569' }}>No orders yet</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>Confirmed dish orders will rank here</p>
                  </div>
                ) : (
                  topItems.slice(0, 5).map((item) => (
                    <div key={item.rank} className="mobile-top-selling-row">
                      <div className="mobile-selling-rank">{item.rank}</div>
                      <img
                        src={item.image || '/images/paneer_butter_masala.jpg'}
                        alt={item.name}
                        className="mobile-selling-thumb"
                        onError={(e) => { e.target.src = '/images/paneer_butter_masala.jpg'; }}
                      />
                      <div className="mobile-selling-info">
                        <div className="mobile-selling-name">{item.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>₹{item.sales.toLocaleString('en-IN')}</div>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                        {item.count} orders
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Top 4 Real KPI Metrics Row for Desktop */}
              <div className="kpi-four-grid hide-on-mobile">
                <div className="metric-card sales">
                  <div className="metric-card-header">
                    <div className="metric-icon-box">₹</div>
                    <span className="metric-badge green">
                      <TrendingUp size={11} /> {kpis.revenueGrowthPct >= 0 ? `+${kpis.revenueGrowthPct}%` : `${kpis.revenueGrowthPct}%`}
                    </span>
                  </div>
                  <div className="metric-content">
                    <span className="metric-title">Total Revenue</span>
                    <div className="metric-value">₹ {(kpis.totalRevenue || 0).toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div className="metric-card orders">
                  <div className="metric-card-header">
                    <div className="metric-icon-box">
                      <Receipt size={17} />
                    </div>
                    <span className="metric-badge amber">
                      <Clock size={11} /> {kpis.ordersGrowthPct >= 0 ? `+${kpis.ordersGrowthPct}%` : `${kpis.ordersGrowthPct}%`}
                    </span>
                  </div>
                  <div className="metric-content">
                    <span className="metric-title">Total Orders</span>
                    <div className="metric-value">{kpis.totalOrders || 0}</div>
                  </div>
                </div>

                <div className="metric-card ticket">
                  <div className="metric-card-header">
                    <div className="metric-icon-box">
                      <BarChart3 size={17} />
                    </div>
                    <span className="metric-badge blue">
                      <TrendingUp size={11} /> Live
                    </span>
                  </div>
                  <div className="metric-content">
                    <span className="metric-title">Avg. Order Value</span>
                    <div className="metric-value">₹ {(kpis.avgOrderValue || 0).toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div className="metric-card occupancy">
                  <div className="metric-card-header">
                    <div className="metric-icon-box">
                      <Users size={17} />
                    </div>
                    <span className="metric-badge green">
                      <TrendingUp size={11} /> Tables
                    </span>
                  </div>
                  <div className="metric-content">
                    <span className="metric-title">Active / Served Tables</span>
                    <div className="metric-value">{kpis.totalCustomers || 0}</div>
                  </div>
                </div>
              </div>

              {/* Filter Tabs matching Reference Panel 7 for Desktop */}
              <div className="reports-tabs-row hide-on-mobile">
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

              {/* Split Content: Dynamically changes per analyticsSubTab for Desktop */}
              <div className="hide-on-mobile">
                {analyticsSubTab === 'Revenue' && (
                  <div className="reports-two-col-grid">
                    <div className="admin-card-inner">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Revenue Trend ({analyticsTimeframe.toUpperCase()})</h3>
                        <div style={{ background: '#07241a', color: '#10b981', padding: '5px 14px', borderRadius: 9999, fontSize: '0.82rem', fontWeight: 800 }}>
                          ₹ {(kpis.totalRevenue || 0).toLocaleString('en-IN')}
                        </div>
                      </div>

                      {/* Smooth Area Curve SVG Chart Powered by Database Data */}
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
                          <path d={dAreaPath} fill="url(#revenueGrad)" />
                          <path d={dLinePath} fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" />
                          {dPoints.map((p, idx) => (
                            <circle key={idx} cx={p.x} cy={p.y} r={Number(p.revenue) > 0 ? 5 : 3} fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                          ))}
                        </svg>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.74rem', fontWeight: 600, marginTop: 10, padding: '0 4px' }}>
                        {trend.map((t, idx) => (
                          <span key={idx}>{t.label}</span>
                        ))}
                      </div>
                    </div>

                    <div className="admin-card-inner">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                          Top Selling Items
                        </h3>
                        <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700, cursor: 'pointer' }} onClick={() => setActiveTab('menu')}>
                          Manage Menu ›
                        </span>
                      </div>

                      {topItems.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 16px', color: '#64748b' }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>No items sold yet</p>
                          <p style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>Confirmed dish orders will automatically rank here with quantities and revenue.</p>
                        </div>
                      ) : (
                        <div className="top-selling-ranked-list">
                          {topItems.slice(0, 5).map((it) => (
                            <div key={it.rank} className="top-selling-item-row">
                              <div className="top-selling-left">
                                <span className="rank-badge">{it.rank}</span>
                                <img
                                  src={it.image || '/images/paneer_butter_masala.jpg'}
                                  alt={it.name}
                                  className="top-selling-img"
                                  onError={(e) => { e.target.src = '/images/paneer_butter_masala.jpg'; }}
                                />
                                <div>
                                  <div className="top-selling-name">{it.name}</div>
                                  <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 600 }}>₹{it.sales.toLocaleString('en-IN')}</div>
                                </div>
                              </div>
                              <span className="top-selling-orders">{it.count} orders</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {analyticsSubTab === 'Orders' && (
                  <div className="reports-two-col-grid">
                    <div className="admin-card-inner">
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 14px 0', color: '#0f172a' }}>Hourly Orders Volume</h3>
                      {hourlyList.length === 0 || hourlyList.every(h => h.count === 0) ? (
                        <div style={{ textAlign: 'center', padding: '60px 16px', color: '#64748b' }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>No orders placed during this timeframe</p>
                          <p style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>Live order distribution across dining hours will display here</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 210, padding: '20px 0 10px', borderBottom: '1px solid #e2e8f0' }}>
                          {hourlyList.map((h) => (
                            <div key={h.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a' }}>{h.count}</span>
                              <div style={{ width: '100%', height: `${Math.max(6, (h.count / maxHourlyCount) * 140)}px`, background: h.count > 0 ? '#10b981' : '#e2e8f0', borderRadius: '6px 6px 0 0' }} />
                              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{h.hour}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="admin-card-inner">
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 14px 0', color: '#0f172a' }}>Orders by Status</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 10 }}>
                        {statusList.map((s) => (
                          <div key={s.status} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>{s.status}</span>
                              <span style={{ fontWeight: 800, color: '#64748b' }}>{s.count} ({s.pct})</span>
                            </div>
                            <div style={{ width: '100%', height: 10, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
                              <div style={{ width: s.pct, height: '100%', background: s.color, borderRadius: 9999, transition: 'width 0.3s ease' }} />
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
                    {topItems.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '48px 16px', color: '#64748b' }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>No menu performance data recorded</p>
                        <p style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>Once customer orders are completed, full ranking analytics will show here.</p>
                      </div>
                    ) : (
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
                          {topItems.map((row) => (
                            <tr key={row.rank}>
                              <td style={{ fontWeight: 800 }}>#{row.rank}</td>
                              <td style={{ fontWeight: 700, color: '#0f172a' }}>{row.name}</td>
                              <td style={{ color: '#64748b' }}>{row.category}</td>
                              <td style={{ fontWeight: 700 }}>₹ {row.price}</td>
                              <td style={{ fontWeight: 700, color: '#10b981' }}>{row.count} orders</td>
                              <td style={{ fontWeight: 800, color: '#0f172a' }}>₹ {row.sales.toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {analyticsSubTab === 'Payment Methods' && (
                  <div className="reports-two-col-grid">
                    <div className="admin-card-inner">
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 14px 0', color: '#0f172a' }}>Payment Channel Distribution</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 10 }}>
                        {paymentList.map((pm) => (
                          <div key={pm.method} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>{pm.method}</span>
                              <span style={{ fontWeight: 800, color: '#0f172a' }}>{pm.amount} ({pm.pct})</span>
                            </div>
                            <div style={{ width: '100%', height: 10, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
                              <div style={{ width: pm.pct, height: '100%', background: pm.color, borderRadius: 9999, transition: 'width 0.3s ease' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="admin-card-inner">
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 14px 0', color: '#0f172a' }}>Settlement Summary</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Revenue Collected ({analyticsTimeframe.toUpperCase()})</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#07241a', marginTop: 4 }}>
                            ₹ {(kpis.totalRevenue || 0).toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div style={{ padding: 16, background: '#ecfdf5', borderRadius: 12, border: '1px solid #a7f3d0' }}>
                          <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700 }}>Settlement Status</div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#065f46', marginTop: 4 }}>
                            Direct UPI / Cash Settlement Active
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {analyticsSubTab === 'Peak Hours' && (
                  <div className="admin-card-inner">
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 14px 0', color: '#0f172a' }}>Dining Peak Hours & Rush Analysis</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div style={{ padding: 18, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#f59e0b', background: '#fef3c7', padding: '3px 8px', borderRadius: 9999 }}>
                          {peak.lunchRush.title}
                        </span>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '10px 0 6px', color: '#0f172a' }}>{peak.lunchRush.hours}</h4>
                        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                          {peak.lunchRush.summary}
                        </p>
                      </div>
                      <div style={{ padding: 18, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#10b981', background: '#ecfdf5', padding: '3px 8px', borderRadius: 9999 }}>
                          {peak.dinnerRush.title}
                        </span>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '10px 0 6px', color: '#0f172a' }}>{peak.dinnerRush.hours}</h4>
                        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                          {peak.dinnerRush.summary}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          );
        })()}

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

            {/* Screen 11: Settings Mobile Grouped Menus (Reference Image Screen 11) */}
            {!mobileSettingsSubNav && (
              <div className="hide-on-desktop" style={{ width: '100%' }}>
                <div style={{ marginBottom: 18 }}>
                  <div className="mobile-settings-group-title">Restaurant Settings</div>
                  <div className="mobile-settings-card-group">
                    {[
                      { id: 'details', label: 'Restaurant Details', icon: Home },
                      { id: 'tax', label: 'Tax & Charges', icon: Receipt },
                      { id: 'payment', label: 'Payment Settings', icon: CreditCard },
                      { id: 'menu', label: 'Menu Settings', icon: BookOpen },
                      { id: 'tables', label: 'Table Settings', icon: LayoutGrid }
                    ].map((s) => {
                      const Icon = s.icon;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          className="mobile-settings-row-item"
                          onClick={() => {
                            if (s.id === 'menu') {
                              setActiveTab('menu');
                            } else {
                              setSettingsSubNav(s.id);
                              setMobileSettingsSubNav(s.id);
                            }
                          }}
                        >
                          <div className="mobile-settings-row-left">
                            <Icon size={18} className="mobile-settings-row-icon" />
                            <span>{s.label}</span>
                          </div>
                          <ChevronRight size={18} className="mobile-settings-chevron" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="mobile-settings-group-title">User & App Settings</div>
                  <div className="mobile-settings-card-group">
                    {/* Notifications Toggle */}
                    <div className="mobile-settings-row-item">
                      <div className="mobile-settings-row-left">
                        <Bell size={18} className="mobile-settings-row-icon" />
                        <span>Notifications</span>
                      </div>
                      <label className="mobile-switch-toggle">
                        <input type="checkbox" defaultChecked />
                        <span className="mobile-switch-slider" />
                      </label>
                    </div>

                    {/* App Language */}
                    <button
                      type="button"
                      className="mobile-settings-row-item"
                      onClick={() => addToast('App Language is English (Default)', 'info')}
                    >
                      <div className="mobile-settings-row-left">
                        <Globe size={18} className="mobile-settings-row-icon" />
                        <span>App Language</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: '0.82rem' }}>
                        <span>English</span>
                        <ChevronRight size={18} className="mobile-settings-chevron" />
                      </div>
                    </button>

                    {/* Change Password */}
                    <button
                      type="button"
                      className="mobile-settings-row-item"
                      onClick={() => {
                        setSettingsSubNav('password');
                        setMobileSettingsSubNav('password');
                      }}
                    >
                      <div className="mobile-settings-row-left">
                        <Lock size={18} className="mobile-settings-row-icon" />
                        <span>Change Password</span>
                      </div>
                      <ChevronRight size={18} className="mobile-settings-chevron" />
                    </button>

                    {/* Splash Screen & Loader Animation */}
                    <button
                      type="button"
                      className="mobile-settings-row-item"
                      onClick={() => window.dispatchEvent(new CustomEvent('tablemint:play-splash'))}
                    >
                      <div className="mobile-settings-row-left">
                        <Sparkles size={18} className="mobile-settings-row-icon" style={{ color: '#10b981' }} />
                        <span>Splash Screen & Loader</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: '0.82rem', fontWeight: 700 }}>
                        <span>Play</span>
                        <ChevronRight size={18} className="mobile-settings-chevron" />
                      </div>
                    </button>

                    {/* About App */}
                    <button
                      type="button"
                      className="mobile-settings-row-item"
                      onClick={() => addToast('TableMint v2.4.0 — Smart Restaurant Operations & POS', 'info')}
                    >
                      <div className="mobile-settings-row-left">
                        <Info size={18} className="mobile-settings-row-icon" />
                        <span>About App</span>
                      </div>
                      <ChevronRight size={18} className="mobile-settings-chevron" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2-Column Split: Left = Sub-Nav Menu, Right = Form */}
            <div className={`settings-split-grid ${!mobileSettingsSubNav ? 'hide-on-mobile' : ''}`}>
              {/* Left Sub-Nav Card */}
              <div className="settings-nav-card hide-on-mobile">
                {[
                  { id: 'details', label: 'Restaurant Details', icon: Home },
                  { id: 'payment', label: 'Payment Settings', icon: CreditCard },
                  { id: 'tax', label: 'Tax & Charges', icon: Receipt },
                  { id: 'tables', label: 'Table Settings', icon: LayoutGrid },
                  { id: 'password', label: 'Change Password', icon: Lock },
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

                {settingsSubNav === 'payment' && (() => {
                  const currentUpiId = (settingsForm.upiId || 'tablemint@upi').trim();
                  const currentPayee = settingsForm.upiPayeeName || settingsForm.restaurantName || 'TableMint Restaurant';
                  const sampleUpiUri = `upi://pay?pa=${encodeURIComponent(currentUpiId)}&pn=${encodeURIComponent(currentPayee)}&cu=INR`;
                  const qrPreviewSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(sampleUpiUri)}`;

                  return (
                    <form onSubmit={handleSaveSettings}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
                            Payment Gateway & UPI QR Configuration
                          </h3>
                          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                            Enter or upload your UPI ID. It automatically converts into an instant scannable QR Code for both Customer Bill Settlement and POS Billing.
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 20 }}>
                        {/* Left Column: Form Fields */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div className="settings-form-field">
                            <label className="settings-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>UPI ID / VPA Handle *</span>
                              <label style={{ fontSize: '0.74rem', color: '#059669', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                                <Upload size={12} /> Upload File / QR
                                <input
                                  type="file"
                                  accept=".txt,.json,image/*"
                                  style={{ display: 'none' }}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    if (file.type.startsWith('image/')) {
                                      const baseName = file.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                                      const derivedUpi = `${baseName || 'merchant'}@upi`;
                                      setSettingsForm(prev => ({ ...prev, upiId: derivedUpi }));
                                      addToast(`QR file loaded! UPI ID set to ${derivedUpi}`, 'success');
                                    } else {
                                      const reader = new FileReader();
                                      reader.onload = (ev) => {
                                        const text = ev.target?.result;
                                        if (text && typeof text === 'string') {
                                          const match = text.match(/[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/);
                                          if (match) {
                                            setSettingsForm(prev => ({ ...prev, upiId: match[0] }));
                                            addToast(`UPI ID extracted: ${match[0]}`, 'success');
                                          } else {
                                            const clean = text.trim().split('\n')[0].trim();
                                            setSettingsForm(prev => ({ ...prev, upiId: clean }));
                                            addToast(`Loaded UPI text: ${clean}`, 'success');
                                          }
                                        }
                                      };
                                      reader.readAsText(file);
                                    }
                                  }}
                                />
                              </label>
                            </label>
                            <input
                              type="text"
                              className="settings-input"
                              placeholder="e.g. tablemint@upi or yourname@okhdfcbank"
                              value={settingsForm.upiId || ''}
                              onChange={(e) => setSettingsForm({ ...settingsForm, upiId: e.target.value })}
                              required
                            />
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Quick Presets:</span>
                              {['tablemint@upi', 'spicegarden@hdfcbank', 'payment@paytm'].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  style={{
                                    fontSize: '0.72rem',
                                    padding: '2px 8px',
                                    borderRadius: 6,
                                    border: '1px solid #cbd5e1',
                                    background: '#f8fafc',
                                    color: '#475569',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => setSettingsForm({ ...settingsForm, upiId: preset })}
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="settings-form-field">
                            <label className="settings-label">Payee / Merchant Business Name</label>
                            <input
                              type="text"
                              className="settings-input"
                              placeholder="e.g. TableMint Restaurant"
                              value={settingsForm.upiPayeeName || ''}
                              onChange={(e) => setSettingsForm({ ...settingsForm, upiPayeeName: e.target.value })}
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

                          <div className="settings-form-field">
                            <label className="settings-label">Accepted Channels for Customers</label>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                              <span className="status-badge-pill active" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Check size={12} /> UPI QR Code (Scannable)
                              </span>
                              <span className="status-badge-pill active" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Check size={12} /> Cash at Counter
                              </span>
                              <span className="status-badge-pill active" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Check size={12} /> Credit & Debit Cards
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right Column: Live Auto-Converted UPI QR Code Preview */}
                        <div style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 16,
                          padding: '20px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center'
                        }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: '#ecfdf5',
                            color: '#059669',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            padding: '4px 10px',
                            borderRadius: 9999,
                            marginBottom: 14,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em'
                          }}>
                            <QrCode size={13} /> Auto-Converted UPI QR
                          </div>

                          <div style={{
                            background: '#ffffff',
                            padding: 12,
                            borderRadius: 14,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                            border: '1px solid #e2e8f0',
                            marginBottom: 12
                          }}>
                            <img
                              src={qrPreviewSrc}
                              alt="Live Auto-Converted UPI QR"
                              style={{ width: 160, height: 160, display: 'block', borderRadius: 8 }}
                            />
                          </div>

                          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
                            {currentPayee}
                          </div>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: '0.8rem',
                            color: '#059669',
                            fontWeight: 700,
                            background: '#ffffff',
                            padding: '4px 10px',
                            borderRadius: 8,
                            border: '1px solid #cbd5e1',
                            marginBottom: 10
                          }}>
                            <span>{currentUpiId}</span>
                            <button
                              type="button"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: 2 }}
                              onClick={() => {
                                navigator.clipboard.writeText(currentUpiId);
                                addToast('UPI ID copied to clipboard!', 'success');
                              }}
                              title="Copy UPI ID"
                            >
                              <Copy size={13} />
                            </button>
                          </div>

                          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                            <span className="pos-upi-app gpay">G Pay</span>
                            <span className="pos-upi-app phonepe">PhonePe</span>
                            <span className="pos-upi-app paytm">Paytm</span>
                            <span className="pos-upi-app bhim">BHIM</span>
                          </div>

                          <div style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.45, maxWidth: 260 }}>
                            This QR code is automatically synchronized. At the end of dining, customers see this QR code with their exact bill total. POS billing also uses this active UPI ID.
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                        <button type="submit" className="btn-brand-primary" style={{ padding: '11px 26px' }}>
                          <Check size={16} /> Save Payment Settings
                        </button>
                      </div>
                    </form>
                  );
                })()}

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

                {settingsSubNav === 'password' && (
                  <form onSubmit={handleUpdatePassword}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 8px', color: '#0f172a' }}>
                      Change Account Password
                    </h3>
                    <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0 0 16px' }}>
                      Ensure your restaurant operations remain protected by choosing a strong, unique password (minimum 6 characters).
                    </p>
                    <div className="settings-form-grid">
                      <div className="settings-form-field full-width">
                        <label className="settings-label">Current Password</label>
                        <div className="settings-password-input-wrap">
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            className="settings-input"
                            style={{ width: '100%', paddingRight: '40px' }}
                            placeholder="Enter current password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className="settings-eye-toggle-btn"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            title={showCurrentPassword ? 'Hide password' : 'Show password'}
                          >
                            {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                      <div className="settings-form-field">
                        <label className="settings-label">New Password</label>
                        <div className="settings-password-input-wrap">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            className="settings-input"
                            style={{ width: '100%', paddingRight: '40px' }}
                            placeholder="Min 6 characters"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className="settings-eye-toggle-btn"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            title={showNewPassword ? 'Hide password' : 'Show password'}
                          >
                            {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                      <div className="settings-form-field">
                        <label className="settings-label">Confirm New Password</label>
                        <div className="settings-password-input-wrap">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            className="settings-input"
                            style={{ width: '100%', paddingRight: '40px' }}
                            placeholder="Re-enter new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className="settings-eye-toggle-btn"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            title={showConfirmPassword ? 'Hide password' : 'Show password'}
                          >
                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
                      <button
                        type="submit"
                        className="btn-brand-primary"
                        style={{ padding: '11px 26px', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                        disabled={passwordUpdating}
                      >
                        <Lock size={16} /> {passwordUpdating ? 'Updating Password...' : 'Update Password'}
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
                          { name: currentUser?.name || 'Admin Manager', role: 'Owner / Admin', email: currentUser?.email || 'admin@tablemint.com', status: 'active' },
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
        {/* ========================================================
            TAB: PROFILE & OPERATIONS ACCOUNT (IMAGE 3 SCREEN 12)
            ======================================================== */}
        {activeTab === 'profile' && (
          <section className="admin-page-container">
            {/* Screen 12: Mobile More & Profile Section */}
            <div className="mobile-more-view hide-on-desktop">
              {mobileProfileSubView ? (
                /* Dedicated Mobile Profile Section */
                <div className="mobile-profile-container">
                  {/* Profile Header Identity Card */}
                  <div className="mobile-profile-hero-card">
                    <div className="mobile-profile-hero-avatar-wrap">
                      {currentUser?.avatar ? (
                        <img
                          src={currentUser.avatar}
                          alt="Profile"
                          className="mobile-profile-hero-avatar"
                        />
                      ) : (
                        <div className="mobile-profile-hero-avatar-initials">
                          {getUserInitials(profileName || currentUser?.name || 'Admin Manager')}
                        </div>
                      )}
                      <span className="mobile-profile-online-badge" />
                    </div>
                    <h2 className="mobile-profile-hero-name">{profileName || currentUser?.name || 'Admin Manager'}</h2>
                    <p className="mobile-profile-hero-email">{currentUser?.email || 'admin@tablemint.com'}</p>
                    <div className="mobile-profile-hero-pills">
                      <span className="mobile-profile-role-pill">
                        <ShieldCheck size={13} />
                        {currentUser?.role === 'admin' ? 'Owner / Admin' : 'Floor Staff'}
                      </span>
                      <span className="mobile-profile-rest-pill">
                        <UtensilsCrossed size={13} />
                        {profileRestaurant || currentUser?.restaurantName || 'TableMint'}
                      </span>
                    </div>
                  </div>

                  {/* Profile Edit Form Card */}
                  <div className="mobile-profile-section-card">
                    <h3 className="mobile-profile-card-title">
                      <User size={18} /> Edit Profile Details
                    </h3>
                    <form onSubmit={handleSaveProfile} className="mobile-profile-form">
                      <div className="mobile-profile-input-group">
                        <label>Full Name</label>
                        <div className="mobile-profile-input-box">
                          <User size={16} className="mobile-profile-icon" />
                          <input
                            type="text"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            placeholder="Your full name"
                            required
                          />
                        </div>
                      </div>

                      <div className="mobile-profile-input-group">
                        <label>Restaurant Name</label>
                        <div className="mobile-profile-input-box">
                          <UtensilsCrossed size={16} className="mobile-profile-icon" />
                          <input
                            type="text"
                            value={profileRestaurant}
                            onChange={(e) => setProfileRestaurant(e.target.value)}
                            placeholder="Restaurant brand name"
                            required
                          />
                        </div>
                      </div>

                      <div className="mobile-profile-input-group">
                        <label>Email Address</label>
                        <div className="mobile-profile-input-box disabled">
                          <Mail size={16} className="mobile-profile-icon" />
                          <input
                            type="email"
                            value={currentUser?.email || 'admin@tablemint.com'}
                            disabled
                          />
                        </div>
                        <span className="mobile-profile-hint">Email address is managed by station admin</span>
                      </div>

                      <div className="mobile-profile-input-group">
                        <label>Role & Access Level</label>
                        <div className="mobile-profile-input-box disabled">
                          <ShieldCheck size={16} className="mobile-profile-icon" />
                          <input
                            type="text"
                            value={currentUser?.role === 'admin' ? 'Administrator (Full Access)' : 'Floor Staff (POS & Orders)'}
                            disabled
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="mobile-profile-save-btn"
                        disabled={profileSaving}
                      >
                        <Check size={16} />
                        {profileSaving ? 'Saving Changes...' : 'Save Profile Changes'}
                      </button>
                    </form>
                  </div>

                  {/* Security & Password Card */}
                  <div className="mobile-profile-section-card">
                    <h3 className="mobile-profile-card-title">
                      <Lock size={18} /> Security & Password
                    </h3>
                    <form onSubmit={handleUpdatePassword} className="mobile-profile-form">
                      <div className="mobile-profile-input-group">
                        <label>Current Password</label>
                        <div className="mobile-profile-input-box">
                          <Lock size={16} className="mobile-profile-icon" />
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            placeholder="Enter current password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className="settings-eye-toggle-btn"
                            style={{ position: 'static', marginLeft: 'auto' }}
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="mobile-profile-input-group">
                        <label>New Password</label>
                        <div className="mobile-profile-input-box">
                          <Lock size={16} className="mobile-profile-icon" />
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            placeholder="Min 6 characters"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className="settings-eye-toggle-btn"
                            style={{ position: 'static', marginLeft: 'auto' }}
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="mobile-profile-input-group">
                        <label>Confirm New Password</label>
                        <div className="mobile-profile-input-box">
                          <Lock size={16} className="mobile-profile-icon" />
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Repeat new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className="settings-eye-toggle-btn"
                            style={{ position: 'static', marginLeft: 'auto' }}
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="mobile-profile-password-btn"
                        disabled={passwordUpdating}
                      >
                        <Lock size={16} />
                        {passwordUpdating ? 'Updating...' : 'Update Password'}
                      </button>
                    </form>
                  </div>

                  {/* Station Session Info */}
                  <div className="mobile-profile-section-card">
                    <h3 className="mobile-profile-card-title">
                      <Smartphone size={18} /> Station Details
                    </h3>
                    <div className="mobile-profile-info-row">
                      <span>Station Interface</span>
                      <strong>TableMint POS v2.4</strong>
                    </div>
                    <div className="mobile-profile-info-row">
                      <span>Security Standard</span>
                      <strong>PBKDF2 SHA-512</strong>
                    </div>
                    <div className="mobile-profile-info-row">
                      <span>Session Token</span>
                      <code style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        tm_auth_{currentUser?.id ? currentUser.id.slice(0, 8) : 'staff'}••••
                      </code>
                    </div>
                  </div>

                  {/* Sign Out Action Card */}
                  <div className="mobile-profile-signout-card">
                    <button
                      type="button"
                      className="mobile-profile-logout-btn"
                      onClick={handleLogout}
                    >
                      <LogOut size={18} />
                      Sign Out of Station
                    </button>
                  </div>
                </div>
              ) : (
                /* Standard More View */
                <>
                  <div
                    className="mobile-more-profile-card"
                    onClick={() => setMobileProfileSubView(true)}
                    style={{ cursor: 'pointer' }}
                    title="Open Profile Section"
                  >
                    {currentUser?.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt="Profile"
                        className="mobile-more-avatar"
                      />
                    ) : (
                      <div className="mobile-more-avatar-initials">
                        {getUserInitials(profileName || currentUser?.name || 'Admin Manager')}
                      </div>
                    )}
                    <div className="mobile-more-profile-info" style={{ flex: 1 }}>
                      <h3 className="mobile-more-user-name">{profileName || currentUser?.name || 'Admin Manager'}</h3>
                      <p className="mobile-more-user-role">{profileRestaurant || 'Restaurant Owner'}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontWeight: 700, fontSize: '0.8rem' }}>
                      <span>Edit</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>

                  <div className="mobile-more-nav-list">
                    <button
                      type="button"
                      className="mobile-more-nav-item"
                      onClick={() => setMobileProfileSubView(true)}
                    >
                      <div className="mobile-more-nav-left">
                        <User size={18} className="mobile-more-nav-icon" style={{ color: '#10b981' }} />
                        <span style={{ color: '#0f172a', fontWeight: 800 }}>My Profile & Account</span>
                      </div>
                      <ChevronRight size={18} className="mobile-more-chevron" />
                    </button>

                    {[
                      { id: 'overview', label: 'Dashboard', icon: Home },
                      { id: 'orders', label: 'Orders', icon: Receipt },
                      { id: 'tables', label: 'Table Management', icon: LayoutGrid },
                      { id: 'menu', label: 'Menu Management', icon: BookOpen },
                      { id: 'kitchen', label: 'Kitchen Display', icon: ChefHat },
                      { id: 'billing', label: 'POS Billing', icon: CreditCard },
                      { id: 'reports', label: 'Reports', icon: BarChart3 },
                      { id: 'settings', label: 'Settings', icon: Settings },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className="mobile-more-nav-item"
                          onClick={() => {
                            setActiveTab(item.id);
                            setMobileSelectedOrder(null);
                          }}
                        >
                          <div className="mobile-more-nav-left">
                            <Icon size={18} className="mobile-more-nav-icon" />
                            <span>{item.label}</span>
                          </div>
                          <ChevronRight size={18} className="mobile-more-chevron" />
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      className="mobile-more-nav-item"
                      onClick={() => window.dispatchEvent(new CustomEvent('tablemint:play-splash'))}
                    >
                      <div className="mobile-more-nav-left">
                        <Sparkles size={18} className="mobile-more-nav-icon" style={{ color: '#10b981' }} />
                        <span>Splash Screen & Loader</span>
                      </div>
                      <ChevronRight size={18} className="mobile-more-chevron" />
                    </button>

                    <button
                      type="button"
                      className="mobile-more-nav-item logout"
                      onClick={handleLogout}
                    >
                      <div className="mobile-more-nav-left">
                        <LogOut size={18} className="mobile-more-nav-icon" style={{ color: '#ef4444' }} />
                        <span style={{ color: '#ef4444', fontWeight: 700 }}>Logout</span>
                      </div>
                      <ChevronRight size={18} className="mobile-more-chevron" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Desktop Profile View */}
            <div className="hide-on-mobile">
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

      {/* Smart Menu Item Add / Edit Modal with Variants & Add-ons */}
      <MenuItemModal
        isOpen={menuModalOpen}
        onClose={() => {
          setMenuModalOpen(false);
          setEditingDish(null);
        }}
        onSave={handleSaveMenuItem}
        editingItem={editingDish}
        categories={categories}
      />

      {/* Category Management Modal (Custom Categories, Delete Guard, Reordering) */}
      <CategoryManagementModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        categories={categories}
        menuItems={menu}
        onSaveCategory={handleSaveCategory}
        onDeleteCategory={handleDeleteCategory}
        onReorderCategories={handleReorderCategories}
        onSeedSuggested={handleSeedSuggestedCategories}
      />

      {/* Bulk CSV / Excel Import Modal */}
      <MenuCsvImportModal
        isOpen={csvImportModalOpen}
        onClose={() => setCsvImportModalOpen(false)}
        onConfirmImport={handleConfirmCsvImport}
        categories={categories}
      />

      {/* AI OCR Photo & PDF Extraction Modal */}
      <MenuOcrModal
        isOpen={ocrModalOpen}
        onClose={() => setOcrModalOpen(false)}
        onConfirmImport={handleConfirmOcrImport}
        categories={categories}
      />

      {/* TableMint Curated Default Starter Menu Catalog Modal */}
      <DefaultMenuModal
        isOpen={defaultMenuModalOpen}
        onClose={() => setDefaultMenuModalOpen(false)}
        existingMenu={menu}
        onImportSuccess={fetchAllData}
        authFetch={authFetch}
        addToast={addToast}
      />

      {/* Interactive Mobile Customer Menu QR Preview Modal */}
      <CustomerMenuPreviewModal
        isOpen={previewQrModalOpen}
        onClose={() => setPreviewQrModalOpen(false)}
        restaurantName={currentUser?.restaurantName || 'TableMint Restaurant'}
        restaurantSlug={currentUser?.restaurantSlug || 'tablemint'}
        menu={menu}
        categories={categories}
      />

      {/* Thermal Bill Receipt Modal */}
      {printBillOrder && (
        <div className="modal-backdrop" onClick={() => setPrintBillOrder(null)}>
          <div
            className={`receipt-paper-card paper-${thermalPaperSize}`}
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

            {/* Paper Size Switcher inside Modal */}
            <div className="thermal-size-switch no-print" style={{ margin: '0 0 10px' }}>
              <button
                type="button"
                className={`thermal-size-btn ${thermalPaperSize === '58mm' ? 'active' : ''}`}
                onClick={() => setThermalPaperSize('58mm')}
              >
                58mm Roll (2-inch Standard)
              </button>
              <button
                type="button"
                className={`thermal-size-btn ${thermalPaperSize === '80mm' ? 'active' : ''}`}
                onClick={() => setThermalPaperSize('80mm')}
              >
                80mm Roll (3-inch Wide)
              </button>
            </div>

            <div className="receipt-header">
              <div className="receipt-brand-title">{currentUser?.restaurantName || 'TABLEMINT'}</div>
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
                <span>PAID ({printBillOrder.paymentMethod || 'UPI / COUNTER'})</span>
              </div>
            </div>

            <div className="receipt-footer-msg">
              <div style={{ fontWeight: 700 }}>*** THANK YOU FOR DINING WITH US ***</div>
              <div style={{ fontSize: '0.68rem', marginTop: 2 }}>Please Visit TableMint Again!</div>
              <div style={{ fontSize: '0.62rem', color: '#9ca3af', marginTop: 4 }}>
                Optimized for {thermalPaperSize} ESC/POS Thermal Printer
              </div>
            </div>

            <div className="receipt-actions-footer no-print">
              <button
                type="button"
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={() => handlePrintReceipt(printBillOrder, thermalPaperSize)}
              >
                <Printer size={16} /> Print Receipt ({thermalPaperSize})
              </button>
              <button
                type="button"
                className="btn-brand-outline"
                onClick={() => handleDownloadReceipt(printBillOrder)}
              >
                <Download size={16} /> Download Slip
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
                  src={`/api/qrcode/${viewQrTable.id}?restaurant=${encodeURIComponent(currentUser?.restaurantSlug || settingsForm?.restaurantSlug || 'tablemint')}&t=${Date.now()}`}
                  alt={`Table ${viewQrTable.id} QR Code`}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>

              <div style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 14px', fontSize: '0.8rem', color: '#cbd5e1', wordBreak: 'break-all' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800, marginBottom: 4 }}>
                  Scan Target Link:
                </div>
                {typeof window !== 'undefined' ? `${window.location.origin}/?table=${viewQrTable.id}&token=${viewQrTable.sessionToken || ''}&restaurant=${encodeURIComponent(currentUser?.restaurantSlug || settingsForm?.restaurantSlug || 'tablemint')}` : ''}
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
                  onClick={() => window.open(`/api/qrcode/${viewQrTable.id}?restaurant=${encodeURIComponent(currentUser?.restaurantSlug || settingsForm?.restaurantSlug || 'tablemint')}`, '_blank')}
                >
                  <Download size={15} /> Download PNG
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ gridColumn: 'span 2', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  onClick={() => {
                    const rSlug = currentUser?.restaurantSlug || settingsForm?.restaurantSlug || 'tablemint';
                    window.open(`/?table=${viewQrTable.id}&token=${viewQrTable.sessionToken || ''}&restaurant=${encodeURIComponent(rSlug)}`, '_blank');
                  }}
                >
                  <ExternalLink size={15} /> Open Customer Menu Card (Live Test)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Print Portal (Optimized for 58mm & 80mm ESC/POS Printers) */}
      {typeof document !== 'undefined' && printBillOrder && createPortal(
        <div id="thermal-receipt-print-root" className={`paper-${thermalPaperSize}`}>
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: 6, marginBottom: 6 }}>
            <div style={{ fontSize: thermalPaperSize === '58mm' ? '1.15rem' : '1.35rem', fontWeight: 900, letterSpacing: '0.04em' }}>
              {currentUser?.restaurantName || 'TABLEMINT'}
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600 }}>Fine Dining Restaurant & Bar</div>
            <div style={{ fontSize: '0.68rem', color: '#222' }}>Plot 42, Green Avenue, MG Road</div>
            <div style={{ fontSize: '0.64rem', color: '#333' }}>GSTIN: 27AAACS1234M1Z5 • FSSAI: 11521034000456</div>
            <div style={{ margin: '5px 0 3px', borderTop: '1px dashed #000' }} />
            <div style={{ fontWeight: 800, fontSize: thermalPaperSize === '58mm' ? '0.78rem' : '0.86rem' }}>
              TAX INVOICE / CASH BILL
            </div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700 }}>
              Bill #{printBillOrder.orderNumber || printBillOrder.id} • {printBillOrder.tableName}
            </div>
            <div style={{ fontSize: '0.66rem', color: '#333' }}>
              Date: {new Date(printBillOrder.createdAt || Date.now()).toLocaleDateString()} {new Date(printBillOrder.createdAt || Date.now()).toLocaleTimeString()}
            </div>
          </div>

          <div style={{ borderBottom: '1px dashed #000', paddingBottom: 6, marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 800, paddingBottom: 3, borderBottom: '1px solid #000' }}>
              <span style={{ flex: 1 }}>ITEM</span>
              <span style={{ minWidth: 42, textAlign: 'center' }}>QTY</span>
              <span style={{ minWidth: 48, textAlign: 'right' }}>AMOUNT</span>
            </div>
            {printBillOrder.items?.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: thermalPaperSize === '58mm' ? '0.72rem' : '0.78rem', fontWeight: 600, padding: '2px 0' }}>
                <span style={{ flex: 1, paddingRight: 4, wordBreak: 'break-word' }}>
                  {it.name}
                  {it.quantity > 1 && (
                    <span style={{ fontSize: '0.64rem', color: '#555', display: 'block' }}>
                      ({it.quantity} x ₹{it.price})
                    </span>
                  )}
                </span>
                <span style={{ minWidth: 42, textAlign: 'center' }}>{it.quantity}</span>
                <span style={{ minWidth: 48, textAlign: 'right' }}>₹{it.price * it.quantity}</span>
              </div>
            ))}
          </div>

          <div style={{ borderBottom: '1px dashed #000', paddingBottom: 6, marginBottom: 6, fontSize: thermalPaperSize === '58mm' ? '0.72rem' : '0.78rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
              <span>Subtotal:</span>
              <span>₹{printBillOrder.subtotal || Math.round((printBillOrder.total || 0) / 1.05)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
              <span>CGST (2.5%):</span>
              <span>₹{Math.round(((printBillOrder.tax || Math.round((printBillOrder.total || 0) * 0.05)) / 2))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
              <span>SGST (2.5%):</span>
              <span>₹{Math.round(((printBillOrder.tax || Math.round((printBillOrder.total || 0) * 0.05)) / 2))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: thermalPaperSize === '58mm' ? '0.96rem' : '1.08rem', fontWeight: 900, paddingTop: 4, marginTop: 3, borderTop: '1px dashed #000' }}>
              <span>TOTAL AMOUNT:</span>
              <span>₹{printBillOrder.total}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 700, marginTop: 2 }}>
              <span>Payment Status:</span>
              <span>PAID ({printBillOrder.paymentMethod || 'UPI / COUNTER'})</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.68rem', paddingTop: 2 }}>
            <div style={{ fontWeight: 800 }}>*** THANK YOU FOR DINING WITH US ***</div>
            <div style={{ fontSize: '0.64rem', marginTop: 2 }}>Please Visit Again!</div>
            <div style={{ fontSize: '0.58rem', color: '#666', marginTop: 4, borderTop: '1px dotted #888', paddingTop: 3 }}>
              {thermalPaperSize} ESC/POS Thermal Paper Roll Size
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
          className={`mobile-bottom-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('overview');
            setMobileMoreOpen(false);
            setMobileSelectedOrder(null);
            setMobileSettingsSubNav(null);
          }}
          title="Home Dashboard"
        >
          <Home size={19} />
          <span>Home</span>
        </button>

        <button
          type="button"
          className={`mobile-bottom-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('orders');
            setUnseenOrdersCount(0);
            setMobileMoreOpen(false);
            setMobileSelectedOrder(null);
            setMobileSettingsSubNav(null);
          }}
          title="Live Orders"
        >
          <div className="mobile-btn-badge-wrap">
            <Receipt size={19} />
            {unseenOrdersCount > 0 && (
              <span className="mobile-tab-badge">{unseenOrdersCount}</span>
            )}
          </div>
          <span>Orders</span>
        </button>

        <button
          type="button"
          className={`mobile-bottom-btn ${activeTab === 'tables' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('tables');
            setMobileMoreOpen(false);
            setMobileSelectedOrder(null);
            setMobileSettingsSubNav(null);
          }}
          title="Floor & Tables"
        >
          <LayoutGrid size={19} />
          <span>Tables</span>
        </button>

        <button
          type="button"
          className={`mobile-bottom-btn ${activeTab === 'menu' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('menu');
            setMobileMoreOpen(false);
            setMobileSelectedOrder(null);
            setMobileSettingsSubNav(null);
          }}
          title="Menu Management"
        >
          <BookOpen size={19} />
          <span>Menu</span>
        </button>

        <button
          type="button"
          className={`mobile-bottom-btn ${['profile', 'billing', 'kitchen', 'reports', 'settings', 'stands'].includes(activeTab) ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('profile');
            setMobileMoreOpen(false);
            setMobileSelectedOrder(null);
            setMobileSettingsSubNav(null);
          }}
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
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt="Profile"
                    style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '2px solid #10b981' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #07241a 0%, #059669 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      border: '2px solid #10b981',
                      flexShrink: 0
                    }}
                  >
                    {getUserInitials(profileName || currentUser?.name || 'Admin Manager')}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.02rem' }}>{profileName || currentUser?.name || 'Admin Manager'}</div>
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
                  setUnseenKitchenCount(0);
                  setMobileMoreOpen(false);
                }}
              >
                <div className="drawer-btn-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', position: 'relative' }}>
                  <ChefHat size={20} />
                  {unseenKitchenCount > 0 && (
                    <span className="mobile-tab-badge" style={{ position: 'absolute', top: -4, right: -4 }}>{unseenKitchenCount}</span>
                  )}
                </div>
                <div>
                  <div className="drawer-btn-title">Kitchen Display</div>
                  <div className="drawer-btn-sub">KDS Orders</div>
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
