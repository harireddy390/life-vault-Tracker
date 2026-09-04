const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Task = require('../models/tasks');
const Goal = require('../models/goals');
const Habit = require('../models/habits');
const Progress = require('../models/Progress');
const Note = require('../models/notes');
const { formatDateKey, isTaskScheduledOnDate } = require('../services/streakService');
const { streamChatCompletion } = require('../services/aiService');

const BASE_SYSTEM_PROMPT = `You are Life AI, the assistant built into a personal
life-management app called Life Vault. Be helpful, clear, friendly, professional,
and concise but useful. Be patient with beginners. Never pretend to know
something you don't. Never invent personal data or fabricate database
information — only reference Life Vault data if it is explicitly provided to
you below. If you need to ask something, ask at most one concise clarifying
question. Match the user's language when practical. You do not have
real-time web access.`;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_IMAGE_BASE64_CHARS = 8_000_000; // ~6MB raw, generous headroom under Anthropic's per-image limit

async function buildContext(userId) {
  const todayStr = formatDateKey(new Date());
  const [tasks, goals, habits, todayProgress] = await Promise.all([
    Task.find({ user: userId, completed: false }).limit(10),
    Goal.find({ user: userId, status: 'active' }).limit(10),
    Habit.find({ user: userId, active: true }).limit(15),
    Progress.find({ user: userId, date: todayStr }),
  ]);

  const scheduledToday = habits.filter((h) => isTaskScheduledOnDate(h, todayStr));
  const progressByHabit = new Map(todayProgress.map((p) => [p.task.toString(), p.completed]));

  if (tasks.length === 0 && goals.length === 0 && scheduledToday.length === 0) return '';

  let block = '\n\nThe user has shared this real data from their Life Vault — only use it if relevant:\n';

  if (scheduledToday.length > 0) {
    const completedCount = scheduledToday.filter((h) => progressByHabit.get(h._id.toString())).length;
    block += `\nToday's habits (${completedCount}/${scheduledToday.length} completed so far):\n`;
    block += scheduledToday.map((h) => {
      const done = progressByHabit.get(h._id.toString());
      return `- ${h.title}${h.important ? ' (important)' : ''}: ${done ? 'done' : 'not done yet'}`;
    }).join('\n') + '\n';
  }
  if (tasks.length > 0) {
    block += `\nActive one-off tasks:\n${tasks.map((t) => `- ${t.text} (${t.priority} priority)`).join('\n')}\n`;
  }
  if (goals.length > 0) {
    block += `\nActive goals:\n${goals.map((g) => `- ${g.title}: ${g.currentValue}/${g.targetValue}${g.unit}`).join('\n')}\n`;
  }
  return block;
}

// Ownership is re-checked server-side rather than trusting whatever the
// frontend claims is "the attached note" — same rule as every other
// endpoint in this app: the client sends an id, never the data itself.
async function buildNoteContext(noteId, userId) {
  if (!noteId) return '';
  const note = await Note.findOne({ _id: noteId, user: userId });
  if (!note) return '';
  return `\n\nThe user has attached this note from their Life Vault:\nTitle: ${note.title}\n${note.content}\n`;
}

function mapErrorToSafeMessage(err) {
  switch (err.code) {
    case 'NO_API_KEY':
    case 'NO_MODEL':
      return 'AI configuration is missing on the server.';
    case 'NETWORK_ERROR':
      return 'Could not reach the AI service. Please try again.';
    case 'TIMEOUT':
      return 'The AI took too long to respond. Please try again.';
    case 'PROVIDER_ERROR':
      if (err.status === 401) return 'AI service authentication failed. Please contact the site owner.';
      if (err.status === 429) return 'Your AI request limit may have been reached. Please try again later.';
      if (err.status === 404) return 'The configured AI model was not found. Check ANTHROPIC_MODEL in backend/.env.';
      return 'AI service is temporarily unavailable. Please try again.';
    case 'BAD_RESPONSE':
      return 'Received an unexpected response from the AI service.';
    default:
      return 'AI service is temporarily unavailable. Please try again.';
  }
}

const pendingByUser = new Set();

router.post('/chat', protect, async (req, res) => {
  const userId = req.user.id;
  const { messages, includeContext, noteId } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, error: 'Please provide at least one message.' });
  }
  if (messages.length > 50) {
    return res.status(400).json({ success: false, error: 'This conversation is too long for one request.' });
  }
  const lastMessage = messages[messages.length - 1];
  if ((!lastMessage?.content || !String(lastMessage.content).trim()) && !lastMessage?.image) {
    return res.status(400).json({ success: false, error: 'Message cannot be empty.' });
  }
  if (lastMessage?.image) {
    const { mediaType, data } = lastMessage.image;
    if (!ALLOWED_IMAGE_TYPES.includes(mediaType)) {
      return res.status(400).json({ success: false, error: 'Unsupported image type.' });
    }
    if (!data || data.length > MAX_IMAGE_BASE64_CHARS) {
      return res.status(400).json({ success: false, error: 'Image is too large.' });
    }
  }
  if (pendingByUser.has(userId)) {
    return res.status(429).json({ success: false, error: 'Please wait for the current response to finish.' });
  }

  pendingByUser.add(userId);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvent = (type, data) => {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const [contextBlock, noteBlock] = await Promise.all([
      includeContext ? buildContext(userId) : '',
      buildNoteContext(noteId, userId),
    ]);
    await streamChatCompletion(messages, BASE_SYSTEM_PROMPT + contextBlock + noteBlock, (token) => {
      sendEvent('token', { token });
    });
    sendEvent('done', {});
  } catch (err) {
    console.error('[aiRoute] Stream error:', err.message);
    sendEvent('error', { error: mapErrorToSafeMessage(err) });
  } finally {
    pendingByUser.delete(userId);
    res.end();
  }
});

module.exports = router;