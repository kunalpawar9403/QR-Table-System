import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Shield, Zap } from 'lucide-react';
import Reveal from '../marketing/Reveal';

export default function CTASection({
  title = "Ready to elevate your restaurant operations?",
  subtitle = "Experience modern cloud POS engineered for high speed. Set up your digital floor and menu in 5 minutes with our 14-day free trial.",
  primaryText = "Start 14-Day Free Trial",
  secondaryText = "Watch Video Demo"
}) {
  return (
    <section className="tm-cta">
      <Reveal className="tm-cta-inner">
        <span className="tm-eyebrow is-on-dark">Transform Your Restaurant Today</span>
        <h2 className="tm-section-title">{title}</h2>
        <p className="tm-section-subtitle">{subtitle}</p>

        <div className="tm-actions is-center">
          <Link to="/register" className="tm-btn tm-btn-light tm-btn-lg">
            <span>{primaryText}</span>
            <ArrowRight size={17} />
          </Link>
          <Link to="/demo" className="tm-btn tm-btn-outline-white tm-btn-lg">
            <span>{secondaryText}</span>
          </Link>
        </div>

        <ul className="tm-cta-perks">
          <li><CheckCircle size={15} /><span>No credit card required</span></li>
          <li><Zap size={15} /><span>Instant 5-minute setup</span></li>
          <li><Shield size={15} /><span>Dedicated 24/7 onboarding support</span></li>
        </ul>
      </Reveal>
    </section>
  );
}
