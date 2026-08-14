const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Document = require('../models/documents');
const { protect } = require('../middleware/authMiddleware');
const { upload, uploadDir } = require('../config/upload');

// @route   GET /api/documents
router.get('/', protect, async (req, res) => {
  try {
    const docs = await Document.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(docs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/documents
// @desc    Upload a file (multipart/form-data, field name: "file")
router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const doc = await Document.create({
      user: req.user.id,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/documents/:id/download
router.get('/:id/download', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (doc.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to access this file' });
    }

    const filePath = path.join(uploadDir, doc.storedName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File missing from storage' });
    }

    res.download(filePath, doc.originalName);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/documents/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (doc.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to delete this file' });
    }

    const filePath = path.join(uploadDir, doc.storedName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await doc.deleteOne();
    res.status(200).json({ id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
