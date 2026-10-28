import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const PROMO_BANNERS = [
  {
    id: 1,
    image: '/images/tablemint_promo_banner.jpg',
    alt: 'TableMint - Faster Orders, Happier Customers',
    badge: 'MAKE DINING SMARTER',
    title: 'Faster Orders, Happier Customers',
    tabTarget: 'orders',
  },
  {
    id: 2,
    image: '/images/tablemint_promo_banner_2.jpg',
    alt: 'Instant Kitchen Sync & Faster Dining',
    badge: 'LIVE KITCHEN DISPLAY',
    title: 'Instant Kitchen Sync & Faster Dining',
    tabTarget: 'kds',
  },
  {
    id: 3,
    image: '/images/tablemint_promo_banner_3.jpg',
    alt: 'Grow Your Revenue & Delighted Guests',
    badge: 'SMART ANALYTICS',
    title: 'Grow Your Revenue & Delighted Guests',
    tabTarget: 'reports',
  },
];

export default function TableMintBannerSlider({ onSelectTab, className = '' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Auto-scroll every 3.8 seconds
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % PROMO_BANNERS.length);
    }, 3800);

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

  // Touch Swipe Handlers for mobile gestures
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
        // Swiped left -> next
        setCurrentIndex((prev) => (prev + 1) % PROMO_BANNERS.length);
      } else if (diff < -40) {
        // Swiped right -> prev
        setCurrentIndex((prev) => (prev - 1 + PROMO_BANNERS.length) % PROMO_BANNERS.length);
      }
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
    // Resume auto-scroll after a short delay
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
          >
            <img
              src={banner.image}
              alt={banner.alt}
              className="mobile-promo-banner-img"
              loading={idx === 0 ? 'eager' : 'lazy'}
              draggable={false}
            />
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
