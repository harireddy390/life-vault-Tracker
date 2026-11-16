const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const { escapeRegex } = require('../utils/securityUtils');
const { upload, validateUploadMagicBytes } = require('../config/upload');

const {
  uploadBufferToGridFS,
  findGridFSFile,
  deleteFromGridFS,
  streamGridFSFile,
} = require('../services/gridfsService');

const MedicalProfile = require('../models/MedicalProfile');
const EmergencyContact = require('../models/EmergencyContact');
const Medication = require('../models/Medication');
const VitalsLog = require('../models/VitalsLog');
const HealthRecord = require('../models/HealthRecord');
const HealthMetric = require('../models/HealthMetric');

// ─────────────────────────────────────────────
// Health-record upload directory (GridFS memoryStorage)
// ─────────────────────────────────────────────
const healthUploadDir = path.join(__dirname, '..', 'uploads', 'health');
if (!fs.existsSync(healthUploadDir)) fs.mkdirSync(healthUploadDir, { recursive: true });

const ALLOWED_MIMES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

const healthStorage = multer.memoryStorage();

const healthUpload = multer({
  storage: healthStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.filename && file.originalname) {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
      file.filename = uniqueName;
    }
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
router.post('/records/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    const { title, category, doctorOrFacility, recordDate } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ message: 'title is required.' });

    const ext = path.extname(req.file.originalname || '').toLowerCase();
    const filename = req.file.filename || `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext || '.bin'}`;

    await uploadBufferToGridFS(`health/${filename}`, req.file.buffer, {
      contentType: req.file.mimetype || 'application/octet-stream',
      metadata: {
        originalName: req.file.originalname,
        user: req.user.id,
        subfolder: 'health',
      },
    });

    let mimeType = req.file.mimetype;
    if (!ALLOWED_MIMES.includes(mimeType)) {
      if (ext === '.pdf') mimeType = 'application/pdf';
      else if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.webp') mimeType = 'image/webp';
      else mimeType = 'image/jpeg';
    }

    const record = await HealthRecord.create({
      user: req.user.id,
      title: title.trim(),
      category: category || 'other',
      doctorOrFacility: doctorOrFacility ? doctorOrFacility.trim() : '',
      recordDate: recordDate ? new Date(recordDate) : new Date(),
      filePath: `/uploads/health/${filename}`,
      fileName: filename,
      originalName: req.file.originalname,
      fileSizeBytes: req.file.size,
      mimeType,
    });
    res.status(201).json(record);
  } catch (err) {
    console.error('[HEALTH RECORD UPLOAD ERROR]', err);
    res.status(500).json({ message: err.message || 'Failed to upload health record' });
  }
});

