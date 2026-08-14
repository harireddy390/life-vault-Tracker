import { useEffect, useState } from 'react';
import taskService from '../services/taskService';
import Toast from '../components/Toast';
import './Planner.css';

const FILTERS = ['All', 'Active', 'Completed'];
const PRIORITIES = ['low', 'medium', 'high'];

export default function Planner() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [priority, setPriority] = useState('medium');
  const [filter, setFilter] = useState('All');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      setTasks(await taskService.getTasks());
    } catch {
      showToast('Could not load tasks.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const created = await taskService.createTask(text.trim(), priority);
      setTasks((prev) => [created, ...prev]);
      setText('');
      setPriority('medium');
      showToast('Task added.');
    } catch {
      showToast('Could not add task.', 'error');
    }
  };

  const toggle = async (task) => {
    const updated = await taskService.updateTask(task._id, { completed: !task.completed });
    setTasks((prev) => prev.map((t) => (t._id === task._id ? updated : t)));
  };

  const remove = async (id) => {
    await taskService.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t._id !== id));
    showToast('Task deleted.');
  };

  const visibleTasks = tasks.filter((t) => {
    if (filter === 'Active') return !t.completed;
    if (filter === 'Completed') return t.completed;
    return true;
  });

  return (
    <div className="planner">
      <Toast message={toast?.message} type={toast?.type} />

      <div className="page-header">
        <h1>Planner</h1>
        <p className="page-subtitle">Everything you need to get done, in one list.</p>
      </div>

      <div className="card planner-form-card">
        <form className="planner-form" onSubmit={handleAdd}>
          <input
            className="input"
            placeholder="What needs doing?"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <select className="input priority-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)} priority</option>
            ))}
          </select>
          <button className="btn btn-primary" type="submit">Add Task</button>
        </form>
      </div>

      <div className="filter-row">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`filter-chip ${filter === f ? 'filter-chip-active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
        <span className="filter-count">{visibleTasks.length} shown</span>
      </div>

      {loading ? (
        <div className="panel-loading"><span className="spinner"></span> Loading tasks…</div>
      ) : visibleTasks.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">🗓️</div>
          <p>Nothing here. {filter !== 'All' ? 'Try a different filter.' : 'Add your first task above.'}</p>
        </div>
      ) : (
        <div className="planner-list">
          {visibleTasks.map((task) => (
            <div key={task._id} className={`card planner-row ${task.completed ? 'planner-row-done' : ''}`}>
              <label className="task-checkbox">
                <input type="checkbox" checked={task.completed} onChange={() => toggle(task)} />
                <span>{task.text}</span>
              </label>
              <div className="planner-row-meta">
                <span className={`badge badge-${task.priority === 'high' ? 'rose' : task.priority === 'medium' ? 'gold' : 'teal'}`}>
                  {task.priority}
                </span>
                <button className="btn-danger" onClick={() => remove(task._id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
