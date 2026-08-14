const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Memory = require('../models/memories');
const { protect } = require('../middleware/authMiddleware');
const { mediaUpload, uploadDir } = require('../config/mediaUpload');

router.get('/', protect, async (req, res) => {
  try {
    const memories = await Memory.find({ user: req.user.id }).sort({ date: -1 });
    res.status(200).json(memories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    if (!req.body.title || !req.body.date) {
      return res.status(400).json({ message: 'Please add a title and date' });
    }
    const memory = await Memory.create({ ...req.body, user: req.user.id });
    res.status(201).json(memory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) return res.status(404).json({ message: 'Memory not found' });
    if (memory.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to delete this memory' });
    }
    // Clean up any attached media files on disk too, not just the DB record
    memory.media.forEach((m) => {
      const filePath = path.join(uploadDir, m.storedName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
    await memory.deleteOne();
    res.status(200).json({ id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/memories/:id/media
// @desc    Attach one or more photos/videos to an existing memory
router.post('/:id/media', protect, mediaUpload.array('files', 6), async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) return res.status(404).json({ message: 'Memory not found' });
    if (memory.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to update this memory' });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const newMedia = req.files.map((f) => ({
      originalName: f.originalname,
      storedName: f.filename,
      mimeType: f.mimetype,
      size: f.size,
    }));
    memory.media.push(...newMedia);
    await memory.save();

    res.status(201).json(memory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/memories/:id/media/:mediaId
// @desc    Stream a media file back for viewing (auth required, not a public URL)
router.get('/:id/media/:mediaId', protect, async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) return res.status(404).json({ message: 'Memory not found' });
    if (memory.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to access this file' });
    }
    const item = memory.media.id(req.params.mediaId);
    if (!item) return res.status(404).json({ message: 'Media not found' });

    const filePath = path.join(uploadDir, item.storedName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File missing from storage' });
    }

    res.setHeader('Content-Type', item.mimeType);
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/memories/:id/media/:mediaId
router.delete('/:id/media/:mediaId', protect, async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) return res.status(404).json({ message: 'Memory not found' });
    if (memory.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to update this memory' });
    }
    const item = memory.media.id(req.params.mediaId);
    if (!item) return res.status(404).json({ message: 'Media not found' });

    const filePath = path.join(uploadDir, item.storedName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    item.deleteOne();
    await memory.save();
    res.status(200).json(memory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
