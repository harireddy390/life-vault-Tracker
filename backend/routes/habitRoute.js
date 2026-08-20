const express = require('express');
const router = express.Router();
const Habit = require('../models/habits');
const { protect } = require('../middleware/authMiddleware');

// @route GET /api/habits
// @desc  List the user's habits/tasks. ?includeArchived=true also returns inactive ones.
router.get('/', protect, async (req, res) => {
  try {
    const filter = { user: req.user.id };
    if (req.query.includeArchived !== 'true') filter.active = true;
    const habits = await Habit.find(filter).sort({ important: -1, createdAt: -1 });
    res.status(200).json(habits);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { title, description, important, frequency, daysOfWeek, startDate, endDate, reminderTime } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Please add a title' });
    }
    if (!startDate) {
      return res.status(400).json({ message: 'Please add a start date' });
    }
    if (frequency === 'custom' && (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0)) {
      return res.status(400).json({ message: 'Please select at least one day for a custom frequency' });
    }

    const habit = await Habit.create({
      user: req.user.id,
      title: title.trim(),
      description: description || '',
      important: Boolean(important),
      frequency: frequency || 'daily',
      daysOfWeek: frequency === 'custom' ? daysOfWeek : [],
      startDate,
      endDate: endDate || null,
      reminderTime: reminderTime || null,
    });
    res.status(201).json(habit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);
    if (!habit) return res.status(404).json({ message: 'Task not found' });
    if (habit.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to update this task' });
    }
    // Editing keeps the same _id, so existing Progress records (which
    // reference this _id) stay correctly linked to their history — renaming
    // a task never disconnects it from past completions.
    const updated = await Habit.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route DELETE /api/habits/:id
// @desc  Soft-delete: sets active=false instead of removing the document, so
//        Progress records for past dates keep a valid task to reference and
//        that day's history stays intact and viewable.
router.delete('/:id', protect, async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);
    if (!habit) return res.status(404).json({ message: 'Task not found' });
    if (habit.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to delete this task' });
    }
    habit.active = false;
    await habit.save();
    res.status(200).json({ id: req.params.id, archived: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;