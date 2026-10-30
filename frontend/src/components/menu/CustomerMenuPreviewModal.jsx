import React, { useState } from 'react';
import { X, Search, UtensilsCrossed, Smartphone, Check, ExternalLink } from 'lucide-react';

export default function CustomerMenuPreviewModal({
  isOpen,
  onClose,
  restaurantName = 'TableMint',
  restaurantSlug = 'tablemint',
  menu = [],
  categories = []
}) {
  const [selectedCat, setSelectedCat] = useState('all');
  const [search, setSearch] = useState('');
  const [vegOnly, setVegOnly] = useState(false);

  if (!isOpen) return null;

  // Filter only published and available dishes (Customer QR experience)
  const publishedDishes = menu.filter(dish =>
    dish.status !== 'draft' &&
    dish.available !== false &&
    dish.isAvailable !== false
  );

  const displayCategories = categories.length > 0
    ? categories
    : [...new Set(publishedDishes.map(d => d.category))].map(c => ({ id: c, name: c }));

  const filtered = publishedDishes.filter(dish => {
    if (selectedCat !== 'all' && dish.category?.toLowerCase() !== selectedCat.toLowerCase()) return false;
    if (vegOnly && !dish.isVeg) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return dish.name.toLowerCase().includes(q) || (dish.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  const fullQrUrl = `${window.location.origin}/customer?restaurant=${encodeURIComponent(restaurantSlug)}&table=1`;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1250 }}>
      <div
        className="dash-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 480,
          width: '92vw',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 24,
          padding: 0,
          overflow: 'hidden',
          background: '#0f172a'
        }}
      >
        {/* Top Floating Control Bar */}
        <div style={{
          padding: '12px 18px',
          background: '#1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#ffffff',
          borderBottom: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Smartphone size={18} style={{ color: '#10b981' }} />
            <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>
              Live Customer QR Preview
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <a
              href={fullQrUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.78rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
              title="Open full screen in new tab"
            >
              Open Live <ExternalLink size={12} />
            </a>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Mobile Phone Mockup Body */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          background: '#f4f6f8',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Mock Phone Status & Header */}
          <div style={{
            background: '#07241a',
            padding: '14px 16px 16px',
            color: '#ffffff'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a7f3d0' }}>
                9:41 AM
              </span>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                padding: '2px 8px',
                borderRadius: 12
              }}>
                Table 1
              </span>
            </div>

            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 2px', color: '#ffffff' }}>
              {restaurantName}
            </h4>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
              Smart QR Menu • Dine-in Session Active
            </p>

            {/* In-app Search bar */}
            <div style={{
              marginTop: 12,
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 10,
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <Search size={14} style={{ color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search dishes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  outline: 'none',
                  width: '100%'
                }}
              />
            </div>
          </div>

          {/* Categories Horizontal Scroll */}
          <div style={{
            background: '#ffffff',
            padding: '10px 14px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            gap: 8,
            overflowX: 'auto'
          }}>
            <button
              type="button"
              onClick={() => setSelectedCat('all')}
              style={{
                padding: '4px 12px',
                borderRadius: 16,
                fontSize: '0.78rem',
                fontWeight: 700,
                border: 'none',
                background: selectedCat === 'all' ? '#07241a' : '#f1f5f9',
                color: selectedCat === 'all' ? '#ffffff' : '#64748b',
                whiteSpace: 'nowrap',
                cursor: 'pointer'
              }}
            >
              All ({publishedDishes.length})
            </button>
            {displayCategories.map(cat => (
              <button
                key={cat.id || cat.name}
                type="button"
                onClick={() => setSelectedCat(cat.name)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 16,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: 'none',
                  background: selectedCat.toLowerCase() === cat.name.toLowerCase() ? '#07241a' : '#f1f5f9',
                  color: selectedCat.toLowerCase() === cat.name.toLowerCase() ? '#ffffff' : '#64748b',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Veg Only Toggle */}
          <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={vegOnly}
                onChange={(e) => setVegOnly(e.target.checked)}
              />
              Veg Only
            </label>
          </div>

          {/* Dish Cards List */}
          <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', background: '#ffffff', borderRadius: 14 }}>
                <UtensilsCrossed size={28} style={{ color: '#cbd5e1', marginBottom: 8 }} />
                <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', margin: 0 }}>
                  No published dishes found
                </p>
                <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
                  Ensure items are marked as "Published" in your menu management tab.
                </p>
              </div>
            ) : (
              filtered.map(dish => (
                <div key={dish.id} style={{
                  background: '#ffffff',
                  borderRadius: 12,
                  padding: 12,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  border: '1px solid #e2e8f0'
                }}>
                  <img
                    src={dish.image || '/images/paneer_butter_masala.jpg'}
                    alt={dish.name}
                    style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                    onError={(e) => { e.target.src = '/images/paneer_butter_masala.jpg'; }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span className={`diet-box ${dish.isVeg ? 'veg' : 'non-veg'}`} style={{ width: 8, height: 8 }} />
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {dish.name}
                      </span>
                    </div>
                    {dish.description && (
                      <p style={{ fontSize: '0.74rem', color: '#64748b', margin: '0 0 4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {dish.description}
                      </p>
                    )}
                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>
                      ₹{dish.price}
                    </span>
                  </div>
                  <button
                    type="button"
                    style={{
                      padding: '5px 12px',
                      borderRadius: 14,
                      border: '1px solid #10b981',
                      background: '#ecfdf5',
                      color: '#059669',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    ADD
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div style={{
          padding: '10px 18px',
          background: '#1e293b',
          fontSize: '0.75rem',
          color: '#94a3b8',
          textAlign: 'center',
          borderTop: '1px solid #334155'
        }}>
          💡 Only published & available dishes appear in customer QR ordering. Draft items remain hidden.
        </div>
      </div>
    </div>
  );
}
