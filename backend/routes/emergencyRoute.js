const express = require('express');
const router = express.Router();
const Emergency = require('../models/emergency');
const { protect } = require('../middleware/authMiddleware');

// GET /api/emergency — Retrieve or create profile
router.get('/', protect, async (req, res) => {
  try {
    let profile = await Emergency.findOne({ user: req.user.id });
    if (!profile) {
      profile = await Emergency.create({
        user: req.user.id,
        bloodGroup: '',
        allergies: '',
        chronicConditions: '',
        currentMedications: '',
        organDonor: true,
        insuranceProvider: '',
        insurancePolicyNumber: '',
        hospitalPreference: '',
        medicalNotes: '',
        contacts: [],
      });
    }
    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/emergency — Update profile & contacts
router.put('/', protect, async (req, res) => {
  try {
    const {
      bloodGroup,
      allergies,
      chronicConditions,
      currentMedications,
      organDonor,
      insuranceProvider,
      insurancePolicyNumber,
      hospitalPreference,
      medicalNotes,
      contacts,
    } = req.body;

    const safeData = {};
    if (bloodGroup !== undefined) safeData.bloodGroup = String(bloodGroup).trim();
    if (allergies !== undefined) safeData.allergies = String(allergies).trim();
    if (chronicConditions !== undefined) safeData.chronicConditions = String(chronicConditions).trim();
    if (currentMedications !== undefined) safeData.currentMedications = String(currentMedications).trim();
    if (organDonor !== undefined) safeData.organDonor = !!organDonor;
    if (insuranceProvider !== undefined) safeData.insuranceProvider = String(insuranceProvider).trim();
    if (insurancePolicyNumber !== undefined) safeData.insurancePolicyNumber = String(insurancePolicyNumber).trim();
    if (hospitalPreference !== undefined) safeData.hospitalPreference = String(hospitalPreference).trim();
    if (medicalNotes !== undefined) safeData.medicalNotes = String(medicalNotes).trim();

    if (Array.isArray(contacts)) {
      safeData.contacts = contacts.map((c) => ({
        name: String(c.name || '').trim(),
        relation: String(c.relation || '').trim(),
        phone: String(c.phone || '').trim(),
        altPhone: String(c.altPhone || '').trim(),
        isPrimary: !!c.isPrimary,
        notes: String(c.notes || '').trim(),
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
