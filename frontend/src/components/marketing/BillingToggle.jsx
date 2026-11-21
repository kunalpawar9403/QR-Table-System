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
        Monthly
      </button>
      <button
        type="button"
        className={value === 'yearly' ? 'is-active' : ''}
        aria-pressed={value === 'yearly'}
        onClick={() => onChange('yearly')}
      >
        <span>Annual</span>
        <span className="tm-billing-save">Save 20%</span>
      </button>
    </div>
  );
}
