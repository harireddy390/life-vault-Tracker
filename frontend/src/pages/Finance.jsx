import React, { useState, useEffect, useCallback } from 'react';
import Toast from '../components/Toast';
import CashflowSummaryBar from '../components/finance/CashflowSummaryBar';
import CashflowTrendChart from '../components/finance/CashflowTrendChart';
import BudgetDepletionGrid from '../components/finance/BudgetDepletionGrid';
import UpcomingBillsRadar from '../components/finance/UpcomingBillsRadar';
import TransactionLedger from '../components/finance/TransactionLedger';
import TransactionModal from '../components/finance/TransactionModal';
import BudgetModal from '../components/finance/BudgetModal';
import RecurringBillModal from '../components/finance/RecurringBillModal';
import ReceiptPreviewModal from '../components/finance/ReceiptPreviewModal';
import FinanceDeleteModal from '../components/finance/FinanceDeleteModal';
import fs from '../services/financeService';
import './Finance.css';

export default function Finance() {
  const currentMonthStr = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  // ── Month & Filter State ──
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeType, setActiveType] = useState('All');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activePaymentMethod, setActivePaymentMethod] = useState('All');
  const [page, setPage] = useState(1);

  // ── Data State ──
  const [overview, setOverview] = useState({});
  const [transactionsData, setTransactionsData] = useState({ transactions: [], total: 0, totalPages: 1 });
  const [budgets, setBudgets] = useState([]);
  const [recurringBills, setRecurringBills] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Toast Feedback ──
  const [toast, setToast] = useState(null);

  // ── Modal State ──
  const [txModal, setTxModal] = useState(null); // null | 'create' | transactionObj
  const [budgetModal, setBudgetModal] = useState(null); // null | { category, amount, month }
  const [recurringModal, setRecurringModal] = useState(null); // null | 'create' | billObj
  const [receiptModal, setReceiptModal] = useState(null); // null | transactionObj
  const [deleteModal, setDeleteModal] = useState(null); // null | { type, item, title, description }

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Load All Data ──────────────────────────────────────────────────────────
  const loadOverviewAndBudgets = useCallback(async () => {
    try {
      const [ov, b, rb] = await Promise.all([
        fs.getOverview(selectedMonth).catch(() => ({})),
        fs.getBudgets(selectedMonth).catch(() => []),
        fs.getRecurringBills().catch(() => []),
      ]);
      setOverview(ov);
      setBudgets(b);
      setRecurringBills(rb);
    } catch {
      showToast('Could not load financial overview.', 'error');
    }
  }, [selectedMonth]);

  const loadTransactions = useCallback(async () => {
    try {
      const data = await fs.getTransactions({
        page,
        limit: 50,
        type: activeType,
        category: activeCategory,
        payment_method: activePaymentMethod,
        search: debouncedSearch,
        startDate: `${selectedMonth}-01`,
        endDate: (() => {
          const [y, m] = selectedMonth.split('-').map(Number);
          const endDay = new Date(y, m, 0).getDate();
          return `${selectedMonth}-${endDay}`;
        })(),
      });
      setTransactionsData(data);
    } catch {
      showToast('Could not load transaction ledger.', 'error');
    }
  }, [selectedMonth, page, activeType, activeCategory, activePaymentMethod, debouncedSearch]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadOverviewAndBudgets(), loadTransactions()]);
    setLoading(false);
  }, [loadOverviewAndBudgets, loadTransactions]);

  useEffect(() => {
    loadAll();
  }, [selectedMonth, loadAll]);

  useEffect(() => {
    loadTransactions();
  }, [page, activeType, activeCategory, activePaymentMethod, debouncedSearch, loadTransactions]);

  // ── Handlers: Transactions ──────────────────────────────────────────────────
  const handleSaveTransaction = async (formDataOrJson, id) => {
    try {
      if (id) {
        await fs.updateTransaction(id, formDataOrJson);
        showToast('Transaction updated ✓');
      } else {
        await fs.createTransaction(formDataOrJson);
        showToast('Transaction recorded ✓');
      }
      setTxModal(null);
      await Promise.all([loadOverviewAndBudgets(), loadTransactions()]);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to save transaction.', 'error');
    }
  };

  const handleDeleteTransaction = async (tx) => {
    try {
      await fs.deleteTransaction(tx._id);
      showToast('Transaction deleted.');
      setDeleteModal(null);
      await Promise.all([loadOverviewAndBudgets(), loadTransactions()]);
    } catch {
      showToast('Delete failed.', 'error');
    }
  };

  // ── Handlers: Budgets ───────────────────────────────────────────────────────
  const handleSaveBudget = async (data) => {
    try {
      await fs.setBudget(data);
      showToast('Budget allocation updated ✓');
      setBudgetModal(null);
      await loadOverviewAndBudgets();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to set budget.', 'error');
    }
  };

  const handleDeleteBudget = async (b) => {
    try {
      await fs.deleteBudget(b._id);
      showToast('Budget removed.');
      setDeleteModal(null);
      await loadOverviewAndBudgets();
    } catch {
      showToast('Could not remove budget.', 'error');
    }
  };

  // ── Handlers: Recurring Bills ──────────────────────────────────────────────
  const handleSaveRecurring = async (data, id) => {
    try {
      if (id) {
        await fs.updateRecurringBill(id, data);
        showToast('Recurring bill updated ✓');
      } else {
        await fs.createRecurringBill(data);
        showToast('Recurring bill added ✓');
      }
      setRecurringModal(null);
      await loadOverviewAndBudgets();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to save recurring bill.', 'error');
    }
  };

  const handleMarkPaid = async (id) => {
    try {
      await fs.markRecurringBillPaid(id);
      showToast('Bill marked as paid! Due date advanced ✓');
      await Promise.all([loadOverviewAndBudgets(), loadTransactions()]);
    } catch {
      showToast('Could not update bill payment status.', 'error');
    }
  };

  const handleDeleteRecurring = async (bill) => {
    try {
      await fs.deleteRecurringBill(bill._id);
      showToast('Recurring bill removed.');
      setDeleteModal(null);
      await loadOverviewAndBudgets();
    } catch {
      showToast('Could not remove bill.', 'error');
    }
  };

  // ── Handlers: CSV Export ────────────────────────────────────────────────────
  const handleExportCsv = async () => {
    try {
      showToast('Generating CSV export…');
      await fs.exportCsv(selectedMonth, activeType);
      showToast('CSV downloaded ✓');
    } catch {
      showToast('Failed to export CSV.', 'error');
    }
  };

  // Confirm delete dispatch
  const handleConfirmDelete = async () => {
    if (!deleteModal) return;
    if (deleteModal.type === 'tx') await handleDeleteTransaction(deleteModal.item);
    else if (deleteModal.type === 'budget') await handleDeleteBudget(deleteModal.item);
    else if (deleteModal.type === 'recurring') await handleDeleteRecurring(deleteModal.item);
  };

  if (loading && !overview.selectedMonth) {
    return (
      <div className="fin-page fin-loading">
        <div className="fin-spinner" />
        <p>Loading Finance & Wealth Command Center…</p>
      </div>
    );
  }

  return (
    <div className="fin-page">
      <Toast message={toast?.message} type={toast?.type} />

      {/* ════════════════════════════════════════════════════════════════
          ZONE 1: CASHFLOW & METRIC SUMMARY BAR
      ════════════════════════════════════════════════════════════════ */}
      <CashflowSummaryBar
        overview={overview}
        selectedMonth={selectedMonth}
        onChangeMonth={setSelectedMonth}
        onAddTransaction={() => setTxModal('create')}
        onSetBudget={() => setBudgetModal({ month: selectedMonth })}
        onAddRecurring={() => setRecurringModal('create')}
        onExportCsv={handleExportCsv}
      />

      {/* ════════════════════════════════════════════════════════════════
          ZONE 2: DAILY CASHFLOW TREND & CATEGORY DISTRIBUTION
      ════════════════════════════════════════════════════════════════ */}
      <CashflowTrendChart
        dailyTrend={overview.dailyTrend || []}
        categoryBreakdown={overview.categoryBreakdown || []}
        totalExpenses={overview.totalExpenses || 0}
      />

      {/* ════════════════════════════════════════════════════════════════
          ZONE 3 & 4: DUAL RADAR GRID (BUDGET DEPLETION & UPCOMING BILLS)
      ════════════════════════════════════════════════════════════════ */}
      <div className="fin-middle-grid">
        {/* Left: Category Budget Depletion Progress */}
        <BudgetDepletionGrid
          budgets={budgets}
          onSetBudget={() => setBudgetModal({ month: selectedMonth })}
          onEditBudget={(b) => setBudgetModal({ category: b.category, amount: b.allocated_amount, month: b.month_year })}
          onDeleteBudget={(b) =>
            setDeleteModal({
              type: 'budget',
              item: b,
              title: 'Remove Budget Allocation?',
              description: `Are you sure you want to remove the monthly spending limit for ${b.category}?`,
            })
          }
        />

        {/* Right: Subscriptions & Upcoming Bills Radar */}
        <UpcomingBillsRadar
          bills={recurringBills}
          onAddRecurring={() => setRecurringModal('create')}
          onEditRecurring={(bill) => setRecurringModal(bill)}
          onMarkPaid={handleMarkPaid}
          onDeleteRecurring={(bill) =>
            setDeleteModal({
              type: 'recurring',
              item: bill,
              title: 'Cancel Recurring Bill Reminder?',
              description: `Are you sure you want to stop tracking "${bill.title}"?`,
            })
          }
        />
      </div>

      {/* ════════════════════════════════════════════════════════════════
          ZONE 5: INTERACTIVE TRANSACTION LEDGER
      ════════════════════════════════════════════════════════════════ */}
      <TransactionLedger
        transactions={transactionsData.transactions}
        total={transactionsData.total}
        page={transactionsData.page}
        totalPages={transactionsData.totalPages}
        onPageChange={setPage}
        activeType={activeType}
        onTypeChange={(t) => { setActiveType(t); setPage(1); }}
        activeCategory={activeCategory}
        onCategoryChange={(c) => { setActiveCategory(c); setPage(1); }}
        activePaymentMethod={activePaymentMethod}
        onPaymentMethodChange={(m) => { setActivePaymentMethod(m); setPage(1); }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddTransaction={() => setTxModal('create')}
        onEditTransaction={(tx) => setTxModal(tx)}
        onDeleteTransaction={(tx) =>
          setDeleteModal({
            type: 'tx',
            item: tx,
            title: 'Delete Transaction?',
            description: `"${tx.title}" (${tx.type}) will be permanently deleted and your budget re-calculated.`,
          })
        }
        onViewReceipt={(tx) => setReceiptModal(tx)}
      />

      {/* ════════════════════════════════════════════════════════════════
          IN-CONTEXT MODALS (STRICTLY ZERO PAGE REDIRECTS)
      ════════════════════════════════════════════════════════════════ */}
      {txModal && (
        <TransactionModal
          transaction={txModal === 'create' ? null : txModal}
          onSave={handleSaveTransaction}
          onClose={() => setTxModal(null)}
        />
      )}

      {budgetModal && (
        <BudgetModal
          initialCategory={budgetModal.category}
          initialAmount={budgetModal.amount}
          currentMonth={budgetModal.month || selectedMonth}
          onSave={handleSaveBudget}
          onClose={() => setBudgetModal(null)}
        />
      )}

      {recurringModal && (
        <RecurringBillModal
          bill={recurringModal === 'create' ? null : recurringModal}
          onSave={handleSaveRecurring}
          onClose={() => setRecurringModal(null)}
        />
      )}

      {receiptModal && (
        <ReceiptPreviewModal
          transaction={receiptModal}
          onClose={() => setReceiptModal(null)}
        />
      )}

      {deleteModal && (
        <FinanceDeleteModal
          title={deleteModal.title}
          description={deleteModal.description}
          onConfirm={handleConfirmDelete}
          onClose={() => setDeleteModal(null)}
        />
      )}
    </div>
  );
}
