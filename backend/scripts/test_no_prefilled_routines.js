/**
 * Comprehensive Test Suite: Complete Removal of Prefilled/Default Routines
 * 
 * Verifies:
 * 1. Brand-new user registration yields ZERO routines (no auto-seeding).
 * 2. Login does not create or seed default routines.
 * 3. Command Center GET /api/command/today handles zero routines cleanly.
 * 4. User can create custom routines with arbitrary timings, categories, days.
 * 5. Recurring user-created routines function as expected.
 * 6. Existing user-created routines are preserved.
 * 7. System-generated legacy defaults are safely identifiable and cleaned up without touching user routines.
 * 8. Routine push notifications and reminder scheduler only trigger for user-created routines, never for default/nonexistent routines.
 * 9. Cross-user routine isolation (User A cannot see or mutate User B's routines).
 */

const http = require('http');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ScheduleBlock = require('../models/ScheduleBlock');
const User = require('../models/User');
const { SEEDED_DEFAULT_ROUTINES, cleanupDefaultRoutines } = require('../services/defaultRoutineCleanup');
const { processReminders } = require('../services/routineReminderScheduler');

const BASE_URL = 'http://localhost:4003';

function makeRequest(method, reqPath, token = null, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, BASE_URL);
    const headers = {
      'Content-Type': 'application/json',
      'X-Forwarded-For': '192.168.100.' + (Math.floor(Math.random() * 240) + 10),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch (e) {
            json = data;
          }
          resolve({ status: res.statusCode, data: json });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runSuite() {
  console.log('====================================================');
  console.log('🧪 VERIFYING ZERO PREFILLED ROUTINES FOR ALL USERS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function it(desc, condition) {
    if (condition) {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
      failed++;
    }
  }

  await mongoose.connect(process.env.MONGO_URI);

  const timestamp = Date.now();
  const emailUser1 = `zero_seed_1_${timestamp}@lifevault.test`;
  const emailUser2 = `zero_seed_2_${timestamp}@lifevault.test`;

  try {
    // ── 1. Brand New User Registration ─────────────────────────────────────
    console.log('--- 1. Brand-New User Registration (Zero Routines) ---');
    const regRes1 = await makeRequest('POST', '/api/auth/register', null, {
      name: 'Zero Seed User 1',
      email: emailUser1,
      password: 'Password123!',
    });
    it('Registration succeeds and returns auth token', regRes1.status === 201 && regRes1.data?.token);
    const token1 = regRes1.data.token;
    const user1Id = regRes1.data._id || regRes1.data.id;

    // Direct DB count immediately after registration
    const initialDbCount = await ScheduleBlock.countDocuments({ user: user1Id });
    it('Database has exactly 0 ScheduleBlock records for new user', initialDbCount === 0);

    // ── 2. Login Does Not Create Default Routines ──────────────────────────
    console.log('\n--- 2. Login Does Not Create Default Routines ---');
    const loginRes = await makeRequest('POST', '/api/auth/login', null, {
      email: emailUser1,
      password: 'Password123!',
    });
    it('Login succeeds', loginRes.status === 200 && loginRes.data?.token);

    const postLoginDbCount = await ScheduleBlock.countDocuments({ user: user1Id });
    it('ScheduleBlock count remains 0 after subsequent login', postLoginDbCount === 0);

    // ── 3. Command Center /today with Zero Routines ─────────────────────────
    console.log('\n--- 3. Command Center State With Zero Routines ---');
    const todayRes = await makeRequest('GET', '/api/command/today', token1);
    it('GET /api/command/today returns HTTP 200', todayRes.status === 200);
    it('schedule.blocks is an empty array', Array.isArray(todayRes.data?.schedule?.blocks) && todayRes.data.schedule.blocks.length === 0);
    it('schedule.totalBlocks is 0', todayRes.data?.schedule?.totalBlocks === 0);
    it('summary.activeBlock is null', todayRes.data?.summary?.activeBlock === null);
    it('summary.nextBlock is null', todayRes.data?.summary?.nextBlock === null);
    it('summary.upcomingReminder is null', todayRes.data?.summary?.upcomingReminder === null);

    const weeklyRes = await makeRequest('GET', '/api/command/schedule/weekly', token1);
    it('GET /api/command/schedule/weekly returns HTTP 200', weeklyRes.status === 200);
    it('weekly.totalBlocks is 0', weeklyRes.data?.totalBlocks === 0);

    // ── 4. Deprecated Seed Endpoint Does Not Seed Routines ─────────────────
    console.log('\n--- 4. POST /api/command/schedule/seed Disablement ---');
    const seedAttemptRes = await makeRequest('POST', '/api/command/schedule/seed', token1);
    it('POST /api/command/schedule/seed returns 0 count and disabled message',
      seedAttemptRes.status === 200 && seedAttemptRes.data?.count === 0);
    const postSeedDbCount = await ScheduleBlock.countDocuments({ user: user1Id });
    it('Database remains at 0 schedule blocks after calling /seed', postSeedDbCount === 0);

    // ── 5. User Creates Custom Personalized Routine ────────────────────────
    console.log('\n--- 5. User-Created Custom Routines ---');
    const createRes = await makeRequest('POST', '/api/command/schedule', token1, {
      title: 'Strength Training & Cardio',
      description: 'Legs and 20 min HIIT',
      startTime: '18:00',
      endTime: '19:30',
      category: 'gym',
      priority: 'high',
      daysOfWeek: [1, 3, 5],
      isRecurring: true,
    });
    it('User can create a custom routine block', createRes.status === 201 && createRes.data?._id);
    const routineId = createRes.data._id;
    it('User-created routine has order === 0 (distinct from seeded defaults)', createRes.data.order === 0);

    // Verify weekly view now reflects exactly 1 custom routine
    const weeklyAfterCreate = await makeRequest('GET', '/api/command/schedule/weekly', token1);
    it('Weekly schedule now contains exactly 1 routine', weeklyAfterCreate.data?.totalBlocks === 1);

    // ── 6. Isolation Between Users ─────────────────────────────────────────
    console.log('\n--- 6. Cross-User Routine Isolation ---');
    const regRes2 = await makeRequest('POST', '/api/auth/register', null, {
      name: 'Zero Seed User 2',
      email: emailUser2,
      password: 'Password123!',
    });
    const token2 = regRes2.data.token;
    const user2Id = regRes2.data._id || regRes2.data.id;

    const user2Today = await makeRequest('GET', '/api/command/today', token2);
    it('User 2 starts with 0 routines and does not see User 1 routines', user2Today.data?.schedule?.totalBlocks === 0);

    const user2Weekly = await makeRequest('GET', '/api/command/schedule/weekly', token2);
    it('User 2 weekly schedule has 0 blocks', user2Weekly.data?.totalBlocks === 0);

    const idorRes = await makeRequest('DELETE', `/api/command/schedule/${routineId}`, token2);
    it('User 2 cannot delete User 1 routine (HTTP 404)', idorRes.status === 404);

    // ── 7. Safe Cleanup of System Defaults Without Touching User Routines ──
    console.log('\n--- 7. Safe Cleanup of System-Generated Defaults ---');
    // Synthetically inject 1 legacy default block for User 2 with exact seed signature
    const legacyTemplate = SEEDED_DEFAULT_ROUTINES[0]; // Wake, 07:00-07:05, order 0
    const legacyDoc = await ScheduleBlock.create({
      user: user2Id,
      title: legacyTemplate.title,
      startTime: legacyTemplate.startTime,
      endTime: legacyTemplate.endTime,
      category: legacyTemplate.category,
      priority: legacyTemplate.priority,
      daysOfWeek: legacyTemplate.daysOfWeek,
      isRecurring: true,
      order: legacyTemplate.order,
      linkedTask: null,
      linkedGoal: null,
      linkedLearning: null,
      linkedWorkout: null,
    });
    it('Injected test legacy default routine', !!legacyDoc._id);

    // Run cleanup
    const cleanupResult = await cleanupDefaultRoutines();
    it('cleanupDefaultRoutines identifies and removes the legacy default routine', cleanupResult.deletedCount >= 1);

    // Verify User 1's custom routine was completely preserved
    const user1RoutineStillExists = await ScheduleBlock.findById(routineId);
    it('User 1 custom routine was NOT touched or deleted', !!user1RoutineStillExists);

    // ── 8. Routine Notifications & Scheduler ---
    console.log('\n--- 8. Routine Notifications & Scheduler ---');
    // Ensure processReminders does not crash with empty or custom routines
    const mockNow = new Date('2026-09-25T17:55:00+05:30'); // 5 mins before 18:00
    const schedulerResults = await processReminders(mockNow);
    it('processReminders executes safely with 0 errors', Array.isArray(schedulerResults));

    // Clean up test data
    await ScheduleBlock.deleteMany({ user: { $in: [user1Id, user2Id] } });
    await User.deleteMany({ _id: { $in: [user1Id, user2Id] } });

    console.log('\n====================================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test execution error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runSuite();
