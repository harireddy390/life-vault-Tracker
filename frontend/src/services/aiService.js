import api from '../api/axiosConfig';

const API_BASE = api.defaults.baseURL || '/api';

const getToken = () => {
  const stored = localStorage.getItem('lifevault_user');
  if (!stored) return null;
  try {
    return JSON.parse(stored).token || null;
  } catch {
    return null;
  }
};

// Conversation API
const getConversations = async (query = '') => {
  const params = query ? { q: query } : {};
  const res = await api.get('/ai/conversations', { params });
  return res.data;
};

const getConversation = async (id) => {
  const res = await api.get(`/ai/conversations/${id}`);
  return res.data;
};

const createConversation = async (title = 'New Conversation') => {
  const res = await api.post('/ai/conversations', { title });
  return res.data;
};

const renameConversation = async (id, title) => {
  const res = await api.patch(`/ai/conversations/${id}`, { title });
  return res.data;
};

const deleteConversation = async (id) => {
  const res = await api.delete(`/ai/conversations/${id}`);
  return res.data;
};

// Attachment Upload API
const uploadAttachment = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await api.post('/ai/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// SSE Streaming Message API
async function streamMessage({
  conversationId,
  messages,
  attachments = [],
  includeContext = false,
  noteId = null,
  onToken,
  onConversation,
  onDone,
  onError,
  signal,
}) {
  const token = getToken();
  if (!token) {
    onError('You appear to be signed out. Please log in again.');
    return;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        conversationId,
        messages,
        attachments,
        includeContext,
        noteId,
      }),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      onDone();
      return;
    }
    onError('Could not reach the server. Please check your connection.');
    return;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || contentType.includes('application/json')) {
    const data = await response.json().catch(() => ({}));
    onError(data.error || data.message || 'Life AI could not respond. Please try again.');
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sawEnd = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop();

      for (const raw of events) {
        const eventMatch = raw.match(/^event:\s*(\w+)/m);
        const dataMatch = raw.match(/^data:\s*(.+)$/m);
        if (!eventMatch || !dataMatch) continue;

        const type = eventMatch[1];
        let payload;
        try {
          payload = JSON.parse(dataMatch[1]);
        } catch {
          continue;
        }

        if (type === 'token') {
          onToken?.(payload.token);
        } else if (type === 'conversation') {
          onConversation?.(payload);
        } else if (type === 'done') {
          sawEnd = true;
          onDone?.(payload);
        } else if (type === 'error') {
          sawEnd = true;
          onError?.(payload.error);
        }
      }
    }

    if (!sawEnd) {
      onDone?.({});
    }
  } catch (readErr) {
    if (readErr.name === 'AbortError') {
      onDone?.({});
      return;
    }
    onError?.('Connection to Life AI was interrupted. Please try again.');
  }
}

export default {
  getConversations,
  getConversation,
  createConversation,
  renameConversation,
  deleteConversation,
  uploadAttachment,
  streamMessage,
};