import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, QrCode, ChefHat, TrendingUp, ArrowRight, Sparkles } from 'lucide-react';
import { TableMintBrandBadge } from './TableMintLogoIcon';

export const PROMO_BANNERS = [
  {
    id: 1,
    badge: 'SMART QR ORDERING',
    title: 'Instant QR Table Ordering',
    subtitle: 'Guests scan tabletop QR stands to browse menu and order directly. Tickets sync to POS & KDS.',
    tabTarget: 'orders',
    ctaText: 'View Orders',
    icon: <QrCode size={22} style={{ color: '#ffffff' }} />,
    bgGradient: 'linear-gradient(135deg, #0284C7 0%, #0369A1 50%, #0B132B 100%)',
    accentColor: '#38BDF8'
  },
  {
    id: 2,
    badge: 'KITCHEN AUTOMATION',
    title: 'Real-Time Kitchen Display',
    subtitle: 'Instant ticket routing, live dish countdowns, and chime alerts keep kitchen staff moving fast.',
    tabTarget: 'kitchen',
    ctaText: 'Open KDS',
    icon: <ChefHat size={22} style={{ color: '#ffffff' }} />,
    bgGradient: 'linear-gradient(135deg, #0369A1 0%, #0284C7 55%, #0B132B 100%)',
    accentColor: '#7DD3FC'
  },
  {
    id: 3,
    badge: 'DYNAMIC SETTLEMENT',
    title: 'Smart Analytics & Billing',
    subtitle: 'Dynamic UPI QR billing, automatic GST calculations, and real-time revenue velocity reports.',
    tabTarget: 'reports',
    ctaText: 'Sales Reports',
    icon: <TrendingUp size={22} style={{ color: '#ffffff' }} />,
    bgGradient: 'linear-gradient(135deg, #0B132B 0%, #1E3A8A 50%, #0284C7 100%)',
    accentColor: '#BAE6FD'
  }
];

export default function TableMintBannerSlider({ onSelectTab, className = '' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Auto-scroll every 4.5 seconds
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % PROMO_BANNERS.length);
    }, 4500);

    return () => clearInterval(interval);
  }, [isPaused]);

  const goToSlide = (idx, e) => {
    if (e) e.stopPropagation();
    setCurrentIndex(idx);
  };

  const nextSlide = (e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % PROMO_BANNERS.length);
  };

  const prevSlide = (e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + PROMO_BANNERS.length) % PROMO_BANNERS.length);
  };

  const handleTouchStart = (e) => {
    setIsPaused(true);
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = 0;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchEndX.current !== 0) {
      const diff = touchStartX.current - touchEndX.current;
      if (diff > 35) {
        setCurrentIndex((prev) => (prev + 1) % PROMO_BANNERS.length);
      } else if (diff < -35) {
        setCurrentIndex((prev) => (prev - 1 + PROMO_BANNERS.length) % PROMO_BANNERS.length);
      }
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
    setTimeout(() => setIsPaused(false), 2500);
  };

  const handleBannerClick = (tabTarget) => {
    if (onSelectTab && tabTarget) {
      onSelectTab(tabTarget);
    }
  };

  return (
    <div
      className={`mobile-promo-hero-banner ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="region"
      aria-roledescription="carousel"
      aria-label="TableMint Featured Highlights"
    >
      {/* Sliding Track */}
      <div
        className="promo-slider-track"
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
        }}
      >
        {PROMO_BANNERS.map((banner, idx) => (
          <div
            key={banner.id}
            className="promo-slider-slide"
            onClick={() => handleBannerClick(banner.tabTarget)}
            role="group"
            aria-roledescription="slide"
            aria-label={`${idx + 1} of ${PROMO_BANNERS.length}`}
            style={{
              background: banner.bgGradient,
              borderRadius: 16,
              padding: '14px 16px',
              color: '#ffffff',
              boxSizing: 'border-box',
              minHeight: 126,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer'
            }}
          >
            {/* Background ambient decorative shapes */}
            <div style={{
              position: 'absolute',
              right: -15,
              top: -20,
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />
            <div style={{
              position: 'absolute',
              right: 60,
              bottom: -25,
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(2, 132, 199, 0.3) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />

            {/* Left Content Column */}
            <div style={{ position: 'relative', zIndex: 2, maxWidth: '75%', minWidth: 0 }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(255, 255, 255, 0.16)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                padding: '2px 8px',
                borderRadius: 9999,
                fontSize: '0.62rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                color: banner.accentColor,
                marginBottom: 4
              }}>
                <Sparkles size={10} />
                <span>{banner.badge}</span>
              </div>

              <h3 style={{
                margin: '0 0 3px 0',
                fontSize: '1.02rem',
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {banner.title}
              </h3>

              <p style={{
                margin: '0 0 8px 0',
                fontSize: '0.74rem',
                color: 'rgba(255, 255, 255, 0.88)',
                lineHeight: 1.35,
                maxWidth: 360,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {banner.subtitle}
              </p>

              <button
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: '#ffffff',
                  color: '#0284C7',
                  border: 'none',
                  borderRadius: 8,
                  padding: '5px 11px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.14)',
                  transition: 'transform 0.15s ease'
                }}
              >
                <span>{banner.ctaText}</span>
                <ArrowRight size={12} />
              </button>
            </div>

            {/* Right Visual Emblem */}
            <div style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              paddingLeft: 10
            }}>
              <div style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.14)',
                border: '1px solid rgba(255, 255, 255, 0.28)',
                boxShadow: '0 6px 18px rgba(0, 0, 0, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                marginBottom: 4
              }}>
                {banner.icon}
              </div>
              <TableMintBrandBadge size={16} style={{ opacity: 0.95 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Prev Navigation Arrow */}
      <button
        type="button"
        className="promo-slider-arrow prev"
        onClick={prevSlide}
        aria-label="Previous Banner"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Next Navigation Arrow */}
      <button
        type="button"
        className="promo-slider-arrow next"
        onClick={nextSlide}
        aria-label="Next Banner"
      >
        <ChevronRight size={16} />
      </button>

      {/* Pagination Pill Dots (Bottom-Right Glass Container so it never overlaps the left CTA button) */}
      <div className="promo-slider-dots-pill">
        {PROMO_BANNERS.map((b, idx) => (
          <button
            key={b.id}
            type="button"
            className={`promo-slider-dot ${currentIndex === idx ? 'active' : ''}`}
            onClick={(e) => goToSlide(idx, e)}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
