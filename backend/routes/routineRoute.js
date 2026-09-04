const express = require('express');
const router = express.Router();
const Routine = require('../models/Routine');

// Create a routine block
router.post('/', async (req, res) => {
  try {
    const routine = await Routine.create(req.body);
    res.status(201).json(routine);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get all routines for a user (query ?userId=...)
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    const filter = userId ? { user: userId } : {};
    const routines = await Routine.find(filter).populate('tasks');
    res.json(routines);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a routine by id
router.put('/:id', async (req, res) => {
  try {
    const routine = await Routine.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(routine);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a routine
router.delete('/:id', async (req, res) => {
  try {
    await Routine.findByIdAndDelete(req.params.id);
    res.json({ message: 'Routine deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
