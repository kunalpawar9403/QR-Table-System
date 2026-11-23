import React from 'react';
import { Link } from 'react-router-dom';
import { MotionConfig, motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import BrandMark from '../marketing/BrandMark';
import CheckList from '../marketing/CheckList';
import { enterProps } from '../marketing/Reveal';
import '../../styles/saas-website.css';

/**
 * Split-screen layout for the login / register pages.
 * Left: brand story (hidden on small screens). Right: the form passed as children.
 */
export default function AuthShell({ title, description, points, asideFooter, children }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="tm-auth-shell">
        <aside className="tm-auth-aside">
          <BrandMark size={34} tone="light" />

          <motion.div className="tm-auth-aside-body" {...enterProps(0.05)}>
            <span className="tm-eyebrow">Modern Restaurant Management</span>
            <h1 className="tm-auth-title">{title}</h1>
            <p className="tm-auth-desc">{description}</p>
            <CheckList items={points} compact />
          </motion.div>

          <div className="tm-auth-aside-spacer" />

          <div className="tm-auth-aside-foot">{asideFooter}</div>
        </aside>

        <main className="tm-auth-main">
          <div className="tm-auth-topbar">
            <Link to="/" className="tm-auth-back">
              <ArrowLeft size={15} />
              <span>Back</span>
            </Link>
            <BrandMark size={32} />
          </div>

          <motion.div className="tm-auth-form-wrap" {...enterProps(0.1)}>
            <div className="tm-auth-mobile-hero">
              <img
                src="/images/landing/tablemint_noir_qr_table.jpg"
                alt="TableMint Restaurant & Contactless QR Table"
                className="tm-auth-mobile-hero-img"
              />
            </div>
            {children}
          </motion.div>
        </main>
      </div>
    </MotionConfig>
  );
}
