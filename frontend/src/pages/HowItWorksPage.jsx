import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PageHero from '../components/layout/PageHero';
import PageContainer from '../components/layout/PageContainer';
import CTASection from '../components/layout/CTASection';
import Reveal from '../components/marketing/Reveal';
import SectionHeader from '../components/marketing/SectionHeader';
import CheckList from '../components/marketing/CheckList';
import MediaFrame from '../components/marketing/MediaFrame';

const STEPS = [
  {
    num: "01",
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

const TABLEMINT_POINTS = [
  "Live in 5 minutes with zero hardware lock-in",
  "Contactless QR ordering built-in with no extra apps",
  "Real-time WebSocket sync between tables & kitchen",
  "Accessible on iPad, Android, Windows, and phone",
  "Free automatic updates with new features every month",
  "Transparent SaaS pricing from ₹999/month"
];

const LEGACY_POINTS = [
  "2-3 weeks painful setup requiring on-site technician",
  "Expensive proprietary terminal lock-in (₹40,000+ per screen)",
  "No built-in QR menus; requires costly 3rd party plugins",
  "Local server crashes wipe out ongoing tickets",
  "Paid annual maintenance contracts (AMC) and update fees",
  "Complicated UI with lengthy staff training curves"
];

export default function HowItWorksPage() {
  return (
    <div className="tm-how-it-works-page">
      <PageHero
        badge="Frictionless Onboarding"
        title="How TableMint Powers Your"
        titleAccent="Restaurant Operations"
        description="A complete end-to-end workflow designed to eliminate dining bottlenecks, accelerate kitchen communication, and turn tables 35% faster."
        actions={
          <Link to="/register" className="tm-btn tm-btn-primary tm-btn-lg">
            <span>Get Started in 5 Minutes</span>
            <ArrowRight size={17} />
          </Link>
        }
      />

      {/* Workflow steps */}
      <section className="tm-section">
        <PageContainer>
          <ol className="tm-steps">
            {STEPS.map((step) => (
              <li key={step.num} className="tm-step">
                <Reveal className="tm-step-num" aria-hidden="true">{step.num}</Reveal>

                <Reveal delay={0.04}>
                  <div className="tm-step-meta">
                    <span>{step.role}</span>
                    <span className="tm-step-meta-sep" aria-hidden="true" />
                    <span>{step.time}</span>
                  </div>
                  <h2 className="tm-step-title">
                    <span className="sr-only">Step {step.num}: </span>
                    {step.title}
                  </h2>
                  <p className="tm-step-sub">{step.subtitle}</p>
                  <p className="tm-step-desc">{step.description}</p>
                  <CheckList items={step.details} compact />
                </Reveal>

                <Reveal delay={0.1}>
                  <MediaFrame src={step.image} alt={step.title} />
                </Reveal>
              </li>
            ))}
          </ol>
        </PageContainer>
      </section>

      {/* TableMint vs legacy POS */}
      <section className="tm-section is-white is-bordered">
        <PageContainer>
          <SectionHeader
            eyebrow="Speed & Simplicity"
            title="TableMint Cloud POS vs Traditional Legacy POS"
            subtitle="See why modern restaurateurs are ditching clunky, on-premise hardware for TableMint's lightning-fast cloud OS."
          />

          <div className="tm-compare">
            <Reveal className="tm-compare-col is-ours">
              <span className="tm-eyebrow">TableMint Modern OS</span>
              <h3 className="tm-compare-title">Fast, Cloud-Native, Flexible</h3>
              <CheckList items={TABLEMINT_POINTS} />
            </Reveal>

            <Reveal delay={0.08} className="tm-compare-col">
              <span className="tm-eyebrow">The Old Way</span>
              <h3 className="tm-compare-title">Traditional Legacy POS</h3>
              <CheckList items={LEGACY_POINTS} variant="negative" />
            </Reveal>
          </div>
        </PageContainer>
      </section>

      <CTASection
        title="Start Your 6-Step Transformation Today"
        subtitle="Join forward-thinking restaurants experiencing faster billing and zero kitchen delays with TableMint."
      />
    </div>
  );
}
