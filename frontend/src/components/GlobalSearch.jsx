import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import taskService from '../services/taskService';
import noteService from '../services/noteService';
import goalService from '../services/goalService';
import documentService from '../services/documentService';
import memoryService from '../services/memoryService';
import habitService from '../services/habitService';
import './GlobalSearch.css';

const GROUP_ORDER = ['Habits', 'Tasks', 'Notes', 'Goals', 'Documents', 'Memories'];

export default function GlobalSearch({ autoFocus = false, onRequestClose }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [highlighted, setHighlighted] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const [tasks, notes, goals, documents, memories, habits] = await Promise.all([
          taskService.getTasks(), noteService.getNotes(), goalService.getGoals(),
          documentService.getDocuments(), memoryService.getMemories(),
          habitService.getHabits(),
        ]);
        setData({ tasks, notes, goals, documents, memories, habits });
      } catch { /* search just won't have results if this fails */ }
    })();
  }, []);

  useEffect(() => {
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
      setOpen(true);
    }
  }, [autoFocus]);

  useEffect(() => { setHighlighted(0); }, [query]);

  const q = query.trim().toLowerCase();
  const matches = (text) => text && text.toLowerCase().includes(q);

  const flatResults = !q || !data ? [] : [
    ...data.habits.filter((h) => matches(h.title)).slice(0, 4).map((h) => ({ group: 'Habits', label: h.title, to: '/planner' })),
    ...data.tasks.filter((t) => matches(t.text)).slice(0, 4).map((t) => ({ group: 'Tasks', label: t.text, to: '/planner' })),
    ...data.notes.filter((n) => matches(n.title) || matches(n.content)).slice(0, 4).map((n) => ({ group: 'Notes', label: n.title, to: '/notes' })),
    ...data.goals.filter((g) => matches(g.title)).slice(0, 4).map((g) => ({ group: 'Goals', label: g.title, to: '/goals' })),
    ...data.documents.filter((d) => matches(d.originalName)).slice(0, 4).map((d) => ({ group: 'Documents', label: d.originalName, to: '/vault' })),
    ...data.memories.filter((m) => matches(m.title) || matches(m.description)).slice(0, 4).map((m) => ({ group: 'Memories', label: m.title, to: '/memories' })),
  ];
  const hasResults = flatResults.length > 0;

  const selectResult = useCallback((item) => {
    navigate(item.to);
    setOpen(false);
    setQuery('');
    onRequestClose?.();
  }, [navigate, onRequestClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      onRequestClose?.();
      return;
    }
    if (!open || !hasResults) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => (i + 1) % flatResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => (i - 1 + flatResults.length) % flatResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectResult(flatResults[highlighted]);
    }
  };

  return (
    <div className="global-search" ref={wrapRef}>
      <input
        ref={inputRef}
        className="input search-input"
        placeholder="Search your Life Vault…  (Ctrl+K)"
        aria-label="Search your Life Vault"
        role="combobox"
        aria-expanded={open && hasResults}
        aria-controls="global-search-results"
        aria-autocomplete="list"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {open && q && (
        <div className="search-dropdown" id="global-search-results" role="listbox">
          {!data ? (
            <div className="search-loading">Loading your data…</div>
          ) : !hasResults ? (
            <div className="search-loading">No matches for "{query}"</div>
          ) : (
            GROUP_ORDER.map((group) => {
              const items = flatResults.filter((r) => r.group === group);
              if (items.length === 0) return null;
              return (
                <div key={group} className="search-group">
                  <p className="search-group-label">{group.toUpperCase()}</p>
                  {items.map((item) => {
                    const idx = flatResults.indexOf(item);
                    return (
                      <button
                        key={idx}
                        role="option"
                        aria-selected={idx === highlighted}
                        className={`search-result ${idx === highlighted ? 'search-result-active' : ''}`}
                        onMouseEnter={() => setHighlighted(idx)}
                        onClick={() => selectResult(item)}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}