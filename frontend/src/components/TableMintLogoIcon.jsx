import React from 'react';

/**
 * TableMint crisp vector leaf logo for mobile header & brand badges.
 * Uses high-contrast emerald (#10b981), bright mint (#34d399), and pure white (#ffffff)
 * without external defs/filters to guarantee 100% razor-sharp visibility on all mobile displays.
 */
export function TableMintLogoIcon({ size = 22, className = '' }) {
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
      {/* Leaf blade background */}
      <path
        d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"
        fill="#10b981"
        stroke="#34d399"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Leaf inner highlight */}
      <path
        d="M11 18A5 5 0 0 1 10.2 8C14 7.2 15.5 6.8 17 5c.8 1.5 1.5 3 1.5 6 0 4-3.5 7-7.5 7Z"
        fill="#6ee7b7"
        opacity="0.35"
      />
      {/* Central stem in bright white */}
      <path
        d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"
        stroke="#ffffff"
        strokeWidth="2.4"
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
        fill="#10b981"
        stroke="#34d399"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Leaf inner highlight */}
      <path
        d="M40 42A10 10 0 0 1 38.2 22C46 20.5 49 19.5 52 16c1.5 3 3 6 3 12 0 8-7 14-15 14Z"
        fill="#6ee7b7"
        opacity="0.35"
      />
      {/* Stem */}
      <path
        d="M24 48c0-6 3.7-10.72 10.16-12C39 35.04 44 32 46 30"
        stroke="#ffffff"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default TableMintLogoIcon;
