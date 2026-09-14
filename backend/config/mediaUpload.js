const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Separate storage config from the document vault — memories can hold
// photos and videos, which need a bigger size ceiling and a narrower
// set of allowed types than general documents.
const uploadDir = path.join(__dirname, '..', 'uploads', 'memories');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const ALLOWED_MEDIA_EXTS = [
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.mp4', '.webm', '.mov', '.mkv',
  '.mp3', '.wav', '.m4a', '.ogg', '.aac'
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MEDIA_EXTS.includes(ext)) {
    return cb(new Error('Only standard photo, video, and audio files are allowed.'), false);
  }
  if (file.mimetype === 'image/svg+xml' || file.mimetype.includes('html')) {
    return cb(new Error('SVG and HTML files are not permitted for security reasons.'), false);
  }
  cb(null, true);
};

const { validateUploadMagicBytes } = require('./upload');

const rawMediaUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB — enough for short phone videos
});

function wrapMedia(fn) {
  return (req, res, next) => {
    fn(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message || 'File upload error.' });
      validateUploadMagicBytes(req, res, next);
    });
  };
}

const mediaUpload = {
  single: (field) => wrapMedia(rawMediaUpload.single(field)),
  array: (field, max) => wrapMedia(rawMediaUpload.array(field, max)),
  fields: (fields) => wrapMedia(rawMediaUpload.fields(fields)),
  any: () => wrapMedia(rawMediaUpload.any()),
  none: () => rawMediaUpload.none(),
  fileFilter,
  storage,
};

module.exports = { mediaUpload, uploadDir };

