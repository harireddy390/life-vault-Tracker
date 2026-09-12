import React from 'react';
import {
  PiggyBank,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Home,
  Utensils,
  Car,
  Zap,
  Film,
  HeartPulse,
  Briefcase,
  TrendingUp,
  MoreHorizontal,
} from 'lucide-react';
import { formatCurrency } from './CashflowSummaryBar';
import { CATEGORY_COLORS, CATEGORY_LABELS } from './CashflowTrendChart';

const CATEGORY_ICONS = {
  Housing: Home,
  Food_Dining: Utensils,
  Transportation: Car,
  Utilities: Zap,
  Entertainment: Film,
  Health: HeartPulse,
  Salary: Briefcase,
  Investments: TrendingUp,
  Other: MoreHorizontal,
};

export default function BudgetDepletionGrid({ budgets = [], onSetBudget, onEditBudget, onDeleteBudget }) {
  return (
    <div className="fin-budget-section">
      <div className="fin-section-header">
        <div>
          <h3 className="fin-section-title">
            <PiggyBank size={18} color="#4f46e5" /> Budget Utilization & Depletion
          </h3>
          <p className="fin-section-sub">Monthly spending caps and threshold alarms</p>
        </div>
        <button className="fin-btn-ghost fin-btn-sm" onClick={onSetBudget}>
          <Plus size={14} /> Set Budget
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="fin-card-empty">
          <PiggyBank size={36} color="#4f46e5" opacity={0.4} />
          <p className="fin-empty-title">No monthly budgets configured</p>
          <p className="fin-empty-sub">
            Set category spending limits to proactively track and prevent overspending.
          </p>
          <button className="fin-btn-primary fin-btn-sm" onClick={onSetBudget}>
            + Create Category Budget
          </button>
        </div>
      ) : (
        <div className="fin-budget-grid">
          {budgets.map((b) => {
            const Icon = CATEGORY_ICONS[b.category] || MoreHorizontal;
            const categoryColor = CATEGORY_COLORS[b.category] || '#6366f1';
            const pct = b.utilization_percent || 0;
            const isOver = b.status === 'overbudget';
            const isCaution = b.status === 'caution';

            // Status badge color & text
            let statusBadge = {
              label: 'Surplus',
              bg: '#f0fdf4',
              color: '#15803d',
              border: '#bbf7d0',
              icon: CheckCircle2,
            };
            let barColor = categoryColor;

            if (isOver) {
              statusBadge = {
                label: `Over by ${formatCurrency(Math.abs(b.remaining_amount))}`,
                bg: '#fef2f2',
                color: '#b91c1c',
                border: '#fecaca',
                icon: AlertCircle,
              };
              barColor = '#ef4444';
            } else if (isCaution) {
              statusBadge = {
                label: 'Near 80% Cap',
                bg: '#fffbeb',
                color: '#b45309',
                border: '#fde68a',
                icon: AlertTriangle,
              };
              barColor = '#f59e0b';
            }

            const StatusIcon = statusBadge.icon;

            return (
              <div
                key={b._id}
                className={`fin-budget-card ${isOver ? 'overbudget' : isCaution ? 'caution' : ''}`}
                style={{ borderLeftColor: categoryColor }}
              >
                <div className="fin-budget-card-header">
                  <div className="fin-budget-cat-wrap">
                    <div
                      className="fin-budget-icon-circle"
                      style={{ background: `${categoryColor}15`, color: categoryColor }}
                    >
                      <Icon size={16} />
                    </div>
                    <div>
                      <h4 className="fin-budget-cat-title">
                        {CATEGORY_LABELS[b.category] || b.category}
                      </h4>
                      <span
                        className="fin-budget-status-pill"
                        style={{
                          background: statusBadge.bg,
                          color: statusBadge.color,
                          border: `1px solid ${statusBadge.border}`,
                        }}
                      >
                        <StatusIcon size={11} /> {statusBadge.label}
                      </span>
                    </div>
                  </div>

                  <div className="fin-budget-actions">
                    <button
                      className="fin-icon-btn"
                      onClick={() => onEditBudget(b)}
                      title="Edit budget allocation"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      className="fin-icon-btn danger"
                      onClick={() => onDeleteBudget(b)}
                      title="Remove budget"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Numbers */}
                <div className="fin-budget-figures">
                  <div>
                    <span className="fin-budget-metric-label">Spent</span>
                    <span className="fin-budget-metric-val spent tabular-nums">
                      {formatCurrency(b.spent_amount)}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="fin-budget-metric-label">Cap</span>
                    <span className="fin-budget-metric-val cap tabular-nums">
                      {formatCurrency(b.allocated_amount)}
                    </span>
                  </div>
                </div>

                {/* Real-time Depletion Progress Bar */}
                <div className="fin-budget-track">
                  <div
                    className={`fin-budget-fill ${isOver ? 'pulsing' : ''}`}
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      background: barColor,
                    }}
                  />
                </div>

                <div className="fin-budget-footer">
                  <span className="fin-budget-pct tabular-nums" style={{ color: barColor }}>
                    {pct}% utilized
                  </span>
                  <span className="fin-budget-rem tabular-nums">
                    {b.remaining_amount >= 0 ? (
                      <>{formatCurrency(b.remaining_amount)} available</>
                    ) : (
                      <span className="crimson">-{formatCurrency(Math.abs(b.remaining_amount))} over</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
