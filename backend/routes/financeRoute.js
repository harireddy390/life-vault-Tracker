const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/authMiddleware');

const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const RecurringBill = require('../models/RecurringBill');
const LegacyExpense = require('../models/expenses');

// ─── Multer Setup for Receipt Uploads ──────────────────────────────────────────
const uploadDir = path.join(__dirname, '../uploads/finance');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 52428800 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext) || file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      return cb(null, true);
    }
    cb(new Error('Only PDF and image files (PNG, JPG, JPEG, WEBP) are allowed'));
  },
});

// Helper for ownership check
function ownerCheck(doc, userId, res) {
  if (!doc) {
    res.status(404).json({ message: 'Record not found' });
    return false;
  }
  if (doc.user.toString() !== userId) {
    res.status(401).json({ message: 'Not authorized to access this record' });
    return false;
  }
  return true;
}

// ─── GET /api/finance/overview?month=YYYY-MM ──────────────────────────────────
router.get('/overview', protect, async (req, res) => {
  try {
    const uid = req.user.id;
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const selectedMonth = req.query.month || currentMonthStr;

    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // 1. Current Month Transactions
    const monthTransactions = await Transaction.find({
      user: uid,
      transaction_date: { $gte: startDate, $lte: endDate },
    }).sort({ transaction_date: 1 });

    let totalIncome = 0;
    let totalExpenses = 0;
    let totalInvestments = 0;
    const categoryTotals = {};

    monthTransactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'income') {
        totalIncome += amt;
      } else if (tx.type === 'expense') {
        totalExpenses += amt;
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + amt;
      } else if (tx.type === 'investment') {
        totalInvestments += amt;
      }
    });

    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

    // 2. Daily Cash Flow Trend for Chart
    const daysInMonth = endDate.getDate();
    const dailyMap = {};
    for (let d = 1; d <= daysInMonth; d++) {
      dailyMap[d] = { day: d, income: 0, expense: 0, investment: 0 };
    }

    monthTransactions.forEach((tx) => {
      const dayNum = new Date(tx.transaction_date).getDate();
      if (dailyMap[dayNum]) {
        if (tx.type === 'income') dailyMap[dayNum].income += tx.amount;
        else if (tx.type === 'expense') dailyMap[dayNum].expense += tx.amount;
        else if (tx.type === 'investment') dailyMap[dayNum].investment += tx.amount;
      }
    });

    const dailyTrend = Object.values(dailyMap);

    // 3. Category Breakdown with percentages
    const categoryBreakdown = Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount);

    // 4. Historical Emergency Runway Calculation
    const allUserTx = await Transaction.find({ user: uid });
    let cumulativeLiquid = 0;
    const monthlyBurnMap = {};

    allUserTx.forEach((tx) => {
      const d = new Date(tx.transaction_date);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (tx.type === 'income') {
        cumulativeLiquid += tx.amount;
      } else if (tx.type === 'expense') {
        cumulativeLiquid -= tx.amount;
        monthlyBurnMap[mKey] = (monthlyBurnMap[mKey] || 0) + tx.amount;
      } else if (tx.type === 'investment') {
        cumulativeLiquid -= tx.amount;
      }
    });

    const burnMonths = Object.values(monthlyBurnMap);
    const avgMonthlyBurn = burnMonths.length > 0
      ? burnMonths.reduce((a, b) => a + b, 0) / burnMonths.length
      : totalExpenses || 1;

    let emergencyRunwayMonths = '0.0';
    if (cumulativeLiquid > 0 && avgMonthlyBurn > 0) {
      emergencyRunwayMonths = (cumulativeLiquid / avgMonthlyBurn).toFixed(1);
    } else if (cumulativeLiquid > 0 && avgMonthlyBurn === 0) {
      emergencyRunwayMonths = '12.0+';
    }

    // 5. Active Upcoming Bills Summary
    const upcomingBillsCount = await RecurringBill.countDocuments({
      user: uid,
      status: 'active',
    });

    res.json({
      selectedMonth,
      totalIncome,
      totalExpenses,
      totalInvestments,
      netSavings,
      savingsRate,
      cumulativeLiquid: Math.max(0, cumulativeLiquid),
      avgMonthlyBurn: Math.round(avgMonthlyBurn),
      emergencyRunwayMonths,
      categoryBreakdown,
      dailyTrend,
      transactionCount: monthTransactions.length,
      upcomingBillsCount,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/finance/transactions ───────────────────────────────────────────
router.get('/transactions', protect, async (req, res) => {
  try {
    const uid = req.user.id;
    const {
      type,
      category,
      payment_method,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50,
      sortBy = 'newest',
    } = req.query;

    const query = { user: uid };

    if (type && type !== 'All') query.type = type.toLowerCase();
    if (category && category !== 'All') query.category = category;
    if (payment_method && payment_method !== 'All') query.payment_method = payment_method;

    if (startDate || endDate) {
      query.transaction_date = {};
      if (startDate) query.transaction_date.$gte = new Date(startDate);
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.transaction_date.$lte = e;
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { notes: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
      ];
    }

    const sortOptions = {};
    if (sortBy === 'oldest') sortOptions.transaction_date = 1;
    else if (sortBy === 'highest') sortOptions.amount = -1;
    else if (sortBy === 'lowest') sortOptions.amount = 1;
    else sortOptions.transaction_date = -1;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      Transaction.find(query).sort(sortOptions).skip(skip).limit(limitNum),
      Transaction.countDocuments(query),
    ]);

    res.json({
      transactions,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/finance/transactions ──────────────────────────────────────────
router.post('/transactions', protect, upload.single('receipt'), async (req, res) => {
  try {
    const { title, amount, type, category, payment_method, transaction_date, notes } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });
    if (amount == null || isNaN(amount) || Number(amount) < 0) {
      return res.status(400).json({ message: 'A valid non-negative amount is required' });
    }

    let receipt_url = null;
    let receipt_name = null;
    let receipt_size_bytes = null;

    if (req.file) {
      receipt_url = `/uploads/finance/${req.file.filename}`;
      receipt_name = req.file.originalname;
      receipt_size_bytes = req.file.size;
    }

    const transaction = await Transaction.create({
      user: req.user.id,
      title: title.trim(),
      amount: Number(amount),
      type: type || 'expense',
      category: category || 'Other',
      payment_method: payment_method || 'UPI_BankTransfer',
      transaction_date: transaction_date ? new Date(transaction_date) : new Date(),
      notes: notes ? notes.trim() : '',
      receipt_url,
      receipt_name,
      receipt_size_bytes,
    });

    // Mirror to legacy Expense model for dashboard/LifeAI compatibility
    try {
      await LegacyExpense.create({
        user: req.user.id,
        title: title.trim(),
        amount: Number(amount),
        category: (category || 'other').toLowerCase(),
        type: type === 'income' ? 'income' : 'expense',
        date: transaction.transaction_date,
      });
    } catch {
      // Non-critical mirror
    }

    res.status(201).json(transaction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/finance/transactions/:id ───────────────────────────────────────
router.put('/transactions/:id', protect, upload.single('receipt'), async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!ownerCheck(transaction, req.user.id, res)) return;

    const { title, amount, type, category, payment_method, transaction_date, notes } = req.body;

    if (title !== undefined) transaction.title = title.trim();
    if (amount !== undefined) transaction.amount = Number(amount);
    if (type !== undefined) transaction.type = type;
    if (category !== undefined) transaction.category = category;
    if (payment_method !== undefined) transaction.payment_method = payment_method;
    if (transaction_date !== undefined) transaction.transaction_date = new Date(transaction_date);
    if (notes !== undefined) transaction.notes = notes.trim();

    if (req.file) {
      // Remove old file if present
      if (transaction.receipt_url) {
        const oldFile = path.join(__dirname, '..', transaction.receipt_url.replace(/^[/\\]+/, ''));
        if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
      }
      transaction.receipt_url = `/uploads/finance/${req.file.filename}`;
      transaction.receipt_name = req.file.originalname;
      transaction.receipt_size_bytes = req.file.size;
    }

    await transaction.save();
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE /api/finance/transactions/:id ────────────────────────────────────
router.delete('/transactions/:id', protect, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!ownerCheck(transaction, req.user.id, res)) return;

    // Unlink receipt file if present
    if (transaction.receipt_url) {
      const filePath = path.join(__dirname, '..', transaction.receipt_url.replace(/^[/\\]+/, ''));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await transaction.deleteOne();
    res.json({ id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/finance/budgets?month=YYYY-MM ──────────────────────────────────
router.get('/budgets', protect, async (req, res) => {
  try {
    const uid = req.user.id;
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const selectedMonth = req.query.month || currentMonthStr;

    const [yearStr, monthStr] = selectedMonth.split('-');
    const startDate = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
    const endDate = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0, 23, 59, 59, 999);

    // Fetch allocated budgets for the month
    const budgets = await Budget.find({ user: uid, month_year: selectedMonth });

    // Fetch expenses for the month to calculate actual usage
    const expenses = await Transaction.find({
      user: uid,
      type: 'expense',
      transaction_date: { $gte: startDate, $lte: endDate },
    });

    const spentMap = {};
    expenses.forEach((e) => {
      spentMap[e.category] = (spentMap[e.category] || 0) + e.amount;
    });

    const results = budgets.map((b) => {
      const spent = spentMap[b.category] || 0;
      const allocated = b.allocated_amount;
      const remaining = allocated - spent;
      const percentage = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

      let status = 'surplus'; // < 70%
      if (percentage >= 100) status = 'overbudget';
      else if (percentage >= 70) status = 'caution';

      return {
        _id: b._id,
        category: b.category,
        allocated_amount: allocated,
        spent_amount: spent,
        remaining_amount: remaining,
        utilization_percent: percentage,
        status,
        month_year: b.month_year,
      };
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/finance/budgets ────────────────────────────────────────────────
router.post('/budgets', protect, async (req, res) => {
  try {
    const { category, allocated_amount, month_year } = req.body;
    if (!category) return res.status(400).json({ message: 'Category is required' });
    if (allocated_amount == null || isNaN(allocated_amount) || Number(allocated_amount) < 0) {
      return res.status(400).json({ message: 'A valid allocation amount is required' });
    }

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const targetMonth = month_year || currentMonthStr;

    // Upsert budget
    const budget = await Budget.findOneAndUpdate(
      { user: req.user.id, category, month_year: targetMonth },
      { allocated_amount: Number(allocated_amount) },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json(budget);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE /api/finance/budgets/:id ─────────────────────────────────────────
router.delete('/budgets/:id', protect, async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);
    if (!ownerCheck(budget, req.user.id, res)) return;
    await budget.deleteOne();
    res.json({ id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/finance/recurring ──────────────────────────────────────────────
router.get('/recurring', protect, async (req, res) => {
  try {
    const bills = await RecurringBill.find({ user: req.user.id }).sort({ next_due_date: 1 });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const decorated = bills.map((b) => {
      const dueDate = new Date(b.next_due_date);
      dueDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

      return {
        ...b.toObject(),
        days_until_due: diffDays,
        is_overdue: diffDays < 0,
        is_due_soon: diffDays >= 0 && diffDays <= 5,
      };
    });

    res.json(decorated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/finance/recurring ─────────────────────────────────────────────
router.post('/recurring', protect, async (req, res) => {
  try {
    const { title, amount, category, billing_cycle, next_due_date, payment_method, auto_pay, notes } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });
    if (amount == null || isNaN(amount) || Number(amount) < 0) {
      return res.status(400).json({ message: 'A valid amount is required' });
    }
    if (!next_due_date) return res.status(400).json({ message: 'Next due date is required' });

    const bill = await RecurringBill.create({
      user: req.user.id,
      title: title.trim(),
      amount: Number(amount),
      category: category || 'Utilities',
      billing_cycle: billing_cycle || 'monthly',
      next_due_date: new Date(next_due_date),
      payment_method: payment_method || 'CreditCard',
      auto_pay: Boolean(auto_pay),
      notes: notes ? notes.trim() : '',
    });

    res.status(201).json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PATCH /api/finance/recurring/:id/mark-paid ──────────────────────────────
router.patch('/recurring/:id/mark-paid', protect, async (req, res) => {
  try {
    const bill = await RecurringBill.findById(req.params.id);
    if (!ownerCheck(bill, req.user.id, res)) return;

    // 1. Create matching expense transaction for the payment
    const createdTx = await Transaction.create({
      user: req.user.id,
      title: `${bill.title} (${bill.billing_cycle} bill)`,
      amount: bill.amount,
      type: 'expense',
      category: bill.category || 'Utilities',
      payment_method: bill.payment_method || 'CreditCard',
      transaction_date: new Date(),
      notes: `Automated bill payment record for ${bill.title}`,
    });

    // 2. Advance due date
    bill.advanceDueDate();
    await bill.save();

    res.json({ bill, transaction: createdTx });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/finance/recurring/:id ──────────────────────────────────────────
router.put('/recurring/:id', protect, async (req, res) => {
  try {
    const bill = await RecurringBill.findById(req.params.id);
    if (!ownerCheck(bill, req.user.id, res)) return;

    const fields = ['title', 'amount', 'category', 'billing_cycle', 'next_due_date', 'payment_method', 'auto_pay', 'status', 'notes'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        if (f === 'next_due_date') bill[f] = new Date(req.body[f]);
        else if (f === 'amount') bill[f] = Number(req.body[f]);
        else bill[f] = req.body[f];
      }
    });

    await bill.save();
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE /api/finance/recurring/:id ───────────────────────────────────────
router.delete('/recurring/:id', protect, async (req, res) => {
  try {
    const bill = await RecurringBill.findById(req.params.id);
    if (!ownerCheck(bill, req.user.id, res)) return;
    await bill.deleteOne();
    res.json({ id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/finance/export-csv ─────────────────────────────────────────────
router.get('/export-csv', protect, async (req, res) => {
  try {
    const uid = req.user.id;
    const { month, type } = req.query;

    const query = { user: uid };
    if (type && type !== 'All') query.type = type.toLowerCase();

    if (month) {
      const [yearStr, monthStr] = month.split('-');
      const s = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
      const e = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0, 23, 59, 59, 999);
      query.transaction_date = { $gte: s, $lte: e };
    }

    const transactions = await Transaction.find(query).sort({ transaction_date: -1 });

    const headers = ['Date', 'Title', 'Type', 'Category', 'Amount (INR)', 'Payment Method', 'Notes', 'Receipt Attached'];
    const rows = transactions.map((t) => [
      new Date(t.transaction_date).toISOString().split('T')[0],
      `"${(t.title || '').replace(/"/g, '""')}"`,
      t.type,
      t.category,
      t.amount,
      t.payment_method,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
      t.receipt_url ? 'Yes' : 'No',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="lifevault_finance_${month || 'all'}.csv"`
    );
    res.status(200).send(csvContent);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
