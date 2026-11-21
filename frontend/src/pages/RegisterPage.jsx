import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  User,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { signUpWithCredentials, getStaffToken } from '../utils/staffAuth';
import AuthShell from '../components/auth/AuthShell';

const REGISTER_POINTS = [
  'Zero setup fees and no credit card required',
  'Pre-loaded with fresh tables and starter menu',
  'Connect unlimited waiter iPads, tablets, and phones',
  'Automated GST invoicing with printable bills',
  'Live Kitchen Display System (KDS) included'
];

export default function RegisterPage() {
  const navigate = useNavigate();

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

  return (
    <AuthShell
      title={<>Set up your restaurant workspace in <em>60 seconds.</em></>}
      description="Upon registration, TableMint provides a clean, isolated database for your venue with fresh tables, dynamic QR codes, and default categories."
      points={REGISTER_POINTS}
      asideFooter={
        <span className="tm-auth-secure">
          <ShieldCheck size={15} />
          Complete Data Isolation &amp; Enterprise Encryption
        </span>
      }
    >
      <div className="tm-auth-head">
        <span className="tm-eyebrow">14-Day Free Trial</span>
        <h2 className="tm-auth-form-title">Create Your Restaurant Account</h2>
        <p>Start your 14-day free trial. No credit card needed.</p>
      </div>

      {errorMessage && (
        <div className="tm-alert" role="alert">
          <AlertCircle size={17} />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="tm-form tm-auth-form">
        <div>
          <label htmlFor="reg-restaurant" className="tm-label">Restaurant / Venue Name *</label>
          <div className="tm-input-wrap">
            <Building2 size={17} className="tm-input-icon" />
            <input
              id="reg-restaurant"
              type="text"
              required
              autoComplete="organization"
              placeholder="e.g. Copper Chimney Bistro"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              className="tm-input has-icon"
            />
          </div>
        </div>

        <div>
          <label htmlFor="reg-name" className="tm-label">Owner / Manager Full Name *</label>
          <div className="tm-input-wrap">
            <User size={17} className="tm-input-icon" />
            <input
              id="reg-name"
              type="text"
              required
              autoComplete="name"
              placeholder="e.g. Rohan Verma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="tm-input has-icon"
            />
          </div>
        </div>

        <div>
          <label htmlFor="reg-email" className="tm-label">Email Address *</label>
          <div className="tm-input-wrap">
            <Mail size={17} className="tm-input-icon" />
            <input
              id="reg-email"
              type="email"
              required
              autoComplete="email"
              placeholder="rohan@copperchimney.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="tm-input has-icon"
            />
          </div>
        </div>

        <div>
          <div className="tm-label-row">
            <label htmlFor="reg-password" className="tm-label">Password *</label>
            <span className="tm-label-hint">Min 6 characters</span>
          </div>
          <div className="tm-input-wrap">
            <Lock size={17} className="tm-input-icon" />
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="Create a secure password"
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
          <span>{loading ? 'Setting up workspace...' : 'Create Account & Launch POS'}</span>
          <ArrowRight size={16} />
        </button>
      </form>

      <p className="tm-auth-switch">
        Already have an account? <Link to="/login" style={{ textDecoration: 'none' }}>Sign In</Link>
      </p>
    </AuthShell>
  );
}
