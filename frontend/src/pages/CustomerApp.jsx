import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  UtensilsCrossed,
  Bell,
  Search,
  Plus,
  Minus,
  ShoppingCart,
  Clock,
  Sparkles,
  Camera,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Receipt,
  Users,
  X,
  AlertTriangle,
  RotateCcw,
  Heart,
  Globe,
  Flame,
  Check,
  Trash2,
  PhoneCall,
  ChefHat,
  Utensils,
  Share2,
  LayoutGrid,
  Soup,
  CookingPot,
  CupSoda,
  ClipboardList,
  UserRound,
  Droplets,
  Leaf,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { socket } from '../utils/socket';
import { soundManager } from '../utils/sound';
import { useToast } from '../components/Toast';
import { TableMintLogoIcon } from '../components/TableMintLogoIcon';
import '../styles/customer.css';

const CATEGORIES = [
  { id: 'all', label: 'All', bg: '#ecfdf5', color: '#059669' },
  { id: 'starters', label: 'Starters', bg: '#fff7ed', color: '#ea580c' },
  { id: 'main-course', label: 'Main Course', bg: '#fef3c7', color: '#d97706' },
  { id: 'beverages', label: 'Beverages', bg: '#ffe4e6', color: '#e11d48' }
];

const ADDON_OPTIONS = [
  { id: 'chutney', label: 'Extra Chutney', price: 20 },
  { id: 'paneer', label: 'Extra Paneer', price: 40 },
  { id: 'cheese', label: 'Cheese Topping', price: 30 }
];

