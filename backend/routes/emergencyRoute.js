const express = require('express');
const router = express.Router();
const Emergency = require('../models/emergency');
const { protect } = require('../middleware/authMiddleware');

// One profile per user — GET creates an empty one on first visit so the frontend always has something to render
router.get('/', protect, async (req, res) => {
  try {
    let profile = await Emergency.findOne({ user: req.user.id });
    if (!profile) {
      profile = await Emergency.create({ user: req.user.id, contacts: [] });
    }
    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/', protect, async (req, res) => {
  try {
    const { bloodGroup, allergies, medicalNotes, contacts } = req.body;
    const safeData = {};
    if (bloodGroup !== undefined) safeData.bloodGroup = String(bloodGroup);
    if (allergies !== undefined) safeData.allergies = String(allergies);
    if (medicalNotes !== undefined) safeData.medicalNotes = String(medicalNotes);
    if (Array.isArray(contacts)) {
      safeData.contacts = contacts.map(c => ({
        name: String(c.name || ''),
        relation: String(c.relation || ''),
        phone: String(c.phone || ''),
      }));
    }

    const profile = await Emergency.findOneAndUpdate(
      { user: req.user.id },
      { $set: safeData },
      { new: true, upsert: true, runValidators: true }
    );
    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
