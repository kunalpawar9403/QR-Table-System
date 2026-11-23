import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  LayoutDashboard,
  Smartphone,
  Receipt,
  ChefHat,
  TrendingUp,
  QrCode,
  ShieldCheck,
  Zap,
  Play,
  UtensilsCrossed,
  Printer,
  Wifi,
  Tablet
} from 'lucide-react';
import { motion } from 'motion/react';
import PageContainer from '../components/layout/PageContainer';
import CTASection from '../components/layout/CTASection';
import Reveal, { enterProps } from '../components/marketing/Reveal';
import SectionHeader from '../components/marketing/SectionHeader';
import CheckList from '../components/marketing/CheckList';
import MediaFrame from '../components/marketing/MediaFrame';
import PlanCard from '../components/marketing/PlanCard';

const HERO_SPECS = [
  { icon: Printer, title: '58mm & 80mm', sub: 'ESC/POS' },
  { icon: Wifi, title: 'Bluetooth &', sub: 'Wi-Fi Sync' },
  { icon: Tablet, title: 'Android &', sub: 'iOS Tablet' },
  { icon: Zap, title: 'Instant', sub: 'Order KDS' }
];

const PILLARS = [
  {
    icon: Receipt,
    title: 'Token & KOT System',
    desc: 'Every bill generates an automatic sequential token number, so customers, waitstaff, and delivery partners stay synchronized.',
    link: '/features#order-mgmt'
  },
  {
    icon: LayoutDashboard,
    title: 'Visual Floor & Tables',
    desc: 'Real-time visual table occupancy. Instantly see vacant, seated, dining, and billed tables with 1-tap fast status shifts.',
    link: '/features#table-mgmt'
  },
  {
    icon: Printer,
    title: 'Express Point of Sale',
    desc: 'High-speed billing counter that punches orders in seconds, supports split tender (Cash/UPI/Card), and auto-prints 58/80mm receipts.',
    link: '/features#pos-billing'
  }
];

const STATS = [
  { num: '3.5x', title: 'Faster Order Checkout', desc: 'From order punch to printed receipt in under 4 seconds' },
  { num: '28%', title: 'Higher Average Order Value', desc: 'With visual QR menu upselling and dessert prompts' },
  { num: '0%', title: 'Kitchen Order Confusion', desc: 'Direct-to-screen KDS replaces lost paper tickets' },
  { num: '₹0', title: 'Expensive Hardware Lock-in', desc: 'Runs on any iPad, tablet, laptop, or existing POS terminal' }
];

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: 'Real-Time POS Dashboard',
    desc: "Live visibility into table occupancy, active orders, today's gross sales, and average ticket size in a unified view.",
    link: '/features#dashboard'
  },
  {
    icon: UtensilsCrossed,
    title: 'Interactive Floor & Tables',
    desc: 'Color-coded visual table management. Instantly see vacant, seated, dining, and billed tables with 1-click status shifts.',
    link: '/features#table-mgmt'
  },
  {
    icon: Receipt,
    title: 'Express Billing & Split Pay',
    desc: 'Generate GST-compliant tax invoices in under 3 seconds. Split bills by seat or item with Cash, UPI, and Card options.',
    link: '/features#pos-billing'
  },
  {
    icon: ChefHat,
    title: 'Kitchen Display (KDS)',
    desc: 'Paperless kitchen routing. Kitchen displays update immediately with prep timers, special cooking notes, and audio chime alerts.',
    link: '/features#kds'
  },
  {
    icon: QrCode,
    title: 'Smart Contactless QR Menus',
    desc: 'Guests scan table QR codes to view rich menus with HD photos, customize dishes, and order directly without app downloads.',
    link: '/features#qr-menu'
  },
  {
    icon: TrendingUp,
    title: 'Actionable Analytics & GST',
    desc: 'Comprehensive daily, weekly, and monthly sales breakdowns, top-selling items, peak rush hours, and ready-to-file GST reports.',
    link: '/features#reports'
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Staff PINs',
    desc: 'Secure POS access with quick 4-digit PIN unlock. Restrict discounts, cancellations, and cash drawer actions to managers.',
    link: '/features#staff-mgmt'
  },
  {
    icon: Zap,
    title: 'Instant Multi-Device Sync',
    desc: 'Built on high-speed WebSockets. Changes made on one POS terminal reflect instantaneously across tablets and kitchen screens.',
    link: '/features#dashboard'
  }
];

const DEVICE_LIST = [
  'Apple iPads & iPad Mini for captain order taking',
  'Android & Windows POS touch terminals for cashiers',
  'Large HD screens and wall-mounted tablets for Kitchen KDS',
  'Thermal USB, Bluetooth & Network receipt printers (ESC/POS)',
  'Mobile phone browser support for owners on the go'
];

