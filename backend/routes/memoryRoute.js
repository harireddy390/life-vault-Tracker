const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Memory = require('../models/Memory');
const { protect } = require('../middleware/authMiddleware');

// ─── Multer Storage for Memory Media ─────────────────────────────────────────
const uploadDir = path.join(__dirname, '../uploads/memories');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 52428800 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      // Images
      '.jpg', '.jpeg', '.png', '.webp', '.gif',
      // Videos
      '.mp4', '.webm', '.mov', '.mkv',
      // Audio
      '.mp3', '.wav', '.m4a', '.ogg', '.aac'
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    const isAllowedExt = allowed.includes(ext);
    const isAllowedMime =
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('video/') ||
      file.mimetype.startsWith('audio/');

    if (isAllowedExt || isAllowedMime) {
      return cb(null, true);
    }
    cb(new Error('Only photos, videos, and audio clips are supported'));
  },
});

// Helper function to map mime type to media_type
function detectMediaType(mimetype, ext) {
  if (mimetype?.startsWith('video/') || ['.mp4', '.webm', '.mov', '.mkv'].includes(ext)) {
    return 'video';
  }
  if (mimetype?.startsWith('audio/') || ['.mp3', '.wav', '.m4a', '.ogg', '.aac'].includes(ext)) {
    return 'audio';
  }
  return 'image';
}

// Helper: Owner check
function checkOwner(memory, userId, res) {
  if (!memory) {
    res.status(404).json({ message: 'Memory not found' });
    return false;
  }
  if (memory.user.toString() !== userId) {
    res.status(401).json({ message: 'Not authorized to access this memory' });
    return false;
  }
  return true;
}

// =============================================================================
// MEMORY TIMELINE & SPECIAL VIEWS
// =============================================================================

