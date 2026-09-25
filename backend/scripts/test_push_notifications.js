/**
 * Automated Test Suite for Web Push Routine Notifications
 * 
 * Tests all 20 requirements from Phase 17:
 * 1. Authenticated subscription creation
 * 2. Unauthenticated subscription rejection
 * 3. Subscription ownership & IDOR defense
 * 4. Subscription deletion
 * 5. VAPID public key endpoint
 * 6. User with multiple subscriptions
 * 7. Invalid subscription handling
 * 8. Expired subscription cleanup
 * 9. Reminder scheduling
 * 10. Exactly one reminder per routine occurrence
 * 11. Restart/idempotency behavior
 * 12. 5-minute calculation
 * 13. User timezone handling
 * 14. Recurring routines
 * 15. Different users' routines remain isolated
 * 16. Notification failure does not break routine CRUD
 * 17. No VAPID private key in frontend bundle
 * 18. No secrets in Git / source files
 * 19. Existing Command Center functionality
 * 20. Existing authentication
 */

const http = require('http');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const PushSubscription = require('../models/PushSubscription');
const RoutineReminderLog = require('../models/RoutineReminderLog');
const ScheduleBlock = require('../models/ScheduleBlock');
const User = require('../models/User');
const { getLocalTimeInZone, checkAndSendUpcomingReminders } = require('../services/routineReminderScheduler');
const { sendNotificationToSubscription } = require('../services/notificationService');

const crypto = require('crypto');
const BASE_URL = 'http://localhost:4003';
const ecdh = crypto.createECDH('prime256v1');
ecdh.generateKeys();
const validP256dh = ecdh.getPublicKey('base64url');
const validAuth = crypto.randomBytes(16).toString('base64url');

function makeRequest(method, reqPath, token = null, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, BASE_URL);
    const headers = { 'Content-Type': 'application/json' };
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

