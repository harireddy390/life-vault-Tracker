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
const ScheduleBlock = require('../models/ScheduleBlock');
const WorkoutLog = require('../models/WorkoutLog');
const VitalsLog = require('../models/VitalsLog');
const Conversation = require('../models/Conversation');
const AIConversation = require('../models/AIConversation');
const AIMessage = require('../models/AIMessage');

const { formatDateKey, isTaskScheduledOnDate } = require('../services/streakService');
const { getISTCurrentDateTime, getISTDateStr } = require('../utils/istTime');
const { streamChatCompletion, getActiveProvider } = require('../services/aiService');
const {
  extractDocumentContent,
  isImageFile,
  readImageBase64,
} = require('../services/documentParser');
const { executeTool, searchAllDocuments } = require('../services/aiToolService');
const {
  extractScheduleFromAttachment,
  extractScheduleFromText,
  extractJsonFromText,
} = require('../services/aiVisionService');

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
  return cb(
    new Error(`File type ${ext} is not supported. Please attach a PDF, DOCX, TXT, CSV, JSON, or image (PNG/JPG/WebP/GIF).`),
    false
  );
};

const aiUpload = multer({
  storage: aiStorage,
  fileFilter: aiFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

const BASE_SYSTEM_PROMPT = `You are Life AI, the intelligent personal assistant and autonomous copilot built directly into Life Vault.
Your mission is to help the user organize, analyze, execute, and make progress across every area of their personal operating system: tasks, routine schedule blocks, goals, habits, learning notes, documents, vitals, finances, and memories.

CRITICAL DIRECTIVES:
1. STRICT DOCUMENT GROUNDING (ABSOLUTELY ZERO FABRICATION):
   - You MUST NEVER FABRICATE, INVENT, OR GUESS DOCUMENTS! Never make up sample or placeholder files (such as "Passport - India", "Aadhaar Card", "Mortgage Agreement", "Gym Membership Contract", "Annual Tax Return", "College Transcript" unless they literally appear in the context below).
   - When the user asks:
     * "What documents are existed in vault?"
     * "Go to vault what documents are existed give me those"
     * "Present all documents which are existed in vault one by one"
     * "Show my documents" or "Find identity in vault"
     YOU MUST:
     a) Emit a tool_call to vault_search_documents(query=""):
     \`\`\`tool_call
     {
       "name": "vault_search_documents",
       "arguments": {
         "query": ""
       }
     }
     \`\`\`
     b) In your accompanying text, ONLY describe the EXACT files that exist in the "User Vault Documents", "Family Documents", and "Health Records" sections of the context below. If there are 6 files, list only those 6 files with their real filenames and categories.

2. COMMAND CENTER ROUTINE & TIMETABLE INGESTION:
   - When the user provides a daily or weekly routine, operating system, timetable, workout split, or says "add these to command center", "add blocks with their timings":
     a) IMMEDIATELY emit a tool_call to schedule_batch_create with all parsed blocks.
     b) DO NOT ask the user to confirm in text first; invoking schedule_batch_create automatically stages the blocks into an interactive preview card where the user can review and approve them with one tap!
     c) DO NOT output raw JSON blocks with slash comments like [/ Monday /] or // comments. Always emit valid \`\`\`tool_call syntax:
     \`\`\`tool_call
     {
       "name": "schedule_batch_create",
       "arguments": {
         "blocks": [
           {
             "title": "Wake & Hydrate",
             "startTime": "07:00",
             "endTime": "07:10",
             "category": "personal",
             "daysOfWeek": [1, 4],
             "recurrence": "weekly"
           }
         ]
       }
     }
     \`\`\`
     d) Ensure all times are in 24-hour "HH:mm" IST format (e.g. "07:00", "07:10", "13:00", "17:35").
     e) Map daysOfWeek to numbers (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat) or day names (e.g. [1, 4] for Mon & Thu).

3. Formatting & Communication:
   - Use clean Markdown. Structure answers with clear headings, bullet points, numbered steps, or markdown tables.
   - Keep answers proactive, empathetic, and actionable.

Autonomous Tool Calling Capabilities:
You have real-time access to the user's database and can invoke server-side tools. When the user asks you to search for files, create tasks, add schedule blocks, log vitals, add expenses, or update goals, emit a tool call.

Available Tools:
1. vault_search_documents(query, category)
   - Searches across all user vaults: Document Vault, Family Government IDs/Records, Health medical reports.
   - Pass query="" to list all documents, or pass a search term (e.g. query="identity", query="Lord Muruga", query="loan").
   - Do NOT guess rigid category names. Always pass the search term in query. Leave category empty or omit it.

2. tasks_create(title, priority, dueDate, category)
   - Creates a new active task in the database.
   - priority: "high" | "medium" | "low". category: e.g. "college", "work", "personal", "study".

3. schedule_create_block(title, startTime, endTime, category, recurrence, daysOfWeek)
   - Creates a single routine block in the Command Center.
   - startTime and endTime MUST be in 24-hour "HH:mm" IST format (e.g. "07:00", "09:30", "17:35").
   - category: "work" | "college" | "gym" | "study" | "chores" | "personal" | "rest".

4. schedule_batch_create(blocks)
   - Stages a list of routine blocks for user preview and one-tap approval.
   - blocks: array of { title, startTime, endTime, category, daysOfWeek, recurrence }.

5. health_log_vital(metricType, valuePrimary, valueSecondary, unit)
6. finance_add_transaction(title, amount, type, category)
7. goals_log_progress(goalId, goalTitle, incrementValue, note)

Tool Invocation Syntax:
Whenever you execute or stage an action, include a fenced \`\`\`tool_call block in your response:
\`\`\`tool_call
{
  "name": "tool_name",
  "arguments": {
    "param1": "value"
  }
}
\`\`\`
Always provide a friendly explanation in natural language alongside the tool call so the user understands what happened.`;

/**
 * Builds rich Life Vault personal context for the authenticated user.
 */
async function buildLifeVaultContext(userId) {
  const todayStr = formatDateKey(new Date());

  try {
    const istContext = getISTCurrentDateTime();
    const { dateStr: istDateStr, dayOfWeek, timeStr } = istContext;

    const [
      tasks,
      goals,
      habits,
      todayProgress,
      recentNotes,
      documents,
      expenses,
      recentMemories,
      todayBlocks,
      todayWorkout,
      recentVitals,
      familyDocs,
      healthDocs,
    ] = await Promise.all([
      Task.find({ user: userId, completed: false }).sort({ priority: -1, createdAt: -1 }).limit(10),
      Goal.find({ user: userId, status: 'active' }).limit(8),
      Habit.find({ user: userId, active: true }).limit(12),
      Progress.find({ user: userId, date: todayStr }),
      Note.find({ user: userId }).sort({ pinned: -1, updatedAt: -1 }).limit(5),
      Document.find({ user: userId }).sort({ createdAt: -1 }).limit(20).lean(),
      Expense.find({ user: userId }).sort({ date: -1 }).limit(8),
      Memory.find({ user: userId }).sort({ date: -1 }).limit(5),
      ScheduleBlock.find({
        user: userId,
        $or: [{ isRecurring: true, daysOfWeek: dayOfWeek }, { isRecurring: false, date: istDateStr }],
      }).lean(),
      WorkoutLog.findOne({ user: userId, date: istDateStr }).lean(),
      VitalsLog.find({ user: userId }).sort({ loggedAt: -1 }).limit(4).lean(),
      require('../models/FamilyDocument').find({ user: userId }).populate('family_member', 'full_name relationship').limit(10).lean(),
      require('../models/HealthRecord').find({ user: userId }).limit(10).lean(),
    ]);

    const scheduledToday = habits.filter((h) => isTaskScheduledOnDate(h, todayStr));
    const progressByHabit = new Map(todayProgress.map((p) => [p.task.toString(), p.completed]));

    let block = '\n\n=== VERIFIED LIFE VAULT PERSONAL DATA (Use only if relevant to user question) ===\n';
    block += `📍 Current IST Date & Time: ${istContext.formattedDate} ${timeStr} (Asia/Kolkata)\n`;

    // Today's Schedule
    if (todayBlocks && todayBlocks.length > 0) {
      const sortedBlocks = [...todayBlocks].sort((a, b) => a.startTime.localeCompare(b.startTime));
      const active = sortedBlocks.find((b) => b.startTime <= timeStr && b.endTime > timeStr);
      const next = sortedBlocks.find((b) => b.startTime > timeStr);
      block += `\n⏰ Today's Schedule:\n`;
      if (active) block += `  * Current Active Block: "${active.title}" (${active.startTime} - ${active.endTime})\n`;
      if (next) block += `  * Next Upcoming Block: "${next.title}" (starts at ${next.startTime})\n`;
      block += sortedBlocks
        .map((b) => {
          const isDone = (b.completedDates || []).includes(istDateStr) || (!b.isRecurring && b.completed);
          return `  - ${b.startTime}-${b.endTime} ${b.title} [${b.category}]: ${isDone ? 'Completed ✅' : 'Pending ⏳'}`;
        })
        .join('\n') + '\n';
    }

    // Today's Workout
    if (todayWorkout) {
      block += `\n🏋️ Today's Workout Log:\n`;
      block += `  - Title: ${todayWorkout.title || 'Workout'}, Duration: ${todayWorkout.durationMinutes} mins\n`;
      if (todayWorkout.exercises && todayWorkout.exercises.length > 0) {
        block += `  - Exercises: ` + todayWorkout.exercises.map((e) => `${e.name} (${e.sets?.length || 0} sets)`).join(', ') + '\n';
      }
    }

    // Recent Vitals
    if (recentVitals && recentVitals.length > 0) {
      block += `\n❤️ Recent Vitals:\n`;
      block += recentVitals.map((v) => `  - ${v.metricType.replace('_', ' ')}: ${v.valuePrimary}${v.valueSecondary ? '/' + v.valueSecondary : ''} ${v.unit} [${v.statusFlag.toUpperCase()}]`).join('\n') + '\n';
    }

    // Active Tasks
    if (tasks.length > 0) {
      block += `\n✅ Active Tasks:\n`;
      block += tasks
        .map((t) => {
          const due = t.dueDate ? ` (Due: ${new Date(t.dueDate).toLocaleDateString()})` : '';
          return `- [${t.priority.toUpperCase()}] ${t.text}${due}`;
        })
        .join('\n') + '\n';
    }

    // Habits
    if (scheduledToday.length > 0) {
      const completedCount = scheduledToday.filter((h) => progressByHabit.get(h._id.toString())).length;
      block += `\n📅 Today's Habits (${completedCount}/${scheduledToday.length} completed):\n`;
      block += scheduledToday
        .map((h) => {
          const done = progressByHabit.get(h._id.toString());
          return `- ${h.title}: ${done ? 'Completed ✅' : 'Pending ⏳'}`;
        })
        .join('\n') + '\n';
    }

    // Goals
    if (goals.length > 0) {
      block += `\n🎯 Active Goals:\n`;
      block += goals
        .map((g) => {
          const pct = g.targetValue > 0 ? Math.round((g.currentValue / g.targetValue) * 100) : 0;
          return `- ${g.title}: ${g.currentValue}/${g.targetValue} ${g.unit || ''} (${pct}%)`;
        })
        .join('\n') + '\n';
    }

    // Stored Documents in Vault
    if (documents.length > 0) {
      block += `\n📁 User Vault Documents (${documents.length} files currently in Vault — ONLY THESE FILES EXIST, DO NOT INVENT OTHERS):\n`;
      block += documents
        .map((d) => `  - "${d.originalName}" [Category: "${d.category || 'General'}"${d.tags && d.tags.length ? ', Tags: ' + d.tags.join(', ') : ''}]`)
        .join('\n') + '\n';
    }

    // Family Documents
    if (familyDocs && familyDocs.length > 0) {
      block += `\n👨‍👩‍👧 Family Documents (${familyDocs.length} files):\n`;
      block += familyDocs
        .map((fd) => `  - "${fd.title || fd.file_name}" [Type: ${fd.document_type}, Member: ${fd.family_member?.full_name || 'Family'}]`)
        .join('\n') + '\n';
    }

    // Health Records
    if (healthDocs && healthDocs.length > 0) {
      block += `\n🏥 Health Records (${healthDocs.length} files):\n`;
      block += healthDocs
        .map((hd) => `  - "${hd.title || hd.originalName}" [Category: ${hd.category}, Doctor/Facility: ${hd.doctorOrFacility || 'N/A'}]`)
        .join('\n') + '\n';
    }

    block += '=== END OF LIFE VAULT DATA ===\n';
    return block;
  } catch (err) {
    console.error('[aiRoute] Error building Life Vault context:', err.message);
    return '';
  }
}

/**
 * Builds note context when a note is attached.
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

/**
 * Parses tool call blocks from the AI text.
 * Robust to slash comments ([/ ... /]), unquoted block arrays, truncated fences, and bare blocks.
 */
function parseToolCallsFromText(text) {
  if (!text) return [];
  const calls = [];
  const regex = /```(?:tool_call|json)\s*([\s\S]*?)(?:```|$)/gi;
  let match;

  while ((match = regex.exec(text)) !== null) {
    let raw = match[1].trim();
    if (!raw) continue;

    // Clean comments: [/ ... /], /* ... */, // ..., slash delimiters
    raw = raw.replace(/\/\*[\s\S]*?\*\//g, '');
    raw = raw.replace(/\[\/\s*[\s\S]*?\/\s*\]/g, '');
    raw = raw.replace(/\/\/[^\n]*/g, '');
    raw = raw.replace(/\/[\s\-]+[A-Za-z0-9\s&]+\-+[\s\/]*/g, '');

    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.name && typeof parsed.name === 'string') {
        calls.push({
          id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: parsed.name,
          arguments: parsed.arguments || {},
          rawMatch: match[0],
        });
        continue;
      }
      if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0].title || parsed[0].startTime)) {
        calls.push({
          id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: 'schedule_batch_create',
          arguments: { blocks: parsed },
          rawMatch: match[0],
        });
        continue;
      }
      if (parsed && Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
        calls.push({
          id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: 'schedule_batch_create',
          arguments: { blocks: parsed.blocks },
          rawMatch: match[0],
        });
        continue;
      }
    } catch {
      // If parsing full JSON failed (e.g. truncated or array without outer brackets),
      // extract individual JSON objects { "title": ..., "startTime": ... }
      const objRegex = /\{[^{}]*"title"\s*:\s*"[^"]+"[^{}]*"startTime"\s*:\s*"[^"]+"[^{}]*\}/g;
      const extractedBlocks = [];
      let objMatch;
      while ((objMatch = objRegex.exec(raw)) !== null) {
        try {
          const item = JSON.parse(objMatch[0]);
          extractedBlocks.push(item);
        } catch {}
      }

      if (extractedBlocks.length > 0) {
        calls.push({
          id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: 'schedule_batch_create',
          arguments: { blocks: extractedBlocks },
          rawMatch: match[0],
        });
      }
    }
  }

  // If no calls parsed from code fences, check if text itself contains schedule objects
  if (calls.length === 0) {
    const objRegex = /\{[^{}]*"title"\s*:\s*"[^"]+"[^{}]*"startTime"\s*:\s*"[^"]+"[^{}]*\}/g;
    const extractedBlocks = [];
    let objMatch;
    while ((objMatch = objRegex.exec(text)) !== null) {
      try {
        const item = JSON.parse(objMatch[0]);
        extractedBlocks.push(item);
      } catch {}
    }
    if (extractedBlocks.length > 0) {
      calls.push({
        id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: 'schedule_batch_create',
        arguments: { blocks: extractedBlocks },
      });
    }
  }

  return calls;
}

