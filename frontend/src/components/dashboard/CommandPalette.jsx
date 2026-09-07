import { useEffect, useRef, useState, useCallback } from 'react';
import { Search, Zap, Droplets, Clock, DollarSign, CheckSquare } from 'lucide-react';
import taskService from '../../services/taskService';
import expenseService from '../../services/expenseService';
import './CommandPalette.css';

const COMMANDS = [
  { id: 'task',    prefix: '> t ',  icon: CheckSquare, label: '> t [title]',      hint: 'Add a task to Today' },
  { id: 'expense', prefix: '> e ',  icon: DollarSign,  label: '> e [amt] [desc]', hint: 'Log an expense' },
  { id: 'water',   prefix: '> w',   icon: Droplets,    label: '> w',              hint: 'Add 1 glass of water' },
  { id: 'focus',   prefix: '> f ',  icon: Clock,       label: '> f [minutes]',    hint: 'Start focus timer' },
];

function matchedCommands(query) {
  if (!query) return COMMANDS;
  const q = query.toLowerCase();
  return COMMANDS.filter(c =>
    c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q)
  );
}

export default function CommandPalette({ open, onClose, addWater, startTimer }) {
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const [feedback, setFeedback] = useState('');
  const inputRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setFeedback('');
      setHighlighted(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const matches = matchedCommands(query);

  const flashFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 2000);
  };

  const execute = useCallback(async (rawQuery) => {
    const q = (rawQuery ?? query).trim();

    // > t [title]
    if (q.startsWith('> t ') || q.startsWith('>t ')) {
      const title = q.replace(/^>t?\s+t\s+/i, '').replace(/^>\s*t\s+/, '');
      if (!title) return;
      try {
        await taskService.createTask({ text: title, priority: 'medium' });
        flashFeedback(`✅ Task added: "${title}"`);
        setQuery('');
      } catch { flashFeedback('❌ Failed to add task'); }
      return;
    }

    // > e [amount] [description]
    if (q.startsWith('> e ') || q.startsWith('>e ')) {
      const parts = q.replace(/^>e?\s+e\s+/i, '').replace(/^>\s*e\s+/, '').split(/\s+/);
      const amount = parseFloat(parts[0]);
      const description = parts.slice(1).join(' ') || 'Command Palette entry';
      if (isNaN(amount)) { flashFeedback('❌ Usage: > e 250 Lunch'); return; }
      try {
        const today = new Date().toISOString().slice(0, 10);
        await expenseService.createExpense({ amount, description, date: today, type: 'expense', category: 'other' });
        flashFeedback(`✅ Expense ₹${amount} logged`);
        setQuery('');
      } catch { flashFeedback('❌ Failed to log expense'); }
      return;
    }

    // > w (add water)
    if (q === '> w' || q === '>w') {
      addWater?.();
      flashFeedback('💧 +1 glass of water!');
      setQuery('');
      return;
    }

    // > f [minutes]
    if (q.startsWith('> f ') || q.startsWith('>f ')) {
      const mins = parseInt(q.replace(/^>f?\s+f\s+/i, '').replace(/^>\s*f\s+/, ''), 10);
      if (isNaN(mins) || mins <= 0) { flashFeedback('❌ Usage: > f 25'); return; }
      startTimer?.(mins);
      flashFeedback(`⏱ Timer started: ${mins} minutes`);
      setQuery('');
      return;
    }

    flashFeedback('❓ Unknown command. Try > t, > e, > w, > f');
  }, [query, addWater, startTimer]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (query.startsWith('>')) {
        execute(query);
      } else {
        const cmd = matches[highlighted];
        if (cmd) setQuery(cmd.prefix);
      }
    }
  };

  if (!open) return null;

  return (
    <div className="cp-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Command Palette">
      <div className="cp-modal" onClick={e => e.stopPropagation()}>
        <div className="cp-input-row">
          <Search size={16} className="cp-search-icon" />
          <input
            ref={inputRef}
            className="cp-input"
            placeholder="Type a command: > t task, > e 200 lunch, > w, > f 25"
            value={query}
            onChange={e => { setQuery(e.target.value); setHighlighted(0); }}
            onKeyDown={onKeyDown}
            aria-label="Command input"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="cp-kbd">ESC</kbd>
        </div>

        {feedback && (
          <div className="cp-feedback" role="status">{feedback}</div>
        )}

        <ul className="cp-list" role="listbox">
          {matches.map((cmd, idx) => {
            const Icon = cmd.icon;
            return (
              <li
                key={cmd.id}
                className={`cp-item ${idx === highlighted ? 'cp-item-active' : ''}`}
                role="option"
                aria-selected={idx === highlighted}
                onClick={() => setQuery(cmd.prefix)}
                onMouseEnter={() => setHighlighted(idx)}
              >
                <span className="cp-item-icon"><Icon size={15} /></span>
                <span className="cp-item-label">{cmd.label}</span>
                <span className="cp-item-hint">{cmd.hint}</span>
              </li>
            );
          })}
        </ul>

        <div className="cp-footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>Enter</kbd> select / run</span>
          <span><kbd>Esc</kbd> close</span>
          <span className="cp-footer-brand"><Zap size={11} /> Life Vault</span>
        </div>
      </div>
    </div>
  );
}
