import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';

export default function OnboardingProgressBanner({
  settings = {},
  categories = [],
  menu = [],
  tables = [],
  onNavigateTab,
  onOpenPreview
}) {
  const [collapsed, setCollapsed] = useState(false);

  const steps = [
    {
      id: 'profile',
      label: 'Complete restaurant profile',
      isCompleted: Boolean(settings.restaurantName && settings.phone && settings.email),
      action: () => onNavigateTab('settings')
    },
    {
      id: 'categories',
      label: 'Add menu categories',
      isCompleted: categories.length > 0,
      action: () => onNavigateTab('menu')
    },
    {
      id: 'items',
      label: 'Add menu items',
      isCompleted: menu.length > 0,
      action: () => onNavigateTab('menu')
    },
    {
      id: 'tables',
      label: 'Configure tables',
      isCompleted: tables.length > 0,
      action: () => onNavigateTab('tables')
    },
    {
      id: 'payment',
      label: 'Configure tax and UPI payment',
      isCompleted: Boolean(settings.upiId && settings.taxRate !== undefined),
      action: () => onNavigateTab('settings')
    },
    {
      id: 'stands',
      label: 'Generate QR table stands',
      isCompleted: tables.some(t => t.sessionToken),
      action: () => onNavigateTab('stands')
    },
    {
      id: 'preview',
      label: 'Preview customer QR menu',
      isCompleted: menu.filter(m => m.status === 'published').length > 0,
      action: () => onOpenPreview ? onOpenPreview() : onNavigateTab('menu')
    }
  ];

  const completedCount = steps.filter(s => s.isCompleted).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  // If 100% completed, don't overwhelm the dashboard
  if (progressPercent === 100) return null;

  return (
    <section className={`onboarding-progress-banner ${collapsed ? 'is-collapsed' : ''}`} aria-label="Restaurant setup progress">
      <div className="onboarding-header-row">
        <div className="onboarding-header-left">
          <span className="onboarding-eyebrow">Getting started</span>
          <h4 className="onboarding-title">
            Restaurant setup <span className="onboarding-percent">{progressPercent}% complete</span>
          </h4>
          {!collapsed && (
            <p className="onboarding-sub">
              {completedCount} of {steps.length} steps complete. Follow the checklist to launch your dining room.
            </p>
          )}
        </div>

        <div className="onboarding-header-right">
          <div
            className="onboarding-progress-bar-wrap"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Setup progress"
          >
            <div className="onboarding-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>

          <button
            type="button"
            className="onboarding-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand Checklist' : 'Collapse Checklist'}
          >
            {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <ol className="onboarding-checklist-grid">
          {steps.map((step, index) => (
            <li key={step.id}>
              <button
                type="button"
                className={`onboarding-step ${step.isCompleted ? 'is-done' : 'is-todo'}`}
                onClick={step.action}
              >
                <span className="onboarding-step-mark" aria-hidden="true">
                  {step.isCompleted ? <Check size={13} strokeWidth={2.5} /> : index + 1}
                </span>
                <span className="onboarding-step-label">{step.label}</span>
                {!step.isCompleted && <ArrowRight size={15} className="onboarding-step-arrow" aria-hidden="true" />}
                <span className="sr-only">{step.isCompleted ? ' (completed)' : ' (to do)'}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
