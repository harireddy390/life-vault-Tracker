const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Make sure the uploads folder exists before multer tries to write to it
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Production GridFS storage uses memoryStorage so buffers stream directly to MongoDB
const storage = multer.memoryStorage();

// Strict allowlist: PDFs, office docs, plaintext, images. Block SVG, HTML, scripts, and executables.
const ALLOWED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.txt', '.csv', '.json', '.md',
  '.png', '.jpg', '.jpeg', '.webp'
];

const ALLOWED_MIMES_MAP = {
  '.pdf': ['application/pdf', 'application/x-pdf', 'application/octet-stream'],
  '.png': ['image/png', 'application/octet-stream'],
  '.jpg': ['image/jpeg', 'image/jpg', 'image/pjpeg', 'application/octet-stream'],
  '.jpeg': ['image/jpeg', 'image/jpg', 'image/pjpeg', 'application/octet-stream'],
  '.webp': ['image/webp', 'application/octet-stream'],
  '.gif': ['image/gif', 'application/octet-stream'],
  '.docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
  ],
  '.doc': ['application/msword', 'application/x-msword', 'application/octet-stream'],
  '.txt': ['text/plain', 'application/octet-stream'],
  '.csv': ['text/csv', 'text/plain', 'application/csv', 'application/vnd.ms-excel', 'application/octet-stream'],
  '.json': ['application/json', 'text/plain', 'application/octet-stream'],
  '.md': ['text/markdown', 'text/plain', 'text/x-markdown', 'application/octet-stream'],
  '.mp4': ['video/mp4', 'application/octet-stream'],
  '.mov': ['video/quicktime', 'video/mp4', 'application/octet-stream'],
  '.webm': ['video/webm', 'audio/webm', 'application/octet-stream'],
  '.mkv': ['video/x-matroska', 'video/webm', 'application/octet-stream'],
  '.mp3': ['audio/mpeg', 'audio/mp3', 'application/octet-stream'],
  '.wav': ['audio/wav', 'audio/x-wav', 'audio/wave', 'application/octet-stream'],
  '.ogg': ['audio/ogg', 'application/ogg', 'application/octet-stream'],
  '.m4a': ['audio/mp4', 'audio/x-m4a', 'audio/m4a', 'application/octet-stream'],
  '.aac': ['audio/aac', 'audio/x-aac', 'application/octet-stream'],
};

// Explicitly blocked MIME types
const BLOCKED_MIMES = [
  'image/svg+xml',
  'text/html',
  'application/xhtml+xml',
  'application/javascript',
  'text/javascript',
  'application/x-javascript',
  'application/x-msdownload',
  'application/x-sh',
  'application/x-bat',
  'text/x-php',
  'application/x-httpd-php',
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`File extension ${ext} is not allowed. Supported: PDF, DOCX, TXT, CSV, JSON, MD, PNG, JPG, WEBP.`), false);
  }
  const declaredMime = (file.mimetype || '').toLowerCase().trim();
  if (
    BLOCKED_MIMES.includes(declaredMime) ||
    declaredMime.includes('svg') ||
    declaredMime.includes('html') ||
    declaredMime.includes('javascript')
  ) {
    return cb(new Error('This file type is not permitted for security reasons.'), false);
  }
  cb(null, true);
};

/**
 * Detect real binary file signature from raw buffer
 */
