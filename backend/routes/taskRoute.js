const express = require('express');
const router = express.Router();
const Task = require('../models/tasks');
const Progress = require('../models/Progress');
const { protect } = require('../middleware/authMiddleware');

// Helper to get today's date in YYYY-MM-DD format based on local server time
const getTodayStr = () => {
  const d = new Date();
  // Adjusts for local timezone instead of strict UTC
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

// @route   GET /api/tasks
// @desc    Get all tasks for logged in user
router.get('/', protect, async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user.id }).sort({ important: -1, createdAt: -1 });
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/tasks
// @desc    Create a new task / habit
router.post('/', protect, async (req, res) => {
  try {
    // Gracefully handle both "text" and "title" payloads
    const title = req.body.text || req.body.title;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Please provide a task title/text' });
    }

    // Safely destructure with rock-solid defaults for the Progress Planner
    const {
      description = '',
      important = false,
      frequency = 'everyday',
      daysOfWeek = [0, 1, 2, 3, 4, 5, 6],
      startDate = getTodayStr(), // 👈 THE FIX: Defaults to today so it instantly appears on the calendar!
      endDate = null,
      reminderTime = '',
      priority = 'medium',
      dueDate = null,
    } = req.body;

    const task = await Task.create({
      user: req.user.id,
      text: title.trim(),
      description: description.trim(),
      important: Boolean(important),
      frequency,
      daysOfWeek: Array.isArray(daysOfWeek) && daysOfWeek.length > 0 ? daysOfWeek : [0, 1, 2, 3, 4, 5, 6],
      startDate, 
      endDate,
      reminderTime: reminderTime || '',
      priority,
      dueDate,
      active: true,
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Task Creation Error:', error);
    // Send a cleaner error message back to the frontend toast
    res.status(400).json({ message: error._message || 'Failed to create task. Check required fields.' });
  }
});

// @route   PATCH /api/tasks/:id/star
// @desc    Toggle important (★) status
router.patch('/:id/star', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    if (task.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized to update this task' });
    }

    task.important = !task.important;
    await task.save();

    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update a task / habit
router.put('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    if (task.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to update this task' });
    }

    const updates = { ...req.body };
    if (updates.title && !updates.text) {
      updates.text = updates.title;
    }

    const updatedTask = await Task.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete a task and its progress records
router.delete('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    if (task.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to delete this task' });
    }

    // Safely delete task and associated progress records concurrently
    await Promise.all([
      task.deleteOne(),
      Progress.deleteMany({ task: req.params.id, user: req.user.id }),
    ]);

    res.status(200).json({ id: req.params.id, message: 'Task and related progress records removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;