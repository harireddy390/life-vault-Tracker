const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Task = require('../models/tasks');
const Goal = require('../models/goals');

// The one system prompt every conversation gets. Kept short and honest —
// no invented capabilities.
const BASE_SYSTEM_PROMPT = `You are Life AI, the assistant built into a personal
life-management app called Life Vault. Be direct, concise, and genuinely
helpful — like a capable assistant, not a chatbot performing enthusiasm.
If the user asks something you don't have enough information for, say so
plainly instead of guessing. You do not have real-time web access.`;

// Builds an optional context block from the user's own real data, only
// when they explicitly opt in via includeContext — never silently.
async function buildContext(userId) {
  const [tasks, goals] = await Promise.all([
    Task.find({ user: userId, completed: false }).limit(10),
    Goal.find({ user: userId, status: 'active' }).limit(10),
  ]);

  if (tasks.length === 0 && goals.length === 0) return '';

  let block = '\n\nThe user has shared this context from their Life Vault:\n';
  if (tasks.length > 0) {
    block += `\nActive tasks:\n${tasks.map((t) => `- ${t.text} (${t.priority} priority)`).join('\n')}\n`;
  }
  if (goals.length > 0) {
    block += `\nActive goals:\n${goals.map((g) => `- ${g.title}: ${g.currentValue}/${g.targetValue}${g.unit}`).join('\n')}\n`;
  }
  block += '\nUse this only if it is relevant to what the user asks.';
  return block;
}

// @route   POST /api/ai/chat
// @desc    Send a conversation to Claude and get a reply. The API key never
//          leaves this server — the frontend only ever talks to this route.
router.post('/chat', protect, async (req, res) => {
  try {
    const { messages, includeContext } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: 'Please provide a messages array' });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        message: 'Life AI is not configured yet. Add ANTHROPIC_API_KEY to backend/.env to enable it.',
      });
    }

    const contextBlock = includeContext ? await buildContext(req.user.id) : '';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
        max_tokens: 1024,
        system: BASE_SYSTEM_PROMPT + contextBlock,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Anthropic API error:', response.status, errBody);
      return res.status(502).json({ message: 'Life AI could not reach the model right now. Try again shortly.' });
    }

    const data = await response.json();
    const replyText = data.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    res.status(200).json({ reply: replyText, usedContext: Boolean(includeContext) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong talking to Life AI.' });
  }
});

module.exports = router;
