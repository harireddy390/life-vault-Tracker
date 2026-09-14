const express = require('express');
const router = express.Router();
const Routine = require('../models/Routine');
const { protect } = require('../middleware/authMiddleware');

// Create a routine block
router.post('/', protect, async (req, res) => {
  try {
    const { title, startTime, endTime, tasks, daysOfWeek } = req.body;
    const routine = await Routine.create({
      title,
      startTime,
      endTime,
      tasks,
      daysOfWeek,
      user: req.user.id,
    });
    res.status(201).json(routine);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get all routines for authenticated user
router.get('/', protect, async (req, res) => {
  try {
    const routines = await Routine.find({ user: req.user.id }).populate('tasks');
    res.json(routines);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a routine by id
router.put('/:id', protect, async (req, res) => {
  try {
    const routine = await Routine.findOne({ _id: req.params.id, user: req.user.id });
    if (!routine) return res.status(404).json({ message: 'Routine not found' });

    const { title, startTime, endTime, tasks, daysOfWeek } = req.body;
    if (title !== undefined) routine.title = title;
    if (startTime !== undefined) routine.startTime = startTime;
    if (endTime !== undefined) routine.endTime = endTime;
    if (tasks !== undefined) routine.tasks = tasks;
    if (daysOfWeek !== undefined) routine.daysOfWeek = daysOfWeek;

    await routine.save();
    res.json(routine);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a routine
router.delete('/:id', protect, async (req, res) => {
  try {
    const routine = await Routine.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!routine) return res.status(404).json({ message: 'Routine not found' });
    res.json({ message: 'Routine deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
