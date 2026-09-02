import api from '../api/axiosConfig';

// messages: [{ role: 'user' | 'assistant', content: string }]

const sendMessage = async (messages, includeContext) =>
  (await api.post('/ai/chat', { messages, includeContext })).data;

const API_BASE = api.defaults.baseURL || '/api';

// Auth is stored as { token, ... } under 'lifevault_user', not a plain
// 'token' key — matching exactly what axiosConfig.js's interceptor reads.
const getToken = () => {
  const stored = localStorage.getItem('lifevault_user');
  if (!stored) return null;
  try {
    return JSON.parse(stored).token || null;
  } catch {
    return null;
  }
};

async function streamMessage(messages, includeContext, { onToken, onDone, onError }) {
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
      body: JSON.stringify({ messages, includeContext }),
    });
  } catch {
    onError('Could not reach the server. Please check your connection.');
    return;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || contentType.includes('application/json')) {
    const data = await response.json().catch(() => ({}));
    onError(data.error || 'Life AI could not respond. Please try again.');
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

        if (type === 'token') onToken(payload.token);
        else if (type === 'done') { sawEnd = true; onDone(); }
        else if (type === 'error') { sawEnd = true; onError(payload.error); }
      }
    }
    if (!sawEnd) {
      onError('Connection to Life AI was interrupted. Please try again.');
    }
  } catch {
    onError('Connection to Life AI was interrupted. Please try again.');
  }
}

export default { sendMessage, streamMessage };