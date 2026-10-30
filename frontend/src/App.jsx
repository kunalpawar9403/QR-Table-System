import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import PublicLayout from './components/layout/PublicLayout';
import HomePage from './pages/HomePage';
import FeaturesPage from './pages/FeaturesPage';
import HowItWorksPage from './pages/HowItWorksPage';
import SolutionsPage from './pages/SolutionsPage';
import PricingPage from './pages/PricingPage';
import DemoPage from './pages/DemoPage';
import ContactPage from './pages/ContactPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CustomerApp from './pages/CustomerApp';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { ToastProvider } from './components/Toast';
import { logoutStaff } from './utils/staffAuth';
import './index.css';
import './styles/saas-website.css';

const DashboardApp = lazy(() => import('./pages/DashboardApp'));
const KitchenKdsApp = lazy(() => import('./pages/KitchenKdsApp'));
const QrStandsApp = lazy(() => import('./pages/QrStandsApp'));

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('TableMint Dashboard Render Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          background: '#07241a',
          color: '#ffffff',
          padding: 24,
          textAlign: 'center'
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: 800
          }}>
            !
          </div>
          <h2 style={{ color: '#ffffff', margin: 0, fontSize: '1.25rem' }}>Unable to load dashboard view</h2>
          <p style={{ color: '#94a3b8', maxWidth: 480, fontSize: '0.88rem', margin: 0 }}>
            {this.state.error?.message || 'A transient error occurred while preparing your restaurant workspace.'}
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => { window.location.reload(); }}
              style={{
                padding: '10px 20px',
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Reload Page
            </button>
            <button
              type="button"
              onClick={() => { logoutStaff(); window.location.href = '/login'; }}
              style={{
                padding: '10px 20px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Sign In Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ViewLoadingSpinner() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: '#07241a',
        color: '#10b981'
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          border: '3px solid rgba(16, 185, 129, 0.2)',
          borderTopColor: '#10b981',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}
      />
      <span style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600 }}>
        Loading TableMint POS...
      </span>
    </div>
  );
}

// Interceptor component for legacy query parameters (?table=..., ?view=dashboard)
function QueryParamInterceptor({ children }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  // If table QR scanned (e.g., /?table=4&token=xyz), launch Customer self-ordering immediately!
  const tableParam = searchParams.get('table');
  if (tableParam) {
    const tableId = parseInt(tableParam, 10) || 1;
    const token = searchParams.get('token') || '';
    return <CustomerApp initialTable={tableId} initialToken={token} />;
  }

  // If legacy ?view=dashboard visited, redirect to /dashboard
  const viewParam = searchParams.get('view');
  if (viewParam === 'dashboard') {
    return <Navigate to="/dashboard" replace />;
  }
  if (viewParam === 'kitchen') {
    return <Navigate to="/kitchen" replace />;
  }
  if (viewParam === 'stands') {
    return <Navigate to="/stands" replace />;
  }

  return children;
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <QueryParamInterceptor>
          <Routes>
            {/* Public SaaS Marketing Website with shared PublicLayout (Navbar & Footer) */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/solutions" element={<SolutionsPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/demo" element={<DemoPage />} />
              <Route path="/contact" element={<ContactPage />} />
            </Route>

            {/* Standalone Authentication Pages */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Customer Self-Ordering App (when accessed directly via /customer) */}
            <Route path="/customer" element={<CustomerApp />} />

            {/* Protected POS Dashboard & Operational Routes */}
            <Route
              path="/dashboard"
              element={
                <ErrorBoundary>
                  <ProtectedRoute>
                    <Suspense fallback={<ViewLoadingSpinner />}>
                      <DashboardApp
                        onLockStaff={() => {
                          logoutStaff();
                          window.location.href = '/';
                        }}
                        onOpenWebsite={() => {
                          window.location.href = '/';
                        }}
                      />
                    </Suspense>
                  </ProtectedRoute>
                </ErrorBoundary>
              }
            />

            <Route
              path="/kitchen"
              element={
                <ErrorBoundary>
                  <ProtectedRoute>
                    <Suspense fallback={<ViewLoadingSpinner />}>
                      <KitchenKdsApp />
                    </Suspense>
                  </ProtectedRoute>
                </ErrorBoundary>
              }
            />

            <Route
              path="/stands"
              element={
                <ErrorBoundary>
                  <ProtectedRoute>
                    <Suspense fallback={<ViewLoadingSpinner />}>
                      <QrStandsApp onBack={() => { window.location.href = '/dashboard'; }} />
                    </Suspense>
                  </ProtectedRoute>
                </ErrorBoundary>
              }
            />

            {/* Catch-all: redirect any unknown URL to Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </QueryParamInterceptor>
      </BrowserRouter>
    </ToastProvider>
  );
}
