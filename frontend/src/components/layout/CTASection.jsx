import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Sparkles, Shield, Zap } from 'lucide-react';

export default function CTASection({
  title = "Ready to elevate your restaurant operations?",
  subtitle = "Experience modern cloud POS engineered for high speed. Set up your digital floor and menu in 5 minutes with our 14-day free trial.",
  primaryText = "Start 14-Day Free Trial",
  secondaryText = "Watch Video Demo"
}) {
  return (
    <div className="tm-cta-wrapper">
      <section className="tm-cta-section">
        <div className="tm-cta-inner">
          <div className="tm-cta-badge">
            <Sparkles size={14} />
            <span>Transform Your Restaurant Today</span>
          </div>

          <h2 className="tm-cta-title" style={{ color: '#FFFFFF' }}>
            {title}
          </h2>

          <p className="tm-cta-subtitle" style={{ color: '#cbd5e1' }}>
            {subtitle}
          </p>

          <div className="tm-cta-actions">
            <Link to="/register" className="tm-btn tm-btn-primary tm-btn-lg">
              <span>{primaryText}</span>
              <ArrowRight size={18} />
            </Link>
            <Link to="/demo" className="tm-btn tm-btn-outline-white tm-btn-lg">
              <span>{secondaryText}</span>
            </Link>
          </div>

          <div className="tm-cta-perks">
            <div className="tm-cta-perk-item">
              <CheckCircle size={16} />
              <span>No credit card required</span>
            </div>
            <div className="tm-cta-perk-item">
              <Zap size={16} />
              <span>Instant 5-minute setup</span>
            </div>
            <div className="tm-cta-perk-item">
              <Shield size={16} />
              <span>Dedicated 24/7 onboarding support</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
