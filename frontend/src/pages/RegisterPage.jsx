import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  User,
  Mail,
  Phone,
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
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    if (!phone.trim()) {
      setErrorMessage('Please enter your mobile phone number.');
      return;
    }
    if (!/^[0-9+\s\-()]{7,15}$/.test(phone.trim())) {
      setErrorMessage('Please enter a valid mobile number.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (!confirmPassword) {
      setErrorMessage('Please confirm your password.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await signUpWithCredentials({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
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
        <span className="tm-eyebrow">Get Started</span>
        <h2 className="tm-auth-form-title">Create Your Restaurant Account</h2>
        <p>No credit card required. Set up your operations in minutes.</p>
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
          <label htmlFor="reg-phone" className="tm-label">Mobile Number *</label>
          <div className="tm-input-wrap">
            <Phone size={17} className="tm-input-icon" />
            <input
              id="reg-phone"
              type="tel"
              required
              autoComplete="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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

        <div>
          <label htmlFor="reg-confirm-password" className="tm-label">Confirm Password *</label>
          <div className="tm-input-wrap">
            <Lock size={17} className="tm-input-icon" />
            <input
              id="reg-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="tm-input has-icon has-action"
            />
            <button
              type="button"
              className="tm-input-action"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <div className="tm-auth-policy">
          <input
            id="reg-agree-terms"
            type="checkbox"
            required
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
          />
          <label htmlFor="reg-agree-terms">
            I agree to TableMint&apos;s{' '}
            <Link to="/contact" target="_blank" rel="noopener noreferrer">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/contact" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </Link>.
          </label>
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
