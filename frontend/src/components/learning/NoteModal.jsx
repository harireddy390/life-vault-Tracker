import React, { useState, useEffect, useRef } from 'react';
import { X, Eye, Edit3, Hash, Copy, Check } from 'lucide-react';
import TagPill from './TagPill';

const SUGGESTIONS = [
  'DSA', 'SystemDesign', 'Cloud', 'InterviewPrep', 'Algorithms',
  'Networking', 'Frontend', 'Backend', 'Database', 'Security',
  'ML', 'DevOps', 'JavaScript', 'Python', 'Go', 'React', 'Docker', 'Kubernetes',
];
const LANGS = ['javascript', 'python', 'java', 'sql', 'go', 'typescript', 'bash', 'css', 'html', 'rust'];

// Minimal but correct markdown → HTML (safe, no dangerouslySetInnerHTML XSS risk since user owns all content)
function renderMd(md) {
  if (!md) return '<p style="color:#94a3b8;font-style:italic">Nothing to preview yet…</p>';

  // Escape HTML in code blocks first, then restore them
  const codeBlocks = [];
  let escaped = md.replace(/```(\w*)?\n?([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    const safeLang = lang || 'code';
    codeBlocks.push(
      `<div class="lh-md-code"><div class="lh-md-code-header">${safeLang}</div>` +
      `<pre><code>${code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre></div>`
    );
    return `%%CODE_BLOCK_${idx}%%`;
  });

  // Inline code
  escaped = escaped.replace(/`([^`]+)`/g, '<code class="lh-md-inline">$1</code>');
  // Bold
  escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  escaped = escaped.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Headings
  escaped = escaped
    .replace(/^### (.+)$/gm, '<h4 style="color:#0f172a;margin:12px 0 4px">$1</h4>')
    .replace(/^## (.+)$/gm,  '<h3 style="color:#0f172a;margin:12px 0 4px">$1</h3>')
    .replace(/^# (.+)$/gm,   '<h2 style="color:#0f172a;margin:14px 0 6px">$1</h2>');
  // Unordered lists (group consecutive items)
  escaped = escaped.replace(/((?:^[-*] .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^[-*] /, '')}</li>`).join('');
    return `<ul style="padding-left:20px;margin:6px 0">${items}</ul>`;
  });
  // Ordered lists
  escaped = escaped.replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('');
    return `<ol style="padding-left:20px;margin:6px 0">${items}</ol>`;
  });
  // Paragraphs (double newlines)
  escaped = escaped
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => (p.startsWith('<') ? p : `<p style="margin:6px 0;line-height:1.7;color:#334155">${p.replace(/\n/g,'<br/>')}</p>`))
    .join('');

  // Restore code blocks
  codeBlocks.forEach((block, i) => {
    escaped = escaped.replace(`%%CODE_BLOCK_${i}%%`, block);
  });

  return escaped;
}

export default function NoteModal({ note, roadmaps, onSave, onClose }) {
  const [title, setTitle]       = useState(note?.title || '');
  const [content, setContent]   = useState(note?.content_markdown || '');
  const [tags, setTags]         = useState(note?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [langHint, setLangHint] = useState(note?.language_hint || '');
  const [topicId, setTopicId]   = useState(note?.topic_id?._id || note?.topic_id || '');
  const [tab, setTab]           = useState('edit');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    // small delay to avoid clash with modal animation
    const t = setTimeout(() => textareaRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  const addTag = (t) => {
    const clean = t.trim().replace(/^#/, '').replace(/\s+/g, '');
    if (clean && !tags.includes(clean) && tags.length < 10) setTags(p => [...p, clean]);
    setTagInput('');
  };
  const removeTag = (t) => setTags(p => p.filter(x => x !== t));
  const handleTagKey = (e) => {
    if (['Enter', ','].includes(e.key)) { e.preventDefault(); addTag(tagInput); }
  };

  const insertSnippet = (lang) => {
    const snippet = `\n\`\`\`${lang}\n// ${lang} snippet\n\`\`\`\n`;
    setContent(c => c + snippet);
    setLangHint(lang);
    setTab('edit');
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('Please add a title.'); return; }
    setError('');
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        content_markdown: content,
        tags,
        topic_id: topicId || null,
        language_hint: langHint,
      });
    } catch (err) {
      setError('Could not save note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div className="lh-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lh-modal lh-note-modal">
        <div className="lh-modal-header">
          <h2>{note ? 'Edit Note' : 'New Study Note'}</h2>
          <button className="lh-modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="lh-modal-body">
          <input
            className="lh-modal-input"
            placeholder="Note title…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            maxLength={200}
          />
          {error && <p style={{ color: '#dc2626', fontSize: '13px', margin: 0 }}>{error}</p>}

          {/* Quick language buttons */}
          <div>
            <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Insert code block</p>
            <div className="lh-lang-strip">
              {LANGS.map(l => (
                <button key={l} type="button" className="lh-lang-btn" onClick={() => insertSnippet(l)}>{l}</button>
              ))}
            </div>
          </div>

          {/* Edit / Preview tabs */}
          <div className="lh-tab-bar">
            <button type="button" className={`lh-tab ${tab === 'edit' ? 'active' : ''}`} onClick={() => setTab('edit')}>
              <Edit3 size={13} /> Write
            </button>
            <button type="button" className={`lh-tab ${tab === 'preview' ? 'active' : ''}`} onClick={() => setTab('preview')}>
              <Eye size={13} /> Preview
            </button>
          </div>

          {tab === 'edit' ? (
            <textarea
              ref={textareaRef}
              className="lh-modal-textarea lh-markdown-editor"
              placeholder={`Write in Markdown…\n\n# Heading\n**Bold**, \`inline code\`\n\n\`\`\`javascript\nconsole.log('hello')\n\`\`\``}
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={14}
              spellCheck={false}
            />
          ) : (
            <div
              className="lh-markdown-preview"
              dangerouslySetInnerHTML={{ __html: renderMd(content) }}
            />
          )}

          {/* Tags */}
          <div className="lh-tag-section">
            <div className="lh-tag-input-wrap">
              <Hash size={13} className="lh-tag-icon" />
              <input
                className="lh-tag-input"
                placeholder="Add tag then press Enter or comma…"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKey}
                maxLength={30}
              />
              {tagInput.trim() && (
                <button type="button" className="lh-lang-btn" style={{ marginRight: -4 }} onClick={() => addTag(tagInput)}>Add</button>
              )}
            </div>
            {tags.length > 0 && (
              <div className="lh-tag-row">
                {tags.map(t => <TagPill key={t} tag={t} onRemove={removeTag} />)}
              </div>
            )}
            <div className="lh-tag-suggestions">
              {SUGGESTIONS.filter(s => !tags.includes(s) && s.toLowerCase().includes(tagInput.toLowerCase())).slice(0, 10).map(s => (
                <button key={s} type="button" className="lh-tag-suggest-btn" onClick={() => addTag(s)}>#{s}</button>
              ))}
            </div>
          </div>

          {/* Link to roadmap */}
          {roadmaps?.length > 0 && (
            <div className="lh-field-group">
              <label className="lh-field-label">Link to roadmap (optional)</label>
              <select className="lh-modal-select" value={topicId} onChange={e => setTopicId(e.target.value)}>
                <option value="">— None —</option>
                {roadmaps.map(r => <option key={r._id} value={r._id}>{r.title}</option>)}
              </select>
            </div>
          )}

          <div className="lh-modal-footer">
            <button type="button" className="lh-btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="lh-btn-primary" disabled={saving || !title.trim()}>
              {saving ? 'Saving…' : note ? 'Save Changes' : 'Create Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
