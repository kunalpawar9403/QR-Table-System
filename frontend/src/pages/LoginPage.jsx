import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle,
  LayoutDashboard,
  AlertCircle
} from 'lucide-react';
import { signInWithCredentials, getStaffToken } from '../utils/staffAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // If already logged in, redirect to dashboard immediately
  useEffect(() => {
    if (getStaffToken()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await signInWithCredentials(email, password);
      if (res.success) {
        // Dispatch authentication event for any global listeners
        window.dispatchEvent(new CustomEvent('staff:authenticated', { detail: res.user }));
        
        // Check if redirect search param exists
        const params = new URLSearchParams(location.search);
        const redirectPath = params.get('redirect') || '/dashboard';
        navigate(redirectPath, { replace: true });
      } else {
        setErrorMessage(res.error || 'Failed to sign in. Please verify your credentials.');
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#F4F7F6',
      fontFamily: 'var(--font-body)'
    }}>
      {/* Left Column: Visual Branding (Hidden on mobile) */}
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
        {/* Ambient glow */}
        <div style={{
          position: 'absolute',
          top: '-100px',
          left: '-100px',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(22, 201, 149, 0.25) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Top Brand */}
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

        {/* Middle Feature Highlight */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px' }}>
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
            <Sparkles size={14} />
            <span>Next-Gen Restaurant POS</span>
          </div>

          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, lineHeight: 1.2, color: '#FFFFFF', marginBottom: 16 }}>
            Run your entire restaurant from a single intelligent screen.
          </h2>

          <p style={{ color: '#cbd5e1', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 32 }}>
            Real-time table occupancy, 3-second GST billing, live kitchen display routing, and seamless UPI QR payments.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              'Instant WebSocket synchronization between terminals',
              'Isolated, clean multi-tenant database for every restaurant',
              'Works on iPad, Android, Windows, Mac, and mobile browsers'
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e2e8f0', fontSize: '0.92rem' }}>
                <CheckCircle size={16} style={{ color: '#16C995', flexShrink: 0 }} />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Trust */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#94a3b8', fontSize: '0.86rem', position: 'relative', zIndex: 1 }}>
          <ShieldCheck size={16} style={{ color: '#10b981' }} />
          <span>PCI-DSS & ISO 27001 Certified Security Standard</span>
        </div>
      </div>

      {/* Right Column: Sign In Form */}
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
          maxWidth: '440px',
          background: '#FFFFFF',
          borderRadius: '24px',
          padding: 'clamp(28px, 4vw, 44px)',
          boxShadow: '0 10px 35px rgba(6, 45, 34, 0.06)',
          border: '1px solid #e2e8f0'
        }}>
          {/* Form Header */}
          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.8rem', color: '#172033', fontWeight: 800, marginBottom: 8 }}>
              Welcome Back
            </h1>
            <p style={{ color: '#5e6d82', fontSize: '0.92rem' }}>
              Sign in to access your TableMint restaurant dashboard.
            </p>
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
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#172033', marginBottom: 6 }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="email"
                  required
                  placeholder="admin@yourrestaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.18s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#0BAF7A'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#172033' }}>
                  Password
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 42px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
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
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Switch to Register */}
          <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid #edf2f7' }}>
            <p style={{ fontSize: '0.9rem', color: '#5e6d82' }}>
              Don't have a TableMint account yet?{' '}
              <Link to="/register" style={{ color: '#0BAF7A', fontWeight: 700 }}>
                Start 14-Day Free Trial
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
