import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import './Auth.css';

export default function ForgotPassword() {
  const navigate = useNavigate();

  // Steps: 1 = Enter Email, 2 = Enter Code & New Password, 3 = Success
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1: Request verification code
  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.forgotPassword(email);
      if (response?.devCode) {
        setDevCode(response.devCode);
      }
      setStep(2);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Unable to send verification code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset password using code
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!code.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (password.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.resetPassword({
        email: email.trim(),
        code: code.trim(),
        password,
      });
      setSuccessMsg(response?.message || 'Password changed successfully!');
      setStep(3);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to reset password. The code may be invalid or expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Resend code handler
  const handleResendCode = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await authService.forgotPassword(email);
      if (response?.devCode) {
        setDevCode(response.devCode);
      }
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="vault-dial" aria-hidden="true"></span>
          <span className="auth-brand-text">LifeVault</span>
        </div>

        {step === 1 && (
          <>
            <h1 className="auth-title">Reset your password</h1>
            <p className="auth-subtitle">
              Enter your registered email and we'll send you a 6-digit verification code.
            </p>

            {error && <div className="auth-error">{error}</div>}

            <form className="auth-form" onSubmit={handleRequestCode}>
              <div className="auth-field">
                <label htmlFor="reset-email">Email Address</label>
                <input
                  id="reset-email"
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary auth-submit"
                disabled={loading || !email.trim()}
              >
                {loading ? 'Sending code…' : 'Send Verification Code'}
              </button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="auth-title">Enter verification code</h1>
            <p className="auth-subtitle">
              Sent to <strong>{email}</strong>{' '}
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--gold-600)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '13px',
                }}
              >
                (Change)
              </button>
            </p>

            {/* Local dev mode helper when SMTP is not configured */}
            {devCode && (
              <div className="auth-dev-alert">
                <div>⚡ <strong>Local Demo Mode:</strong> SMTP is not configured yet.</div>
                <div>Your 6-digit verification code is:</div>
                <div style={{ marginTop: '4px' }}>
                  <span className="auth-dev-code">{devCode}</span>
                  <button
                    type="button"
                    className="auth-autofill-btn"
                    onClick={() => setCode(devCode)}
                  >
                    Auto-fill Code
                  </button>
                </div>
              </div>
            )}

            {error && <div className="auth-error">{error}</div>}

            <form className="auth-form" onSubmit={handleResetPassword}>
              <div className="auth-field">
                <label htmlFor="verify-code">6-Digit Verification Code</label>
                <input
                  id="verify-code"
                  type="text"
                  className="input code-input"
                  placeholder="000000"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                />
              </div>

              <div className="auth-field">
                <label htmlFor="new-password">New Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    className="input"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex="-1"
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="confirm-new-password">Confirm New Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="input"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    tabIndex="-1"
                  >
                    {showConfirmPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary auth-submit"
                disabled={loading || code.length < 6 || !password || !confirmPassword}
              >
                {loading ? 'Updating password…' : 'Change Password'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Didn't receive code? Resend code
                </button>
              </div>
            </form>
          </>
        )}

        {step === 3 && (
          <div className="auth-flow-completed">
            <h1 className="auth-title">Success!</h1>
            <p className="auth-subtitle" style={{ marginBottom: '20px' }}>
              Your password has been changed successfully.
            </p>
            <div className="auth-success">{successMsg}</div>
            <button
              onClick={() => navigate('/login')}
              className="btn btn-primary auth-submit"
              style={{ marginTop: '20px' }}
            >
              Go to Login
            </button>
          </div>
        )}

        {step !== 3 && (
          <p className="auth-switch">
            Remembered your password? <Link to="/login">Back to login</Link>
          </p>
        )}
      </div>
    </div>
  );
}
