import React from 'react';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  Receipt, 
  ChefHat, 
  QrCode, 
  TrendingUp, 
  ShieldCheck, 
  Layers, 
  CheckCircle, 
  ArrowRight, 
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import PageHero from '../components/layout/PageHero';
import PageContainer from '../components/layout/PageContainer';
import CTASection from '../components/layout/CTASection';

export default function FeaturesPage() {
  const featureModules = [
    {
      id: "dashboard",
      title: "Real-Time POS Dashboard & Analytics",
      category: "Operations Control",
      icon: <LayoutDashboard size={22} />,
      headline: "The complete command center of your entire restaurant floor",
      description: "Get real-time visibility into your dining operations with live metrics on current occupancy, pending KOT orders, daily gross sales, and average ticket size. No manual refreshing needed.",
      benefits: [
        "Live occupancy counter shows vacant, seated, and dining tables at a glance",
        "Real-time revenue tracking with hourly sales pace vs yesterday",
        "Quick access to active orders, bill settlement, and kitchen alerts",
        "Auto-refreshing WebSocket data pipeline keeps every terminal in sync"
      ],
      image: "/images/landing/screen_dashboard.jpg",
      badgeText: "Instant Floor Visibility"
    },
    {
      id: "table-mgmt",
      title: "Visual Table & Floor Management",
      category: "Floor Layout",
      icon: <UtensilsCrossed size={22} />,
      headline: "Intuitive interactive floor plan that turns tables 35% faster",
      description: "Manage dining tables with color-coded status badges (Vacant, Occupied, Billed, Reserved). Move guests between tables with one click, merge bills, and monitor table dining duration so waiters know when to offer desserts or bill.",
      benefits: [
        "Visual floor map organized by sections (AC Dining, Rooftop, Bar, Patio)",
        "Instant table status indicators: Green (Vacant), Red (Occupied), Amber (Billed)",
        "One-click table merge, split, and guest transfer without losing order state",
        "Elapsed seating timer highlights tables waiting too long for service"
      ],
      image: "/images/landing/screen_tables.jpg",
      badgeText: "Dynamic Grid System"
    },
    {
      id: "pos-billing",
      title: "Express POS Billing & Invoicing",
      category: "Billing & Cashier",
      icon: <Receipt size={22} />,
      headline: "Settle bills in under 3 seconds with GST and split payments",
      description: "Engineered for speed during peak dining rushes. Punch orders with keyboard shortcuts or touch menus, apply percentage or flat discounts, split bills evenly or by individual item, and print thermal receipts immediately.",
      benefits: [
        "Multi-mode settlement: UPI QR, Cash, Credit/Debit Cards, and Split Tender",
        "Automated GST calculation with CGST, SGST, and item-level tax exemptions",
        "Direct thermal printing with 2-inch and 3-inch ESC/POS thermal printers",
        "Manager PIN override for custom bill discounts and item cancellations"
      ],
      image: "/images/landing/screen_pos_billing.jpg",
      badgeText: "3-Second Checkout"
    },
    {
      id: "order-mgmt",
      title: "Live Order Pipeline & KOT Routing",
      category: "Service Workflow",
      icon: <Layers size={22} />,
      headline: "Zero lost orders with end-to-end digital order tracking",
      description: "Every order placed by waitstaff or scanned by guests lands immediately in the central order queue. Track items through preparation, plating, and serving with live status updates.",
      benefits: [
        "Unified queue shows table orders, takeaway counter, and online pickup",
        "Automatic Kitchen Order Ticket (KOT) generation with running token numbers",
        "Order notes & dietary preferences (e.g., 'Less Spicy', 'No Onion/Garlic')",
        "Real-time audio chimes notify staff when new orders arrive"
      ],
      image: "/images/landing/hero_pos_mockup.jpg",
      badgeText: "Seamless Pipeline"
    },
    {
      id: "kds",
      title: "Kitchen Display System (KDS)",
      category: "Kitchen Automation",
      icon: <ChefHat size={22} />,
      headline: "Say goodbye to grease-stained paper tickets and kitchen chaos",
      description: "Replace noisy ticket printers with a dedicated digital Kitchen Display System. Chefs view order tickets chronologically with elapsed preparation timers, item checkboxes, and one-tap bump bar functionality.",
      benefits: [
        "Color-coded urgency timers (Green < 10m, Amber 10-20m, Red > 20m)",
        "Strike-off individual items as they are cooked and plated",
        "Station routing: send cocktails to bar and pizzas to the oven station",
        "High-contrast dark mode display optimized for hot, busy kitchens"
      ],
      image: "/images/landing/devices_showcase.jpg",
      badgeText: "Paperless Kitchen"
    },
    {
      id: "menu-mgmt",
      title: "Dynamic Menu & Category Engine",
      category: "Catalog Control",
      icon: <Zap size={22} />,
      headline: "Update prices, add seasonal specials, and 86 items in real time",
      description: "Maintain your complete digital menu across all POS terminals and customer QR codes simultaneously. Toggle item availability in one click when an ingredient runs out so customers never order sold-out dishes.",
      benefits: [
        "Category organization: Starters, Main Course, Beverages, Desserts, Combos",
        "Item badges: Pure Veg (Green dot), Non-Veg (Red triangle), Chef Special, Spicy",
        "Instant 'Item Sold Out' toggle prevents kitchen delays and guest frustration",
        "High-resolution dish photos with calorie tags and description prompts"
      ],
      image: "/images/landing/screen_tables.jpg",
      badgeText: "Instant Menu Sync"
    },
    {
      id: "reports",
      title: "Financial Reports & Business Intelligence",
      category: "Growth & Finance",
      icon: <TrendingUp size={22} />,
      headline: "Make data-backed decisions with automated GST & sales audits",
      description: "Gain complete clarity over your restaurant numbers. Export audit-ready sales registers, payment mode breakdowns, top-grossing items, and hourly customer footfall patterns in Excel or PDF.",
      benefits: [
        "Daily, weekly, and monthly net sales, gross revenue, and tax collected",
        "Payment distribution charts (UPI vs Cash vs Card vs Credit tabs)",
        "Item profitability matrix highlighting top-selling dishes and slow movers",
        "Export GSTR-1 compatible sales registers with one click"
      ],
      image: "/images/landing/screen_dashboard.jpg",
      badgeText: "Audit Ready"
    },
    {
      id: "staff-mgmt",
      title: "Staff Roles & 4-Digit PIN Security",
      category: "Security & Auditing",
      icon: <ShieldCheck size={22} />,
      headline: "Protect your cash drawer and track server accountability",
      description: "Assign role-based permissions (Cashier, Waiter, Captain, Kitchen Chef, Admin). Staff quickly unlock terminals with a 4-digit PIN, ensuring every bill discount, void item, and cash drop is tied to an operator.",
      benefits: [
        "Rapid 4-digit PIN unlock for high-speed terminal switching between waiters",
        "Role permissions restrict bill editing, discount granting, and voiding",
        "Complete audit trail of every modification made to an open or settled bill",
        "Individual waiter performance tracking (orders handled, tips, table speed)"
      ],
      image: "/images/landing/screen_pos_billing.jpg",
      badgeText: "Role-Based Access"
    },
    {
      id: "qr-menu",
      title: "Contactless QR Menu & Self-Ordering",
      category: "Guest Experience",
      icon: <QrCode size={22} />,
      headline: "Let guests scan, browse rich photos, and order from their phones",
      description: "Delight tech-savvy diners with zero-app QR ordering. Guests scan the acrylic stand on their table to browse visual menus with HD photos, customize their dishes, and send orders directly into your kitchen.",
      benefits: [
        "Zero app download required — opens instantly in Safari, Chrome, or any camera",
        "Unique cryptographic token per table prevents fraudulent remote orders",
        "Automated upselling prompts for sides, mocktails, and desserts",
        "Print-ready downloadable table tent stands with custom restaurant branding"
      ],
      image: "/images/landing/devices_showcase.jpg",
      badgeText: "Zero-App Mobile Ordering"
    }
  ];

  return (
    <div className="tm-features-page">
      {/* Page Hero */}
      <PageHero
        badge="Enterprise POS Capabilities"
        title="Everything You Need to Run a"
        titleAccent="Thriving Restaurant"
        description="From table seating and express checkout to kitchen routing and financial auditing, discover how TableMint POS powers every touchpoint of modern dining."
        actions={
          <>
            <Link to="/register" className="tm-btn tm-btn-primary tm-btn-lg">
              <span>Start Free 14-Day Trial</span>
              <ArrowRight size={18} />
            </Link>
            <Link to="/demo" className="tm-btn tm-btn-outline-white tm-btn-lg">
              <span>Watch Live Demo</span>
            </Link>
          </>
        }
      />

      {/* Quick Jump Navigation Pill Bar */}
      <section style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 74,
        zIndex: 900,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        <PageContainer>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 0',
            whiteSpace: 'nowrap'
          }}>
            {featureModules.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 14px',
                  borderRadius: '9999px',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  color: '#172033',
                  background: '#F4F7F6',
                  border: '1px solid #e2e8f0',
                  textDecoration: 'none',
                  transition: 'all 0.18s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e8f9f3';
                  e.currentTarget.style.borderColor = '#0BAF7A';
                  e.currentTarget.style.color = '#062D22';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#F4F7F6';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.color = '#172033';
                }}
              >
                <span>{item.title.split('&')[0].trim()}</span>
              </a>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* Detailed Feature Modules */}
      <section style={{ padding: '80px 24px', background: '#F4F7F6' }}>
        <PageContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 90 }}>
            {featureModules.map((mod, idx) => {
              const isEven = idx % 2 === 1;
              return (
                <motion.div
                  key={mod.id}
                  id={mod.id}
                  initial={{ opacity: 0, y: 35 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: 48,
                    alignItems: 'center',
                    background: '#FFFFFF',
                    borderRadius: '24px',
                    padding: 'clamp(28px, 4vw, 48px)',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 8px 30px rgba(6, 45, 34, 0.05)'
                  }}
                >
                  {/* Left / Right Content Order */}
                  <div style={{ order: isEven ? 2 : 1 }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '5px 12px',
                      borderRadius: '9999px',
                      background: 'rgba(11, 175, 122, 0.1)',
                      color: '#0BAF7A',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: 16
                    }}>
                      {mod.icon}
                      <span>{mod.category}</span>
                    </div>

                    <h2 style={{
                      fontSize: 'clamp(1.7rem, 3vw, 2.3rem)',
                      fontWeight: 800,
                      color: '#172033',
                      lineHeight: 1.25,
                      marginBottom: 14
                    }}>
                      {mod.title}
                    </h2>

                    <p style={{
                      fontSize: '1.05rem',
                      fontWeight: 600,
                      color: '#062D22',
                      marginBottom: 14
                    }}>
                      {mod.headline}
                    </p>

                    <p style={{
                      fontSize: '0.96rem',
                      color: '#5e6d82',
                      lineHeight: 1.65,
                      marginBottom: 24
                    }}>
                      {mod.description}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                      {mod.benefits.map((b, bIdx) => (
                        <div key={bIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.92rem', color: '#172033' }}>
                          <CheckCircle size={17} style={{ color: '#0BAF7A', flexShrink: 0, marginTop: 2 }} />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <Link to="/demo" className="tm-btn tm-btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
                          <span>See {mod.category} Demo</span>
                          <ArrowRight size={14} />
                        </Link>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <Link to="/register" className="tm-btn tm-btn-secondary" style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
                          Try It Free
                        </Link>
                      </motion.div>
                    </div>
                  </div>

                  {/* Screenshot Visual */}
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.25 }}
                    style={{
                      order: isEven ? 1 : 2,
                      position: 'relative',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 16px 36px rgba(0, 0, 0, 0.08)',
                      background: '#041711'
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: 14,
                      right: 14,
                      zIndex: 2,
                      background: 'rgba(6, 45, 34, 0.88)',
                      backdropFilter: 'blur(8px)',
                      color: '#16C995',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      border: '1px solid rgba(22, 201, 149, 0.3)'
                    }}>
                      {mod.badgeText}
                    </span>
                    <img 
                      src={mod.image} 
                      alt={mod.title}
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        maxHeight: '420px',
                        objectFit: 'cover'
                      }}
                    />
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </PageContainer>
      </section>

      {/* Final CTA */}
      <CTASection
        title="Experience All 9 TableMint Modules in Action"
        subtitle="Sign up in 60 seconds with no credit card required. Your custom digital restaurant workspace will be ready immediately."
      />
    </div>
  );
}
