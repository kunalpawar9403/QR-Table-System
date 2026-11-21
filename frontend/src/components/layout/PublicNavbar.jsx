import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight, LayoutDashboard } from 'lucide-react';
import { getStaffToken, logoutStaff } from '../../utils/staffAuth';
import BrandMark from '../marketing/BrandMark';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Features', to: '/features' },
  { label: 'How It Works', to: '/how-it-works' },
  { label: 'Solutions', to: '/solutions' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Demo', to: '/demo' },
  { label: 'Contact', to: '/contact' }
];

export default function PublicNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAuthed, setIsAuthed] = useState(Boolean(getStaffToken()));
  const navigate = useNavigate();
  const location = useLocation();

  const closeMenu = () => setMobileMenuOpen(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync auth state
  useEffect(() => {
    setIsAuthed(Boolean(getStaffToken()));
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    logoutStaff();
    setIsAuthed(false);
    navigate('/');
  };

  return (
    <>
      <header className={`tm-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="tm-nav-inner">
          <BrandMark onClick={closeMenu} />

          <nav className="tm-nav-links" aria-label="Main navigation">
            {NAV_LINKS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => {
                  if (item.to === '/') {
                    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                  }
                }}
                className={({ isActive }) => `tm-nav-item ${isActive ? 'active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="tm-nav-actions">
            {isAuthed ? (
              <>
                <button type="button" onClick={handleLogout} className="tm-btn tm-btn-ghost tm-btn-sm">
                  Logout
                </button>
                <Link to="/dashboard" className="tm-btn tm-btn-primary tm-btn-sm">
                  <LayoutDashboard size={15} />
                  <span>Dashboard</span>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="tm-btn tm-btn-ghost tm-btn-sm">
                  Login
                </Link>
                <Link to="/register" className="tm-btn tm-btn-primary tm-btn-sm">
                  <span>Get Started</span>
                  <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="tm-nav-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="tm-mobile-drawer"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile drawer — kept outside the blurred header so fixed positioning targets the viewport */}
      <div
        className={`tm-drawer-backdrop ${mobileMenuOpen ? 'is-open' : ''}`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      <aside
        id="tm-mobile-drawer"
        className={`tm-drawer ${mobileMenuOpen ? 'is-open' : ''}`}
        aria-label="Mobile navigation"
        inert={!mobileMenuOpen}
      >
        <div className="tm-drawer-head">
          <BrandMark size={30} onClick={closeMenu} />
          <button
            type="button"
            className="tm-nav-toggle"
            onClick={closeMenu}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <div className="tm-drawer-body">
          <nav className="tm-drawer-nav">
            {NAV_LINKS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => {
                  closeMenu();
                  if (item.to === '/') {
                    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                  }
                }}
                className={({ isActive }) => `tm-drawer-link ${isActive ? 'active' : ''}`}
              >
                <span>{item.label}</span>
                <ArrowRight size={16} />
              </NavLink>
            ))}
          </nav>

          <div className="tm-drawer-actions">
            {isAuthed ? (
              <>
                <Link to="/dashboard" onClick={closeMenu} className="tm-btn tm-btn-primary tm-btn-lg tm-btn-block">
                  <LayoutDashboard size={16} />
                  <span>Open POS Dashboard</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    handleLogout();
                  }}
                  className="tm-btn tm-btn-secondary tm-btn-lg tm-btn-block tm-drawer-logout"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={closeMenu} className="tm-btn tm-btn-secondary tm-btn-lg tm-btn-block">
                  Login to Account
                </Link>
                <Link to="/register" onClick={closeMenu} className="tm-btn tm-btn-primary tm-btn-lg tm-btn-block">
                  <span>Start Free Trial</span>
                  <ArrowRight size={16} />
                </Link>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
