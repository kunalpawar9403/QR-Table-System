import React, { useState, useEffect } from 'react';
import { Lock, Delete, X, ShieldAlert, KeyRound } from 'lucide-react';
import { verifyStaffPin } from '../utils/staffAuth';
import { soundManager } from '../utils/sound';

export default function StaffAuthModal({ isOpen, onSuccess, onClose, message }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(message || '');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(message || '');
    }
  }, [isOpen, message]);

  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen, pin, loading]);

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
        if (onSuccess) onSuccess();
      } else {
        triggerError(res.error || 'Invalid Staff PIN. Try default: 1234');
      }
    } catch (err) {
      triggerError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const triggerError = (msg) => {
    setError(msg);
    setShake(true);
    setPin('');
    setTimeout(() => setShake(false), 500);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className={`staff-modal-card ${shake ? 'shake-anim' : ''}`}>
        {onClose && (
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        )}

        <div className="staff-lock-icon-badge">
          <KeyRound size={32} />
        </div>

        <h2 className="staff-modal-title">Staff Authentication</h2>
        <p className="staff-modal-subtitle">
          Enter 4-digit Staff PIN to access live operations & POS controls
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

        {/* Error message */}
        <div className="pin-error-box">
          {error ? (
            <span className="error-text">
              <ShieldAlert size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              {error}
            </span>
          ) : (
            <span className="hint-text">Default PIN: 1234 (configured in server/.env)</span>
          )}
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
          >
            <Delete size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
