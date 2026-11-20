import React from 'react';

/**
 * TableMint Brand Badge - Primary emblem matching the Slipzen Sky Blue theme.
 * Displays the high-end 3D AI-generated squircle app icon badge with glossy glass reflections
 * and vibrant Sky Blue gradient (#0284C7 to #0369A1).
 */
export function TableMintBrandBadge({ size = 36, className = '', style = {} }) {
  const radius = Math.round(size * 0.22);

  return (
    <img
      src="/images/tablemint_icon.png"
      alt="TableMint"
      width={size}
      height={size}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${radius}px`,
        boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
        objectFit: 'cover',
        ...style
      }}
      loading="eager"
    />
  );
}

/**
 * TableMint standalone vector icon (without outer badge), for buttons, table badges & mobile headers.
 */
export function TableMintLogoIcon({ size = 22, className = '', color = '#0284C7' }) {
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
        <linearGradient id="tmIconGrad" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>
      </defs>

      {/* Leaf blade background in Sky Blue */}
      <path
        d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"
        fill="url(#tmIconGrad)"
        stroke="#7DD3FC"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Leaf inner highlight */}
      <path
        d="M11 18A5 5 0 0 1 10.2 8C14 7.2 15.5 6.8 17 5c.8 1.5 1.5 3 1.5 6 0 4-3.5 7-7.5 7Z"
        fill="#BAE6FD"
        opacity="0.4"
      />
      {/* Central stem in bright white */}
      <path
        d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"
        stroke="#FFFFFF"
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
        <linearGradient id="tmSplashGrad" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>
      </defs>

      {/* Fork */}
      <path
        d="M18 14V24M22 14V24M26 14V24M18 24C18 27.5 20.5 30 22 30V50M26 24C26 27.5 23.5 30 22 30"
        stroke="#FFFFFF"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Leaf */}
      <path
        d="M40 46A14 14 0 0 1 37.6 18.2C49 16 52 14.96 56 10c2 4 4 8.36 4 16 0 11-9.56 20-20 20Z"
        fill="url(#tmSplashGrad)"
        stroke="#7DD3FC"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Leaf inner highlight */}
      <path
        d="M40 42A10 10 0 0 1 38.2 22C46 20.5 49 19.5 52 16c1.5 3 3 6 3 12 0 8-7 14-15 14Z"
        fill="#BAE6FD"
        opacity="0.4"
      />
      {/* Stem */}
      <path
        d="M24 48c0-6 3.7-10.72 10.16-12C39 35.04 44 32 46 30"
        stroke="#FFFFFF"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Full Brand Logo with Emblem Badge + Typography (TableMint)
 */
export function TableMintBrandLogo({
  size = 36,
  textColor = '#FFFFFF',
  accentColor = '#38BDF8',
  className = '',
  style = {}
}) {
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        textDecoration: 'none',
        ...style
      }}
    >
      <TableMintBrandBadge size={size} />
      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 800,
        fontSize: size >= 36 ? '1.35rem' : '1.15rem',
        letterSpacing: '-0.025em',
        lineHeight: 1,
        color: textColor
      }}>
        <span>Table</span>
        <span style={{ color: accentColor, marginLeft: '1px' }}>Mint</span>
      </div>
    </div>
  );
}

export default TableMintLogoIcon;
