import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import taskService from '../services/taskService';
import noteService from '../services/noteService';
import goalService from '../services/goalService';
import documentService from '../services/documentService';
import memoryService from '../services/memoryService';
import './GlobalSearch.css';

// A genuine client-side search across everything you've actually stored —
// not a fake box. Loads once, filters locally as you type.
export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const [tasks, notes, goals, documents, memories] = await Promise.all([
          taskService.getTasks(), noteService.getNotes(), goalService.getGoals(),
          documentService.getDocuments(), memoryService.getMemories(),
        ]);
        setData({ tasks, notes, goals, documents, memories });
      } catch { /* search just won't have results if this fails */ }
    })();
  }, []);

  useEffect(() => {
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const q = query.trim().toLowerCase();
  const matches = (text) => text && text.toLowerCase().includes(q);

  const results = q && data ? {
    Tasks: data.tasks.filter((t) => matches(t.text)).slice(0, 4).map((t) => ({ label: t.text, to: '/planner' })),
    Notes: data.notes.filter((n) => matches(n.title) || matches(n.content)).slice(0, 4).map((n) => ({ label: n.title, to: '/notes' })),
    Goals: data.goals.filter((g) => matches(g.title)).slice(0, 4).map((g) => ({ label: g.title, to: '/goals' })),
    Documents: data.documents.filter((d) => matches(d.originalName)).slice(0, 4).map((d) => ({ label: d.originalName, to: '/vault' })),
    Memories: data.memories.filter((m) => matches(m.title) || matches(m.description)).slice(0, 4).map((m) => ({ label: m.title, to: '/memories' })),
  } : {};

  const hasResults = Object.values(results).some((arr) => arr.length > 0);

  return (
    <div className="global-search" ref={wrapRef}>
      <input
        className="input search-input"
        placeholder="Search your Life Vault…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && q && (
        <div className="search-dropdown">
          {!data ? (
            <div className="search-loading">Loading your data…</div>
          ) : !hasResults ? (
            <div className="search-loading">No matches for "{query}"</div>
          ) : (
            Object.entries(results).map(([group, items]) =>
              items.length === 0 ? null : (
                <div key={group} className="search-group">
                  <p className="search-group-label">{group.toUpperCase()}</p>
                  {items.map((item, i) => (
                    <button key={i} className="search-result" onClick={() => { navigate(item.to); setOpen(false); setQuery(''); }}>
                      {item.label}
                    </button>
                  ))}
                </div>
              )
            )
          )}
        </div>
      )}
    </div>
  );
}
