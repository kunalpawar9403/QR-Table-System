import React from 'react';
import { Outlet } from 'react-router-dom';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';
import ScrollToTop from './ScrollToTop';
import '../../styles/saas-website.css';

export default function PublicLayout({ children }) {
  return (
    <div className="tm-saas-root">
      <ScrollToTop />
      <PublicNavbar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children || <Outlet />}
      </main>
      <PublicFooter />
    </div>
  );
}
