import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import taskService from '../services/taskService';
import goalService from '../services/goalService';
import documentService from '../services/documentService';
import expenseService from '../services/expenseService';
import noteService from '../services/noteService';
import aiService from '../services/aiService';
import MarkdownLite from '../components/MarkdownLite';
import './LifeAI.css';

import { FaFileLines, FaImage, FaNoteSticky } from 'react-icons/fa6';

import { FaEdit, FaTrash } from 'react-icons/fa';

const SUGGESTED_PROMPTS = [
  'What should I focus on today based on my active tasks & goals?',
  'Help me plan a productive routine for this week',
  'Review my habit streak and give me improvement tips',
  'Analyze my financial habits and suggest ways to save',
];

const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/json',
  'text/markdown',
];

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// =========================================================================
// INSIGHTS TAB (Preserved original rule-based analysis)
// =========================================================================
function InsightsTab() {
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [docs, setDocs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [t, g, d, e] = await Promise.all([
          taskService.getTasks(),
          goalService.getGoals(),
          documentService.getDocuments(),
          expenseService.getExpenses(),
        ]);
        setTasks(t);
        setGoals(g);
        setDocs(d);
        setExpenses(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeTasks = tasks.filter((t) => !t.completed);
  const overdue = activeTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date());
  const activeGoals = goals.filter((g) => g.status === 'active');
  const stalledGoals = activeGoals.filter((g) => g.currentValue / g.targetValue < 0.3);
  const now = new Date();
  const monthSpend = expenses
    .filter((e) => e.type === 'expense' && new Date(e.date).getMonth() === now.getMonth())
    .reduce((s, e) => s + e.amount, 0);

  const insights = [];
  if (overdue.length > 0)
    insights.push({
      icon: '⏰',
      title: `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`,
      body: overdue.slice(0, 3).map((t) => t.text).join(', '),
      action: { to: '/planner', label: 'Review in Planner' },
    });
  if (activeTasks.length > 0)
    insights.push({
      icon: '✅',
      title: `${activeTasks.length} active task${activeTasks.length > 1 ? 's' : ''}`,
      body: 'Focusing on your high-priority items first will yield the best momentum today.',
      action: { to: '/planner', label: 'Open Planner' },
    });
  if (stalledGoals.length > 0)
    insights.push({
      icon: '🎯',
      title: `${stalledGoals.length} goal${stalledGoals.length > 1 ? 's' : ''} under 30% progress`,
      body: stalledGoals.map((g) => g.title).join(', '),
      action: { to: '/goals', label: 'View Goals' },
    });
  if (docs.length === 0)
    insights.push({
      icon: '🗂️',
      title: 'Your Vault is empty',
      body: 'Upload key certificates, IDs, and records so they are secure and findable.',
      action: { to: '/vault', label: 'Upload a Document' },
    });
  if (monthSpend > 0)
    insights.push({
      icon: '💰',
      title: `₹${monthSpend.toLocaleString()} spent this month`,
      body: 'Track your spending distribution in Finance.',
      action: { to: '/finance', label: 'Open Finance' },
    });
  if (insights.length === 0 && !loading)
    insights.push({
      icon: '✨',
      title: "You're all caught up",
      body: 'No overdue tasks, active habits on schedule, and steady progress.',
      action: null,
    });

  return loading ? (
    <div className="panel-loading"><span className="spinner"></span> Analyzing your Life Vault data…</div>
  ) : (
    <div className="insight-list">
      {insights.map((ins, i) => (
        <div key={i} className="card insight-card">
          <span className="insight-icon">{ins.icon}</span>
          <div className="insight-body">
            <p className="insight-title">{ins.title}</p>
            <p className="insight-text">{ins.body}</p>
          </div>
          {ins.action && (
            <Link to={ins.action.to} className="btn btn-secondary insight-action">
              {ins.action.label}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}

// =========================================================================
// CHAT BUBBLE COMPONENT
// =========================================================================
function ChatBubble({
  message,
  isStreaming,
  onCopy,
  onRegenerate,
  canRegenerate,
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const showTypingDots = !isUser && isStreaming && (!message.content || message.content.length === 0);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      onCopy?.();
    } catch { }
  };

  return (
    <div className={`chat-bubble-row ${isUser ? 'chat-row-user' : 'chat-row-ai'}`}>
      {!isUser && <div className="chat-avatar-ai">✨</div>}

      <div className="chat-bubble-content-wrap">
        {/* Attachments rendering if message has attachments */}
        {isUser && message.attachments && message.attachments.length > 0 && (
          <div className="chat-bubble-attachments">
            {message.attachments.map((att, idx) => (
              <div key={idx} className="bubble-att-chip">
                {att.attachmentType === 'image' ? (
                  <span className="bubble-att-icon">🖼️</span>
                ) : (
                  <span className="bubble-att-icon">📄</span>
                )}
                <span className="bubble-att-name">{att.originalName}</span>
                {att.size > 0 && <span className="bubble-att-size">({formatBytes(att.size)})</span>}
              </div>
            ))}
          </div>
        )}

        <div className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
          {showTypingDots ? (
            <span className="chat-typing-dots">
              <span></span><span></span><span></span>
            </span>
          ) : isUser ? (
            <p className="user-message-text">{message.content}</p>
          ) : (
            <>
              <MarkdownLite text={message.content} />
              {isStreaming && <span className="chat-cursor" aria-hidden="true" />}
            </>
          )}
        </div>

        {/* Action toolbar below AI bubble */}
        {!isUser && !isStreaming && message.content && (
          <div className="chat-bubble-actions">
            <button
              type="button"
              className="chat-action-btn"
              onClick={handleCopy}
              title="Copy response"
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
            {canRegenerate && (
              <button
                type="button"
                className="chat-action-btn"
                onClick={onRegenerate}
                title="Regenerate this response"
              >
                🔄 Regenerate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// ATTACHMENT MENU MODAL / DROPDOWN
// =========================================================================
function AttachMenu({ notes, onPickDocument, onPickImage, onPickNote, onClose }) {
  const [showNotes, setShowNotes] = useState(false);

  return (
    <div className="attach-menu" onMouseLeave={onClose}>
      {!showNotes ? (
        <>
          <button type="button" className="attach-menu-item" onClick={onPickDocument}>
            <span className="attach-icon"><FaFileLines /></span>
            <div>
              <strong>Document / File</strong>
              <small>PDF, DOCX, TXT, CSV, JSON</small>
            </div>
          </button>
          <button type="button" className="attach-menu-item" onClick={onPickImage}>
            <span className="attach-icon"><FaImage /></span>
            <div>
              <strong>Photo / Screenshot</strong>
              <small>JPEG, PNG, WebP, GIF</small>
            </div>
          </button>
          <button type="button" className="attach-menu-item" onClick={() => setShowNotes(true)}>
            <span className="attach-icon"><FaNoteSticky /></span>
            <div>
              <strong>Life Vault Note</strong>
              <small>Attach an existing note</small>
            </div>
          </button>
        </>
      ) : (
        <div className="attach-note-list">
          <div className="attach-note-header">
            <button type="button" className="attach-back-btn" onClick={() => setShowNotes(false)}>
              ← Back
            </button>
            <span>Select a Note</span>
          </div>
          {notes.length === 0 ? (
            <p className="attach-note-empty">No notes found in your Vault.</p>
          ) : (
            notes.slice(0, 15).map((n) => (
              <button
                key={n._id}
                type="button"
                className="attach-menu-item"
                onClick={() => onPickNote(n)}
              >
                <span>{n.pinned ? '📌' : '📄'}</span>
                <span className="attach-note-title">{n.title || 'Untitled Note'}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// CONVERSATIONS SIDEBAR COMPONENT
// =========================================================================
function ConversationSidebar({
  conversations,
  activeId,
  searchQuery,
  onSearchChange,
  onSelect,
  onNew,
  onRename,
  onDelete,
  isOpen,
  onClose,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const startRename = (conv, e) => {
    e.stopPropagation();
    setEditingId(conv._id);
    setEditTitle(conv.title);
  };

  const saveRename = async (id, e) => {
    e?.stopPropagation();
    if (editTitle.trim()) {
      await onRename(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <aside className={`ai-sidebar ${isOpen ? 'ai-sidebar-open' : ''}`}>
      <div className="ai-sidebar-header">
        <button type="button" className="btn btn-primary ai-new-chat-btn" onClick={onNew}>
          <span>+</span> New Chat
        </button>
        <button type="button" className="ai-sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">
          ✕
        </button>
      </div>

      <div className="ai-sidebar-search">
        <input
          type="text"
          placeholder="Search conversations…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="ai-sidebar-list">
        {conversations.length === 0 ? (
          <div className="ai-sidebar-empty">
            {searchQuery ? 'No matching conversations' : 'No conversations yet'}
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv._id}
              className={`ai-conv-item ${conv._id === activeId ? 'ai-conv-active' : ''}`}
              onClick={() => {
                onSelect(conv._id);
                onClose?.();
              }}
            >
              {editingId === conv._id ? (
                <div className="ai-conv-edit" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editTitle}
                    autoFocus
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveRename(conv._id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                  <button type="button" onClick={(e) => saveRename(conv._id, e)}>✓</button>
                  <button type="button" onClick={() => setEditingId(null)}>✕</button>
                </div>
              ) : (
                <>
                  <div className="ai-conv-title-wrap">
                    <span className="ai-conv-icon">💬</span>
                    <span className="ai-conv-title" title={conv.title}>{conv.title}</span>
                  </div>
                  <div className="ai-conv-actions">
                    <button
                      type="button"
                      className="ai-conv-action-btn"
                      onClick={(e) => startRename(conv, e)}
                      title="Rename"
                    >
                      <FaEdit />
                    </button>
                    <button
                      type="button"
                      className="ai-conv-action-btn ai-conv-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Delete this conversation?')) {
                          onDelete(conv._id);
                        }
                      }}
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

// =========================================================================
// MAIN CHAT TAB WITH FULL MULTIMODAL & VOICE SUPPORT
// =========================================================================
function ChatTab() {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [includeContext, setIncludeContext] = useState(true);
  const [error, setError] = useState('');

  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [attachedNote, setAttachedNote] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [notes, setNotes] = useState([]);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const docInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const recognitionRef = useRef(null);

  // Load conversations on mount
  const loadConversations = useCallback(async (query = '') => {
    try {
      const list = await aiService.getConversations(query);
      setConversations(list);
      return list;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    loadConversations();
    noteService.getNotes().then(setNotes).catch(() => { });
  }, [loadConversations]);

  // Load active conversation details
  const selectConversation = async (id) => {
    setError('');
    setActiveConvId(id);
    try {
      const conv = await aiService.getConversation(id);
      setMessages(conv.messages || []);
      setIncludeContext(conv.systemContextIncluded ?? true);
    } catch {
      setError('Could not load conversation');
    }
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  // Reset textarea height on empty
  useEffect(() => {
    if (!input && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input]);

  // Setup Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = 'en-US';

      recog.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListening(false);
      };

      recog.onerror = (event) => {
        setIsListening(false);
        if (event.error !== 'no-speech') {
          setError(`Voice input error: ${event.error}`);
        }
      };

      recog.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recog;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      setError('Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        setIsListening(false);
        setError('Could not start voice recognition: ' + err.message);
      }
    }
  };

  // Handle uploading files (PDF, DOCX, images, etc.)
  const handleFileUpload = async (file) => {
    if (!file) return;
    setError('');
    setUploading(true);

    try {
      const att = await aiService.uploadAttachment(file);
      setPendingAttachments((prev) => [...prev, att]);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'File upload failed');
    } finally {
      setUploading(false);
      setShowAttachMenu(false);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const removeAttachment = (index) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const startNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setPendingAttachments([]);
    setAttachedNote(null);
    setError('');
    setInput('');
  };

  const handleRenameConv = async (id, newTitle) => {
    try {
      await aiService.renameConversation(id, newTitle);
      loadConversations(searchQuery);
    } catch {
      setError('Failed to rename conversation');
    }
  };

  const handleDeleteConv = async (id) => {
    try {
      await aiService.deleteConversation(id);
      if (activeConvId === id) {
        startNewChat();
      }
      loadConversations(searchQuery);
    } catch {
      setError('Failed to delete conversation');
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setSending(false);
    }
  };

  const send = async (textToSend) => {
    const content = (textToSend ?? input).trim();
    if ((!content && pendingAttachments.length === 0) || sending) return;
    setError('');

    const attachmentsToSend = [...pendingAttachments];
    const noteId = attachedNote?._id || null;

    const userMessage = {
      role: 'user',
      content,
      attachments: attachmentsToSend,
      createdAt: new Date(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages([...nextMessages, { role: 'assistant', content: '', createdAt: new Date() }]);
    setInput('');
    setPendingAttachments([]);
    setAttachedNote(null);
    setSending(true);

    abortControllerRef.current = new AbortController();

    let streamed = '';
    await aiService.streamMessage({
      conversationId: activeConvId,
      messages: nextMessages,
      attachments: attachmentsToSend,
      includeContext,
      noteId,
      signal: abortControllerRef.current.signal,
      onToken: (token) => {
        streamed += token;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: streamed,
            createdAt: new Date(),
          };
          return updated;
        });
      },
      onConversation: ({ conversationId }) => {
        if (!activeConvId) {
          setActiveConvId(conversationId);
          loadConversations(searchQuery);
        }
      },
      onDone: () => {
        setSending(false);
        loadConversations(searchQuery);
      },
      onError: (errorMessage) => {
        setError(errorMessage);
        setSending(false);
        setMessages((prev) => (prev[prev.length - 1]?.content === '' ? prev.slice(0, -1) : prev));
      },
    });
  };

  const handleRegenerate = () => {
    if (sending || messages.length === 0) return;
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIdx === -1) return;
    const actualIdx = messages.length - 1 - lastUserIdx;
    const userMsg = messages[actualIdx];
    // Remove the last assistant response and re-send
    setMessages(messages.slice(0, actualIdx));
    send(userMsg.content);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
    }
  };

  return (
    <div
      className={`chat-container ${dragOver ? 'chat-drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Mobile sidebar overlay */}
      {sidebarOpen && <div className="ai-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      {/* Conversations Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeId={activeConvId}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          loadConversations(q);
        }}
        onSelect={selectConversation}
        onNew={startNewChat}
        onRename={handleRenameConv}
        onDelete={handleDeleteConv}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Chat Panel */}
      <div className="chat-main-panel">
        {/* Chat Toolbar */}
        <div className="chat-toolbar">
          <button
            type="button"
            className="ai-history-toggle-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            title="Toggle Conversation History"
          >
            ☰ <span className="history-text">History</span>
          </button>

          <label className="chat-context-toggle" title="Let Life AI use your active tasks, habits, and goals">
            <input
              type="checkbox"
              checked={includeContext}
              onChange={(e) => setIncludeContext(e.target.checked)}
            />
            <span>Use my Life Vault data</span>
          </label>

          <button
            type="button"
            className="chat-new-btn"
            onClick={startNewChat}
            disabled={messages.length === 0 && !error}
          >
            + New Chat
          </button>
        </div>

        {/* Chat Message Scroll List */}
        <div className="chat-messages" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="chat-empty">
              <div className="chat-empty-icon">✨</div>
              <h2 className="chat-empty-title">Your Life, understood.</h2>
              <p className="chat-empty-subtitle">
                Ask Life AI anything about your daily routine, goals, notes, or attach documents & photos for deep analysis.
              </p>
              <div className="chat-suggestions">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button key={p} className="chat-suggestion-btn" onClick={() => send(p)}>
                    <span>💡</span> {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <ChatBubble
              key={i}
              message={m}
              isStreaming={sending && i === messages.length - 1 && m.role === 'assistant'}
              onRegenerate={handleRegenerate}
              canRegenerate={!sending && i === messages.length - 1 && m.role === 'assistant'}
            />
          ))}

          {error && (
            <div className="chat-error-banner">
              <span>⚠️ {error}</span>
              <button type="button" className="btn btn-secondary chat-retry-btn" onClick={() => send()}>
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Pending Attachment / Note Tray */}
        {(pendingAttachments.length > 0 || attachedNote || uploading) && (
          <div className="chat-attachment-preview">
            {uploading && (
              <div className="chat-attachment-chip chip-loading">
                <span className="spinner-small"></span> Uploading & extracting text…
              </div>
            )}

            {pendingAttachments.map((att, idx) => (
              <div key={idx} className="chat-attachment-chip">
                {att.attachmentType === 'image' ? (
                  <span className="attach-icon"><FaImage /></span>
                ) : (
                  <span className="chip-icon">📄</span>
                )}
                <span className="chip-name">{att.originalName}</span>
                <span className="chip-size">({formatBytes(att.size)})</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  aria-label="Remove attachment"
                >
                  &times;
                </button>
              </div>
            ))}

            {attachedNote && (
              <div className="chat-attachment-chip chip-note">
                <span className="chip-icon">📝</span>
                <span className="chip-name">{attachedNote.title || 'Untitled Note'}</span>
                <button
                  type="button"
                  onClick={() => setAttachedNote(null)}
                  aria-label="Remove note"
                >
                  &times;
                </button>
              </div>
            )}
          </div>
        )}

        {/* Drag Over Hint */}
        {dragOver && (
          <div className="chat-dropzone-indicator">
            📂 Drop your document or photo here to attach
          </div>
        )}

        {/* Composer Form */}
        <form
          className="chat-input-row"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          {/* Attachment button & menu */}
          <div className="chat-attach-wrap">
            <button
              type="button"
              className="chat-attach-btn"
              onClick={() => setShowAttachMenu((v) => !v)}
              aria-label="Attach File or Photo"
              title="Attach Document or Image"
            >
              📎
            </button>
            {showAttachMenu && (
              <AttachMenu
                notes={notes}
                onPickDocument={() => docInputRef.current?.click()}
                onPickImage={() => imageInputRef.current?.click()}
                onPickNote={(note) => {
                  setAttachedNote(note);
                  setShowAttachMenu(false);
                }}
                onClose={() => setShowAttachMenu(false)}
              />
            )}
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt,.csv,.json,.md"
              className="chat-file-input"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                e.target.value = '';
              }}
            />
            <input
              ref={imageInputRef}
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(',')}
              className="chat-file-input"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder={
              isListening
                ? 'Listening to your voice…'
                : 'Ask Life AI anything… (Enter to send, Shift+Enter for new line)'
            }
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={sending}
            rows={1}
          />

          {/* Voice input button */}
          <button
            type="button"
            className={`chat-voice-btn ${isListening ? 'chat-voice-active' : ''}`}
            onClick={toggleVoiceInput}
            title={isListening ? 'Stop voice recording' : 'Speak message'}
            aria-label="Voice input"
          >
            {isListening ? '🔴' : '🎤'}
          </button>

          {/* Send / Stop button */}
          {sending ? (
            <button
              type="button"
              className="btn btn-secondary chat-stop-btn"
              onClick={stopGeneration}
              title="Stop generating"
            >
              ⏹ Stop
            </button>
          ) : (
            <button
              type="submit"
              className="btn btn-primary chat-send-btn"
              disabled={!input.trim() && pendingAttachments.length === 0}
              title="Send message"
            >
              Send
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// LIFE AI MAIN PAGE
// =========================================================================
export default function LifeAI() {
  const [tab, setTab] = useState('chat');

  return (
    <div className="lifeai-page">
      <div className="page-header">
        <h1>✨ Life AI</h1>
        <p className="page-subtitle">
          Your multimodal personal intelligence. Ask questions, analyze documents & photos, inspect habits, or plan your life with personal Vault context.
        </p>
      </div>

      <div className="lifeai-tabs">
        <button
          className={`lifeai-tab ${tab === 'chat' ? 'lifeai-tab-active' : ''}`}
          onClick={() => setTab('chat')}
        >
          Assistant Chat
        </button>
        <button
          className={`lifeai-tab ${tab === 'insights' ? 'lifeai-tab-active' : ''}`}
          onClick={() => setTab('insights')}
        >
          Vault Insights
        </button>
      </div>

      {tab === 'chat' ? <ChatTab /> : <InsightsTab />}
    </div>
  );
}