import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Check,
  Monitor,
  Tablet,
  Smartphone,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { signInWithCredentials, getStaffToken } from '../utils/staffAuth';
import { TableMintBrandBadge } from '../components/TableMintLogoIcon';

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
        window.dispatchEvent(new CustomEvent('staff:authenticated', { detail: res.user }));
        const params = new URLSearchParams(location.search);
        const redirectPath = params.get('redirect') || '/dashboard';
        navigate(redirectPath, { replace: true });
      } else {
        setErrorMessage(res.error || 'Failed to sign in. Please verify your credentials.');
      }
    } catch {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tm-auth-page-wrapper">
      <motion.div 
        className="tm-auth-modal-card"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        {/* Left Side: Benefits & Brand Showcase */}
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
              Run Your Restaurant<br />
              Operations<br />
              <span className="highlight">Effortlessly.</span>
            </h1>

            <p className="tm-auth-side-desc">
              Table management, QR ordering, POS billing, KDS and more — all in one platform.
            </p>

            <div className="tm-auth-checklist-box">
              <div className="tm-auth-check-item">
                <div className="tm-auth-check-icon">
                  <Check size={13} strokeWidth={3} />
                </div>
                <span>Real-time table &amp; order management</span>
              </div>
              <div className="tm-auth-check-item">
                <div className="tm-auth-check-icon">
                  <Check size={13} strokeWidth={3} />
                </div>
                <span>Faster billing with POS &amp; GST invoicing</span>
              </div>
              <div className="tm-auth-check-item">
                <div className="tm-auth-check-icon">
                  <Check size={13} strokeWidth={3} />
                </div>
                <span>Works on web, tablet, and mobile</span>
              </div>
            </div>
          </div>

          <div className="tm-auth-side-footer">
            <div className="tm-auth-footer-badge">
              <ShieldCheck size={15} />
              <span>Secure &amp; Reliable</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Monitor size={14} />
                <span>Web</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Tablet size={14} />
                <span>Tablet</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Smartphone size={14} />
                <span>Mobile</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Sign In Form */}
        <div className="tm-auth-form-panel">
          <div className="tm-auth-form-header">
            <span className="tm-auth-form-step-tag">WELCOME BACK</span>
            <h2 className="tm-auth-form-title">
              Sign in to <span className="accent">TableMint</span>
            </h2>
            <p className="tm-auth-form-sub">
              Access your restaurant dashboard and manage your operations.
            </p>
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
              <label className="tm-auth-label">Email Address</label>
              <div className="tm-auth-input-wrapper">
                <Mail size={17} className="tm-auth-input-icon" />
                <input
                  type="email"
                  required
                  placeholder="admin@yourestaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="tm-auth-input"
                />
              </div>
            </div>

            <div className="tm-auth-field">
              <label className="tm-auth-label">Password</label>
              <div className="tm-auth-input-wrapper">
                <Lock size={17} className="tm-auth-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
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
              <div style={{ textAlign: 'right', marginTop: 6 }}>
                <Link to="/contact" style={{ color: '#0284C7', fontSize: '0.82rem', fontWeight: 650, textDecoration: 'none' }}>
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="tm-auth-btn-primary"
            >
              <span>{loading ? 'Signing in...' : 'Sign In to Dashboard'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="tm-auth-footer-link">
            Don't have a TableMint account yet? <Link to="/register">Create an account</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
