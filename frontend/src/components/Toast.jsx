const TOAST_ICONS = {
  success: '\u2713',
  error: '\u26A0',
  warning: '\u26A0',
  info: '\u2139',
};

export default function Toast({ message, type = 'success', onDismiss }) {
  if (!message) return null;

  return (
    <div className={`toast toast-${type}`} role="status" aria-live="polite">
      <span className="toast-icon" aria-hidden="true">{TOAST_ICONS[type] || TOAST_ICONS.success}</span>
      <span className="toast-message">{message}</span>
      {onDismiss && (
        <button className="toast-dismiss" onClick={onDismiss} aria-label="Dismiss">
          &times;
        </button>
      )}
    </div>
  );
}