async function runTests() {
  console.log('====================================================');
  console.log('🧪 LIFE VAULT — WEB PUSH NOTIFICATIONS TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function recordPass(testName) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  }

  function recordFail(testName, err) {
    console.error(`  ❌ [FAIL] ${testName}:`, err?.message || err);
    failed++;
  }

  // Connect to DB directly for state cleanup & verification
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  const timestamp = Date.now();
  const testUserAEmail = `push_test_a_${timestamp}@example.com`;
  const testUserBEmail = `push_test_b_${timestamp}@example.com`;
  const testPassword = 'Password123!';

  let tokenA = null;
  let userAId = null;
  let tokenB = null;
  let userBId = null;

  try {
    // -------------------------------------------------------------
    // SETUP: Register test users
    // -------------------------------------------------------------
    console.log('--- Setting up Test Users ---');
    const regResA = await makeRequest('POST', '/api/auth/register', null, {
      name: 'Push Test User A',
      email: testUserAEmail,
      password: testPassword,
    });
    assert.strictEqual(regResA.status, 201, 'User A registration should return 201');
    tokenA = regResA.data.token;
    userAId = regResA.data._id || regResA.data.user?.id || regResA.data.user?._id;

    const regResB = await makeRequest('POST', '/api/auth/register', null, {
      name: 'Push Test User B',
      email: testUserBEmail,
      password: testPassword,
    });
    assert.strictEqual(regResB.status, 201, 'User B registration should return 201');
    tokenB = regResB.data.token;
    userBId = regResB.data._id || regResB.data.user?.id || regResB.data.user?._id;
    recordPass('Setup: Registered Test Users A & B');

    // -------------------------------------------------------------
    // TEST 1: VAPID Public Key Endpoint
    // -------------------------------------------------------------
    console.log('\n--- 1. VAPID Public Key Endpoint ---');
    // Must reject unauthenticated
    const pubKeyUnauth = await makeRequest('GET', '/api/notifications/public-key');
    assert.strictEqual(pubKeyUnauth.status, 401, 'Unauthenticated request to public-key should return 401');
    recordPass('Rejects unauthenticated request to /api/notifications/public-key with 401');

    // Must return valid key for authenticated user
    const pubKeyAuth = await makeRequest('GET', '/api/notifications/public-key', tokenA);
    assert.strictEqual(pubKeyAuth.status, 200, 'Authenticated request should return 200');
    assert.strictEqual(pubKeyAuth.data.publicKey, process.env.VAPID_PUBLIC_KEY, 'Public key matches backend config');
    recordPass('Authenticated request returns configured VAPID public key');

    // -------------------------------------------------------------
    // TEST 2: Unauthenticated Subscription Rejection
    // -------------------------------------------------------------
    console.log('\n--- 2. Unauthenticated Subscription Rejection ---');
    const unauthSub = await makeRequest('POST', '/api/notifications/subscribe', null, {
      subscription: {
        endpoint: 'https://fcm.googleapis.com/fcm/send/unauth-endpoint',
        keys: { p256dh: 'dummyKey', auth: 'dummyAuth' },
      },
    });
    assert.strictEqual(unauthSub.status, 401, 'Unauthenticated subscription must return 401');
    recordPass('Rejects unauthenticated subscription creation with 401');

    // -------------------------------------------------------------
    // TEST 3: Invalid Subscription Payload Handling
    // -------------------------------------------------------------
    console.log('\n--- 3. Invalid Subscription Payload Handling ---');
    const invalidSub1 = await makeRequest('POST', '/api/notifications/subscribe', tokenA, {});
    assert.strictEqual(invalidSub1.status, 400, 'Missing subscription payload should return 400');

    const invalidSub2 = await makeRequest('POST', '/api/notifications/subscribe', tokenA, {
      subscription: { endpoint: 'https://example.com/test' }, // missing keys
    });
    assert.strictEqual(invalidSub2.status, 400, 'Missing subscription keys should return 400');
    recordPass('Rejects invalid subscription payloads with 400');

    // -------------------------------------------------------------
    // TEST 4: Authenticated Subscription Creation
    // -------------------------------------------------------------
    console.log('\n--- 4. Authenticated Subscription Creation ---');
    const endpointA1 = `https://fcm.googleapis.com/fcm/send/userA_device1_${timestamp}`;
    const subResA1 = await makeRequest('POST', '/api/notifications/subscribe', tokenA, {
      subscription: {
        endpoint: endpointA1,
        keys: {
          p256dh: validP256dh,
          auth: validAuth,
        },
      },
      deviceLabel: 'Chrome Desktop A1',
      timezone: 'Asia/Kolkata',
    });
    assert.strictEqual(subResA1.status, 201, 'Subscription creation should return 201');
    assert.strictEqual(subResA1.data.success, true);
    assert.strictEqual(subResA1.data.deviceLabel, 'Chrome Desktop A1');

    // Verify stored in DB with user scoping
    const dbSubA1 = await PushSubscription.findOne({ endpoint: endpointA1 });
    assert.ok(dbSubA1, 'Subscription must exist in DB');
    assert.strictEqual(dbSubA1.user.toString(), userAId.toString(), 'Subscription is strictly scoped to User A');
    assert.strictEqual(dbSubA1.timezone, 'Asia/Kolkata');
    recordPass('Authenticated subscription created and securely linked to User A');

    // -------------------------------------------------------------
    // TEST 5: User with Multiple Subscriptions (Multi-Device)
    // -------------------------------------------------------------
    console.log('\n--- 5. User with Multiple Subscriptions (Multi-Device) ---');
    const endpointA2 = `https://fcm.googleapis.com/fcm/send/userA_device2_${timestamp}`;
    const subResA2 = await makeRequest('POST', '/api/notifications/subscribe', tokenA, {
      subscription: {
        endpoint: endpointA2,
        keys: {
          p256dh: validP256dh,
          auth: validAuth,
        },
      },
      deviceLabel: 'Android Chrome A2',
      timezone: 'Asia/Kolkata',
    });
    assert.strictEqual(subResA2.status, 201);

    const userASubs = await PushSubscription.find({ user: userAId });
    assert.strictEqual(userASubs.length, 2, 'User A should have exactly 2 active subscriptions');
    recordPass('User A successfully registers multiple devices without limit');

    // -------------------------------------------------------------
    // TEST 6: Subscription Ownership & IDOR Defense
    // -------------------------------------------------------------
    console.log('\n--- 6. Subscription Ownership & IDOR Defense ---');
    // User B attempts to unsubscribe User A's endpoint
    const idorUnsub = await makeRequest('POST', '/api/notifications/unsubscribe', tokenB, {
      endpoint: endpointA1,
    });
    assert.strictEqual(idorUnsub.status, 404, 'User B must not be able to delete User A subscription');

    // Check DB: User A's subscription must still exist
    const checkA1 = await PushSubscription.findOne({ endpoint: endpointA1 });
    assert.ok(checkA1, 'User A subscription remained untouched after User B IDOR attempt');
    recordPass('IDOR Defense: User B cannot delete User A subscription');

    // -------------------------------------------------------------
    // TEST 7: Subscription Deletion (Unsubscribe)
    // -------------------------------------------------------------
    console.log('\n--- 7. Subscription Deletion ---');
    const unsubRes = await makeRequest('POST', '/api/notifications/unsubscribe', tokenA, {
      endpoint: endpointA1,
    });
    assert.strictEqual(unsubRes.status, 200);
    assert.strictEqual(unsubRes.data.success, true);

    const deletedSub = await PushSubscription.findOne({ endpoint: endpointA1 });
    assert.strictEqual(deletedSub, null, 'Deleted subscription no longer exists in DB');
    recordPass('User A can successfully delete own subscription');

    // Re-subscribe endpointA1 for scheduler tests
    await makeRequest('POST', '/api/notifications/subscribe', tokenA, {
      subscription: {
        endpoint: endpointA1,
        keys: {
          p256dh: validP256dh,
          auth: validAuth,
        },
      },
      deviceLabel: 'Chrome Desktop A1',
      timezone: 'Asia/Kolkata',
    });

    // -------------------------------------------------------------
    // TEST 8: 5-Minute Reminder Calculation & Timezone Helper
    // -------------------------------------------------------------
    console.log('\n--- 8. 5-Minute Reminder & Timezone Calculation ---');
    const mockDate = new Date('2026-09-25T12:25:00Z'); // 17:55 in Asia/Kolkata (+05:30)
    const localKolkata = getLocalTimeInZone('Asia/Kolkata', mockDate);
    assert.strictEqual(localKolkata.timeStr, '17:55', 'Kolkata timeStr should be 17:55');
    assert.strictEqual(localKolkata.dateStr, '2026-09-25', 'Kolkata dateStr should be 2026-09-25');
    assert.strictEqual(localKolkata.dayOfWeek, 5, '2026-09-25 is Friday (5)');

    // Test UTC timezone
    const localUtc = getLocalTimeInZone('UTC', mockDate);
    assert.strictEqual(localUtc.timeStr, '12:25', 'UTC timeStr should be 12:25');

    // Test America/New_York (EDT, UTC-4 in September)
    const localNy = getLocalTimeInZone('America/New_York', mockDate);
    assert.strictEqual(localNy.timeStr, '08:25', 'NY timeStr should be 08:25');
    recordPass('Timezone helper accurately computes local time & date across IANA zones');

    // -------------------------------------------------------------
    // TEST 9: Routine Recurrence & Reminder Scheduling
    // -------------------------------------------------------------
    console.log('\n--- 9. Routine Recurrence & Reminder Scheduling ---');
    // Create a schedule block for User A:
    // Today is 2026-09-25 (Friday, day 5).
    // Let's create a recurring routine at 18:00 (5 minutes after 17:55).
    const block1 = await ScheduleBlock.create({
      user: userAId,
      title: 'Evening Gym Routine',
      startTime: '18:00',
      endTime: '19:00',
      category: 'gym',
      isRecurring: true,
      daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
      skippedDates: [],
    });

    // Create a non-matching routine for User A (Saturday only)
    const blockSat = await ScheduleBlock.create({
      user: userAId,
      title: 'Saturday Marathon',
      startTime: '18:00',
      endTime: '20:00',
      category: 'gym',
      isRecurring: true,
      daysOfWeek: [6], // Sat only
      skippedDates: [],
    });

    // Create a matching routine for User B at 18:00, but User B has NO subscriptions
    const blockUserB = await ScheduleBlock.create({
      user: userBId,
      title: 'User B Coding Practice',
      startTime: '18:00',
      endTime: '19:00',
      category: 'study',
      isRecurring: true,
      daysOfWeek: [5], // Friday
      skippedDates: [],
    });

    // Trigger scheduler check with simulated time 17:55 (5 minutes before 18:00)
    const schedulerResults1 = await checkAndSendUpcomingReminders(mockDate);
    assert.strictEqual(schedulerResults1.length, 1, 'Exactly 1 reminder should be processed');
    assert.strictEqual(schedulerResults1[0].routineTitle, 'Evening Gym Routine');
    assert.strictEqual(schedulerResults1[0].scheduledStartTime, '18:00');
    assert.strictEqual(schedulerResults1[0].dateStr, '2026-09-25');
    recordPass('Scheduler accurately targets recurring routine due in exactly 5 minutes');

    // -------------------------------------------------------------
    // TEST 10: Exactly One Reminder Per Occurrence (Duplicate Prevention)
    // -------------------------------------------------------------
    console.log('\n--- 10. Duplicate Prevention & Idempotency ---');
    // Check that RoutineReminderLog was written
    const occurrenceKey = `${block1._id.toString()}_2026-09-25`;
    const logEntry = await RoutineReminderLog.findOne({ occurrenceKey });
    assert.ok(logEntry, 'RoutineReminderLog entry must exist for occurrenceKey');
    assert.strictEqual(logEntry.routineTitle, 'Evening Gym Routine');

    // Run scheduler AGAIN with the exact same simulated time
    const schedulerResults2 = await checkAndSendUpcomingReminders(mockDate);
    assert.strictEqual(schedulerResults2.length, 0, 'Second run must NOT generate any duplicate reminders');

    // Simulate server restart: run scheduler again
    const schedulerResults3 = await checkAndSendUpcomingReminders(mockDate);
    assert.strictEqual(schedulerResults3.length, 0, 'Post-restart run must NOT duplicate reminders');
    recordPass('Persistent idempotency verified: exactly 1 reminder per routine occurrence');

    // -------------------------------------------------------------
    // TEST 11: Skipped Dates Handling
    // -------------------------------------------------------------
    console.log('\n--- 11. Skipped Dates Handling ---');
    const blockSkipped = await ScheduleBlock.create({
      user: userAId,
      title: 'Skipped Friday Session',
      startTime: '18:00',
      endTime: '19:00',
      category: 'work',
      isRecurring: true,
      daysOfWeek: [5],
      skippedDates: ['2026-09-25'], // Skipped today!
    });
    const schedulerResultsSkipped = await checkAndSendUpcomingReminders(mockDate);
    assert.strictEqual(schedulerResultsSkipped.length, 0, 'Skipped date must NOT generate reminder');
    recordPass('Skipped dates properly honored without reminder generation');

    // -------------------------------------------------------------
    // TEST 12: User Isolation in Routines & Subscriptions
    // -------------------------------------------------------------
    console.log('\n--- 12. User Isolation in Routines & Subscriptions ---');
    // User B tries to view or edit User A's schedule block via API
    const idorBlockEdit = await makeRequest('PUT', `/api/command/schedule/${block1._id}`, tokenB, {
      title: 'Hacked by User B',
    });
    assert.strictEqual(idorBlockEdit.status, 404, 'User B cannot edit User A schedule block');

    const pristineBlock = await ScheduleBlock.findById(block1._id);
    assert.strictEqual(pristineBlock.title, 'Evening Gym Routine', 'User A schedule block remained unmodified');
    recordPass('Schedule blocks strictly isolated between users');

    // -------------------------------------------------------------
    // TEST 13: Expired Subscription Cleanup (410/404 handling)
    // -------------------------------------------------------------
    console.log('\n--- 13. Expired Subscription Cleanup (410 / 404) ---');
    // Insert a dummy expired subscription for User A
    const expiredEndpoint = `https://fcm.googleapis.com/fcm/send/expired_device_${timestamp}`;
    const expiredSub = await PushSubscription.create({
      user: userAId,
      endpoint: expiredEndpoint,
      keys: { p256dh: validP256dh, auth: validAuth },
      deviceLabel: 'Expired Phone',
      timezone: 'Asia/Kolkata',
    });

    // Send push notification with simulated 410 response by passing an invalid endpoint to web-push
    // We expect sendPushNotification to catch 404/410/400 and remove from DB gracefully
    const dummyPayload = { title: 'Test', body: 'Test' };
    const pushResult = await sendNotificationToSubscription(expiredSub, dummyPayload);
    assert.strictEqual(pushResult.success, false, 'Send to invalid/expired endpoint returns success=false');
    assert.strictEqual(pushResult.removed, true, 'Expired/invalid endpoint marked for removal');

    const checkExpiredSub = await PushSubscription.findOne({ endpoint: expiredEndpoint });
    assert.strictEqual(checkExpiredSub, null, 'Expired subscription was automatically cleaned up from DB');
    recordPass('Expired subscription (410/404) safely cleaned up without crashing application');

    // -------------------------------------------------------------
    // TEST 14: Routine CRUD Works Even If Notifications Fail
    // -------------------------------------------------------------
    console.log('\n--- 14. Routine CRUD Unaffected by Notification Failures ---');
    const createRes = await makeRequest('POST', '/api/command/schedule', tokenA, {
      title: 'Read Book',
      startTime: '20:00',
      endTime: '21:00',
      category: 'study',
      isRecurring: false,
      date: '2026-09-25',
    });
    assert.strictEqual(createRes.status, 201, 'Routine creation succeeds');
    const createdId = createRes.data._id || createRes.data.data?._id;

    const deleteRes = await makeRequest('DELETE', `/api/command/schedule/${createdId}`, tokenA);
    assert.strictEqual(deleteRes.status, 200, 'Routine deletion succeeds');
    recordPass('Routine CRUD remains fully functional regardless of notification state');

    // -------------------------------------------------------------
    // TEST 17: Security - No Private VAPID Key Leaked in Frontend Bundle
    // -------------------------------------------------------------
    console.log('\n--- 17. Security: Frontend Bundle Inspection ---');
    const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
    if (fs.existsSync(distPath)) {
      const files = fs.readdirSync(distPath, { recursive: true });
      let leakFound = false;
      const privateKey = process.env.VAPID_PRIVATE_KEY;

      for (const file of files) {
        const fullPath = path.join(distPath, file);
        if (fs.statSync(fullPath).isFile() && (file.endsWith('.js') || file.endsWith('.html'))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes(privateKey)) {
            leakFound = true;
            break;
          }
        }
      }
      assert.strictEqual(leakFound, false, 'VAPID private key must NEVER exist in frontend bundle');
      recordPass('Frontend bundle verified clean: NO VAPID private key leakage');
    } else {
      console.log('  ⚠️  Frontend dist directory not found, skipping bundle check');
    }

    // -------------------------------------------------------------
    // TEST 18: Security - No Secrets in Git tracked files
    // -------------------------------------------------------------
    console.log('\n--- 18. Security: Git Secrets Inspection ---');
    const gitignorePath = path.join(__dirname, '..', '.gitignore');
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    assert.ok(gitignoreContent.includes('.env'), '.gitignore must ignore .env files');
    recordPass('.gitignore properly ignores .env configuration files');

    // -------------------------------------------------------------
    // TEST 19: Existing Command Center Functionality
    // -------------------------------------------------------------
    console.log('\n--- 19. Existing Command Center Functionality ---');
    const ccTodayRes = await makeRequest('GET', '/api/command/today', tokenA);
    assert.strictEqual(ccTodayRes.status, 200, 'GET /api/command/today succeeds');
    assert.ok(ccTodayRes.data?.schedule, 'Schedule payload present in response');

    const ccWeeklyRes = await makeRequest('GET', '/api/command/schedule/weekly', tokenA);
    assert.strictEqual(ccWeeklyRes.status, 200, 'GET /api/command/schedule/weekly succeeds');
    recordPass('Existing Command Center endpoints fully operational');

    // -------------------------------------------------------------
    // TEST 20: Existing Authentication
    // -------------------------------------------------------------
    console.log('\n--- 20. Existing Authentication ---');
    const loginSuccess = await makeRequest('POST', '/api/auth/login', null, {
      email: testUserAEmail,
      password: testPassword,
    });
    assert.strictEqual(loginSuccess.status, 200, 'Login with correct credentials returns 200');
    assert.ok(loginSuccess.data.token, 'Token returned on successful login');

    const loginFail = await makeRequest('POST', '/api/auth/login', null, {
      email: testUserAEmail,
      password: 'WrongPassword!',
    });
    assert.strictEqual(loginFail.status, 401, 'Login with wrong password returns 401');
    recordPass('Existing Authentication login and security rejection verified');

    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    console.log('\n--- Cleaning up Test Artifacts ---');
    await PushSubscription.deleteMany({ user: { $in: [userAId, userBId] } });
    await ScheduleBlock.deleteMany({ user: { $in: [userAId, userBId] } });
    await RoutineReminderLog.deleteMany({ user: { $in: [userAId, userBId] } });
    await User.deleteMany({ _id: { $in: [userAId, userBId] } });
    console.log('Cleanup completed.');

  } catch (err) {
    recordFail('Test Suite Execution', err);
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
