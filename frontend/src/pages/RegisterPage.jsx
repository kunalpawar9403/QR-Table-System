import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Building2, 
  User, 
  Mail, 
  Lock, 
  ArrowRight, 
  CheckCircle, 
  ShieldCheck, 
  Eye, 
  EyeOff,
  AlertCircle,
  Zap
} from 'lucide-react';
import { signUpWithCredentials, getStaffToken } from '../utils/staffAuth';

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
        // Dispatches auth event to update App state
        window.dispatchEvent(new CustomEvent('staff:authenticated', { detail: res.user }));
        
        // Instant redirect directly into the live POS Dashboard!
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
    { id: 'starter', name: 'Starter', price: '₹999/mo', desc: 'Up to 10 tables' },
    { id: 'standard', name: 'Standard', price: '₹1,999/mo', desc: 'Up to 30 tables (Popular)' },
    { id: 'premium', name: 'Premium', price: '₹3,999/mo', desc: 'Unlimited tables' }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#F4F7F6',
      fontFamily: 'var(--font-body)'
    }}>
      {/* Left Column: Visual Benefits (Hidden on mobile) */}
      <div style={{
        flex: 1,
        background: 'radial-gradient(circle at 30% 20%, #0d4434 0%, #062D22 65%, #031812 100%)',
        color: '#FFFFFF',
        padding: '60px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden'
      }} className="tm-auth-hero-col">
        {/* Glow */}
        <div style={{
          position: 'absolute',
          top: '-120px',
          left: '-120px',
          width: '550px',
          height: '550px',
          background: 'radial-gradient(circle, rgba(22, 201, 149, 0.22) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Brand */}
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', position: 'relative', zIndex: 1 }}>
          <img 
            src="/images/tablemint_icon.png" 
            alt="TableMint Logo" 
            style={{ width: 40, height: 40, borderRadius: '10px' }}
            onError={(e) => { e.currentTarget.src = '/images/tablemint_logo.jpg'; }}
          />
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-heading)' }}>
            Table<span style={{ color: '#16C995' }}>Mint</span>
          </div>
        </Link>

        {/* Feature Copy */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '500px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(22, 201, 149, 0.15)',
            color: '#16C995',
            fontSize: '0.8rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            padding: '5px 14px',
            borderRadius: '9999px',
            marginBottom: 20
          }}>
            <Zap size={14} />
            <span>14-Day Full-Access Free Trial</span>
          </div>

          <h2 style={{ fontSize: '2.3rem', fontWeight: 800, lineHeight: 1.2, color: '#FFFFFF', marginBottom: 16 }}>
            Set up your custom restaurant workspace in 60 seconds.
          </h2>

          <p style={{ color: '#cbd5e1', fontSize: '1.02rem', lineHeight: 1.6, marginBottom: 28 }}>
            Upon registration, TableMint provisions a clean, isolated database for your venue with fresh vacant tables, dynamic QR codes, and default categories.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              "Zero setup fees and no credit card required",
              "Pre-loaded with fresh tables and starter menu",
              "Connect unlimited waiter iPads, tablets, and phones",
              "Automated GST invoicing with printable thermal bills",
              "Live Kitchen Display System (KDS) included"
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e2e8f0', fontSize: '0.92rem' }}>
                <CheckCircle size={16} style={{ color: '#16C995', flexShrink: 0 }} />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Security */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#94a3b8', fontSize: '0.86rem', position: 'relative', zIndex: 1 }}>
          <ShieldCheck size={16} style={{ color: '#10b981' }} />
          <span>Complete Data Isolation & Enterprise Encryption</span>
        </div>
      </div>

      {/* Right Column: Registration Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 24px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '480px',
          background: '#FFFFFF',
          borderRadius: '24px',
          padding: 'clamp(28px, 4vw, 44px)',
          boxShadow: '0 10px 35px rgba(6, 45, 34, 0.06)',
          border: '1px solid #e2e8f0'
        }}>
          {/* Header */}
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.8rem', color: '#172033', fontWeight: 800, marginBottom: 8 }}>
              Create Your Restaurant Account
            </h1>
            <p style={{ color: '#5e6d82', fontSize: '0.92rem' }}>
              Start your 14-day free trial. No credit card needed.
            </p>
          </div>

          {/* Plan Selector Pills */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>
              Selected Plan
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {planOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedPlan(opt.id)}
                  style={{
                    padding: '8px 6px',
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: selectedPlan === opt.id ? '#0BAF7A' : '#e2e8f0',
                    background: selectedPlan === opt.id ? '#e8f9f3' : '#F8FAFC',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.18s ease'
                  }}
                >
                  <strong style={{ display: 'block', fontSize: '0.85rem', color: selectedPlan === opt.id ? '#062D22' : '#172033' }}>
                    {opt.name}
                  </strong>
                  <span style={{ fontSize: '0.74rem', color: selectedPlan === opt.id ? '#0BAF7A' : '#64748b', fontWeight: 600 }}>
                    {opt.price}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '12px 14px',
              borderRadius: '10px',
              fontSize: '0.88rem',
              marginBottom: 20
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#172033', marginBottom: 6 }}>
                Restaurant / Venue Name *
              </label>
              <div style={{ position: 'relative' }}>
                <Building2 size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Copper Chimney Bistro"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 42px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.94rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#0BAF7A'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#172033', marginBottom: 6 }}>
                Owner / Manager Full Name *
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohan Verma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 42px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.94rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#0BAF7A'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#172033', marginBottom: 6 }}>
                Email Address *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="email"
                  required
                  placeholder="rohan@copperchimney.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 42px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.94rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#0BAF7A'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#172033', marginBottom: 6 }}>
                Password * (min 6 characters)
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Create a secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 42px 11px 42px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.94rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#0BAF7A'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="tm-btn tm-btn-primary tm-btn-lg"
              style={{ width: '100%', marginTop: 8 }}
            >
              {loading ? (
                <span>Provisioning Restaurant Workspace...</span>
              ) : (
                <>
                  <span>Create Account & Launch POS</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Switch to Login */}
          <div style={{ textAlign: 'center', marginTop: 22, paddingTop: 18, borderTop: '1px solid #edf2f7' }}>
            <p style={{ fontSize: '0.9rem', color: '#5e6d82' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#0BAF7A', fontWeight: 700 }}>
                Sign In
              </Link>
            </p>
          </div>
        </div>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link to="/" style={{ color: '#64748b', fontSize: '0.86rem', textDecoration: 'none' }}>
            ← Back to TableMint Home
          </Link>
        </div>
      </div>
    </div>
  );
}
