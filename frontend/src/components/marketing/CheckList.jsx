import React from 'react';
import { Check, X } from 'lucide-react';

export default function CheckList({ items, variant = 'positive', compact = false, className = '' }) {
  const Icon = variant === 'negative' ? X : Check;
  const classes = [
    'tm-checklist',
    variant === 'negative' ? 'is-negative' : '',
    compact ? 'is-compact' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <ul className={classes}>
      {items.map((item) => (
        <li key={item}>
          <span className="tm-check-icon" aria-hidden="true">
            <Icon size={12} strokeWidth={3} />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
