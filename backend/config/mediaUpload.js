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

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    return cb(null, true);
  }
  cb(new Error('Only image or video files are allowed here'), false);
};

const mediaUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB — enough for short phone videos
});

module.exports = { mediaUpload, uploadDir };
