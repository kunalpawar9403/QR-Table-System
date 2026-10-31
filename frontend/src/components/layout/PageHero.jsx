import React from 'react';
import { Sparkles } from 'lucide-react';

export default function PageHero({
  badge,
  title,
  titleAccent,
  description,
  actions,
  children
}) {
  return (
    <div className="tm-page-hero-wrapper">
      <section className="tm-page-hero">
        <div className="tm-page-hero-inner">
          {badge && (
            <div className="tm-hero-badge">
              <Sparkles size={14} />
              <span>{badge}</span>
            </div>
          )}

          <h1 className="tm-page-hero-title" style={{ color: '#FFFFFF' }}>
            <span style={{ color: '#FFFFFF', WebkitTextFillColor: '#FFFFFF' }}>{title}</span>{' '}
            {titleAccent && <span style={{ color: '#16C995', background: 'linear-gradient(135deg, #FFFFFF 30%, #16C995 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{titleAccent}</span>}
          </h1>

          {description && (
            <p className="tm-page-hero-desc">
              {description}
            </p>
          )}

          {actions && (
            <div className="tm-page-hero-actions">
              {actions}
            </div>
          )}

          {children}
        </div>
      </section>
    </div>
  );
}
