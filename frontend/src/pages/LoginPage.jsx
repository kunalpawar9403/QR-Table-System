import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Monitor,
  Tablet,
  Smartphone,
  AlertCircle
} from 'lucide-react';
import { signInWithCredentials, getStaffToken } from '../utils/staffAuth';
import AuthShell from '../components/auth/AuthShell';

const LOGIN_POINTS = [
  'Real-time table & order management',
  'Faster billing with POS & GST invoicing',
  'Works on web, tablet, and mobile'
];

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
    <AuthShell
      title={<>Run Your Restaurant Operations <em>Effortlessly.</em></>}
      description="Table management, QR ordering, POS billing, KDS and more — all in one platform."
      points={LOGIN_POINTS}
      asideFooter={
        <>
          <span className="tm-auth-secure">
            <ShieldCheck size={15} />
            Secure &amp; Reliable
          </span>
          <span className="tm-auth-devices">
            <span><Monitor size={14} />Web</span>
            <span><Tablet size={14} />Tablet</span>
            <span><Smartphone size={14} />Mobile</span>
          </span>
        </>
      }
    >
      <div className="tm-auth-head">
        <span className="tm-eyebrow">Welcome Back</span>
        <h2 className="tm-auth-form-title">Sign in to TableMint</h2>
        <p>Access your restaurant dashboard and manage your operations.</p>
      </div>

      {errorMessage && (
        <div className="tm-alert" role="alert">
          <AlertCircle size={17} />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="tm-form tm-auth-form">
        <div>
          <label htmlFor="login-email" className="tm-label">Email Address</label>
          <div className="tm-input-wrap">
            <Mail size={17} className="tm-input-icon" />
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              placeholder="admin@yourestaurant.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="tm-input has-icon"
            />
          </div>
        </div>

        <div>
          <div className="tm-label-row">
            <label htmlFor="login-password" className="tm-label">Password</label>
            <Link to="/forgot-password" className="tm-auth-forgot" style={{ textDecoration: 'none' }}>Forgot password?</Link>
          </div>
          <div className="tm-input-wrap">
            <Lock size={17} className="tm-input-icon" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="tm-input has-icon has-action"
            />
            <button
              type="button"
              className="tm-input-action"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="tm-btn tm-btn-primary tm-btn-lg tm-btn-block">
          <span>{loading ? 'Signing in...' : 'Sign In to Dashboard'}</span>
          <ArrowRight size={16} />
        </button>
      </form>

      <p className="tm-auth-switch">
        Don't have a TableMint account yet? <Link to="/register" style={{ textDecoration: 'none' }}>Create an account</Link>
      </p>
    </AuthShell>
  );
}
