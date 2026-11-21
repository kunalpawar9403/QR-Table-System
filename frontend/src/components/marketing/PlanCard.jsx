import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import CheckList from './CheckList';

const formatINR = (value) => value.toLocaleString('en-IN');

/**
 * plan: { id, name, tagline, monthlyPrice, yearlyPrice, badge, highlight, ctaText, features[] }
 */
export default function PlanCard({ plan, billingCycle }) {
  const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;

  return (
    <article className={`tm-plan ${plan.highlight ? 'is-featured' : ''}`}>
      <div className="tm-plan-name-row">
        <h3 className="tm-plan-name">{plan.name}</h3>
        {plan.badge && <span className="tm-plan-badge">{plan.badge}</span>}
      </div>
      <p className="tm-plan-tagline">{plan.tagline}</p>

      <div className="tm-plan-price">
        <span className="tm-plan-amount">₹{formatINR(price)}</span>
        <span className="tm-plan-period">/ month</span>
      </div>
      <p className="tm-plan-note">
        {billingCycle === 'yearly'
          ? `Billed annually (₹${formatINR(price * 12)}/year)`
          : 'Billed monthly'}
      </p>

      <CheckList items={plan.features} compact />

      <Link
        to={`/register?plan=${plan.id}`}
        className={`tm-btn tm-btn-block ${plan.highlight ? 'tm-btn-light' : 'tm-btn-secondary'}`}
      >
        <span>{plan.ctaText}</span>
        <ArrowRight size={16} />
      </Link>
    </article>
  );
}
