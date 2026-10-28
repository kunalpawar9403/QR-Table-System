import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  UtensilsCrossed,
  Bell,
  Search,
  Plus,
  Minus,
  ShoppingBag,
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
  Share2
} from 'lucide-react';
import { socket } from '../utils/socket';
import { soundManager } from '../utils/sound';
import { useToast } from '../components/Toast';
import { TableMintLogoIcon } from '../components/TableMintLogoIcon';
import '../styles/customer.css';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '🍽️', bg: '#ecfdf5' },
  { id: 'starters', label: 'Starters', icon: '🍲', bg: '#fff7ed' },
  { id: 'main-course', label: 'Main Course', icon: '🥘', bg: '#fef3c7' },
  { id: 'beverages', label: 'Beverages', icon: '🥤', bg: '#ffe4e6' },
  { id: 'desserts', label: 'Desserts', icon: '🍰', bg: '#f3e8ff' },
  { id: 'chinese', label: 'Chinese', icon: '🥢', bg: '#fee2e2' }
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
        setTrackingModalOpen(true);
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
  const handleServiceCall = async (type = 'waiter') => {
    setServiceModalOpen(false);
    try {
      const res = await fetch('/api/service/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: tableId,
          tableName: `Table ${tableId}`,
          token: tableToken,
          type: type
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
            <div className="welcome-logo-box">
              <TableMintLogoIcon size={26} />
              <span className="welcome-brand-text">Table<span style={{ color: '#34d399' }}>Mint</span></span>
            </div>
            <div className="welcome-table-badge">
              <UtensilsCrossed size={13} /> Table {tableId}
            </div>
          </div>

          {/* Luxury Hero Food Image */}
          <div className="welcome-hero-image-wrap">
            <img src="/images/welcome_hero.jpg" alt="Culinary Specialty" className="welcome-hero-img" />
            <div className="welcome-hero-glow" />
          </div>

          {/* Welcome Text Content */}
          <div className="welcome-content-card">
            <h1 className="welcome-headline">Good Food<br />Great Moments</h1>
            <p className="welcome-subtext">
              Explore our menu and place your order right from your table.
            </p>

            {/* 3 Feature Pills */}
            <div className="welcome-features-list">
              <div className="welcome-feature-item">
                <span className="feature-icon">🌿</span>
                <span className="feature-text">Fresh Ingredients</span>
              </div>
              <div className="welcome-feature-item">
                <span className="feature-icon">🧼</span>
                <span className="feature-text">Hygienic Kitchen</span>
              </div>
              <div className="welcome-feature-item">
                <span className="feature-icon">📱</span>
                <span className="feature-text">Contactless Ordering</span>
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

  // =========================================================
  // SCREEN 2: MAIN MENU & CATEGORIES (IMAGE 2 SCREEN 2)
  // =========================================================
  return (
    <div className="customer-app-wrapper">
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
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`category-item-card ${category === cat.id ? 'active' : ''}`}
            onClick={() => {
              soundManager.playClick();
              setCategory(cat.id);
            }}
          >
            <div className="category-icon-box" style={{ background: category === cat.id ? '#07241a' : cat.bg }}>
              <span className="category-emoji">{cat.icon}</span>
            </div>
            <span className="category-label">{cat.label}</span>
          </button>
        ))}
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
      {cart.length > 0 && !isCartOpen && (
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
            onClick={() => setIsCartOpen(true)}
          >
            <span>View Cart</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* =========================================================
          STICKY BOTTOM NAVIGATION (SCREEN 2 IN REFERENCE)
          ========================================================= */}
      <nav className="mobile-bottom-nav-bar">
        <button
          type="button"
          className={`nav-tab-btn ${activeBottomNav === 'menu' && !isCartOpen && !trackingModalOpen ? 'active' : ''}`}
          onClick={() => {
            setActiveBottomNav('menu');
            setIsCartOpen(false);
            setTrackingModalOpen(false);
          }}
        >
          <Utensils size={18} />
          <span>Menu</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${isCartOpen ? 'active' : ''}`}
          onClick={() => {
            setActiveBottomNav('cart');
            setIsCartOpen(true);
          }}
        >
          <div className="nav-icon-badge-wrap">
            <ShoppingBag size={18} />
            {totalCartCount > 0 && <span className="nav-count-dot">{totalCartCount}</span>}
          </div>
          <span>Cart</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${trackingModalOpen ? 'active' : ''}`}
          onClick={() => {
            setActiveBottomNav('orders');
            setTrackingModalOpen(true);
          }}
        >
          <Receipt size={18} />
          <span>Orders</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${serviceModalOpen ? 'active' : ''}`}
          onClick={() => {
            setServiceModalOpen(true);
          }}
        >
          <Bell size={18} />
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
                <span className="footer-btn-divider">•</span>
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

      {/* =========================================================
          SCREEN 4: YOUR CART & CHECKOUT (IMAGE 2 SCREEN 4)
          ========================================================= */}
      {isCartOpen && (
        <div className="modal-backdrop-customization" onClick={() => setIsCartOpen(false)}>
          <div className="cart-checkout-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="checkout-sheet-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  className="back-icon-btn"
                  onClick={() => setIsCartOpen(false)}
                >
                  <ArrowLeft size={18} />
                </button>
                <h3>Your Cart</h3>
              </div>
              {cart.length > 0 && (
                <button type="button" className="cart-clear-all-btn" onClick={clearCart}>
                  Clear All
                </button>
              )}
            </div>

            <div className="checkout-sheet-scroll">
              {cart.length === 0 ? (
                <div className="empty-cart-view">
                  <ShoppingBag size={48} style={{ color: '#cbd5e1', marginBottom: 12 }} />
                  <h4>Your cart is empty</h4>
                  <p>Explore delicious specialties from our menu!</p>
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
                          <span className={`dish-diet-badge ${item.isVeg ? 'veg' : 'non-veg'}`}>
                            <span className="diet-inner-dot" />
                          </span>
                          <h4 className="cart-item-name">{item.name}</h4>
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
                        GPay
                      </button>
                      <button
                        type="button"
                        className={`pay-pill ${selectedPaymentMethod === 'phonepe' ? 'active' : ''}`}
                        onClick={() => setSelectedPaymentMethod('phonepe')}
                      >
                        PhonePe
                      </button>
                      <button
                        type="button"
                        className={`pay-pill ${selectedPaymentMethod === 'paytm' ? 'active' : ''}`}
                        onClick={() => setSelectedPaymentMethod('paytm')}
                      >
                        Paytm
                      </button>
                      <button
                        type="button"
                        className={`pay-pill ${selectedPaymentMethod === 'card' ? 'active' : ''}`}
                        onClick={() => setSelectedPaymentMethod('card')}
                      >
                        Card / Cash
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
        </div>
      )}

      {/* =========================================================
          SCREEN 5: ORDER CONFIRMATION & TRACKING (IMAGE 2 SCREEN 5)
          ========================================================= */}
      {trackingModalOpen && (
        <div className="modal-backdrop-customization" onClick={() => setTrackingModalOpen(false)}>
          <div className="tracking-sheet-card" onClick={(e) => e.stopPropagation()}>
            <div className="tracking-sheet-header">
              <button
                type="button"
                className="back-icon-btn"
                onClick={() => setTrackingModalOpen(false)}
              >
                <ArrowLeft size={18} />
              </button>
              <h3>Order Tracking</h3>
              <div style={{ width: 24 }} />
            </div>

            <div className="tracking-sheet-body">
              {/* Cloche Illustration & Headline */}
              <div className="tracking-hero-status">
                <div className="cloche-icon-badge">
                  <ChefHat size={38} />
                </div>
                <h2>Order Placed!</h2>
                <p>Your order has been sent to the kitchen.</p>
              </div>

              {/* Vertical Stepper Timeline */}
              <div className="vertical-timeline-box">
                {/* Step 1: Order Placed */}
                <div className="timeline-step-row completed">
                  <div className="timeline-dot-col">
                    <div className="timeline-dot check">
                      <Check size={14} />
                    </div>
                    <div className="timeline-line active" />
                  </div>
                  <div className="timeline-content-col">
                    <div className="step-label">Order Placed</div>
                    <div className="step-time">Just now</div>
                  </div>
                </div>

                {/* Step 2: Preparing */}
                <div className={`timeline-step-row ${activeOrder?.status === 'preparing' || activeOrder?.status === 'ready' || activeOrder?.status === 'served' ? 'completed' : 'active'}`}>
                  <div className="timeline-dot-col">
                    <div className="timeline-dot current">
                      <div className="pulse-inner-ring" />
                    </div>
                    <div className={`timeline-line ${activeOrder?.status === 'ready' || activeOrder?.status === 'served' ? 'active' : ''}`} />
                  </div>
                  <div className="timeline-content-col">
                    <div className="step-label">Preparing</div>
                    <div className="step-sub">Your food is being prepared in the kitchen</div>
                  </div>
                </div>

                {/* Step 3: Ready for Serving */}
                <div className={`timeline-step-row ${activeOrder?.status === 'ready' || activeOrder?.status === 'served' ? 'completed' : 'pending'}`}>
                  <div className="timeline-dot-col">
                    <div className="timeline-dot">
                      {activeOrder?.status === 'ready' || activeOrder?.status === 'served' ? <Check size={14} /> : null}
                    </div>
                    <div className="timeline-line" />
                  </div>
                  <div className="timeline-content-col">
                    <div className="step-label">Ready for Serving</div>
                    <div className="step-sub">Estimated 10-15 mins</div>
                  </div>
                </div>

                {/* Step 4: Delivered */}
                <div className={`timeline-step-row ${activeOrder?.status === 'served' ? 'completed' : 'pending'}`}>
                  <div className="timeline-dot-col">
                    <div className="timeline-dot">
                      {activeOrder?.status === 'served' ? <Check size={14} /> : null}
                    </div>
                  </div>
                  <div className="timeline-content-col">
                    <div className="step-label">Delivered</div>
                  </div>
                </div>
              </div>

              {/* Estimated Time Badge */}
              <div className="estimated-time-card">
                <Clock size={16} style={{ color: '#10b981' }} />
                <span>Estimated Time: <strong>10 – 15 mins</strong></span>
              </div>

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
                  onClick={() => handleServiceCall('bill')}
                >
                  <Receipt size={16} />
                  <span>Request Bill</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Call Modal */}
      {serviceModalOpen && (
        <div className="modal-backdrop-customization" onClick={() => setServiceModalOpen(false)}>
          <div className="service-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="service-modal-header">
              <h3>Call Waiter / Service</h3>
              <button
                type="button"
                className="close-service-btn"
                onClick={() => setServiceModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <p className="service-modal-desc">
              Staff will be immediately alerted at Table {tableId}
            </p>

            <div className="service-buttons-grid">
              <button
                type="button"
                className="service-btn-pill"
                onClick={() => handleServiceCall('water')}
              >
                <span className="service-emoji">💧</span>
                <span>Water</span>
              </button>
              <button
                type="button"
                className="service-btn-pill"
                onClick={() => handleServiceCall('waiter')}
              >
                <span className="service-emoji">🙋‍♂️</span>
                <span>Call Waiter</span>
              </button>
              <button
                type="button"
                className="service-btn-pill"
                onClick={() => handleServiceCall('tissue')}
              >
                <span className="service-emoji">🧻</span>
                <span>Cutlery/Tissues</span>
              </button>
              <button
                type="button"
                className="service-btn-pill"
                onClick={() => handleServiceCall('bill')}
              >
                <span className="service-emoji">💳</span>
                <span>Bring Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
