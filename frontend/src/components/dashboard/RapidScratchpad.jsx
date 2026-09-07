import { useCallback, useEffect, useRef, useState } from 'react';
import { Zap, FileText, Trash2 } from 'lucide-react';
import taskService from '../../services/taskService';
import noteService from '../../services/noteService';
import './RapidScratchpad.css';

const LS_KEY = 'lv_scratchpad';

function load() {
  return localStorage.getItem(LS_KEY) || '';
}

export default function RapidScratchpad({ onTaskAdded }) {
  const [text, setText]           = useState(load);
  const [feedback, setFeedback]   = useState('');
  const [clearing, setClearing]   = useState(false);
  const textareaRef               = useRef(null);
  const debounceRef               = useRef(null);

  // Auto-save on every keystroke (debounced 300ms)
  const handleChange = (e) => {
    const val = e.target.value;
    setText(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      localStorage.setItem(LS_KEY, val);
    }, 300);
  };

  // Cleanup debounce on unmount
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const flash = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 2500);
  };

  // Extract last non-empty line (or selected text)
  const getActiveContent = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return text.trim();
    const { selectionStart, selectionEnd } = el;
    if (selectionStart !== selectionEnd) {
      return text.slice(selectionStart, selectionEnd).trim();
    }
    // Fall back to the last non-empty line before the cursor
    const before = text.slice(0, selectionEnd);
    const lines   = before.split('\n').filter(l => l.trim());
    return lines[lines.length - 1]?.trim() || text.trim();
  }, [text]);

  const convertToTask = async () => {
    const content = getActiveContent();
    if (!content) { flash('❌ Nothing to convert — type or select text first'); return; }
    try {
      await taskService.createTask({ text: content, priority: 'medium' });
      flash(`✅ Task added: "${content.slice(0, 40)}"`);
      onTaskAdded?.();
    } catch {
      flash('❌ Failed to add task — is backend running?');
    }
  };

  const sendToNotes = async () => {
    const content = text.trim();
    if (!content) { flash('❌ Scratchpad is empty'); return; }
    try {
      const title = `Scratchpad – ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
      await noteService.createNote(title, content);
      flash('📝 Sent to Notes as a new draft!');
    } catch {
      flash('❌ Failed to create note');
    }
  };

  const handleClear = () => {
    if (!clearing) { setClearing(true); flash('Click Clear again to confirm'); return; }
    setText('');
    localStorage.removeItem(LS_KEY);
    setClearing(false);
    setFeedback('');
  };

  const charCount = text.length;

  return (
    <div className="card panel rsp-card">
      <div className="rsp-header">
        <div>
          <p className="panel-eyebrow m-0">⚡ Quick Scratchpad</p>
          <p className="rsp-sub">Capture thoughts immediately without leaving focus</p>
        </div>
        <span className="rsp-chars">{charCount > 0 ? `${charCount} chars` : ''}</span>
      </div>

      <textarea
        ref={textareaRef}
        className="rsp-textarea"
        placeholder={
          "Brain dump anything here…\n\n" +
          "• Ideas, distractions, later-tasks\n" +
          "• Select text → Convert to Task\n" +
          "• Ctrl+Enter to convert last line"
        }
        value={text}
        onChange={handleChange}
        onKeyDown={e => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            convertToTask();
          }
        }}
        aria-label="Scratchpad — brain dump area"
        spellCheck={false}
      />

      {feedback && (
        <div className={`rsp-feedback ${feedback.startsWith('❌') ? 'rsp-feedback-error' : ''}`} role="status">
          {feedback}
        </div>
      )}

      <div className="rsp-actions">
        <button className="btn btn-secondary btn-sm rsp-btn" onClick={convertToTask} title="Ctrl+Enter">
          <Zap size={13} /> Convert to Task
        </button>
        <button className="btn btn-ghost btn-sm rsp-btn" onClick={sendToNotes}>
          <FileText size={13} /> Send to Notes
        </button>
        <button
          className={`btn btn-ghost btn-sm rsp-btn rsp-clear ${clearing ? 'rsp-clear-confirm' : ''}`}
          onClick={handleClear}
          disabled={!text}
        >
          <Trash2 size={13} /> {clearing ? 'Confirm?' : 'Clear'}
        </button>
      </div>
    </div>
  );
}
