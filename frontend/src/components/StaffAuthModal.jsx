import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  User,
  Utensils,
  Eye,
  EyeOff,
  KeyRound,
  ShieldAlert,
  X,
  Sparkles,
  Delete,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import {
  signInWithCredentials,
  signUpWithCredentials,
  verifyStaffPin
} from '../utils/staffAuth';
import { soundManager } from '../utils/sound';

export default function StaffAuthModal({ isOpen, onSuccess, onClose, message }) {
  const [activeTab, setActiveTab] = useState('signin'); // 'signin' | 'signup' | 'pin'
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
  const [signUpRestaurant, setSignUpRestaurant] = useState('TableMint');
  const [signUpRole, setSignUpRole] = useState('admin');

  // PIN Keypad State
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError(message || '');
      setSuccessMsg('');
      setPin('');
      setLoading(false);
    }
  }, [isOpen, message]);

  // Handle keyboard typing for PIN when PIN tab is active
  useEffect(() => {
    if (!isOpen || activeTab !== 'pin') return;

    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        addDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        if (onClose) onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, pin, loading]);

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
    } catch (err) {
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
    } catch (err) {
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

  // --- PIN Keypad Handlers ---
  const addDigit = (digit) => {
    if (loading || pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');
    soundManager.playClick();

    if (newPin.length === 4) {
      submitPin(newPin);
    }
  };

  const handleBackspace = () => {
    if (loading || pin.length === 0) return;
    setPin(pin.slice(0, -1));
    setError('');
    soundManager.playClick();
  };

  const handleClear = () => {
    if (loading) return;
    setPin('');
    setError('');
    soundManager.playClick();
  };

  const submitPin = async (finalPin) => {
    setLoading(true);
    setError('');
    try {
      const res = await verifyStaffPin(finalPin);
      if (res.success) {
        soundManager.playClick();
        setSuccessMsg('Staff authenticated! Opening dashboard...');
        setTimeout(() => {
          if (onSuccess) onSuccess(res.user);
        }, 400);
      } else {
        triggerError(res.error || 'Incorrect Staff PIN. (Default: 1234)');
        setPin('');
      }
    } catch (err) {
      triggerError('Connection error. Please try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className={`staff-modal-card auth-modal-expanded ${shake ? 'shake-anim' : ''}`}>
        {onClose && (
          <button className="modal-close-btn" onClick={onClose} aria-label="Close" type="button">
            <X size={18} />
          </button>
        )}

        {/* Brand Header */}
        <div className="auth-brand-header">
          <div className="auth-logo-badge">
            <img src="/images/tablemint_icon.png" alt="TableMint" className="auth-logo-img" />
          </div>
          <h2 className="staff-modal-title">
            Table<span style={{ color: '#00e676' }}>Mint</span> Operations
          </h2>
          <p className="staff-modal-subtitle">
            Secure POS Station & Restaurant Management Console
          </p>
        </div>

        {/* Auth Tabs Switcher */}
        <div className="auth-tabs-row">
          <button
            type="button"
            className={`auth-tab-btn ${activeTab === 'signin' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('signin');
              setError('');
              setSuccessMsg('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${activeTab === 'signup' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('signup');
              setError('');
              setSuccessMsg('');
            }}
          >
            Sign Up
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${activeTab === 'pin' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('pin');
              setError('');
              setSuccessMsg('');
            }}
          >
            <KeyRound size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Staff PIN
          </button>
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
            TAB 1: SIGN IN
            =================================================== */}
        {activeTab === 'signin' && (
          <form className="auth-form-body" onSubmit={handleSignIn}>
            <div className="auth-input-group">
              <Mail size={16} className="auth-input-icon" />
              <input
                type="email"
                className="auth-input-field"
                placeholder="Email address"
                value={signInEmail}
                onChange={(e) => setSignInEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>

            <div className="auth-input-group">
              <Lock size={16} className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input-field"
                placeholder="Password"
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="auth-password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Quick Demo Credentials Pill */}
            <button
              type="button"
              className="auth-demo-pill-btn"
              onClick={fillDemoAdmin}
              title="Click to fill default admin credentials"
            >
              <Sparkles size={13} />
              <span>Fill Demo: admin@tablemint.com (admin123)</span>
            </button>

            <button
              type="submit"
              className="btn-primary auth-submit-btn"
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In to TableMint'}
              {!loading && <ArrowRight size={16} />}
            </button>

            <div className="auth-footer-toggle">
              <span>Don't have an account yet?</span>{' '}
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => {
                  setActiveTab('signup');
                  setError('');
                }}
              >
                Create Account
              </button>
            </div>
          </form>
        )}

        {/* ===================================================
            TAB 2: SIGN UP
            =================================================== */}
        {activeTab === 'signup' && (
          <form className="auth-form-body" onSubmit={handleSignUp}>
            <div className="auth-input-group">
              <User size={16} className="auth-input-icon" />
              <input
                type="text"
                className="auth-input-field"
                placeholder="Your Full Name"
                value={signUpName}
                onChange={(e) => setSignUpName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="auth-input-group">
              <Utensils size={16} className="auth-input-icon" />
              <input
                type="text"
                className="auth-input-field"
                placeholder="Restaurant / Business Name"
                value={signUpRestaurant}
                onChange={(e) => setSignUpRestaurant(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="auth-input-group">
              <Mail size={16} className="auth-input-icon" />
              <input
                type="email"
                className="auth-input-field"
                placeholder="Email address"
                value={signUpEmail}
                onChange={(e) => setSignUpEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>

            <div className="auth-input-group">
              <Lock size={16} className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input-field"
                placeholder="Create Password (min. 6 chars)"
                value={signUpPassword}
                onChange={(e) => setSignUpPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="auth-password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
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
              className="btn-primary auth-submit-btn"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Register & Enter Dashboard'}
              {!loading && <ArrowRight size={16} />}
            </button>

            <div className="auth-footer-toggle">
              <span>Already have an account?</span>{' '}
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => {
                  setActiveTab('signin');
                  setError('');
                }}
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* ===================================================
            TAB 3: QUICK STAFF PIN KEYPAD
            =================================================== */}
        {activeTab === 'pin' && (
          <div className="auth-pin-body">
            <p className="auth-pin-instruction">
              Enter 4-digit station PIN for instant floor access
            </p>

            {/* PIN Dots */}
            <div className="pin-dots-container">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`pin-dot ${idx < pin.length ? 'filled' : ''} ${error ? 'error' : ''}`}
                />
              ))}
            </div>

            <div className="pin-hint-badge">
              Default POS PIN: <strong>1234</strong>
            </div>

            {/* Keypad */}
            <div className="keypad-grid">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  className="keypad-btn"
                  disabled={loading}
                  onClick={() => addDigit(digit)}
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                className="keypad-btn action-key"
                disabled={loading}
                onClick={handleClear}
              >
                CLR
              </button>
              <button
                type="button"
                className="keypad-btn"
                disabled={loading}
                onClick={() => addDigit('0')}
              >
                0
              </button>
              <button
                type="button"
                className="keypad-btn action-key"
                disabled={loading}
                onClick={handleBackspace}
                title="Backspace"
              >
                <Delete size={20} />
              </button>
            </div>

            <div className="auth-footer-toggle" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => setActiveTab('signin')}
              >
                ← Switch to Email & Password Sign In
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