function detectFileSignature(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 3) return null;

  // 1. Universal SVG / HTML / Script detection across the first 4KB
  const headerStr = buffer.slice(0, Math.min(buffer.length, 4096)).toString('utf8').toLowerCase();
  if (
    headerStr.includes('<svg') ||
    headerStr.includes('<?xml') ||
    headerStr.includes('<!doctype') ||
    headerStr.includes('<html') ||
    headerStr.includes('<script') ||
    headerStr.includes('xmlns="http://www.w3.org/2000/svg"') ||
    headerStr.includes('xmlns=\'http://www.w3.org/2000/svg\'') ||
    headerStr.includes('<body') ||
    headerStr.includes('<head')
  ) {
    return { type: 'DISALLOWED_HTML_SVG', mime: 'text/html', exts: [] };
  }

  // 2. PDF: %PDF (0x25 0x50 0x44 0x46)
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { type: 'PDF', mime: 'application/pdf', exts: ['.pdf'] };
  }

  // 3. PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return { type: 'PNG', mime: 'image/png', exts: ['.png'] };
  }

  // 4. JPEG / JPG: 0xFF 0xD8 0xFF
  if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { type: 'JPEG', mime: 'image/jpeg', exts: ['.jpg', '.jpeg'] };
  }

  // 5. WebP: RIFF at 0, WEBP at 8
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return { type: 'WEBP', mime: 'image/webp', exts: ['.webp'] };
  }

  // 6. GIF: GIF87a or GIF89a
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) && buffer[5] === 0x61
  ) {
    return { type: 'GIF', mime: 'image/gif', exts: ['.gif'] };
  }

  // 7. DOCX / ZIP: PK\x03\x04
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04
  ) {
    return { type: 'DOCX', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', exts: ['.docx'] };
  }

  // 8. DOC (legacy binary): 0xD0 0xCF 0x11 0xE0 0xA1 0xB1 0x1A 0xE1
  if (
    buffer.length >= 8 &&
    buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0 &&
    buffer[4] === 0xA1 && buffer[5] === 0xB1 && buffer[6] === 0x1A && buffer[7] === 0xE1
  ) {
    return { type: 'DOC', mime: 'application/msword', exts: ['.doc'] };
  }

  // 9. MP4 / MOV / M4A: ftyp or moov at offset 4
  if (buffer.length >= 12) {
    const box = buffer.slice(4, 8).toString('ascii');
    if (box === 'ftyp' || box === 'moov') {
      return { type: 'MP4', mime: 'video/mp4', exts: ['.mp4', '.mov', '.m4a'] };
    }
  }

  // 10. WebM / MKV: 0x1A 0x45 0xDF 0xA3
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3
  ) {
    return { type: 'WEBM', mime: 'video/webm', exts: ['.webm', '.mkv'] };
  }

  // 11. WAV: RIFF at 0, WAVE at 8
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x41 && buffer[10] === 0x56 && buffer[11] === 0x45
  ) {
    return { type: 'WAV', mime: 'audio/wav', exts: ['.wav'] };
  }

  // 12. OGG: OggS
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x4F && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53
  ) {
    return { type: 'OGG', mime: 'audio/ogg', exts: ['.ogg'] };
  }

  // 13. MP3: ID3 or MPEG sync word
  if (
    (buffer.length >= 3 && buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) ||
    (buffer.length >= 2 && buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0)
  ) {
    return { type: 'MP3', mime: 'audio/mpeg', exts: ['.mp3'] };
  }

  // 14. Plaintext verification (TXT, CSV, JSON, MD)
  // Ensure no null bytes and valid UTF-8/ASCII printable characters
  let hasNull = false;
  const inspectLen = Math.min(buffer.length, 4096);
  for (let i = 0; i < inspectLen; i++) {
    if (buffer[i] === 0x00) {
      hasNull = true;
      break;
    }
  }

  if (!hasNull) {
    return { type: 'TEXT', mime: 'text/plain', exts: ['.txt', '.csv', '.json', '.md'] };
  }

  return null;
}

/**
 * Validate binary file signature against extension and client MIME
 */
function verifyFileSignature(buffer, originalname, declaredMime, options = {}) {
  if (!buffer || buffer.length === 0) {
    return { valid: false, message: 'Upload rejected: empty file received.' };
  }

  const ext = path.extname(originalname || '').toLowerCase();
  if (!ext) {
    return { valid: false, message: 'Upload rejected: file must have a valid extension.' };
  }

  // SVG and HTML are strictly rejected everywhere
  const headerStr = buffer.slice(0, Math.min(buffer.length, 4096)).toString('utf8').toLowerCase();
  const normalizedMime = (declaredMime || '').toLowerCase().trim();

  if (
    ext === '.svg' ||
    ext === '.html' ||
    ext === '.htm' ||
    ext === '.xhtml' ||
    normalizedMime.includes('svg') ||
    normalizedMime.includes('html') ||
    headerStr.includes('<svg') ||
    headerStr.includes('<?xml') ||
    headerStr.includes('<!doctype') ||
    headerStr.includes('<html') ||
    headerStr.includes('<script') ||
    headerStr.includes('xmlns="http://www.w3.org/2000/svg"') ||
    headerStr.includes('xmlns=\'http://www.w3.org/2000/svg\'')
  ) {
    return { valid: false, message: 'SVG and HTML files are strictly rejected for security reasons.' };
  }

  // Handle client-side encrypted vault files
  if (options.isEncrypted && options.salt && options.iv) {
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      return { valid: true, detectedType: 'ENCRYPTED_CIPHERTEXT' };
    }
  }

  // Detect binary signature
  const signature = detectFileSignature(buffer);
  if (!signature) {
    return { valid: false, message: `Upload rejected: file signature does not match or is invalid for ${ext}.` };
  }

  if (signature.type === 'DISALLOWED_HTML_SVG') {
    return { valid: false, message: 'Upload rejected: SVG or HTML content detected.' };
  }

  // Verify signature matches file extension
  if (!signature.exts.includes(ext)) {
    return {
      valid: false,
      message: `Upload rejected: extension '${ext}' does not match detected file signature (${signature.type}).`,
    };
  }

  // Check declared MIME against allowed MIMEs for this extension
  if (normalizedMime && ALLOWED_MIMES_MAP[ext]) {
    const isMimeAllowed = ALLOWED_MIMES_MAP[ext].includes(normalizedMime);
    if (!isMimeAllowed) {
      return {
        valid: false,
        message: `Upload rejected: MIME type '${declaredMime}' does not match allowed types for ${ext}.`,
      };
    }
  }

  return { valid: true, detectedType: signature.type, mime: signature.mime };
}

