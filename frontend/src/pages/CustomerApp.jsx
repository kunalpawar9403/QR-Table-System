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
  Receipt,
  Users,
  X,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { socket } from '../utils/socket';
import { soundManager } from '../utils/sound';
import { useToast } from '../components/Toast';
import '../styles/customer.css';

const CATEGORIES = [
  { id: 'all', label: 'All Dishes' },
  { id: 'chinese', label: 'Chinese' },
  { id: 'north-indian', label: 'North Indian' },
  { id: 'tandoori', label: 'Tandoori' },
  { id: 'soup', label: 'Soups' },
  { id: 'snacks', label: 'Snacks' },
  { id: 'milkshake', label: 'Milkshakes' },
  { id: 'ice-cream', label: 'Ice Creams' },
  { id: 'juice', label: 'Fresh Juices' }
];

export default function CustomerApp({ initialTable = null, initialToken = null }) {
  const { addToast } = useToast();

  // Navigation & Table Session - Directly initialize from URL or default to Table 1
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

  // Modals
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [splitPeople, setSplitPeople] = useState(2);
  const [customizingDish, setCustomizingDish] = useState(null);
  const [dishNote, setDishNote] = useState('');

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
    if (isCartOpen || serviceModalOpen || splitModalOpen || Boolean(customizingDish)) {
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
  }, [isCartOpen, serviceModalOpen, splitModalOpen, customizingDish]);

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

    // Check if table already has an active order
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

  // Cart operations
  const addToCart = (dish, customNotes = '') => {
    soundManager.playClick();
    setCart((prev) => {
      const existing = prev.find((item) => item.id === dish.id && item.notes === customNotes);
      if (existing) {
        return prev.map((item) =>
          item.id === dish.id && item.notes === customNotes
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
          quantity: 1,
          notes: customNotes
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
        customerName: customerName.trim() || `Guest (T${tableId})`,
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

        // Celebration Confetti!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });

        addToast(`Order #${placedOrder.orderNumber || placedOrder.id} sent to kitchen!`, 'success', 5000);
      } else {
        if (res.status === 403 || data.error === 'TOKEN_EXPIRED') {
          setSessionExpired(true);
          setExpiredReason(data.message || 'Dining session has ended. Please scan the active table QR stand to order.');
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

  // Call Waiter / Service Request
  const handleServiceCall = async (type) => {
    if (!tableId) return;
    try {
      const res = await fetch('/api/service-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          token: tableToken,
          tableName: `Table ${tableId}`,
          type
        })
      });
      if (res.ok) {
        soundManager.playServiceBell();
        addToast(`Staff alerted: ${type.toUpperCase()}`, 'success', 4000);
        setServiceModalOpen(false);
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

  // Filter dishes
  const filteredDishes = menu.filter((dish) => {
    if (category !== 'all' && dish.category !== category) return false;
    if (vegOnly && !dish.isVeg) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = dish.name.toLowerCase().includes(q);
      const matchDesc = (dish.description || '').toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    return true;
  });

  // Render Session Expired View
  if (sessionExpired) {
    return (
      <div className="customer-container">
        <div className="scanner-gate" style={{ marginTop: 60 }}>
          <div className="staff-lock-icon-badge" style={{ borderColor: '#ef4444', color: '#ef4444' }}>
            <AlertTriangle size={36} />
          </div>
          <h2>Session Expired</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: 320 }}>
            {expiredReason || 'Dining session for this table has ended.'}
          </p>
          <button
            className="btn-primary"
            onClick={() => {
              setSessionExpired(false);
              unlockTable(tableId || 1);
            }}
          >
            <RotateCcw size={16} /> Open Table Menu
          </button>
        </div>
      </div>
    );
  }

  // Render Table Scanner Gate if no table selected
  if (!tableId) {
    return (
      <div className="customer-container">
        <header className="customer-header">
          <div className="brand-title-wrap">
            <div className="brand-logo-icon">SG</div>
            <span className="brand-name">Spice Garden</span>
          </div>
        </header>

        <div className="scanner-gate">
          <div className="scanner-box">
            {cameraActive ? (
              <video ref={videoRef} className="scanner-video" playsInline />
            ) : (
              <div className="scanner-placeholder">
                <Camera size={44} style={{ color: 'var(--primary)' }} />
                <h4>Scan Table QR Stand</h4>
                <p style={{ fontSize: '0.8rem' }}>
                  Point camera at the table QR code or select your table below
                </p>
              </div>
            )}
            <div className="scanner-laser" />
          </div>

          <button
            className="btn-secondary"
            onClick={cameraActive ? stopCamera : startCamera}
          >
            <Camera size={18} />
            {cameraActive ? 'Stop Camera' : 'Open Camera Scanner'}
          </button>

          <div className="table-quick-picker">
            <div className="picker-title">Quick Select Table (Testing)</div>
            <div className="picker-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((tNum) => (
                <button
                  key={tNum}
                  className="picker-btn"
                  onClick={() => unlockTable(tNum)}
                >
                  Table {tNum}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-container">
      {/* Header */}
      <header className="customer-header">
        <div className="customer-header-top">
          <div className="brand-title-wrap">
            <div className="brand-logo-icon">SG</div>
            <div>
              <div className="brand-name">Spice Garden</div>
              <div className="table-pill-badge">
                <UtensilsCrossed size={12} /> Table {tableId}
              </div>
            </div>
          </div>

          <div className="customer-header-actions">
            <button
              className="waiter-call-btn"
              onClick={() => setServiceModalOpen(true)}
            >
              <Bell size={14} /> Service
            </button>
          </div>
        </div>
      </header>

      {/* Live Order Tracker Banner (If table has an active order) */}
      {activeOrder && (
        <div
          className="tracking-card"
          style={{ margin: '14px 18px 0', padding: 18 }}
        >
          <div className="tracking-header">
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                ACTIVE ORDER
              </div>
              <div className="tracking-order-num">#{activeOrder.orderNumber}</div>
            </div>
            <span className={`status-pill ${activeOrder.status}`}>
              {activeOrder.status}
            </span>
          </div>

          <div className="stepper-steps">
            {[
              { id: 'pending', label: 'Order Received' },
              { id: 'preparing', label: 'Cooking in Kitchen' },
              { id: 'ready', label: 'Ready to Serve' },
              { id: 'served', label: 'Served & Enjoy' }
            ].map((step, idx) => {
              const statusOrder = ['pending', 'preparing', 'ready', 'served'];
              const currentIdx = statusOrder.indexOf(activeOrder.status);
              const isCompleted = currentIdx > idx;
              const isActive = currentIdx === idx;
              return (
                <div
                  key={step.id}
                  className={`stepper-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
                >
                  <div className="step-dot">
                    {isCompleted ? <CheckCircle2 size={18} /> : idx + 1}
                  </div>
                  <div className="step-title">{step.label}</div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-secondary"
              style={{ flex: 1, fontSize: '0.8rem', padding: '8px 12px' }}
              onClick={() => setSplitModalOpen(true)}
            >
              <Users size={14} /> Split Bill
            </button>
            <button
              className="btn-secondary"
              style={{ flex: 1, fontSize: '0.8rem', padding: '8px 12px' }}
              onClick={() => handleServiceCall('bill')}
            >
              <Receipt size={14} /> Request Bill
            </button>
          </div>
        </div>
      )}

      {/* Search & Veg Filter */}
      <div className="search-diet-wrap" style={{ marginTop: 14 }}>
        <div className="search-input-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search curries, rotis, drinks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div
          className={`veg-only-toggle ${vegOnly ? 'active' : ''}`}
          onClick={() => setVegOnly(!vegOnly)}
        >
          <span className="diet-badge veg" />
          <span>VEG ONLY</span>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="category-filter-bar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`category-pill ${category === cat.id ? 'active' : ''}`}
            onClick={() => setCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Dishes List */}
      <div className="dishes-list">
        {loadingMenu ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            Loading delicious menu...
          </div>
        ) : filteredDishes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            No dishes found matching your criteria.
          </div>
        ) : (
          filteredDishes.map((dish) => {
            const count = getItemCount(dish.id);
            const isAvailable = dish.available !== false;
            return (
              <div
                key={dish.id}
                className={`dish-card ${!isAvailable ? 'out-of-stock' : ''}`}
              >
                <div className="dish-img-wrap">
                  <img
                    src={dish.image || '/images/paneer_butter_masala.jpg'}
                    alt={dish.name}
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = '/images/paneer_butter_masala.jpg';
                    }}
                  />
                  {!isAvailable && <div className="sold-out-badge">Sold Out</div>}
                </div>

                <div className="dish-info">
                  <div>
                    <div className="dish-header-row">
                      <span className={`diet-badge ${dish.isVeg ? 'veg' : 'non-veg'}`} />
                      <h4 className="dish-title">{dish.name}</h4>
                    </div>
                    <p className="dish-desc">{dish.description}</p>
                  </div>

                  <div className="dish-footer-row">
                    <span className="dish-price">₹{dish.price}</span>

                    {isAvailable && (
                      <div>
                        {count > 0 ? (
                          <div className="qty-stepper">
                            <button
                              className="qty-btn"
                              onClick={() => updateQuantity(dish.id, -1)}
                            >
                              <Minus size={14} />
                            </button>
                            <span className="qty-count">{count}</span>
                            <button
                              className="qty-btn"
                              onClick={() => updateQuantity(dish.id, 1)}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn-add-cart"
                            onClick={() => addToCart(dish)}
                          >
                            <Plus size={14} /> Add
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

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="cart-floating-bar">
          <div className="cart-bar-left">
            <div className="cart-count-badge">{totalCartCount}</div>
            <div className="cart-bar-text">
              <span className="cart-total-price">₹{grandTotal}</span>
              <span className="cart-items-count">
                {totalCartCount} {totalCartCount === 1 ? 'item' : 'items'} (incl. GST)
              </span>
            </div>
          </div>
          <button
            className="btn-view-cart"
            onClick={() => setIsCartOpen(true)}
          >
            View Cart <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div className="modal-backdrop" onClick={() => setIsCartOpen(false)}>
          <div
            className="cart-drawer-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cart-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShoppingBag size={20} style={{ color: 'var(--primary)' }} />
                <h3>Your Table Order</h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setIsCartOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="cart-items-scroll">
              {cart.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="cart-item-row">
                  <div>
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-price">
                      ₹{item.price} x {item.quantity} = ₹{item.price * item.quantity}
                    </div>
                  </div>
                  <div className="qty-stepper">
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(item.id, -1, item.notes)}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="qty-count">{item.quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(item.id, 1, item.notes)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-drawer-footer">
              <input
                type="text"
                className="customer-name-input"
                placeholder="Your Name (Optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <input
                type="text"
                className="customer-name-input"
                placeholder="Cooking instructions (e.g. Less spicy, no garlic)"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
              />

              <div className="bill-summary-row">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="bill-summary-row">
                <span>GST (5%)</span>
                <span>₹{gstAmount}</span>
              </div>
              <div className="bill-summary-row total">
                <span>Grand Total</span>
                <span>₹{grandTotal}</span>
              </div>

              <button
                className="btn-primary"
                style={{ width: '100%', padding: '14px 0', fontSize: '1rem' }}
                disabled={submittingOrder}
                onClick={handlePlaceOrder}
              >
                <Sparkles size={18} />
                {submittingOrder ? 'Placing Order...' : `Place Order (Table ${tableId})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Call Modal */}
      {serviceModalOpen && (
        <div className="modal-backdrop" onClick={() => setServiceModalOpen(false)}>
          <div
            className="staff-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 360 }}
          >
            <button
              className="modal-close-btn"
              onClick={() => setServiceModalOpen(false)}
            >
              <X size={20} />
            </button>
            <div className="staff-lock-icon-badge">
              <Bell size={30} />
            </div>
            <h3>Call Waiter / Service</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
              Staff will be immediately alerted at Table {tableId}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                className="btn-secondary"
                style={{ flexDirection: 'column', padding: 14 }}
                onClick={() => handleServiceCall('water')}
              >
                💧 Water
              </button>
              <button
                className="btn-secondary"
                style={{ flexDirection: 'column', padding: 14 }}
                onClick={() => handleServiceCall('waiter')}
              >
                🙋‍♂️ Call Waiter
              </button>
              <button
                className="btn-secondary"
                style={{ flexDirection: 'column', padding: 14 }}
                onClick={() => handleServiceCall('tissue')}
              >
                🧻 Cutlery/Tissues
              </button>
              <button
                className="btn-secondary"
                style={{ flexDirection: 'column', padding: 14 }}
                onClick={() => handleServiceCall('bill')}
              >
                💳 Bring Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Bill Modal */}
      {splitModalOpen && (
        <div className="modal-backdrop" onClick={() => setSplitModalOpen(false)}>
          <div
            className="staff-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 380 }}
          >
            <button
              className="modal-close-btn"
              onClick={() => setSplitModalOpen(false)}
            >
              <X size={20} />
            </button>
            <h3>Split Bill Calculator</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 18 }}>
              Equal split among friends
            </p>

            <div style={{ margin: '14px 0' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Number of people:
              </span>
              <div
                className="qty-stepper"
                style={{ margin: '8px auto 16px', display: 'flex', width: 'fit-content' }}
              >
                <button
                  className="qty-btn"
                  onClick={() => setSplitPeople(Math.max(1, splitPeople - 1))}
                >
                  <Minus size={14} />
                </button>
                <span className="qty-count">{splitPeople}</span>
                <button
                  className="qty-btn"
                  onClick={() => setSplitPeople(splitPeople + 1)}
                >
                  <Plus size={14} />
                </button>
              </div>

              <div
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  padding: 16,
                  borderRadius: 14,
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Each Person Pays
                </div>
                <div
                  style={{
                    fontSize: '1.8rem',
                    fontWeight: 800,
                    color: 'var(--primary)',
                    fontFamily: 'var(--font-display)'
                  }}
                >
                  ₹
                  {activeOrder
                    ? Math.round(activeOrder.total / splitPeople)
                    : Math.round(grandTotal / splitPeople)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
