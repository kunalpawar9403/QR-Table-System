import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ChevronDown } from 'lucide-react';

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();

  const [openSections, setOpenSections] = useState({
    product: false,
    modules: false,
    solutions: false,
    company: false
  });

  const toggleSection = (key) => {
    setOpenSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <footer className="tm-saas-footer">
      <div className="tm-footer-grid">
        {/* Brand Column */}
        <div className="tm-footer-brand-col">
          <Link to="/" className="tm-brand-link" style={{ width: 'fit-content' }}>
            <img 
              src="/images/tablemint_icon.png" 
              alt="TableMint Logo" 
              className="tm-brand-logo-img"
              onError={(e) => { e.currentTarget.src = '/images/tablemint_logo.jpg'; }}
            />
            <div>
              <span className="tm-brand-name">Table</span>
              <span className="tm-brand-accent">Mint</span>
            </div>
          </Link>
          <p className="tm-footer-desc">
            The next-generation restaurant operating system & cloud POS. Built for high-volume dining, instant contactless QR ordering, kitchen display management, and automated GST billing.
          </p>
          <div className="tm-footer-status-pill">
            <span className="tm-footer-status-dot"></span>
            <span>All Systems Operational (99.98% Uptime)</span>
          </div>
        </div>

        {/* Product Column */}
        <div className={`tm-footer-col ${openSections.product ? 'is-open' : ''}`}>
          <button 
            type="button" 
            className="tm-footer-accordion-header"
            onClick={() => toggleSection('product')}
            aria-expanded={openSections.product}
          >
            <h4>Product</h4>
            <ChevronDown size={18} className={`tm-footer-chevron ${openSections.product ? 'open' : ''}`} />
          </button>
          <div className={`tm-footer-links-wrapper ${openSections.product ? 'open' : ''}`}>
            <ul className="tm-footer-links">
              <li><Link to="/features">All Features</Link></li>
              <li><Link to="/how-it-works">How It Works</Link></li>
              <li><Link to="/pricing">Pricing Plans</Link></li>
              <li><Link to="/demo">Live Interactive Demo</Link></li>
              <li><Link to="/solutions">Industry Solutions</Link></li>
            </ul>
          </div>
        </div>

        {/* Features / Modules Quicklinks */}
        <div className={`tm-footer-col ${openSections.modules ? 'is-open' : ''}`}>
          <button 
            type="button" 
            className="tm-footer-accordion-header"
            onClick={() => toggleSection('modules')}
            aria-expanded={openSections.modules}
          >
            <h4>Modules</h4>
            <ChevronDown size={18} className={`tm-footer-chevron ${openSections.modules ? 'open' : ''}`} />
          </button>
          <div className={`tm-footer-links-wrapper ${openSections.modules ? 'open' : ''}`}>
            <ul className="tm-footer-links">
              <li><Link to="/features#pos-billing">Express POS Billing</Link></li>
              <li><Link to="/features#table-mgmt">Live Table Layout</Link></li>
              <li><Link to="/features#kds">Kitchen Display System</Link></li>
              <li><Link to="/features#qr-menu">Contactless QR Menu</Link></li>
              <li><Link to="/features#analytics">Sales & GST Reports</Link></li>
              <li><Link to="/features#staff">Staff PIN Roles</Link></li>
            </ul>
          </div>
        </div>

        {/* Solutions Column */}
        <div className={`tm-footer-col ${openSections.solutions ? 'is-open' : ''}`}>
          <button 
            type="button" 
            className="tm-footer-accordion-header"
            onClick={() => toggleSection('solutions')}
            aria-expanded={openSections.solutions}
          >
            <h4>Solutions</h4>
            <ChevronDown size={18} className={`tm-footer-chevron ${openSections.solutions ? 'open' : ''}`} />
          </button>
          <div className={`tm-footer-links-wrapper ${openSections.solutions ? 'open' : ''}`}>
            <ul className="tm-footer-links">
              <li><Link to="/solutions#restaurants">Fine Dining</Link></li>
              <li><Link to="/solutions#cafes">Cafes & QSR</Link></li>
              <li><Link to="/solutions#bars">Bars & Nightlife</Link></li>
              <li><Link to="/solutions#cloud-kitchen">Cloud Kitchens</Link></li>
              <li><Link to="/solutions#chains">Multi-Outlet Chains</Link></li>
            </ul>
          </div>
        </div>

        {/* Company & Support */}
        <div className={`tm-footer-col ${openSections.company ? 'is-open' : ''}`}>
          <button 
            type="button" 
            className="tm-footer-accordion-header"
            onClick={() => toggleSection('company')}
            aria-expanded={openSections.company}
          >
            <h4>Company</h4>
            <ChevronDown size={18} className={`tm-footer-chevron ${openSections.company ? 'open' : ''}`} />
          </button>
          <div className={`tm-footer-links-wrapper ${openSections.company ? 'open' : ''}`}>
            <ul className="tm-footer-links">
              <li><Link to="/demo">Watch Video Demo</Link></li>
              <li><Link to="/contact">Email Support</Link></li>
              <li><Link to="/login">Partner Sign In</Link></li>
              <li><Link to="/register">Create Account</Link></li>
              <li><a href="mailto:support@tablemint.com">support@tablemint.com</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="tm-footer-bottom">
        <div className="tm-footer-copyright">
          © {currentYear} TableMint Technologies Pvt. Ltd. All rights reserved.
        </div>
        <div className="tm-footer-compliance-badge">
          <ShieldCheck size={16} style={{ color: '#10b981', flexShrink: 0 }} />
          <span>PCI-DSS & ISO 27001 Compliant Architecture</span>
        </div>
        <div className="tm-footer-legal-links">
          <Link to="/contact">Privacy Policy</Link>
          <Link to="/contact">Terms of Service</Link>
          <Link to="/contact">Security</Link>
        </div>
      </div>
    </footer>
  );
}
