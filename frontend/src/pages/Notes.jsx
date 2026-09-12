import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, X, Plus, Brain, Layers, BookOpen } from 'lucide-react';
import Toast from '../components/Toast';
import StatsBar from '../components/learning/StatsBar';
import NoteCard from '../components/learning/NoteCard';
import NoteModal from '../components/learning/NoteModal';
import FlashcardWidget from '../components/learning/FlashcardWidget';
import FlashcardModal from '../components/learning/FlashcardModal';
import DeckModal from '../components/learning/DeckModal';
import RoadmapCard from '../components/learning/RoadmapCard';
import RoadmapModal from '../components/learning/RoadmapModal';
import ResourceShelf from '../components/learning/ResourceShelf';
import ResourceModal from '../components/learning/ResourceModal';
import DocumentViewerModal from '../components/learning/DocumentViewerModal';
import DeleteConfirmModal from '../components/learning/DeleteConfirmModal';
import TagPill from '../components/learning/TagPill';
import ls from '../services/learningService';
import './Notes.css';

// ── Progress update inline component ─────────────────────────────────────────
function ProgressUpdateModal({ resource, onSave, onClose }) {
  const [value, setValue] = useState(resource.current_progress);
  return (
    <div className="lh-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lh-modal" style={{ maxWidth: 380 }}>
        <div className="lh-modal-header">
          <h2>Update Progress</h2>
          <button className="lh-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="lh-modal-body">
          <p style={{ color: '#64748b', marginBottom: 12, fontSize: 13 }}>{resource.title}</p>
          <label className="lh-field-label">Current {resource.unit_label} (of {resource.total_units})</label>
          <input
            className="lh-modal-input"
            type="number"
            min="0"
            max={resource.total_units}
            value={value}
            onChange={(e) => setValue(Math.min(Number(e.target.value), Number(resource.total_units)))}
          />
          <div style={{ height: 6, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden', marginTop: 12 }}>
            <div style={{ width: `${Math.min(Math.round((value / resource.total_units) * 100), 100)}%`, height: '100%', background: '#4f46e5', borderRadius: 999, transition: 'width 0.3s' }} />
          </div>
          <div className="lh-modal-footer">
            <button className="lh-btn-ghost" onClick={onClose}>Cancel</button>
            <button className="lh-btn-primary" onClick={() => { onSave(resource._id, value); onClose(); }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add step inline modal ─────────────────────────────────────────────────────
function AddStepModal({ topicId, onSave, onClose }) {
  const [stepTitle, setStepTitle] = useState('');
  return (
    <div className="lh-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lh-modal" style={{ maxWidth: 380 }}>
        <div className="lh-modal-header">
          <h2>Add Step</h2>
          <button className="lh-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="lh-modal-body">
          <input className="lh-modal-input" placeholder="Step title…" value={stepTitle} onChange={(e) => setStepTitle(e.target.value)} autoFocus />
          <div className="lh-modal-footer">
            <button className="lh-btn-ghost" onClick={onClose}>Cancel</button>
            <button className="lh-btn-primary" disabled={!stepTitle.trim()} onClick={() => { onSave(topicId, stepTitle.trim()); onClose(); }}>Add Step</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Notes() {
  // ── Data state ──
  const [stats, setStats] = useState(null);
  const [notes, setNotes] = useState([]);
  const [dueCards, setDueCards] = useState([]);
  const [decks, setDecks] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Filter state ──
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [activeSection, setActiveSection] = useState('notes'); // 'notes' | 'flashcards' | 'roadmaps'

  // ── Modal state ──
  const [noteModal, setNoteModal] = useState(null);    // null | 'create' | noteObj
  const [cardModal, setCardModal] = useState(false);
  const [deckModal, setDeckModal] = useState(false);
  const [roadmapModal, setRoadmapModal] = useState(false);
  const [resourceModal, setResourceModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null); // { type, item }
  const [progressModal, setProgressModal] = useState(null);
  const [viewerModal, setViewerModal] = useState(null); // null | resourceObj
  const [addStepModal, setAddStepModal] = useState(null);
  const [expandedRoadmaps, setExpandedRoadmaps] = useState({});

  // ── Toast ──
  const [toast, setToast] = useState(null);

  // ── Derived tags list ──
  const allTags = useMemo(() => {
    const t = new Set();
    notes.forEach((n) => n.tags?.forEach((tag) => t.add(tag)));
    return [...t].slice(0, 20);
  }, [notes]);

  // ── Load everything ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, n, cards, d, r, res] = await Promise.all([
        ls.getStats().catch(() => ({})),
        ls.getNotes({ limit: 100 }).catch(() => ({ notes: [] })),
        ls.getDueFlashcards().catch(() => []),
        ls.getDecks().catch(() => []),
        ls.getRoadmaps().catch(() => []),
        ls.getResources().catch(() => []),
      ]);
      setStats(s);
      // API returns { notes, total, page } — extract the array
      setNotes(Array.isArray(n) ? n : (n.notes || []));
      setDueCards(Array.isArray(cards) ? cards : []);
      setDecks(Array.isArray(d) ? d : []);
      setRoadmaps(Array.isArray(r) ? r : []);
      setResources(Array.isArray(res) ? res : []);
    } catch (e) {
      showToast('Could not load learning data. Check your connection.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Debounce search ──
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Filtered notes ──
  const filteredNotes = useMemo(() => {
    let n = notes;
    if (activeTag) n = n.filter((note) => note.tags?.includes(activeTag));
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      n = n.filter((note) =>
        note.title?.toLowerCase().includes(q) ||
        note.content_markdown?.toLowerCase().includes(q) ||
        note.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return n;
  }, [notes, activeTag, debouncedSearch]);

  // ── NOTES CRUD ──────────────────────────────────────────────────────────────
  const handleSaveNote = async (data) => {
    try {
      const isNew = noteModal === 'create';
      if (!isNew && noteModal) {
        const updated = await ls.updateNote(noteModal._id, data);
        setNotes((p) => p.map((n) => (n._id === updated._id ? updated : n)).sort((a, b) => b.is_pinned - a.is_pinned));
        showToast('Note updated ✓');
      } else {
        const created = await ls.createNote(data);
        setNotes((p) => [created, ...p]);
        setStats((s) => ({ ...s, totalNotes: (s?.totalNotes || 0) + 1 }));
        showToast('Note created ✓');
      }
      setNoteModal(null);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to save note.', 'error');
    }
  };

  const handlePinNote = async (note) => {
    try {
      const updated = await ls.pinNote(note._id);
      setNotes((p) =>
        p.map((n) => (n._id === updated._id ? updated : n)).sort((a, b) => b.is_pinned - a.is_pinned)
      );
    } catch {
      showToast('Could not pin note.', 'error');
    }
  };

  const handleDeleteNote = async () => {
    try {
      await ls.deleteNote(deleteModal.item._id);
      setNotes((p) => p.filter((n) => n._id !== deleteModal.item._id));
      setDeleteModal(null);
      showToast('Note deleted.');
    } catch {
      showToast('Delete failed.', 'error');
    }
  };

  // ── FLASHCARDS ──────────────────────────────────────────────────────────────
  const handleCreateDeck = async (data) => {
    const deck = await ls.createDeck(data);
    setDecks((p) => [{ ...deck, card_count: 0, due_count: 0 }, ...p]);
    showToast('Deck created ✓');
  };

  const handleAddCard = async (data) => {
    await ls.createFlashcard(data);
    const cards = await ls.getDueFlashcards();
    setDueCards(cards);
    showToast('Card added ✓');
  };

  const handleGradeCard = async (cardId, grade) => {
    const updated = await ls.gradeFlashcard(cardId, grade);
    setDueCards((p) => p.filter((c) => c._id !== cardId));
    setStats((s) => ({ ...s, dueFlashcards: Math.max(0, (s?.dueFlashcards || 0) - 1) }));
  };

  // ── ROADMAPS ────────────────────────────────────────────────────────────────
  const handleCreateRoadmap = async (data) => {
    const topic = await ls.createRoadmap(data);
    setRoadmaps((p) => [topic, ...p]);
    setExpandedRoadmaps((e) => ({ ...e, [topic._id]: true }));
    showToast('Roadmap created ✓');
  };

  const handleToggleStep = async (topicId, stepId) => {
    const updated = await ls.toggleStep(topicId, stepId);
    setRoadmaps((p) => p.map((r) => (r._id === updated._id ? updated : r)));
  };

  const handleAddStep = async (topicId, title) => {
    const updated = await ls.addRoadmapStep(topicId, title);
    setRoadmaps((p) => p.map((r) => (r._id === updated._id ? updated : r)));
    showToast('Step added ✓');
  };

  const handleDeleteStep = async (topicId, stepId) => {
    try {
      const updated = await ls.deleteStep(topicId, stepId);
      setRoadmaps((p) => p.map((r) => (r._id === updated._id ? updated : r)));
      showToast('Step removed.');
    } catch {
      showToast('Could not remove step.', 'error');
    }
  };

  const handleDeleteRoadmap = async () => {
    try {
      await ls.deleteRoadmap(deleteModal.item._id);
      setRoadmaps((p) => p.filter((r) => r._id !== deleteModal.item._id));
      setDeleteModal(null);
      showToast('Roadmap deleted.');
    } catch {
      showToast('Delete failed.', 'error');
    }
  };

  // ── RESOURCES ───────────────────────────────────────────────────────────────
  const handleSaveResource = async (data) => {
    const res = await ls.createResource(data);
    setResources((p) => [res, ...p]);
    setResourceModal(false);
    showToast('Resource added ✓');
  };

  const handleUploadResource = async (formData) => {
    const res = await ls.uploadResource(formData);
    setResources((p) => [res, ...p]);
    setResourceModal(false);
    showToast('Resource uploaded ✓');
  };

  const handleUpdateProgress = async (id, current_progress) => {
    try {
      const updated = await ls.updateResourceProgress(id, current_progress);
      setResources((p) => p.map((r) => (r._id === updated._id ? updated : r)));
      if (viewerModal && viewerModal._id === id) {
        setViewerModal(updated);
      }
      showToast('Progress updated ✓');
    } catch {
      showToast('Could not update progress.', 'error');
    }
  };

  const handleDeleteResource = async () => {
    try {
      await ls.deleteResource(deleteModal.item._id);
      setResources((p) => p.filter((r) => r._id !== deleteModal.item._id));
      setDeleteModal(null);
      showToast('Resource removed.');
    } catch {
      showToast('Delete failed.', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteModal.type === 'note') await handleDeleteNote();
    else if (deleteModal.type === 'roadmap') await handleDeleteRoadmap();
    else if (deleteModal.type === 'resource') await handleDeleteResource();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="lh-page lh-loading">
        <div className="lh-spinner" />
        <p>Loading Learning Hub…</p>
      </div>
    );
  }

  return (
    <div className="lh-page">
      <Toast message={toast?.message} type={toast?.type} />

      {/* ── TOP STATS BAR ── */}
      <StatsBar
        stats={stats}
        onNewNote={() => setNoteModal('create')}
        onPractice={() => setActiveSection('flashcards')}
        onNewRoadmap={() => setRoadmapModal(true)}
      />

      {/* ── SECTION NAV TABS ── */}
      <div className="lh-section-tabs">
        {[
          { id: 'notes', label: 'Notes & Cheatsheets', icon: BookOpen },
          { id: 'flashcards', label: 'Flashcards', icon: Brain },
          { id: 'roadmaps', label: 'Roadmaps', icon: Layers },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`lh-section-tab ${activeSection === id ? 'active' : ''}`}
            onClick={() => setActiveSection(id)}
          >
            <Icon size={15} />
            {label}
            {id === 'flashcards' && dueCards.length > 0 && (
              <span className="lh-tab-badge">{dueCards.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          NOTES SECTION
      ════════════════════════════════════════════════════════════════ */}
      {activeSection === 'notes' && (
        <div className="lh-notes-section">
          {/* Search + filters */}
          <div className="lh-filter-bar">
            <div className="lh-search-wrap">
              <Search size={15} className="lh-search-icon" />
              <input
                className="lh-search"
                placeholder="Search notes, tags, code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                id="lh-notes-search"
              />
              {search && (
                <button className="lh-search-clear" onClick={() => setSearch('')}><X size={13} /></button>
              )}
            </div>
            <div className="lh-tag-filter-rail">
              {activeTag && (
                <button className="lh-clear-tag" onClick={() => setActiveTag('')}><X size={11} /> All</button>
              )}
              {allTags.map((t) => (
                <TagPill
                  key={t}
                  tag={t}
                  active={activeTag === t}
                  onClick={() => setActiveTag(activeTag === t ? '' : t)}
                />
              ))}
            </div>
            <button className="lh-btn-primary lh-btn-sm" onClick={() => setNoteModal('create')}>
              <Plus size={14} /> Note
            </button>
          </div>

          {/* Notes grid */}
          {filteredNotes.length === 0 ? (
            <div className="lh-empty-state">
              <span className="lh-empty-icon">📝</span>
              <h3>{notes.length === 0 ? 'No notes yet' : 'No matching notes'}</h3>
              <p>{notes.length === 0 ? 'Start capturing your learning below.' : 'Try a different search or tag filter.'}</p>
              {notes.length === 0 && (
                <button className="lh-btn-primary" onClick={() => setNoteModal('create')}>+ Create First Note</button>
              )}
            </div>
          ) : (
            <div className="lh-notes-grid">
              {filteredNotes.map((note) => (
                <NoteCard
                  key={note._id}
                  note={note}
                  onEdit={(n) => setNoteModal(n)}
                  onDelete={(n) => setDeleteModal({ type: 'note', item: n, title: 'Delete Note?', description: `"${n.title}" will be permanently removed.` })}
                  onPin={handlePinNote}
                  onTagFilter={(t) => setActiveTag(t)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          FLASHCARDS SECTION
      ════════════════════════════════════════════════════════════════ */}
      {activeSection === 'flashcards' && (
        <div className="lh-flashcards-section">
          <div className="lh-fc-layout">
            {/* Left: flashcard widget */}
            <div className="lh-fc-main">
              <FlashcardWidget
                cards={dueCards}
                onGrade={handleGradeCard}
                onAddCards={() => setCardModal(true)}
                onOpenDeckModal={() => setDeckModal(true)}
              />
            </div>

            {/* Right: decks list */}
            <div className="lh-fc-sidebar">
              <div className="lh-fc-sidebar-header">
                <h3>My Decks</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="lh-btn-ghost lh-btn-sm" onClick={() => setDeckModal(true)}>+ Deck</button>
                  <button className="lh-btn-primary lh-btn-sm" onClick={() => setCardModal(true)}>+ Card</button>
                </div>
              </div>
              {decks.length === 0 ? (
                <p className="lh-fc-no-decks">No decks yet. Create one to get started.</p>
              ) : (
                <div className="lh-deck-list-full">
                  {decks.map((d) => (
                    <div key={d._id} className="lh-deck-item" style={{ borderLeft: `3px solid ${d.color || '#6366f1'}` }}>
                      <span className="lh-deck-item-title">{d.title}</span>
                      <div className="lh-deck-item-meta">
                        <span className="lh-deck-item-count">{d.card_count || 0} cards</span>
                        {d.due_count > 0 && (
                          <span className="lh-deck-due-badge">{d.due_count} due</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          ROADMAPS SECTION
      ════════════════════════════════════════════════════════════════ */}
      {activeSection === 'roadmaps' && (
        <div className="lh-roadmaps-section">
          <div className="lh-roadmaps-header">
            <div>
              <h2 className="lh-section-title">Skill Roadmaps</h2>
              <p className="lh-section-sub">Track your learning milestones and progress</p>
            </div>
            <button className="lh-btn-primary" onClick={() => setRoadmapModal(true)}>
              <Plus size={14} /> New Roadmap
            </button>
          </div>

          {roadmaps.length === 0 ? (
            <div className="lh-empty-state">
              <span className="lh-empty-icon">🗺️</span>
              <h3>No roadmaps yet</h3>
              <p>Create a structured learning path to track your skills.</p>
              <button className="lh-btn-primary" onClick={() => setRoadmapModal(true)}>+ Create Roadmap</button>
            </div>
          ) : (
            <div className="lh-roadmaps-grid">
              {roadmaps.map((topic) => (
                <RoadmapCard
                  key={topic._id}
                  topic={topic}
                  expanded={!!expandedRoadmaps[topic._id]}
                  onToggleExpand={() => setExpandedRoadmaps((e) => ({ ...e, [topic._id]: !e[topic._id] }))}
                  onToggleStep={handleToggleStep}
                  onDeleteStep={handleDeleteStep}
                  onDelete={(t) => setDeleteModal({ type: 'roadmap', item: t, title: 'Delete Roadmap?', description: `"${t.title}" and all its steps will be removed.` })}
                  onAddStep={(topicId) => setAddStepModal(topicId)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          RESOURCE SHELF — always visible at bottom
      ════════════════════════════════════════════════════════════════ */}
      <div className="lh-resource-section">
        <div className="lh-resource-section-header">
          <div>
            <h2 className="lh-section-title"><BookOpen size={16} /> Books & Courses</h2>
            <p className="lh-section-sub">Track your reading and course progress</p>
          </div>
          <button className="lh-btn-ghost lh-btn-sm" onClick={() => setResourceModal(true)}>
            <Plus size={14} /> Add Resource
          </button>
        </div>
        <ResourceShelf
          resources={resources}
          onView={(r) => setViewerModal(r)}
          onUpdateProgress={(r) => setProgressModal(r)}
          onDelete={(r) => setDeleteModal({ type: 'resource', item: r, title: 'Remove Resource?', description: `"${r.title}" and its attached file will be deleted.` })}
          onAdd={() => setResourceModal(true)}
        />
      </div>

      {/* ════════════════════════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════════════════════════ */}
      {noteModal && (
        <NoteModal
          note={noteModal === 'create' ? null : noteModal}
          roadmaps={roadmaps}
          onSave={handleSaveNote}
          onClose={() => setNoteModal(null)}
        />
      )}
      {deckModal && (
        <DeckModal
          decks={decks}
          onCreateDeck={handleCreateDeck}
          onClose={() => setDeckModal(false)}
        />
      )}
      {cardModal && (
        <FlashcardModal
          decks={decks}
          onCreateDeck={handleCreateDeck}
          onSave={handleAddCard}
          onClose={() => setCardModal(false)}
        />
      )}
      {roadmapModal && (
        <RoadmapModal
          onSave={handleCreateRoadmap}
          onClose={() => setRoadmapModal(false)}
        />
      )}
      {resourceModal && (
        <ResourceModal
          roadmaps={roadmaps}
          onSave={handleSaveResource}
          onUpload={handleUploadResource}
          onClose={() => setResourceModal(false)}
        />
      )}
      {deleteModal && (
        <DeleteConfirmModal
          title={deleteModal.title}
          description={deleteModal.description}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteModal(null)}
        />
      )}
      {progressModal && (
        <ProgressUpdateModal
          resource={progressModal}
          onSave={handleUpdateProgress}
          onClose={() => setProgressModal(null)}
        />
      )}
      {viewerModal && (
        <DocumentViewerModal
          resource={viewerModal}
          onUpdateProgress={handleUpdateProgress}
          onClose={() => setViewerModal(null)}
        />
      )}
      {addStepModal && (
        <AddStepModal
          topicId={addStepModal}
          onSave={handleAddStep}
          onClose={() => setAddStepModal(null)}
        />
      )}
    </div>
  );
}