const pendingByUser = new Set();

// ==========================================
// CONVERSATION MANAGEMENT ENDPOINTS
// ==========================================

// @route   GET /api/ai/conversations
// @desc    List all conversations for user (supports search ?q=)
router.get('/conversations', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { q } = req.query;

    const query = { user: userId };
    if (q && q.trim()) {
      query.title = { $regex: q.trim(), $options: 'i' };
    }

    let conversations = await AIConversation.find(query).sort({ updated_at: -1 }).lean();

    // If zero conversations in AIConversation, check legacy Conversation model and migrate
    if (conversations.length === 0) {
      const legacyList = await Conversation.find(query).sort({ updatedAt: -1 }).lean();
      if (legacyList.length > 0) {
        for (const leg of legacyList) {
          const createdConv = await AIConversation.create({
            user: userId,
            title: leg.title || 'New Conversation',
            created_at: leg.createdAt || new Date(),
            updated_at: leg.updatedAt || new Date(),
          });
          if (Array.isArray(leg.messages) && leg.messages.length > 0) {
            await AIMessage.insertMany(
              leg.messages.map((m) => ({
                conversation_id: createdConv._id,
                user: userId,
                role: m.role,
                content: m.content || '',
                attachments: (m.attachments || []).map((a) => ({
                  file_url: a.url || '',
                  file_name: a.originalName || '',
                  mime_type: a.mimeType || '',
                  size: a.size || 0,
                })),
                tool_calls: [],
                created_at: m.createdAt || new Date(),
              }))
            );
          }
        }
        conversations = await AIConversation.find(query).sort({ updated_at: -1 }).lean();
      }
    }

    // Format list with messageCount and lastMessage snippet
    const formatted = await Promise.all(
      conversations.map(async (conv) => {
        const count = await AIMessage.countDocuments({ conversation_id: conv._id });
        const lastMsg = await AIMessage.findOne({ conversation_id: conv._id }).sort({ created_at: -1 }).lean();
        return {
          _id: conv._id,
          title: conv.title || 'New Conversation',
          messageCount: count,
          lastMessage: lastMsg
            ? {
                role: lastMsg.role,
                content: (lastMsg.content || '').slice(0, 120),
                created_at: lastMsg.created_at,
              }
            : null,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
        };
      })
    );

    res.status(200).json(formatted);
  } catch (error) {
    console.error('[aiRoute] Error fetching conversations:', error.message);
    res.status(500).json({ message: 'Failed to load conversations' });
  }
});