const RESTAURANT_TYPES = [
  {
    title: 'Fine Dining & Casual Restaurants',
    desc: 'Multi-course pacing, captain ordering, table reservations, and seamless split bills for large groups.',
    image: '/images/landing/type_restaurant.jpg',
    tag: 'Full Service',
    to: '/solutions#restaurants'
  },
  {
    title: 'Cafes & Quick Service (QSR)',
    desc: 'Rapid counter checkout, combo modifiers, coffee customizers, and express takeaway packaging.',
    image: '/images/landing/type_cafe.jpg',
    tag: 'High Turnover',
    to: '/solutions#cafes'
  },
  {
    title: 'Bars, Lounges & Breweries',
    desc: 'Open bar tabs, fast drink reorders, happy hour pricing automation, and keg/bottle tracking.',
    image: '/images/landing/type_bar.jpg',
    tag: 'Nightlife & Pubs',
    to: '/solutions#bars'
  },
  {
    title: 'Cloud Kitchens & Delivery',
    desc: 'Multi-brand kitchen dispatch, synchronized KDS pacing, and consolidated prep queues.',
    image: '/images/landing/type_cloud_kitchen.jpg',
    tag: 'Delivery Focused',
    to: '/solutions#cloud-kitchen'
  }
];

const PLANS = [
  {
    id: '1-month',
    name: '1 Month Plan',
    duration: '1 Month',
    tagline: 'Ideal for small cafes, takeaway counters, and food trucks.',
    price: 999,
    originalPrice: null,
    savingsTag: null,
    note: 'Billed monthly (₹999 total)',
    ctaText: 'Get Started',
    features: [
      'Up to 15 Dining Tables',
      '1 POS Terminal Cashier',
      'Contactless QR Menus',
      'Real-time Kitchen Display (KDS)',
      'Basic Sales Reports',
      'Email & WhatsApp Support'
    ]
  },
  {
    id: '3-months',
    name: '3 Months Plan',
    duration: '3 Months',
    tagline: 'Perfect for busy casual dining, bistros, and full-service restaurants.',
    price: 899,
    originalPrice: 999,
    savingsTag: 'Save 10%',
    badge: 'Most Popular',
    note: 'Billed quarterly (₹2,697 for 3 months)',
    highlight: true,
    ctaText: 'Start 14-Day Free Trial',
    features: [
      'Up to 35 Dining Tables',
      '3 POS Terminals & Waiter Tablets',
      'Kitchen Display System (KDS)',
      'Custom Branded QR Stands',
      'Daily & Weekly GST Reports',
      'Priority WhatsApp Support'
    ]
  },
  {
    id: '1-year',
    name: '1 Year Plan',
    duration: '1 Year',
    tagline: 'For high-volume multi-floor restaurants, bars, and multi-outlet chains.',
    price: 749,
    originalPrice: 999,
    savingsTag: 'Save 25%',
    badge: 'Best Value',
    note: 'Billed annually (₹8,988 / year)',
    ctaText: 'Get Started',
    features: [
      'Unlimited Dining Tables & Zones',
      'Unlimited Staff & POS Terminals',
      'Multi-Station KDS Routing',
      'Inventory & Recipe Tracking',
      'Dedicated Account Manager',
      '24/7 Phone & On-Site Assistance'
    ]
  }
];

