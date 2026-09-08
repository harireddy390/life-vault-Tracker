const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');

const MedicalProfile = require('../models/MedicalProfile');
const EmergencyContact = require('../models/EmergencyContact');
const Medication = require('../models/Medication');
const VitalsLog = require('../models/VitalsLog');
const HealthRecord = require('../models/HealthRecord');

// ─────────────────────────────────────────────
// Health-record upload directory (separate from vault)
// ─────────────────────────────────────────────
const healthUploadDir = path.join(__dirname, '..', 'uploads', 'health');
if (!fs.existsSync(healthUploadDir)) fs.mkdirSync(healthUploadDir, { recursive: true });

const ALLOWED_MIMES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

const healthStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, healthUploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const healthUpload = multer({
  storage: healthStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: PDF, PNG, JPG, JPEG, WEBP`), false);
    }
  },
});

// ─────────────────────────────────────────────
// Helper: calculate vitals status flag on-the-fly
// ─────────────────────────────────────────────
function calcStatusFlag(metricType, primary, secondary) {
  switch (metricType) {
    case 'blood_pressure': {
      // Hypertension Stage 2: systolic ≥ 140 or diastolic ≥ 90
      const sys = primary;
      const dia = secondary || 0;
      if (sys >= 180 || dia >= 120) return 'critical';
      if (sys >= 140 || dia >= 90) return 'elevated';
      return 'normal';
    }
    case 'heart_rate':
      if (primary > 150 || primary < 40) return 'critical';
      if (primary > 100 || primary < 60) return 'elevated';
      return 'normal';
    case 'glucose':
      if (primary >= 300 || primary < 50) return 'critical';
      if (primary >= 140 || primary < 70) return 'elevated';
      return 'normal';
    case 'spo2':
      if (primary < 90) return 'critical';
      if (primary < 95) return 'elevated';
      return 'normal';
    default:
      return 'normal';
  }
}

// ─────────────────────────────────────────────
// ZONE 1 — Emergency Medical ID & Contacts
// ─────────────────────────────────────────────

// GET /api/health/emergency — Full medical profile + contacts
router.get('/emergency', protect, async (req, res) => {
  try {
    let profile = await MedicalProfile.findOne({ user: req.user.id });
    if (!profile) {
      profile = await MedicalProfile.create({ user: req.user.id });
    }
    const contacts = await EmergencyContact.find({ user: req.user.id }).sort({ isPrimary: -1, createdAt: 1 });
    res.json({ profile, contacts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/health/emergency — Upsert medical profile fields
router.put('/emergency', protect, async (req, res) => {
  try {
    const { bloodType, criticalAllergies, chronicConditions, implantedDevices, organDonor, specialNotes } = req.body;
    const profile = await MedicalProfile.findOneAndUpdate(
      { user: req.user.id },
      {
        $set: {
          ...(bloodType !== undefined && { bloodType }),
          ...(criticalAllergies !== undefined && { criticalAllergies }),
          ...(chronicConditions !== undefined && { chronicConditions }),
          ...(implantedDevices !== undefined && { implantedDevices }),
          ...(organDonor !== undefined && { organDonor }),
          ...(specialNotes !== undefined && { specialNotes }),
        },
      },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(profile);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/health/contacts — Add emergency contact
router.post('/contacts', protect, async (req, res) => {
  try {
    const { name, relationship, phone, isPrimary } = req.body;
    if (!name || !relationship || !phone) {
      return res.status(400).json({ message: 'name, relationship, and phone are required.' });
    }
    // Basic E.164-ish phone validation
    if (!/^[+]?[\d\s\-().]{7,20}$/.test(phone)) {
      return res.status(400).json({ message: 'Invalid phone number format.' });
    }
    const contact = await EmergencyContact.create({
      user: req.user.id, name: name.trim(), relationship: relationship.trim(), phone: phone.trim(), isPrimary: !!isPrimary,
    });
    res.status(201).json(contact);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/health/contacts/:id — Delete emergency contact
router.delete('/contacts/:id', protect, async (req, res) => {
  try {
    const contact = await EmergencyContact.findById(req.params.id);
    if (!contact) return res.status(404).json({ message: 'Contact not found.' });
    if (contact.user.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden.' });
    await contact.deleteOne();
    res.json({ message: 'Contact deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────
// ZONE 3 — Medications
// ─────────────────────────────────────────────

// GET /api/health/medications
router.get('/medications', protect, async (req, res) => {
  try {
    const meds = await Medication.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(meds);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/health/medications
router.post('/medications', protect, async (req, res) => {
  try {
    const { name, dosage, frequency, prescribedBy, pillsRemaining, refillThreshold, instructions } = req.body;
    if (!name || !dosage) return res.status(400).json({ message: 'name and dosage are required.' });
    const med = await Medication.create({
      user: req.user.id, name, dosage,
      frequency: frequency || 'Once daily',
      prescribedBy: prescribedBy || '',
      pillsRemaining: Number(pillsRemaining) || 0,
      refillThreshold: Number(refillThreshold) || 7,
      instructions: instructions || '',
    });
    res.status(201).json(med);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/health/medications/:id/take-dose — Atomic decrement
router.patch('/medications/:id/take-dose', protect, async (req, res) => {
  try {
    const med = await Medication.findById(req.params.id);
    if (!med) return res.status(404).json({ message: 'Medication not found.' });
    if (med.user.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden.' });
    if (med.pillsRemaining <= 0) return res.status(400).json({ message: 'No pills remaining.' });
    med.pillsRemaining -= 1;
    await med.save();
    res.json(med);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/health/medications/:id
router.delete('/medications/:id', protect, async (req, res) => {
  try {
    const med = await Medication.findById(req.params.id);
    if (!med) return res.status(404).json({ message: 'Medication not found.' });
    if (med.user.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden.' });
    await med.deleteOne();
    res.json({ message: 'Medication deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────
// ZONE 2 — Vitals
// ─────────────────────────────────────────────

// GET /api/health/vitals — Latest reading per type + 30-day history
router.get('/vitals', protect, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const METRIC_TYPES = ['blood_pressure', 'heart_rate', 'glucose', 'spo2'];

    // Latest reading per metric type
    const latestPromises = METRIC_TYPES.map((type) =>
      VitalsLog.findOne({ user: req.user.id, metricType: type }).sort({ loggedAt: -1 })
    );
    const latestResults = await Promise.all(latestPromises);
    const latest = {};
    METRIC_TYPES.forEach((type, i) => { latest[type] = latestResults[i] || null; });

    // 30-day chronological log for sparklines
    const history = await VitalsLog.find({
      user: req.user.id,
      loggedAt: { $gte: thirtyDaysAgo },
    }).sort({ loggedAt: 1 });

    res.json({ latest, history });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/health/vitals — Log a new vital reading
router.post('/vitals', protect, async (req, res) => {
  try {
    const { metricType, valuePrimary, valueSecondary, unit } = req.body;
    if (!metricType || valuePrimary === undefined || !unit) {
      return res.status(400).json({ message: 'metricType, valuePrimary, and unit are required.' });
    }
    const statusFlag = calcStatusFlag(metricType, Number(valuePrimary), valueSecondary ? Number(valueSecondary) : null);
    const entry = await VitalsLog.create({
      user: req.user.id,
      metricType,
      valuePrimary: Number(valuePrimary),
      valueSecondary: valueSecondary !== undefined ? Number(valueSecondary) : null,
      unit,
      statusFlag,
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────
// ZONE 4 — Health Records / File Vault
// ─────────────────────────────────────────────

// POST /api/health/records/upload
router.post('/records/upload', protect, healthUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    const { title, category, doctorOrFacility, recordDate } = req.body;
    if (!title) return res.status(400).json({ message: 'title is required.' });

    const record = await HealthRecord.create({
      user: req.user.id,
      title: title.trim(),
      category: category || 'other',
      doctorOrFacility: doctorOrFacility ? doctorOrFacility.trim() : '',
      recordDate: recordDate ? new Date(recordDate) : new Date(),
      filePath: req.file.path,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileSizeBytes: req.file.size,
      mimeType: req.file.mimetype,
    });
    res.status(201).json(record);
  } catch (err) {
    // Cleanup uploaded file on DB error
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/health/records — Filterable list
router.get('/records', protect, async (req, res) => {
  try {
    const query = { user: req.user.id };
    if (req.query.category && req.query.category !== 'all') query.category = req.query.category;
    if (req.query.search) {
      const re = new RegExp(req.query.search.trim(), 'i');
      query.$or = [{ title: re }, { doctorOrFacility: re }];
    }
    const records = await HealthRecord.find(query).sort({ recordDate: -1, createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/health/records/:id/download — Stream file inline
router.get('/records/:id/download', protect, async (req, res) => {
  try {
    const record = await HealthRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found.' });
    if (record.user.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden.' });
    if (!fs.existsSync(record.filePath)) return res.status(404).json({ message: 'File missing from storage.' });

    res.setHeader('Content-Type', record.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(record.originalName)}"`);
    res.sendFile(record.filePath);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/health/records/:id — Unlink file + purge DB row
router.delete('/records/:id', protect, async (req, res) => {
  try {
    const record = await HealthRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found.' });
    if (record.user.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden.' });

    // Delete physical file
    if (fs.existsSync(record.filePath)) {
      fs.unlinkSync(record.filePath);
    }
    await record.deleteOne();
    res.json({ message: 'Health record deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Multer error handler (file too large / bad MIME)
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'File too large. Maximum 50 MB allowed.' });
  }
  if (err.message && err.message.startsWith('Invalid file type')) {
    return res.status(415).json({ message: err.message });
  }
  next(err);
});

module.exports = router;
