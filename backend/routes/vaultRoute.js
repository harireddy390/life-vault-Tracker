const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Document = require('../models/documents');
const { protect } = require('../middleware/authMiddleware');
const { upload, uploadDir } = require('../config/upload');

const VAULT_QUOTA_BYTES = 10737418240; // 10 GB

// @route   POST /api/vault/auth/setup
// @desc    Setup master vault password
router.post('/auth/setup', protect, async (req, res) => {
  try {
    const { vaultPassword } = req.body;
    if (!vaultPassword || vaultPassword.length < 6) {
      return res.status(400).json({ message: 'Vault password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.id).select('+vaultPassword');
    if (user.vaultPassword) {
      return res.status(400).json({ message: 'Vault password already configured' });
    }

    const salt = await bcrypt.genSalt(10);
    user.vaultPassword = await bcrypt.hash(vaultPassword, salt);
    await user.save();

    res.status(200).json({ message: 'Vault password configured successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/vault/auth/verify
// @desc    Verify master vault password
router.post('/auth/verify', protect, async (req, res) => {
  try {
    const { vaultPassword } = req.body;
    if (!vaultPassword) {
      return res.status(400).json({ message: 'Please provide vault password' });
    }

    const user = await User.findById(req.user.id).select('+vaultPassword');
    if (!user.vaultPassword) {
      return res.status(400).json({ message: 'Vault password not configured' });
    }

    const isMatch = await bcrypt.compare(vaultPassword, user.vaultPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid vault password' });
    }

    // Generate a short-lived vault token
    const vaultToken = jwt.sign({ id: req.user.id, vaultUnlocked: true }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ vaultToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/vault/auth/status
// @desc    Check if master vault password is set
router.get('/auth/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+vaultPassword');
    res.status(200).json({ hasMasterPassword: !!user.vaultPassword });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Vault Protect Middleware
const vaultProtect = (req, res, next) => {
  let vaultToken;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    vaultToken = req.headers.authorization.split(' ')[1];
  }

  // To allow hybrid requests, we accept the vaultToken in a custom header if Bearer is the main token
  if (req.headers['x-vault-token']) {
    vaultToken = req.headers['x-vault-token'];
  }

  if (!vaultToken) {
    return res.status(401).json({ message: 'Not authorized for vault access' });
  }

  try {
    const decoded = jwt.verify(vaultToken, process.env.JWT_SECRET);
    if (!decoded.vaultUnlocked || decoded.id !== req.user.id) {
      return res.status(401).json({ message: 'Invalid vault token' });
    }
    next();
  } catch (error) {
    res.status(401).json({ message: 'Vault token expired or invalid' });
  }
};

// @route   GET /api/vault/storage
// @desc    Get vault storage usage
router.get('/storage', protect, async (req, res) => {
  try {
    const docs = await Document.find({ user: req.user.id });
    const usedBytes = docs.reduce((acc, doc) => acc + doc.size, 0);
    res.status(200).json({ usedBytes, quotaBytes: VAULT_QUOTA_BYTES });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/vault/documents
// @desc    Get all vault documents metadata
router.get('/documents', protect, async (req, res) => {
  try {
    const docs = await Document.find({ user: req.user.id }).sort({ createdAt: -1 });
    
    // Map docs to expected frontend format without returning sensitive details to unauthorized
    const mappedDocs = docs.map(doc => ({
      id: doc._id,
      name: doc.originalName,
      category: doc.category,
      sizeBytes: doc.size,
      size: (doc.size / (1024 * 1024)).toFixed(2) + ' MB',
      uploadDate: doc.createdAt.toISOString().split('T')[0],
      isEncrypted: doc.isEncrypted,
      notes: doc.notes,
      tags: doc.tags,
      salt: doc.salt,
      iv: doc.iv
    }));
    
    res.status(200).json(mappedDocs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/vault/documents/:id/download
// @desc    Download a file (Requires vaultProtect if encrypted)
router.get('/documents/:id/download', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (doc.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    // If encrypted, require vault token
    if (doc.isEncrypted) {
      vaultProtect(req, res, () => {
        sendFile(doc, res);
      });
    } else {
      sendFile(doc, res);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const mime = require('mime-types');

const sendFile = (doc, res) => {
  const filePath = path.join(uploadDir, doc.storedName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File missing from storage' });
  }
  const mimeType = doc.mimeType || mime.lookup(doc.originalName) || 'application/octet-stream';
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.originalName)}"`);
  res.sendFile(filePath);
};

// @route   POST /api/vault/documents
// @desc    Upload a file to vault
router.post('/documents', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { category, isEncrypted, notes, tags, salt, iv, originalName } = req.body;
    const encryptedBool = isEncrypted === 'true' || isEncrypted === true;

    // Quota check
    const docs = await Document.find({ user: req.user.id });
    const usedBytes = docs.reduce((acc, doc) => acc + doc.size, 0);
    if (usedBytes + req.file.size > VAULT_QUOTA_BYTES) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(413).json({ message: 'Vault quota exceeded. Max 10 GB allowed.' });
    }

    const parsedTags = typeof tags === 'string' && tags !== 'undefined' ? JSON.parse(tags) : (tags || []);
    const parsedSalt = typeof salt === 'string' && salt !== '' && salt !== 'undefined' ? JSON.parse(salt) : salt;
    const parsedIv = typeof iv === 'string' && iv !== '' && iv !== 'undefined' ? JSON.parse(iv) : iv;

    const doc = await Document.create({
      user: req.user.id,
      originalName: originalName || req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      category: category || 'Uncategorized',
      isEncrypted: encryptedBool,
      notes: notes || '',
      tags: parsedTags,
      salt: parsedSalt,
      iv: parsedIv
    });

    res.status(201).json({
      id: doc._id,
      name: doc.originalName,
      category: doc.category,
      sizeBytes: doc.size,
      size: (doc.size / (1024 * 1024)).toFixed(2) + ' MB',
      uploadDate: doc.createdAt.toISOString().split('T')[0],
      isEncrypted: doc.isEncrypted,
      notes: doc.notes,
      tags: doc.tags,
      salt: doc.salt,
      iv: doc.iv
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/vault/documents/:id
// @desc    Update document notes
router.put('/documents/:id', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (doc.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    doc.notes = req.body.notes !== undefined ? req.body.notes : doc.notes;
    await doc.save();

    res.status(200).json({ message: 'Updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/vault/documents/:id
// @desc    Delete document
router.delete('/documents/:id', protect, async (req, res) => {
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
