import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  User,
  Utensils,
  Eye,
  EyeOff,
  ShieldAlert,
  X,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import {
  signInWithCredentials,
  signUpWithCredentials
} from '../utils/staffAuth';
import { soundManager } from '../utils/sound';
import { TableMintSplashLogo } from './TableMintLogoIcon';

export default function StaffAuthModal({
  isOpen,
  onSuccess,
  onClose,
  message,
  fullPage = false,
  initialTab = 'signin',
  selectedPlan = null
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'signin' | 'signup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(message || '');
  const [successMsg, setSuccessMsg] = useState('');
  const [shake, setShake] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Sign In Form State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign Up Form State
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpRestaurant, setSignUpRestaurant] = useState('Spice & Mint Bistro');
  const [signUpRole, setSignUpRole] = useState('admin');
  const [signUpType, setSignUpType] = useState('restaurant'); // 'restaurant' | 'cafe' | 'bar' | 'cloud'

  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      setError(message || '');
      setSuccessMsg('');
      setLoading(false);
    }
  }, [isOpen, initialTab, message]);

  const triggerError = (msg) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // --- Sign In Handler ---
  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!signInEmail.trim() || !signInPassword) {
      triggerError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await signInWithCredentials(signInEmail, signInPassword);
      if (res.success) {
        soundManager.playClick();
        setSuccessMsg('Signed in successfully! Loading TableMint...');
        setTimeout(() => {
          if (onSuccess) onSuccess(res.user);
        }, 400);
      } else {
        triggerError(res.error || 'Failed to sign in. Please verify your credentials.');
      }
    } catch {
      triggerError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // --- Sign Up Handler ---
  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!signUpName.trim() || signUpName.trim().length < 2) {
      triggerError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!signUpEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signUpEmail.trim())) {
      triggerError('Please enter a valid email address.');
      return;
    }
    if (!signUpPassword || signUpPassword.length < 6) {
      triggerError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await signUpWithCredentials({
        name: signUpName,
        email: signUpEmail,
        password: signUpPassword,
        restaurantName: signUpRestaurant,
        role: signUpRole
      });
      if (res.success) {
        soundManager.playClick();
        setSuccessMsg('Account created successfully! Welcome to TableMint.');
        setTimeout(() => {
          if (onSuccess) onSuccess(res.user);
        }, 500);
      } else {
        triggerError(res.error || 'Failed to create account.');
      }
    } catch {
      triggerError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // --- Quick Fill Demo Credentials ---
  const fillDemoAdmin = () => {
    setSignInEmail('admin@tablemint.com');
    setSignInPassword('admin123');
    setError('');
    soundManager.playClick();
  };

  if (!isOpen) return null;

  const cardContent = (
    <div className={`staff-modal-card auth-modal-expanded ${fullPage ? 'auth-modal-fullpage' : ''} ${shake ? 'shake-anim' : ''}`}>
      {onClose && !fullPage && (
        <button className="modal-close-btn" onClick={onClose} aria-label="Close" type="button">
          <X size={18} />
        </button>
      )}

        {/* Brand Header Matching Image 3 Screen 1 */}
        <div className="auth-brand-header">
          <div className="auth-logo-leaf-box" style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
            <TableMintSplashLogo size={44} />
          </div>
          <h1 className="auth-brand-heading">
            Table<span className="brand-mint-highlight">Mint</span>
          </h1>
          <p className="auth-brand-subheading">
            Restaurant Management<br />Made Simple
          </p>
        </div>

        {/* Feedback Alert Banners */}
        {error && (
          <div className="auth-alert-box error">
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-alert-box success">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ===================================================
            TAB 1: SIGN IN (MATCHING IMAGE 3 SCREEN 1)
            =================================================== */}
        {activeTab === 'signin' && (
          <form className="auth-form-body" onSubmit={handleSignIn}>
            <div className="auth-white-input-group">
              <User size={16} className="auth-input-icon-gray" />
              <input
                type="text"
                className="auth-white-input-field"
                placeholder="Email or Phone"
                value={signInEmail}
                onChange={(e) => setSignInEmail(e.target.value)}
                autoComplete="username"
                required
                disabled={loading}
              />
            </div>

            <div className="auth-white-input-group">
              <Lock size={16} className="auth-input-icon-gray" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-white-input-field"
                placeholder="Password"
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="auth-remember-row">
              <label className="auth-remember-label">
                <input type="checkbox" defaultChecked />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                className="auth-forgot-link"
                onClick={() => triggerError('Password reset link sent to registered email.')}
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              className="btn-auth-green-pill"
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Login'}
            </button>

            {/* Quick Demo Credentials Pill */}
            <button
              type="button"
              className="auth-demo-hint-btn"
              onClick={fillDemoAdmin}
              title="Click to fill default admin credentials"
            >
              <Sparkles size={12} />
              <span>Fill Demo: admin@tablemint.com (admin123)</span>
            </button>

            <div className="auth-divider-text">
              <span>or continue with</span>
            </div>

            <div className="auth-social-buttons-row">
              <button
                type="button"
                className="auth-social-pill"
                onClick={fillDemoAdmin}
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  className="social-logo-icon"
                />
                <span>Google</span>
              </button>
              <button
                type="button"
                className="auth-social-pill"
                onClick={fillDemoAdmin}
              >
                <span className="apple-logo-icon"></span>
                <span>Apple</span>
              </button>
            </div>

            <div className="auth-footer-prompt">
              <span>Don't have an account?</span>{' '}
              <button
                type="button"
                className="auth-green-action-link"
                onClick={() => {
                  setActiveTab('signup');
                  setError('');
                }}
              >
                Sign Up
              </button>
            </div>
          </form>
        )}

        {/* ===================================================
            TAB 2: SIGN UP
            =================================================== */}
        {activeTab === 'signup' && (
          <form className="auth-form-body" onSubmit={handleSignUp}>
            <div className="auth-white-input-group">
              <User size={16} className="auth-input-icon-gray" />
              <input
                type="text"
                className="auth-white-input-field"
                placeholder="Your Full Name"
                value={signUpName}
                onChange={(e) => setSignUpName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="auth-white-input-group">
              <Utensils size={16} className="auth-input-icon-gray" />
              <input
                type="text"
                className="auth-white-input-field"
                placeholder="Restaurant / Business Name"
                value={signUpRestaurant}
                onChange={(e) => setSignUpRestaurant(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="auth-white-input-group">
              <Mail size={16} className="auth-input-icon-gray" />
              <input
                type="email"
                className="auth-white-input-field"
                placeholder="Email address"
                value={signUpEmail}
                onChange={(e) => setSignUpEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>

            <div className="auth-white-input-group">
              <Lock size={16} className="auth-input-icon-gray" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-white-input-field"
                placeholder="Create Password (min. 6 chars)"
                value={signUpPassword}
                onChange={(e) => setSignUpPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {selectedPlan && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid #10b981',
                borderRadius: 10,
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.82rem',
                color: '#065f46',
                fontWeight: 700
              }}>
                <span>Plan: TableMint {selectedPlan.toUpperCase()}</span>
                <span style={{ color: '#10b981', background: '#041711', padding: '2px 8px', borderRadius: 9999 }}>7-Day Free Trial</span>
              </div>
            )}

            {/* Business Type Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Business Type:</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {[
                  { id: 'restaurant', label: 'Restaurant' },
                  { id: 'cafe', label: 'Cafe' },
                  { id: 'bar', label: 'Bar' },
                  { id: 'cloud', label: 'Cloud K.' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    style={{
                      padding: '6px 4px',
                      borderRadius: 8,
                      border: signUpType === t.id ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                      background: signUpType === t.id ? '#ecfdf5' : '#ffffff',
                      color: signUpType === t.id ? '#059669' : '#64748b',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    onClick={() => setSignUpType(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Role Selection */}
            <div className="auth-role-row">
              <label className="auth-role-label">Role:</label>
              <div className="auth-role-pills">
                <button
                  type="button"
                  className={`auth-role-pill ${signUpRole === 'admin' ? 'active' : ''}`}
                  onClick={() => setSignUpRole('admin')}
                >
                  Admin / Owner
                </button>
                <button
                  type="button"
                  className={`auth-role-pill ${signUpRole === 'staff' ? 'active' : ''}`}
                  onClick={() => setSignUpRole('staff')}
                >
                  Floor Staff
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-auth-green-pill"
              disabled={loading}
            >
              {loading ? 'Creating Dashboard...' : 'Create Account & Open Dashboard'}
            </button>

            {/* Quick Fill Test Restaurant */}
            <button
              type="button"
              className="auth-demo-hint-btn"
              onClick={() => {
                const rand = Math.floor(100 + Math.random() * 900);
                setSignUpName('Rohit Verma');
                setSignUpRestaurant(`Mint Dining ${rand}`);
                setSignUpEmail(`owner${rand}@tablemint.com`);
                setSignUpPassword('admin123');
                setError('');
                soundManager.playClick();
              }}
              title="Click to fill new sample restaurant registration details"
            >
              <Sparkles size={12} />
              <span>Fill New Sample Restaurant Details</span>
            </button>

            <div className="auth-footer-prompt">
              <span>Already have an account?</span>{' '}
              <button
                type="button"
                className="auth-green-action-link"
                onClick={() => {
                  setActiveTab('signin');
                  setError('');
                }}
              >
                Login
              </button>
            </div>
          </form>
        )}
      </div>
    );

  if (fullPage) {
    return (
      <div className="auth-fullpage-wrapper">
        <div className="auth-fullpage-decor-glow" />
        <div className="auth-fullpage-container">
          {cardContent}
          <div className="auth-fullpage-footer">
            <span>TableMint Restaurant OS • End-to-End Encrypted Terminal</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '440px', margin: 'auto' }}>
        {cardContent}
      </div>
    </div>
  );
}
