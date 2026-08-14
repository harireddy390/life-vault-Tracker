import api from '../api/axiosConfig';

// messages: [{ role: 'user' | 'assistant', content: string }]
const sendMessage = async (messages, includeContext) =>
  (await api.post('/ai/chat', { messages, includeContext })).data;

export default { sendMessage };
