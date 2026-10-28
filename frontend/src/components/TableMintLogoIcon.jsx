import React from 'react';

/**
 * TableMint crisp vector leaf logo for mobile header & brand badges.
 * Provides high-contrast, luminous emerald/mint colors that shine against dark backgrounds.
 */
export function TableMintLogoIcon({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
      aria-label="TableMint Leaf"
    >
      <defs>
        <linearGradient id="tmLeafGradient" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#a7f3d0" />
        </linearGradient>
        <filter id="tmLeafGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#34d399" floodOpacity="0.45" />
        </filter>
      </defs>
      <path
        d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"
        fill="url(#tmLeafGradient)"
        stroke="#a7f3d0"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#tmLeafGlow)"
      />
      <path
        d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Screen 1 Fork & Leaf Splash / Auth Logo
 */
export function TableMintSplashLogo({ size = 68, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="TableMint Splash Logo"
    >
      <defs>
        <linearGradient id="splashLeafGrad" x1="20" y1="52" x2="56" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
      {/* Fork */}
      <path
        d="M18 14V24M22 14V24M26 14V24M18 24C18 27.5 20.5 30 22 30V50M26 24C26 27.5 23.5 30 22 30"
        stroke="#ffffff"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Leaf */}
      <path
        d="M40 46A14 14 0 0 1 37.6 18.2C49 16 52 14.96 56 10c2 4 4 8.36 4 16 0 11-9.56 20-20 20Z"
        fill="url(#splashLeafGrad)"
        stroke="#a7f3d0"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 48c0-6 3.7-10.72 10.16-12C39 35.04 44 32 46 30"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default TableMintLogoIcon;
