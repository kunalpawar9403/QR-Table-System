import React, { useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PageHero from '../components/layout/PageHero';
import PageContainer from '../components/layout/PageContainer';
import Reveal from '../components/marketing/Reveal';
import SectionHeader from '../components/marketing/SectionHeader';
import PlanCard from '../components/marketing/PlanCard';

const PLANS = [
  {
    id: "1-month",
    name: "1 Month Plan",
    tagline: "For small cafes, express counters, and food trucks.",
    price: 999,
    originalPrice: null,
    savingsTag: null,
    badge: "Flexible",
    note: "Billed monthly (₹999 total)",
    highlight: false,
    ctaText: "Start 1 Month Plan",
    features: [
      "Up to 15 Dining Tables",
      "1 POS Cashier Terminal",
      "Unlimited Menu Items & Categories",
      "Contactless QR Code Menus",
      "Real-time Kitchen Display (KDS)",
      "GST-Compliant Thermal Billing",
      "Standard Daily Sales Reports",
      "Email & WhatsApp Support"
    ]
  },
  {
    id: "3-months",
    name: "3 Months Plan",
    tagline: "For busy casual dining, bistros, and full-service restaurants.",
    price: 899,
    originalPrice: 999,
    savingsTag: "Save 10%",
    badge: "Most Popular",
    note: "Billed quarterly (₹2,697 for 3 months)",
    highlight: true,
    ctaText: "Start 14-Day Free Trial",
    features: [
      "Up to 35 Dining Tables & 3 Floor Zones",
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
    id: "1-year",
    name: "1 Year Plan",
    tagline: "For high-volume multi-floor restaurants, bars, and chains.",
    price: 749,
    originalPrice: 999,
    savingsTag: "Save 25%",
    badge: "Best Value",
    note: "Billed annually (₹8,988 / year)",
    highlight: false,
    ctaText: "Get 1 Year Access",
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

const COMPARISON_ROWS = [
  { feature: "Duration / Billing Cycle", oneMonth: "1 Month", threeMonths: "3 Months (Save 10%)", oneYear: "1 Year (Save 25%)" },
  { feature: "Dining Tables Included", oneMonth: "Up to 15", threeMonths: "Up to 35", oneYear: "Unlimited" },
  { feature: "Floor Zones (e.g. AC, Rooftop)", oneMonth: "1 Zone", threeMonths: "Up to 3 Zones", oneYear: "Unlimited Zones" },
  { feature: "Simultaneous POS Terminals", oneMonth: "1 Terminal", threeMonths: "3 Terminals", oneYear: "Unlimited" },
  { feature: "Contactless QR Menus", oneMonth: true, threeMonths: true, oneYear: true },
  { feature: "Print-Ready QR Table Tents", oneMonth: "Standard", threeMonths: "Custom Branded", oneYear: "Custom Branded" },
  { feature: "Express POS Billing", oneMonth: true, threeMonths: true, oneYear: true },
  { feature: "Thermal Receipt Printing (ESC/POS)", oneMonth: true, threeMonths: true, oneYear: true },
  { feature: "Split Bill by Seat / Item", oneMonth: false, threeMonths: true, oneYear: true },
  { feature: "Kitchen Display System (KDS)", oneMonth: true, threeMonths: true, oneYear: true },
  { feature: "Multi-Station KDS Routing (Bar + Food)", oneMonth: false, threeMonths: false, oneYear: true },
  { feature: "Staff 4-Digit Security PINs", oneMonth: false, threeMonths: true, oneYear: true },
  { feature: "Manager PIN Discount Overrides", oneMonth: false, threeMonths: true, oneYear: true },
  { feature: "Daily Sales & Tax Summaries", oneMonth: true, threeMonths: true, oneYear: true },
  { feature: "GSTR-1 & GSTR-3B Tax Export", oneMonth: false, threeMonths: true, oneYear: true },
  { feature: "Item Velocity & Peak Hour Analytics", oneMonth: false, threeMonths: true, oneYear: true },
  { feature: "Multi-Outlet Management", oneMonth: false, threeMonths: false, oneYear: true },
  { feature: "Customer Support Channels", oneMonth: "Email Support", threeMonths: "WhatsApp + Phone", oneYear: "Dedicated Manager 24/7" }
];

const FAQS = [
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

function ComparisonCell({ value, featured }) {
  const className = featured ? 'is-featured' : undefined;
  if (typeof value !== 'boolean') {
    return <td className={className}>{value}</td>;
  }
  return (
    <td className={className}>
      {value
        ? <Check size={18} className="tm-table-yes" aria-hidden="true" />
        : <Minus size={18} className="tm-table-no" aria-hidden="true" />}
      <span className="sr-only">{value ? 'Included' : 'Not included'}</span>
    </td>
  );
}

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="tm-pricing-page">
      <PageHero
        badge="Simple, Transparent SaaS Pricing"
        title="Zero Commissions. Zero Setup Fees."
        titleAccent="Just Modern POS."
        description="Choose the right subscription duration for your restaurant. Save up to 25% with our 3-month and 1-year plans with full feature access and priority updates."
      />

      {/* Plans */}
      <section className="tm-section">
        <PageContainer>
          <div className="tm-plan-grid">
            {PLANS.map((plan, idx) => (
              <Reveal key={plan.id} delay={idx * 0.06}>
                <PlanCard plan={plan} />
              </Reveal>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* Comparison table */}
      <section className="tm-section is-white is-bordered">
        <PageContainer>
          <SectionHeader
            eyebrow="Full Specifications"
            title="Compare Plans Side-by-Side"
            subtitle="Every detail matters when choosing your restaurant operating system."
          />

          <Reveal className="tm-table-wrap">
            <table className="tm-table">
              <thead>
                <tr>
                  <th scope="col">Feature / Capability</th>
                  <th scope="col">1 Month Plan</th>
                  <th scope="col" className="is-featured">3 Months Plan</th>
                  <th scope="col">1 Year Plan</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.feature}>
                    <th scope="row">{row.feature}</th>
                    <ComparisonCell value={row.oneMonth} />
                    <ComparisonCell value={row.threeMonths} featured />
                    <ComparisonCell value={row.oneYear} />
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </PageContainer>
      </section>

      {/* FAQs */}
      <section className="tm-section is-bordered">
        <PageContainer maxWidth="860px">
          <SectionHeader
            eyebrow="Got Questions?"
            title="Frequently Asked Questions"
            subtitle="Transparent answers to common questions about billing, hardware, and setups."
          />

          <Reveal className="tm-faq">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={faq.q} className={`tm-faq-item ${isOpen ? 'is-open' : ''}`}>
                  <button
                    type="button"
                    className="tm-faq-q"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    aria-controls={`tm-faq-${idx}`}
                  >
                    <span>{faq.q}</span>
                    <Plus size={20} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`tm-faq-${idx}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
                        style={{ overflow: 'hidden' }}
                      >
                        <p className="tm-faq-a">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </Reveal>
        </PageContainer>
      </section>
    </div>
  );
}
