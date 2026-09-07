import React, { useEffect, useRef } from 'react';
import { X, AlertTriangle, Shield, UploadCloud, FileText, CheckCircle2 } from 'lucide-react';

/**
 * Enterprise-grade accessible modal container with status type variants:
 * - 'standard': Indigo / Slate palette
 * - 'create': Primary Brand Indigo
 * - 'destructive': Crimson / Rose warning palette
 * - 'security': Cobalt / Slate security palette
 */
export default function VaultModal({
  isOpen,
  onClose,
  title,
  subtitle,
  type = 'standard', // 'standard' | 'create' | 'destructive' | 'security'
  icon: CustomIcon,
  maxWidth = 'max-w-lg',
  children,
  footer,
}) {
  const modalRef = useRef(null);

  // Keyboard accessibility: Escape key and Focus management
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Auto-focus first focusable element inside modal
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements && focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Lock background scrolling
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Type styling configurations
  const getTypeStyles = () => {
    switch (type) {
      case 'destructive':
        return {
          badgeBg: 'bg-rose-50 text-rose-600 border border-rose-200/90',
          icon: CustomIcon || AlertTriangle,
          headerBorder: 'border-rose-100',
        };
      case 'security':
        return {
          badgeBg: 'bg-slate-900 text-indigo-400 border border-slate-800',
          icon: CustomIcon || Shield,
          headerBorder: 'border-slate-100',
        };
      case 'create':
        return {
          badgeBg: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
          icon: CustomIcon || UploadCloud,
          headerBorder: 'border-slate-100',
        };
      default:
        return {
          badgeBg: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
          icon: CustomIcon || FileText,
          headerBorder: 'border-slate-100',
        };
    }
  };

  const { badgeBg, icon: IconComponent, headerBorder } = getTypeStyles();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-md overflow-y-auto animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="vault-modal-title"
    >
      <div
        ref={modalRef}
        className={`w-full ${maxWidth} max-h-[88vh] bg-white rounded-[20px] shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col transition-all duration-200 ease-out transform scale-100 relative`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between p-5 sm:p-6 border-b ${headerBorder} bg-white shrink-0`}>
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${badgeBg}`}>
              <IconComponent className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="vault-modal-title" className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition shrink-0 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Consistent 24px / 1.5rem padding) */}
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[75vh] flex-1">
          {children}
        </div>

        {/* Modal Footer (Right-aligned action buttons) */}
        {footer && (
          <div className="p-4 sm:px-6 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
