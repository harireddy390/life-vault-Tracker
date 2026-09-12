import React, { useState } from 'react';
import { BarChart3, PieChart, Info } from 'lucide-react';
import { formatCurrency } from './CashflowSummaryBar';

export const CATEGORY_COLORS = {
  Housing: '#6366f1', // Indigo
  Food_Dining: '#f59e0b', // Amber
  Transportation: '#06b6d4', // Cyan
  Utilities: '#3b82f6', // Blue
  Entertainment: '#ec4899', // Pink
  Health: '#10b981', // Emerald
  Salary: '#14b8a6', // Teal
  Investments: '#8b5cf6', // Violet
  Other: '#64748b', // Slate
};

export const CATEGORY_LABELS = {
  Housing: 'Housing & Rent',
  Food_Dining: 'Food & Dining',
  Transportation: 'Transport & Fuel',
  Utilities: 'Bills & Utilities',
  Entertainment: 'Entertainment',
  Health: 'Health & Medical',
  Salary: 'Salary & Income',
  Investments: 'Investments',
  Other: 'Other Expenses',
};

export default function CashflowTrendChart({ dailyTrend = [], categoryBreakdown = [], totalExpenses = 0 }) {
  const [hoveredDay, setHoveredDay] = useState(null);

  // Compute max daily value for SVG bar scaling
  const maxDayAmount = Math.max(
    ...dailyTrend.map((d) => Math.max(d.income || 0, d.expense || 0)),
    1000
  );

  const hasData = dailyTrend.some((d) => d.income > 0 || d.expense > 0);

  return (
    <div className="fin-chart-card">
      <div className="fin-chart-header">
        <div className="fin-chart-title-wrap">
          <BarChart3 size={17} color="#4f46e5" />
          <h3 className="fin-chart-title">Daily Cashflow Trend</h3>
        </div>
        <div className="fin-chart-legend">
          <span className="fin-legend-item">
            <span className="fin-legend-dot emerald" /> Inflow
          </span>
          <span className="fin-legend-item">
            <span className="fin-legend-dot crimson" /> Outflow
          </span>
        </div>
      </div>

      {/* SVG Interactive Daily Bar Graph */}
      <div className="fin-chart-body">
        {hasData ? (
          <div className="fin-svg-wrap">
            <svg
              className="fin-daily-svg"
              viewBox={`0 0 ${dailyTrend.length * 28 + 20} 140`}
              preserveAspectRatio="none"
            >
              {/* Baseline axis */}
              <line
                x1="0"
                y1="110"
                x2={dailyTrend.length * 28 + 20}
                y2="110"
                stroke="#e2e8f0"
                strokeWidth="1"
              />

              {dailyTrend.map((dayData, idx) => {
                const x = idx * 28 + 14;
                const incomeH = Math.min(100, ((dayData.income || 0) / maxDayAmount) * 100);
                const expenseH = Math.min(100, ((dayData.expense || 0) / maxDayAmount) * 100);

                const isHovered = hoveredDay === dayData.day;

                return (
                  <g
                    key={dayData.day}
                    onMouseEnter={() => setHoveredDay(dayData.day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Hover highlight background column */}
                    {isHovered && (
                      <rect
                        x={x - 3}
                        y="5"
                        width="24"
                        height="115"
                        fill="rgba(79, 70, 229, 0.06)"
                        rx="4"
                      />
                    )}

                    {/* Inflow Bar (Green) */}
                    {incomeH > 0 && (
                      <rect
                        x={x}
                        y={110 - incomeH}
                        width="8"
                        height={incomeH}
                        fill="#10b981"
                        rx="2"
                      />
                    )}

                    {/* Expense Bar (Red) */}
                    {expenseH > 0 && (
                      <rect
                        x={x + 9}
                        y={110 - expenseH}
                        width="8"
                        height={expenseH}
                        fill="#ef4444"
                        rx="2"
                      />
                    )}

                    {/* Day number on X axis */}
                    {(dayData.day === 1 || dayData.day % 5 === 0 || dayData.day === dailyTrend.length) && (
                      <text
                        x={x + 8}
                        y="126"
                        textAnchor="middle"
                        fontSize="9"
                        fill="#94a3b8"
                        fontFamily="inherit"
                      >
                        {dayData.day}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip display */}
            {hoveredDay != null && (
              <div className="fin-chart-tooltip">
                {(() => {
                  const item = dailyTrend.find((d) => d.day === hoveredDay) || {};
                  return (
                    <>
                      <div className="fin-tooltip-day">Day {hoveredDay}</div>
                      <div className="fin-tooltip-row emerald">
                        <span>Inflow:</span> <span>+{formatCurrency(item.income || 0)}</span>
                      </div>
                      <div className="fin-tooltip-row crimson">
                        <span>Outflow:</span> <span>-{formatCurrency(item.expense || 0)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        ) : (
          <div className="fin-chart-empty">
            <BarChart3 size={32} color="#cbd5e1" />
            <p>No transactions recorded for this month yet.</p>
          </div>
        )}
      </div>

      {/* Category Spending Breakdown Bar */}
      {categoryBreakdown.length > 0 && (
        <div className="fin-category-distribution">
          <div className="fin-dist-header">
            <span className="fin-dist-title">
              <PieChart size={13} color="#4f46e5" /> Category Spending Distribution
            </span>
            <span className="fin-dist-total">Total Outflows: {formatCurrency(totalExpenses)}</span>
          </div>

          {/* Stacked Percentage Bar */}
          <div className="fin-stacked-bar">
            {categoryBreakdown.map((item) => {
              const color = CATEGORY_COLORS[item.category] || '#64748b';
              return (
                <div
                  key={item.category}
                  className="fin-stacked-segment"
                  style={{
                    width: `${item.percentage}%`,
                    background: color,
                  }}
                  title={`${CATEGORY_LABELS[item.category] || item.category}: ${formatCurrency(item.amount)} (${item.percentage}%)`}
                />
              );
            })}
          </div>

          {/* Category Chips Legend */}
          <div className="fin-dist-chips">
            {categoryBreakdown.map((item) => {
              const color = CATEGORY_COLORS[item.category] || '#64748b';
              return (
                <div key={item.category} className="fin-dist-chip">
                  <span className="fin-dist-dot" style={{ background: color }} />
                  <span className="fin-dist-name">{CATEGORY_LABELS[item.category] || item.category}</span>
                  <span className="fin-dist-amt tabular-nums">{formatCurrency(item.amount)}</span>
                  <span className="fin-dist-pct">({item.percentage}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
