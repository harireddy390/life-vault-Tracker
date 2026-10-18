const express = require('express');
const router = express.Router();
const Habit = require('../models/habits');
const Progress = require('../models/Progress');
const ActivityLog = require('../models/ActivityLog');
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

// @route POST /api/habits
// @desc  Create a new habit / task
router.post('/', protect, async (req, res) => {
  try {
    const title = req.body.title || req.body.text;
    const {
      description,
      important,
      frequency,
      daysOfWeek,
      startDate,
      endDate,
      reminderTime,
      category,
      type,
      targetValue,
      targetUnit,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Please add a title' });
    }
    if (!startDate) {
      return res.status(400).json({ message: 'Please add a start date' });
    }

    let finalDays = [];
    if (frequency === 'everyday' || frequency === 'daily') finalDays = [0, 1, 2, 3, 4, 5, 6];
    else if (frequency === 'weekdays') finalDays = [1, 2, 3, 4, 5];
    else if (frequency === 'weekends') finalDays = [0, 6];
    else if (Array.isArray(daysOfWeek)) finalDays = daysOfWeek;

    if (frequency === 'custom' && finalDays.length === 0) {
      return res.status(400).json({ message: 'Please select at least one day for a custom frequency' });
    }

    const habit = await Habit.create({
      user: req.user.id,
      title: title.trim(),
      description: (description || '').trim(),
      important: Boolean(important),
      frequency: frequency || 'everyday',
      daysOfWeek: finalDays,
      startDate,
      endDate: endDate || null,
      reminderTime: reminderTime || null,
      category: category || 'Personal',
      type: type || 'binary',
      targetValue: type === 'quantifiable' && targetValue ? Number(targetValue) : null,
      targetUnit: type === 'quantifiable' ? (targetUnit || null) : null,
      active: true,
    });
    res.status(201).json(habit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route PUT /api/habits/:id
// @desc  Update habit details and persist changes
router.put('/:id', protect, async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);
    if (!habit) return res.status(404).json({ message: 'Task not found' });
    if (habit.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to update this task' });
    }

    const allowedFields = [
      'title', 'text', 'description', 'important', 'frequency', 'daysOfWeek',
      'startDate', 'endDate', 'reminderTime', 'category', 'type',
      'targetValue', 'targetUnit', 'active'
    ];
    const safeUpdates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) safeUpdates[key] = req.body[key];
    }
    if (safeUpdates.text && !safeUpdates.title) {
      safeUpdates.title = safeUpdates.text;
    }
    delete safeUpdates.text;
    delete safeUpdates.user;
    delete safeUpdates._id;

    if (safeUpdates.title !== undefined) {
      if (!safeUpdates.title || !safeUpdates.title.trim()) {
        return res.status(400).json({ message: 'Title cannot be empty' });
      }
      safeUpdates.title = safeUpdates.title.trim();
    }

    if (safeUpdates.frequency === 'everyday' || safeUpdates.frequency === 'daily') {
      safeUpdates.daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
    } else if (safeUpdates.frequency === 'weekdays') {
      safeUpdates.daysOfWeek = [1, 2, 3, 4, 5];
    } else if (safeUpdates.frequency === 'weekends') {
      safeUpdates.daysOfWeek = [0, 6];
    } else if (safeUpdates.frequency === 'custom' && (!Array.isArray(safeUpdates.daysOfWeek) || safeUpdates.daysOfWeek.length === 0)) {
      return res.status(400).json({ message: 'Please select at least one day for custom frequency' });
    }

    if (safeUpdates.type === 'quantifiable') {
      if (safeUpdates.targetValue !== undefined && safeUpdates.targetValue !== null && safeUpdates.targetValue !== '') {
        safeUpdates.targetValue = Number(safeUpdates.targetValue);
      }
    } else if (safeUpdates.type === 'binary') {
      safeUpdates.targetValue = null;
      safeUpdates.targetUnit = null;
    }

    const updated = await Habit.findByIdAndUpdate(req.params.id, safeUpdates, { new: true, runValidators: true });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route DELETE /api/habits/:id
// @desc  Delete a habit. Supports ?mode=day&date=YYYY-MM-DD for day-specific removal of recurring habits,
//        or global cascading cleanup of Habit, Progress, and ActivityLog records.
router.delete('/:id', protect, async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);
    if (!habit) return res.status(404).json({ message: 'Task not found' });
    if (habit.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to delete this task' });
    }

    const { mode, date } = req.query;

    if (mode === 'day' && date) {
      // Day-specific deletion: calculate day of week (0=Sun, 1=Mon, ..., 6=Sat)
      const [yearStr, monthStr, dayStr] = date.split('-').map(Number);
      const targetDateObj = new Date(Date.UTC(yearStr, monthStr - 1, dayStr));
      const targetDayOfWeek = targetDateObj.getUTCDay();

      // Normalize current active days
      let currentDays = [];
      if (habit.frequency === 'everyday' || habit.frequency === 'daily') {
        currentDays = [0, 1, 2, 3, 4, 5, 6];
      } else if (habit.frequency === 'weekdays') {
        currentDays = [1, 2, 3, 4, 5];
      } else if (habit.frequency === 'weekends') {
        currentDays = [0, 6];
      } else if (Array.isArray(habit.daysOfWeek) && habit.daysOfWeek.length > 0) {
        currentDays = [...habit.daysOfWeek];
      } else {
        currentDays = [0, 1, 2, 3, 4, 5, 6];
      }

      const remainingDays = currentDays.filter((d) => d !== targetDayOfWeek);

      // Clean up progress for that day so metrics and heatmap do not contain orphaned data
      await Progress.deleteMany({ task: habit._id, user: req.user.id, date });

      if (remainingDays.length === 0) {
        // If no days remain, delete the habit and any remaining progress/activity records
        await Promise.all([
          habit.deleteOne(),
          Progress.deleteMany({ task: habit._id, user: req.user.id }),
          ActivityLog.deleteMany({
            user: req.user.id,
            $or: [
              { 'metadata.habitId': habit._id.toString() },
              { 'metadata.taskId': habit._id.toString() },
            ],
          }),
        ]);
        return res.status(200).json({ id: req.params.id, deleted: true, mode: 'full' });
      } else {
        habit.frequency = 'custom';
        habit.daysOfWeek = remainingDays;
        await habit.save();
        return res.status(200).json({
          id: req.params.id,
          habit,
          mode: 'day',
          date,
          removedDay: targetDayOfWeek,
        });
      }
    }

    // Full / Global cascading cleanup
    await Promise.all([
      habit.deleteOne(),
      Progress.deleteMany({ task: habit._id, user: req.user.id }),
      ActivityLog.deleteMany({
        user: req.user.id,
        $or: [
          { 'metadata.habitId': habit._id.toString() },
          { 'metadata.taskId': habit._id.toString() },
        ],
      }),
    ]);

    res.status(200).json({ id: req.params.id, deleted: true, mode: 'global' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;