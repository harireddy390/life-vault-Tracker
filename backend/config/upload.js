const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Make sure the uploads folder exists before multer tries to write to it
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Randomize the stored filename so two uploads of "resume.pdf" never collide
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Block obviously risky file types; everything else (pdf, images, docs, zips) is allowed
const blockedExtensions = ['.exe', '.bat', '.sh', '.cmd', '.msi'];
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (blockedExtensions.includes(ext)) {
    return cb(new Error('This file type is not allowed'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB per file (matches frontend limit)
});

module.exports = { upload, uploadDir };

