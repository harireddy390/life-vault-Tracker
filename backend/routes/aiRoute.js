const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Task = require('../models/tasks');
const Goal = require('../models/goals');
const { getChatCompletion } = require('../services/aiService');

const BASE_SYSTEM_PROMPT = `You are Life AI, the assistant built into a personal
life-management app called Life Vault. Be helpful, clear, friendly, professional,
and concise but useful. Be patient with beginners. Never pretend to know
something you don't. Never invent personal data or fabricate database
information — only reference Life Vault data if it is explicitly provided to
you below. If you need to ask something, ask at most one concise clarifying
question. Match the user's language when practical. You do not have
real-time web access.`;

async function buildContext(userId) {
  const [tasks, goals] = await Promise.all([
    Task.find({ user: userId, completed: false }).limit(10),
    Goal.find({ user: userId, status: 'active' }).limit(10),
  ]);
  if (tasks.length === 0 && goals.length === 0) return '';
  let block = '\n\nThe user has shared this real data from their Life Vault — only use it if relevant:\n';
  if (tasks.length > 0) {
    block += `\nActive tasks:\n${tasks.map((t) => `- ${t.text} (${t.priority} priority)`).join('\n')}\n`;
  }
  if (goals.length > 0) {
    block += `\nActive goals:\n${goals.map((g) => `- ${g.title}: ${g.currentValue}/${g.targetValue}${g.unit}`).join('\n')}\n`;
  }
  return block;
}

// Safe, generic messages for the user — never leak provider error bodies,
// status details, or anything that could hint at the API key.
function mapErrorToSafeMessage(err) {
  switch (err.code) {
    case 'NO_API_KEY':
    case 'NO_MODEL':
      return 'AI configuration is missing on the server.';
    case 'NETWORK_ERROR':
      return 'Could not reach the AI service. Please try again.';
    case 'PROVIDER_ERROR':
      if (err.status === 401) return 'AI service authentication failed. Please contact the site owner.';
      if (err.status === 429) return 'Your AI request limit may have been reached. Please try again later.';
      if (err.status === 404) return 'The configured AI model was not found. Check GROQ_MODEL in backend/.env.';
      return 'AI service is temporarily unavailable. Please try again.';
    case 'BAD_RESPONSE':
      return 'Received an unexpected response from the AI service.';
    default:
      return 'AI service is temporarily unavailable. Please try again.';
  }
}

// Guards against double-submit (double-click Send, frontend retry loops,
// etc.) — one in-flight AI request per user at a time.
const pendingByUser = new Set();

router.post('/chat', protect, async (req, res) => {
  const userId = req.user.id;
  try {
    const { messages, includeContext } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'Please provide at least one message.' });
    }
    if (messages.length > 50) {
      return res.status(400).json({ success: false, error: 'This conversation is too long for one request.' });
    }
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.content || !String(lastMessage.content).trim()) {
      return res.status(400).json({ success: false, error: 'Message cannot be empty.' });
    }

    if (pendingByUser.has(userId)) {
      return res.status(429).json({ success: false, error: 'Please wait for the current response to finish.' });
    }
    pendingByUser.add(userId);

    let reply;
    try {
      const contextBlock = includeContext ? await buildContext(userId) : '';
      reply = await getChatCompletion(messages, BASE_SYSTEM_PROMPT + contextBlock);
    } catch (err) {
      pendingByUser.delete(userId);
      const status = err.status === 429 ? 429 : 502;
      return res.status(status).json({ success: false, error: mapErrorToSafeMessage(err) });
    }

    pendingByUser.delete(userId);
    res.status(200).json({ success: true, reply, usedContext: Boolean(includeContext) });
  } catch (error) {
    pendingByUser.delete(userId);
    console.error('[aiRoute] Unexpected error:', error.message);
    res.status(500).json({ success: false, error: 'AI service is temporarily unavailable. Please try again.' });
  }
});

module.exports = router;