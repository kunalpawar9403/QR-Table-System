import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, QrCode, ChefHat, TrendingUp, ArrowRight, Sparkles } from 'lucide-react';
import { TableMintBrandBadge } from './TableMintLogoIcon';

export const PROMO_BANNERS = [
  {
    id: 1,
    badge: 'SMART CONTACTLESS DINING',
    title: 'Instant QR Table Ordering',
    subtitle: 'Guests scan tabletop QR stands to browse menu and order directly. Tickets sync straight to POS & KDS.',
    tabTarget: 'orders',
    ctaText: 'View Live Orders',
    icon: <QrCode size={32} style={{ color: '#ffffff' }} />,
    bgGradient: 'linear-gradient(135deg, #0284C7 0%, #0369A1 50%, #0B132B 100%)',
    accentColor: '#38BDF8'
  },
  {
    id: 2,
    badge: 'KITCHEN AUTOMATION',
    title: 'Real-Time Kitchen Display (KDS)',
    subtitle: 'Instant ticket routing, live dish countdowns, and chime alerts keep kitchen staff moving fast.',
    tabTarget: 'kitchen',
    ctaText: 'Open Kitchen Station',
    icon: <ChefHat size={32} style={{ color: '#ffffff' }} />,
    bgGradient: 'linear-gradient(135deg, #0369A1 0%, #0284C7 55%, #0B132B 100%)',
    accentColor: '#7DD3FC'
  },
  {
    id: 3,
    badge: 'REVENUE & SETTLEMENT',
    title: 'Smart Analytics & Instant Billing',
    subtitle: 'Dynamic UPI QR billing, automatic GST calculations, and real-time revenue velocity reports.',
    tabTarget: 'reports',
    ctaText: 'Explore Sales Reports',
    icon: <TrendingUp size={32} style={{ color: '#ffffff' }} />,
    bgGradient: 'linear-gradient(135deg, #0B132B 0%, #1E3A8A 50%, #0284C7 100%)',
    accentColor: '#BAE6FD'
  }
];

export default function TableMintBannerSlider({ onSelectTab, className = '' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Auto-scroll every 4 seconds
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % PROMO_BANNERS.length);
    }, 4000);

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
      if (diff > 40) {
        setCurrentIndex((prev) => (prev + 1) % PROMO_BANNERS.length);
      } else if (diff < -40) {
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
              borderRadius: 20,
              padding: '24px 28px',
              color: '#ffffff',
              boxSizing: 'border-box',
              minHeight: 160,
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
              right: -20,
              top: -30,
              width: 180,
              height: 180,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />
            <div style={{
              position: 'absolute',
              right: 80,
              bottom: -40,
              width: 140,
              height: 140,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(2, 132, 199, 0.3) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />

            {/* Left Content Column */}
            <div style={{ position: 'relative', zIndex: 2, maxWidth: '68%' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255, 255, 255, 0.16)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                padding: '4px 10px',
                borderRadius: 9999,
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: banner.accentColor,
                marginBottom: 10
              }}>
                <Sparkles size={11} />
                <span>{banner.badge}</span>
              </div>

              <h3 style={{
                margin: '0 0 6px 0',
                fontSize: '1.25rem',
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1.25,
                letterSpacing: '-0.015em'
              }}>
                {banner.title}
              </h3>

              <p style={{
                margin: '0 0 14px 0',
                fontSize: '0.82rem',
                color: 'rgba(255, 255, 255, 0.85)',
                lineHeight: 1.45,
                maxWidth: 480
              }}>
                {banner.subtitle}
              </p>

              <button
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#ffffff',
                  color: '#0284C7',
                  border: 'none',
                  borderRadius: 10,
                  padding: '7px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  transition: 'transform 0.15s ease'
                }}
              >
                <span>{banner.ctaText}</span>
                <ArrowRight size={13} />
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
              flexShrink: 0
            }}>
              <div style={{
                width: 68,
                height: 68,
                borderRadius: 20,
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1.5px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                marginBottom: 6
              }}>
                {banner.icon}
              </div>
              <TableMintBrandBadge size={22} style={{ opacity: 0.9 }} />
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

      {/* Pagination Pill Dots */}
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
