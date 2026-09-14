const rateLimit = require('express-rate-limit');

// Limiter for authentication endpoints (login, register, vault password verification)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

// Limiter for AI endpoints to prevent Denial of Wallet and resource exhaustion
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // 30 AI requests per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'AI request limit reached. Please wait a few minutes before asking more questions.',
  },
});

// Limiter for file uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 40, // 40 uploads per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Upload rate limit exceeded. Please wait a few minutes before uploading more files.',
  },
});

// Limiter for password reset endpoints to prevent spam and abuse
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many password reset requests. Please try again after 15 minutes.',
  },
});

module.exports = {
  authLimiter,
  aiLimiter,
  uploadLimiter,
  passwordResetLimiter,
};

