import React, { useState, useEffect, lazy, Suspense } from 'react';
import CustomerApp from './pages/CustomerApp';

const DashboardApp = lazy(() => import('./pages/DashboardApp'));
const KitchenKdsApp = lazy(() => import('./pages/KitchenKdsApp'));
const QrStandsApp = lazy(() => import('./pages/QrStandsApp'));

function ViewLoadingSpinner() {
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        color: '#10b981'
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: '3px solid rgba(16, 185, 129, 0.15)',
          borderTopColor: '#10b981',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}
      />
      <span style={{ fontSize: '0.88rem', color: '#94a3b8', fontWeight: 600 }}>
        Loading TableMint Terminal...
      </span>
    </div>
  );
}
import StaffAuthModal from './components/StaffAuthModal';
import TableMintSplashScreen from './components/TableMintSplashScreen';
import { ToastProvider } from './components/Toast';
import { checkStaffAuth, getStaffToken } from './utils/staffAuth';
import { Utensils, LayoutDashboard, ChefHat, QrCode, Lock } from 'lucide-react';
import './index.css';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState(false);
  const [staffAuthModalOpen, setStaffAuthModalOpen] = useState(false);
  // Only show splash once per session when link/app is opened; do NOT show on page refresh
  const [showSplash, setShowSplash] = useState(() => {
    try {
      const alreadyShown = sessionStorage.getItem('tablemint_splash_shown');
      if (!alreadyShown) {
        // Mark as shown immediately so refresh will not trigger it again
        sessionStorage.setItem('tablemint_splash_shown', 'true');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  const handleSplashComplete = () => {
    setShowSplash(false);
    try {
      sessionStorage.setItem('tablemint_splash_shown', 'true');
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    // Determine view: Only customer self-ordering if table or customer is requested
    const path = window.location.pathname;
    const search = window.location.search;
    const urlParams = new URLSearchParams(search);

    if (urlParams.get('table') || path.includes('customer') || search.includes('customer')) {
      setCurrentView('customer');
    } else {
      // Staff always opens directly to the Admin POS Dashboard!
      setCurrentView('dashboard');
    }

    // Check staff auth
    checkStaffAuth().then((authed) => {
      setIsStaffAuthenticated(authed);
      if (!authed && !urlParams.get('table')) {
        setStaffAuthModalOpen(true);
      }
    });

    // Listen for unauthorized 401 events
    const handleUnauthorized = () => {
      setIsStaffAuthenticated(false);
      setStaffAuthModalOpen(true);
    };

    window.addEventListener('staff:unauthorized', handleUnauthorized);
    // Allow manual trigger for testing/preview from Settings/More menu
    const handleTriggerSplash = () => setShowSplash(true);
    window.addEventListener('tablemint:play-splash', handleTriggerSplash);

    return () => {
      window.removeEventListener('staff:unauthorized', handleUnauthorized);
      window.removeEventListener('tablemint:play-splash', handleTriggerSplash);
    };
  }, []);

  const handleStaffSuccess = () => {
    setIsStaffAuthenticated(true);
    setStaffAuthModalOpen(false);
    // Directly open the Admin Dashboard upon successful login
    setCurrentView('dashboard');
    if (window.location.pathname !== '/' && !window.location.search.includes('table')) {
      window.history.pushState({}, '', '/');
    }
  };

  const switchView = (view) => {
    if ((view === 'dashboard' || view === 'kitchen') && !isStaffAuthenticated) {
      setStaffAuthModalOpen(true);
      return;
    }
    setCurrentView(view);
  };

  // 1. Initial Launch Gate: When the app/link is opened, show ONLY the splash screen.
  // Neither the login/signup page nor the dashboard is mounted or visible in the background!
  if (showSplash) {
    return <TableMintSplashScreen onComplete={handleSplashComplete} />;
  }

  // 2. Strict Staff Auth Gate: When unauthenticated on staff screens,
  // ONLY the Login and Sign Up full-page view is rendered! The dashboard is never rendered in the background.
  if (currentView !== 'customer' && !isStaffAuthenticated) {
    return (
      <ToastProvider>
        <StaffAuthModal
          isOpen={true}
          fullPage={true}
          onSuccess={handleStaffSuccess}
        />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="app-root">
        {/* Top App Role Switcher Bar (Only shown on staff screens like Kitchen/Stands, NEVER on Customer Menu or Dashboard) */}
        {currentView !== 'dashboard' && currentView !== 'customer' && !new URLSearchParams(window.location.search).get('table') && (
          <div
            className="no-print"
            style={{
              background: 'rgba(11, 16, 29, 0.95)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              zIndex: 900,
              backdropFilter: 'blur(16px)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#000',
                  fontWeight: 900,
                  fontSize: '0.72rem',
                  padding: '3px 8px',
                  borderRadius: 6
                }}
              >
                TABLEMINT
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Staff Terminal
              </span>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`filter-pill-btn ${currentView === 'dashboard' ? 'active' : ''}`}
                onClick={() => switchView('dashboard')}
                title="Admin & POS Dashboard"
              >
                <LayoutDashboard size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                POS Dashboard
              </button>
              <button
                className={`filter-pill-btn ${currentView === 'kitchen' ? 'active' : ''}`}
                onClick={() => switchView('kitchen')}
                title="Kitchen Display System"
              >
                <ChefHat size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Kitchen KDS
              </button>
              <button
                className={`filter-pill-btn ${currentView === 'stands' ? 'active' : ''}`}
                onClick={() => switchView('stands')}
                title="Print QR Acrylic Stands"
              >
                <QrCode size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                QR Stands
              </button>
            </div>
          </div>
        )}

        {/* Current Active View */}
        <main>
          {currentView === 'customer' && (
            <CustomerApp
              initialTable={
                parseInt(new URLSearchParams(window.location.search).get('table'), 10) || 1
              }
              initialToken={new URLSearchParams(window.location.search).get('token') || ''}
            />
          )}
          <Suspense fallback={<ViewLoadingSpinner />}>
            {currentView === 'dashboard' && (
              <DashboardApp
                onLockStaff={() => {
                  setIsStaffAuthenticated(false);
                  setStaffAuthModalOpen(true);
                }}
              />
            )}
            {currentView === 'kitchen' && <KitchenKdsApp />}
            {currentView === 'stands' && (
              <QrStandsApp onBack={() => switchView('dashboard')} />
            )}
          </Suspense>
        </main>

        {/* Staff Authentication PIN Modal */}
        <StaffAuthModal
          isOpen={staffAuthModalOpen}
          onSuccess={handleStaffSuccess}
          onClose={currentView === 'customer' ? () => setStaffAuthModalOpen(false) : null}
        />
      </div>
    </ToastProvider>
  );
}
