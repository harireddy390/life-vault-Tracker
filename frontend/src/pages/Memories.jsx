import { useEffect, useRef, useState } from 'react';
import memoryService from '../services/memoryService';
import Toast from '../components/Toast';
import MemoryMedia from '../components/MemoryMedia';
import './Memories.css';

const CATEGORIES = ['achievement', 'trip', 'project', 'milestone', 'other'];
const CATEGORY_ICON = { achievement: '\u{1F3C6}', trip: '\u2708\uFE0F', project: '\u{1F4BB}', milestone: '\u{1F3AF}', other: '\u{1F4CC}' };
const MAX_FILES = 6;
const MAX_SIZE_MB = 50;

export default function Memories() {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', date: '', category: 'other' });
  const [uploadingFor, setUploadingFor] = useState(null); // memory id currently uploading media to
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRefs = useRef({});

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { setMemories(await memoryService.getMemories()); }
    catch { showToast('Could not load memories.', 'error'); }
    finally { setLoading(false); }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2800);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date) return;
    try {
      const created = await memoryService.createMemory(form);
      setMemories((prev) => [created, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date)));
      setForm({ title: '', description: '', date: '', category: 'other' });
      setShowForm(false);
      showToast('Memory added.');
    } catch { showToast('Could not add memory.', 'error'); }
  };

  const remove = async (id) => {
    await memoryService.deleteMemory(id);
    setMemories((prev) => prev.filter((m) => m._id !== id));
  };

  const triggerFilePicker = (memoryId) => {
    fileInputRefs.current[memoryId]?.click();
  };

  const handleMediaSelect = async (memoryId, fileList) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    if (files.length > MAX_FILES) {
      showToast(`Pick up to ${MAX_FILES} files at a time.`, 'error');
      return;
    }
    const oversize = files.find((f) => f.size > MAX_SIZE_MB * 1024 * 1024);
    if (oversize) {
      showToast(`"${oversize.name}" is over the ${MAX_SIZE_MB}MB limit.`, 'error');
      return;
    }

    setUploadingFor(memoryId);
    setUploadProgress(0);
    try {
      const updated = await memoryService.uploadMedia(memoryId, files, setUploadProgress);
      setMemories((prev) => prev.map((m) => (m._id === memoryId ? updated : m)));
      showToast('Media added.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Upload failed.', 'error');
    } finally {
      setUploadingFor(null);
      setUploadProgress(0);
    }
  };

  const removeMedia = async (memoryId, mediaId) => {
    const updated = await memoryService.deleteMedia(memoryId, mediaId);
    setMemories((prev) => prev.map((m) => (m._id === memoryId ? updated : m)));
  };

  const byYear = memories.reduce((acc, m) => {
    const year = new Date(m.date).getFullYear();
    acc[year] = acc[year] || [];
    acc[year].push(m);
    return acc;
  }, {});
  const years = Object.keys(byYear).sort((a, b) => b - a);

  return (
    <div className="memories-page">
      <Toast message={toast?.message} type={toast?.type} />
      <div className="page-header goals-header">
        <div>
          <h1>Memories</h1>
          <p className="page-subtitle">Your story, in order — with photos and videos.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : '+ Add Memory'}</button>
      </div>

      {showForm && (
        <form className="card memory-form" onSubmit={handleAdd}>
          <input className="input" placeholder="What happened?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="input" rows={2} placeholder="Details (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="memory-form-row">
            <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" type="submit">Save Memory</button>
          <p className="memory-form-hint">You can attach photos/videos right after saving.</p>
        </form>
      )}

      {loading ? (
        <div className="panel-loading"><span className="spinner"></span> Loading…</div>
      ) : memories.length === 0 ? (
        <div className="card empty-state"><div className="empty-icon">{'\u{1F4F8}'}</div><p>Your story starts here.</p></div>
      ) : (
        <div className="timeline">
          {years.map((year) => (
            <div key={year} className="timeline-year-group">
              <p className="timeline-year">{year}</p>
              {byYear[year].map((m) => (
                <div key={m._id} className="card timeline-item">
                  <span className="timeline-icon">{CATEGORY_ICON[m.category]}</span>
                  <div className="timeline-content">
                    <div className="timeline-content-top">
                      <p className="timeline-title">{m.title}</p>
                      <span className="timeline-date">{new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    {m.description && <p className="timeline-desc">{m.description}</p>}

                    {m.media && m.media.length > 0 && (
                      <div className="memory-media-grid">
                        {m.media.map((media) => (
                          <MemoryMedia key={media._id} memoryId={m._id} media={media} onDelete={(mediaId) => removeMedia(m._id, mediaId)} />
                        ))}
                      </div>
                    )}

                    {uploadingFor === m._id && (
                      <div className="memory-upload-progress">
                        <div className="upload-progress-bar"><div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }} /></div>
                        <p>Uploading… {uploadProgress}%</p>
                      </div>
                    )}

                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      style={{ display: 'none' }}
                      ref={(el) => (fileInputRefs.current[m._id] = el)}
                      onChange={(e) => { handleMediaSelect(m._id, e.target.files); e.target.value = ''; }}
                    />
                    <button className="btn btn-ghost memory-add-media-btn" onClick={() => triggerFilePicker(m._id)} disabled={uploadingFor === m._id}>
                      + Add Photos/Videos
                    </button>
                  </div>
                  <button className="btn-danger" onClick={() => remove(m._id)}>Delete</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