// @route   POST /api/ai/conversations
// @desc    Create a new conversation thread
router.post('/conversations', protect, async (req, res) => {
  try {
    const { title } = req.body;
    const conv = await AIConversation.create({
      user: req.user.id,
      title: (title || '').trim() || 'New Conversation',
    });
    res.status(201).json({
      _id: conv._id,
      title: conv.title,
      messageCount: 0,
      lastMessage: null,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create conversation' });
  }
});

// @route   GET /api/ai/conversations/:id/messages
// @desc    Get paginated message history with tool-call results & attachments
router.get('/conversations/:id/messages', protect, async (req, res) => {
  try {
    const convId = req.params.id;
    const userId = req.user.id;

    const conv = await AIConversation.findOne({ _id: convId, user: userId });
    if (!conv) {
      // Check legacy model
      const legConv = await Conversation.findOne({ _id: convId, user: userId });
      if (!legConv) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      return res.status(200).json({
        conversation: {
          _id: legConv._id,
          title: legConv.title,
          created_at: legConv.createdAt,
          updated_at: legConv.updatedAt,
        },
        messages: (legConv.messages || []).map((m) => ({
          _id: m._id,
          role: m.role,
          content: m.content,
          attachments: (m.attachments || []).map((a) => ({
            file_url: a.url || '',
            file_name: a.originalName || '',
            mime_type: a.mimeType || '',
            size: a.size || 0,
          })),
          tool_calls: [],
          created_at: m.createdAt,
        })),
      });
    }

    const messages = await AIMessage.find({ conversation_id: convId, user: userId })
      .sort({ created_at: 1 })
      .lean();

    res.status(200).json({
      conversation: conv,
      messages,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load messages' });
  }
});

// @route   PATCH /api/ai/conversations/:id
// @desc    Rename conversation
router.patch('/conversations/:id', protect, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const conv = await AIConversation.findOne({ _id: req.params.id, user: req.user.id });
    if (!conv) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    conv.title = title.trim();
    await conv.save();

    res.status(200).json(conv);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update conversation' });
  }
});

// @route   DELETE /api/ai/conversations/:id
// @desc    Delete conversation and all its messages
router.delete('/conversations/:id', protect, async (req, res) => {
  try {
    const conv = await AIConversation.findOne({ _id: req.params.id, user: req.user.id });
    if (!conv) {
      // Legacy fallback delete
      const legConv = await Conversation.findOne({ _id: req.params.id, user: req.user.id });
      if (legConv) {
        await legConv.deleteOne();
        return res.status(200).json({ id: req.params.id, message: 'Deleted successfully' });
      }
      return res.status(404).json({ message: 'Conversation not found' });
    }

    await AIMessage.deleteMany({ conversation_id: conv._id });
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
// @desc    Upload file for AI analysis (up to 50MB, PDF, DOCX, TXT, CSV, JSON, images)
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
      file_name: originalname,
      storedName: filename,
      mimeType: mimetype,
      mime_type: mimetype,
      size,
      attachmentType,
      extractedText,
      url: `/api/ai/attachments/${filename}`,
      file_url: `/api/ai/attachments/${filename}`,
    };

    res.status(201).json(payload);
  } catch (error) {
    console.error('[aiRoute] Upload error:', error.message);
    res.status(400).json({ message: error.message || 'File upload failed' });
  }
});

// @route   GET /api/ai/attachments/:filename
// @desc    Securely stream an uploaded attachment
router.get('/attachments/:filename', protect, (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(uploadDir, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'Attachment file not found' });
  }

  res.sendFile(filePath);
});

