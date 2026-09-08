import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import VaultModal from './VaultModal';
import {
  setMasterPassword,
  verifyMasterPassword,
  calculatePasswordStrength,
} from '../../services/vaultCrypto';

export default function SecurityAuthModal({
  isOpen,
  doc,
  mode = 'unlock', // 'unlock' | 'setup'
  onClose,
  onSuccess,
}) {
  const isSetupMode = mode === 'setup';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [strength, setStrength] = useState(() => calculatePasswordStrength(''));

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setError('');
      setStrength(calculatePasswordStrength(''));
    }
  }, [isOpen, isSetupMode]);

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    setError('');
    if (isSetupMode) {
      setStrength(calculatePasswordStrength(val));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter your master vault password.');
      return;
    }

    if (isSetupMode) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please verify your confirmation.');
        return;
      }

      try {
        await setMasterPassword(password);
        onSuccess(doc, password);
        onClose();
      } catch (err) {
        setError(err.message || 'Failed to establish master password.');
      }
    } else {
      try {
        const isValid = await verifyMasterPassword(password);
        if (isValid) {
          onSuccess(doc, password);
          onClose();
        } else {
          setError('Incorrect master password. Access denied.');
        }
      } catch {
        setError('Verification failed. Please try again.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <VaultModal
      isOpen={isOpen}
      onClose={onClose}
      type="security"
      icon={Lock}
      title={isSetupMode ? 'Create Master Vault Password' : 'Enter Master Password'}
      subtitle={
        isSetupMode
          ? 'Establish your custom encryption key'
          : doc ? `Unlocking "${doc.name}"` : 'Vault Access Verification'
      }
      maxWidth="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            {isSetupMode ? 'Set Password & Encrypt' : 'Unlock & Access'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Inline Error Message */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="text-xs text-blue-300/80 leading-relaxed">
          {isSetupMode
            ? 'Set a secure master password. This key encrypts your confidential files offline with zero-knowledge AES-GCM 256-bit cryptography.'
            : 'Enter your master vault password to decrypt and inspect this confidential document.'}
        </div>

        {/* Master Password Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-blue-300 mb-1.5">
            {isSetupMode ? 'New Master Password' : 'Master Password'}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={handlePasswordChange}
              placeholder={isSetupMode ? 'Create a strong master password' : 'Enter your master password'}
              className="w-full px-3.5 py-2.5 pr-10 bg-slate-900/50 border border-white/10 rounded-xl text-sm text-blue-50 focus:outline-blue-500 focus:bg-slate-900 transition placeholder:text-slate-500"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Dynamic Strength Meter (Only in Setup Mode) */}
        {isSetupMode && password && (
          <div className="p-3 bg-slate-900/50 border border-white/10 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">Password Strength</span>
              <span
                className={
                  strength.color === 'emerald'
                    ? 'text-emerald-400'
                    : strength.color === 'indigo'
                    ? 'text-blue-400'
                    : strength.color === 'amber'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }
              >
                {strength.label}
              </span>
            </div>

            {/* Strength Bar */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  strength.color === 'emerald'
                    ? 'bg-emerald-400'
                    : strength.color === 'indigo'
                    ? 'bg-blue-500'
                    : strength.color === 'amber'
                    ? 'bg-amber-400'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${strength.percent}%` }}
              />
            </div>

            {/* Checklist */}
            <div className="grid grid-cols-2 gap-1 text-[11px] pt-1 text-slate-500">
              <span className={strength.rules.minLength ? 'text-emerald-400 font-medium' : ''}>
                • Min 8 characters
              </span>
              <span className={strength.rules.hasNumber ? 'text-emerald-400 font-medium' : ''}>
                • Includes numbers
              </span>
              <span className={strength.rules.hasMixedCase ? 'text-emerald-400 font-medium' : ''}>
                • Upper & lowercase
              </span>
              <span className={strength.rules.hasSymbol ? 'text-emerald-400 font-medium' : ''}>
                • Special symbol
              </span>
            </div>
          </div>
        )}

        {/* Password Confirmation (Only in Setup Mode) */}
        {isSetupMode && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-300 mb-1.5">
              Confirm Master Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                placeholder="Re-enter your password"
                className="w-full px-3.5 py-2.5 pr-10 bg-slate-900/50 border border-white/10 rounded-xl text-sm text-blue-50 focus:outline-blue-500 focus:bg-slate-900 transition placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Client-Side AES-GCM 256-Bit • Key never leaves your device</span>
        </div>
      </form>
    </VaultModal>
  );
}
