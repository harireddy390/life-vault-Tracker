const express = require('express');
const router = express.Router();
const Note = require('../models/notes');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/notes
router.get('/', protect, async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user.id }).sort({ pinned: -1, updatedAt: -1 });
    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/notes
router.post('/', protect, async (req, res) => {
  try {
    if (!req.body.title) {
      return res.status(400).json({ message: 'Please add a title' });
    }
    const note = await Note.create({
      title: req.body.title,
      content: req.body.content || '',
      user: req.user.id,
    });
    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/notes/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (note.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to update this note' });
    }
    const updated = await Note.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/notes/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (note.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to delete this note' });
    }
    await note.deleteOne();
    res.status(200).json({ id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
