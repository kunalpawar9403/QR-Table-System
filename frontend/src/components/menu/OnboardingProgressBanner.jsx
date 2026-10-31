import React, { useState } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

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
    <div style={{
      background: 'linear-gradient(135deg, #07241a 0%, #0d3829 100%)',
      borderRadius: 16,
      padding: collapsed ? '12px 20px' : '20px 24px',
      color: '#ffffff',
      marginBottom: 20,
      boxShadow: '0 4px 16px rgba(7, 36, 26, 0.15)',
      transition: 'all 0.2s ease'
    }}>
      {/* Top Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'rgba(16, 185, 129, 0.2)',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={16} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.96rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
              Restaurant Setup Progress ({progressPercent}%)
            </h4>
            {!collapsed && (
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '2px 0 0' }}>
                {completedCount} of {steps.length} steps complete. Follow the checklist to launch your dining room.
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Progress Bar in Header */}
          <div style={{
            width: 120,
            height: 8,
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: 4,
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: '#10b981',
              borderRadius: 4,
              transition: 'width 0.4s ease'
            }} />
          </div>

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 4
            }}
            title={collapsed ? 'Expand Checklist' : 'Collapse Checklist'}
          >
            {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      {/* Expanded Checklist Grid */}
      {!collapsed && (
        <div style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 10
        }}>
          {steps.map(step => (
            <div
              key={step.id}
              onClick={step.action}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                borderRadius: 8,
                background: step.isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = step.isCompleted
                  ? 'rgba(16, 185, 129, 0.18)'
                  : 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = step.isCompleted
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(255, 255, 255, 0.05)';
              }}
            >
              {step.isCompleted ? (
                <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
              ) : (
                <Circle size={16} style={{ color: '#64748b', flexShrink: 0 }} />
              )}
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: step.isCompleted ? '#a7f3d0' : '#cbd5e1',
                textDecoration: step.isCompleted ? 'line-through' : 'none'
              }}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
