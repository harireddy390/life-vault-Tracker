import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import taskService from '../services/taskService';
import goalService from '../services/goalService';
import documentService from '../services/documentService';
import expenseService from '../services/expenseService';
import aiService from '../services/aiService';
import MarkdownLite from '../components/MarkdownLite';
import './LifeAI.css';

const SUGGESTED_PROMPTS = [
  'Explain recursion like I\u2019m 12',
  'Help me plan my day',
  'Give me 5 coding practice problems',
  'Summarize my active goals',
];

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
          taskService.getTasks(), goalService.getGoals(), documentService.getDocuments(), expenseService.getExpenses(),
        ]);
        setTasks(t); setGoals(g); setDocs(d); setExpenses(e);
      } finally { setLoading(false); }
    })();
  }, []);

  const activeTasks = tasks.filter((t) => !t.completed);
  const overdue = activeTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date());
  const activeGoals = goals.filter((g) => g.status === 'active');
  const stalledGoals = activeGoals.filter((g) => g.currentValue / g.targetValue < 0.3);
  const now = new Date();
  const monthSpend = expenses.filter((e) => e.type === 'expense' && new Date(e.date).getMonth() === now.getMonth()).reduce((s, e) => s + e.amount, 0);

  const insights = [];
  if (overdue.length > 0) insights.push({ icon: '\u23F0', title: `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`, body: overdue.slice(0, 3).map((t) => t.text).join(', '), action: { to: '/planner', label: 'Review in Planner' } });
  if (activeTasks.length > 0) insights.push({ icon: '\u2705', title: `${activeTasks.length} active task${activeTasks.length > 1 ? 's' : ''}`, body: 'Highest priority first is usually fastest through a long list.', action: { to: '/planner', label: 'Open Planner' } });
  if (stalledGoals.length > 0) insights.push({ icon: '\u{1F3AF}', title: `${stalledGoals.length} goal${stalledGoals.length > 1 ? 's' : ''} under 30% progress`, body: stalledGoals.map((g) => g.title).join(', '), action: { to: '/goals', label: 'View Goals' } });
  if (docs.length === 0) insights.push({ icon: '\u{1F5C2}\uFE0F', title: 'Your Vault is empty', body: 'Upload key documents so they\u2019re always findable.', action: { to: '/vault', label: 'Upload a Document' } });
  if (monthSpend > 0) insights.push({ icon: '\u{1F4B0}', title: `\u20B9${monthSpend.toLocaleString()} spent this month`, body: 'Check Finance for the category breakdown.', action: { to: '/finance', label: 'Open Finance' } });
  if (insights.length === 0 && !loading) insights.push({ icon: '\u2728', title: "You're all caught up", body: 'No overdue tasks, no stalled goals.', action: null });

  return loading ? (
    <div className="panel-loading"><span className="spinner"></span> Analyzing your data…</div>
  ) : (
    <div className="insight-list">
      {insights.map((ins, i) => (
        <div key={i} className="card insight-card">
          <span className="insight-icon">{ins.icon}</span>
          <div className="insight-body">
            <p className="insight-title">{ins.title}</p>
            <p className="insight-text">{ins.body}</p>
          </div>
          {ins.action && <Link to={ins.action.to} className="btn btn-secondary insight-action">{ins.action.label}</Link>}
        </div>
      ))}
    </div>
  );
}

function ChatBubble({ role, content }) {
  const [copied, setCopied] = useState(false);
  const isUser = role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className={`chat-bubble-row ${isUser ? 'chat-row-user' : ''}`}>
      <div className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
        {isUser ? content : <MarkdownLite text={content} />}
        {!isUser && (
          <button type="button" className="chat-copy-btn" onClick={handleCopy} aria-label="Copy response">
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  );
}

function ChatTab() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [includeContext, setIncludeContext] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    if (!input && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    setError('');
    const nextMessages = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    try {
      const { reply } = await aiService.sendMessage(nextMessages, includeContext);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Life AI couldn\u2019t respond just now \u2014 please try again in a moment.'
      );
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e) => { e.preventDefault(); send(); };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setError('');
  };

  return (
    <div className="chat-tab">
      <div className="chat-toolbar">
        <label className="chat-context-toggle">
          <input type="checkbox" checked={includeContext} onChange={(e) => setIncludeContext(e.target.checked)} />
          Let Life AI see my active tasks and goals for this conversation
        </label>
        <button type="button" className="chat-new-btn" onClick={startNewChat} disabled={messages.length === 0 && !error}>
          New chat
        </button>
      </div>

      <div className="chat-messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="chat-empty">
            <p className="chat-empty-title">Ask anything.</p>
            <div className="chat-suggestions">
              {SUGGESTED_PROMPTS.map((p) => (
                <button key={p} className="chat-suggestion-btn" onClick={() => send(p)}>{p}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role} content={m.content} />
        ))}
        {sending && (
          <div className="chat-bubble-row">
            <div className="chat-bubble chat-bubble-ai chat-typing"><span className="spinner"></span> Thinking…</div>
          </div>
        )}
        {error && <div className="chat-error">{error}</div>}
      </div>

      <form className="chat-input-row" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          placeholder="Ask anything… (Enter to send, Shift+Enter for a new line)"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={sending}
          rows={1}
        />
        <button className="btn btn-primary" type="submit" disabled={sending || !input.trim()}>Send</button>
      </form>
    </div>
  );
}

export default function LifeAI() {
  const [tab, setTab] = useState('chat');

  return (
    <div className="lifeai-page">
      <div className="page-header">
        <h1>{'\u2728'} Life AI</h1>
        <p className="page-subtitle">
          Chat is a real conversation with an LLM (Groq), run through your own backend — your API key never touches
          the browser. Insights below are separate: honest, rule-based summaries of your real data, not AI-generated.
        </p>
      </div>

      <div className="lifeai-tabs">
        <button className={`lifeai-tab ${tab === 'chat' ? 'lifeai-tab-active' : ''}`} onClick={() => setTab('chat')}>Chat</button>
        <button className={`lifeai-tab ${tab === 'insights' ? 'lifeai-tab-active' : ''}`} onClick={() => setTab('insights')}>Insights</button>
      </div>

      {tab === 'chat' ? <ChatTab /> : <InsightsTab />}
    </div>
  );
}