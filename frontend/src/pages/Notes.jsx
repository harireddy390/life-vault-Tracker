import { useEffect, useState } from 'react';
import noteService from '../services/noteService';
import Toast from '../components/Toast';
import './Notes.css';

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      setNotes(await noteService.getNotes());
    } catch {
      showToast('Could not load notes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      if (editingId) {
        const updated = await noteService.updateNote(editingId, { title, content });
        setNotes((prev) => prev.map((n) => (n._id === editingId ? updated : n)));
        showToast('Note updated.');
      } else {
        const created = await noteService.createNote(title.trim(), content);
        setNotes((prev) => [created, ...prev]);
        showToast('Note added.');
      }
      resetForm();
    } catch {
      showToast('Could not save note.', 'error');
    }
  };

  const startEdit = (note) => {
    setEditingId(note._id);
    setTitle(note.title);
    setContent(note.content);
  };

  const togglePin = async (note) => {
    const updated = await noteService.updateNote(note._id, { pinned: !note.pinned });
    setNotes((prev) =>
      prev.map((n) => (n._id === note._id ? updated : n)).sort((a, b) => b.pinned - a.pinned)
    );
  };

  const remove = async (id) => {
    await noteService.deleteNote(id);
    setNotes((prev) => prev.filter((n) => n._id !== id));
    if (editingId === id) resetForm();
    showToast('Note deleted.');
  };

  return (
    <div className="notes-page">
      <Toast message={toast?.message} type={toast?.type} />

      <div className="page-header">
        <h1>Notes</h1>
        <p className="page-subtitle">Jot things down before you forget them.</p>
      </div>

      <div className="card note-form-card">
        <form className="note-form" onSubmit={handleSubmit}>
          <input
            className="input"
            placeholder="Note title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="input note-textarea"
            placeholder="Write something…"
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="note-form-actions">
            {editingId && (
              <button type="button" className="btn btn-ghost" onClick={resetForm}>
                Cancel
              </button>
            )}
            <button className="btn btn-primary" type="submit">
              {editingId ? 'Save Changes' : 'Add Note'}
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="panel-loading"><span className="spinner"></span> Loading notes…</div>
      ) : notes.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">📝</div>
          <p>No notes yet — write your first one above.</p>
        </div>
      ) : (
        <div className="notes-grid">
          {notes.map((note) => (
            <div key={note._id} className="card note-card">
              <div className="note-card-header">
                <h3>{note.title}</h3>
                <button
                  className={`pin-btn ${note.pinned ? 'pin-btn-active' : ''}`}
                  onClick={() => togglePin(note)}
                  aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                >
                  📌
                </button>
              </div>
              {note.content && <p className="note-card-content">{note.content}</p>}
              <div className="note-card-actions">
                <button className="btn btn-ghost note-edit-btn" onClick={() => startEdit(note)}>Edit</button>
                <button className="btn-danger" onClick={() => remove(note._id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
