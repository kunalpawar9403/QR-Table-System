import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ShieldCheck } from 'lucide-react';
import BrandMark from '../marketing/BrandMark';

const FOOTER_COLUMNS = [
  {
    key: 'product',
    title: 'Product',
    links: [
      { label: 'All Features', to: '/features' },
      { label: 'How It Works', to: '/how-it-works' },
      { label: 'Pricing Plans', to: '/pricing' },
      { label: 'Industry Solutions', to: '/solutions' }
    ]
  },
  {
    key: 'modules',
    title: 'Modules',
    links: [
      { label: 'Express POS Billing', to: '/features#pos-billing' },
      { label: 'Live Table Layout', to: '/features#table-mgmt' },
      { label: 'Kitchen Display System', to: '/features#kds' },
      { label: 'Contactless QR Menu', to: '/features#qr-menu' },
      { label: 'Sales & GST Reports', to: '/features#reports' },
      { label: 'Staff PIN Roles', to: '/features#staff-mgmt' }
    ]
  },
  {
    key: 'solutions',
    title: 'Solutions',
    links: [
      { label: 'Fine Dining', to: '/solutions#restaurants' },
      { label: 'Cafes & QSR', to: '/solutions#cafes' },
      { label: 'Bars & Nightlife', to: '/solutions#bars' },
      { label: 'Cloud Kitchens', to: '/solutions#cloud-kitchen' },
      { label: 'Multi-Outlet Chains', to: '/solutions' }
    ]
  },
  {
    key: 'company',
    title: 'Company',
    links: [
      { label: 'Email Support', to: '/contact' },
      { label: 'Partner Sign In', to: '/login' },
      { label: 'Create Account', to: '/register' },
      { label: 'support@tablemint.com', href: 'mailto:support@tablemint.com' }
    ]
  }
];

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();
  const [openSections, setOpenSections] = useState({
    product: false,
    modules: false,
    solutions: false,
    company: false
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <footer className="tm-footer">
      <div className="tm-footer-inner">
        <div className="tm-footer-grid">
          <div className="tm-footer-brand">
            <BrandMark />
            <p className="tm-footer-desc">
              The next-generation restaurant operating system & cloud POS. Built for high-volume dining, instant contactless QR ordering, kitchen display management, and automated GST billing.
            </p>
          </div>

          {FOOTER_COLUMNS.map((col) => {
            const isOpen = Boolean(openSections[col.key]);
            return (
              <div key={col.key} className="tm-footer-col">
                <button
                  type="button"
                  className="tm-footer-col-head"
                  onClick={() => toggleSection(col.key)}
                  aria-expanded={isOpen}
                  aria-controls={`tm-footer-${col.key}`}
                >
                  <h4>{col.title}</h4>
                  <ChevronDown size={18} className={`tm-footer-chevron ${isOpen ? 'is-open' : ''}`} />
                </button>
                <div id={`tm-footer-${col.key}`} className={`tm-footer-links-wrap ${isOpen ? 'is-open' : ''}`}>
                  <ul className="tm-footer-links">
                    {col.links.map((link) => (
                      <li key={link.label}>
                        {link.href
                          ? <a href={link.href}>{link.label}</a>
                          : <Link to={link.to}>{link.label}</Link>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        <div className="tm-footer-bottom">
          <span>© {currentYear} TableMint Technologies Pvt. Ltd. All rights reserved.</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: '0.82rem' }}>
            <ShieldCheck size={16} style={{ color: '#0284C7', flexShrink: 0 }} />
            <span>PCI-DSS & ISO 27001 Compliant Architecture</span>
          </div>
          <nav className="tm-footer-legal" aria-label="Legal">
            <Link to="/contact">Privacy Policy</Link>
            <Link to="/contact">Terms of Service</Link>
            <Link to="/contact">Security</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
