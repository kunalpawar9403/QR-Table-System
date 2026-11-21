import React from 'react';
import { Outlet } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';
import ScrollToTop from './ScrollToTop';
import '../../styles/saas-website.css';

export default function PublicLayout({ children }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="tm-saas-root">
        <ScrollToTop />
        <PublicNavbar />
        <main className="tm-saas-main">
          {children || <Outlet />}
        </main>
        <PublicFooter />
      </div>
    </MotionConfig>
  );
}
