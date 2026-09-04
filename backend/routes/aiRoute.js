const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const Task = require('../models/tasks');
const Goal = require('../models/goals');
const Habit = require('../models/habits');
const Progress = require('../models/Progress');
const Note = require('../models/notes');
const Document = require('../models/documents');
const Expense = require('../models/expenses');
const Memory = require('../models/memories');
const Conversation = require('../models/Conversation');
const { formatDateKey, isTaskScheduledOnDate } = require('../services/streakService');
const { streamChatCompletion, getActiveProvider } = require('../services/aiService');
const {
  extractDocumentContent,
  isImageFile,
  readImageBase64,
} = require('../services/documentParser');

// Upload directory configuration for AI attachments
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const aiStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `ai-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const ALLOWED_EXTENSIONS = [
  '.pdf', '.docx', '.txt', '.csv', '.json', '.md',
  '.png', '.jpg', '.jpeg', '.webp', '.gif'
];

const aiFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(null, true);
  }
  return cb(new Error(`File type ${ext} is not supported. Please attach a PDF, DOCX, TXT, CSV, JSON, or image (PNG/JPG/WebP/GIF).`), false);
};

const aiUpload = multer({
  storage: aiStorage,
  fileFilter: aiFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const BASE_SYSTEM_PROMPT = `You are Life AI, the intelligent personal assistant built directly into Life Vault.
Your mission is to help the user organize, analyze, reflect on, and make progress across every area of their life — including tasks, goals, habits, learning notes, documents, finances, and memories.

Core Guidelines:
1. Grounding & Honesty:
   - Only reference personal Life Vault data if it is explicitly provided below.
   - If the user asks about their tasks, habits, documents, or data and it is NOT in the provided context, clearly state that you don't see it or that it isn't recorded yet.
   - NEVER fabricate database items, progress values, or personal history.
2. Formatting & Communication:
   - Use clean Markdown. Structure answers with clear headings, bullet points, numbered steps, or markdown tables where appropriate.
   - When providing code or command examples, always use fenced code blocks with language identifiers.
   - Keep answers clear, proactive, empathetic, and actionable.
