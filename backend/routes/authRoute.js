const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const { sendPasswordResetEmail } = require('../services/emailService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d', algorithm: 'HS256' });
};

// @route   POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Please fill in all fields with valid values' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const user = await User.create({ name, email, password });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      stepTarget: user.stepTarget,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      stepTarget: user.stepTarget,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get the currently logged-in user's profile
router.get('/me', protect, async (req, res) => {
  res.status(200).json(req.user);
});

// @route   PUT /api/auth/me/step-target
// @desc    Update user's step target
router.put('/me/step-target', protect, async (req, res) => {
  try {
    const { stepTarget } = req.body;
    if (stepTarget == null || isNaN(stepTarget)) {
      return res.status(400).json({ message: 'Valid step target is required' });
    }
    
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.stepTarget = Number(stepTarget);
    await user.save();
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Initiate password reset via verification code and email
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'A valid email address is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    let resetCode = null;

    if (user) {
      // Generate secure 6-digit numeric verification code
      resetCode = crypto.randomInt(100000, 999999).toString();
      // Compute SHA-256 hash to store in DB
      const hashedCode = crypto.createHash('sha256').update(resetCode).digest('hex');
      // Expiration: 15 minutes
      const expires = Date.now() + 15 * 60 * 1000;

      user.passwordResetToken = hashedCode;
      user.passwordResetExpires = new Date(expires);
      await user.save({ validateBeforeSave: false });

      try {
        await sendPasswordResetEmail({
          to: user.email,
          code: resetCode,
          name: user.name,
        });
      } catch (mailError) {
        console.error('Password reset email dispatch error:', mailError.message);
      }
    }

    const isDev = process.env.NODE_ENV !== 'production';

    // Return response; in dev mode include devCode so local testing works without third-party SMTP
    return res.status(200).json({
      message: 'If an account exists for this email, a verification code has been sent.',
      ...(isDev && resetCode ? { devCode: resetCode } : {}),
    });
  } catch (error) {
    console.error('Forgot password error:', error.message);
    res.status(500).json({ message: 'Server error processing password reset request' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password using 6-digit verification code or token
router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  try {
    const { email, code, token, password } = req.body;
    const verificationCode = (code || token || '').toString().trim();

    if (!verificationCode) {
      return res.status(400).json({ message: 'Verification code is required' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Hash provided code to match against database
    const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');

    const query = {
      passwordResetToken: hashedCode,
      passwordResetExpires: { $gt: new Date() },
    };

    if (email && typeof email === 'string') {
      query.email = email.toLowerCase().trim();
    }

    const user = await User.findOne(query).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // Set new password (will be automatically hashed by pre-save hook)
    user.password = password;
    // Invalidate reset token immediately (single-use)
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.status(200).json({
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error.message);
    res.status(500).json({ message: 'Server error processing password reset' });
  }
});

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password using token parameter from URL link
router.post('/reset-password/:token', passwordResetLimiter, async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Invalid or expired password reset token' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Hash provided token to match against database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired password reset token' });
    }

    // Set new password (will be automatically hashed by pre-save hook)
    user.password = password;
    // Invalidate reset token immediately (single-use)
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.status(200).json({
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error.message);
    res.status(500).json({ message: 'Server error processing password reset' });
  }
});

module.exports = router;
