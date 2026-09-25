/**
 * Migration Script: Remove Old System-Generated Default Routines
 * 
 * Safely removes legacy seeded routines from MongoDB while preserving
 * 100% of user-created routines and custom schedules.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { cleanupDefaultRoutines } = require('../services/defaultRoutineCleanup');

async function migrate() {
  console.log('====================================================');
  console.log('🧹 MIGRATION: REMOVING SYSTEM-GENERATED DEFAULT ROUTINES');
  console.log('====================================================\n');

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB.');

    const result = await cleanupDefaultRoutines();
    console.log(`\n🎉 Migration Complete:`);
    console.log(`   - Default routines removed: ${result.deletedCount}`);
    console.log(`   - Orphaned reminder logs cleaned: ${result.removedReminderLogs}`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
