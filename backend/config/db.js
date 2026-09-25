const mongoose = require('mongoose');
const { cleanupDefaultRoutines } = require('../services/defaultRoutineCleanup');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    // Run idempotent cleanup of legacy system-generated default routines
    cleanupDefaultRoutines().catch((err) =>
      console.error('[CLEANUP] Background default routine cleanup error:', err.message)
    );
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