/**
 * Validates a single uploaded multer file
 */
function validateUploadedFile(file, body = {}) {
  if (!file) return { valid: true };

  let buffer;
  if (file.buffer && Buffer.isBuffer(file.buffer)) {
    buffer = file.buffer;
  } else if (file.path && fs.existsSync(file.path)) {
    const fd = fs.openSync(file.path, 'r');
    const readLen = Math.min(file.size || 8192, 8192);
    buffer = Buffer.alloc(readLen);
    fs.readSync(fd, buffer, 0, readLen, 0);
    fs.closeSync(fd);
  } else {
    return { valid: false, message: 'Uploaded file cannot be read for security verification.' };
  }

  const isEncrypted = body && (body.isEncrypted === 'true' || body.isEncrypted === true);
  return verifyFileSignature(buffer, file.originalname, file.mimetype, {
    isEncrypted,
    salt: body?.salt,
    iv: body?.iv,
  });
}

function cleanupFile(file) {
  if (file && file.path && fs.existsSync(file.path)) {
    try {
      fs.unlinkSync(file.path);
    } catch (_) {}
  }
}

function validateReqFiles(req) {
  if (req.file) {
    if (req.file.magicValidated) return null;
    const check = validateUploadedFile(req.file, req.body);
    if (!check.valid) {
      cleanupFile(req.file);
      delete req.file;
      return check.message;
    }
    req.file.magicValidated = true;
  }

  if (Array.isArray(req.files)) {
    for (const f of req.files) {
      if (f.magicValidated) continue;
      const check = validateUploadedFile(f, req.body);
      if (!check.valid) {
        req.files.forEach(cleanupFile);
        delete req.files;
        return check.message;
      }
      f.magicValidated = true;
    }
  }

  if (req.files && typeof req.files === 'object' && !Array.isArray(req.files)) {
    for (const key of Object.keys(req.files)) {
      const files = req.files[key];
      if (Array.isArray(files)) {
        for (const f of files) {
          if (f.magicValidated) continue;
          const check = validateUploadedFile(f, req.body);
          if (!check.valid) {
            Object.values(req.files).flat().forEach(cleanupFile);
            delete req.files;
            return check.message;
          }
          f.magicValidated = true;
        }
      }
    }
  }

  return null;
}

const validateUploadMagicBytes = (req, res, next) => {
  const errorMsg = validateReqFiles(req);
  if (errorMsg) {
    return res.status(400).json({ message: errorMsg });
  }
  next();
};

const multerInstance = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB per file
});

function assignFileMetadata(file) {
  if (file && !file.filename && file.originalname) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    file.filename = uniqueSuffix + path.extname(file.originalname);
  }
}

function wrapMulter(fn) {
  return (req, res, next) => {
    fn(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || 'File upload error.' });
      }
      if (req.file) assignFileMetadata(req.file);
      if (Array.isArray(req.files)) req.files.forEach(assignFileMetadata);
      if (req.files && typeof req.files === 'object') {
        Object.values(req.files).flat().forEach(assignFileMetadata);
      }
      const errorMsg = validateReqFiles(req);
      if (errorMsg) {
        return res.status(400).json({ message: errorMsg });
      }
      next();
    });
  };
}

const upload = {
  single: (field) => wrapMulter(multerInstance.single(field)),
  array: (field, max) => wrapMulter(multerInstance.array(field, max)),
  fields: (fields) => wrapMulter(multerInstance.fields(fields)),
  any: () => wrapMulter(multerInstance.any()),
  none: () => multerInstance.none(),
  fileFilter,
  storage,
};

module.exports = {
  upload,
  uploadDir,
  fileFilter,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIMES_MAP,
  detectFileSignature,
  verifyFileSignature,
  validateUploadedFile,
  validateUploadMagicBytes,
};


