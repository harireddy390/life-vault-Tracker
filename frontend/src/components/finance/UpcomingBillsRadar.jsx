import React from 'react';
import {
  Repeat,
  Plus,
  Calendar,
  CreditCard,
  Check,
  Edit2,
  Trash2,
  Zap,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency } from './CashflowSummaryBar';

export default function UpcomingBillsRadar({
  bills = [],
  onAddRecurring,
  onEditRecurring,
  onMarkPaid,
  onDeleteRecurring,
}) {
  return (
    <div className="fin-radar-section">
      <div className="fin-section-header">
        <div>
          <h3 className="fin-section-title">
            <Repeat size={18} color="#4f46e5" /> Subscriptions & Upcoming Bills
          </h3>
          <p className="fin-section-sub">Recurring commitments, renewal alerts & auto-pay tracking</p>
        </div>
        <button className="fin-btn-ghost fin-btn-sm" onClick={onAddRecurring}>
          <Plus size={14} /> Add Bill
        </button>
      </div>

      {bills.length === 0 ? (
        <div className="fin-card-empty">
          <Repeat size={36} color="#4f46e5" opacity={0.4} />
          <p className="fin-empty-title">No recurring bills tracked</p>
          <p className="fin-empty-sub">
            Add recurring subscriptions, rent, insurance, or cloud services to never miss a due date.
          </p>
          <button className="fin-btn-primary fin-btn-sm" onClick={onAddRecurring}>
            + Add Recurring Bill
          </button>
        </div>
      ) : (
        <div className="fin-bills-list">
          {bills.map((bill) => {
            const dueDate = new Date(bill.next_due_date);
            const dateFormatted = dueDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            // Urgency badge calculation
            let urgency = {
              label: `${bill.days_until_due}d left`,
              bg: '#f8fafc',
              color: '#64748b',
              border: '#e2e8f0',
              icon: Clock,
            };

            if (bill.is_overdue) {
              urgency = {
                label: `${Math.abs(bill.days_until_due)}d Overdue`,
                bg: '#fef2f2',
                color: '#b91c1c',
                border: '#fecaca',
                icon: AlertCircle,
              };
            } else if (bill.days_until_due === 0) {
              urgency = {
                label: 'Due Today!',
                bg: '#fff7ed',
                color: '#ea580c',
                border: '#ffedd5',
                icon: AlertCircle,
              };
            } else if (bill.is_due_soon) {
              urgency = {
                label: `Due in ${bill.days_until_due} days`,
                bg: '#fffbeb',
                color: '#b45309',
                border: '#fde68a',
                icon: Clock,
              };
            }

            const UrgencyIcon = urgency.icon;

            return (
              <div
                key={bill._id}
                className={`fin-bill-item ${bill.is_overdue ? 'overdue' : bill.is_due_soon ? 'due-soon' : ''}`}
              >
                {/* Left: Info */}
                <div className="fin-bill-left">
                  <div className="fin-bill-icon-wrap">
                    <Repeat size={16} color="#4f46e5" />
                  </div>
                  <div className="fin-bill-details">
                    <div className="fin-bill-title-row">
                      <h4 className="fin-bill-title">{bill.title}</h4>
                      <span className="fin-bill-cycle-chip">{bill.billing_cycle}</span>
                      {bill.auto_pay && (
                        <span className="fin-bill-autopay-chip" title="Auto-Pay enabled">
                          <Zap size={10} /> Auto-Pay
                        </span>
                      )}
                    </div>
                    <div className="fin-bill-meta-row">
                      <span className="fin-bill-date">
                        <Calendar size={12} /> {dateFormatted}
                      </span>
                      <span
                        className="fin-bill-urgency-pill"
                        style={{
                          background: urgency.bg,
                          color: urgency.color,
                          border: `1px solid ${urgency.border}`,
                        }}
                      >
                        <UrgencyIcon size={11} /> {urgency.label}
                      </span>
                      <span className="fin-bill-payment-method">
                        <CreditCard size={12} /> {bill.payment_method?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Amount and Actions */}
                <div className="fin-bill-right">
                  <div className="fin-bill-amount tabular-nums">
                    {formatCurrency(bill.amount)}
                  </div>
                  <div className="fin-bill-actions">
                    <button
                      className="fin-btn-primary fin-btn-xs"
                      onClick={() => onMarkPaid(bill._id)}
                      title="Mark as paid and advance due date to next cycle"
                    >
                      <Check size={12} /> Mark Paid
                    </button>
                    <button
                      className="fin-icon-btn"
                      onClick={() => onEditRecurring(bill)}
                      title="Edit bill"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      className="fin-icon-btn danger"
                      onClick={() => onDeleteRecurring(bill)}
                      title="Remove bill"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
