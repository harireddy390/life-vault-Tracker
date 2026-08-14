const express = require('express');
const router = express.Router();
const FamilyMember = require('../models/family');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, async (req, res) => {
  try {
    const members = await FamilyMember.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    if (!req.body.name || !req.body.relation) {
      return res.status(400).json({ message: 'Please add a name and relation' });
    }
    const member = await FamilyMember.create({ ...req.body, user: req.user.id });
    res.status(201).json(member);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const member = await FamilyMember.findById(req.params.id);
    if (!member) return res.status(404).json({ message: 'Family member not found' });
    if (member.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to delete this entry' });
    }
    await member.deleteOne();
    res.status(200).json({ id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