export default function CustomerApp({ initialTable = null, initialToken = null }) {
  const { addToast } = useToast();

  // Navigation & Table Session
  const [tableId, setTableId] = useState(() => {
    if (initialTable) return initialTable;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tbl = params.get('table');
      if (tbl) {
        const parsed = parseInt(tbl, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
    return 1;
  });

  const [tableToken, setTableToken] = useState(() => {
    if (initialToken) return initialToken;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tok = params.get('token');
      if (tok) return tok;
      const tbl = params.get('table') || 1;
      return sessionStorage.getItem(`spice_token_${tbl}`) || '';
    }
    return '';
  });

  const [sessionExpired, setSessionExpired] = useState(false);
  const [expiredReason, setExpiredReason] = useState('');

  // Welcome Screen state (Screen 1 in reference)
  const [showWelcome, setShowWelcome] = useState(() => {
    return sessionStorage.getItem('tm_welcome_dismissed') !== 'true';
  });

  // UI Flow & Active Bottom Tab ('menu' | 'cart' | 'orders' | 'waiter')
  const [activeBottomNav, setActiveBottomNav] = useState('menu');

  // Favorites state
  const [favorites, setFavorites] = useState(() => new Set());
  const [selectedLanguage, setSelectedLanguage] = useState('English');

  // Data & Filters
  const [menu, setMenu] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);

  // Cart & Orders
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('gpay');

  // Modals & Screens
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [serviceNote, setServiceNote] = useState('');

  // Dish Customization Modal (Screen 3 in reference)
  const [customizingDish, setCustomizingDish] = useState(null);
  const [spiceLevel, setSpiceLevel] = useState('Medium'); // 'Mild' | 'Medium' | 'Spicy'
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [modalQuantity, setModalQuantity] = useState(1);

  // Camera Scanner
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Check URL parameters and unlock table immediately
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tbl = params.get('table');
    const tok = params.get('token');
    const effectiveTable = initialTable || (tbl ? parseInt(tbl, 10) : tableId) || 1;
    unlockTable(effectiveTable, tok || initialToken);
  }, []);

  // Lock background scroll on mobile when modals or cart drawer are open
  useEffect(() => {
    if (isCartOpen || serviceModalOpen || trackingModalOpen || Boolean(customizingDish)) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isCartOpen, serviceModalOpen, trackingModalOpen, customizingDish]);

  // Fetch Menu
  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      setLoadingMenu(true);
      const res = await fetch('/api/menu');
      if (res.ok) {
        const data = await res.json();
        setMenu(data);
      }
    } catch (e) {
      addToast('Error loading menu', 'error');
    } finally {
      setLoadingMenu(false);
    }
  };

  // Socket setup for table updates
  useEffect(() => {
    if (!tableId) return;

    socket.emit('join-table', { tableId });

    const handleStatusChanged = (order) => {
      if (order.tableId === tableId || order.tableNumber === tableId) {
        setActiveOrder(order);
        if (order.status === 'ready') {
          soundManager.playOrderReady();
          addToast('Your order is ready to serve! Enjoy your meal.', 'success', 6000);
        } else {
          addToast(`Order update: Status is now ${order.status.toUpperCase()}`, 'info');
        }
      }
    };

    const handleMenuUpdated = (newMenu) => {
      setMenu(newMenu);
    };

    const handleSessionExpired = (data) => {
      if (data.tableId === tableId) {
        setSessionExpired(true);
        setExpiredReason(data.message || 'Table dining session completed by staff.');
        setTableToken('');
        setCart([]);
        sessionStorage.removeItem(`spice_token_${tableId}`);
        soundManager.playClick();
      }
    };

    socket.on('order:status_changed', handleStatusChanged);
    socket.on('menu:updated', handleMenuUpdated);
    socket.on('table:session_expired', handleSessionExpired);
    socket.on('table:vacated', handleSessionExpired);

    return () => {
      socket.off('order:status_changed', handleStatusChanged);
      socket.off('menu:updated', handleMenuUpdated);
      socket.off('table:session_expired', handleSessionExpired);
      socket.off('table:vacated', handleSessionExpired);
    };
  }, [tableId]);

  // Unlock table and verify token
  const unlockTable = async (tId, token = null) => {
    setTableId(tId);
    setSessionExpired(false);
    stopCamera();

    const storedToken = token || sessionStorage.getItem(`spice_token_${tId}`) || '';
    setTableToken(storedToken);

    try {
      const res = await fetch(`/api/tables/${tId}/verify-token?token=${encodeURIComponent(storedToken)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.valid === false) {
          setSessionExpired(true);
          setExpiredReason(data.message || 'Session expired. Please scan current QR stand.');
          setTableToken('');
          sessionStorage.removeItem(`spice_token_${tId}`);
          return;
        }
        if (data && data.activeToken) {
          setTableToken(data.activeToken);
          sessionStorage.setItem(`spice_token_${tId}`, data.activeToken);
        }
      }
    } catch (err) {
      console.warn('Verify token fallback');
    }

    fetchTableActiveOrder(tId);
    soundManager.playClick();
  };

  const fetchTableActiveOrder = async (tId) => {
    try {
      const res = await fetch(`/api/orders/table/${tId}`);
      if (res.ok) {
        const orders = await res.json();
        const active = orders.find((o) => o.status !== 'completed' && o.status !== 'cancelled');
        if (active) {
          setActiveOrder(active);
        }
      }
    } catch (e) {}
  };

  // Camera functions
  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        addToast('Camera not supported. Please select table below.', 'warning');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      addToast('Point camera at Table QR stand', 'info');
    } catch (err) {
      addToast('Camera permission denied. Use quick picker below.', 'warning');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Toggle Favorite Heart
  const toggleFavorite = (dishId, e) => {
    if (e) e.stopPropagation();
    soundManager.playClick();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(dishId)) {
        next.delete(dishId);
      } else {
        next.add(dishId);
        addToast('Added to your favorites ❤️', 'success', 2000);
      }
      return next;
    });
  };

  // Open Customization Modal
  const openCustomization = (dish) => {
    soundManager.playClick();
    setCustomizingDish(dish);
    setSpiceLevel('Medium');
    setSelectedAddons([]);
    setSpecialInstructions('');
    setModalQuantity(1);
  };

  // Add Customized Dish to Cart
  const handleAddCustomizedToCart = () => {
    if (!customizingDish) return;
    soundManager.playClick();

    const addonsCost = selectedAddons.reduce((sum, a) => sum + a.price, 0);
    const unitPrice = customizingDish.price + addonsCost;
    const notesSummary = [
      `Spice: ${spiceLevel}`,
      selectedAddons.length ? `Add-ons: ${selectedAddons.map((a) => a.label).join(', ')}` : '',
      specialInstructions.trim() ? `Note: ${specialInstructions.trim()}` : ''
    ].filter(Boolean).join(' | ');

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.id === customizingDish.id && item.notes === notesSummary
      );
      if (existingIdx > -1) {
        return prev.map((item, idx) =>
          idx === existingIdx ? { ...item, quantity: item.quantity + modalQuantity } : item
        );
      }
      return [
        ...prev,
        {
          id: customizingDish.id,
          name: customizingDish.name,
          price: unitPrice,
          basePrice: customizingDish.price,
          isVeg: customizingDish.isVeg,
          image: customizingDish.image,
          quantity: modalQuantity,
          notes: notesSummary
        }
      ];
    });

    addToast(`Added ${customizingDish.name} to cart`, 'success', 2500);
    setCustomizingDish(null);
  };

  // Direct quick add for cards
  const quickAddToCart = (dish, e) => {
    if (e) e.stopPropagation();
    soundManager.playClick();
    setCart((prev) => {
      const existing = prev.find((item) => item.id === dish.id && !item.notes);
      if (existing) {
        return prev.map((item) =>
          item.id === dish.id && !item.notes
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          id: dish.id,
          name: dish.name,
          price: dish.price,
          isVeg: dish.isVeg,
          image: dish.image,
          quantity: 1,
          notes: ''
        }
      ];
    });
    addToast(`Added ${dish.name} to cart`, 'success', 2000);
  };

  const updateQuantity = (dishId, delta, notes = '') => {
    soundManager.playClick();
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === dishId && item.notes === notes) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const clearCart = () => {
    soundManager.playClick();
    setCart([]);
    addToast('Cart cleared', 'info');
  };

  const getItemCount = (dishId) => {
    return cart
      .filter((item) => item.id === dishId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const gstAmount = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + gstAmount;

  // Place Order
  const handlePlaceOrder = async () => {
    if (!cart.length || !tableId) return;

    setSubmittingOrder(true);
    try {
      const orderPayload = {
        tableId: tableId,
        tableNumber: tableId,
        tableName: `Table ${tableId}`,
        token: tableToken,
        sessionToken: tableToken,
        customerName: customerName.trim() || `Guest (Table ${tableId})`,
        items: cart.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          notes: item.notes || ''
        })),
        notes: orderNotes.trim(),
        subtotal: subtotal,
        tax: gstAmount,
        total: grandTotal
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      const data = await res.json();
      if (res.ok && (data.success || data.order || data.id || data.orderNumber)) {
        const placedOrder = data.order || data;
        setActiveOrder(placedOrder);
        setCart([]);
        setIsCartOpen(false);
        soundManager.playNewOrderChime();

        confetti({
          particleCount: 120,
          spread: 75,
          origin: { y: 0.6 }
        });

        addToast(`Order #${placedOrder.orderNumber || placedOrder.id} confirmed!`, 'success', 5000);
        setTrackingModalOpen(false);
        setActiveBottomNav('orders');
      } else {
        if (res.status === 403 || data.error === 'TOKEN_EXPIRED') {
          setSessionExpired(true);
          setExpiredReason(data.message || 'Dining session has ended. Please scan current table QR stand.');
          setTableToken('');
          sessionStorage.removeItem(`spice_token_${tableId}`);
        }
        addToast(data.message || data.error || 'Failed to place order', 'error');
      }
    } catch (err) {
      addToast('Network error while placing order', 'error');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Waiter & Service Calls
  const handleServiceCall = async (type = 'waiter', customNote = '') => {
    setServiceModalOpen(false);
    try {
      const typeLabel =
        type === 'waiter' ? 'Call Waiter' :
        type === 'water' ? 'Drinking Water' :
        type === 'tissue' ? 'Cutlery & Napkins' :
        type === 'bill' ? 'Request Bill' : type;

      const res = await fetch('/api/service-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: tableId,
          tableName: `Table ${tableId}`,
          token: tableToken,
          type: typeLabel,
          note: customNote || (typeof type === 'string' && !['waiter', 'water', 'tissue', 'bill'].includes(type) ? type : '')
        })
      });

      if (res.ok) {
        soundManager.playServiceBell();
        addToast(`Staff alerted for Table ${tableId}! Someone is on the way.`, 'success', 4000);
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 403 || data.error === 'TOKEN_EXPIRED') {
          setSessionExpired(true);
          setExpiredReason(data.message || 'Dining session has ended. Please scan current table QR stand.');
          setTableToken('');
          sessionStorage.removeItem(`spice_token_${tableId}`);
        }
        addToast(data.message || 'Failed to alert staff', 'error');
      }
    } catch (e) {
      addToast('Failed to alert staff', 'error');
    }
  };

  // Filter Dishes by Category, Veg only, Search
  const matchesCategory = (dishCat, selectedCat) => {
    if (selectedCat === 'all') return true;
    if (dishCat === selectedCat) return true;
    if (selectedCat === 'starters' && (dishCat === 'starters' || dishCat === 'snacks' || dishCat === 'soup')) return true;
    if (selectedCat === 'main-course' && (dishCat === 'main-course' || dishCat === 'north-indian' || dishCat === 'tandoori')) return true;
    if (selectedCat === 'beverages' && (dishCat === 'beverages' || dishCat === 'juice' || dishCat === 'milkshake')) return true;
    if (selectedCat === 'desserts' && (dishCat === 'desserts' || dishCat === 'ice-cream')) return true;
    if (selectedCat === 'chinese' && dishCat === 'chinese') return true;
    return false;
  };

  const filteredDishes = menu.filter((dish) => {
    if (!matchesCategory(dish.category, category)) return false;
    if (vegOnly && !dish.isVeg) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = dish.name.toLowerCase().includes(q);
      const matchDesc = (dish.description || '').toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    return true;
  });

  // =========================================================
  // VIEW: SESSION EXPIRED
  // =========================================================
  if (sessionExpired) {
    return (
      <div className="customer-app-wrapper">
        <div className="session-expired-card">
          <div className="session-expired-icon">
            <AlertTriangle size={36} />
          </div>
          <h2>Session Completed</h2>
          <p>{expiredReason || 'Dining session for this table has concluded.'}</p>
          <button
            className="btn-primary"
            onClick={() => {
              setSessionExpired(false);
              unlockTable(tableId || 1);
            }}
          >
            <RotateCcw size={16} /> Reconnect Table {tableId}
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // SCREEN 1: WELCOME SCREEN (IMAGE 2 SCREEN 1)
  // =========================================================
  if (showWelcome) {
    return (
      <div className="customer-app-wrapper welcome-screen-bg">
        <div className="welcome-screen-container">
          {/* Top Brand Header */}
          <div className="welcome-top-bar">
            <div className="welcome-brand-badge">
              <TableMintLogoIcon size={24} />
              <span className="welcome-brand-text">TableMint</span>
            </div>
            <div className="welcome-table-badge">
              <UtensilsCrossed size={13} /> Table {tableId}
            </div>
          </div>

          {/* Luxury Hero Food Image */}
          <div className="welcome-hero-image-wrap">
            <img src="/images/welcome_hero.jpg" alt="Good Food Great Moments" className="welcome-hero-img" />
            <div className="welcome-hero-glow" />
          </div>

          {/* Welcome Text Content */}
          <div className="welcome-content-card">
            <h1 className="welcome-headline">Good Food<br />Great Moments</h1>
            <p className="welcome-subtext">
              Explore our menu and place your order right from your table.
            </p>

            {/* 3 Refined Feature Pills with Circular Line Icons */}
            <div className="welcome-features-list">
              <div className="welcome-feature-item">
                <div className="welcome-feature-icon-circle">
                  <Leaf size={15} />
                </div>
                <span className="welcome-feature-text">Fresh Ingredients</span>
              </div>
              <div className="welcome-feature-item">
                <div className="welcome-feature-icon-circle">
                  <ShieldCheck size={15} />
                </div>
                <span className="welcome-feature-text">Hygienic Kitchen</span>
              </div>
              <div className="welcome-feature-item">
                <div className="welcome-feature-icon-circle">
                  <Smartphone size={15} />
                </div>
                <span className="welcome-feature-text">Contactless Ordering</span>
              </div>
            </div>

            {/* Action Button */}
            <button
              className="welcome-view-menu-btn"
              onClick={() => {
                soundManager.playClick();
                setShowWelcome(false);
                sessionStorage.setItem('tm_welcome_dismissed', 'true');
              }}
            >
              <span>View Menu</span>
              <ArrowRight size={18} />
            </button>

            {/* Language Selector */}
            <div className="welcome-languages-row">
              <Globe size={13} style={{ marginRight: 4, verticalAlign: 'middle', opacity: 0.7 }} />
              {['English', 'हिंदी', 'मराठी'].map((lang) => (
                <button
                  key={lang}
                  type="button"
                  className={`welcome-lang-btn ${selectedLanguage === lang ? 'active' : ''}`}
                  onClick={() => setSelectedLanguage(lang)}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-app-wrapper">
      {/* =========================================================
          VIEW 1: MAIN MENU & CATEGORIES (SCREEN 2 IN REFERENCE)
          ========================================================= */}
      {activeBottomNav === 'menu' && (
        <div className="customer-page-view menu-page-view">
          {/* Sticky Mobile Header (Matching Exact Reference Screen 2) */}
          <header className="mobile-menu-header">
            <div className="menu-header-row">
              <div className="menu-brand-wrap" onClick={() => setShowWelcome(true)} style={{ cursor: 'pointer' }}>
                <TableMintLogoIcon size={24} />
                <span className="header-brand-title">Table<span style={{ color: '#34d399' }}>Mint</span></span>
              </div>
              <div className="header-table-pill">
                <UtensilsCrossed size={13} /> <span>Table {tableId}</span>
              </div>
            </div>

            {/* Search Bar Input */}
            <div className="menu-search-box">
              <Search size={16} className="menu-search-icon" />
              <input
                type="text"
                className="menu-search-input"
                placeholder="Search for dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                  <X size={14} />
                </button>
              )}
            </div>
          </header>

          {/* Categories Horizontal Carousel (Matching Reference Screen 2) */}
          <div className="categories-carousel-row">
            {CATEGORIES.map((cat) => {
              const isActive = category === cat.id;
              const iconColor = isActive ? '#ffffff' : cat.color;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`category-item-card ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    soundManager.playClick();
                    setCategory(cat.id);
                  }}
                >
                  <div className="category-icon-box" style={{ background: isActive ? '#07241a' : cat.bg }}>
                    {cat.id === 'all' && <LayoutGrid size={22} color={iconColor} />}
                    {cat.id === 'starters' && <Soup size={22} color={iconColor} />}
                    {cat.id === 'main-course' && <CookingPot size={22} color={iconColor} />}
                    {cat.id === 'beverages' && <CupSoda size={22} color={iconColor} />}
                  </div>
                  <span className="category-label">{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Popular Dishes Section Header with View All */}
          <div className="menu-section-header">
            <h2 className="section-title-text">Popular Dishes</h2>
            <button
              type="button"
              className="section-view-all-link"
              onClick={() => {
                setCategory('all');
                setSearchQuery('');
                setVegOnly(false);
              }}
            >
              View All
            </button>
          </div>

          {/* 2-Column Food Card Grid (Matching Image 2 Screen 2) */}
          <div className="food-cards-grid-2col">
            {loadingMenu ? (
              <div className="menu-loading-state">
                <div className="spinner-mint" />
                <p>Loading fresh dishes...</p>
              </div>
            ) : filteredDishes.length === 0 ? (
              <div className="menu-empty-state">
                <Utensils size={36} style={{ color: '#94a3b8', margin: '0 auto 10px' }} />
                <p>No dishes found in this category.</p>
              </div>
            ) : (
              filteredDishes.map((dish) => {
                const count = getItemCount(dish.id);
                const isFav = favorites.has(dish.id);
                const isAvailable = dish.available !== false;

                return (
                  <div
                    key={dish.id}
                    className={`dish-grid-card ${!isAvailable ? 'sold-out' : ''}`}
                    onClick={() => isAvailable && openCustomization(dish)}
                  >
                    {/* Image Wrap */}
                    <div className="dish-card-img-wrap">
                      <img
                        src={dish.image || '/images/paneer_tikka.jpg'}
                        alt={dish.name}
                        className="dish-card-img"
                        loading="lazy"
                        onError={(e) => {
                          e.target.src = '/images/paneer_tikka.jpg';
                        }}
                      />

                      {/* Favorite Heart Button in top right */}
                      <button
                        type="button"
                        className={`dish-fav-btn ${isFav ? 'active' : ''}`}
                        onClick={(e) => toggleFavorite(dish.id, e)}
                        aria-label="Favorite"
                      >
                        <Heart size={14} fill={isFav ? '#ef4444' : 'none'} color={isFav ? '#ef4444' : '#ffffff'} />
                      </button>

                      {!isAvailable && <div className="dish-sold-badge">Sold Out</div>}
                    </div>

                    {/* Dish Card Content - Guaranteed NO Overlap */}
                    <div className="dish-card-body">
                      {/* Title Row with Inline Veg / Non-Veg Icon */}
                      <div className="dish-card-title-row">
                        <h3 className="dish-card-title">{dish.name}</h3>
                        <span
                          className={`dish-inline-diet-tag ${dish.isVeg ? 'veg' : 'non-veg'}`}
                          title={dish.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                        >
                          <span className="diet-dot" />
                        </span>
                      </div>

                      <p className="dish-card-desc">{dish.description || 'Specially prepared by TableMint chefs.'}</p>

                      <div className="dish-card-footer">
                        <span className="dish-card-price">₹ {dish.price}</span>

                        {isAvailable && (
                          <div onClick={(e) => e.stopPropagation()}>
                            {count > 0 ? (
                              <div className="grid-qty-stepper">
                                <button
                                  type="button"
                                  className="grid-stepper-btn"
                                  onClick={() => updateQuantity(dish.id, -1)}
                                  aria-label="Decrease quantity"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="grid-stepper-val">{count}</span>
                                <button
                                  type="button"
                                  className="grid-stepper-btn"
                                  onClick={() => updateQuantity(dish.id, 1)}
                                  aria-label="Increase quantity"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="btn-add-food-pill"
                                onClick={(e) => quickAddToCart(dish, e)}
                              >
                                + Add
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Floating Cart Pill (Shows when cart has items) */}
          {cart.length > 0 && (
            <div className="cart-floating-cta-bar">
              <div className="cart-cta-left">
                <span className="cart-badge-circle">{totalCartCount}</span>
                <div className="cart-cta-pricing">
                  <span className="cart-cta-total">₹{grandTotal}</span>
                  <span className="cart-cta-sub">Total with GST</span>
                </div>
              </div>
              <button
                type="button"
                className="cart-cta-btn"
                onClick={() => {
                  soundManager.playClick();
                  setActiveBottomNav('cart');
                }}
              >
                <span>View Cart</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          VIEW 2: YOUR CART & CHECKOUT (SCREEN 4 IN REFERENCE)
          ========================================================= */}
      {activeBottomNav === 'cart' && (
        <div className="customer-page-view cart-page-view">
          <header className="page-nav-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                className="back-icon-btn"
                onClick={() => setActiveBottomNav('menu')}
                aria-label="Back to menu"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="page-header-title">Your Cart</h2>
            </div>
            {cart.length > 0 && (
              <button type="button" className="cart-clear-all-btn" onClick={clearCart}>
                Clear All
              </button>
            )}
          </header>

          <div className="checkout-sheet-scroll">
            {cart.length === 0 ? (
              <div className="empty-cart-view">
                <ShoppingCart size={48} style={{ color: '#cbd5e1', marginBottom: 12 }} />
                <h4>Your cart is empty</h4>
                <p>Explore delicious specialties from our menu!</p>
                <button
                  type="button"
                  className="btn-add-food-pill"
                  style={{ marginTop: 16, padding: '10px 20px', fontSize: '0.9rem' }}
                  onClick={() => setActiveBottomNav('menu')}
                >
                  Explore Menu
                </button>
              </div>
            ) : (
              <div className="cart-items-list">
                {cart.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="cart-checkout-item-row">
                    <img
                      src={item.image || '/images/paneer_tikka.jpg'}
                      alt={item.name}
                      className="cart-item-thumbnail"
                    />
                    <div className="cart-item-details">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <h4 className="cart-item-name">{item.name}</h4>
                        <span className={`dish-inline-diet-tag ${item.isVeg ? 'veg' : 'non-veg'}`}>
                          <span className="diet-dot" />
                        </span>
                      </div>
                      {item.notes && <div className="cart-item-notes">{item.notes}</div>}
                      <div className="cart-item-price-unit">₹{item.price}</div>
                    </div>

                    <div className="cart-item-actions">
                      <div className="cart-stepper-box">
                        <button
                          type="button"
                          className="cart-stepper-btn"
                          onClick={() => updateQuantity(item.id, -1, item.notes)}
                        >
                          <Minus size={13} />
                        </button>
                        <span className="cart-stepper-val">{item.quantity}</span>
                        <button
                          type="button"
                          className="cart-stepper-btn"
                          onClick={() => updateQuantity(item.id, 1, item.notes)}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="cart-item-delete-btn"
                        onClick={() => updateQuantity(item.id, -item.quantity, item.notes)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Cooking Instruction Note */}
                <div className="special-request-input-wrap">
                  <input
                    type="text"
                    className="special-request-field"
                    placeholder="Any special request (e.g. less salt, warm water)..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                  />
                </div>

                {/* Bill Details Summary Card */}
                <div className="bill-details-card">
                  <div className="bill-details-title">Bill Details</div>
                  <div className="bill-row">
                    <span>Subtotal</span>
                    <span>₹{subtotal}</span>
                  </div>
                  <div className="bill-row">
                    <span>GST (5%)</span>
                    <span>₹{gstAmount}</span>
                  </div>
                  <div className="bill-row total-highlight">
                    <span>Total</span>
                    <span>₹{grandTotal}</span>
                  </div>
                </div>

                {/* Or Pay with pills */}
                <div className="pay-with-pills-row">
                  <span className="pay-with-label">Or Pay with</span>
                  <div className="pay-methods-grid">
                    <button
                      type="button"
                      className={`pay-pill ${selectedPaymentMethod === 'gpay' ? 'active' : ''}`}
                      onClick={() => setSelectedPaymentMethod('gpay')}
                    >
                      <span style={{ fontWeight: 800 }}>GPay</span>
                    </button>
                    <button
                      type="button"
                      className={`pay-pill ${selectedPaymentMethod === 'phonepe' ? 'active' : ''}`}
                      onClick={() => setSelectedPaymentMethod('phonepe')}
                    >
                      <span style={{ fontWeight: 800 }}>PhonePe</span>
                    </button>
                    <button
                      type="button"
                      className={`pay-pill ${selectedPaymentMethod === 'paytm' ? 'active' : ''}`}
                      onClick={() => setSelectedPaymentMethod('paytm')}
                    >
                      <span style={{ fontWeight: 800 }}>Paytm</span>
                    </button>
                    <button
                      type="button"
                      className={`pay-pill ${selectedPaymentMethod === 'card' ? 'active' : ''}`}
                      onClick={() => setSelectedPaymentMethod('card')}
                    >
                      <span style={{ fontWeight: 800 }}>Card</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="checkout-sheet-footer">
              <button
                type="button"
                className="btn-place-order"
                disabled={submittingOrder}
                onClick={handlePlaceOrder}
              >
                <Sparkles size={18} />
                {submittingOrder ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          VIEW 3: ORDER CONFIRMATION & TRACKING (SCREEN 5 IN REFERENCE)
          ========================================================= */}
      {activeBottomNav === 'orders' && (
        <div className="customer-page-view orders-page-view">
          <header className="page-nav-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                className="back-icon-btn"
                onClick={() => setActiveBottomNav('menu')}
                aria-label="Back to menu"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="page-header-title">Order Tracking</h2>
            </div>
            <div className="header-table-pill">
              <UtensilsCrossed size={13} /> Table {tableId}
            </div>
          </header>

          <div className="tracking-sheet-card" style={{ boxShadow: 'none', borderRadius: 0, padding: '16px' }}>
            {!activeOrder ? (
              <div style={{ textAlign: 'center', padding: '48px 16px', color: '#64748b' }}>
                <div style={{ width: 68, height: 68, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <ClipboardList size={34} style={{ color: '#94a3b8' }} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>No Active Order</h3>
                <p style={{ fontSize: '0.86rem', maxWidth: 280, margin: '0 auto 20px', lineHeight: 1.45 }}>
                  You haven't placed an order yet. Browse our delicious menu and add dishes to your cart!
                </p>
                <button
                  type="button"
                  className="btn-brand-primary"
                  style={{ margin: '0 auto', padding: '12px 28px', borderRadius: 9999, fontWeight: 700 }}
                  onClick={() => setActiveBottomNav('menu')}
                >
                  Explore Menu →
                </button>
              </div>
            ) : (() => {
              const status = (activeOrder.status || 'pending').toLowerCase();
              const isStep1Done = true; // Order placed is always done once order exists
              const isStep2Done = ['ready', 'served', 'completed'].includes(status);
              const isStep2Current = ['pending', 'preparing'].includes(status);
              const isStep3Done = ['served', 'completed'].includes(status);
              const isStep3Current = status === 'ready';
              const isStep4Done = ['served', 'completed'].includes(status);

              const line1Active = ['preparing', 'ready', 'served', 'completed'].includes(status);
              const line2Active = ['ready', 'served', 'completed'].includes(status);
              const line3Active = ['served', 'completed'].includes(status);

              const heroConfig = (() => {
                switch (status) {
                  case 'preparing':
                    return {
                      title: 'Kitchen is Cooking!',
                      subtitle: 'The chef has started preparing your fresh dishes.',
                      badgeBg: '#fef3c7',
                      badgeColor: '#d97706',
                      icon: <Flame size={38} />
                    };
                  case 'ready':
                    return {
                      title: 'Food is Ready!',
                      subtitle: `Your order is ready and is being served to Table ${tableId} right now.`,
                      badgeBg: '#ecfdf5',
                      badgeColor: '#059669',
                      icon: <Sparkles size={38} />
                    };
                  case 'served':
                  case 'completed':
                    return {
                      title: 'Order Served!',
                      subtitle: `Delivered to Table ${tableId}. Bon appétit! Enjoy your meal.`,
                      badgeBg: '#ecfdf5',
                      badgeColor: '#059669',
                      icon: <CheckCircle2 size={38} />
                    };
                  case 'pending':
                  default:
                    return {
                      title: 'Order Placed!',
                      subtitle: `Sent straight to the kitchen for Table ${tableId}.`,
                      badgeBg: '#ecfdf5',
                      badgeColor: '#059669',
                      icon: <ChefHat size={38} />
                    };
                }
              })();

              return (
                <>
                  <div className="tracking-hero-status">
                    <div className="cloche-icon-badge" style={{ background: heroConfig.badgeBg, color: heroConfig.badgeColor }}>
                      {heroConfig.icon}
                    </div>
                    <h2>{heroConfig.title}</h2>
                    <p>{heroConfig.subtitle}</p>
                  </div>

                  {/* Vertical Stepper Timeline with Green Ticks */}
                  <div className="vertical-timeline-box">
                    {/* Step 1: Order Placed */}
                    <div className="timeline-step-row completed">
                      <div className="timeline-dot-col">
                        <div className="timeline-dot check">
                          <Check size={14} strokeWidth={3} />
                        </div>
                        <div className={`timeline-line ${line1Active ? 'active' : ''}`} />
                      </div>
                      <div className="timeline-content-col">
                        <div className="step-label">Order Placed & Confirmed</div>
                        <div className="step-sub">
                          Order #{activeOrder.orderNumber || activeOrder.id.replace('ORD-', '')} sent to kitchen
                        </div>
                        <div className="step-time">
                          {activeOrder.createdAt ? new Date(activeOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </div>
                      </div>
                    </div>

                    {/* Step 2: Preparing in Kitchen */}
                    <div className={`timeline-step-row ${isStep2Done ? 'completed' : (isStep2Current ? 'active' : 'pending')}`}>
                      <div className="timeline-dot-col">
                        <div className={`timeline-dot ${isStep2Done ? 'check' : (isStep2Current ? 'current' : '')}`}>
                          {isStep2Done ? (
                            <Check size={14} strokeWidth={3} />
                          ) : isStep2Current ? (
                            <div className="pulse-inner-ring" />
                          ) : null}
                        </div>
                        <div className={`timeline-line ${line2Active ? 'active' : ''}`} />
                      </div>
                      <div className="timeline-content-col">
                        <div className="step-label">Preparing in Kitchen</div>
                        <div className="step-sub">
                          {isStep2Done ? 'Food preparation complete' : (status === 'preparing' ? 'Chef is actively cooking your dishes' : 'Order queued in kitchen')}
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Ready for Serving */}
                    <div className={`timeline-step-row ${isStep3Done ? 'completed' : (isStep3Current ? 'active' : 'pending')}`}>
                      <div className="timeline-dot-col">
                        <div className={`timeline-dot ${isStep3Done ? 'check' : (isStep3Current ? 'current' : '')}`}>
                          {isStep3Done ? (
                            <Check size={14} strokeWidth={3} />
                          ) : isStep3Current ? (
                            <div className="pulse-inner-ring" />
                          ) : null}
                        </div>
                        <div className={`timeline-line ${line3Active ? 'active' : ''}`} />
                      </div>
                      <div className="timeline-content-col">
                        <div className="step-label">Ready for Serving</div>
                        <div className="step-sub">
                          {isStep3Done ? 'Plated and dispatched' : (status === 'ready' ? 'Hot & ready! Waiter serving to table' : 'Estimated in 10-15 mins')}
                        </div>
                      </div>
                    </div>

                    {/* Step 4: Delivered to Table */}
                    <div className={`timeline-step-row ${isStep4Done ? 'completed' : 'pending'}`}>
                      <div className="timeline-dot-col">
                        <div className={`timeline-dot ${isStep4Done ? 'check' : ''}`}>
                          {isStep4Done ? <Check size={14} strokeWidth={3} /> : null}
                        </div>
                      </div>
                      <div className="timeline-content-col">
                        <div className="step-label">Delivered & Served</div>
                        <div className="step-sub">
                          {isStep4Done ? `Served at Table ${tableId}. Enjoy your food!` : `Will be placed on Table ${tableId}`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Estimated Time Badge */}
                  <div className="estimated-time-card">
                    <Clock size={16} style={{ color: '#10b981' }} />
                    <span>Status: <strong style={{ color: '#0f172a' }}>{status === 'served' || status === 'completed' ? 'Delivered' : (status === 'ready' ? 'Serving at table' : 'In Progress (10 – 15 mins)')}</strong></span>
                  </div>

                  {/* Ordered Items Summary */}
                  <div className="tracking-order-summary-card">
                    <div className="tracking-order-summary-header">
                      <div>
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                          Order #{activeOrder.orderNumber || activeOrder.id.replace('ORD-', '')}
                        </span>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>
                          Table {tableId} • {activeOrder.items?.length || 0} items
                        </span>
                      </div>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '3px 9px',
                        borderRadius: 9999,
                        background: status === 'served' || status === 'ready' ? '#ecfdf5' : '#eff6ff',
                        color: status === 'served' || status === 'ready' ? '#059669' : '#0284c7'
                      }}>
                        {status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {(activeOrder.items || []).map((it, idx) => (
                        <div key={idx} className="tracking-order-item-row">
                          <span>{it.quantity} x {it.name}</span>
                          <span style={{ fontWeight: 700 }}>₹{it.price * it.quantity}</span>
                        </div>
                      ))}
                    </div>

                    {activeOrder.notes && (
                      <div style={{ fontSize: '0.74rem', color: '#64748b', fontStyle: 'italic', marginTop: 8, padding: '6px 10px', background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        Note: "{activeOrder.notes}"
                      </div>
                    )}

                    <div className="tracking-order-total-row">
                      <span>Total Bill</span>
                      <span style={{ color: '#10b981' }}>₹{activeOrder.total}</span>
                    </div>
                  </div>

                  {/* Add more items button */}
                  <button
                    type="button"
                    className="btn-brand-outline"
                    style={{
                      width: '100%',
                      marginBottom: 16,
                      padding: '12px 14px',
                      justifyContent: 'center',
                      borderRadius: 12,
                      fontWeight: 700,
                      gap: 8
                    }}
                    onClick={() => setActiveBottomNav('menu')}
                  >
                    <Plus size={16} /> Order More Food from Menu
                  </button>

                  {/* Quick Assistance Actions */}
                  <div className="tracking-actions-grid">
                    <button
                      type="button"
                      className="tracking-action-btn"
                      onClick={() => handleServiceCall('waiter')}
                    >
                      <PhoneCall size={16} />
                      <span>Call Waiter</span>
                    </button>
                    <button
                      type="button"
                      className="tracking-action-btn"
                      onClick={() => handleServiceCall('water')}
                    >
                      <Droplets size={16} />
                      <span>Drinking Water</span>
                    </button>
                    <button
                      type="button"
                      className="tracking-action-btn"
                      onClick={() => handleServiceCall('bill')}
                    >
                      <Receipt size={16} />
                      <span>Request Bill</span>
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* =========================================================
          VIEW 4: CALL WAITER & SERVICE ASSISTANCE
          ========================================================= */}
      {activeBottomNav === 'waiter' && (
        <div className="customer-page-view waiter-page-view">
          <header className="page-nav-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                className="back-icon-btn"
                onClick={() => setActiveBottomNav('menu')}
                aria-label="Back to menu"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="page-header-title">Call Waiter</h2>
            </div>
            <div className="header-table-pill">
              <UtensilsCrossed size={13} /> Table {tableId}
            </div>
          </header>

          <div className="waiter-page-content">
            {/* Hero Service Card */}
            <div className="waiter-hero-card">
              <div className="waiter-hero-bell">
                <Bell size={32} />
              </div>
              <h3 className="waiter-hero-title">Need Assistance?</h3>
              <p className="waiter-hero-subtitle">
                Tap any button below and staff will be immediately alerted at Table {tableId}.
              </p>
            </div>

            {/* 4 Quick Assistance Cards Grid */}
            <div className="waiter-services-grid">
              <button
                type="button"
                className="waiter-service-card"
                onClick={() => handleServiceCall('waiter')}
              >
                <div className="waiter-service-icon-box waiter-color">
                  <UserRound size={26} />
                </div>
                <div className="waiter-service-info">
                  <span className="waiter-service-name">Call Waiter</span>
                  <span className="waiter-service-desc">Staff will visit your table</span>
                </div>
                <span className="waiter-service-action-pill">Call Now →</span>
              </button>

              <button
                type="button"
                className="waiter-service-card"
                onClick={() => handleServiceCall('water')}
              >
                <div className="waiter-service-icon-box water-color">
                  <Droplets size={26} />
                </div>
                <div className="waiter-service-info">
                  <span className="waiter-service-name">Drinking Water</span>
                  <span className="waiter-service-desc">Fresh glass or bottle water</span>
                </div>
                <span className="waiter-service-action-pill">Request →</span>
              </button>

              <button
                type="button"
                className="waiter-service-card"
                onClick={() => handleServiceCall('tissue')}
              >
                <div className="waiter-service-icon-box cutlery-color">
                  <Utensils size={26} />
                </div>
                <div className="waiter-service-info">
                  <span className="waiter-service-name">Cutlery & Napkins</span>
                  <span className="waiter-service-desc">Plates, spoons, extra napkins</span>
                </div>
                <span className="waiter-service-action-pill">Request →</span>
              </button>

              <button
                type="button"
                className="waiter-service-card"
                onClick={() => handleServiceCall('bill')}
              >
                <div className="waiter-service-icon-box bill-color">
                  <Receipt size={26} />
                </div>
                <div className="waiter-service-info">
                  <span className="waiter-service-name">Request Bill</span>
                  <span className="waiter-service-desc">Check & payment options</span>
                </div>
                <span className="waiter-service-action-pill">Request →</span>
              </button>
            </div>

            {/* Custom Assistance Note Input */}
            <div className="waiter-custom-note-card">
              <label className="waiter-note-label">Special Request or Note (Optional)</label>
              <div className="waiter-input-row">
                <input
                  type="text"
                  className="waiter-note-input"
                  placeholder="e.g. Extra spicy chutney, baby chair, clean table..."
                  value={serviceNote}
                  onChange={(e) => setServiceNote(e.target.value)}
                />
                <button
                  type="button"
                  className="waiter-note-submit-btn"
                  onClick={() => {
                    if (serviceNote.trim()) {
                      handleServiceCall(serviceNote);
                      setServiceNote('');
                    }
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Live Order Progress Bar on Menu */}
      {activeBottomNav === 'menu' && activeOrder && ['pending', 'preparing', 'ready'].includes(activeOrder.status) && (
        <div
          className="floating-order-tracker-bar"
          onClick={() => {
            soundManager.playClick();
            setActiveBottomNav('orders');
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="pulse-inner-ring" style={{ width: 10, height: 10 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.88rem', letterSpacing: '0.01em' }}>
                Order #{activeOrder.orderNumber || activeOrder.id.replace('ORD-', '')} is {activeOrder.status === 'pending' ? 'Placed' : (activeOrder.status === 'preparing' ? 'Cooking' : 'Ready')}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Tap to view live kitchen tracking
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
            Track <ArrowRight size={14} />
          </span>
        </div>
      )}

      {/* =========================================================
          STICKY BOTTOM NAVIGATION (ALWAYS VISIBLE ACROSS ALL PAGES)
          ========================================================= */}
      <nav className="mobile-bottom-nav-bar">
        <button
          type="button"
          className={`nav-tab-btn ${activeBottomNav === 'menu' ? 'active' : ''}`}
          onClick={() => {
            soundManager.playClick();
            setActiveBottomNav('menu');
          }}
        >
          <Utensils size={19} />
          <span>Menu</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeBottomNav === 'cart' ? 'active' : ''}`}
          onClick={() => {
            soundManager.playClick();
            setActiveBottomNav('cart');
          }}
        >
          <div className="nav-icon-badge-wrap">
            <ShoppingCart size={19} />
            {totalCartCount > 0 && <span className="nav-count-dot">{totalCartCount}</span>}
          </div>
          <span>Cart</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeBottomNav === 'orders' ? 'active' : ''}`}
          onClick={() => {
            soundManager.playClick();
            setActiveBottomNav('orders');
          }}
        >
          <div className="nav-icon-badge-wrap">
            <ClipboardList size={19} />
            {activeOrder && ['pending', 'preparing', 'ready'].includes(activeOrder.status) && (
              <span className="nav-count-dot" style={{ background: '#10b981', width: 8, height: 8 }} />
            )}
          </div>
          <span>Orders</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeBottomNav === 'waiter' ? 'active' : ''}`}
          onClick={() => {
            soundManager.playClick();
            setActiveBottomNav('waiter');
          }}
        >
          <UserRound size={19} />
          <span>Call Waiter</span>
        </button>
      </nav>

      {/* =========================================================
          SCREEN 3: DISH DETAILS & CUSTOMIZATION (IMAGE 2 SCREEN 3)
          ========================================================= */}
      {customizingDish && (
        <div className="modal-backdrop-customization" onClick={() => setCustomizingDish(null)}>
          <div className="dish-custom-sheet" onClick={(e) => e.stopPropagation()}>
            {/* Top Sheet Header */}
            <div className="custom-sheet-header">
              <button
                type="button"
                className="custom-sheet-close-btn"
                onClick={() => setCustomizingDish(null)}
              >
                <ArrowLeft size={20} />
              </button>
              <button
                type="button"
                className="custom-sheet-heart-btn"
                onClick={(e) => toggleFavorite(customizingDish.id, e)}
              >
                <Heart
                  size={20}
                  fill={favorites.has(customizingDish.id) ? '#ef4444' : 'none'}
                  color={favorites.has(customizingDish.id) ? '#ef4444' : '#1e293b'}
                />
              </button>
            </div>

            {/* Large Food Image */}
            <div className="custom-sheet-hero-img-box">
              <img
                src={customizingDish.image || '/images/paneer_tikka.jpg'}
                alt={customizingDish.name}
                className="custom-sheet-hero-img"
              />
            </div>

            <div className="custom-sheet-body-scroll">
              {/* Title & Price Row */}
              <div className="custom-title-row">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h2 className="custom-dish-title">{customizingDish.name}</h2>
                    <span className={`dish-inline-diet-tag ${customizingDish.isVeg ? 'veg' : 'non-veg'}`}>
                      <span className="diet-dot" />
                    </span>
                  </div>
                  <p className="custom-dish-desc">{customizingDish.description}</p>
                </div>
                <div className="custom-dish-price">₹ {customizingDish.price}</div>
              </div>

              {/* Spice Level Selector */}
              <div className="custom-section-box">
                <div className="custom-section-title">Spice Level</div>
                <div className="spice-pills-row">
                  {['Mild', 'Medium', 'Spicy'].map((level) => (
                    <button
                      key={level}
                      type="button"
                      className={`spice-pill-btn ${spiceLevel === level ? 'active' : ''}`}
                      onClick={() => setSpiceLevel(level)}
                    >
                      {level === 'Spicy' && '🌶️ '}
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add-ons Checklist */}
              <div className="custom-section-box">
                <div className="custom-section-title">Add-ons (Optional)</div>
                <div className="addons-list">
                  {ADDON_OPTIONS.map((addon) => {
                    const isSelected = selectedAddons.some((a) => a.id === addon.id);
                    return (
                      <label key={addon.id} className="addon-checkbox-row">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedAddons((prev) => prev.filter((a) => a.id !== addon.id));
                            } else {
                              setSelectedAddons((prev) => [...prev, addon]);
                            }
                          }}
                        />
                        <span className="addon-label">{addon.label}</span>
                        <span className="addon-price">+ ₹{addon.price}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Special Instructions Input */}
              <div className="custom-section-box">
                <div className="custom-section-title">Special Instructions (Optional)</div>
                <textarea
                  className="custom-textarea"
                  placeholder="E.g. Less oil, no onion, extra spicy..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            {/* Bottom Add to Cart Bar */}
            <div className="custom-sheet-footer">
              <div className="custom-qty-stepper">
                <button
                  type="button"
                  className="stepper-action-btn"
                  onClick={() => setModalQuantity((q) => Math.max(1, q - 1))}
                >
                  <Minus size={15} />
                </button>
                <span className="stepper-val">{modalQuantity}</span>
                <button
                  type="button"
                  className="stepper-action-btn"
                  onClick={() => setModalQuantity((q) => q + 1)}
                >
                  <Plus size={15} />
                </button>
              </div>

              <button
                type="button"
                className="btn-custom-add-to-cart"
                onClick={handleAddCustomizedToCart}
              >
                <span>Add to Cart</span>
                <span className="footer-btn-divider">|</span>
                <span>
                  ₹
                  {(
                    customizingDish.price +
                    selectedAddons.reduce((sum, a) => sum + a.price, 0)
                  ) * modalQuantity}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