// ==========================================
// CONFIRMED TOOL EXECUTION ENDPOINT
// ==========================================

// @route   POST /api/ai/tools/execute-confirmed
// @desc    Executes staged tools (e.g., bulk schedule batch commit)
router.post('/tools/execute-confirmed', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId, toolCallId, toolName, arguments: toolArgs } = req.body;

    let args = toolArgs || {};
    let messageDoc = null;

    if (messageId) {
      messageDoc = await AIMessage.findOne({ _id: messageId, user: userId });
      if (messageDoc && Array.isArray(messageDoc.tool_calls)) {
        const target = messageDoc.tool_calls.find(
          (t) => t.id === toolCallId || t._id?.toString() === toolCallId
        );
        if (target && target.arguments) {
          args = target.arguments;
        }
      }
    }

    const targetTool = toolName || 'schedule_batch_create';
    const result = await executeTool(targetTool, args, userId, true);

    if (messageDoc && Array.isArray(messageDoc.tool_calls)) {
      const target = messageDoc.tool_calls.find(
        (t) => t.id === toolCallId || t._id?.toString() === toolCallId
      );
      if (target) {
        target.status = 'executed';
        target.response = result.response;
        await messageDoc.save();
      }
    }

    res.status(200).json({
      success: true,
      toolName: targetTool,
      response: result.response,
      status: 'executed',
      message: result.response?.message || 'Tool executed successfully',
    });
  } catch (err) {
    console.error('[aiRoute] execute-confirmed error:', err.message);
    res.status(500).json({ message: err.message || 'Failed to execute confirmed tool' });
  }
});

