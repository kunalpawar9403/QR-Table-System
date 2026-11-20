import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Building2, 
  User, 
  Mail, 
  Lock, 
  ArrowRight, 
  Check, 
  ShieldCheck, 
  Eye, 
  EyeOff,
  AlertCircle,
  X
} from 'lucide-react';
import { motion } from 'motion/react';
import { signUpWithCredentials, getStaffToken } from '../utils/staffAuth';
import { TableMintBrandBadge } from '../components/TableMintLogoIcon';

export default function RegisterPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Extract selected plan from URL query param if present
  const queryParams = new URLSearchParams(location.search);
  const initialPlan = queryParams.get('plan') || 'standard';

  const [selectedPlan, setSelectedPlan] = useState(initialPlan);
  const [restaurantName, setRestaurantName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (getStaffToken()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!restaurantName.trim()) {
      setErrorMessage('Please enter your restaurant or venue name.');
      return;
    }
    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim() || !password) {
      setErrorMessage('Please provide an email and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await signUpWithCredentials({
        name: name.trim(),
        email: email.trim(),
        password,
        restaurantName: restaurantName.trim(),
        role: 'admin'
      });

      if (res.success) {
        window.dispatchEvent(new CustomEvent('staff:authenticated', { detail: res.user }));
        navigate('/dashboard', { replace: true });
      } else {
        setErrorMessage(res.error || 'Failed to create your restaurant account.');
      }
    } catch {
      setErrorMessage('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const planOptions = [
    { id: 'starter', name: 'Starter', price: '₹999/mo' },
    { id: 'standard', name: 'Standard', price: '₹1,999/mo' },
    { id: 'premium', name: 'Premium', price: '₹3,999/mo' }
  ];

  return (
    <div className="tm-auth-page-wrapper">
      <motion.div 
        className="tm-auth-modal-card"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        {/* Left Side: Setup In 60 Seconds Benefits Panel */}
        <div className="tm-auth-side-panel">
          <div>
            <Link to="/" className="tm-auth-brand-row">
              <TableMintBrandBadge size={40} />
              <div className="tm-auth-brand-text">
                <span className="name">Table</span>
                <span className="accent">Mint</span>
              </div>
            </Link>

            <div className="tm-auth-tag-line">
              MODERN RESTAURANT MANAGEMENT
            </div>

            <h1 className="tm-auth-side-title">
              Set up your restaurant<br />
              workspace in<br />
              <span className="highlight">60 seconds.</span>
            </h1>

            <p className="tm-auth-side-desc">
              Upon registration, TableMint provides a clean, isolated database for your venue with fresh tables, dynamic QR codes, and default categories.
            </p>

            <div className="tm-auth-checklist-box">
              <div className="tm-auth-check-item">
                <div className="tm-auth-check-icon">
                  <Check size={13} strokeWidth={3} />
                </div>
                <span>Zero setup fees and no credit card required</span>
              </div>
              <div className="tm-auth-check-item">
                <div className="tm-auth-check-icon">
                  <Check size={13} strokeWidth={3} />
                </div>
                <span>Pre-loaded with fresh tables and starter menu</span>
              </div>
              <div className="tm-auth-check-item">
                <div className="tm-auth-check-icon">
                  <Check size={13} strokeWidth={3} />
                </div>
                <span>Connect unlimited waiter iPads, tablets, and phones</span>
              </div>
              <div className="tm-auth-check-item">
                <div className="tm-auth-check-icon">
                  <Check size={13} strokeWidth={3} />
                </div>
                <span>Automated GST invoicing with printable bills</span>
              </div>
              <div className="tm-auth-check-item">
                <div className="tm-auth-check-icon">
                  <Check size={13} strokeWidth={3} />
                </div>
                <span>Live Kitchen Display System (KDS) included</span>
              </div>
            </div>
          </div>

          <div className="tm-auth-side-footer">
            <div className="tm-auth-footer-badge">
              <ShieldCheck size={16} />
              <span>Complete Data Isolation &amp; Enterprise Encryption</span>
            </div>
          </div>
        </div>

        {/* Right Side: Account Registration Form (Scrollable) */}
        <div className="tm-auth-form-panel">
          {/* Close Button linking back to Home */}
          <Link to="/" className="tm-auth-close-btn" aria-label="Close">
            <X size={18} />
          </Link>

          <div className="tm-auth-form-header">
            <h2 className="tm-auth-form-title">
              Create Your Restaurant Account
            </h2>
            <p className="tm-auth-form-sub">
              Start your 14-day free trial. No credit card needed.
            </p>
          </div>

          {/* Plan Selector */}
          <div style={{ marginBottom: 16 }}>
            <label className="tm-auth-label" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B' }}>
              SELECTED PLAN
            </label>
            <div className="tm-auth-plan-grid">
              {planOptions.map((plan) => {
                const isActive = selectedPlan === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`tm-auth-plan-btn ${isActive ? 'active' : ''}`}
                  >
                    <span className="tm-auth-plan-name">{plan.name}</span>
                    <span className="tm-auth-plan-price">{plan.price}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {errorMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#DC2626',
              padding: '12px 14px',
              borderRadius: '12px',
              fontSize: '0.88rem',
              marginBottom: 18
            }}>
              <AlertCircle size={17} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="tm-auth-field">
              <label className="tm-auth-label">Restaurant / Venue Name *</label>
              <div className="tm-auth-input-wrapper">
                <Building2 size={17} className="tm-auth-input-icon" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Copper Chimney Bistro"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  className="tm-auth-input"
                />
              </div>
            </div>

            <div className="tm-auth-field">
              <label className="tm-auth-label">Owner / Manager Full Name *</label>
              <div className="tm-auth-input-wrapper">
                <User size={17} className="tm-auth-input-icon" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohan Verma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="tm-auth-input"
                />
              </div>
            </div>

            <div className="tm-auth-field">
              <label className="tm-auth-label">Email Address *</label>
              <div className="tm-auth-input-wrapper">
                <Mail size={17} className="tm-auth-input-icon" />
                <input
                  type="email"
                  required
                  placeholder="rohan@copperchimney.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="tm-auth-input"
                />
              </div>
            </div>

            <div className="tm-auth-field">
              <label className="tm-auth-label">Password * (min 6 characters)</label>
              <div className="tm-auth-input-wrapper">
                <Lock size={17} className="tm-auth-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Create a secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="tm-auth-input"
                  style={{ paddingRight: '42px' }}
                />
                <button
                  type="button"
                  className="tm-auth-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="tm-auth-btn-primary"
            >
              <span>{loading ? 'Setting up workspace...' : 'Create Account & Launch POS'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="tm-auth-footer-link">
            Already have an account? <Link to="/login">Sign In</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
