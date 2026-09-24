const mongoose = require('mongoose');
const path = require('path');
const stream = require('stream');

let bucketInstance = null;

/**
 * Return native GridFSBucket instance bound to current Mongoose connection
 */
function getGridFSBucket() {
  if (!mongoose.connection || !mongoose.connection.db) {
    throw new Error('Database connection is not established.');
  }
  if (!bucketInstance || bucketInstance.s.db !== mongoose.connection.db) {
    bucketInstance = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'uploads',
    });
  }
  return bucketInstance;
}

/**
 * Upload a memory Buffer directly into GridFS.
 *
 * @param {string} filename - Stored filename (e.g. 172718-3829.png or memories/172718-3829.jpg)
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {Object} options - { contentType, metadata }
 * @returns {Promise<Object>} The completed GridFS file document
 */
function uploadBufferToGridFS(filename, buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const bucket = getGridFSBucket();
    const contentType = options.contentType || 'application/octet-stream';
    const metadata = {
      ...(options.metadata || {}),
      storedName: path.basename(filename),
      uploadedAt: new Date(),
    };

    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
      metadata,
    });

    uploadStream.on('error', reject);
    uploadStream.on('finish', async () => {
      try {
        const fileDoc = await mongoose.connection.db
          .collection('uploads.files')
          .findOne({ _id: uploadStream.id });
        resolve(fileDoc || { _id: uploadStream.id, filename, length: buffer.length });
      } catch (err) {
        resolve({ _id: uploadStream.id, filename, length: buffer.length });
      }
    });

    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    bufferStream.pipe(uploadStream);
  });
}

/**
 * Find a GridFS file document by filename, subpath, or ObjectId
 */
async function findGridFSFile(identifier) {
  if (!identifier) return null;
  const bucket = getGridFSBucket();

  if (
    identifier instanceof mongoose.Types.ObjectId ||
    (mongoose.Types.ObjectId.isValid(identifier) && String(new mongoose.Types.ObjectId(identifier)) === String(identifier))
  ) {
    const fileId = identifier instanceof mongoose.Types.ObjectId ? identifier : new mongoose.Types.ObjectId(identifier);
    const byId = await bucket.find({ _id: fileId }).limit(1).toArray();
    if (byId.length > 0) return byId[0];
  }

  const strIdentifier = String(identifier);
  const basename = path.basename(strIdentifier);
  const cleanId = strIdentifier.replace(/^[/\\]+/, '');

  const query = {
    $or: [
      { filename: cleanId },
      { filename: strIdentifier },
      { filename: basename },
      { 'metadata.storedName': basename },
    ],
  };

  const files = await bucket.find(query).sort({ uploadDate: -1 }).limit(1).toArray();
  return files[0] || null;
}

/**
 * Delete a file from GridFS by filename, subpath, or ObjectId.
 * Deletes all matching chunks and file metadata.
 */
async function deleteFromGridFS(identifier) {
  if (!identifier) return false;
  try {
    const bucket = getGridFSBucket();
    const file = await findGridFSFile(identifier);
    if (!file) return false;
    await bucket.delete(file._id);
    return true;
  } catch (err) {
    console.error(`[GridFS] Error deleting file ${identifier}:`, err.message);
    return false;
  }
}

/**
 * Stream a GridFS file to an Express response.
 * Implements HTTP Range requests (status 206) for smooth seeking in videos and audio.
 */
function streamGridFSFile(file, req, res, options = {}) {
  const bucket = getGridFSBucket();
  const contentType = options.contentType || file.contentType || 'application/octet-stream';
  const filename = options.filename || file.filename;
  const disposition = options.disposition || 'inline';

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Accept-Ranges', 'bytes');

  if (filename) {
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(path.basename(filename))}"`);
  }

  const range = req.headers && req.headers.range;
  if (range && typeof range === 'string') {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1;

    if (isNaN(start) || start < 0 || start >= file.length || end >= file.length || start > end) {
      res.setHeader('Content-Range', `bytes */${file.length}`);
      return res.status(416).json({ message: 'Requested range not satisfiable' });
    }

    const chunkSize = end - start + 1;
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${file.length}`);
    res.setHeader('Content-Length', chunkSize);
    res.setHeader('Content-Type', contentType);

    const downloadStream = bucket.openDownloadStream(file._id, {
      start,
      end: end + 1, // GridFS end is exclusive
    });

    downloadStream.on('error', (err) => {
      if (!res.headersSent) res.status(500).json({ message: 'Error streaming file content' });
    });

    return downloadStream.pipe(res);
  }

  // Full response (HTTP 200)
  res.status(200);
  res.setHeader('Content-Length', file.length);
  res.setHeader('Content-Type', contentType);

  const downloadStream = bucket.openDownloadStream(file._id);
  downloadStream.on('error', (err) => {
    if (!res.headersSent) res.status(500).json({ message: 'Error streaming file content' });
  });

  return downloadStream.pipe(res);
}

/**
 * Read the entire contents of a GridFS file as a Buffer
 */
async function downloadGridFSBuffer(identifierOrId) {
  const bucket = getGridFSBucket();
  let file = identifierOrId;
  if (!file || typeof file === 'string' || mongoose.isValidObjectId(file)) {
    file = await findGridFSFile(identifierOrId);
  }
  if (!file) throw new Error('File not found in GridFS');

  return new Promise((resolve, reject) => {
    const downloadStream = bucket.openDownloadStream(file._id);
    const chunks = [];
    downloadStream.on('data', (chunk) => chunks.push(chunk));
    downloadStream.on('error', reject);
    downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

module.exports = {
  getGridFSBucket,
  uploadBufferToGridFS,
  findGridFSFile,
  deleteFromGridFS,
  streamGridFSFile,
  downloadGridFSBuffer,
};