// ==========================================
// MAIN AGENTIC CHAT EXECUTION & SSE STREAM
// ==========================================

// @route   POST /api/ai/chat
// @desc    Agentic chat endpoint with multimodal vision, tool execution, and SSE streaming
router.post('/chat', protect, async (req, res) => {
  const userId = req.user.id;
  const { conversationId, messages, attachments, includeContext, noteId } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, error: 'Please provide at least one message.' });
  }

  const lastUserMessage = messages[messages.length - 1];
  const hasText = Boolean(lastUserMessage?.content && String(lastUserMessage.content).trim());
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

  if (!hasText && !hasAttachments) {
    return res.status(400).json({ success: false, error: 'Message cannot be empty.' });
  }

  if (pendingByUser.has(userId)) {
    return res.status(429).json({ success: false, error: 'Please wait for your previous request to finish.' });
  }

  // Find or create AIConversation
  let conv = null;
  if (conversationId) {
    conv = await AIConversation.findOne({ _id: conversationId, user: userId });
  }
  if (!conv) {
    const snippet = (lastUserMessage?.content || 'New Chat').slice(0, 40).trim();
    conv = await AIConversation.create({
      user: userId,
      title: snippet || 'New Conversation',
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

  sendEvent('conversation', { conversationId: conv._id, title: conv.title });

  try {
    let attachedDocumentBlock = '';
    const promptImages = [];
    let detectedVisionSchedule = null;

    // Process attachments
    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        if (att.attachmentType === 'image') {
          const filePath = path.join(uploadDir, path.basename(att.storedName || ''));
          if (fs.existsSync(filePath)) {
            const base64 = readImageBase64(filePath);
            promptImages.push({
              mediaType: att.mimeType || 'image/jpeg',
              data: base64,
            });

            // If user mentions timetable/schedule/routine or image looks like schedule, run vision extraction
            const promptText = (lastUserMessage?.content || '').toLowerCase();
            const isTimetableIntent =
              promptText.includes('schedule') ||
              promptText.includes('routine') ||
              promptText.includes('timetable') ||
              promptText.includes('class') ||
              promptText.includes('plan');

            if (isTimetableIntent || promptImages.length === 1) {
              const visionResult = await extractScheduleFromAttachment(
                { ...att, data: base64 },
                lastUserMessage?.content,
                userId
              );
              if (visionResult && visionResult.stagedToolCall) {
                detectedVisionSchedule = visionResult;
              }
            }
          }
        } else if (att.attachmentType === 'document') {
          attachedDocumentBlock += `\n\n=== ATTACHED DOCUMENT: ${att.originalName || att.file_name} (${att.mimeType || att.mime_type}) ===\n${att.extractedText || '[No readable text extracted]'}\n=== END OF DOCUMENT ===\n`;

          // If document mentions timetable or routine
          const promptText = (lastUserMessage?.content || '').toLowerCase();
          if (
            promptText.includes('schedule') ||
            promptText.includes('routine') ||
            promptText.includes('timetable')
          ) {
            const visionResult = await extractScheduleFromAttachment(
              att,
              lastUserMessage?.content,
              userId
            );
            if (visionResult && visionResult.stagedToolCall) {
              detectedVisionSchedule = visionResult;
            }
          }
        }
      }
    }

    // Assemble messages for AI provider
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

    // Build context & system prompt
    const [contextBlock, noteBlock] = await Promise.all([
      includeContext !== false ? buildLifeVaultContext(userId) : '',
      buildNoteContext(noteId, userId),
    ]);

    const completeSystemPrompt = `${BASE_SYSTEM_PROMPT}${contextBlock}${noteBlock}${attachedDocumentBlock}`;

    // Record user message in DB
    const userAttachments = (attachments || []).map((a) => ({
      file_url: a.url || a.file_url || '',
      file_name: a.originalName || a.file_name || '',
      mime_type: a.mimeType || a.mime_type || '',
      size: a.size || 0,
    }));

    await AIMessage.create({
      conversation_id: conv._id,
      user: userId,
      role: 'user',
      content: lastUserMessage.content || '',
      attachments: userAttachments,
      created_at: new Date(),
    });

    let fullAssistantResponse = '';

    // Stream LLM response
    await streamChatCompletion(aiMessages, completeSystemPrompt, (token) => {
      fullAssistantResponse += token;
      sendEvent('token', { token });
    });

    // Parse and execute any tool calls emitted by the LLM
    const parsedCalls = parseToolCallsFromText(fullAssistantResponse);
    const executedToolCalls = [];

    // If vision schedule was extracted, automatically stage it!
    if (detectedVisionSchedule && detectedVisionSchedule.stagedToolCall) {
      executedToolCalls.push(detectedVisionSchedule.stagedToolCall);
    }

    for (const call of parsedCalls) {
      try {
        const execResult = await executeTool(call.name, call.arguments, userId, false);
        executedToolCalls.push({
          id: call.id,
          name: call.name,
          arguments: call.arguments,
          response: execResult.response,
          status: execResult.status,
        });
      } catch (toolErr) {
        console.error(`[aiRoute] Tool execution error (${call.name}):`, toolErr.message);
        executedToolCalls.push({
          id: call.id,
          name: call.name,
          arguments: call.arguments,
          response: { error: toolErr.message },
          status: 'failed',
        });
      }
    }

    // 1. Document Intent Fallback: If user asked to view/search vault documents and no doc search was emitted
    const userPrompt = (lastUserMessage.content || '').trim();
    const isDocIntent =
      /what documents (are|do) exist/i.test(userPrompt) ||
      /what documents are existed/i.test(userPrompt) ||
      /documents? (which are|that are) existed/i.test(userPrompt) ||
      /present (all )?documents/i.test(userPrompt) ||
      /show (all |my )?documents/i.test(userPrompt) ||
      /list (all |my )?documents/i.test(userPrompt) ||
      /go to vault/i.test(userPrompt) ||
      /all documents in vault/i.test(userPrompt) ||
      /find .* in vault/i.test(userPrompt) ||
      /search .* in vault/i.test(userPrompt) ||
      /vault documents/i.test(userPrompt);

    const hasDocSearchCall = executedToolCalls.some((c) => c.name === 'vault_search_documents');
    if (isDocIntent && !hasDocSearchCall) {
      try {
        let searchQuery = '';
        const findMatch = userPrompt.match(/find\s+([A-Za-z0-9\s]+?)\s+in\s+vault/i) || userPrompt.match(/search\s+([A-Za-z0-9\s]+?)\s+in\s+vault/i);
        if (findMatch) searchQuery = findMatch[1].trim();

        const docResult = await executeTool('vault_search_documents', { query: searchQuery }, userId, false);
        executedToolCalls.push({
          id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: 'vault_search_documents',
          arguments: { query: searchQuery },
          response: docResult.response,
          status: docResult.status,
        });
      } catch (err) {
        console.error('[aiRoute] Fallback doc search error:', err.message);
      }
    }

    // 2. Schedule Intent Fallback: If user provided a routine/timetable to add to Command Center and no schedule batch was emitted
    const isScheduleIntent =
      ((/operating system|routine|split|timetable|command center|schedule blocks|add block/i.test(userPrompt) &&
        /\d{1,2}:\d{2}\s*(?:am|pm)?/i.test(userPrompt)) ||
       (/add .* (to )?command center/i.test(userPrompt) && /\d{1,2}:\d{2}/.test(userPrompt)) ||
       (/with their timings?/i.test(userPrompt) && /\d{1,2}:\d{2}/.test(userPrompt)));

    const hasScheduleBatchCall = executedToolCalls.some((c) => c.name === 'schedule_batch_create');
    if (isScheduleIntent && !hasScheduleBatchCall) {
      try {
        const scheduleResult = await extractScheduleFromText(userPrompt, 'Extract routine blocks into Command Center.', userId);
        if (scheduleResult && scheduleResult.stagedToolCall) {
          executedToolCalls.push(scheduleResult.stagedToolCall);
        }
      } catch (err) {
        console.error('[aiRoute] Fallback schedule extraction error:', err.message);
      }
    }

    // Inform client of executed tools
    if (executedToolCalls.length > 0) {
      sendEvent('tool_calls', { tool_calls: executedToolCalls });
    }

    // Clean up tool_call / json code blocks from displayed content so chat looks clean
    let cleanContent = fullAssistantResponse
      .replace(/```(?:tool_call|json)[\s\S]*?(?:```|$)/gi, '')
      .replace(/####\s*📅\s*Weekly Schedule[^\n]*/gi, '')
      .trim();

    // Check for hallucinated documents in cleanContent:
    const docCall = executedToolCalls.find((c) => c.name === 'vault_search_documents');
    if (docCall && docCall.response?.results) {
      const realDocs = docCall.response.results;
      const hallucinatedKeywords = [
        'Mortgage Agreement',
        'Passport – India',
        'Annual Tax Return 2023',
        'Gym Membership Contract',
        'Travel Itinerary – Japan',
        'Driving License',
        'Blood Test Report – June',
      ];
      const hasHallucination = hallucinatedKeywords.some((k) => cleanContent.includes(k));
      if (hasHallucination) {
        cleanContent = `Here are the ${realDocs.length} documents currently stored in your Life Vault. You can preview, download, or inspect them directly in the interactive cards below:`;
      }
    }

    // If schedule batch is staged, ensure cleanContent is user-friendly
    if (executedToolCalls.some((c) => c.name === 'schedule_batch_create')) {
      if (!cleanContent || cleanContent.length < 20 || /once you confirm/i.test(cleanContent) || /startTime/i.test(cleanContent)) {
        cleanContent = `I have parsed your routine into Command Center blocks! Please review the schedule blocks in the interactive table below and click **"Approve & Add to Schedule ✅"** to add them to your routine.`;
      }
    }

    // Persist assistant message in DB
    const assistantMsg = await AIMessage.create({
      conversation_id: conv._id,
      user: userId,
      role: 'assistant',
      content: cleanContent || fullAssistantResponse,
      tool_calls: executedToolCalls,
      created_at: new Date(),
    });

    // Update conversation timestamp
    conv.updated_at = new Date();
    await conv.save();

    sendEvent('done', {
      conversationId: conv._id,
      messageId: assistantMsg._id,
      tool_calls: executedToolCalls,
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