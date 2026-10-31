import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  ArrowRight, 
  LayoutDashboard
} from 'lucide-react';
import { getStaffToken, logoutStaff } from '../../utils/staffAuth';

export default function PublicNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAuthed, setIsAuthed] = useState(Boolean(getStaffToken()));
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync auth state
  useEffect(() => {
    setIsAuthed(Boolean(getStaffToken()));
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    logoutStaff();
    setIsAuthed(false);
    navigate('/');
  };

  const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'Features', to: '/features' },
    { label: 'How It Works', to: '/how-it-works' },
    { label: 'Solutions', to: '/solutions' },
    { label: 'Pricing', to: '/pricing' },
    { label: 'Demo', to: '/demo' },
    { label: 'Contact', to: '/contact' }
  ];

  return (
    <header className={`tm-saas-navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="tm-navbar-inner">
        {/* Brand Logo */}
        <Link to="/" className="tm-brand-link" onClick={() => setMobileMenuOpen(false)}>
          <img 
            src="/images/tablemint_icon.png" 
            alt="TableMint Logo" 
            className="tm-brand-logo-img"
            onError={(e) => { e.currentTarget.src = '/images/tablemint_logo.jpg'; }}
          />
          <div>
            <span className="tm-brand-name">Table</span>
            <span className="tm-brand-accent">Mint</span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="tm-nav-links" aria-label="Main Navigation">
          {navLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `tm-nav-item ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Desktop Navbar Actions */}
        <div className="tm-nav-actions">
          {isAuthed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link 
                to="/dashboard" 
                className="tm-btn-primary-nav"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
              >
                <LayoutDashboard size={15} />
                <span>Dashboard</span>
              </Link>
              <button 
                type="button" 
                onClick={handleLogout}
                className="tm-btn-ghost-nav"
                style={{ fontSize: '0.82rem', padding: '7px 12px' }}
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="tm-btn-ghost-nav">
                Login
              </Link>
              <Link to="/register" className="tm-btn-primary-nav">
                <span>Get Started</span>
                <ArrowRight size={14} />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          className="tm-mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Slide-Over Backdrop */}
      <div 
        className={`tm-drawer-backdrop ${mobileMenuOpen ? 'active' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden={!mobileMenuOpen}
      />

      {/* Mobile Slide-Over Drawer (Right to Left) */}
      <aside 
        className={`tm-drawer-panel ${mobileMenuOpen ? 'open' : ''}`}
        aria-label="Mobile Navigation"
        aria-hidden={!mobileMenuOpen}
      >
        {/* Drawer Header */}
        <div className="tm-drawer-header">
          <Link to="/" className="tm-brand-link" onClick={() => setMobileMenuOpen(false)}>
            <img 
              src="/images/tablemint_icon.png" 
              alt="TableMint Logo" 
              className="tm-brand-logo-img"
              onError={(e) => { e.currentTarget.src = '/images/tablemint_logo.jpg'; }}
            />
            <div>
              <span className="tm-brand-name">Table</span>
              <span className="tm-brand-accent">Mint</span>
            </div>
          </Link>
          <button
            type="button"
            className="tm-drawer-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body / Nav Items */}
        <div className="tm-drawer-body">
          <nav className="tm-drawer-nav">
            {navLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `tm-mobile-nav-link ${isActive ? 'active' : ''}`}
              >
                <span>{item.label}</span>
                <ArrowRight size={15} className="tm-drawer-link-arrow" />
              </NavLink>
            ))}
          </nav>

          {/* Drawer Bottom Actions */}
          <div className="tm-drawer-actions">
            {isAuthed ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="tm-drawer-btn tm-drawer-btn-primary"
                >
                  <LayoutDashboard size={16} />
                  <span>Open POS Dashboard</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="tm-drawer-btn tm-drawer-btn-secondary"
                  style={{ color: '#ef4444' }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="tm-drawer-btn tm-drawer-btn-secondary"
                >
                  Login to Account
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="tm-drawer-btn tm-drawer-btn-primary"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight size={15} />
                </Link>
              </>
            )}
          </div>
        </div>
      </aside>
    </header>
  );
}
