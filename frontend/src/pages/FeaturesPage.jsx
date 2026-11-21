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
  ArrowRight,
  Zap
} from 'lucide-react';
import PageHero from '../components/layout/PageHero';
import PageContainer from '../components/layout/PageContainer';
import CTASection from '../components/layout/CTASection';
import Reveal from '../components/marketing/Reveal';
import CheckList from '../components/marketing/CheckList';
import MediaFrame from '../components/marketing/MediaFrame';

const FEATURE_MODULES = [
  {
    id: "dashboard",
    title: "Real-Time POS Dashboard & Analytics",
    category: "Operations Control",
    icon: LayoutDashboard,
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
    icon: UtensilsCrossed,
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
    icon: Receipt,
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
    icon: Layers,
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
    icon: ChefHat,
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
    icon: Zap,
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
    icon: TrendingUp,
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
    icon: ShieldCheck,
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
    icon: QrCode,
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

export default function FeaturesPage() {
  return (
    <div className="tm-features-page">
      <PageHero
        badge="Enterprise POS Capabilities"
        title="Everything You Need to Run a"
        titleAccent="Thriving Restaurant"
        description="From table seating and express checkout to kitchen routing and financial auditing, discover how TableMint POS powers every touchpoint of modern dining."
        actions={
          <>
            <Link to="/register" className="tm-btn tm-btn-primary tm-btn-lg">
              <span>Start Free 14-Day Trial</span>
              <ArrowRight size={17} />
            </Link>
            <Link to="/pricing" className="tm-btn tm-btn-secondary tm-btn-lg">
              <span>View Pricing Plans</span>
            </Link>
          </>
        }
      />

      {/* Quick jump navigation */}
      <nav className="tm-jumpnav" aria-label="Feature modules">
        <PageContainer>
          <div className="tm-jumpnav-track">
            {FEATURE_MODULES.map((item) => (
              <a key={item.id} href={`#${item.id}`}>
                {item.title.split('&')[0].trim()}
              </a>
            ))}
          </div>
        </PageContainer>
      </nav>

      {/* Detailed feature modules */}
      <PageContainer>
        <div className="tm-modules">
          {FEATURE_MODULES.map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <section
                key={mod.id}
                id={mod.id}
                className={`tm-module ${idx % 2 === 1 ? 'is-reversed' : ''}`}
                aria-labelledby={`${mod.id}-title`}
              >
                <Reveal className="tm-module-copy">
                  <span className="tm-eyebrow">
                    <Icon />
                    <span>{mod.category}</span>
                  </span>
                  <h2 id={`${mod.id}-title`} className="tm-module-title">{mod.title}</h2>
                  <p className="tm-module-headline">{mod.headline}</p>
                  <p className="tm-module-desc">{mod.description}</p>
                  <CheckList items={mod.benefits} />
                  <div className="tm-actions is-inline">
                    <Link to="/register" className="tm-btn tm-btn-primary">
                      <span>Get Started with {mod.category}</span>
                      <ArrowRight size={15} />
                    </Link>
                    <Link to="/pricing" className="tm-btn tm-btn-secondary">
                      View Pricing
                    </Link>
                  </div>
                </Reveal>

                <Reveal delay={0.08} className="tm-module-media">
                  <MediaFrame src={mod.image} alt={mod.title} tag={mod.badgeText} />
                </Reveal>
              </section>
            );
          })}
        </div>
      </PageContainer>

      <CTASection
        title="Experience All 9 TableMint Modules in Action"
        subtitle="Sign up in 60 seconds with no credit card required. Your custom digital restaurant workspace will be ready immediately."
      />
    </div>
  );
}
