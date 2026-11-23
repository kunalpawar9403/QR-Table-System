import React from 'react';

export default function BillingToggle({ value, onChange }) {
  return (
    <div className="tm-billing-toggle" role="group" aria-label="Billing cycle">
      <button
        type="button"
        className={value === 'monthly' ? 'is-active' : ''}
        aria-pressed={value === 'monthly'}
        onClick={() => onChange('monthly')}
      >
        <span>1 Month</span>
      </button>

      <button
        type="button"
        className={value === 'quarterly' ? 'is-active' : ''}
        aria-pressed={value === 'quarterly'}
        onClick={() => onChange('quarterly')}
      >
        <span>3 Months</span>
        <span className="tm-billing-save">Save 10%</span>
      </button>

      <button
        type="button"
        className={value === 'yearly' ? 'is-active' : ''}
        aria-pressed={value === 'yearly'}
        onClick={() => onChange('yearly')}
      >
        <span>1 Year</span>
        <span className="tm-billing-save">Save 25%</span>
      </button>
    </div>
  );
}
