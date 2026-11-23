import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X, Bell, UtensilsCrossed, ChefHat, Sparkles, ShoppingCart, Heart, CreditCard } from 'lucide-react';

const ToastContext = createContext(null);

function parseToastContent(rawMessage, type) {
  if (!rawMessage) return { title: '', subtitle: null, category: '', iconType: type, badgeStyle: type };

  let msg = String(rawMessage).trim();
  // Strip leading bell emoji if present
  if (msg.startsWith('🔔')) {
    msg = msg.replace(/^🔔\s*/, '').trim();
  }

  // 1. Customer Cart Pattern: "Added Paneer 65 to cart"
  const cartMatch = msg.match(/^Added\s+(.+)\s+to cart$/i);
  if (cartMatch) {
    return {
      category: 'CART UPDATED',
      title: 'Added to Cart',
      subtitle: cartMatch[1].trim(),
      iconType: 'cart',
      badgeStyle: 'success'
    };
  }

  // 2. Customer Cart Cleared: "Cart cleared"
  if (msg.toLowerCase() === 'cart cleared') {
    return {
      category: 'CART',
      title: 'Cart Cleared',
      subtitle: 'All items removed from your order tray',
      iconType: 'cart',
      badgeStyle: 'info'
    };
  }

  // 3. Customer Wishlist Pattern: "Added to your favorites ❤️"
  if (msg.toLowerCase().includes('favorites')) {
    return {
      category: 'SAVED',
      title: 'Added to Favorites',
      subtitle: 'Dish saved to your wishlist',
      iconType: 'heart',
      badgeStyle: 'success'
    };
  }

  // 4. Customer Staff Alert: "Staff alerted for Table 2! Someone is on the way."
  const staffAlertMatch = msg.match(/Staff alerted for (Table \d+|[A-Za-z0-9_-]+)!?\s*(.*)$/i);
  if (staffAlertMatch) {
    return {
      category: 'STAFF ALERTED',
      title: 'Waiter Notified',
      subtitle: staffAlertMatch[2] ? staffAlertMatch[2].trim() : 'Someone is on the way to your table',
      iconType: 'service',
      badgeStyle: 'warning'
    };
  }

  // 5. Customer Order Confirmed: "Order ORD-104 confirmed!"
  const orderConfirmedMatch = msg.match(/Order\s+([A-Za-z0-9_-]+)\s+confirmed!?/i);
  if (orderConfirmedMatch) {
    return {
      category: 'ORDER CONFIRMED',
      title: 'Order Placed Successfully!',
      subtitle: `Ticket ${orderConfirmedMatch[1].trim()} sent to kitchen`,
      iconType: 'order',
      badgeStyle: 'success'
    };
  }

  // 6. Customer Payment Submitted: "Payment reference submitted! ..."
  if (msg.toLowerCase().includes('payment reference submitted') || msg.toLowerCase().includes('alerted staff to confirm your payment')) {
    return {
      category: 'PAYMENT',
      title: 'Payment Submitted',
      subtitle: 'Cashier is verifying and completing your bill',
      iconType: 'payment',
      badgeStyle: 'info'
    };
  }

  // 7. Staff Service Call Pattern: "Table 2: CALL WAITER" or "Table 1 requests CALL WAITER"
  const serviceMatch = msg.match(/^Table\s+(\d+|[A-Za-z0-9_-]+)(?:\s+requests)?:\s*(.+)$/i);
  if (serviceMatch) {
    const tableNum = serviceMatch[1];
    let action = serviceMatch[2].trim().replace(/_/g, ' ');
    if (action.toUpperCase() === 'CALL WAITER') action = 'Call Waiter Assistance';
    else if (action.toUpperCase() === 'DRINKING WATER') action = 'Drinking Water Requested';
    else if (action.toUpperCase() === 'REQUEST BILL') action = 'Bill Payment Requested';

    return {
      category: 'GUEST SERVICE',
      title: `Table ${tableNum}`,
      subtitle: action,
      iconType: 'service',
      badgeStyle: 'warning'
    };
  }

  // 8. Staff New Order Pattern: "New Order ORD-104 from Table 2"
  const newOrderMatch = msg.match(/New Order\s+([A-Za-z0-9_-]+)\s+from\s+(.+)$/i);
  if (newOrderMatch) {
    return {
      category: 'NEW ORDER',
      title: newOrderMatch[2].trim(),
      subtitle: `Order ${newOrderMatch[1].trim()}`,
      iconType: 'order',
      badgeStyle: 'success'
    };
  }

  // 9. Kitchen KDS Pattern: "New Kitchen Ticket: Table 2 (ORD-104)"
  const kdsMatch = msg.match(/New Kitchen Ticket:\s*([^(]+)(?:\(([^)]+)\))?/i);
  if (kdsMatch) {
    return {
      category: 'KITCHEN TICKET',
      title: kdsMatch[1].trim(),
      subtitle: kdsMatch[2] ? `Ticket ${kdsMatch[2].trim()}` : 'Live Preparation Ticket',
      iconType: 'kds',
      badgeStyle: 'warning'
    };
  }

  // 10. Order Ready Pattern: "Your order is ready to serve! Enjoy your meal."
  if (msg.toLowerCase().includes('ready to serve') || msg.toLowerCase().includes('order is ready')) {
    return {
      category: 'ORDER READY',
      title: 'Order is Ready!',
      subtitle: 'Prepared & ready to serve to your table',
      iconType: 'ready',
      badgeStyle: 'success'
    };
  }

  // 11. Order Status Update Pattern: "Order update: Status is now PREPARING"
  const statusUpdateMatch = msg.match(/Order update:\s*Status is now\s*(.+)$/i);
  if (statusUpdateMatch) {
    const status = statusUpdateMatch[1].trim().toUpperCase();
    return {
      category: 'ORDER STATUS',
      title: `Status: ${status}`,
      subtitle: 'Kitchen live progress updated',
      iconType: 'info',
      badgeStyle: 'info'
    };
  }

  // 12. Generic colon split (e.g. "Bill No: 104")
  if (msg.includes(': ') && !msg.startsWith('http')) {
    const parts = msg.split(/:\s+(.+)/);
    if (parts.length >= 2) {
      return {
        category: type === 'warning' ? 'ALERT' : type === 'error' ? 'ERROR' : type === 'success' ? 'SUCCESS' : 'NOTICE',
        title: parts[0].trim(),
        subtitle: parts[1].trim(),
        iconType: type,
        badgeStyle: type
      };
    }
  }

  return {
    category: type === 'warning' ? 'ALERT' : type === 'error' ? 'ERROR' : type === 'success' ? 'SUCCESS' : 'NOTICE',
    title: msg,
    subtitle: null,
    iconType: type,
    badgeStyle: type
  };
}

