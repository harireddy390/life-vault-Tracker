import React, { useState, useEffect, useRef } from 'react';
import { Lock, X, ShieldAlert, KeyRound } from 'lucide-react';

export default function PinAuthModal({
  isOpen,
  doc,
  onClose,
  onSuccess,
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setIsShaking(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Handle Escape Key for strict modal isolation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !doc) return null;

  const handleSubmit = (e) => {
    e?.preventDefault();
    // Verify against default demo PIN "1234"
    if (pin === '1234') {
      onSuccess(doc);
      onClose();
    } else {
      setError('Incorrect PIN. Try again.');
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
        setPin('');
        inputRef.current?.focus();
      }, 500);
    }
  };

  const handleDigitChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(val);
    setError('');
    if (val.length === 4) {
      if (val === '1234') {
        onSuccess(doc);
        onClose();
      } else {
        setError('Incorrect PIN. Try again.');
        setIsShaking(true);
        setTimeout(() => {
          setIsShaking(false);
          setPin('');
          inputRef.current?.focus();
        }, 500);
      }
    }
  };

  return (
    <div
      className="modal-backdrop-isolated fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={`modal-container-isolated max-w-sm w-full bg-white rounded-2xl shadow-2xl p-6 relative overflow-hidden ${
          isShaking ? 'animate-shake' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-indigo-400 flex items-center justify-center mb-3 shadow-md">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Secret Safe Authentication
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-[250px]">
            Enter your 4-digit PIN to decrypt and inspect{' '}
            <span className="font-semibold text-slate-700">{doc.name}</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={handleDigitChange}
              placeholder="••••"
              className="w-full text-center text-2xl tracking-[0.5em] font-mono py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-indigo-500 focus:bg-white transition"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-center gap-1.5 font-medium">
              <ShieldAlert className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            Unlock & View Document
          </button>

          <div className="text-center">
            <span className="text-[11px] text-slate-400 font-medium">
              Demo Vault PIN: <strong className="text-slate-600">1234</strong>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