// GET /api/memories/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const uid = req.user.id;
    const memories = await Memory.find({ user: uid });

    const totalMemories = memories.length;
    let totalMedia = 0;
    const yearsSet = new Set();
    let favoritesCount = 0;
    let lockedCount = 0;
    const now = new Date();

    memories.forEach((m) => {
      totalMedia += (m.media || []).length;
      if (m.memory_date) {
        yearsSet.add(new Date(m.memory_date).getFullYear());
      }
      if (m.is_favorite) favoritesCount++;
      if (m.lock_until_date && new Date(m.lock_until_date) > now) lockedCount++;
    });

    res.json({
      total_memories: totalMemories,
      total_media: totalMedia,
      years_chronicled: yearsSet.size,
      favorites_count: favoritesCount,
      locked_count: lockedCount,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/memories/throwback ("On This Day" matching month & day from prior years)
router.get('/throwback', protect, async (req, res) => {
  try {
    const uid = req.user.id;
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();

    const throwbacks = await Memory.aggregate([
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ['$user', req.user._id || new (require('mongoose').Types.ObjectId)(uid)] },
              { $eq: [{ $month: '$memory_date' }, currentMonth] },
              { $eq: [{ $dayOfMonth: '$memory_date' }, currentDay] },
              { $lt: [{ $year: '$memory_date' }, currentYear] },
            ],
          },
        },
      },
      { $sort: { memory_date: -1 } },
    ]);

    // Format response (hide locked media if still locked)
    const formatted = throwbacks.map((m) => {
      const isLocked = m.lock_until_date && new Date(m.lock_until_date) > today;
      return {
        ...m,
        is_locked: isLocked,
        story_text: isLocked ? '🔒 This memory capsule is locked until the specified date.' : m.story_text,
        media: isLocked ? [] : m.media,
        years_ago: currentYear - new Date(m.memory_date).getFullYear(),
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/memories/timeline (Grouped by Year & Month)
router.get('/timeline', protect, async (req, res) => {
  try {
    const uid = req.user.id;
    const { tag, mood, year, search, favorite } = req.query;

    const query = { user: uid };
    if (tag && tag !== 'all') query.tags = tag;
    if (mood && mood !== 'all') query.mood = mood;
    if (favorite === 'true') query.is_favorite = true;

    if (year && year !== 'all') {
      const startYear = new Date(`${year}-01-01T00:00:00.000Z`);
      const endYear = new Date(`${parseInt(year, 10) + 1}-01-01T00:00:00.000Z`);
      query.memory_date = { $gte: startYear, $lt: endYear };
    }

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { story_text: { $regex: q, $options: 'i' } },
        { location_name: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
      ];
    }

    const memories = await Memory.find(query).sort({ memory_date: -1 });

    const now = new Date();
    const monthsNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Grouping structure: { "2026": { "September": [ ... ] } }
    const grouped = {};
    const flatList = [];

    memories.forEach((doc) => {
      const item = doc.toObject({ virtuals: true });
      const isLocked = item.lock_until_date && new Date(item.lock_until_date) > now;
      if (isLocked) {
        item.story_text = '🔒 This memory capsule is locked until the specified date.';
        item.media = [];
        item.is_locked = true;
      } else {
        item.is_locked = false;
        if (Array.isArray(item.media)) {
          item.media = item.media.map((m) => {
            const stored = m.storedName || (m.file_url ? path.basename(m.file_url) : '');
            const fileUrl = m.file_url || (stored ? `/uploads/memories/${stored}` : '');
            const fileName = m.file_name || m.originalName || stored || 'photo.jpeg';
            return {
              ...m,
              file_url: fileUrl,
              file_name: fileName,
              storedName: stored,
              originalName: m.originalName || fileName,
              media_type: m.media_type || (m.mimeType?.startsWith('video/') ? 'video' : m.mimeType?.startsWith('audio/') ? 'audio' : 'image'),
            };
          });
        }
      }

      const effectiveDate = item.memory_date || item.date || item.createdAt || new Date();
      item.memory_date = effectiveDate;
      item.date = effectiveDate;
      item.story_text = item.story_text || item.description || '';
      item.description = item.story_text;

      const d = new Date(effectiveDate);
      const y = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
      const m = isNaN(d.getMonth()) ? monthsNames[new Date().getMonth()] : monthsNames[d.getMonth()];

      if (!grouped[y]) grouped[y] = {};
      if (!grouped[y][m]) grouped[y][m] = [];

      grouped[y][m].push(item);
      flatList.push(item);
    });

    const timelineArray = Object.keys(grouped)
      .sort((a, b) => b - a)
      .map((year) => ({
        year: parseInt(year, 10),
        count: Object.values(grouped[year]).reduce((acc, list) => acc + list.length, 0),
        months: Object.keys(grouped[year])
          .sort((a, b) => monthsNames.indexOf(b) - monthsNames.indexOf(a))
          .map((month) => ({
            month,
            count: grouped[year][month].length,
            memories: grouped[year][month],
          })),
      }));

    res.json(timelineArray);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =============================================================================
// STANDARD MEMORIES CRUD
// =============================================================================

// GET /api/memories (Flat list with sorting & filtering)
router.get('/', protect, async (req, res) => {
  try {
    const uid = req.user.id;
    const { tag, mood, search, favorite } = req.query;

    const query = { user: uid };
    if (tag && tag !== 'all') query.tags = tag;
    if (mood && mood !== 'all') query.mood = mood;
    if (favorite === 'true') query.is_favorite = true;
    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { story_text: { $regex: q, $options: 'i' } },
        { location_name: { $regex: q, $options: 'i' } },
      ];
    }

    const memories = await Memory.find(query).sort({ memory_date: -1 });
    res.json(memories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/memories/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!checkOwner(memory, req.user.id, res)) return;
    res.json(memory);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/memories (Multipart file upload up to 10 files)
router.post('/', protect, upload.array('files', 10), async (req, res) => {
  try {
    const {
      title,
      story_text,
      description, // legacy fallback
      memory_date,
      date, // legacy fallback
      location_name,
      mood,
      tags,
      is_favorite,
      lock_until_date,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const effectiveDate = memory_date || date || new Date();
    const effectiveStory = story_text || description || '';

    // Parse tags (array, comma-separated string, or JSON string)
    let parsedTags = [];
    if (Array.isArray(tags)) {
      parsedTags = tags;
    } else if (typeof tags === 'string' && tags.trim()) {
      try {
        const json = JSON.parse(tags);
        parsedTags = Array.isArray(json) ? json : tags.split(',').map((t) => t.trim()).filter(Boolean);
      } catch {
        parsedTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
      }
    }

    // Process uploaded files
    const mediaList = (req.files || []).map((file) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const media_type = detectMediaType(file.mimetype, ext);
      return {
        media_type,
        file_url: `/uploads/memories/${file.filename}`,
        file_name: file.originalname,
        file_size_bytes: file.size,
        mime_type: file.mimetype,
      };
    });

    const memory = await Memory.create({
      user: req.user.id,
      title: title.trim(),
      story_text: effectiveStory.trim(),
      memory_date: new Date(effectiveDate),
      location_name: (location_name || '').trim(),
      mood: mood || 'Joyful',
      tags: parsedTags,
      is_favorite: is_favorite === 'true' || is_favorite === true,
      lock_until_date: lock_until_date ? new Date(lock_until_date) : null,
      media: mediaList,
    });

    res.status(201).json(memory);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/memories/:id (Update metadata)
router.put('/:id', protect, async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!checkOwner(memory, req.user.id, res)) return;

    const {
      title,
      story_text,
      description,
      memory_date,
      date,
      location_name,
      mood,
      tags,
      is_favorite,
      lock_until_date,
    } = req.body;

    if (title !== undefined) memory.title = title.trim();
    if (story_text !== undefined) memory.story_text = story_text.trim();
    else if (description !== undefined) memory.story_text = description.trim();

    if (memory_date !== undefined) memory.memory_date = new Date(memory_date);
    else if (date !== undefined) memory.memory_date = new Date(date);

    if (location_name !== undefined) memory.location_name = location_name.trim();
    if (mood !== undefined) memory.mood = mood;

    if (tags !== undefined) {
      if (Array.isArray(tags)) memory.tags = tags;
      else if (typeof tags === 'string') {
        memory.tags = tags.split(',').map((t) => t.trim()).filter(Boolean);
      }
    }

    if (is_favorite !== undefined) memory.is_favorite = Boolean(is_favorite);
    if (lock_until_date !== undefined) {
      memory.lock_until_date = lock_until_date ? new Date(lock_until_date) : null;
    }

    await memory.save();
    res.json(memory);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/memories/:id/favorite (Toggle favorite)
router.patch('/:id/favorite', protect, async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!checkOwner(memory, req.user.id, res)) return;

    memory.is_favorite = !memory.is_favorite;
    await memory.save();

    res.json({ id: memory._id, is_favorite: memory.is_favorite });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/memories/:id (Cascade clean up of files)
router.delete('/:id', protect, async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!checkOwner(memory, req.user.id, res)) return;

    // Delete attached physical media files
    (memory.media || []).forEach((m) => {
      if (m.file_url) {
        const filePath = path.join(__dirname, '..', m.file_url.replace(/^[/\\]+/, ''));
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (e) { console.error('Error unlinking media:', e); }
        }
      }
    });

    await memory.deleteOne();
    res.json({ id: req.params.id, message: 'Memory deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/memories/:id/media (Attach additional files)
router.post('/:id/media', protect, upload.array('files', 10), async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!checkOwner(memory, req.user.id, res)) return;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No media files provided' });
    }

    const newMedia = req.files.map((file) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const media_type = detectMediaType(file.mimetype, ext);
      return {
        media_type,
        file_url: `/uploads/memories/${file.filename}`,
        file_name: file.originalname,
        file_size_bytes: file.size,
        mime_type: file.mimetype,
      };
    });

    memory.media = [...(memory.media || []), ...newMedia];
    await memory.save();

    res.status(201).json(memory);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/memories/:id/media/:mediaId (Stream media file for backward compatibility)
router.get('/:id/media/:mediaId', protect, async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!checkOwner(memory, req.user.id, res)) return;

    const mediaItem = (memory.media || []).find(
      (m) => m._id.toString() === req.params.mediaId
    );
    if (!mediaItem) {
      return res.status(404).json({ message: 'Media attachment not found' });
    }

    const filename = mediaItem.storedName || (mediaItem.file_url ? path.basename(mediaItem.file_url) : '');
    const filePath = path.join(__dirname, '..', 'uploads', 'memories', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Media file not found on disk' });
    }

    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/memories/:id/media/:mediaId (Remove single media item)
router.delete('/:id/media/:mediaId', protect, async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!checkOwner(memory, req.user.id, res)) return;

    const mediaItem = memory.media.id(req.params.mediaId);
    if (!mediaItem) {
      return res.status(404).json({ message: 'Media attachment not found' });
    }

    // Unlink physical file
    if (mediaItem.file_url) {
      const filePath = path.join(__dirname, '..', mediaItem.file_url.replace(/^[/\\]+/, ''));
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { console.error('Error unlinking media item:', e); }
      }
    }

    memory.media = memory.media.filter((m) => m._id.toString() !== req.params.mediaId);
    await memory.save();

    res.json(memory);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
