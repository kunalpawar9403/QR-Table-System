import React, { useState, useEffect } from 'react';
import {
  Check,
  CheckCircle2,
  ArrowRight,
  Play,
  CreditCard,
  Clock,
  Sparkles,
  Headphones,
  Laptop,
  Smartphone,
  Tablet,
  LayoutDashboard,
  UtensilsCrossed,
  Receipt,
  ChefHat,
  BookOpen,
  BarChart3,
  Users,
  QrCode,
  Coffee,
  Wine,
  Store,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Star,
  X,
  Menu,
  PhoneCall,
  Calendar
} from 'lucide-react';
import { TableMintLogoIcon } from '../components/TableMintLogoIcon';
import '../styles/landing.css';

export default function TableMintLandingPage({
  onOpenRegister,
  onOpenLogin,
  onGoToDashboard,
  isAuthenticated,
  currentUser,
  onLogout
}) {
  // Pricing toggle state
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'

  // Key Screens Carousel state
  const [activeScreenIndex, setActiveScreenIndex] = useState(0);

  // Modals
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [bookDemoModalOpen, setBookDemoModalOpen] = useState(false);
  const [bookSuccess, setBookSuccess] = useState(false);
  const [bookFormData, setBookFormData] = useState({
    name: '',
    restaurant: '',
    phone: '',
    date: ''
  });

  // Mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Key screens list matching the reference image
  const keyScreens = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      subtitle: 'Overview of your business with key insights',
      image: '/images/landing/screen_dashboard.jpg'
    },
    {
      id: 'tables',
      title: 'Table Management',
      subtitle: 'Visual floor plan and table status in real-time',
      image: '/images/landing/screen_tables.jpg'
    },
    {
      id: 'billing',
      title: 'POS Billing',
      subtitle: 'Create bills with ease, split tickets and multiple payment options',
      image: '/images/landing/screen_pos_billing.jpg'
    },
    {
      id: 'orders',
      title: 'Orders Management',
      subtitle: 'Track all dine-in, takeaway and QR orders in real-time',
      image: '/images/landing/hero_pos_mockup.jpg'
    },
    {
      id: 'kds',
      title: 'Kitchen Display',
      subtitle: 'Live kitchen orders with preparation timers and instant status sync',
      image: '/images/landing/devices_showcase.jpg'
    }
  ];

  // Auto rotate carousel every 6s unless hovered
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveScreenIndex((prev) => (prev + 1) % keyScreens.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [keyScreens.length]);

  const handleNextScreen = () => {
    setActiveScreenIndex((prev) => (prev + 1) % keyScreens.length);
  };

  const handlePrevScreen = () => {
    setActiveScreenIndex((prev) => (prev - 1 + keyScreens.length) % keyScreens.length);
  };

  const handleBookDemoSubmit = (e) => {
    e.preventDefault();
    setBookSuccess(true);
    setTimeout(() => {
      setBookSuccess(false);
      setBookDemoModalOpen(false);
      setBookFormData({ name: '', restaurant: '', phone: '', date: '' });
    }, 2200);
  };

  return (
    <div className="tm-landing-root">
      {/* =========================================================
          1. NAVIGATION HEADER
          ========================================================= */}
      <header className="tm-navbar">
        <div className="tm-container tm-navbar-inner">
          {/* Logo */}
          <div className="tm-brand-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="tm-logo-icon-wrap">
              <TableMintLogoIcon size={24} />
            </div>
            <div className="tm-brand-text">
              <span className="tm-brand-title">
                Table<span>Mint</span>
              </span>
              <span className="tm-brand-tagline">RESTAURANT POS</span>
            </div>
          </div>

          {/* Navigation items */}
          <nav className="tm-nav-links">
            <a href="#hero" className="tm-nav-link active">Home</a>
            <a href="#features" className="tm-nav-link">Features</a>
            <a href="#how-it-works" className="tm-nav-link">How It Works</a>
            <a href="#screens" className="tm-nav-link">Key Screens</a>
            <a href="#pricing" className="tm-nav-link">Pricing</a>
            <a href="#testimonials" className="tm-nav-link">Testimonials</a>
          </nav>

          {/* Nav CTA actions */}
          <div className="tm-nav-actions">
            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  type="button"
                  className="tm-btn-dashboard-pulse"
                  onClick={onGoToDashboard}
                  title="Open Admin POS Dashboard"
                >
                  <LayoutDashboard size={15} />
                  <span>Go to Dashboard</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  className="tm-btn-login"
                  onClick={onLogout}
                  style={{ fontSize: '0.84rem', color: '#94a3b8' }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="tm-btn-login"
                  onClick={() => onOpenLogin && onOpenLogin()}
                >
                  Login
                </button>
                <button
                  type="button"
                  className="tm-btn-get-started"
                  onClick={() => onOpenRegister && onOpenRegister()}
                >
                  Get Started
                </button>
              </>
            )}

            {/* Mobile menu hamburger */}
            <button
              type="button"
              className="tm-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>

        {/* Mobile Slide-Over Backdrop */}
        <div 
          className={`tm-drawer-backdrop ${mobileMenuOpen ? 'active' : ''}`}
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden={!mobileMenuOpen}
        />

        {/* Mobile Slide-Over Drawer (Right-to-Left) */}
        <aside 
          className={`tm-drawer-panel ${mobileMenuOpen ? 'open' : ''}`}
          aria-label="Mobile Navigation"
          aria-hidden={!mobileMenuOpen}
        >
          <div className="tm-drawer-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <TableMintLogoIcon size={30} />
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF' }}>
                Table<span style={{ color: '#16C995' }}>Mint</span>
              </span>
            </div>
            <button
              type="button"
              className="tm-drawer-close-btn"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>
          </div>

          <div className="tm-drawer-body">
            <nav className="tm-drawer-nav">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="tm-mobile-nav-link"
              >
                <span>Features</span>
                <ChevronRight size={16} className="tm-drawer-link-arrow" />
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="tm-mobile-nav-link"
              >
                <span>How It Works</span>
                <ChevronRight size={16} className="tm-drawer-link-arrow" />
              </a>
              <a
                href="#screens"
                onClick={() => setMobileMenuOpen(false)}
                className="tm-mobile-nav-link"
              >
                <span>Key Screens</span>
                <ChevronRight size={16} className="tm-drawer-link-arrow" />
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="tm-mobile-nav-link"
              >
                <span>Pricing</span>
                <ChevronRight size={16} className="tm-drawer-link-arrow" />
              </a>
            </nav>

            <div className="tm-drawer-actions">
              <button
                className="tm-drawer-btn tm-drawer-btn-secondary"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLogin && onOpenLogin();
                }}
              >
                Sign In
              </button>
              <button
                className="tm-drawer-btn tm-drawer-btn-primary"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenRegister && onOpenRegister();
                }}
              >
                <span>Get Started</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </aside>
      </header>

      {/* =========================================================
          2. HERO SECTION
          ========================================================= */}
      <section id="hero" className="tm-hero-section">
        <div className="tm-container tm-hero-grid">
          {/* Left Hero Content */}
          <div className="tm-hero-content">
            <h1 className="tm-hero-heading">
              Smart Restaurant POS for Modern{' '}
              <span className="highlight-mint">Restaurants</span>
            </h1>

            <p className="tm-hero-subtitle">
              Manage tables, take orders, generate bills, and grow your restaurant — all in one easy platform.
            </p>

            {/* Checklist */}
            <div className="tm-hero-checklist">
              <div className="tm-check-item">
                <span className="tm-check-circle">
                  <Check size={12} strokeWidth={3} />
                </span>
                <span>Easy to use</span>
              </div>
              <div className="tm-check-item">
                <span className="tm-check-circle">
                  <Check size={12} strokeWidth={3} />
                </span>
                <span>Works on all devices</span>
              </div>
              <div className="tm-check-item">
                <span className="tm-check-circle">
                  <Check size={12} strokeWidth={3} />
                </span>
                <span>Perfect for cafes, restaurants, and bars</span>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="tm-hero-cta-group">
              <button
                type="button"
                className="tm-btn-hero-primary"
                onClick={() => (isAuthenticated ? onGoToDashboard() : onOpenRegister())}
              >
                <span>{isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}</span>
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                className="tm-btn-hero-demo"
                onClick={() => setDemoModalOpen(true)}
              >
                <span className="tm-play-icon-circle">
                  <Play size={10} fill="currentColor" />
                </span>
                <span>Watch Demo</span>
              </button>
            </div>

            {/* Trust Bar */}
            <div className="tm-hero-trust-bar">
              <div className="tm-trust-item">
                <CreditCard size={15} color="#10b981" />
                <span>No credit card required</span>
              </div>
              <span className="tm-trust-divider">|</span>
              <div className="tm-trust-item">
                <Clock size={15} color="#10b981" />
                <span>Setup in minutes</span>
              </div>
              <span className="tm-trust-divider">|</span>
              <div className="tm-trust-item">
                <Sparkles size={15} color="#10b981" />
                <span>7 days free trial</span>
              </div>
            </div>
          </div>

          {/* Right Hero Mockup */}
          <div className="tm-hero-visual">
            <div className="tm-mockup-glow" />
            <div className="tm-hero-image-wrap">
              <img
                src="/images/landing/hero_pos_mockup.jpg"
                alt="TableMint Restaurant POS on Laptop and Mobile"
                className="tm-hero-mockup-img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          3. "EVERYTHING YOU NEED TO RUN YOUR RESTAURANT"
          ========================================================= */}
      <section id="features" className="tm-features-section">
        <div className="tm-container">
          <div className="tm-section-header-row">
            <div className="tm-section-title-wrap">
              <h2 className="tm-section-h2">Everything You Need to Run Your Restaurant</h2>
              <p className="tm-section-subtext">
                Powerful features designed to simplify your restaurant operations and give you more time to focus on great food.
              </p>
            </div>
            <button
              type="button"
              className="tm-section-link-btn"
              onClick={() => onOpenRegister()}
            >
              <span>View All Features</span>
              <ArrowRight size={15} />
            </button>
          </div>

          {/* 8 Feature Cards matching the reference image */}
          <div className="tm-features-grid">
            {/* Card 1 */}
            <div className="tm-feature-card">
              <div className="tm-feature-icon-box green">
                <LayoutDashboard size={24} />
              </div>
              <h3 className="tm-feature-title">Table Management</h3>
              <p className="tm-feature-desc">Manage tables, floors and real-time status</p>
            </div>

            {/* Card 2 */}
            <div className="tm-feature-card">
              <div className="tm-feature-icon-box orange">
                <Receipt size={24} />
              </div>
              <h3 className="tm-feature-title">POS Billing</h3>
              <p className="tm-feature-desc">Quick and easy billing with multiple payment options</p>
            </div>

            {/* Card 3 */}
            <div className="tm-feature-card">
              <div className="tm-feature-icon-box blue">
                <UtensilsCrossed size={24} />
              </div>
              <h3 className="tm-feature-title">Order Management</h3>
              <p className="tm-feature-desc">Track orders from placement to serving</p>
            </div>

            {/* Card 4 */}
            <div className="tm-feature-card">
              <div className="tm-feature-icon-box purple">
                <ChefHat size={24} />
              </div>
              <h3 className="tm-feature-title">Kitchen Display (KDS)</h3>
              <p className="tm-feature-desc">Live kitchen orders with preparation timers</p>
            </div>

            {/* Card 5 */}
            <div className="tm-feature-card">
              <div className="tm-feature-icon-box amber">
                <BookOpen size={24} />
              </div>
              <h3 className="tm-feature-title">Menu Management</h3>
              <p className="tm-feature-desc">Add, edit and organize menu items with images</p>
            </div>

            {/* Card 6 */}
            <div className="tm-feature-card">
              <div className="tm-feature-icon-box cyan">
                <BarChart3 size={24} />
              </div>
              <h3 className="tm-feature-title">Reports & Analytics</h3>
              <p className="tm-feature-desc">Get insights on sales, popular items and more</p>
            </div>

            {/* Card 7 */}
            <div className="tm-feature-card">
              <div className="tm-feature-icon-box teal">
                <Users size={24} />
              </div>
              <h3 className="tm-feature-title">Staff Management</h3>
              <p className="tm-feature-desc">Manage roles and access for your team</p>
            </div>

            {/* Card 8 */}
            <div className="tm-feature-card">
              <div className="tm-feature-icon-box indigo">
                <QrCode size={24} />
              </div>
              <h3 className="tm-feature-title">QR Menu (Optional)</h3>
              <p className="tm-feature-desc">Customers can scan QR and view digital menu</p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          4. "HOW TABLEMINT WORKS" (3 STEPS)
          ========================================================= */}
      <section id="how-it-works" className="tm-how-it-works-section">
        <div className="tm-container">
          <div className="tm-steps-header">
            <h2 className="tm-section-h2">How TableMint Works</h2>
            <p className="tm-section-subtext">
              Get started in 3 simple steps and streamline your restaurant operations.
            </p>
          </div>

          <div className="tm-steps-row">
            {/* Step 1 */}
            <div className="tm-step-card">
              <div className="tm-step-top">
                <div className="tm-step-icon-badge step-1">
                  <Store size={26} />
                </div>
                <div className="tm-step-connector" />
              </div>
              <div className="tm-step-number-title">
                <span className="tm-step-badge-num">1</span>
                <h3 className="tm-step-title">Setup Your Restaurant</h3>
              </div>
              <p className="tm-step-desc">
                Add your tables, menu items and basic settings.
              </p>
            </div>

            {/* Step 2 */}
            <div className="tm-step-card">
              <div className="tm-step-top">
                <div className="tm-step-icon-badge step-2">
                  <Receipt size={26} />
                </div>
                <div className="tm-step-connector" />
              </div>
              <div className="tm-step-number-title">
                <span className="tm-step-badge-num">2</span>
                <h3 className="tm-step-title">Start Taking Orders</h3>
              </div>
              <p className="tm-step-desc">
                Use POS or QR menu to take orders and send to kitchen.
              </p>
            </div>

            {/* Step 3 */}
            <div className="tm-step-card">
              <div className="tm-step-top">
                <div className="tm-step-icon-badge step-3">
                  <BarChart3 size={26} />
                </div>
              </div>
              <div className="tm-step-number-title">
                <span className="tm-step-badge-num">3</span>
                <h3 className="tm-step-title">Manage & Grow</h3>
              </div>
              <p className="tm-step-desc">
                Track orders, view reports and grow your business.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          5. "WORKS ON ALL DEVICES"
          ========================================================= */}
      <section className="tm-devices-section">
        <div className="tm-container tm-devices-grid">
          <div className="tm-devices-content">
            <h2 className="tm-section-h2">Works on All Devices</h2>
            <p className="tm-section-subtext">
              Access your restaurant from desktop, tablet or mobile — anytime, anywhere.
            </p>

            <div className="tm-responsive-note">
              <Sparkles size={16} />
              <span>Responsive design for all screens</span>
            </div>
          </div>

          <div className="tm-devices-image-wrap">
            <img
              src="/images/landing/devices_showcase.jpg"
              alt="TableMint Works on Desktop, Laptop, iPad and iPhone"
              className="tm-devices-img"
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          6. "PERFECT FOR ALL TYPES OF RESTAURANTS"
          ========================================================= */}
      <section className="tm-types-section">
        <div className="tm-container">
          <div className="tm-types-banner-card">
            <h2 className="tm-types-heading">Perfect for All Types of Restaurants</h2>

            <div className="tm-types-grid">
              {/* Type 1: Cafes */}
              <div className="tm-type-item" onClick={() => onOpenRegister()}>
                <img
                  src="/images/landing/type_cafe.jpg"
                  alt="Cafes"
                  className="tm-type-img"
                />
                <div className="tm-type-overlay">
                  <span className="tm-type-label">
                    <Coffee size={18} color="#10b981" />
                    Cafes
                  </span>
                </div>
              </div>

              {/* Type 2: Restaurants */}
              <div className="tm-type-item" onClick={() => onOpenRegister()}>
                <img
                  src="/images/landing/type_restaurant.jpg"
                  alt="Restaurants"
                  className="tm-type-img"
                />
                <div className="tm-type-overlay">
                  <span className="tm-type-label">
                    <UtensilsCrossed size={18} color="#10b981" />
                    Restaurants
                  </span>
                </div>
              </div>

              {/* Type 3: Bars */}
              <div className="tm-type-item" onClick={() => onOpenRegister()}>
                <img
                  src="/images/landing/type_bar.jpg"
                  alt="Bars"
                  className="tm-type-img"
                />
                <div className="tm-type-overlay">
                  <span className="tm-type-label">
                    <Wine size={18} color="#10b981" />
                    Bars
                  </span>
                </div>
              </div>

              {/* Type 4: Cloud Kitchens */}
              <div className="tm-type-item" onClick={() => onOpenRegister()}>
                <img
                  src="/images/landing/type_cloud_kitchen.jpg"
                  alt="Cloud Kitchens"
                  className="tm-type-img"
                />
                <div className="tm-type-overlay">
                  <span className="tm-type-label">
                    <ChefHat size={18} color="#10b981" />
                    Cloud Kitchens
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          7. "KEY SCREENS" (CAROUSEL / SLIDER)
          ========================================================= */}
      <section id="screens" className="tm-screens-section">
        <div className="tm-container">
          <div className="tm-section-header-row">
            <div className="tm-section-title-wrap">
              <h2 className="tm-section-h2">Key Screens</h2>
              <p className="tm-section-subtext">
                A quick look at the powerful features you get after login.
              </p>
            </div>

            <div className="tm-carousel-arrows">
              <button
                type="button"
                className="tm-carousel-arrow-btn"
                onClick={handlePrevScreen}
                aria-label="Previous screen"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                className="tm-carousel-arrow-btn"
                onClick={handleNextScreen}
                aria-label="Next screen"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Screen Tabs */}
          <div className="tm-screens-carousel-wrapper">
            <div className="tm-screens-nav-row">
              <div className="tm-screen-tabs">
                {keyScreens.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`tm-screen-tab-btn ${activeScreenIndex === idx ? 'active' : ''}`}
                    onClick={() => setActiveScreenIndex(idx)}
                  >
                    {s.title}
                  </button>
                ))}
              </div>

              <div className="tm-carousel-dots">
                {keyScreens.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`tm-carousel-dot ${activeScreenIndex === idx ? 'active' : ''}`}
                    onClick={() => setActiveScreenIndex(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Main Carousel Screen Preview */}
            <div className="tm-screen-display-card">
              <img
                src={keyScreens[activeScreenIndex].image}
                alt={keyScreens[activeScreenIndex].title}
              />
              <div className="tm-screen-info-footer">
                <div className="tm-screen-footer-text">
                  <h4>{keyScreens[activeScreenIndex].title}</h4>
                  <p>{keyScreens[activeScreenIndex].subtitle}</p>
                </div>
                <button
                  type="button"
                  className="tm-btn-get-started"
                  style={{ fontSize: '0.85rem', padding: '8px 18px' }}
                  onClick={() => onOpenRegister()}
                >
                  Try this Screen Free
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          8. "SIMPLE & TRANSPARENT PRICING"
          ========================================================= */}
      <section id="pricing" className="tm-pricing-section">
        <div className="tm-container">
          <div className="tm-pricing-header">
            <h2 className="tm-section-h2">Simple & Transparent Pricing</h2>
            <p className="tm-section-subtext">
              Choose a plan that fits your restaurant's needs. No hidden charges.
            </p>

            {/* Monthly / Yearly Switch */}
            <div className="tm-pricing-toggle-wrap">
              <button
                type="button"
                className={`tm-pricing-toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
                onClick={() => setBillingCycle('monthly')}
              >
                Monthly
              </button>
              <button
                type="button"
                className={`tm-pricing-toggle-btn ${billingCycle === 'yearly' ? 'active' : ''}`}
                onClick={() => setBillingCycle('yearly')}
              >
                Yearly <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>Save 20%</span>
              </button>
            </div>
          </div>

          <div className="tm-pricing-grid">
            {/* Starter Plan */}
            <div className="tm-pricing-card">
              <h3 className="tm-plan-name">Starter</h3>
              <div className="tm-plan-price-row">
                <span className="tm-plan-currency">₹</span>
                <span className="tm-plan-amount">
                  {billingCycle === 'yearly' ? '799' : '999'}
                </span>
                <span className="tm-plan-period">/month</span>
              </div>

              <ul className="tm-plan-features-list">
                <li className="tm-plan-feature-item">
                  <Check size={16} />
                  <span>Up to 5 tables</span>
                </li>
                <li className="tm-plan-feature-item">
                  <Check size={16} />
                  <span>POS Billing</span>
                </li>
                <li className="tm-plan-feature-item">
                  <Check size={16} />
                  <span>Menu Management</span>
                </li>
                <li className="tm-plan-feature-item">
                  <Check size={16} />
                  <span>Kitchen Display</span>
                </li>
                <li className="tm-plan-feature-item">
                  <Check size={16} />
                  <span>Basic Reports</span>
                </li>
              </ul>

              <button
                type="button"
                className="tm-btn-plan-select"
                onClick={() => onOpenRegister('starter')}
              >
                Get Started
              </button>
            </div>

            {/* Standard Plan (Most Popular) */}
            <div className="tm-pricing-card popular">
              <span className="tm-pricing-popular-badge">Most Popular</span>
              <h3 className="tm-plan-name">Standard</h3>
              <div className="tm-plan-price-row">
                <span className="tm-plan-currency">₹</span>
                <span className="tm-plan-amount">
                  {billingCycle === 'yearly' ? '1,599' : '1,999'}
                </span>
                <span className="tm-plan-period">/month</span>
              </div>

              <ul className="tm-plan-features-list">
                <li className="tm-plan-feature-item">
                  <Check size={16} />
                  <span>Up to 15 tables</span>
                </li>
                <li className="tm-plan-feature-item">
                  <Check size={16} />
                  <span>All Starter Features</span>
                </li>
                <li className="tm-plan-feature-item">
                  <Check size={16} />
                  <span>Order Management</span>
                </li>
                <li className="tm-plan-feature-item">
                  <Check size={16} />
                  <span>Staff Management</span>
                </li>
                <li className="tm-plan-feature-item">
                  <Check size={16} />
                  <span>Advanced Reports</span>
                </li>
                <li className="tm-plan-feature-item">
                  <Check size={16} />
                  <span>QR Menu (Optional)</span>
                </li>
              </ul>

              <button
                type="button"
                className="tm-btn-plan-select primary"
                onClick={() => onOpenRegister('standard')}
              >
                Get Started
              </button>
            </div>

            {/* Premium Plan */}
            <div className="tm-pricing-card">
              <h3 className="tm-plan-name">Premium</h3>
              <div className="tm-plan-price-row">
                <span className="tm-plan-currency">₹</span>
                <span className="tm-plan-amount">
                  {billingCycle === 'yearly' ? '3,199' : '3,999'}
                </span>
                <span className="tm-plan-period">/month</span>
              </div>

              <ul className="tm-plan-features-list">
                <li className="tm-plan-feature-item">
                  <Check size={16} />
                  <span>Unlimited tables</span>
                </li>
                <li className="tm-plan-feature-item">
                  <Check size={16} />
                  <span>All Standard Features</span>
                </li>
                <li className="tm-plan-feature-item">
                  <Check size={16} />
                  <span>Multi-branch Support</span>
                </li>
                <li className="tm-plan-feature-item">
                  <Check size={16} />
                  <span>Detailed Analytics</span>
                </li>
                <li className="tm-plan-feature-item">
                  <Check size={16} />
                  <span>Priority Support</span>
                </li>
                <li className="tm-plan-feature-item">
                  <Check size={16} />
                  <span>Custom Branding</span>
                </li>
              </ul>

              <button
                type="button"
                className="tm-btn-plan-select"
                onClick={() => onOpenRegister('premium')}
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          9. "TRUSTED BY RESTAURANT OWNERS" (TESTIMONIALS)
          ========================================================= */}
      <section id="testimonials" className="tm-testimonials-section">
        <div className="tm-container">
          <div className="tm-section-header-row">
            <div className="tm-section-title-wrap">
              <h2 className="tm-section-h2">Trusted by Restaurant Owners</h2>
              <p className="tm-section-subtext">
                Join hundreds of happy customers across India.
              </p>
            </div>
            <button
              type="button"
              className="tm-section-link-btn"
              onClick={() => onOpenRegister()}
            >
              <span>View All Reviews</span>
              <ArrowRight size={15} />
            </button>
          </div>

          <div className="tm-testimonials-grid">
            {/* Review 1: Rohan Patil */}
            <div className="tm-testimonial-card">
              <div className="tm-testimonial-header">
                <div className="tm-author-wrap">
                  <img
                    src="/images/landing/avatar_rohan.jpg"
                    alt="Rohan Patil"
                    className="tm-author-avatar"
                  />
                  <div>
                    <h4 className="tm-author-name">Rohan Patil</h4>
                    <p className="tm-author-role">Cafe Owner, Pune</p>
                  </div>
                </div>
                <div className="tm-star-rating">★★★★★</div>
              </div>
              <p className="tm-testimonial-quote">
                "TableMint has made our billing and order management so easy. The interface is clean and very simple to use."
              </p>
            </div>

            {/* Review 2: Sneha Kulkarni */}
            <div className="tm-testimonial-card">
              <div className="tm-testimonial-header">
                <div className="tm-author-wrap">
                  <img
                    src="/images/landing/avatar_sneha.jpg"
                    alt="Sneha Kulkarni"
                    className="tm-author-avatar"
                  />
                  <div>
                    <h4 className="tm-author-name">Sneha Kulkarni</h4>
                    <p className="tm-author-role">Restaurant Owner, Mumbai</p>
                  </div>
                </div>
                <div className="tm-star-rating">★★★★★</div>
              </div>
              <p className="tm-testimonial-quote">
                "The table management and kitchen display work perfectly. Our staff can handle more orders now."
              </p>
            </div>

            {/* Review 3: Amit Sharma */}
            <div className="tm-testimonial-card">
              <div className="tm-testimonial-header">
                <div className="tm-author-wrap">
                  <img
                    src="/images/landing/avatar_amit.jpg"
                    alt="Amit Sharma"
                    className="tm-author-avatar"
                  />
                  <div>
                    <h4 className="tm-author-name">Amit Sharma</h4>
                    <p className="tm-author-role">Bar Owner, Bangalore</p>
                  </div>
                </div>
                <div className="tm-star-rating">★★★★★</div>
              </div>
              <p className="tm-testimonial-quote">
                "Great support and useful features. The reports help us understand our business better."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          10. BOTTOM CTA BANNER ("READY TO TRANSFORM YOUR RESTAURANT?")
          ========================================================= */}
      <section className="tm-cta-section">
        <div className="tm-container">
          <div className="tm-cta-banner">
            <img
              src="/images/landing/cta_restaurant_bg.jpg"
              alt="Restaurant Atmosphere"
              className="tm-cta-bg-img"
            />
            <div className="tm-cta-overlay" />

            <div className="tm-cta-content">
              <h2 className="tm-cta-heading">Ready to Transform Your Restaurant?</h2>
              <p className="tm-cta-subtext">
                Join hundreds of restaurant owners who trust TableMint to run their business smoothly.
              </p>

              <div className="tm-cta-btn-group">
                <button
                  type="button"
                  className="tm-btn-cta-primary"
                  onClick={() => onOpenRegister()}
                >
                  <span>Get Started Free</span>
                  <ArrowRight size={18} />
                </button>

                <button
                  type="button"
                  className="tm-btn-cta-demo"
                  onClick={() => setBookDemoModalOpen(true)}
                >
                  Book a Demo
                </button>
              </div>

              {/* 4 Feature Badges matching reference */}
              <div className="tm-cta-badges-row">
                <div className="tm-cta-badge-item">
                  <CreditCard size={18} />
                  <span>No credit card required</span>
                </div>
                <div className="tm-cta-badge-item">
                  <Calendar size={18} />
                  <span>7 days free trial</span>
                </div>
                <div className="tm-cta-badge-item">
                  <Clock size={18} />
                  <span>Setup in minutes</span>
                </div>
                <div className="tm-cta-badge-item">
                  <Headphones size={18} />
                  <span>Dedicated support</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          11. FOOTER
          ========================================================= */}
      <footer className="tm-footer">
        <div className="tm-container">
          <div className="tm-footer-grid">
            <div className="tm-footer-brand">
              <div className="tm-brand-logo">
                <div className="tm-logo-icon-wrap">
                  <TableMintLogoIcon size={24} />
                </div>
                <div className="tm-brand-text">
                  <span className="tm-brand-title">
                    Table<span>Mint</span>
                  </span>
                  <span className="tm-brand-tagline">RESTAURANT POS</span>
                </div>
              </div>
              <p>
                TableMint is the all-in-one restaurant management platform for modern dining establishments, bars, cafes, and cloud kitchens across India.
              </p>
            </div>

            <div>
              <h4 className="tm-footer-title">Product</h4>
              <ul className="tm-footer-links">
                <li><a href="#features" className="tm-footer-link">POS Billing</a></li>
                <li><a href="#screens" className="tm-footer-link">Table Management</a></li>
                <li><a href="#screens" className="tm-footer-link">Kitchen Display (KDS)</a></li>
                <li><a href="#features" className="tm-footer-link">QR Menu Self-Order</a></li>
                <li><a href="#pricing" className="tm-footer-link">Pricing Plans</a></li>
              </ul>
            </div>

            <div>
              <h4 className="tm-footer-title">Solutions</h4>
              <ul className="tm-footer-links">
                <li><span className="tm-footer-link" onClick={() => onOpenRegister()}>Fine Dining</span></li>
                <li><span className="tm-footer-link" onClick={() => onOpenRegister()}>Cafes & Bakeries</span></li>
                <li><span className="tm-footer-link" onClick={() => onOpenRegister()}>Bars & Lounges</span></li>
                <li><span className="tm-footer-link" onClick={() => onOpenRegister()}>Cloud Kitchens</span></li>
                <li><span className="tm-footer-link" onClick={() => onOpenRegister()}>QSR & Fast Casual</span></li>
              </ul>
            </div>

            <div>
              <h4 className="tm-footer-title">Contact & Help</h4>
              <ul className="tm-footer-links">
                <li><span className="tm-footer-link" onClick={() => setBookDemoModalOpen(true)}>Book a Free Demo</span></li>
                <li><span className="tm-footer-link" onClick={() => onOpenLogin()}>Staff Terminal Login</span></li>
                <li><span className="tm-footer-link">support@tablemint.com</span></li>
                <li><span className="tm-footer-link">+91 98765 43210</span></li>
              </ul>
            </div>
          </div>

          <div className="tm-footer-bottom">
            <span>© 2026 TableMint Restaurant POS. All rights reserved.</span>
            <span>Designed for Modern Restaurants</span>
          </div>
        </div>
      </footer>

      {/* =========================================================
          12. INTERACTIVE DEMO PREVIEW MODAL
          ========================================================= */}
      {demoModalOpen && (
        <div className="tm-modal-backdrop" onClick={() => setDemoModalOpen(false)}>
          <div className="tm-modal-card" style={{ maxWidth: 760 }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="tm-modal-close-btn"
              onClick={() => setDemoModalOpen(false)}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div className="tm-logo-icon-wrap">
                <TableMintLogoIcon size={22} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>
                TableMint Interactive Live Walkthrough
              </h3>
            </div>

            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: 20 }}>
              <img
                src="/images/landing/screen_dashboard.jpg"
                alt="TableMint POS Demo"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>

            <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              Experience lightning-fast table floor plan monitoring, contactless QR self-ordering, split-bill invoicing, and instant kitchen display ticket sync in action.
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="tm-btn-login"
                style={{ background: '#f1f5f9', color: '#0f172a' }}
                onClick={() => setDemoModalOpen(false)}
              >
                Close Preview
              </button>
              <button
                type="button"
                className="tm-btn-hero-primary"
                style={{ fontSize: '0.92rem', padding: '10px 22px' }}
                onClick={() => {
                  setDemoModalOpen(false);
                  onOpenRegister();
                }}
              >
                <span>Launch Live Free Trial</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          13. "BOOK A DEMO" MODAL
          ========================================================= */}
      {bookDemoModalOpen && (
        <div className="tm-modal-backdrop" onClick={() => setBookDemoModalOpen(false)}>
          <div className="tm-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="tm-modal-close-btn"
              onClick={() => setBookDemoModalOpen(false)}
            >
              <X size={18} />
            </button>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'inline-flex', padding: 8, background: '#ecfdf5', borderRadius: 10, color: '#059669', marginBottom: 12 }}>
                <PhoneCall size={22} />
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', fontWeight: 800 }}>
                Book a Personalized Demo
              </h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
                Our restaurant technology expert will show you how TableMint scales your business.
              </p>
            </div>

            {bookSuccess ? (
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, padding: 24, textAlign: 'center' }}>
                <CheckCircle2 size={40} color="#059669" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ margin: '0 0 6px', color: '#065f46', fontSize: '1.15rem' }}>Demo Scheduled!</h4>
                <p style={{ margin: 0, color: '#047857', fontSize: '0.9rem' }}>
                  Thank you! Our specialist will call you shortly to confirm the scheduled walkthrough.
                </p>
              </div>
            ) : (
              <form onSubmit={handleBookDemoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={bookFormData.name}
                    onChange={(e) => setBookFormData({ ...bookFormData, name: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.92rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Restaurant / Cafe Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Spice Route Bistro"
                    value={bookFormData.restaurant}
                    onChange={(e) => setBookFormData({ ...bookFormData, restaurant: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.92rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Phone / WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={bookFormData.phone}
                    onChange={(e) => setBookFormData({ ...bookFormData, phone: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.92rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Preferred Date & Time
                  </label>
                  <input
                    type="date"
                    required
                    value={bookFormData.date}
                    onChange={(e) => setBookFormData({ ...bookFormData, date: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.92rem' }}
                  />
                </div>

                <button
                  type="submit"
                  className="tm-btn-hero-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                >
                  Confirm Demo Request
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
