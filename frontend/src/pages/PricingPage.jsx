import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Check, 
  Minus, 
  HelpCircle, 
  ArrowRight, 
  Sparkles, 
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PageHero from '../components/layout/PageHero';
import PageContainer from '../components/layout/PageContainer';
import CTASection from '../components/layout/CTASection';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [openFaq, setOpenFaq] = useState(null);

  const plans = [
    {
      id: "starter",
      name: "Starter",
      tagline: "For small cafes, express counters, and food trucks.",
      monthlyPrice: 999,
      yearlyPrice: 799,
      badge: null,
      highlight: false,
      ctaText: "Start Starter Plan",
      features: [
        "Up to 10 Dining Tables",
        "1 POS Cashier Terminal",
        "Unlimited Menu Items & Categories",
        "Contactless QR Code Menus",
        "GST-Compliant Thermal Billing",
        "Standard Daily Sales Reports",
        "Email Support (24h response)"
      ]
    },
    {
      id: "standard",
      name: "Standard",
      tagline: "For busy casual dining, bistros, and full-service restaurants.",
      monthlyPrice: 1999,
      yearlyPrice: 1599,
      badge: "Most Popular",
      highlight: true,
      ctaText: "Start 14-Day Free Trial",
      features: [
        "Up to 30 Dining Tables & 3 Floor Zones",
        "3 POS Terminals & Waiter Tablets",
        "Full Kitchen Display System (KDS)",
        "Custom Branded QR Stand Generator",
        "Split Billing & Multiple Tender Modes",
        "Item Modifiers & Cooking Instructions",
        "GST Sales Register & Audit Reports",
        "Staff Roles & 4-Digit Security PINs",
        "Priority WhatsApp & Phone Support"
      ]
    },
    {
      id: "premium",
      name: "Premium",
      tagline: "For high-volume multi-floor restaurants, bars, and chains.",
      monthlyPrice: 3999,
      yearlyPrice: 3199,
      badge: "High Growth",
      highlight: false,
      ctaText: "Get Premium Access",
      features: [
        "Unlimited Dining Tables & Floors",
        "Unlimited POS Terminals & Devices",
        "Multi-Station KDS (Kitchen + Bar + Dessert)",
        "Advanced Hourly Analytics & Item Velocity",
        "Automatic Happy Hour & Discount Rules",
        "Audit Trail of All Bill Voids & Discounts",
        "Multi-Outlet Central Dashboard",
        "Dedicated Account Manager & 24/7 Phone SLA",
        "Custom Thermal Receipt Branding"
      ]
    }
  ];

  const comparisonRows = [
    { feature: "Dining Tables Included", starter: "Up to 10", standard: "Up to 30", premium: "Unlimited" },
    { feature: "Floor Zones (e.g. AC, Rooftop)", starter: "1 Zone", standard: "Up to 3 Zones", premium: "Unlimited Zones" },
    { feature: "Simultaneous POS Terminals", starter: "1 Terminal", standard: "3 Terminals", premium: "Unlimited" },
    { feature: "Contactless QR Menus", starter: true, standard: true, premium: true },
    { feature: "Print-Ready QR Table Tents", starter: "Standard", standard: "Custom Branded", premium: "Custom Branded" },
    { feature: "Express POS Billing", starter: true, standard: true, premium: true },
    { feature: "Thermal Receipt Printing (ESC/POS)", starter: true, standard: true, premium: true },
    { feature: "Split Bill by Seat / Item", starter: false, standard: true, premium: true },
    { feature: "Kitchen Display System (KDS)", starter: false, standard: true, premium: true },
    { feature: "Multi-Station KDS Routing (Bar + Food)", starter: false, standard: false, premium: true },
    { feature: "Staff 4-Digit Security PINs", starter: false, standard: true, premium: true },
    { feature: "Manager PIN Discount Overrides", starter: false, standard: true, premium: true },
    { feature: "Daily Sales & Tax Summaries", starter: true, standard: true, premium: true },
    { feature: "GSTR-1 & GSTR-3B Tax Export", starter: false, standard: true, premium: true },
    { feature: "Item Velocity & Peak Hour Analytics", starter: false, standard: true, premium: true },
    { feature: "Multi-Outlet Management", starter: false, standard: false, premium: true },
    { feature: "Customer Support Channels", starter: "Email Support", standard: "WhatsApp + Phone", premium: "Dedicated Manager 24/7" }
  ];

  const faqs = [
    {
      q: "Do you charge any commission per order or transaction?",
      a: "Never. TableMint operates strictly on a predictable, flat monthly or annual subscription. You keep 100% of your order revenues, whether you process 10 orders or 10,000 orders a month."
    },
    {
      q: "Do I have to purchase special expensive POS hardware?",
      a: "No! TableMint runs natively in any modern browser on devices you already own—including Apple iPads, Android tablets, Windows desktops, MacBooks, and standard thermal printers (USB, Bluetooth, or LAN)."
    },
    {
      q: "Can I upgrade or downgrade my plan as my restaurant grows?",
      a: "Yes. You can switch plans or change billing frequencies anytime from your restaurant dashboard settings with prorated billing adjustments."
    },
    {
      q: "How does the 14-day free trial work?",
      a: "You get full, unrestricted access to the Standard plan for 14 days without entering any credit card details. You can test live table ordering, KDS, and billing with your actual menu."
    },
    {
      q: "Is TableMint compliant with Indian GST requirements?",
      a: "Yes. TableMint automatically computes CGST and SGST with customized tax percentages per category, generates tax invoices with your restaurant GSTIN, and exports audit-ready registers."
    }
  ];

  return (
    <div className="tm-pricing-page">
      {/* Page Hero */}
      <PageHero
        badge="Simple, Transparent SaaS Pricing"
        title="Zero Commissions. Zero Setup Fees."
        titleAccent="Just Modern POS."
        description="Choose the right plan for your floor capacity. Every plan includes cloud backup, automatic updates, and full database isolation."
      >
        {/* Billing Switcher */}
        <div className="tm-billing-switcher" style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '5px',
          borderRadius: '9999px',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          marginTop: 20
        }}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => setBillingCycle('monthly')}
            style={{
              padding: '9px 24px',
              borderRadius: '9999px',
              border: 'none',
              fontSize: '0.92rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: billingCycle === 'monthly' ? '#FFFFFF' : 'transparent',
              color: billingCycle === 'monthly' ? '#062D22' : '#cbd5e1',
              boxShadow: billingCycle === 'monthly' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Monthly Billing
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => setBillingCycle('yearly')}
            style={{
              padding: '9px 24px',
              borderRadius: '9999px',
              border: 'none',
              fontSize: '0.92rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: billingCycle === 'yearly' ? '#FFFFFF' : 'transparent',
              color: billingCycle === 'yearly' ? '#062D22' : '#cbd5e1',
              boxShadow: billingCycle === 'yearly' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <span>Annual Billing</span>
            <span style={{
              background: '#10b981',
              color: '#FFFFFF',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px'
            }}>
              SAVE 20%
            </span>
          </motion.button>
        </div>
      </PageHero>

      {/* Pricing Cards */}
      <section style={{ padding: '80px 24px 60px', background: '#F4F7F6' }}>
        <PageContainer>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
            gap: 32,
            alignItems: 'stretch'
          }}>
            {plans.map((p, idx) => {
              const price = billingCycle === 'yearly' ? p.yearlyPrice : p.monthlyPrice;
              return (
                <motion.div
                  key={p.id}
                  className="tm-card"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  whileHover={{ y: p.highlight ? -10 : -6, scale: p.highlight ? 1.015 : 1, transition: { duration: 0.2 } }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    borderColor: p.highlight ? '#0BAF7A' : '#e2e8f0',
                    borderWidth: p.highlight ? 2 : 1,
                    boxShadow: p.highlight ? '0 16px 40px rgba(11, 175, 122, 0.18)' : 'var(--shadow-card)',
                    background: '#FFFFFF'
                  }}
                >
                  {p.badge && (
                    <span style={{
                      position: 'absolute',
                      top: -13,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#0BAF7A',
                      color: '#FFFFFF',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '4px 16px',
                      borderRadius: '9999px',
                      letterSpacing: '0.04em',
                      boxShadow: '0 4px 10px rgba(11, 175, 122, 0.35)'
                    }}>
                      {p.badge}
                    </span>
                  )}

                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: '1.5rem', color: '#172033', marginBottom: 8 }}>
                      {p.name}
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: '#5e6d82', minHeight: '44px' }}>
                      {p.tagline}
                    </p>
                  </div>

                  <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid #edf2f7' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{
                        fontSize: '3rem',
                        fontWeight: 800,
                        color: p.highlight ? '#0BAF7A' : '#062D22',
                        fontFamily: 'var(--font-heading)',
                        lineHeight: 1
                      }}>
                        ₹{price.toLocaleString()}
                      </span>
                      <span style={{ color: '#64748b', fontSize: '0.95rem' }}> / month</span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <span style={{ display: 'block', fontSize: '0.8rem', color: '#0BAF7A', fontWeight: 600, marginTop: 6 }}>
                        Billed annually (₹{(price * 12).toLocaleString()}/year)
                      </span>
                    )}
                  </div>

                  {/* Features List */}
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 13, flex: 1 }}>
                    {p.features.map((f, fIdx) => (
                      <li key={fIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.92rem', color: '#172033' }}>
                        <Check size={16} style={{ color: '#0BAF7A', flexShrink: 0, marginTop: 2 }} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to={`/register?plan=${p.id}`}
                    className={`tm-btn ${p.highlight ? 'tm-btn-primary' : 'tm-btn-secondary'}`}
                    style={{ width: '100%', padding: '13px 20px', fontSize: '0.98rem' }}
                  >
                    <span>{p.ctaText}</span>
                    <ArrowRight size={16} />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </PageContainer>
      </section>

      {/* Feature Comparison Table */}
      <section style={{ padding: '60px 24px 80px', background: '#FFFFFF', borderTop: '1px solid #e2e8f0' }}>
        <PageContainer>
          <div className="tm-section-header">
            <span className="tm-section-badge">
              <Sparkles size={14} />
              <span>Full Specifications</span>
            </span>
            <h2 className="tm-section-title">
              Compare Features Side-by-Side
            </h2>
            <p className="tm-section-subtitle">
              Every detail matters when choosing your restaurant operating system.
            </p>
          </div>

          <div style={{
            overflowX: 'auto',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: '#062D22', color: '#FFFFFF' }}>
                  <th style={{ padding: '18px 24px', fontSize: '0.95rem', fontWeight: 700, width: '40%' }}>
                    Feature / Capability
                  </th>
                  <th style={{ padding: '18px 20px', fontSize: '0.95rem', fontWeight: 700, width: '20%', textAlign: 'center' }}>
                    Starter
                  </th>
                  <th style={{ padding: '18px 20px', fontSize: '0.95rem', fontWeight: 700, width: '20%', textAlign: 'center', background: '#0BAF7A' }}>
                    Standard
                  </th>
                  <th style={{ padding: '18px 20px', fontSize: '0.95rem', fontWeight: 700, width: '20%', textAlign: 'center' }}>
                    Premium
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, idx) => {
                  const isAlt = idx % 2 === 1;
                  return (
                    <tr key={idx} style={{ background: isAlt ? '#F8FAFC' : '#FFFFFF', borderBottom: '1px solid #edf2f7' }}>
                      <td style={{ padding: '15px 24px', fontSize: '0.92rem', color: '#172033', fontWeight: 500 }}>
                        {row.feature}
                      </td>
                      <td style={{ padding: '15px 20px', textAlign: 'center', fontSize: '0.88rem', color: '#5e6d82' }}>
                        {typeof row.starter === 'boolean' ? (
                          row.starter ? <Check size={18} style={{ color: '#0BAF7A', margin: '0 auto' }} /> : <Minus size={18} style={{ color: '#94a3b8', margin: '0 auto' }} />
                        ) : row.starter}
                      </td>
                      <td style={{ padding: '15px 20px', textAlign: 'center', fontSize: '0.88rem', color: '#062D22', fontWeight: 600, background: isAlt ? 'rgba(11, 175, 122, 0.05)' : 'rgba(11, 175, 122, 0.02)' }}>
                        {typeof row.standard === 'boolean' ? (
                          row.standard ? <Check size={18} style={{ color: '#0BAF7A', margin: '0 auto' }} /> : <Minus size={18} style={{ color: '#94a3b8', margin: '0 auto' }} />
                        ) : row.standard}
                      </td>
                      <td style={{ padding: '15px 20px', textAlign: 'center', fontSize: '0.88rem', color: '#5e6d82' }}>
                        {typeof row.premium === 'boolean' ? (
                          row.premium ? <Check size={18} style={{ color: '#0BAF7A', margin: '0 auto' }} /> : <Minus size={18} style={{ color: '#94a3b8', margin: '0 auto' }} />
                        ) : row.premium}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PageContainer>
      </section>

      {/* Pricing FAQs */}
      <section style={{ padding: '80px 24px', background: '#F4F7F6' }}>
        <PageContainer maxWidth="880px">
          <div className="tm-section-header">
            <span className="tm-section-badge">
              <HelpCircle size={14} />
              <span>Got Questions?</span>
            </span>
            <h2 className="tm-section-title">
              Frequently Asked Questions
            </h2>
            <p className="tm-section-subtitle">
              Transparent answers to common questions about billing, hardware, and setups.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-20px' }}
                  transition={{ duration: 0.35, delay: idx * 0.05 }}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    transition: 'border-color 0.2s ease'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    style={{
                      width: '100%',
                      padding: '20px 24px',
                      background: 'none',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#172033' }}>
                      {faq.q}
                    </span>
                    {isOpen ? <ChevronUp size={20} style={{ color: '#0BAF7A' }} /> : <ChevronDown size={20} style={{ color: '#94a3b8' }} />}
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '0 24px 20px', color: '#5e6d82', fontSize: '0.95rem', lineHeight: 1.65 }}>
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </PageContainer>
      </section>

      {/* Final CTA */}
      <CTASection
        title="Ready to Elevate Your Restaurant Revenue?"
        subtitle="Start your 14-day free trial now. Up and running with your menu in under 10 minutes."
      />
    </div>
  );
}
