import React, { useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PageHero from '../components/layout/PageHero';
import PageContainer from '../components/layout/PageContainer';
import CTASection from '../components/layout/CTASection';
import Reveal from '../components/marketing/Reveal';
import SectionHeader from '../components/marketing/SectionHeader';
import BillingToggle from '../components/marketing/BillingToggle';
import PlanCard from '../components/marketing/PlanCard';

const PLANS = [
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

const COMPARISON_ROWS = [
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
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="tm-pricing-page">
      <PageHero
        badge="Simple, Transparent SaaS Pricing"
        title="Zero Commissions. Zero Setup Fees."
        titleAccent="Just Modern POS."
        description="Choose the right plan for your floor capacity. Every plan includes cloud backup, automatic updates, and full database isolation."
      >
        <BillingToggle value={billingCycle} onChange={setBillingCycle} />
      </PageHero>

      {/* Plans */}
      <section className="tm-section">
        <PageContainer>
          <div className="tm-plan-grid">
            {PLANS.map((plan, idx) => (
              <Reveal key={plan.id} delay={idx * 0.06}>
                <PlanCard plan={plan} billingCycle={billingCycle} />
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
            title="Compare Features Side-by-Side"
            subtitle="Every detail matters when choosing your restaurant operating system."
          />

          <Reveal className="tm-table-wrap">
            <table className="tm-table">
              <thead>
                <tr>
                  <th scope="col">Feature / Capability</th>
                  <th scope="col">Starter</th>
                  <th scope="col" className="is-featured">Standard</th>
                  <th scope="col">Premium</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.feature}>
                    <th scope="row">{row.feature}</th>
                    <ComparisonCell value={row.starter} />
                    <ComparisonCell value={row.standard} featured />
                    <ComparisonCell value={row.premium} />
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

      <CTASection
        title="Ready to Elevate Your Restaurant Revenue?"
        subtitle="Start your 14-day free trial now. Up and running with your menu in under 10 minutes."
      />
    </div>
  );
}