3. Multimodal & Document Handling:
   - When documents (PDF, DOCX, TXT, CSV, JSON) or images are attached, analyze them directly, extract relevant insights, answer questions accurately, and cite specific sections or data points.
   - If a document is truncated, acknowledge the available excerpt.`;

/**
 * Builds rich, comprehensive Life Vault personal context for the authenticated user.
 */
async function buildLifeVaultContext(userId) {
  const todayStr = formatDateKey(new Date());

  try {
    const [
      tasks,
      goals,
      habits,
      todayProgress,
      recentNotes,
      documents,
      expenses,
      recentMemories,
    ] = await Promise.all([
      Task.find({ user: userId, completed: false }).sort({ priority: -1, createdAt: -1 }).limit(10),
      Goal.find({ user: userId, status: 'active' }).limit(8),
      Habit.find({ user: userId, active: true }).limit(12),
      Progress.find({ user: userId, date: todayStr }),
      Note.find({ user: userId }).sort({ pinned: -1, updatedAt: -1 }).limit(5),
      Document.find({ user: userId }).sort({ createdAt: -1 }).limit(6),
      Expense.find({ user: userId }).sort({ date: -1 }).limit(8),
      Memory.find({ user: userId }).sort({ date: -1 }).limit(5),
    ]);

    const scheduledToday = habits.filter((h) => isTaskScheduledOnDate(h, todayStr));
    const progressByHabit = new Map(todayProgress.map((p) => [p.task.toString(), p.completed]));

    const hasAnyData =
      tasks.length > 0 ||
      goals.length > 0 ||
      scheduledToday.length > 0 ||
      recentNotes.length > 0 ||
      documents.length > 0 ||
      expenses.length > 0;

    if (!hasAnyData) {
      return '\n\n[Life Vault Context: The user currently has no active tasks, goals, or habits recorded in Life Vault.]\n';
    }

    let block = '\n\n=== VERIFIED LIFE VAULT PERSONAL DATA (Use only if relevant to user question) ===\n';

    // 1. Today's Habits
    if (scheduledToday.length > 0) {
      const completedCount = scheduledToday.filter((h) => progressByHabit.get(h._id.toString())).length;
      block += `\n📅 Today's Habits (${completedCount}/${scheduledToday.length} completed so far):\n`;
      block += scheduledToday
        .map((h) => {
          const done = progressByHabit.get(h._id.toString());
          return `- ${h.title}${h.important ? ' [IMPORTANT]' : ''}: ${done ? 'Completed ✅' : 'Pending ⏳'}`;
        })
        .join('\n') + '\n';
    }

    // 2. Active Tasks
    if (tasks.length > 0) {
      block += `\n✅ Active Tasks:\n`;
      block += tasks
        .map((t) => {
          const due = t.dueDate ? ` (Due: ${new Date(t.dueDate).toLocaleDateString()})` : '';
          return `- [${t.priority.toUpperCase()}] ${t.text}${due}`;
        })
        .join('\n') + '\n';
    }

    // 3. Active Goals
    if (goals.length > 0) {
      block += `\n🎯 Active Goals:\n`;
      block += goals
        .map((g) => {
          const pct = g.targetValue > 0 ? Math.round((g.currentValue / g.targetValue) * 100) : 0;
          return `- ${g.title}: ${g.currentValue}/${g.targetValue} ${g.unit || ''} (${pct}% achieved)`;
        })
        .join('\n') + '\n';
    }

    // 4. Notes
    if (recentNotes.length > 0) {
      block += `\n📝 Recent Vault Notes:\n`;
      block += recentNotes
        .map((n) => `- "${n.title}": ${n.content.slice(0, 150).replace(/\n/g, ' ')}${n.content.length > 150 ? '...' : ''}`)
        .join('\n') + '\n';
    }

    // 5. Stored Documents
    if (documents.length > 0) {
      block += `\n📁 Files in Document Vault:\n`;
      block += documents.map((d) => `- ${d.originalName} (${Math.round(d.size / 1024)} KB, ${d.mimeType})`).join('\n') + '\n';
    }

    // 6. Recent Finances
    if (expenses.length > 0) {
      const totalRecent = expenses.reduce((sum, e) => sum + (e.type === 'expense' ? e.amount : 0), 0);
      block += `\n💳 Recent Expenses logged: ${expenses.length} transactions (recent total expense: ${totalRecent})\n`;
    }

    // 7. Memories
    if (recentMemories.length > 0) {
      block += `\n🌟 Milestone Memories:\n`;
      block += recentMemories.map((m) => `- ${m.title} (${new Date(m.date).toLocaleDateString()}): ${m.description || ''}`).join('\n') + '\n';
    }

    block += '=== END OF LIFE VAULT DATA ===\n';
    return block;
  } catch (err) {
    console.error('[aiRoute] Error building Life Vault context:', err.message);
    return '';
  }
}

/**
 * Builds note context when a specific note is attached.
 */
async function buildNoteContext(noteId, userId) {
  if (!noteId) return '';
  const note = await Note.findOne({ _id: noteId, user: userId });
  if (!note) return '';
  return `\n\n=== ATTACHED LIFE VAULT NOTE ===\nTitle: ${note.title}\nContent:\n${note.content}\n=== END OF ATTACHED NOTE ===\n`;
}

function mapErrorToSafeMessage(err) {
  switch (err.code) {
    case 'NO_API_KEY':
    case 'NO_MODEL':
      return 'AI configuration is missing on the server. Please check your environment variables.';
    case 'NETWORK_ERROR':
      return 'Could not reach the AI service provider. Please check your internet connection and try again.';
    case 'TIMEOUT':
      return 'The AI request timed out. Please try again with a shorter message or fewer files.';
    case 'PROVIDER_ERROR':
      if (err.status === 401) return 'AI service authentication failed. Please verify the API key configured on the server.';
      if (err.status === 429) return 'AI request rate limit reached. Please wait a few seconds and try again.';
      if (err.status === 404) return 'The configured AI model could not be found. Please check model settings.';
      if (err.status === 400 && (err.details || '').includes('credit balance is too low')) {
        return 'Anthropic credit balance is too low. Switched to Groq.';
      }
      return err.details && err.details.length < 150 ? err.details : 'Life AI service is temporarily unavailable. Please try again.';
    case 'BAD_RESPONSE':
      return 'Received an unexpected response format from the AI provider.';
    default:
      return 'Life AI encountered an issue. Please try again.';
  }
}

const pendingByUser = new Set();

