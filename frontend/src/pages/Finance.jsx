import { useEffect, useState } from 'react';
import expenseService from '../services/expenseService';
import Toast from '../components/Toast';
import './Finance.css';

const CATEGORIES = ['food', 'transport', 'shopping', 'education', 'health', 'bills', 'other'];
const CATEGORY_COLORS = {
  food: 'var(--gold-500)', transport: 'var(--teal-500)', shopping: 'var(--violet-500)',
  education: 'var(--success-500)', health: 'var(--rose-500)', bills: 'var(--warning-500)', other: 'var(--text-muted)',
};

export default function Finance() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ title: '', amount: '', category: 'other', type: 'expense' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { setExpenses(await expenseService.getExpenses()); }
    catch { showToast('Could not load expenses.', 'error'); }
    finally { setLoading(false); }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.amount) return;
    try {
      const created = await expenseService.createExpense({ ...form, amount: Number(form.amount) });
      setExpenses((prev) => [created, ...prev]);
      setForm({ title: '', amount: '', category: 'other', type: 'expense' });
    } catch { showToast('Could not add entry.', 'error'); }
  };

  const remove = async (id) => {
    await expenseService.deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e._id !== id));
  };

  const now = new Date();
  const thisMonth = expenses.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const spent = thisMonth.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const income = thisMonth.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0);

  const byCategory = CATEGORIES.map((cat) => ({
    cat,
    total: thisMonth.filter((e) => e.category === cat && e.type === 'expense').reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total);

  let cumulative = 0;
  const gradientStops = byCategory.map(({ cat, total }) => {
    const start = spent ? (cumulative / spent) * 360 : 0;
    cumulative += total;
    const end = spent ? (cumulative / spent) * 360 : 0;
    return `${CATEGORY_COLORS[cat]} ${start}deg ${end}deg`;
  }).join(', ');

  return (
    <div className="finance-page">
      <Toast message={toast?.message} type={toast?.type} />
      <div className="page-header">
        <h1>Finance</h1>
        <p className="page-subtitle">Manual tracking — no bank connection needed.</p>
      </div>

      <div className="finance-summary-row">
        <div className="card finance-summary-card">
          <p className="panel-eyebrow">Spent This Month</p>
          <p className="finance-big-num spent">₹{spent.toLocaleString()}</p>
        </div>
        <div className="card finance-summary-card">
          <p className="panel-eyebrow">Income This Month</p>
          <p className="finance-big-num income">₹{income.toLocaleString()}</p>
        </div>
      </div>

      <div className="finance-grid">
        <div className="card panel">
          <p className="panel-eyebrow">Add Entry</p>
          <form className="finance-form" onSubmit={handleAdd}>
            <input className="input" placeholder="Description" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className="input" type="number" placeholder="Amount (₹)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <div className="finance-form-row">
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
              </select>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <button className="btn btn-primary" type="submit">Add</button>
          </form>
        </div>

        <div className="card panel text-center">
          <p className="panel-eyebrow">Spending by Category</p>
          {byCategory.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">{'\u{1F4B0}'}</div><p>No expenses logged this month.</p></div>
          ) : (
            <>
              <div className="donut" style={{ background: `conic-gradient(${gradientStops})` }}>
                <div className="donut-center"><span>₹{spent.toLocaleString()}</span><span className="donut-label">This Month</span></div>
              </div>
              <div className="donut-legend">
                {byCategory.map(({ cat, total }) => (
                  <div key={cat} className="legend-row">
                    <span className="legend-dot" style={{ background: CATEGORY_COLORS[cat] }} />
                    <span className="legend-label">{cat}</span>
                    <span className="legend-value">₹{total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card panel">
        <p className="panel-eyebrow">Recent Transactions</p>
        {loading ? (
          <div className="panel-loading"><span className="spinner"></span> Loading…</div>
        ) : expenses.length === 0 ? (
          <div className="empty-state"><p>No transactions yet.</p></div>
        ) : (
          <ul className="tx-list">
            {expenses.slice(0, 10).map((e) => (
              <li key={e._id} className="tx-row">
                <span className="tx-dot" style={{ background: CATEGORY_COLORS[e.category] }} />
                <span className="tx-title">{e.title}</span>
                <span className="tx-date">{new Date(e.date).toLocaleDateString()}</span>
                <span className={`tx-amount ${e.type}`}>{e.type === 'income' ? '+' : '−'}₹{e.amount.toLocaleString()}</span>
                <button className="btn-danger" onClick={() => remove(e._id)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
