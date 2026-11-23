import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  KeyRound,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import AuthShell from '../components/auth/AuthShell';
import { requestPasswordReset, resetPasswordWithCode } from '../utils/staffAuth';

const FORGOT_POINTS = [
  'Instant OTP generation for secure account recovery',
  'Supports one-click dummy OTP (123456) for quick testing',
  'Encrypted password reset with instant dashboard access',
  'Protected by multi-tier rate limiting and isolation'
];

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Enter Email, 2: Enter OTP & New Password, 3: Success
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [dummyOtp, setDummyOtp] = useState('123456');
  const [codePreview, setCodePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid restaurant email address.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await requestPasswordReset(email.trim());
      if (res.success) {
        if (res.codePreview) setCodePreview(res.codePreview);
        if (res.dummyOtp) setDummyOtp(res.dummyOtp);
        setSuccessMessage(`OTP sent successfully! For quick testing, you can also use dummy OTP 123456.`);
        setStep(2);
      } else {
        setErrorMessage(res.error || 'Could not verify email. Please check your spelling.');
      }
    } catch {
      setErrorMessage('Network connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password with OTP
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setErrorMessage('Please enter the verification OTP.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await resetPasswordWithCode({
        email: email.trim(),
        code: code.trim(),
        newPassword
      });

      if (res.success) {
        setStep(3);
      } else {
        setErrorMessage(res.error || 'Failed to reset password. Please check your OTP.');
      }
    } catch {
      setErrorMessage('Network connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={<>Secure Restaurant Account <em>Recovery.</em></>}
      description="Quickly reset your credentials and get back to managing your floor, tables, orders, and POS billing."
      points={FORGOT_POINTS}
      asideFooter={
        <span className="tm-auth-secure">
          <ShieldCheck size={15} />
          End-to-End Enterprise Encryption
        </span>
      }
    >
      {/* STEP 1: ENTER EMAIL */}
      {step === 1 && (
        <>
          <div className="tm-auth-head">
            <span className="tm-eyebrow">Password Recovery</span>
            <h2 className="tm-auth-form-title">Forgot Your Password?</h2>
            <p>Enter the email address registered with your restaurant. We will generate a verification OTP.</p>
          </div>

          {errorMessage && (
            <div className="tm-alert" role="alert">
              <AlertCircle size={17} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleRequestOtp} className="tm-form tm-auth-form">
            <div>
              <label htmlFor="forgot-email" className="tm-label">Email Address *</label>
              <div className="tm-input-wrap">
                <Mail size={17} className="tm-input-icon" />
                <input
                  id="forgot-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin@yourrestaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="tm-input has-icon"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="tm-btn tm-btn-primary tm-btn-lg tm-btn-block">
              <span>{loading ? 'Generating OTP...' : 'Send Verification OTP'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <p className="tm-auth-switch">
            Remembered your password? <Link to="/login" style={{ textDecoration: 'none' }}>Back to Sign In</Link>
          </p>
        </>
      )}

      {/* STEP 2: ENTER OTP & NEW PASSWORD */}
      {step === 2 && (
        <>
          <div className="tm-auth-head">
            <span className="tm-eyebrow">Step 2 of 2</span>
            <h2 className="tm-auth-form-title">Enter Verification OTP</h2>
            <p>
              Recovery code sent for <strong>{email}</strong>. Enter the OTP below to set your new password.
            </p>
          </div>

          {/* DUMMY OTP QUICK FILL OPTION */}
          <div
            style={{
              background: 'rgba(34, 195, 238, 0.08)',
              border: '1px dashed rgba(34, 195, 238, 0.45)',
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--mk-text)' }}>
              <Sparkles size={16} style={{ color: '#0284C7', flexShrink: 0 }} />
              <span>
                Testing? <strong>Dummy OTP: {dummyOtp}</strong>
                {codePreview && codePreview !== dummyOtp && (
                  <span style={{ color: 'var(--mk-text-2)', marginLeft: 4 }}>(Generated: {codePreview})</span>
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setCode(dummyOtp);
                setErrorMessage('');
              }}
              className="tm-btn tm-btn-secondary"
              style={{
                height: 30,
                padding: '0 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                borderRadius: 6,
                whiteSpace: 'nowrap',
                background: '#FFFFFF',
                color: '#0369A1',
                borderColor: '#BAE6FD'
              }}
            >
              Fill Dummy OTP
            </button>
          </div>

          {errorMessage && (
            <div className="tm-alert" role="alert">
              <AlertCircle size={17} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && !errorMessage && (
            <div className="tm-alert" style={{ background: '#ECFDF5', borderColor: '#A7F3D0', color: '#065F46' }}>
              <CheckCircle size={17} style={{ color: '#059669' }} />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleResetPassword} className="tm-form tm-auth-form">
            <div>
              <div className="tm-label-row">
                <label htmlFor="otp-code" className="tm-label">Verification OTP Code *</label>
                <span className="tm-label-hint">6-digit code</span>
              </div>
              <div className="tm-input-wrap">
                <KeyRound size={17} className="tm-input-icon" />
                <input
                  id="otp-code"
                  type="text"
                  required
                  maxLength={6}
                  placeholder="Enter 6-digit OTP (e.g. 123456)"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="tm-input has-icon"
                  style={{ letterSpacing: '0.15em', fontWeight: 600 }}
                />
              </div>
            </div>

            <div>
              <div className="tm-label-row">
                <label htmlFor="new-password" className="tm-label">New Password *</label>
                <span className="tm-label-hint">Min 6 characters</span>
              </div>
              <div className="tm-input-wrap">
                <Lock size={17} className="tm-input-icon" />
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Enter your new secure password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
              <label htmlFor="confirm-new-password" className="tm-label">Confirm New Password *</label>
              <div className="tm-input-wrap">
                <Lock size={17} className="tm-input-icon" />
                <input
                  id="confirm-new-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Re-enter your new password"
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

            <button type="submit" disabled={loading} className="tm-btn tm-btn-primary tm-btn-lg tm-btn-block">
              <span>{loading ? 'Updating Password...' : 'Reset Password & Launch POS'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, fontSize: '0.875rem' }}>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setErrorMessage('');
                setSuccessMessage('');
              }}
              style={{ background: 'none', border: 'none', color: 'var(--mk-brand)', cursor: 'pointer', padding: 0, fontWeight: 500 }}
            >
              ← Change Email
            </button>

            <Link to="/login" style={{ color: 'var(--mk-text-2)', textDecoration: 'none' }}>
              Cancel &amp; Sign In
            </Link>
          </div>
        </>
      )}

      {/* STEP 3: SUCCESS */}
      {step === 3 && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: '#DCFCE7',
              color: '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              boxShadow: '0 8px 20px rgba(22, 163, 74, 0.2)'
            }}
          >
            <CheckCircle size={32} />
          </div>

          <h2 className="tm-auth-form-title" style={{ marginBottom: 12 }}>Password Reset Complete!</h2>
          <p style={{ color: 'var(--mk-text-2)', marginBottom: 28, lineHeight: 1.6 }}>
            Your account password has been successfully updated. You can now sign in to your restaurant dashboard with your new credentials.
          </p>

          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="tm-btn tm-btn-primary tm-btn-lg tm-btn-block"
          >
            <span>Proceed to Sign In</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </AuthShell>
  );
}