// ==========================================
// CONVERSATION MANAGEMENT ENDPOINTS
// ==========================================

// @route   GET /api/ai/conversations
// @desc    List all conversations for the authenticated user (supports search ?q=)
router.get('/conversations', protect, async (req, res) => {
  try {
    const { q } = req.query;
    const query = { user: req.user.id };

    if (q && q.trim()) {
      query.title = { $regex: q.trim(), $options: 'i' };
    }

    const conversations = await Conversation.find(query)
      .sort({ updatedAt: -1 })
      .select('title messages createdAt updatedAt systemContextIncluded')
      .lean();

    const formatted = conversations.map((conv) => {
      const lastMsg = conv.messages?.[conv.messages.length - 1];
      return {
        _id: conv._id,
        title: conv.title || 'New Conversation',
        messageCount: conv.messages ? conv.messages.length : 0,
        lastMessage: lastMsg ? { role: lastMsg.role, content: (lastMsg.content || '').slice(0, 120), createdAt: lastMsg.createdAt } : null,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      };
    });

    res.status(200).json(formatted);
  } catch (error) {
    console.error('[aiRoute] Error fetching conversations:', error.message);
    res.status(500).json({ message: 'Failed to load conversations' });
  }
});

// @route   POST /api/ai/conversations
// @desc    Create a new empty conversation
router.post('/conversations', protect, async (req, res) => {
  try {
    const { title } = req.body;
    const conv = await Conversation.create({
      user: req.user.id,
      title: (title || '').trim() || 'New Conversation',
      messages: [],
    });
    res.status(201).json(conv);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create conversation' });
  }
});

// @route   GET /api/ai/conversations/:id
// @desc    Get a single conversation with full message history (ownership strictly checked)
router.get('/conversations/:id', protect, async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id);
    if (!conv) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    if (conv.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access this conversation' });
    }
    res.status(200).json(conv);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load conversation' });
  }
});

// @route   PATCH /api/ai/conversations/:id
// @desc    Rename a conversation
router.patch('/conversations/:id', protect, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const conv = await Conversation.findById(req.params.id);
    if (!conv) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    if (conv.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to modify this conversation' });
    }

    conv.title = title.trim();
    await conv.save();

    res.status(200).json(conv);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update conversation' });
  }
});

// @route   DELETE /api/ai/conversations/:id
// @desc    Delete a conversation and clean up any disk files
router.delete('/conversations/:id', protect, async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id);
    if (!conv) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    if (conv.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this conversation' });
    }

    // Clean up attached disk files
    for (const msg of conv.messages || []) {
      for (const att of msg.attachments || []) {
        if (att.storedName) {
          const filePath = path.join(uploadDir, att.storedName);
          if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch {}
          }
        }
      }
    }

    await conv.deleteOne();
    res.status(200).json({ id: req.params.id, message: 'Conversation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete conversation' });
  }
});

// ==========================================
// ATTACHMENT UPLOAD & VIEWING ENDPOINTS
// ==========================================

// @route   POST /api/ai/upload
// @desc    Upload file for AI analysis (PDF, DOCX, TXT, CSV, JSON, images)
router.post('/upload', protect, aiUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { filename, originalname, mimetype, size } = req.file;
    const filePath = path.join(uploadDir, filename);

    let attachmentType = 'document';
    let extractedText = '';

    if (isImageFile(mimetype, originalname)) {
      attachmentType = 'image';
    } else {
      const result = await extractDocumentContent(filePath, originalname, mimetype);
      if (result.success) {
        extractedText = result.text;
      } else {
        extractedText = `[Document text extraction warning: ${result.error}]`;
      }
    }

    const payload = {
      originalName: originalname,
      storedName: filename,
      mimeType: mimetype,
      size,
      attachmentType,
      extractedText,
      url: `/api/ai/attachments/${filename}`,
    };

    res.status(201).json(payload);
  } catch (error) {
    console.error('[aiRoute] Upload error:', error.message);
    res.status(400).json({ message: error.message || 'File upload failed' });
  }
});

// @route   GET /api/ai/attachments/:filename
// @desc    Securely stream an uploaded attachment (authenticated, no path traversal)
router.get('/attachments/:filename', protect, (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(uploadDir, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'Attachment file not found' });
  }

  res.sendFile(filePath);
});

