import React from 'react';
import Reveal from './Reveal';

export default function SectionHeader({ eyebrow, title, subtitle, align = 'center', children }) {
  return (
    <Reveal className={`tm-section-header ${align === 'left' ? 'is-left' : ''}`}>
      {eyebrow && <span className="tm-eyebrow">{eyebrow}</span>}
      <h2 className="tm-section-title">{title}</h2>
      {subtitle && <p className="tm-section-subtitle">{subtitle}</p>}
      {children}
    </Reveal>
  );
}
