import React, { useState, useEffect } from 'react';
import CustomerApp from './pages/CustomerApp';
import DashboardApp from './pages/DashboardApp';
import KitchenKdsApp from './pages/KitchenKdsApp';
import QrStandsApp from './pages/QrStandsApp';
import StaffAuthModal from './components/StaffAuthModal';
import { ToastProvider } from './components/Toast';
import { checkStaffAuth, getStaffToken } from './utils/staffAuth';
import { Utensils, LayoutDashboard, ChefHat, QrCode, Lock } from 'lucide-react';
import './index.css';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState(false);
  const [staffAuthModalOpen, setStaffAuthModalOpen] = useState(false);

  useEffect(() => {
    // Determine view from URL path or search param
    const path = window.location.pathname;
    const search = window.location.search;
    const urlParams = new URLSearchParams(search);

    if (urlParams.get('table')) {
      setCurrentView('customer');
    } else if (path.includes('kitchen')) {
      setCurrentView('kitchen');
    } else if (path.includes('qr-stands')) {
      setCurrentView('stands');
    } else if (path.includes('customer') || search.includes('customer')) {
      setCurrentView('customer');
    } else {
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
    return () => window.removeEventListener('staff:unauthorized', handleUnauthorized);
  }, []);

  const handleStaffSuccess = () => {
    setIsStaffAuthenticated(true);
    setStaffAuthModalOpen(false);
  };

  const switchView = (view) => {
    if ((view === 'dashboard' || view === 'kitchen') && !isStaffAuthenticated) {
      setStaffAuthModalOpen(true);
      return;
    }
    setCurrentView(view);
  };

  return (
    <ToastProvider>
      <div className="app-root">
        {/* Top App Role Switcher Bar (Only shown on non-dashboard screens or as discrete floater) */}
        {currentView !== 'dashboard' && (
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
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#000',
                  fontWeight: 900,
                  fontSize: '0.72rem',
                  padding: '3px 8px',
                  borderRadius: 6
                }}
              >
                SPICE GARDEN
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                React + Vite Suite
              </span>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`filter-pill-btn ${currentView === 'customer' ? 'active' : ''}`}
                onClick={() => switchView('customer')}
                title="Customer Phone Menu View"
              >
                <Utensils size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Customer Menu
              </button>
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
          {currentView === 'customer' && <CustomerApp />}
          {currentView === 'dashboard' && (
            <DashboardApp onLockStaff={() => setStaffAuthModalOpen(true)} />
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
