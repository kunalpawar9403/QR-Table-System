import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import CheckList from './CheckList';

const formatINR = (value) => value.toLocaleString('en-IN');

/**
 * plan: { id, name, tagline, price, originalPrice, note, badge, savingsTag, highlight, ctaText, features[] }
 */
export default function PlanCard({ plan }) {
  const price = plan.price ?? plan.monthlyPrice;
  const originalPrice = plan.originalPrice;
  const savingsTag = plan.savingsTag;
  const note = plan.note;

  return (
    <article className={`tm-plan ${plan.highlight ? 'is-featured' : ''}`}>
      <div className="tm-plan-name-row">
        <h3 className="tm-plan-name">{plan.name}</h3>
        {savingsTag && <span className="tm-plan-badge is-discount">{savingsTag}</span>}
        {!savingsTag && plan.badge && <span className="tm-plan-badge">{plan.badge}</span>}
      </div>
      <p className="tm-plan-tagline">{plan.tagline}</p>

      <div className="tm-plan-price">
        {originalPrice && (
          <span
            className="tm-plan-original"
            style={{
              textDecoration: 'line-through',
              color: plan.highlight ? 'rgba(255,255,255,0.45)' : '#94a3b8',
              fontSize: '1.05rem',
              marginRight: '8px',
              fontWeight: 500
            }}
          >
            ₹{formatINR(originalPrice)}
          </span>
        )}
        <span className="tm-plan-amount">₹{formatINR(price)}</span>
        <span className="tm-plan-period">/ month</span>
      </div>
      {note && <p className="tm-plan-note">{note}</p>}

      <CheckList items={plan.features} compact />

      <Link
        to={plan.to || `/register?plan=${plan.id}`}
        className={`tm-btn tm-btn-block ${plan.highlight ? 'tm-btn-light' : 'tm-btn-secondary'}`}
      >
        <span>{plan.ctaText}</span>
        <ArrowRight size={16} />
      </Link>
    </article>
  );
}
