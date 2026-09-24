const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/authMiddleware');
const { escapeRegex } = require('../utils/securityUtils');
const { findGridFSFile, streamGridFSFile } = require('../services/gridfsService');

// Models for ownership verification
const FamilyDocument = require('../models/FamilyDocument');
const FamilyMember = require('../models/FamilyMember');
const Transaction = require('../models/Transaction');
const HealthRecord = require('../models/HealthRecord');
const LearningResource = require('../models/LearningResource');
const Memory = require('../models/Memory');
const Goal = require('../models/goals');
const GoalAttachment = require('../models/GoalAttachment');
const Document = require('../models/documents');
const AIAttachment = require('../models/AIAttachment');

const UPLOADS_ROOT = path.resolve(__dirname, '../uploads');

/**
 * Helper to check file ownership in MongoDB
 * Returns: 'OWNED' | 'FOREIGN' | 'NOT_FOUND'
 */
async function checkOwnership(subfolder, safeFilename, userId) {
  const escaped = escapeRegex(safeFilename);
  const regex = new RegExp(escaped, 'i');

  const queries = [];

  if (!subfolder || subfolder === 'uploads') {
    queries.push(
      Document.findOne({ storedName: safeFilename }),
      AIAttachment.findOne({ storedName: safeFilename }),
      Goal.findOne({ 'attachments.file_url': regex }),
      GoalAttachment.findOne({ $or: [{ file_url: regex }, { stored_name: safeFilename }] })
    );
  } else if (subfolder === 'family') {
    queries.push(
      FamilyDocument.findOne({ file_url: regex }),
      FamilyMember.findOne({ 'documents.file_url': regex })
    );
  } else if (subfolder === 'finance') {
    queries.push(Transaction.findOne({ receipt_url: regex }));
  } else if (subfolder === 'health') {
    queries.push(HealthRecord.findOne({ filePath: regex }));
  } else if (subfolder === 'learning') {
    queries.push(LearningResource.findOne({ file_url: regex }));
  } else if (subfolder === 'memories') {
    queries.push(
      Memory.findOne({
        $or: [
          { 'media.file_url': regex },
          { 'media.storedName': safeFilename },
          { storedName: safeFilename },
          { file_url: regex },
        ],
      })
    );
  }

  // Also check general models in case subfolder layout differs
  queries.push(
    Document.findOne({ storedName: safeFilename }),
    AIAttachment.findOne({ storedName: safeFilename })
  );

  const results = await Promise.all(queries);
  const matchedDoc = results.find(Boolean);

  if (!matchedDoc) {
    return 'NOT_FOUND';
  }

  const docOwner = matchedDoc.user ? matchedDoc.user.toString() : null;
  if (docOwner && docOwner === userId.toString()) {
    return 'OWNED';
  }

  return 'FOREIGN';
}

/**
 * Authenticated uploads router:
 * Enforces authentication (401 on missing/invalid token)
 * Enforces strict user ownership verification (403 if file belongs to another user)
 * Prevents directory traversal attacks
 * Sends files with nosniff security headers
 */
router.get('/*', protect, async (req, res) => {
  try {
    const rawPath = req.params[0] || '';
    // Normalize and prevent path traversal
    const normalized = path.normalize(rawPath).replace(/^(\.\.[\/\\])+/, '');
    const segments = normalized.split(path.sep).filter(Boolean);

    if (segments.length === 0) {
      return res.status(400).json({ message: 'File path required' });
    }

    const safeFilename = path.basename(segments[segments.length - 1]);
    const subfolder = segments.length > 1 ? segments[0].toLowerCase() : '';

    const resolvedPath = path.resolve(UPLOADS_ROOT, normalized);

    // Defense-in-depth: Ensure path is strictly inside UPLOADS_ROOT
    if (!resolvedPath.startsWith(UPLOADS_ROOT)) {
      return res.status(403).json({ message: 'Access denied: Invalid path traversal attempt' });
    }

    // Verify ownership against database records
    const ownershipStatus = await checkOwnership(subfolder, safeFilename, req.user._id);

    if (ownershipStatus === 'FOREIGN') {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access this file.' });
    }

    if (ownershipStatus === 'NOT_FOUND') {
      return res.status(404).json({ message: 'File not found or unassociated with your account.' });
    }

    // 1. Primary storage: Attempt to stream from MongoDB GridFS
    const gridFile = await findGridFSFile(normalized) || await findGridFSFile(safeFilename);
    if (gridFile) {
      return streamGridFSFile(gridFile, req, res, { filename: safeFilename });
    }

    // 2. Secondary fallback: Check local disk storage (for pre-migration files)
    if (fs.existsSync(resolvedPath)) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.sendFile(resolvedPath);
    }

    return res.status(404).json({ message: 'File missing from storage.' });
  } catch (error) {
    console.error('Error serving upload:', error);
    return res.status(500).json({ message: 'Error retrieving file.' });
  }
});

module.exports = router;