export default function HomePage() {

  return (
    <div className="tm-home-page">
      {/* ================= HERO ================= */}
      <section className="tm-home-hero">
        <PageContainer>
          <div className="tm-home-hero-grid">
            <div>
              <motion.span className="tm-eyebrow" {...enterProps(0)}>
                Modern Restaurant Management
              </motion.span>

              <motion.h1 className="tm-display" {...enterProps(0.06)}>
                The Smart Restaurant POS <em>&amp; Contactless Dining</em>
              </motion.h1>

              <motion.p className="tm-lead" {...enterProps(0.12)}>
                Empower your floor with intelligent table management, contactless QR ordering, express POS billing, and real-time kitchen display.
              </motion.p>

              <motion.div className="tm-actions tm-home-hero-actions" {...enterProps(0.18)}>
                <Link to="/register" className="tm-btn tm-btn-primary tm-btn-lg">
                  <span>Start 14 Days Free Trial</span>
                  <ArrowRight size={16} />
                </Link>
                <Link to="/features" className="tm-btn tm-btn-secondary tm-btn-lg">
                  <span>Explore Features</span>
                  <ArrowRight size={15} />
                </Link>
              </motion.div>

              <motion.ul className="tm-trust-row" {...enterProps(0.24)}>
                <li><ShieldCheck size={15} /><span>No credit card required</span></li>
                <li><Zap size={15} /><span>Setup in 5 minutes</span></li>
                <li><Smartphone size={15} /><span>Works on all devices</span></li>
              </motion.ul>
            </div>

            <motion.figure className="tm-hero-frame" {...enterProps(0.14, 20)}>
              <img
                src="/images/landing/hero_pos_devices.jpg"
                alt="TableMint POS, Contactless QR Menu & Thermal Receipt Billing"
                loading="eager"
                fetchPriority="high"
              />
              <ul className="tm-spec-strip">
                {HERO_SPECS.map(({ icon: Icon, title, sub }) => (
                  <li key={sub}>
                    <Icon size={22} />
                    <span className="tm-spec-text">
                      <strong>{title}</strong>
                      <span>{sub}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </motion.figure>
          </div>

          <div className="tm-pillars">
            {PILLARS.map(({ icon: Icon, title, desc, link }, idx) => (
              <Reveal key={title} className="tm-pillar" delay={idx * 0.06}>
                <Icon size={22} className="tm-pillar-icon" />
                <h3 className="tm-pillar-title">{title}</h3>
                <p className="tm-pillar-desc">{desc}</p>
                <Link to={link} className="tm-link">
                  <span>Learn more</span>
                  <ArrowRight size={14} />
                </Link>
              </Reveal>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* ================= IMPACT STATS ================= */}
      <section className="tm-stats" aria-label="Impact">
        <PageContainer>
          <Reveal className="tm-stats-grid">
            {STATS.map((stat) => (
              <div key={stat.title} className="tm-stat">
                <div className="tm-stat-number">{stat.num}</div>
                <p className="tm-stat-title">{stat.title}</p>
                <p className="tm-stat-desc">{stat.desc}</p>
              </div>
            ))}
          </Reveal>
        </PageContainer>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="tm-section">
        <PageContainer>
          <SectionHeader
            eyebrow="Full-Stack Restaurant Architecture"
            title="Engineered for Speed, Reliability, and Delight"
            subtitle="Everything your restaurant needs to operate smoothly from the moment guests are seated until the final receipt is settled."
          />

          <Reveal className="tm-feature-grid">
            {FEATURES.map(({ icon: Icon, title, desc, link }) => (
              <Link key={title} to={link} className="tm-feature-cell">
                <span className="tm-feature-icon"><Icon size={20} /></span>
                <h3 className="tm-feature-title">{title}</h3>
                <p className="tm-feature-desc">{desc}</p>
                <span className="tm-feature-more">
                  <span>Learn more</span>
                  <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </Reveal>

          <div className="tm-center-action">
            <Link to="/features" className="tm-btn tm-btn-secondary tm-btn-lg">
              <span>View All 9 Feature Modules in Depth</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </PageContainer>
      </section>

      {/* ================= DEVICE COMPATIBILITY ================= */}
      <section className="tm-band-dark">
        <PageContainer>
          <div className="tm-split">
            <Reveal>
              <span className="tm-eyebrow is-on-dark">Zero Hardware Restrictions</span>
              <h2 className="tm-section-title">Works seamlessly on every device you already own</h2>
              <p className="tm-section-subtitle">
                No proprietary expensive POS terminals required. TableMint is cloud-native and responsive. Launch it on your existing iPads, Android tablets, desktop computers, thermal printers, and mobile phones.
              </p>
              <CheckList items={DEVICE_LIST} />
              <Link to="/features" className="tm-btn tm-btn-light">
                <span>Explore Supported Hardware</span>
                <ArrowRight size={16} />
              </Link>
            </Reveal>

            <Reveal delay={0.1}>
              <MediaFrame
                src="/images/landing/devices_showcase.jpg"
                alt="TableMint works on iPad, Android tablets, Windows and Mac"
                onDark
              />
            </Reveal>
          </div>
        </PageContainer>
      </section>

      {/* ================= VENUE TYPES ================= */}
      <section className="tm-section is-white">
        <PageContainer>
          <SectionHeader
            eyebrow="Tailored Solutions"
            title="Designed for Every Dining Environment"
            subtitle="Whether you run a high-energy craft brewery or an intimate fine-dining destination, TableMint adapts to your service flow."
          />

          <div className="tm-venue-grid">
            {RESTAURANT_TYPES.map((type, idx) => (
              <Reveal key={type.title} delay={idx * 0.06}>
                <Link to={type.to} className="tm-venue">
                  <div className="tm-venue-media">
                    <img src={type.image} alt={type.title} loading="lazy" decoding="async" />
                  </div>
                  <span className="tm-venue-tag">{type.tag}</span>
                  <h3 className="tm-venue-title">{type.title}</h3>
                  <p className="tm-venue-desc">{type.desc}</p>
                  <span className="tm-feature-more">
                    <span>Explore solution</span>
                    <ArrowRight size={14} />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* ================= PRICING PREVIEW ================= */}
      <section className="tm-section is-sand">
        <PageContainer>
          <SectionHeader
            eyebrow="Transparent SaaS Pricing"
            title="Predictable Plans With No Hidden Commissions"
            subtitle="Choose between 1 month, 3 months, or 1 year plans. Save up to 25% with longer durations while keeping 100% of your restaurant profits."
          />

          <div className="tm-plan-grid">
            {PLANS.map((plan, idx) => (
              <Reveal key={plan.id} delay={idx * 0.06}>
                <PlanCard plan={plan} />
              </Reveal>
            ))}
          </div>

          <div className="tm-center-action">
            <Link to="/pricing" className="tm-link">
              <span>Compare all features and specifications in our complete pricing table</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </PageContainer>
      </section>

      <CTASection />
    </div>
  );
}
