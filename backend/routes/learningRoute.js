const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/authMiddleware');

const LearningTopic = require('../models/LearningTopic');
const StudyNote = require('../models/StudyNote');
const FlashcardDeck = require('../models/FlashcardDeck');
const Flashcard = require('../models/Flashcard');
const LearningResource = require('../models/LearningResource');

// ─── Multer config for resource file uploads ──────────────────────────────────
const uploadDir = path.join(__dirname, '../uploads/learning');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 52428800 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error('Only PDF and image files are allowed'));
  },
});

// ─── Helper ───────────────────────────────────────────────────────────────────
function ownerCheck(doc, userId, res) {
  if (!doc) { res.status(404).json({ message: 'Not found' }); return false; }
  if (doc.user.toString() !== userId) { res.status(401).json({ message: 'Not authorized' }); return false; }
  return true;
}

// =============================================================================
// STATS  GET /api/learning/stats
// =============================================================================
router.get('/stats', protect, async (req, res) => {
  try {
    const uid = req.user.id;
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const [totalNotes, dueFlashcards, activeRoadmaps, totalResources] = await Promise.all([
      StudyNote.countDocuments({ user: uid }),
      Flashcard.countDocuments({ user: uid, next_review_due: { $lte: today } }),
      LearningTopic.countDocuments({ user: uid, progress_percent: { $lt: 100 } }),
      LearningResource.countDocuments({ user: uid }),
    ]);

    res.json({ totalNotes, dueFlashcards, activeRoadmaps, totalResources });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =============================================================================
// STUDY NOTES
// =============================================================================

// GET /api/learning/notes  — paginated, searchable, filterable
router.get('/notes', protect, async (req, res) => {
  try {
    const { search, tag, topic, page = 1, limit = 50 } = req.query;
    const query = { user: req.user.id };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content_markdown: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }
    if (tag) query.tags = tag;
    if (topic) query.topic_id = topic;

    const notes = await StudyNote.find(query)
      .sort({ is_pinned: -1, updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('topic_id', 'title color');

    const total = await StudyNote.countDocuments(query);
    res.json({ notes, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/learning/notes
router.post('/notes', protect, async (req, res) => {
  try {
    const { title, content_markdown, tags, topic_id, language_hint } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const note = await StudyNote.create({
      user: req.user.id,
      title,
      content_markdown: content_markdown || '',
      tags: Array.isArray(tags) ? tags : [],
      topic_id: topic_id || null,
      language_hint: language_hint || '',
    });
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/learning/notes/:id
router.put('/notes/:id', protect, async (req, res) => {
  try {
    const note = await StudyNote.findById(req.params.id);
    if (!ownerCheck(note, req.user.id, res)) return;
    const { title, content_markdown, tags, topic_id, language_hint } = req.body;
    if (title !== undefined) note.title = title;
    if (content_markdown !== undefined) note.content_markdown = content_markdown;
    if (tags !== undefined) note.tags = Array.isArray(tags) ? tags : [];
    if (topic_id !== undefined) note.topic_id = topic_id || null;
    if (language_hint !== undefined) note.language_hint = language_hint;
    await note.save();
    res.json(note);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/learning/notes/:id
router.delete('/notes/:id', protect, async (req, res) => {
  try {
    const note = await StudyNote.findById(req.params.id);
    if (!ownerCheck(note, req.user.id, res)) return;
    await note.deleteOne();
    res.json({ id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/learning/notes/:id/pin
router.patch('/notes/:id/pin', protect, async (req, res) => {
  try {
    const note = await StudyNote.findById(req.params.id);
    if (!ownerCheck(note, req.user.id, res)) return;
    note.is_pinned = !note.is_pinned;
    await note.save();
    res.json(note);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =============================================================================
// FLASHCARD DECKS
// =============================================================================

// GET /api/learning/flashcards/decks
router.get('/flashcards/decks', protect, async (req, res) => {
  try {
    const decks = await FlashcardDeck.find({ user: req.user.id }).sort({ createdAt: -1 });
    // Attach card counts
    const deckIds = decks.map((d) => d._id);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const counts = await Flashcard.aggregate([
      { $match: { user: req.user._id, deck_id: { $in: deckIds } } },
      {
        $group: {
          _id: '$deck_id',
          total: { $sum: 1 },
          due: { $sum: { $cond: [{ $lte: ['$next_review_due', today] }, 1, 0] } },
        },
      },
    ]);

    const countMap = {};
    counts.forEach((c) => { countMap[c._id.toString()] = { total: c.total, due: c.due }; });

    const result = decks.map((d) => ({
      ...d.toObject(),
      card_count: countMap[d._id.toString()]?.total || 0,
      due_count: countMap[d._id.toString()]?.due || 0,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/learning/flashcards/decks
router.post('/flashcards/decks', protect, async (req, res) => {
  try {
    const { title, description, color, topic_id } = req.body;
    if (!title) return res.status(400).json({ message: 'Deck title is required' });
    const deck = await FlashcardDeck.create({
      user: req.user.id,
      title,
      description: description || '',
      color: color || '#6366F1',
      topic_id: topic_id || null,
    });
    res.status(201).json(deck);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/learning/flashcards/decks/:id
router.delete('/flashcards/decks/:id', protect, async (req, res) => {
  try {
    const deck = await FlashcardDeck.findById(req.params.id);
    if (!ownerCheck(deck, req.user.id, res)) return;
    await Flashcard.deleteMany({ deck_id: deck._id });
    await deck.deleteOne();
    res.json({ id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =============================================================================
// FLASHCARDS
// =============================================================================

// GET /api/learning/flashcards/due  — due today or overdue
router.get('/flashcards/due', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const { deck_id } = req.query;
    const query = { user: req.user.id, next_review_due: { $lte: today } };
    if (deck_id) query.deck_id = deck_id;

    const cards = await Flashcard.find(query)
      .sort({ box_level: 1, next_review_due: 1 })
      .populate('deck_id', 'title color');
    res.json(cards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/learning/flashcards?deck_id=  — all cards in a deck
router.get('/flashcards', protect, async (req, res) => {
  try {
    const { deck_id } = req.query;
    const query = { user: req.user.id };
    if (deck_id) query.deck_id = deck_id;
    const cards = await Flashcard.find(query).sort({ createdAt: -1 });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/learning/flashcards
router.post('/flashcards', protect, async (req, res) => {
  try {
    const { deck_id, prompt_front, answer_back, code_snippet, code_language } = req.body;
    if (!deck_id) return res.status(400).json({ message: 'deck_id is required' });
    if (!prompt_front) return res.status(400).json({ message: 'Front prompt is required' });
    if (!answer_back) return res.status(400).json({ message: 'Back answer is required' });

    // Verify deck ownership
    const deck = await FlashcardDeck.findById(deck_id);
    if (!ownerCheck(deck, req.user.id, res)) return;

    const card = await Flashcard.create({
      user: req.user.id,
      deck_id,
      prompt_front,
      answer_back,
      code_snippet: code_snippet || null,
      code_language: code_language || '',
    });
    res.status(201).json(card);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/learning/flashcards/:id/grade
router.patch('/flashcards/:id/grade', protect, async (req, res) => {
  try {
    const { grade } = req.body; // 'again' | 'good' | 'easy' | 'mastered'
    if (!['again', 'good', 'easy', 'mastered'].includes(grade)) {
      return res.status(400).json({ message: 'grade must be again | good | easy | mastered' });
    }
    const card = await Flashcard.findById(req.params.id);
    if (!ownerCheck(card, req.user.id, res)) return;
    card.applyGrade(grade);
    await card.save();
    res.json(card);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/learning/flashcards/:id
router.delete('/flashcards/:id', protect, async (req, res) => {
  try {
    const card = await Flashcard.findById(req.params.id);
    if (!ownerCheck(card, req.user.id, res)) return;
    await card.deleteOne();
    res.json({ id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =============================================================================
// ROADMAPS (Learning Topics)
// =============================================================================

// GET /api/learning/roadmaps
router.get('/roadmaps', protect, async (req, res) => {
  try {
    const topics = await LearningTopic.find({ user: req.user.id }).sort({ updatedAt: -1 });
    res.json(topics);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/learning/roadmaps
router.post('/roadmaps', protect, async (req, res) => {
  try {
    const { title, description, category, target_date, color, steps } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const topic = new LearningTopic({
      user: req.user.id,
      title,
      description: description || '',
      category: category || 'Software_Engineering',
      target_date: target_date || null,
      color: color || '#4F46E5',
      steps: Array.isArray(steps)
        ? steps.map((s, i) => ({ title: typeof s === 'string' ? s : s.title, order: i }))
        : [],
    });
    topic.recalcProgress();
    await topic.save();
    res.status(201).json(topic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/learning/roadmaps/:id
router.put('/roadmaps/:id', protect, async (req, res) => {
  try {
    const topic = await LearningTopic.findById(req.params.id);
    if (!ownerCheck(topic, req.user.id, res)) return;
    const { title, description, category, target_date, color } = req.body;
    if (title !== undefined) topic.title = title;
    if (description !== undefined) topic.description = description;
    if (category !== undefined) topic.category = category;
    if (target_date !== undefined) topic.target_date = target_date;
    if (color !== undefined) topic.color = color;
    await topic.save();
    res.json(topic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/learning/roadmaps/:id
router.delete('/roadmaps/:id', protect, async (req, res) => {
  try {
    const topic = await LearningTopic.findById(req.params.id);
    if (!ownerCheck(topic, req.user.id, res)) return;
    // Nullify topic_id on associated notes/resources
    await StudyNote.updateMany({ user: req.user.id, topic_id: topic._id }, { topic_id: null });
    await LearningResource.updateMany({ user: req.user.id, topic_id: topic._id }, { topic_id: null });
    await topic.deleteOne();
    res.json({ id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/learning/roadmaps/:id/steps  — add a step
router.post('/roadmaps/:id/steps', protect, async (req, res) => {
  try {
    const topic = await LearningTopic.findById(req.params.id);
    if (!ownerCheck(topic, req.user.id, res)) return;
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: 'Step title is required' });
    topic.steps.push({ title, order: topic.steps.length });
    topic.recalcProgress();
    await topic.save();
    res.status(201).json(topic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/learning/roadmaps/steps/:topicId/:stepId/toggle
router.patch('/roadmaps/steps/:topicId/:stepId/toggle', protect, async (req, res) => {
  try {
    const topic = await LearningTopic.findById(req.params.topicId);
    if (!ownerCheck(topic, req.user.id, res)) return;
    const step = topic.steps.id(req.params.stepId);
    if (!step) return res.status(404).json({ message: 'Step not found' });
    step.isCompleted = !step.isCompleted;
    topic.recalcProgress();
    await topic.save();
    res.json(topic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/learning/roadmaps/steps/:topicId/:stepId
router.delete('/roadmaps/steps/:topicId/:stepId', protect, async (req, res) => {
  try {
    const topic = await LearningTopic.findById(req.params.topicId);
    if (!ownerCheck(topic, req.user.id, res)) return;
    topic.steps = topic.steps.filter((s) => s._id.toString() !== req.params.stepId);
    topic.recalcProgress();
    await topic.save();
    res.json(topic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =============================================================================
// LEARNING RESOURCES
// =============================================================================

// GET /api/learning/resources
router.get('/resources', protect, async (req, res) => {
  try {
    const resources = await LearningResource.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate('topic_id', 'title');
    res.json(resources);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/learning/resources  — create without file
router.post('/resources', protect, async (req, res) => {
  try {
    const { title, resource_type, author, url, total_units, unit_label, cover_color, topic_id } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });
    const resource = await LearningResource.create({
      user: req.user.id,
      title,
      resource_type: resource_type || 'Book',
      author: author || '',
      url: url || '',
      total_units: Number(total_units) || 1,
      unit_label: unit_label || 'pages',
      cover_color: cover_color || '#4F46E5',
      topic_id: topic_id || null,
    });
    res.status(201).json(resource);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/learning/resources/upload  — create with file attachment
router.post('/resources/upload', protect, upload.single('file'), async (req, res) => {
  try {
    const { title, resource_type, author, url, total_units, unit_label, cover_color, topic_id } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    let file_url = null;
    let file_name = null;
    let file_size_bytes = null;

    if (req.file) {
      file_url = `/uploads/learning/${req.file.filename}`;
      file_name = req.file.originalname;
      file_size_bytes = req.file.size;
    }

    const resource = await LearningResource.create({
      user: req.user.id,
      title,
      resource_type: resource_type || 'PDF_Cheatsheet',
      author: author || '',
      url: url || '',
      total_units: Number(total_units) || 1,
      unit_label: unit_label || 'pages',
      cover_color: cover_color || '#4F46E5',
      topic_id: topic_id || null,
      file_url,
      file_name,
      file_size_bytes,
    });
    res.status(201).json(resource);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/learning/resources/:id/progress
router.patch('/resources/:id/progress', protect, async (req, res) => {
  try {
    const resource = await LearningResource.findById(req.params.id);
    if (!ownerCheck(resource, req.user.id, res)) return;
    const { current_progress } = req.body;
    if (current_progress === undefined) return res.status(400).json({ message: 'current_progress is required' });
    resource.current_progress = Math.min(Number(current_progress), resource.total_units);
    await resource.save(); // pre-save hook updates status
    res.json(resource);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/learning/resources/:id
router.put('/resources/:id', protect, async (req, res) => {
  try {
    const resource = await LearningResource.findById(req.params.id);
    if (!ownerCheck(resource, req.user.id, res)) return;
    const fields = ['title', 'resource_type', 'author', 'url', 'total_units', 'unit_label', 'cover_color', 'topic_id'];
    fields.forEach((f) => { if (req.body[f] !== undefined) resource[f] = req.body[f]; });
    await resource.save();
    res.json(resource);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/learning/resources/:id
router.delete('/resources/:id', protect, async (req, res) => {
  try {
    const resource = await LearningResource.findById(req.params.id);
    if (!ownerCheck(resource, req.user.id, res)) return;

    // Remove physical file if present
    if (resource.file_url) {
      const cleanRel = resource.file_url.replace(/^[/\\]+/, '');
      const filePath = path.join(__dirname, '..', cleanRel);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await resource.deleteOne();
    res.json({ id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
