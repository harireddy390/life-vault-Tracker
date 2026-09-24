/**
 * One-Time Migration Script: Local Uploads to MongoDB GridFS
 *
 * Requirements satisfied:
 * - Reads all files under backend/uploads/ recursively
 * - Uploads each file to MongoDB GridFS bucket 'uploads'
 * - Preserves existing filenames and path mappings
 * - Completely idempotent (skips already migrated files if size matches)
 * - Verifies uploaded byte size against source file size
 * - Does NOT delete any local files
 * - Does NOT modify unrelated MongoDB data
 * - Creates appropriate indexes on GridFS files collection
 * - Supports --dry-run flag for safe inspection
 *
 * Usage:
 *   node scripts/migrate_uploads_to_gridfs.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');

const EXT_MIME_MAP = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.md': 'text/markdown',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return EXT_MIME_MAP[ext] || 'application/octet-stream';
}

function scanFiles(dir, baseDir = dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(scanFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      results.push({
        fullPath,
        relPath,
        basename: entry.name,
        subfolder: path.dirname(relPath) === '.' ? 'root' : path.dirname(relPath),
        size: fs.statSync(fullPath).size,
      });
    }
  }
  return results;
}

async function migrateUploads() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('='.repeat(70));
  console.log(`Life Vault GridFS Migration Tool ${isDryRun ? '[DRY RUN MODE]' : '[LIVE MIGRATION]'}`);
  console.log('='.repeat(70));

  if (!process.env.MONGO_URI) {
    console.error('Error: MONGO_URI environment variable is missing.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected successfully.');

  const db = mongoose.connection.db;
  const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });

  // Ensure helper indexes on GridFS files collection
  const filesColl = db.collection('uploads.files');
  try {
    await filesColl.createIndex({ 'metadata.storedName': 1 });
    await filesColl.createIndex({ 'metadata.userId': 1 });
    console.log('GridFS metadata indexes ensured.');
  } catch (idxErr) {
    console.warn('Note on creating indexes:', idxErr.message);
  }

  console.log(`Scanning local files in: ${UPLOAD_ROOT}`);
  const files = scanFiles(UPLOAD_ROOT);
  console.log(`Found ${files.length} local files.`);

  let migratedCount = 0;
  let skippedCount = 0;
  let totalBytesMigrated = 0;
  let failedCount = 0;

  for (let i = 0; i < files.length; i++) {
    const item = files[i];
    const { fullPath, relPath, basename, subfolder, size } = item;
    const progress = `[${i + 1}/${files.length}]`;

    try {
      // Check if already in GridFS (idempotency check)
      const existing = await filesColl.find({
        $or: [
          { filename: relPath },
          { filename: basename },
          { 'metadata.storedName': basename },
        ],
      }).toArray();

      if (existing.length > 0) {
        const matching = existing.find((f) => f.length === size);
        if (matching) {
          console.log(`${progress} SKIP (Already exists & verified size: ${size} bytes): ${relPath}`);
          skippedCount++;
          continue;
        } else {
          console.log(`${progress} RE-UPLOAD (Size mismatch: local ${size} bytes vs GridFS ${existing[0].length} bytes): ${relPath}`);
        }
      }

      if (isDryRun) {
        console.log(`${progress} WOULD MIGRATE: ${relPath} (${size} bytes, ${getMimeType(fullPath)})`);
        migratedCount++;
        totalBytesMigrated += size;
        continue;
      }

      // Stream file to GridFS
      const mimeType = getMimeType(fullPath);
      const uploadStream = bucket.openUploadStream(relPath, {
        contentType: mimeType,
        metadata: {
          originalName: basename,
          storedName: basename,
          subfolder,
          fileSize: size,
          migratedFromLocal: true,
          migratedAt: new Date(),
        },
      });

      await new Promise((resolve, reject) => {
        fs.createReadStream(fullPath)
          .pipe(uploadStream)
          .on('error', reject)
          .on('finish', resolve);
      });

      // Verification: Check uploaded size matches source file size
      const verifyRecord = await filesColl.findOne({ _id: uploadStream.id });
      if (!verifyRecord) {
        throw new Error(`Verification failed: Uploaded file record not found for ${relPath}`);
      }
      if (verifyRecord.length !== size) {
        throw new Error(`Size mismatch: source ${size} bytes but GridFS recorded ${verifyRecord.length} bytes`);
      }

      console.log(`${progress} MIGRATED & VERIFIED (${size} bytes): ${relPath}`);
      migratedCount++;
      totalBytesMigrated += size;
    } catch (err) {
      console.error(`${progress} ERROR migrating ${relPath}:`, err.message);
      failedCount++;
    }
  }

  console.log('='.repeat(70));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total local files found:   ${files.length}`);
  console.log(`Skipped (already in GridFS): ${skippedCount}`);
  console.log(`Migrated / to migrate:      ${migratedCount}`);
  console.log(`Total bytes migrated:       ${totalBytesMigrated} bytes (${(totalBytesMigrated / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`Failed:                     ${failedCount}`);
  console.log(`Local files deleted:        0 (preservation guaranteed)`);
  console.log('='.repeat(70));

  await mongoose.disconnect();
  console.log('Database disconnected.');

  if (failedCount > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  migrateUploads().catch((err) => {
    console.error('Fatal migration error:', err);
    process.exit(1);
  });
}

module.exports = { migrateUploads, scanFiles };
