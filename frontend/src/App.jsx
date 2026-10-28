import React, { useState, useEffect } from 'react';
import CustomerApp from './pages/CustomerApp';
import DashboardApp from './pages/DashboardApp';
import KitchenKdsApp from './pages/KitchenKdsApp';
import QrStandsApp from './pages/QrStandsApp';
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
  const [showSplash, setShowSplash] = useState(true);

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
    // Play splash loader transition into dashboard upon login
    setShowSplash(true);
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

  // Strict Staff Auth Gate: When unauthenticated after logout or session expiry on staff screens,
  // ONLY the Login and Sign Up full-page view is opened! The dashboard is never rendered in the background.
  if (currentView !== 'customer' && !isStaffAuthenticated) {
    return (
      <ToastProvider>
        {showSplash && (
          <TableMintSplashScreen onComplete={() => setShowSplash(false)} />
        )}
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
      {showSplash && (
        <TableMintSplashScreen onComplete={() => setShowSplash(false)} />
      )}
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
