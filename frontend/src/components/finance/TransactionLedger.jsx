import React, { useState } from 'react';
import {
  Search,
  X,
  FileText,
  Eye,
  Edit2,
  Trash2,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Plus,
} from 'lucide-react';
import { formatCurrency } from './CashflowSummaryBar';
import { CATEGORY_COLORS, CATEGORY_LABELS } from './CashflowTrendChart';

const TYPE_PILLS = [
  { id: 'All', label: 'All' },
  { id: 'income', label: 'Income' },
  { id: 'expense', label: 'Expenses' },
  { id: 'investment', label: 'Investments' },
];

export default function TransactionLedger({
  transactions = [],
  total = 0,
  page = 1,
  totalPages = 1,
  onPageChange,
  activeType = 'All',
  onTypeChange,
  activeCategory = 'All',
  onCategoryChange,
  activePaymentMethod = 'All',
  onPaymentMethodChange,
  searchQuery = '',
  onSearchChange,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onViewReceipt,
}) {
  return (
    <div className="fin-ledger-card">
      {/* Ledger Header & Filter Rail */}
      <div className="fin-ledger-header">
        <div className="fin-ledger-title-row">
          <div>
            <h3 className="fin-section-title">
              <Receipt size={18} color="#4f46e5" /> Transaction Ledger
            </h3>
            <p className="fin-section-sub">Searchable audit trail with attached receipts</p>
          </div>
          <button className="fin-btn-primary fin-btn-sm" onClick={onAddTransaction}>
            <Plus size={14} /> Add Transaction
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="fin-filter-bar">
          {/* Search Input */}
          <div className="fin-search-wrap">
            <Search size={15} className="fin-search-icon" />
            <input
              className="fin-search-input"
              placeholder="Search description, notes, category…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button className="fin-search-clear" onClick={() => onSearchChange('')}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* Type Switcher Pills */}
          <div className="fin-type-pills">
            {TYPE_PILLS.map((pill) => (
              <button
                key={pill.id}
                className={`fin-type-pill ${activeType === pill.id ? 'active' : ''}`}
                onClick={() => onTypeChange(pill.id)}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Category Dropdown Filter */}
          <select
            className="fin-select-filter"
            value={activeCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            <option value="All">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
              <option key={cat} value={cat}>
                {label}
              </option>
            ))}
          </select>

          {/* Payment Method Dropdown Filter */}
          <select
            className="fin-select-filter"
            value={activePaymentMethod}
            onChange={(e) => onPaymentMethodChange(e.target.value)}
          >
            <option value="All">All Payment Methods</option>
            <option value="UPI_BankTransfer">UPI / Bank Transfer</option>
            <option value="CreditCard">Credit Card</option>
            <option value="DebitCard">Debit Card</option>
            <option value="Cash">Cash</option>
            <option value="Crypto">Crypto</option>
          </select>
        </div>
      </div>

      {/* Ledger Table / Items */}
      {transactions.length === 0 ? (
        <div className="fin-card-empty">
          <Receipt size={36} color="#4f46e5" opacity={0.4} />
          <p className="fin-empty-title">No transactions found</p>
          <p className="fin-empty-sub">
            {searchQuery || activeType !== 'All' || activeCategory !== 'All'
              ? 'Try adjusting your search criteria or type filters.'
              : 'Record your first transaction using the button above.'}
          </p>
          {searchQuery && (
            <button
              className="fin-btn-ghost fin-btn-sm"
              onClick={() => {
                onSearchChange('');
                onTypeChange('All');
                onCategoryChange('All');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="fin-table-container">
          <table className="fin-table">
            <thead>
              <tr>
                <th style={{ width: 100 }}>Date</th>
                <th>Description</th>
                <th style={{ width: 140 }}>Category</th>
                <th style={{ width: 130 }}>Method</th>
                <th style={{ width: 130, textAlign: 'right' }}>Amount</th>
                <th style={{ width: 70, textAlign: 'center' }}>Receipt</th>
                <th style={{ width: 80, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const dateObj = new Date(tx.transaction_date);
                const dateStr = dateObj.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const catColor = CATEGORY_COLORS[tx.category] || '#64748b';

                const isIncome = tx.type === 'income';
                const isInvestment = tx.type === 'investment';

                return (
                  <tr key={tx._id} className="fin-table-row">
                    {/* Date */}
                    <td className="fin-cell-date tabular-nums">{dateStr}</td>

                    {/* Description & Notes */}
                    <td className="fin-cell-desc">
                      <div className="fin-desc-wrap">
                        <div className={`fin-type-icon ${tx.type}`}>
                          {isIncome ? (
                            <ArrowDownLeft size={13} />
                          ) : isInvestment ? (
                            <TrendingUp size={13} />
                          ) : (
                            <ArrowUpRight size={13} />
                          )}
                        </div>
                        <div>
                          <div className="fin-tx-title">{tx.title}</div>
                          {tx.notes && <div className="fin-tx-notes">{tx.notes}</div>}
                        </div>
                      </div>
                    </td>

                    {/* Category Pill */}
                    <td>
                      <span
                        className="fin-cat-badge"
                        style={{
                          background: `${catColor}15`,
                          color: catColor,
                          border: `1px solid ${catColor}33`,
                        }}
                      >
                        {CATEGORY_LABELS[tx.category] || tx.category}
                      </span>
                    </td>

                    {/* Payment Method */}
                    <td>
                      <span className="fin-pay-badge">
                        <CreditCard size={11} /> {tx.payment_method?.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Amount */}
                    <td
                      className={`fin-cell-amount tabular-nums ${
                        isIncome ? 'emerald' : isInvestment ? 'indigo' : 'crimson'
                      }`}
                    >
                      {isIncome ? '+' : isInvestment ? '✦ ' : '-'}
                      {formatCurrency(tx.amount)}
                    </td>

                    {/* Receipt Attachment Trigger */}
                    <td style={{ textAlign: 'center' }}>
                      {tx.receipt_url ? (
                        <button
                          className="fin-icon-btn"
                          onClick={() => onViewReceipt(tx)}
                          title={`View attached receipt: ${tx.receipt_name || 'Bill proof'}`}
                          style={{ color: '#4f46e5' }}
                        >
                          <Eye size={14} />
                        </button>
                      ) : (
                        <span className="fin-no-receipt">—</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td style={{ textAlign: 'right' }}>
                      <div className="fin-row-actions">
                        <button
                          className="fin-icon-btn"
                          onClick={() => onEditTransaction(tx)}
                          title="Edit transaction"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="fin-icon-btn danger"
                          onClick={() => onDeleteTransaction(tx)}
                          title="Delete transaction"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="fin-pagination">
          <span className="fin-pagination-info">
            Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total} transactions
          </span>
          <div className="fin-pagination-btns">
            <button
              className="fin-btn-ghost fin-btn-xs"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <span className="fin-page-current tabular-nums">
              Page {page} of {totalPages}
            </span>
            <button
              className="fin-btn-ghost fin-btn-xs"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