// ==========================================
// CHAT STREAMING & COMPLETION
// ==========================================

// @route   POST /api/ai/chat
// @desc    Send a message, stream response, and persist to conversation
router.post('/chat', protect, async (req, res) => {
  const userId = req.user.id;
  const { conversationId, messages, attachments, includeContext, noteId } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, error: 'Please provide at least one message.' });
  }
  if (messages.length > 60) {
    return res.status(400).json({ success: false, error: 'This conversation has reached the request length limit.' });
  }

  const lastUserMessage = messages[messages.length - 1];
  const hasText = Boolean(lastUserMessage?.content && String(lastUserMessage.content).trim());
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  const hasLegacyImage = Boolean(lastUserMessage?.image);

  if (!hasText && !hasAttachments && !hasLegacyImage) {
    return res.status(400).json({ success: false, error: 'Message cannot be empty.' });
  }

  if (pendingByUser.has(userId)) {
    return res.status(429).json({ success: false, error: 'Please wait for your previous request to finish.' });
  }

  // Find or create the conversation record
  let conv = null;
  if (conversationId) {
    conv = await Conversation.findOne({ _id: conversationId, user: userId });
  }
  if (!conv) {
    const snippet = (lastUserMessage?.content || 'New Chat').slice(0, 40).trim();
    conv = await Conversation.create({
      user: userId,
      title: snippet || 'New Conversation',
      messages: [],
      systemContextIncluded: Boolean(includeContext),
    });
  }

  pendingByUser.add(userId);

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvent = (type, data) => {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Inform client of conversation ID right away
  sendEvent('conversation', { conversationId: conv._id, title: conv.title });

  try {
    // Process attachments for the AI prompt
    let attachedDocumentBlock = '';
    const promptImages = [];

    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        if (att.attachmentType === 'image') {
          const filePath = path.join(uploadDir, path.basename(att.storedName));
          if (fs.existsSync(filePath)) {
            const base64 = readImageBase64(filePath);
            promptImages.push({
              mediaType: att.mimeType || 'image/jpeg',
              data: base64,
            });
          }
        } else if (att.attachmentType === 'document') {
          attachedDocumentBlock += `\n\n=== ATTACHED DOCUMENT: ${att.originalName} (${att.mimeType}) ===\n${att.extractedText || '[No readable text extracted]'}\n=== END OF DOCUMENT ===\n`;
        }
      }
    }

    // Handle legacy single-image support
    if (lastUserMessage?.image && promptImages.length === 0) {
      promptImages.push(lastUserMessage.image);
    }

    // Assemble messages array for the AI provider
    const aiMessages = messages.map((m, index) => {
      const isLast = index === messages.length - 1;
      if (isLast && promptImages.length > 0) {
        return {
          role: m.role,
          content: m.content || '',
          images: promptImages,
        };
      }
      return {
        role: m.role,
        content: m.content || '',
      };
    });

    // Assemble system prompt with personal context & documents
    const [contextBlock, noteBlock] = await Promise.all([
      includeContext ? buildLifeVaultContext(userId) : '',
      buildNoteContext(noteId, userId),
    ]);

    const completeSystemPrompt = `${BASE_SYSTEM_PROMPT}${contextBlock}${noteBlock}${attachedDocumentBlock}`;

    // Record user message in DB
    conv.messages.push({
      role: 'user',
      content: lastUserMessage.content || '',
      attachments: attachments || [],
      noteRef: noteId || null,
      createdAt: new Date(),
    });
    if (includeContext) {
      conv.systemContextIncluded = true;
    }

    let fullAssistantResponse = '';

    await streamChatCompletion(aiMessages, completeSystemPrompt, (token) => {
      fullAssistantResponse += token;
      sendEvent('token', { token });
    });

    // Record assistant response in DB
    conv.messages.push({
      role: 'assistant',
      content: fullAssistantResponse,
      createdAt: new Date(),
    });
    conv.updatedAt = new Date();
    await conv.save();

    sendEvent('done', {
      conversationId: conv._id,
      messageCount: conv.messages.length,
    });
  } catch (err) {
    console.error('[aiRoute] Stream execution error:', err.message);
    const safeError = mapErrorToSafeMessage(err);
    sendEvent('error', { error: safeError });
  } finally {
    pendingByUser.delete(userId);
    res.end();
  }
});

module.exports = router;