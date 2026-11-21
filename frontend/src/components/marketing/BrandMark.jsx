import React from 'react';
import { Link } from 'react-router-dom';
import { TableMintBrandBadge } from '../TableMintLogoIcon';

export default function BrandMark({ size = 32, tone = 'dark', onClick }) {
  const handleClick = (e) => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Link
      to="/"
      onClick={handleClick}
      className={`tm-brand ${tone === 'light' ? 'is-light' : ''}`}
      aria-label="TableMint home"
    >
      <TableMintBrandBadge size={size} style={{ boxShadow: 'none' }} />
      <span className="tm-brand-word" aria-hidden="true">
        Table<span className="tm-brand-accent">Mint</span>
      </span>
    </Link>
  );
}
