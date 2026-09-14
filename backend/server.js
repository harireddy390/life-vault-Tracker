const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// Trust reverse proxy headers in production / test environments
app.set('trust proxy', 1);

const path = require('path');

const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

// Security Headers via Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Environment-driven CORS configuration
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((s) => s.trim().replace(/\/$/, ''))
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4003', 'http://127.0.0.1:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        (process.env.NODE_ENV !== 'production' &&
          /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
      ) {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy: Origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-vault-token'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize inputs to prevent NoSQL query operator injection ($where, $ne, etc.)
app.use(mongoSanitize());

// User uploads are strictly served through authenticated, owner-verified endpoints.
// Static public directory exposure is explicitly removed for privacy and security.
app.use('/uploads', require('./routes/uploadRoute'));

// Routes
app.use('/api/auth', require('./routes/authRoute'));
app.use('/api/tasks', require('./routes/taskRoute'));
app.use('/api/notes', require('./routes/noteRoute'));
app.use('/api/documents', require('./routes/documentRoute'));
app.use('/api/goals', require('./routes/goalRoute'));
app.use('/api/expenses', require('./routes/expenseRoute'));
app.use('/api/memories', require('./routes/memoryRoute'));
app.use('/api/family', require('./routes/familyRoute'));
app.use('/api/emergency', require('./routes/emergencyRoute'));
app.use('/api/ai', require('./routes/aiRoute'));
app.use('/api/vault', require('./routes/vaultRoute')); // Vault routes
app.use('/api/timer-sessions', require('./routes/timerRoute'));
app.use('/api/habits', require('./routes/habitRoute'));
app.use('/api/progress', require('./routes/progressRoute'));

app.use('/api/steps', require('./routes/stepsRoute'));
app.use('/api/subscriptions', require('./routes/subscriptionRoute'));
app.use('/api/health', require('./routes/healthRoute'));
app.use('/api/learning', require('./routes/learningRoute'));
app.use('/api/finance', require('./routes/financeRoute'));
app.use('/api/command', require('./routes/commandRoute'));

  app.get('/', (req, res) => {
  res.send('LifeVault API is running.');
});

// Safe production-hardened error handler: Never expose stack traces or schema internals
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.message || err);
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    console.error(err.stack);
  }

  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';
  const safeMessage =
    status < 500 || !isProd
      ? (err.message || 'Request failed')
      : 'An unexpected server error occurred. Please try again later.';

  res.status(status).json({ message: safeMessage });
});

// LifeVault Server Entry
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
