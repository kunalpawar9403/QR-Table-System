import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getStaffToken, checkStaffAuth } from '../../utils/staffAuth';

export default function ProtectedRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getStaffToken()));
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    checkStaffAuth().then((authed) => {
      if (mounted) {
        setIsAuthenticated(authed);
        setChecking(false);
      }
    }).catch(() => {
      if (mounted) {
        setIsAuthenticated(Boolean(getStaffToken()));
        setChecking(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  if (checking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#07241a',
        color: '#10b981',
        gap: 16
      }}>
        <div style={{
          width: 44,
          height: 44,
          border: '3px solid rgba(16, 185, 129, 0.2)',
          borderTopColor: '#10b981',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600 }}>
          Authenticating TableMint POS...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  return children;
}