function ToastCard({ toast, onRemove }) {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const remainingTimeRef = useRef(toast.duration || 4200);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef(null);

  const parsed = parseToastContent(toast.message, toast.type);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 220);
  }, [onRemove, toast.id]);

  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return;

    const startTimer = () => {
      startTimeRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, remainingTimeRef.current);
    };

    if (!isPaused) {
      startTimer();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPaused, handleDismiss, toast.duration]);

  const handleMouseEnter = () => {
    if (!toast.duration) return;
    setIsPaused(true);
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(remainingTimeRef.current - elapsed, 500);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleMouseLeave = () => {
    if (!toast.duration) return;
    setIsPaused(false);
  };

  const renderIcon = () => {
    switch (parsed.iconType) {
      case 'cart':
        return <ShoppingCart size={18} />;
      case 'heart':
        return <Heart size={18} className="toast-heart-fill" />;
      case 'payment':
        return <CreditCard size={18} />;
      case 'service':
        return <Bell size={18} className="toast-bell-animated" />;
      case 'order':
        return <UtensilsCrossed size={18} />;
      case 'kds':
        return <ChefHat size={18} />;
      case 'ready':
        return <Sparkles size={18} />;
      case 'success':
        return <CheckCircle2 size={18} />;
      case 'warning':
        return <AlertCircle size={18} />;
      case 'error':
        return <AlertCircle size={18} />;
      case 'info':
      default:
        return <Info size={18} />;
    }
  };

  return (
    <div
      className={`toast-item toast-${toast.type} ${isExiting ? 'toast-exit' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="alert"
    >
      <div className="toast-left-col">
        <div className={`toast-icon-badge toast-badge-${parsed.badgeStyle}`}>
          {renderIcon()}
        </div>
      </div>

      <div className="toast-content-col">
        {parsed.category && (
          <div className="toast-category-row">
            <span className={`toast-category-pill toast-pill-${parsed.badgeStyle}`}>
              {parsed.category}
            </span>
          </div>
        )}
        <div className="toast-title">{parsed.title}</div>
        {parsed.subtitle && <div className="toast-subtitle">{parsed.subtitle}</div>}
      </div>

      <button
        className="toast-close-btn"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>

      {toast.duration > 0 && (
        <div
          className="toast-progress-bar"
          style={{
            animationDuration: `${toast.duration}ms`,
            animationPlayState: isPaused ? 'paused' : 'running'
          }}
        />
      )}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const recentToastsRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 4500) => {
    if (!message) return;
    const msgString = String(message).trim();
    const key = `${type}:${msgString}`;
    const now = Date.now();
    const lastSeen = recentToastsRef.current.get(key);

    // Suppress identical duplicate toasts arriving within 2000ms
    if (lastSeen && (now - lastSeen) < 2000) {
      return;
    }
    recentToastsRef.current.set(key, now);

    // Prune stale timestamps to keep map small
    if (recentToastsRef.current.size > 80) {
      for (const [k, ts] of recentToastsRef.current.entries()) {
        if (now - ts > 10000) {
          recentToastsRef.current.delete(k);
        }
      }
    }

    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message: msgString, type, duration }]);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onRemove={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      addToast: (msg) => console.log('Toast:', msg),
      removeToast: () => {}
    };
  }
  return context;
}
