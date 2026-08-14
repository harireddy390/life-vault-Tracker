import { useEffect, useState } from 'react';
import goalService from '../services/goalService';
import Toast from '../components/Toast';
import './Goals.css';

const CATEGORIES = ['learning', 'health', 'finance', 'career', 'personal'];

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'personal', targetValue: 100, unit: '%' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { setGoals(await goalService.getGoals()); }
    catch { showToast('Could not load goals.', 'error'); }
    finally { setLoading(false); }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      const created = await goalService.createGoal({ ...form, targetValue: Number(form.targetValue) || 100 });
      setGoals((prev) => [created, ...prev]);
      setForm({ title: '', category: 'personal', targetValue: 100, unit: '%' });
      setShowForm(false);
      showToast('Goal created.');
    } catch { showToast('Could not create goal.', 'error'); }
  };

  const bump = async (goal, delta) => {
    const next = Math.max(0, Math.min(goal.targetValue, goal.currentValue + delta));
    const updated = await goalService.updateGoal(goal._id, {
      currentValue: next,
      status: next >= goal.targetValue ? 'completed' : goal.status,
    });
    setGoals((prev) => prev.map((g) => (g._id === goal._id ? updated : g)));
  };

  const remove = async (id) => {
    await goalService.deleteGoal(id);
    setGoals((prev) => prev.filter((g) => g._id !== id));
    showToast('Goal deleted.');
  };

  return (
    <div className="goals-page">
      <Toast message={toast?.message} type={toast?.type} />
      <div className="page-header goals-header">
        <div>
          <h1>Goals</h1>
          <p className="page-subtitle">Track what you're working toward.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : '+ New Goal'}</button>
      </div>

      {showForm && (
        <form className="card goal-form" onSubmit={handleCreate}>
          <input className="input" placeholder="Goal title (e.g. Learn React)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="goal-form-row">
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
            </select>
            <input className="input" type="number" placeholder="Target (e.g. 100)" value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: e.target.value })} />
            <input className="input" placeholder="Unit (%, km, ₹)" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </div>
          <button className="btn btn-primary" type="submit">Create Goal</button>
        </form>
      )}

      {loading ? (
        <div className="panel-loading"><span className="spinner"></span> Loading goals…</div>
      ) : goals.length === 0 ? (
        <div className="card empty-state"><div className="empty-icon">{'\u{1F3AF}'}</div><p>Create something you want to achieve.</p></div>
      ) : (
        <div className="goals-grid">
          {goals.map((g) => {
            const pct = Math.min(100, Math.round((g.currentValue / g.targetValue) * 100));
            return (
              <div key={g._id} className="card goal-card">
                <div className="goal-card-top">
                  <h3>{g.title}</h3>
                  <span className={`badge badge-${g.status === 'completed' ? 'teal' : 'gold'}`}>{g.status}</span>
                </div>
                <p className="goal-cat">{g.category}</p>
                <div className="progress-track"><div className={`progress-fill ${g.status === 'completed' ? 'success' : ''}`} style={{ width: `${pct}%` }} /></div>
                <div className="goal-card-bottom">
                  <span>{g.currentValue}{g.unit} / {g.targetValue}{g.unit} ({pct}%)</span>
                  <div className="goal-actions">
                    <button className="btn btn-ghost goal-btn" onClick={() => bump(g, g.unit === '%' ? 10 : 1)}>+</button>
                    <button className="btn btn-ghost goal-btn" onClick={() => bump(g, g.unit === '%' ? -10 : -1)}>−</button>
                    <button className="btn-danger" onClick={() => remove(g._id)}>Delete</button>
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
