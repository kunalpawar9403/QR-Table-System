import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  CheckCircle, 
  Sparkles, 
  LayoutDashboard, 
  Smartphone, 
  Receipt, 
  ChefHat, 
  TrendingUp, 
  QrCode, 
  ShieldCheck, 
  Zap, 
  Check, 
  ChevronRight,
  Play,
  UtensilsCrossed
} from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import CTASection from '../components/layout/CTASection';

export default function HomePage() {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'

  const features = [
    {
      icon: <LayoutDashboard size={24} />,
      title: "Real-Time POS Dashboard",
      desc: "Live visibility into table occupancy, active orders, today's gross sales, and average ticket size in a unified view.",
      link: "/features#dashboard"
    },
    {
      icon: <UtensilsCrossed size={24} />,
      title: "Interactive Floor & Tables",
      desc: "Color-coded visual table management. Instantly see vacant, seated, dining, and billed tables with 1-click status shifts.",
      link: "/features#table-mgmt"
    },
    {
      icon: <Receipt size={24} />,
      title: "Express Billing & Split Pay",
      desc: "Generate GST-compliant tax invoices in under 3 seconds. Split bills by seat or item with Cash, UPI, and Card options.",
      link: "/features#pos-billing"
    },
    {
      icon: <ChefHat size={24} />,
      title: "Kitchen Display (KDS)",
      desc: "Paperless kitchen routing. Kitchen displays update immediately with prep timers, special cooking notes, and audio chime alerts.",
      link: "/features#kds"
    },
    {
      icon: <QrCode size={24} />,
      title: "Smart Contactless QR Menus",
      desc: "Guests scan table QR codes to view rich menus with HD photos, customize dishes, and order directly without app downloads.",
      link: "/features#qr-menu"
    },
    {
      icon: <TrendingUp size={24} />,
      title: "Actionable Analytics & GST",
      desc: "Comprehensive daily, weekly, and monthly sales breakdowns, top-selling items, peak rush hours, and ready-to-file GST reports.",
      link: "/features#analytics"
    },
    {
      icon: <ShieldCheck size={24} />,
      title: "Role-Based Staff PINs",
      desc: "Secure POS access with quick 4-digit PIN unlock. Restrict discounts, cancellations, and cash drawer actions to managers.",
      link: "/features#staff"
    },
    {
      icon: <Zap size={24} />,
      title: "Instant Multi-Device Sync",
      desc: "Built on high-speed WebSockets. Changes made on one POS terminal reflect instantaneously across tablets and kitchen screens.",
      link: "/features#sync"
    }
  ];

  const restaurantTypes = [
    {
      title: "Fine Dining & Casual Restaurants",
      desc: "Multi-course pacing, captain ordering, table reservations, and seamless split bills for large groups.",
      image: "/images/landing/type_restaurant.jpg",
      tag: "Full Service"
    },
    {
      title: "Cafes & Quick Service (QSR)",
      desc: "Rapid counter checkout, combo modifiers, coffee customizers, and express takeaway packaging.",
      image: "/images/landing/type_cafe.jpg",
      tag: "High Turnover"
    },
    {
      title: "Bars, Lounges & Breweries",
      desc: "Open bar tabs, fast drink reorders, happy hour pricing automation, and keg/bottle tracking.",
      image: "/images/landing/type_bar.jpg",
      tag: "Nightlife & Pubs"
    },
    {
      title: "Cloud Kitchens & Delivery",
      desc: "Multi-brand kitchen dispatch, synchronized KDS pacing, and consolidated prep queues.",
      image: "/images/landing/type_cloud_kitchen.jpg",
      tag: "Delivery Focused"
    }
  ];


  return (
    <div className="tm-home-page">
      {/* =========================================================
          HERO SECTION - FLOATING BANNER WITH GAPS
          ========================================================= */}
      <section className="tm-hero-banner-section">
        <div className="tm-hero-home">
          <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
            <div className="tm-hero-home-grid">
              {/* Left Column: Vertically centered to match other section banners */}
              <div style={{ textAlign: 'left', maxWidth: '540px' }}>
                {/* Badge */}
                <div className="tm-hero-badge">
                  <Sparkles size={14} />
                  <span>Modern Restaurant Management</span>
                </div>

                {/* Main Headline */}
                <h1 className="tm-hero-title">
                  The Smart Restaurant POS &{' '}
                  <span className="tm-hero-title-accent">Contactless Dining Platform</span>
                </h1>

                {/* Subheading */}
                <p className="tm-hero-subtitle">
                  Empower your restaurant with intelligent table management, contactless ordering, powerful POS billing, live kitchen display, and real-time analytics — all in one easy platform.
                </p>

                {/* CTA Buttons */}
                <div className="tm-hero-actions">
                  <Link
                    to="/register"
                    className="tm-btn-hero-primary"
                  >
                    <span>Start 14 Days Free Trial</span>
                    <ArrowRight size={16} />
                  </Link>

                  <Link
                    to="/demo"
                    className="tm-btn-hero-secondary"
                  >
                    <Play size={15} fill="#FFFFFF" />
                    <span>Watch Video Demo</span>
                  </Link>
                </div>

                {/* Trust Checkmarks */}
                <div className="tm-hero-trust-row">
                  <div className="tm-hero-trust-item">
                    <CheckCircle size={15} />
                    <span>No credit card required</span>
                  </div>
                  <div className="tm-hero-trust-item">
                    <CheckCircle size={15} />
                    <span>Setup in 5 minutes</span>
                  </div>
                  <div className="tm-hero-trust-item">
                    <CheckCircle size={15} />
                    <span>Works on all devices</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Transparent spacer allowing the background image's laptop POS, smartphone menu & QR stand to shine through */}
              <div className="tm-hero-showcase-spacer" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          KEY NUMBERS / IMPACT STATS
          ========================================================= */}
      <section className="tm-stats-section" style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #e2e8f0',
        padding: '44px 24px'
      }}>
        <PageContainer>
          <div className="tm-stats-grid">
            <div className="tm-stat-item">
              <div className="tm-stat-number" style={{ color: '#062D22' }}>
                3.5x
              </div>
              <p className="tm-stat-title">Faster Order Checkout</p>
              <p className="tm-stat-desc">From order punch to printed receipt in under 4 seconds</p>
            </div>
            <div className="tm-stat-item">
              <div className="tm-stat-number" style={{ color: '#0BAF7A' }}>
                28%
              </div>
              <p className="tm-stat-title">Higher Average Order Value</p>
              <p className="tm-stat-desc">With visual QR menu upselling and dessert prompts</p>
            </div>
            <div className="tm-stat-item">
              <div className="tm-stat-number" style={{ color: '#062D22' }}>
                0%
              </div>
              <p className="tm-stat-title">Kitchen Order Confusion</p>
              <p className="tm-stat-desc">Direct-to-screen KDS replaces lost paper tickets</p>
            </div>
            <div className="tm-stat-item">
              <div className="tm-stat-number" style={{ color: '#0BAF7A' }}>
                ₹0
              </div>
              <p className="tm-stat-title">Expensive Hardware Lock-in</p>
              <p className="tm-stat-desc">Runs on any iPad, tablet, laptop, or existing POS terminal</p>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* =========================================================
          FEATURES HIGHLIGHT SECTION (8 Pillars)
          ========================================================= */}
      <section className="tm-section-spacious" style={{ background: '#F4F7F6' }}>
        <PageContainer>
          <div className="tm-section-header">
            <span className="tm-section-badge">
              <Sparkles size={14} />
              <span>Full-Stack Restaurant Architecture</span>
            </span>
            <h2 className="tm-section-title">
              Engineered for Speed, Reliability, and Delight
            </h2>
            <p className="tm-section-subtitle">
              Everything your restaurant needs to operate smoothly from the moment guests are seated until the final receipt is settled.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 28
          }}>
            {features.map((feat, idx) => (
              <div key={idx} className="tm-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className="tm-icon-box">
                  {feat.icon}
                </div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: 10, color: '#172033' }}>
                  {feat.title}
                </h3>
                <p style={{ fontSize: '0.94rem', color: '#5e6d82', marginBottom: 20, flex: 1 }}>
                  {feat.desc}
                </p>
                <Link 
                  to={feat.link}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    color: '#0BAF7A',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    textDecoration: 'none'
                  }}
                >
                  <span>Learn more</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <Link to="/features" className="tm-btn tm-btn-secondary tm-btn-lg">
              <span>View All 9 Feature Modules in Depth</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </PageContainer>
      </section>

      {/* =========================================================
          DEVICE COMPATIBILITY SHOWCASE - FLOATING BANNER
          ========================================================= */}
      <section className="tm-device-banner-wrapper">
        <div className="tm-device-banner-card">
          <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
            <div className="tm-device-grid">
              <div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  background: 'rgba(22, 201, 149, 0.12)',
                  border: '1px solid rgba(22, 201, 149, 0.3)',
                  color: '#16C995',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  marginBottom: 16
                }}>
                  <Smartphone size={14} />
                  <span>Zero Hardware Restrictions</span>
                </div>
                <h2 style={{
                  fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
                  fontWeight: 800,
                  lineHeight: 1.2,
                  color: '#FFFFFF',
                  marginBottom: 20
                }}>
                  Works seamlessly on every device you already own
                </h2>
                <p style={{ fontSize: '1.05rem', color: '#cbd5e1', lineHeight: 1.65, marginBottom: 28 }}>
                  No proprietary expensive POS terminals required. TableMint is cloud-native and responsive. Launch it on your existing iPads, Android tablets, desktop computers, thermal printers, and mobile phones.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 36 }}>
                  {[
                    "Apple iPads & iPad Mini for captain order taking",
                    "Android & Windows POS touch terminals for cashiers",
                    "Large HD screens and wall-mounted tablets for Kitchen KDS",
                    "Thermal USB, Bluetooth & Network receipt printers (ESC/POS)",
                    "Mobile phone browser support for owners on the go"
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.95rem', color: '#e2e8f0' }}>
                      <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: 'rgba(22, 201, 149, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#16C995',
                        flexShrink: 0
                      }}>
                        <Check size={13} strokeWidth={3} />
                      </div>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <Link to="/demo" className="tm-btn tm-btn-primary">
                  <span>See Multi-Device Live Demo</span>
                  <ArrowRight size={16} />
                </Link>
              </div>

              {/* Showcase Image */}
              <div style={{
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.12)'
              }}>
                <img 
                  src="/images/landing/devices_showcase.jpg" 
                  alt="TableMint Works on iPad, Android Tablets, Windows and Mac"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          RESTAURANT CATEGORIES (Tailored for Every Venue)
          ========================================================= */}
      <section className="tm-section-spacious" style={{ background: '#FFFFFF' }}>
        <PageContainer>
          <div className="tm-section-header">
            <span className="tm-section-badge">
              <UtensilsCrossed size={14} />
              <span>Tailored Solutions</span>
            </span>
            <h2 className="tm-section-title">
              Designed for Every Dining Environment
            </h2>
            <p className="tm-section-subtitle">
              Whether you run a high-energy craft brewery or an intimate fine-dining destination, TableMint adapts to your service flow.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 24
          }}>
            {restaurantTypes.map((type, idx) => (
              <div 
                key={idx}
                style={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: '#F4F7F6',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                <div style={{ position: 'relative', height: '180px', overflow: 'hidden' }}>
                  <img 
                    src={type.image} 
                    alt={type.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <span style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: 'rgba(6, 45, 34, 0.85)',
                    backdropFilter: 'blur(8px)',
                    color: '#16C995',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    border: '1px solid rgba(22, 201, 149, 0.3)'
                  }}>
                    {type.tag}
                  </span>
                </div>
                <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: 10, color: '#172033' }}>
                    {type.title}
                  </h3>
                  <p style={{ fontSize: '0.92rem', color: '#5e6d82', marginBottom: 18, flex: 1 }}>
                    {type.desc}
                  </p>
                  <Link 
                    to="/solutions"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      color: '#0BAF7A',
                      fontWeight: 600,
                      fontSize: '0.88rem'
                    }}
                  >
                    <span>Explore solution</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* =========================================================
          PRICING PREVIEW
          ========================================================= */}
      <section className="tm-section-spacious" style={{ background: '#F4F7F6' }}>
        <PageContainer>
          <div className="tm-section-header">
            <span className="tm-section-badge">
              <Receipt size={14} />
              <span>Transparent SaaS Pricing</span>
            </span>
            <h2 className="tm-section-title">
              Predictable Plans With No Hidden Commissions
            </h2>
            <p className="tm-section-subtitle">
              Keep 100% of your restaurant profits. All plans include automated GST billing, menu management, and unlimited staff accounts.
            </p>

            {/* Monthly / Yearly Switch */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#e2e8f0',
              padding: 4,
              borderRadius: '9999px',
              marginTop: 24
            }}>
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                style={{
                  padding: '8px 20px',
                  borderRadius: '9999px',
                  border: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: billingCycle === 'monthly' ? '#FFFFFF' : 'transparent',
                  color: billingCycle === 'monthly' ? '#172033' : '#64748b',
                  boxShadow: billingCycle === 'monthly' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                style={{
                  padding: '8px 20px',
                  borderRadius: '9999px',
                  border: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: billingCycle === 'yearly' ? '#FFFFFF' : 'transparent',
                  color: billingCycle === 'yearly' ? '#172033' : '#64748b',
                  boxShadow: billingCycle === 'yearly' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>Yearly Billing</span>
                <span style={{
                  background: '#0BAF7A',
                  color: '#FFFFFF',
                  fontSize: '0.7rem',
                  padding: '2px 6px',
                  borderRadius: '9999px'
                }}>
                  SAVE 20%
                </span>
              </button>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 28,
            alignItems: 'stretch'
          }}>
            {/* Starter */}
            <div className="tm-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.35rem', marginBottom: 6 }}>Starter</h3>
              <p style={{ fontSize: '0.9rem', color: '#5e6d82', marginBottom: 20 }}>
                Ideal for small cafes, takeaway counters, and food trucks.
              </p>
              <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: '2.4rem', fontWeight: 800, color: '#062D22', fontFamily: 'var(--font-heading)' }}>
                  ₹{billingCycle === 'yearly' ? '799' : '999'}
                </span>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}> / month</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                {["Up to 10 Dining Tables", "1 POS Terminal Cashier", "Contactless QR Menus", "Basic Sales Reports", "Email Support"].map((item, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.92rem', color: '#172033' }}>
                    <Check size={16} style={{ color: '#0BAF7A', flexShrink: 0 }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/register?plan=starter" className="tm-btn tm-btn-secondary" style={{ width: '100%' }}>
                Get Started
              </Link>
            </div>

            {/* Standard - Featured */}
            <div className="tm-card" style={{
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              borderColor: '#0BAF7A',
              boxShadow: '0 12px 30px rgba(11, 175, 122, 0.15)',
              borderWidth: 2
            }}>
              <span style={{
                position: 'absolute',
                top: -12,
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#0BAF7A',
                color: '#FFFFFF',
                padding: '4px 14px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                Most Popular
              </span>
              <h3 style={{ fontSize: '1.35rem', marginBottom: 6 }}>Standard</h3>
              <p style={{ fontSize: '0.9rem', color: '#5e6d82', marginBottom: 20 }}>
                Perfect for busy casual dining, bistros, and full-service restaurants.
              </p>
              <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: '2.4rem', fontWeight: 800, color: '#0BAF7A', fontFamily: 'var(--font-heading)' }}>
                  ₹{billingCycle === 'yearly' ? '1,599' : '1,999'}
                </span>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}> / month</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                {[
                  "Up to 30 Dining Tables",
                  "3 POS Terminals & Waiter Tablets",
                  "Kitchen Display System (KDS)",
                  "Custom Branded QR Stands",
                  "Daily & Weekly GST Reports",
                  "Priority WhatsApp Support"
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.92rem', color: '#172033' }}>
                    <Check size={16} style={{ color: '#0BAF7A', flexShrink: 0 }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/register?plan=standard" className="tm-btn tm-btn-primary" style={{ width: '100%' }}>
                Start 14-Day Free Trial
              </Link>
            </div>

            {/* Premium */}
            <div className="tm-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.35rem', marginBottom: 6 }}>Premium</h3>
              <p style={{ fontSize: '0.9rem', color: '#5e6d82', marginBottom: 20 }}>
                For high-volume multi-floor restaurants, bars, and multi-outlet chains.
              </p>
              <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: '2.4rem', fontWeight: 800, color: '#062D22', fontFamily: 'var(--font-heading)' }}>
                  ₹{billingCycle === 'yearly' ? '3,199' : '3,999'}
                </span>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}> / month</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                {[
                  "Unlimited Dining Tables & Zones",
                  "Unlimited Staff & POS Terminals",
                  "Multi-Station KDS Routing",
                  "Inventory & Recipe Tracking",
                  "Dedicated Account Manager",
                  "24/7 Phone & On-Site Assistance"
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.92rem', color: '#172033' }}>
                    <Check size={16} style={{ color: '#0BAF7A', flexShrink: 0 }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/register?plan=premium" className="tm-btn tm-btn-secondary" style={{ width: '100%' }}>
                Get Started
              </Link>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <Link to="/pricing" style={{ color: '#0BAF7A', fontWeight: 600, fontSize: '0.95rem' }}>
              Compare all features and specifications in our complete pricing table →
            </Link>
          </div>
        </PageContainer>
      </section>



      {/* =========================================================
          FINAL CTA SECTION
          ========================================================= */}
      <CTASection />
    </div>
  );
}
