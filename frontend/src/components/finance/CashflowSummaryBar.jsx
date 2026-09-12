import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ShieldCheck,
  Plus,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Repeat,
} from 'lucide-react';

export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

export default function CashflowSummaryBar({
  overview = {},
  selectedMonth,
  onChangeMonth,
  onAddTransaction,
  onSetBudget,
  onAddRecurring,
  onExportCsv,
}) {
  const {
    totalIncome = 0,
    totalExpenses = 0,
    netSavings = 0,
    savingsRate = 0,
    emergencyRunwayMonths = '0.0',
    cumulativeLiquid = 0,
  } = overview;

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    const str = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    onChangeMonth(str);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const next = new Date(y, m, 1);
    const str = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    onChangeMonth(str);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    const str = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    onChangeMonth(str);
  };

  const monthLabel = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const isNetPositive = netSavings >= 0;

  return (
    <div className="fin-summary-section">
      {/* Top Controls: Month Selector & Primary Action Controls */}
      <div className="fin-header-row">
        <div className="fin-month-selector">
          <button
            className="fin-month-btn"
            onClick={handlePrevMonth}
            title="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="fin-month-display">
            <Calendar size={15} color="#4f46e5" />
            <span className="fin-month-text">{monthLabel()}</span>
          </div>
          <button
            className="fin-month-btn"
            onClick={handleNextMonth}
            title="Next month"
          >
            <ChevronRight size={16} />
          </button>
          <button
            className="fin-btn-ghost fin-btn-sm"
            onClick={handleCurrentMonth}
            title="Jump to current month"
          >
            This Month
          </button>
        </div>

        <div className="fin-action-group">
          <button
            className="fin-btn-ghost fin-btn-sm"
            onClick={onExportCsv}
            title="Export transactions as CSV for tax and audits"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            className="fin-btn-ghost fin-btn-sm"
            onClick={onAddRecurring}
            title="Add recurring subscription or bill"
          >
            <Repeat size={14} /> + Bill
          </button>
          <button
            className="fin-btn-ghost fin-btn-sm"
            onClick={onSetBudget}
            title="Set category monthly budget cap"
          >
            <PiggyBank size={14} /> + Budget
          </button>
          <button
            className="fin-btn-primary fin-btn-sm"
            onClick={onAddTransaction}
            title="Record a new transaction"
          >
            <Plus size={15} /> Transaction
          </button>
        </div>
      </div>

      {/* 4 Financial Health Metric Cards */}
      <div className="fin-metrics-grid">
        {/* Metric 1: Cash Inflow */}
        <div className="fin-metric-card inflow">
          <div className="fin-metric-header">
            <span className="fin-metric-label">Cash Inflow</span>
            <div className="fin-metric-icon-wrap inflow">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="fin-metric-value tabular-nums">{formatCurrency(totalIncome)}</div>
          <div className="fin-metric-subtext emerald">Earned in {monthLabel()}</div>
        </div>

        {/* Metric 2: Cash Outflows */}
        <div className="fin-metric-card expense">
          <div className="fin-metric-header">
            <span className="fin-metric-label">Total Outflows</span>
            <div className="fin-metric-icon-wrap expense">
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="fin-metric-value tabular-nums">{formatCurrency(totalExpenses)}</div>
          <div className="fin-metric-subtext crimson">Spent across all categories</div>
        </div>

        {/* Metric 3: Net Cashflow & Savings Rate */}
        <div className={`fin-metric-card ${isNetPositive ? 'savings' : 'deficit'}`}>
          <div className="fin-metric-header">
            <span className="fin-metric-label">Net Savings ({savingsRate}%)</span>
            <div className={`fin-metric-icon-wrap ${isNetPositive ? 'savings' : 'deficit'}`}>
              <PiggyBank size={18} />
            </div>
          </div>
          <div className={`fin-metric-value tabular-nums ${isNetPositive ? 'emerald' : 'crimson'}`}>
            {isNetPositive ? '+' : ''}{formatCurrency(netSavings)}
          </div>
          <div className="fin-metric-subtext">
            {isNetPositive ? `${savingsRate}% of income saved` : 'Spending exceeded monthly income'}
          </div>
        </div>

        {/* Metric 4: Liquid Emergency Runway */}
        <div className="fin-metric-card runway">
          <div className="fin-metric-header">
            <span className="fin-metric-label">Emergency Runway</span>
            <div className="fin-metric-icon-wrap runway">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="fin-metric-value tabular-nums">
            {emergencyRunwayMonths} <span className="fin-unit">Months</span>
          </div>
          <div className="fin-metric-subtext">
            {formatCurrency(cumulativeLiquid)} liquid balance
          </div>
        </div>
      </div>
    </div>
  );
}
