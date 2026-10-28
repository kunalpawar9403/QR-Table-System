import React, { useState, useEffect } from 'react';
import '../styles/splash_loader.css';

/**
 * TableMintSplashScreen - Exact 3-Phase Splash & Loader Flow
 * Matching user reference image:
 * Phase 1: Splash Screen (App opens with logo, tagline, gourmet salad backdrop)
 * Phase 2: Loader Animation (Smooth loading with progress bar & "Getting things ready...")
 * Phase 3: Loader Animation (Animated dots with leaf elements & "Setting up your restaurant...")
 */
export default function TableMintSplashScreen({ onComplete, forceShow = false }) {
  const [phase, setPhase] = useState(1);
  const [progress, setProgress] = useState(15);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Phase 1 -> Phase 2 after 1400ms
    const t1 = setTimeout(() => {
      setPhase(2);
      setProgress(40);
    }, 1400);

    // Progress increments during Phase 2
    const tProg = setTimeout(() => {
      setProgress(68);
    }, 2000);

    // Phase 2 -> Phase 3 after 2700ms
    const t2 = setTimeout(() => {
      setPhase(3);
      setProgress(95);
    }, 2700);

    // Final completion & fade out after 3900ms
    const tComplete = setTimeout(() => {
      setProgress(100);
      setIsFading(true);
    }, 3900);

    // Dismiss overlay after fade transition
    const tDone = setTimeout(() => {
      if (onComplete) onComplete();
    }, 4350);

    return () => {
      clearTimeout(t1);
      clearTimeout(tProg);
      clearTimeout(t2);
      clearTimeout(tComplete);
      clearTimeout(tDone);
    };
  }, [onComplete]);

  const handleSkip = () => {
    setIsFading(true);
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 300);
  };

  return (
    <div
      className={`tm-splash-overlay ${isFading ? 'fading-out' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="TableMint Splash Screen"
    >
      {/* Background Layer: Gourmet Salad Dish with Organic Curves */}
      <div
        className={`tm-splash-bg-layer phase-${phase}`}
        style={{
          backgroundImage: `url('/images/tablemint_splash_bg.jpg')`
        }}
      />

      {/* Organic Mint Wave Curves SVG Overlay for Phase 2 & 3 */}
      <svg
        className="tm-splash-organic-waves"
        viewBox="0 0 400 800"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M-50,220 C80,180 180,260 450,190 L450,850 L-50,850 Z"
          fill="rgba(224, 242, 233, 0.45)"
        />
        <path
          d="M-50,560 C120,510 240,640 450,580 L450,850 L-50,850 Z"
          fill="rgba(167, 243, 208, 0.35)"
        />
      </svg>

      {/* Skip Button */}
      <button
        type="button"
        className="tm-splash-skip-btn"
        onClick={handleSkip}
        title="Skip intro"
      >
        Skip ✕
      </button>

      {/* Floating Mint Leaves with Natural Drift */}
      <img
        src="/images/mint_leaf_single.png"
        alt="Mint Leaf"
        className="tm-floating-leaf leaf-1"
        onError={(e) => { e.target.style.display = 'none'; }}
      />
      <img
        src="/images/mint_leaf_single.png"
        alt="Mint Leaf"
        className="tm-floating-leaf leaf-2"
        onError={(e) => { e.target.style.display = 'none'; }}
      />
      <img
        src="/images/mint_leaf_single.png"
        alt="Mint Leaf"
        className="tm-floating-leaf leaf-3"
        onError={(e) => { e.target.style.display = 'none'; }}
      />
      <img
        src="/images/mint_leaf_single.png"
        alt="Mint Leaf"
        className="tm-floating-leaf leaf-4"
        onError={(e) => { e.target.style.display = 'none'; }}
      />
      <img
        src="/images/mint_leaf_single.png"
        alt="Mint Leaf"
        className="tm-floating-leaf leaf-5"
        onError={(e) => { e.target.style.display = 'none'; }}
      />
      <img
        src="/images/mint_leaf_single.png"
        alt="Mint Leaf"
        className="tm-floating-leaf leaf-6"
        onError={(e) => { e.target.style.display = 'none'; }}
      />
      <img
        src="/images/mint_leaf_single.png"
        alt="Mint Leaf"
        className="tm-floating-leaf leaf-7"
        onError={(e) => { e.target.style.display = 'none'; }}
      />

      {/* Central Identity Section */}
      <div className="tm-splash-content">
        {/* TableMint 1024x1024 Style App Icon */}
        <div className="tm-splash-app-icon">
          <svg
            className="tm-splash-leaf-svg"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Curved mint leaf */}
            <path
              d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"
              fill="#ffffff"
            />
            {/* White leaf curved vein */}
            <path
              d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"
              stroke="#0a4d34"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Brand Name */}
        <h1 className="tm-splash-brand-title">TableMint</h1>

        {/* Phase 1: Tagline */}
        {phase === 1 && (
          <p className="tm-splash-tagline">
            Smart Dining
            <br />
            for Modern Restaurants
          </p>
        )}

        {/* Phase 2: Loader with Smooth Progress Bar */}
        {phase === 2 && (
          <>
            <p className="tm-splash-status-text">Getting things ready...</p>
            <div className="tm-splash-progress-track">
              <div
                className="tm-splash-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        )}

        {/* Phase 3: Loader with Animated Wave Dots */}
        {phase === 3 && (
          <>
            <p className="tm-splash-status-text">Setting up your restaurant...</p>
            <div className="tm-splash-dots-row">
              <span className="tm-splash-dot" />
              <span className="tm-splash-dot" />
              <span className="tm-splash-dot" />
            </div>
          </>
        )}
      </div>

      {/* Phase Indicator Pips at Bottom */}
      <div className="tm-splash-phase-indicator">
        <span className={`tm-splash-phase-pip ${phase === 1 ? 'active' : ''}`} />
        <span className={`tm-splash-phase-pip ${phase === 2 ? 'active' : ''}`} />
        <span className={`tm-splash-phase-pip ${phase === 3 ? 'active' : ''}`} />
      </div>
    </div>
  );
}
