const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const StepLog = require('../models/StepLog');

// Log steps for a date (upsert)
router.post('/', protect, async (req, res) => {
  try {
    const { date, steps, sensorSteps, manualSteps, source } = req.body;
    if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'Valid date in YYYY-MM-DD format is required.' });
    }

    // Find existing doc for user and date
    let doc = await StepLog.findOne({ user: req.user.id, date });

    let finalSensorSteps = doc ? (doc.sensorSteps || 0) : 0;
    let finalManualSteps = doc ? (doc.manualSteps || 0) : 0;
    let finalSource = doc ? (doc.source || 'manual') : 'manual';
    let lastSensorSync = doc ? doc.lastSensorSync : null;

    if (sensorSteps !== undefined && sensorSteps !== null) {
      const parsedSensor = Math.max(0, parseInt(sensorSteps, 10) || 0);
      finalSensorSteps = Math.max(finalSensorSteps, parsedSensor);
      lastSensorSync = new Date();
    }

    if (manualSteps !== undefined && manualSteps !== null) {
      finalManualSteps = Math.max(0, parseInt(manualSteps, 10) || 0);
    } else if (steps !== undefined && steps !== null && sensorSteps === undefined) {
      // Legacy compatibility: direct `steps` assignment treated as manualSteps
      finalManualSteps = Math.max(0, parseInt(steps, 10) || 0);
    }

    const totalSteps = finalSensorSteps + finalManualSteps;

    if (finalSensorSteps > 0 && finalManualSteps > 0) {
      finalSource = 'mixed';
    } else if (finalSensorSteps > 0) {
      finalSource = 'sensor';
    } else {
      finalSource = source || 'manual';
    }

    doc = await StepLog.findOneAndUpdate(
      { user: req.user.id, date },
      {
        user: req.user.id,
        date,
        steps: totalSteps,
        sensorSteps: finalSensorSteps,
        manualSteps: finalManualSteps,
        source: finalSource,
        lastSensorSync,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(doc);
  } catch (err) {
    console.error('[StepLog Save Error]:', err.message);
    res.status(400).json({ message: err.message });
  }
});

// Get step logs for user (optional date filter)
router.get('/', protect, async (req, res) => {
  try {
    const { date } = req.query;
    const filter = { user: req.user.id };
    if (date) filter.date = date;
    const logs = await StepLog.find(filter).sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
