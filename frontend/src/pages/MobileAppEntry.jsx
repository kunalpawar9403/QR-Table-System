import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  QrCode,
  ChefHat,
  Receipt,
  ArrowRight,
  Lock,
  Mail,
  User,
  Store,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  ChevronLeft,
  Settings,
  Wifi,
  RefreshCw,
  X,
  Server
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getStaffToken,
  signInWithCredentials,
  signUpWithCredentials,
  requestPasswordReset,
  resetPasswordWithCode
} from '../utils/staffAuth';
import { getApiBaseUrl, setApiBaseUrl } from '../utils/apiConfig';

// Detect if running inside native Capacitor / APK or Standalone PWA
export function isNativeAppEnvironment() {
  if (typeof window === 'undefined') return false;
  const isCapacitor = Boolean(window.Capacitor?.isNativePlatform?.());
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const urlParam = new URLSearchParams(window.location.search).get('app') === '1' ||
                   new URLSearchParams(window.location.search).get('apk') === '1' ||
                   window.location.pathname.startsWith('/app');
  return isCapacitor || isStandalone || urlParam;
}

export default function MobileAppEntry() {
  const navigate = useNavigate();

  // Screens: 'splash' | 'onboarding' | 'auth' | 'forgot_password'
  const [currentScreen, setCurrentScreen] = useState('splash');
  const [onboardingStep, setOnboardingStep] = useState(0);

  // Auth Mode: 'signin' | 'signup'
  const [authMode, setAuthMode] = useState('signin');

  // Sign In State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign Up State
  const [signupName, setSignupName] = useState('');
  const [signupRestaurant, setSignupRestaurant] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupRole, setSignupRole] = useState('admin');

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: enter email, 2: enter code & new pass

  // UI status
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Server Connection Configuration (Defaults to live Render cloud server)
  const [showServerModal, setShowServerModal] = useState(false);
  const [currentServerUrl, setCurrentServerUrl] = useState(() => getApiBaseUrl() || 'https://qr-table-system.onrender.com');
  const [serverUrlInput, setServerUrlInput] = useState(() => getApiBaseUrl() || 'https://qr-table-system.onrender.com');
  const [testStatus, setTestStatus] = useState(null); // { type: 'testing'|'success'|'error', message: string }

  const handleTestServerConnection = async (overrideUrl) => {
    const target = (overrideUrl || serverUrlInput).trim().replace(/\/+$/, '');
    if (!target) {
      setTestStatus({ type: 'error', message: 'Please enter a valid server URL.' });
      return;
    }
    setTestStatus({ type: 'testing', message: 'Connecting to server...' });
    try {
      const res = await fetch(`${target}/api/health`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setTestStatus({
          type: 'success',
          message: `Connected! ${data.service || 'TableMint'} • ${data.database || 'MongoDB'}`
        });
      } else {
        setTestStatus({ type: 'error', message: `Server replied with status ${res.status}.` });
      }
    } catch {
      setTestStatus({
        type: 'error',
        message: 'Could not reach server. Verify that server is running and device is on same Wi-Fi / network.'
      });
    }
  };

  const handleSaveServerUrl = () => {
    const clean = serverUrlInput.trim().replace(/\/+$/, '');
    setApiBaseUrl(clean);
    setCurrentServerUrl(clean);
    setShowServerModal(false);
    setErrorMessage('');
    setSuccessMessage(`Server connected: ${clean}`);
  };

  // 1. Splash Screen Logic: Auto-advance after 2 seconds
  useEffect(() => {
    // If user is already authenticated with a valid token, open Dashboard immediately
    const token = getStaffToken();
    if (token) {
      const timer = setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1600);
      return () => clearTimeout(timer);
    }

    // Check if onboarding was previously completed
    const hasSeenOnboarding = localStorage.getItem('tablemint_onboarding_completed') === 'true';

    const splashTimer = setTimeout(() => {
      if (hasSeenOnboarding) {
        setCurrentScreen('auth');
      } else {
        setCurrentScreen('onboarding');
      }
    }, 2000);

    return () => clearTimeout(splashTimer);
  }, [navigate]);

  // Handle Sign In submission
  const handleSignIn = async (e) => {
    e?.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await signInWithCredentials(loginEmail, loginPassword);
      if (res.success) {
        setSuccessMessage('Login successful! Opening dashboard...');
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 400);
      } else {
        const errText = res.error || 'Invalid credentials. Please verify your email and password.';
        setErrorMessage(errText);
      }
    } catch {
      setErrorMessage(`Network error connecting to server (${currentServerUrl}).`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign Up submission
  const handleSignUp = async (e) => {
    e?.preventDefault();
    if (!signupName.trim() || !signupEmail.trim() || !signupPassword) {
      setErrorMessage('Please fill in your name, email, and password.');
      return;
    }
    if (signupPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await signUpWithCredentials({
        name: signupName,
        email: signupEmail,
        password: signupPassword,
        restaurantName: signupRestaurant || 'My Restaurant',
        role: signupRole
      });

      if (res.success) {
        setSuccessMessage('Account created successfully! Welcome to TableMint.');
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 500);
      } else {
        setErrorMessage(res.error || 'Failed to create account. Please try again.');
      }
    } catch {
      setErrorMessage('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password Request (Step 1)
  const handleRequestResetCode = async (e) => {
    e?.preventDefault();
    if (!forgotEmail.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await requestPasswordReset(forgotEmail);
      if (res.success) {
        if (res.codePreview) {
          setForgotCode(res.codePreview);
        }
        setForgotStep(2);
        setSuccessMessage('Recovery code generated. Please set your new password below.');
      } else {
        setErrorMessage(res.error || 'Could not find an account with this email address.');
      }
    } catch {
      setErrorMessage('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Reset Password Submit (Step 2)
  const handleResetPasswordSubmit = async (e) => {
    e?.preventDefault();
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await resetPasswordWithCode({
        email: forgotEmail,
        code: forgotCode,
        newPassword: forgotNewPassword
      });

      if (res.success) {
        setSuccessMessage('Password reset successfully! Please sign in with your new password.');
        setLoginEmail(forgotEmail);
        setTimeout(() => {
          setCurrentScreen('auth');
          setAuthMode('signin');
          setForgotStep(1);
          setForgotCode('');
          setForgotNewPassword('');
        }, 1200);
      } else {
        setErrorMessage(res.error || 'Failed to reset password. Please check your recovery code.');
      }
    } catch {
      setErrorMessage('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Onboarding slides data
  const onboardingSlides = [
    {
      badge: 'TABLE QR ORDERING',
      title: 'Contactless Smart Dining',
      desc: 'Guests scan dynamic table QR stands, browse high-res digital menus, and place instant food orders in seconds.',
      icon: <QrCode size={56} style={{ color: '#16c995' }} />,
      color: '#16c995'
    },
    {
      badge: 'KITCHEN DISPLAY (KDS)',
      title: 'Live Order Routing',
      desc: 'Orders instantly fire to your kitchen chefs with audible chimes, preparation timers, and dish-level status indicators.',
      icon: <ChefHat size={56} style={{ color: '#38bdf8' }} />,
      color: '#38bdf8'
    },
    {
      badge: 'FAST GST BILLING',
      title: 'Instant 3-Second Billing',
      desc: 'Print formatted 58mm / 80mm thermal receipts, manage discounts & taxes, and accept direct UPI payments seamlessly.',
      icon: <Receipt size={56} style={{ color: '#fbbf24' }} />,
      color: '#fbbf24'
    }
  ];

  const handleFinishOnboarding = () => {
    localStorage.setItem('tablemint_onboarding_completed', 'true');
    setCurrentScreen('auth');
  };

  return (
    <div style={{
      width: '100%',
      minHeight: '100dvh',
      background: '#041c14',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflowX: 'hidden',
      fontFamily: 'var(--font-body, system-ui, -apple-system, sans-serif)',
      paddingTop: 'max(16px, calc(env(safe-area-inset-top, 0px) + 8px))',
      paddingBottom: 'max(16px, calc(env(safe-area-inset-bottom, 0px) + 8px))',
      boxSizing: 'border-box'
    }}>
      <AnimatePresence mode="wait">
        {/* ========================================================================= */}
        {/* 1. SPLASH SCREEN (App Logo & Branding) */}
        {/* ========================================================================= */}
        {currentScreen === 'splash' && (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
            onClick={() => {
              if (getStaffToken()) {
                navigate('/dashboard', { replace: true });
              } else if (localStorage.getItem('tablemint_onboarding_completed') === 'true') {
                setCurrentScreen('auth');
              } else {
                setCurrentScreen('onboarding');
              }
            }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            {/* Ambient Background Glow */}
            <div style={{
              position: 'absolute',
              width: 320,
              height: 320,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(22, 201, 149, 0.22) 0%, transparent 70%)',
              filter: 'blur(30px)',
              pointerEvents: 'none'
            }} />

            {/* Pulsing Animated App Icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.05, 1], opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{
                width: 110,
                height: 110,
                borderRadius: '28px',
                background: 'linear-gradient(145deg, #0f4d3a, #06261d)',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45), 0 0 35px rgba(22, 201, 149, 0.35)',
                border: '1.5px solid rgba(22, 201, 149, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
                position: 'relative'
              }}
            >
              <img
                src="/images/tablemint_icon.png"
                alt="TableMint Logo"
                style={{ width: 80, height: 80, borderRadius: '20px', objectFit: 'contain' }}
                onError={(e) => {
                  e.currentTarget.src = '/images/tablemint_logo.jpg';
                }}
              />
            </motion.div>

            {/* App Brand Name */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <h1 style={{
                fontSize: '2.4rem',
                fontWeight: 900,
                letterSpacing: '-0.5px',
                color: '#ffffff',
                margin: 0
              }}>
                Table<span style={{ color: '#16c995' }}>Mint</span>
              </h1>
              <p style={{
                color: '#94a3b8',
                fontSize: '0.95rem',
                marginTop: 8,
                letterSpacing: '0.3px',
                fontWeight: 500
              }}>
                Smart QR Dining & Restaurant POS
              </p>
            </motion.div>

            {/* Bottom Loader & Version */}
            <div style={{
              position: 'absolute',
              bottom: 40,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12
            }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '3px solid rgba(22, 201, 149, 0.2)',
                borderTopColor: '#16c995',
                animation: 'spin 0.8s linear infinite'
              }} />
              <span style={{ fontSize: '0.78rem', color: '#64748b', letterSpacing: '0.5px' }}>
                v2.4.0 • Enterprise POS
              </span>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* 2. ONBOARDING SCREEN (Feature Intro Carousel) */}
        {/* ========================================================================= */}
        {currentScreen === 'onboarding' && (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35 }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '28px 24px 36px 24px',
              maxWidth: 480,
              margin: '0 auto',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            {/* Top Bar: Logo & Skip Button */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img
                  src="/images/tablemint_icon.png"
                  alt="Icon"
                  style={{ width: 28, height: 28, borderRadius: 6 }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#ffffff' }}>
                  Table<span style={{ color: '#16c995' }}>Mint</span>
                </span>
              </div>
              <button
                type="button"
                onClick={handleFinishOnboarding}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#94a3b8',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Skip
              </button>
            </div>

            {/* Slide Body */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '20px 0'
            }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={onboardingStep}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}
                >
                  <div style={{
                    width: 120,
                    height: 120,
                    borderRadius: '32px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: `1.5px solid ${onboardingSlides[onboardingStep].color}44`,
                    boxShadow: `0 12px 30px ${onboardingSlides[onboardingStep].color}22`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 28
                  }}>
                    {onboardingSlides[onboardingStep].icon}
                  </div>

                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    letterSpacing: '1px',
                    color: onboardingSlides[onboardingStep].color,
                    background: `${onboardingSlides[onboardingStep].color}18`,
                    padding: '4px 12px',
                    borderRadius: 99,
                    marginBottom: 12
                  }}>
                    {onboardingSlides[onboardingStep].badge}
                  </span>

                  <h2 style={{
                    fontSize: '1.65rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    margin: '0 0 12px 0',
                    lineHeight: 1.25
                  }}>
                    {onboardingSlides[onboardingStep].title}
                  </h2>

                  <p style={{
                    fontSize: '0.94rem',
                    color: '#94a3b8',
                    lineHeight: 1.6,
                    margin: 0,
                    maxWidth: 340
                  }}>
                    {onboardingSlides[onboardingStep].desc}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom Controls: Indicators & Next Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Step Dots Indicator */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                {onboardingSlides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setOnboardingStep(i)}
                    style={{
                      width: onboardingStep === i ? 24 : 8,
                      height: 8,
                      borderRadius: 4,
                      background: onboardingStep === i ? '#16c995' : 'rgba(255, 255, 255, 0.18)',
                      border: 'none',
                      transition: 'all 0.25s ease',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  />
                ))}
              </div>

              {/* Action Button */}
              {onboardingStep < onboardingSlides.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setOnboardingStep(prev => prev + 1)}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: '#16c995',
                    color: '#041c14',
                    border: 'none',
                    borderRadius: '16px',
                    fontSize: '1.02rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(22, 201, 149, 0.3)'
                  }}
                >
                  <span>Continue</span>
                  <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinishOnboarding}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: 'linear-gradient(135deg, #16c995, #0ea375)',
                    color: '#041c14',
                    border: 'none',
                    borderRadius: '16px',
                    fontSize: '1.02rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(22, 201, 149, 0.4)'
                  }}
                >
                  <span>Get Started</span>
                  <ArrowRight size={18} />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* 3. LOGIN / SIGNUP SCREEN (Authentication) */}
        {/* ========================================================================= */}
        {currentScreen === 'auth' && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35 }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '24px 20px 32px 20px',
              maxWidth: 460,
              margin: '0 auto',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            {/* App Header */}
            <div style={{ textAlign: 'center', marginBottom: 24, marginTop: 8 }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: '16px',
                background: 'linear-gradient(145deg, #0d4434, #041f17)',
                border: '1px solid rgba(22, 201, 149, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12
              }}>
                <img
                  src="/images/tablemint_icon.png"
                  alt="Logo"
                  style={{ width: 36, height: 36, borderRadius: '10px' }}
                  onError={(e) => { e.currentTarget.src = '/images/tablemint_logo.jpg'; }}
                />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px 0', color: '#ffffff' }}>
                Table<span style={{ color: '#16c995' }}>Mint</span> POS
              </h2>
              <p style={{ fontSize: '0.86rem', color: '#94a3b8', margin: 0 }}>
                {authMode === 'signin' ? 'Sign in to access your restaurant POS' : 'Create your restaurant workspace'}
              </p>
            </div>

            {/* Server Connection Pill */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => { setShowServerModal(true); setTestStatus(null); }}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(22, 201, 149, 0.25)',
                  borderRadius: 999,
                  padding: '5px 12px',
                  color: '#94a3b8',
                  fontSize: '0.76rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer'
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16c995', boxShadow: '0 0 6px #16c995' }} />
                <span>Backend: <strong style={{ color: '#e2e8f0' }}>{currentServerUrl.replace(/^https?:\/\//, '') || 'Auto'}</strong></span>
                <Settings size={12} style={{ color: '#16c995', marginLeft: 2 }} />
              </button>
            </div>

            {/* Segmented Tab Switcher */}
            <div style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.06)',
              borderRadius: '12px',
              padding: 4,
              marginBottom: 20
            }}>
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setErrorMessage(''); setSuccessMessage(''); }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: '10px',
                  border: 'none',
                  background: authMode === 'signin' ? '#16c995' : 'transparent',
                  color: authMode === 'signin' ? '#041c14' : '#cbd5e1',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setErrorMessage(''); setSuccessMessage(''); }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: '10px',
                  border: 'none',
                  background: authMode === 'signup' ? '#16c995' : 'transparent',
                  color: authMode === 'signup' ? '#041c14' : '#cbd5e1',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Create Account
              </button>
            </div>

            {/* Alert Messages */}
            {errorMessage && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#fca5a5',
                padding: '12px 14px',
                borderRadius: '12px',
                fontSize: '0.84rem',
                marginBottom: 16
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0, color: '#ef4444', marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div>{errorMessage}</div>
                  {(errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('server') || errorMessage.toLowerCase().includes('connecting')) && (
                    <button
                      type="button"
                      onClick={() => { setShowServerModal(true); setTestStatus(null); }}
                      style={{
                        marginTop: 8,
                        background: '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <Settings size={14} />
                      <span>Configure Server Address</span>
                    </button>
                  )}
                </div>
              </div>
            )}
            {successMessage && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(22, 201, 149, 0.15)',
                border: '1px solid rgba(22, 201, 149, 0.35)',
                color: '#6ee7b7',
                padding: '12px 14px',
                borderRadius: '12px',
                fontSize: '0.84rem',
                marginBottom: 16
              }}>
                <CheckCircle2 size={18} style={{ flexShrink: 0, color: '#16c995' }} />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Form Container Card */}
            <div style={{
              background: '#072b20',
              borderRadius: '20px',
              padding: '24px 20px',
              border: '1px solid rgba(22, 201, 149, 0.2)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)'
            }}>
              {authMode === 'signin' ? (
                /* ==================== SIGN IN FORM ==================== */
                <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                      Email Address
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        type="email"
                        required
                        placeholder="admin@restaurant.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px 12px 42px',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#ffffff',
                          fontSize: '0.94rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label style={{ fontSize: '0.84rem', fontWeight: 600, color: '#cbd5e1' }}>
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentScreen('forgot_password');
                          setErrorMessage('');
                          setSuccessMessage('');
                          setForgotEmail(loginEmail);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#16c995',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        placeholder="Enter password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 42px 12px 42px',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#ffffff',
                          fontSize: '0.94rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        style={{
                          position: 'absolute',
                          right: 14,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: '#16c995',
                      color: '#041c14',
                      border: 'none',
                      borderRadius: '14px',
                      fontSize: '1rem',
                      fontWeight: 800,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      marginTop: 8,
                      boxShadow: '0 6px 20px rgba(22, 201, 149, 0.35)'
                    }}
                  >
                    {loading ? 'Signing in...' : 'Sign In to Dashboard'}
                    {!loading && <ArrowRight size={18} />}
                  </button>
                </form>
              ) : (
                /* ==================== SIGN UP FORM ==================== */
                <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 5 }}>
                      Full Name
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        type="text"
                        required
                        placeholder="e.g. John Doe"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '11px 14px 11px 42px',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#ffffff',
                          fontSize: '0.92rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 5 }}>
                      Restaurant / Cafe Name
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Store size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Spice Symphony"
                        value={signupRestaurant}
                        onChange={(e) => setSignupRestaurant(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '11px 14px 11px 42px',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#ffffff',
                          fontSize: '0.92rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 5 }}>
                      Work Email
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        type="email"
                        required
                        placeholder="owner@restaurant.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '11px 14px 11px 42px',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#ffffff',
                          fontSize: '0.92rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 5 }}>
                      Password (min 6 chars)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        required
                        placeholder="Create strong password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '11px 42px 11px 42px',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#ffffff',
                          fontSize: '0.92rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        style={{
                          position: 'absolute',
                          right: 14,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        {showSignupPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: '#16c995',
                      color: '#041c14',
                      border: 'none',
                      borderRadius: '14px',
                      fontSize: '1rem',
                      fontWeight: 800,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      marginTop: 6,
                      boxShadow: '0 6px 20px rgba(22, 201, 149, 0.35)'
                    }}
                  >
                    {loading ? 'Creating...' : 'Create Restaurant Account'}
                    {!loading && <ArrowRight size={18} />}
                  </button>
                </form>
              )}
            </div>

            {/* Security note */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 20,
              color: '#64748b',
              fontSize: '0.78rem'
            }}>
              <ShieldCheck size={16} style={{ color: '#16c995' }} />
              <span>256-Bit SSL Encrypted Multi-Tenant POS</span>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* 4. FORGOT PASSWORD SCREEN (Password Recovery) */}
        {/* ========================================================================= */}
        {currentScreen === 'forgot_password' && (
          <motion.div
            key="forgot"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35 }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '24px 20px 32px 20px',
              maxWidth: 460,
              margin: '0 auto',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            {/* Back Button */}
            <button
              type="button"
              onClick={() => {
                setCurrentScreen('auth');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                color: '#cbd5e1',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: 20,
                padding: 0
              }}
            >
              <ChevronLeft size={20} />
              <span>Back to Sign In</span>
            </button>

            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '14px',
                background: 'rgba(22, 201, 149, 0.15)',
                color: '#16c995',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14
              }}>
                <KeyRound size={24} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 6px 0', color: '#ffffff' }}>
                Password Recovery
              </h2>
              <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                {forgotStep === 1
                  ? 'Enter your registered restaurant email address to receive your verification code.'
                  : 'Enter the verification code and choose your new secure password.'}
              </p>
            </div>

            {/* Alert Messages */}
            {errorMessage && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#fca5a5',
                padding: '12px 14px',
                borderRadius: '12px',
                fontSize: '0.84rem',
                marginBottom: 16
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0, color: '#ef4444' }} />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(22, 201, 149, 0.15)',
                border: '1px solid rgba(22, 201, 149, 0.35)',
                color: '#6ee7b7',
                padding: '12px 14px',
                borderRadius: '12px',
                fontSize: '0.84rem',
                marginBottom: 16
              }}>
                <CheckCircle2 size={18} style={{ flexShrink: 0, color: '#16c995' }} />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Recovery Card */}
            <div style={{
              background: '#072b20',
              borderRadius: '20px',
              padding: '24px 20px',
              border: '1px solid rgba(22, 201, 149, 0.2)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)'
            }}>
              {forgotStep === 1 ? (
                /* Step 1: Send recovery code */
                <form onSubmit={handleRequestResetCode} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                      Registered Email Address
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        type="email"
                        required
                        placeholder="owner@restaurant.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px 12px 42px',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#ffffff',
                          fontSize: '0.94rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: '#16c995',
                      color: '#041c14',
                      border: 'none',
                      borderRadius: '14px',
                      fontSize: '1rem',
                      fontWeight: 800,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      marginTop: 8,
                      boxShadow: '0 6px 20px rgba(22, 201, 149, 0.35)'
                    }}
                  >
                    {loading ? 'Verifying...' : 'Send Recovery Code'}
                    {!loading && <ArrowRight size={18} />}
                  </button>
                </form>
              ) : (
                /* Step 2: Enter code & set new password */
                <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                      6-Digit Recovery Code
                    </label>
                    <div style={{ position: 'relative' }}>
                      <KeyRound size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="e.g. 482910"
                        value={forgotCode}
                        onChange={(e) => setForgotCode(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px 12px 42px',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#ffffff',
                          fontSize: '1.05rem',
                          letterSpacing: '3px',
                          fontWeight: 700,
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                      New Password (min 6 characters)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        type="password"
                        required
                        placeholder="Enter new password"
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px 12px 42px',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#ffffff',
                          fontSize: '0.94rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: '#16c995',
                      color: '#041c14',
                      border: 'none',
                      borderRadius: '14px',
                      fontSize: '1rem',
                      fontWeight: 800,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      marginTop: 8,
                      boxShadow: '0 6px 20px rgba(22, 201, 149, 0.35)'
                    }}
                  >
                    {loading ? 'Updating Password...' : 'Save New Password & Sign In'}
                    {!loading && <CheckCircle2 size={18} />}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 5. SERVER CONFIGURATION MODAL */}
      {/* ========================================================================= */}
      {showServerModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          zIndex: 9999
        }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            style={{
              background: '#072b20',
              border: '1.5px solid rgba(22, 201, 149, 0.35)',
              borderRadius: 24,
              padding: '24px 20px',
              maxWidth: 420,
              width: '100%',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Server size={20} style={{ color: '#16c995' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff', fontWeight: 800 }}>
                  Server Connection
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowServerModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Configure your TableMint backend server URL (Wi-Fi Local IP or Cloud Render URL):
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: 6 }}>
                Backend API Server URL
              </label>
              <input
                type="text"
                value={serverUrlInput}
                onChange={(e) => {
                  setServerUrlInput(e.target.value);
                  setTestStatus(null);
                }}
                placeholder="http://192.168.1.4:3000"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Quick Presets */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  const url = 'http://192.168.1.4:3000';
                  setServerUrlInput(url);
                  handleTestServerConnection(url);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 8,
                  padding: '6px 10px',
                  color: '#cbd5e1',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                📡 Wi-Fi (192.168.1.4:3000)
              </button>
              <button
                type="button"
                onClick={() => {
                  const url = 'https://qr-table-system.onrender.com';
                  setServerUrlInput(url);
                  handleTestServerConnection(url);
                }}
                style={{
                  background: 'rgba(22, 201, 149, 0.15)',
                  border: '1px solid rgba(22, 201, 149, 0.35)',
                  borderRadius: 8,
                  padding: '6px 10px',
                  color: '#6ee7b7',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ☁️ Render Cloud (Live)
              </button>
            </div>

            {/* Live Test Feedback */}
            {testStatus && (
              <div style={{
                padding: '10px 12px',
                borderRadius: 10,
                fontSize: '0.8rem',
                marginBottom: 16,
                background: testStatus.type === 'success' ? 'rgba(22, 201, 149, 0.15)' :
                            testStatus.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                color: testStatus.type === 'success' ? '#6ee7b7' :
                       testStatus.type === 'error' ? '#fca5a5' : '#cbd5e1',
                border: `1px solid ${testStatus.type === 'success' ? 'rgba(22, 201, 149, 0.3)' :
                                     testStatus.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.15)'}`
              }}>
                {testStatus.message}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => handleTestServerConnection()}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <RefreshCw size={15} />
                <span>Test</span>
              </button>
              <button
                type="button"
                onClick={handleSaveServerUrl}
                style={{
                  flex: 2,
                  padding: '12px',
                  background: '#16c995',
                  color: '#041c14',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <CheckCircle2 size={16} />
                <span>Save & Connect</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