// GET /api/health/records — Filterable list
router.get('/records', protect, async (req, res) => {
  try {
    const query = { user: req.user.id };
    if (req.query.category && req.query.category !== 'all') query.category = req.query.category;
    if (req.query.search) {
      const safeSearch = escapeRegex(req.query.search.trim());
      const re = new RegExp(safeSearch, 'i');
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

    // 1. GridFS stream
    const gridFile = await findGridFSFile(`health/${record.fileName}`) || await findGridFSFile(record.fileName);
    if (gridFile) {
      return streamGridFSFile(gridFile, req, res, {
        filename: record.originalName,
        contentType: record.mimeType || gridFile.contentType,
        disposition: 'inline',
      });
    }

    // 2. Disk fallback
    if (record.filePath && fs.existsSync(record.filePath)) {
      res.setHeader('Content-Type', record.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(record.originalName)}"`);
      return res.sendFile(record.filePath);
    }

    const legacyDiskPath = path.join(healthUploadDir, record.fileName);
    if (fs.existsSync(legacyDiskPath)) {
      res.setHeader('Content-Type', record.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(record.originalName)}"`);
      return res.sendFile(legacyDiskPath);
    }

    return res.status(404).json({ message: 'File missing from storage.' });
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

    // Delete from GridFS
    await deleteFromGridFS(`health/${record.fileName}`);
    await deleteFromGridFS(record.fileName);

    // Delete physical file if present on disk
    if (record.filePath && fs.existsSync(record.filePath)) {
      try { fs.unlinkSync(record.filePath); } catch (_) {}
    }
    const legacyDiskPath = path.join(healthUploadDir, record.fileName);
    if (fs.existsSync(legacyDiskPath)) {
      try { fs.unlinkSync(legacyDiskPath); } catch (_) {}
    }

    await record.deleteOne();
    res.json({ message: 'Health record deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────
// ZONE 5 — Comprehensive Daily Health Metrics & Telemetry
// ─────────────────────────────────────────────

// GET /api/health/daily/:date — Fetch or generate day's metrics
router.get('/daily/:date', protect, async (req, res) => {
  try {
    const { date } = req.params;
    let metric = await HealthMetric.findOne({ user: req.user.id, date });

    // If no daily document exists yet, pull prescribed medications to prepopulate today's checklist
    if (!metric) {
      const activeMeds = await Medication.find({ user: req.user.id });
      const initialMeds = activeMeds.map((m) => ({
        medId: m._id.toString(),
        name: m.name,
        dosage: m.dosage,
        scheduledTime: m.frequency || 'Daily',
        taken: false,
        takenAt: null,
      }));

      metric = {
        date,
        weight: null,
        water: 0,
        sleep: 0,
        restingHeartRate: null,
        calories: 0,
        meds: initialMeds,
        workouts: [],
        notes: '',
      };
    }

    res.json(metric);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/health/daily/:date — Upsert daily metrics
router.put('/daily/:date', protect, async (req, res) => {
  try {
    const { date } = req.params;
    const { weight, water, sleep, restingHeartRate, calories, meds, workouts, notes } = req.body;

    const updateFields = {};
    if (weight !== undefined) updateFields.weight = weight === '' || weight === null ? null : Number(weight);
    if (water !== undefined) updateFields.water = Math.max(0, Number(water) || 0);
    if (sleep !== undefined) updateFields.sleep = Math.max(0, Number(sleep) || 0);
    if (restingHeartRate !== undefined) updateFields.restingHeartRate = restingHeartRate === '' || restingHeartRate === null ? null : Number(restingHeartRate);
    if (calories !== undefined) updateFields.calories = Math.max(0, Number(calories) || 0);
    if (Array.isArray(meds)) updateFields.meds = meds;
    if (Array.isArray(workouts)) updateFields.workouts = workouts;
    if (notes !== undefined) updateFields.notes = String(notes || '').trim();

    const metric = await HealthMetric.findOneAndUpdate(
      { user: req.user.id, date },
      { $set: updateFields },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(metric);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/health/history — Returns chronological history for trend charts (7/14/30 days)
router.get('/history', protect, async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 14, 1), 90);
    const metrics = await HealthMetric.find({ user: req.user.id })
      .sort({ date: -1 })
      .limit(days)
      .lean();

    // Return in chronological order (earliest to latest) for accurate charting
    metrics.reverse();
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/health/daily/:date/water — Quick 1-tap water adjustment
router.patch('/daily/:date/water', protect, async (req, res) => {
  try {
    const { date } = req.params;
    const { delta, amount } = req.body;

    let metric = await HealthMetric.findOne({ user: req.user.id, date });
    let newWater = 0;

    if (metric) {
      if (amount !== undefined) {
        newWater = Math.max(0, Number(amount) || 0);
      } else {
        newWater = Math.max(0, (metric.water || 0) + (Number(delta) || 1));
      }
      metric.water = newWater;
      await metric.save();
    } else {
      newWater = amount !== undefined ? Math.max(0, Number(amount) || 0) : Math.max(0, Number(delta) || 1);
      metric = await HealthMetric.create({
        user: req.user.id,
        date,
        water: newWater,
      });
    }

    res.json({ date, water: metric.water });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/health/daily/:date/meds/toggle — Toggle medication taken status & calculate streak
router.patch('/daily/:date/meds/toggle', protect, async (req, res) => {
  try {
    const { date } = req.params;
    const { name, taken, medId, dosage, scheduledTime } = req.body;

    let metric = await HealthMetric.findOne({ user: req.user.id, date });
    if (!metric) {
      metric = await HealthMetric.create({
        user: req.user.id,
        date,
        meds: [],
      });
    }

    const existingIndex = metric.meds.findIndex(
      (m) => (medId && m.medId === medId) || m.name.toLowerCase() === (name || '').toLowerCase()
    );

    const isTaken = taken !== undefined ? !!taken : true;

    if (existingIndex >= 0) {
      metric.meds[existingIndex].taken = isTaken;
      metric.meds[existingIndex].takenAt = isTaken ? new Date() : null;
    } else {
      metric.meds.push({
        medId: medId || '',
        name: name || 'Medication',
        dosage: dosage || '',
        scheduledTime: scheduledTime || 'Daily',
        taken: isTaken,
        takenAt: isTaken ? new Date() : null,
      });
    }

    await metric.save();

    // Calculate streak: how many consecutive days prior has this med been taken?
    const recentMetrics = await HealthMetric.find({
      user: req.user.id,
      date: { $lte: date },
    })
      .sort({ date: -1 })
      .limit(30)
      .lean();

    let streak = 0;
    for (const day of recentMetrics) {
      const match = day.meds?.find(
        (m) => (medId && m.medId === medId) || m.name.toLowerCase() === (name || '').toLowerCase()
      );
      if (match && match.taken) {
        streak++;
      } else {
        break;
      }
    }

    res.json({ metric, streak });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/health/daily/:date/workout — Add workout session to today's log
router.post('/daily/:date/workout', protect, async (req, res) => {
  try {
    const { date } = req.params;
    const { workoutType, durationMinutes, exercises, notes } = req.body;

    if (!workoutType) {
      return res.status(400).json({ message: 'workoutType is required.' });
    }

    let metric = await HealthMetric.findOne({ user: req.user.id, date });
    if (!metric) {
      metric = await HealthMetric.create({
        user: req.user.id,
        date,
        workouts: [],
      });
    }

    metric.workouts.push({
      workoutType: workoutType.trim(),
      durationMinutes: Number(durationMinutes) || 45,
      exercises: Array.isArray(exercises) ? exercises : [],
      notes: (notes || '').trim(),
      completed: true,
      loggedAt: new Date(),
    });

    await metric.save();
    res.status(201).json(metric);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/health/daily/:date/workout/:workoutId — Remove workout session
router.delete('/daily/:date/workout/:workoutId', protect, async (req, res) => {
  try {
    const { date, workoutId } = req.params;
    const metric = await HealthMetric.findOne({ user: req.user.id, date });
    if (!metric) return res.status(404).json({ message: 'Daily metric not found.' });

    metric.workouts = metric.workouts.filter((w) => w._id.toString() !== workoutId);
    await metric.save();
    res.json(metric);
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
