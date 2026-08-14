const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.use('/api/timer-sessions', require('./routes/timerRoute'));

app.get('/', (req, res) => {
  res.send('LifeVault API is running.');
});

// Catch-all error handler so a thrown error never crashes the server silently
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
