import React from 'react';
import { Link } from 'react-router-dom';
import { 
  UserPlus, 
  LayoutGrid, 
  QrCode, 
  Receipt, 
  ChefHat, 
  TrendingUp, 
  ArrowRight, 
  CheckCircle, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  Zap,
  Check
} from 'lucide-react';
import PageHero from '../components/layout/PageHero';
import PageContainer from '../components/layout/PageContainer';
import CTASection from '../components/layout/CTASection';

export default function HowItWorksPage() {
  const steps = [
    {
      num: "01",
      icon: <UserPlus size={28} />,
      title: "Register Your Restaurant",
      subtitle: "Instant Workspace Initialization",
      role: "Restaurant Owner",
      time: "60 Seconds",
      description: "Sign up with your restaurant name and admin credentials. TableMint automatically provisions an isolated, clean digital database with custom floor settings, starter categories, and default GST rules.",
      details: [
        "No credit card or hardware installation required",
        "Select your service model (Fine Dine, Cafe, Bar, Cloud Kitchen)",
        "Instant multi-user admin login"
      ],
      image: "/images/landing/screen_dashboard.jpg"
    },
    {
      num: "02",
      icon: <LayoutGrid size={28} />,
      title: "Configure Tables & Menus",
      subtitle: "Interactive Floor & Catalog Setup",
      role: "Floor Manager",
      time: "3-5 Minutes",
      description: "Define your dining sections (AC Hall, Outdoor Garden, Bar counter). Add your tables and import or edit menu items with photos, veg/non-veg tags, spice levels, and prices.",
      details: [
        "Visual drag-and-drop table numbering and seating capacities",
        "Bulk menu upload or easy 1-click item creation",
        "Automatic generation of unique, secure QR codes per table"
      ],
      image: "/images/landing/screen_tables.jpg"
    },
    {
      num: "03",
      icon: <QrCode size={28} />,
      title: "Start Accepting Orders",
      subtitle: "Dine-In, Takeaway & Contactless QR",
      role: "Guests & Waitstaff",
      time: "Instant Real-Time",
      description: "Guests scan the table QR stand on their phones to view interactive digital menus, customize dishes, and place orders. Alternatively, your waitstaff can take orders directly on iPad or Android tablets.",
      details: [
        "Zero-app ordering right inside mobile browser",
        "Waiters punch orders with rapid touch interface",
        "Add cooking instructions and customer notes"
      ],
      image: "/images/landing/devices_showcase.jpg"
    },
    {
      num: "04",
      icon: <ChefHat size={28} />,
      title: "Send Orders to the Kitchen (KDS)",
      subtitle: "Automated Ticket Routing",
      role: "Kitchen Chefs & Bar Staff",
      time: "Sub-Second Sync",
      description: "Orders instantly appear on the Kitchen Display System (KDS) or print out on thermal KOT printers. Kitchen staff view items sorted by table with real-time cooking timers and strike-off capabilities.",
      details: [
        "Eliminates lost paper tickets and waiter shouting",
        "Color-coded timers highlight urgent orders",
        "Instant notification to waitstaff when dishes are plated"
      ],
      image: "/images/landing/hero_pos_mockup.jpg"
    },
    {
      num: "05",
      icon: <Receipt size={28} />,
      title: "Process Billing & Payments",
      subtitle: "Express Checkout & GST Invoices",
      role: "Cashier & Captain",
      time: "Under 4 Seconds",
      description: "Generate compliant tax invoices in seconds. Split bills between guests, apply approved discounts, and accept payments via Dynamic UPI QR, Cash, Credit/Debit cards, or corporate tabs.",
      details: [
        "Automated GST computation with CGST & SGST breakdown",
        "Split bill evenly by count or by individual dishes",
        "Instant thermal receipt printing (ESC/POS)"
      ],
      image: "/images/landing/screen_pos_billing.jpg"
    },
    {
      num: "06",
      icon: <TrendingUp size={28} />,
      title: "Track Reports & Business Performance",
      subtitle: "Live Analytics & Audit Registers",
      role: "Owner & General Manager",
      time: "Always Live",
      description: "Review comprehensive sales metrics from your phone, laptop, or back office. Analyze peak rush hours, top-selling dishes, waiter productivity, and export ready-to-file GST tax registers.",
      details: [
        "Live net sales, discounts, and payment mode breakdowns",
        "Item velocity reports showing profitable bestsellers",
        "GSTR-1 and GSTR-3B tax export in Excel/CSV"
      ],
      image: "/images/landing/screen_dashboard.jpg"
    }
  ];

  return (
    <div className="tm-how-it-works-page">
      {/* Page Hero */}
      <PageHero
        badge="Frictionless Onboarding"
        title="How TableMint Powers Your"
        titleAccent="Restaurant Operations"
        description="A complete end-to-end workflow designed to eliminate dining bottlenecks, accelerate kitchen communication, and turn tables 35% faster."
        actions={
          <Link to="/register" className="tm-btn tm-btn-primary tm-btn-lg">
            <span>Get Started in 5 Minutes</span>
            <ArrowRight size={18} />
          </Link>
        }
      />

      {/* Workflow Steps Section */}
      <section style={{ padding: '80px 24px', background: '#F4F7F6' }}>
        <PageContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 60, maxWidth: '1080px', margin: '0 auto' }}>
            {steps.map((step, idx) => (
              <div 
                key={idx}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '24px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 8px 30px rgba(6, 45, 34, 0.05)',
                  padding: 'clamp(28px, 4vw, 44px)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: 40,
                  alignItems: 'center',
                  position: 'relative'
                }}
              >
                {/* Text column */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    <span style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '1.4rem',
                      fontWeight: 800,
                      color: '#0BAF7A',
                      background: 'rgba(11, 175, 122, 0.1)',
                      padding: '4px 14px',
                      borderRadius: '9999px',
                      border: '1px solid rgba(11, 175, 122, 0.25)'
                    }}>
                      Step {step.num}
                    </span>
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#5e6d82',
                      background: '#F4F7F6',
                      padding: '4px 10px',
                      borderRadius: '6px'
                    }}>
                      {step.role} • {step.time}
                    </span>
                  </div>

                  <h2 style={{
                    fontSize: 'clamp(1.5rem, 2.8vw, 2.1rem)',
                    fontWeight: 800,
                    color: '#172033',
                    lineHeight: 1.25,
                    marginBottom: 8
                  }}>
                    {step.title}
                  </h2>

                  <p style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: '#062D22',
                    marginBottom: 14
                  }}>
                    {step.subtitle}
                  </p>

                  <p style={{
                    fontSize: '0.94rem',
                    color: '#5e6d82',
                    lineHeight: 1.65,
                    marginBottom: 20
                  }}>
                    {step.description}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {step.details.map((d, dIdx) => (
                      <div key={dIdx} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem', color: '#172033' }}>
                        <CheckCircle size={16} style={{ color: '#0BAF7A', flexShrink: 0 }} />
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Screenshot Visual */}
                <div style={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.08)',
                  background: '#041711'
                }}>
                  <img 
                    src={step.image} 
                    alt={step.title}
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      maxHeight: '340px',
                      objectFit: 'cover'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* Comparison: TableMint vs Legacy POS */}
      <section style={{ padding: '80px 24px', background: '#FFFFFF', borderTop: '1px solid #e2e8f0' }}>
        <PageContainer>
          <div className="tm-section-header">
            <span className="tm-section-badge">
              <Zap size={14} />
              <span>Speed & Simplicity</span>
            </span>
            <h2 className="tm-section-title">
              TableMint Cloud POS vs Traditional Legacy POS
            </h2>
            <p className="tm-section-subtitle">
              See why modern restaurateurs are ditching clunky, on-premise hardware for TableMint's lightning-fast cloud OS.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 32,
            maxWidth: '940px',
            margin: '0 auto'
          }}>
            {/* TableMint */}
            <div style={{
              background: 'rgba(11, 175, 122, 0.04)',
              border: '2px solid #0BAF7A',
              borderRadius: '20px',
              padding: '36px',
              position: 'relative'
            }}>
              <span style={{
                position: 'absolute',
                top: -12,
                left: 32,
                background: '#0BAF7A',
                color: '#FFFFFF',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '3px 12px',
                borderRadius: '9999px'
              }}>
                TableMint Modern OS
              </span>
              <h3 style={{ fontSize: '1.4rem', color: '#062D22', marginBottom: 18 }}>
                Fast, Cloud-Native, Flexible
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  "Live in 5 minutes with zero hardware lock-in",
                  "Contactless QR ordering built-in with no extra apps",
                  "Real-time WebSocket sync between tables & kitchen",
                  "Accessible on iPad, Android, Windows, and phone",
                  "Free automatic updates with new features every month",
                  "Transparent SaaS pricing from ₹999/month"
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.92rem', color: '#172033' }}>
                    <CheckCircle size={17} style={{ color: '#0BAF7A', flexShrink: 0 }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legacy POS */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '36px'
            }}>
              <h3 style={{ fontSize: '1.4rem', color: '#64748b', marginBottom: 18 }}>
                Traditional Legacy POS
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  "2-3 weeks painful setup requiring on-site technician",
                  "Expensive proprietary terminal lock-in (₹40,000+ per screen)",
                  "No built-in QR menus; requires costly 3rd party plugins",
                  "Local server crashes wipe out ongoing tickets",
                  "Paid annual maintenance contracts (AMC) and update fees",
                  "Complicated UI with lengthy staff training curves"
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.92rem', color: '#64748b' }}>
                    <span style={{ color: '#ef4444', fontWeight: 700, flexShrink: 0 }}>✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* Final CTA */}
      <CTASection
        title="Start Your 6-Step Transformation Today"
        subtitle="Join forward-thinking restaurants experiencing faster billing and zero kitchen delays with TableMint."
      />
    </div>
  );
}
