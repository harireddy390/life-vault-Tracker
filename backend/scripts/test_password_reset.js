/**
 * Automated Verification Suite for Life Vault Password Reset Flow
 * Verifies security, 6-digit OTP verification codes, cryptography, single-use, and rate limiting.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const http = require('http');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');

const BASE_URL = 'http://localhost:4003';

function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.10',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      if (typeof body === 'string') {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
}

async function runPasswordResetTests() {
  console.log('====================================================');
  console.log('🔒 LIFE VAULT 6-DIGIT OTP & PASSWORD RESET VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/lifevault';
  await mongoose.connect(mongoUri);

  const timestamp = Date.now();
  const testEmail = `pw_reset_user_${timestamp}@lifevault.test`;
  const nonExistentEmail = `ghost_user_${timestamp}@lifevault.test`;
  const initialPassword = 'InitialSecurePassword123!';
  const updatedPassword = 'BrandNewSecurePassword456!';

  try {
    // ----------------------------------------------------
    // SETUP: Create test user directly in DB
    // ----------------------------------------------------
    console.log('▶ Setup: Creating test user');
    const testUser = await User.create({
      name: 'Password Reset Tester',
      email: testEmail,
      password: initialPassword,
    });
    assert(Boolean(testUser._id), 'Test user created in database');

    // ----------------------------------------------------
    // TEST 1: Non-existent email returns generic 200 response
    // ----------------------------------------------------
    console.log('\n▶ TEST 1: Non-existent email enumeration protection');
    const nonExistentRes = await makeRequest(
      'POST',
      '/api/auth/forgot-password',
      { 'X-Forwarded-For': '198.51.100.11' },
      { email: nonExistentEmail }
    );
    assert(
      nonExistentRes.status === 200,
      'Forgot-password returns HTTP 200 for non-existent email',
      `Got ${nonExistentRes.status}`
    );
    assert(
      nonExistentRes.data?.message?.includes('verification code has been sent'),
      'Returns generic safe message without leaking account existence'
    );
    assert(
      !nonExistentRes.data?.devCode,
      'devCode is never returned for non-existent account'
    );

    // ----------------------------------------------------
    // TEST 2: Existing email returns 6-digit OTP in dev mode
    // ----------------------------------------------------
    console.log('\n▶ TEST 2: Existing email code generation');
    const existingRes = await makeRequest(
      'POST',
      '/api/auth/forgot-password',
      { 'X-Forwarded-For': '198.51.100.12' },
      { email: testEmail }
    );
    assert(
      existingRes.status === 200,
      'Forgot-password returns HTTP 200 for existing email',
      `Got ${existingRes.status}`
    );
    const receivedCode = existingRes.data?.devCode;
    assert(
      Boolean(receivedCode && /^\d{6}$/.test(receivedCode)),
      `Generates 6-digit numeric OTP verification code: ${receivedCode}`
    );

    // ----------------------------------------------------
    // TEST 3: Database stores SHA-256 hash, not raw code
    // ----------------------------------------------------
    console.log('\n▶ TEST 3: Cryptographic storage in database');
    const dbUserAfterForgot = await User.findOne({ email: testEmail }).select('+passwordResetToken +passwordResetExpires');
    assert(
      Boolean(dbUserAfterForgot.passwordResetToken),
      'passwordResetToken field is populated in database'
    );
    assert(
      dbUserAfterForgot.passwordResetToken.length === 64,
      'Stored code is a 64-character SHA-256 hex digest'
    );
    const expectedHash = crypto.createHash('sha256').update(receivedCode).digest('hex');
    assert(
      dbUserAfterForgot.passwordResetToken === expectedHash,
      'Database hash accurately corresponds to SHA-256(receivedCode)'
    );
    assert(
      dbUserAfterForgot.passwordResetExpires > new Date(),
      'passwordResetExpires is set to a future timestamp (15 min window)'
    );

    // ----------------------------------------------------
    // TEST 4: Input validation on reset endpoint
    // ----------------------------------------------------
    console.log('\n▶ TEST 4: Input validation on reset endpoint');
    const shortPasswordRes = await makeRequest(
      'POST',
      '/api/auth/reset-password',
      { 'X-Forwarded-For': '198.51.100.13' },
      { email: testEmail, code: receivedCode, password: '123' }
    );
    assert(
      shortPasswordRes.status === 400,
      'Reset password rejects passwords shorter than 6 characters (HTTP 400)',
      `Got ${shortPasswordRes.status}`
    );

    const invalidCodeRes = await makeRequest(
      'POST',
      '/api/auth/reset-password',
      { 'X-Forwarded-For': '198.51.100.13' },
      { email: testEmail, code: '000000', password: updatedPassword }
    );
    assert(
      invalidCodeRes.status === 400,
      'Reset password rejects incorrect 6-digit code with HTTP 400',
      `Got ${invalidCodeRes.status}`
    );

    // ----------------------------------------------------
    // TEST 5: Valid password reset execution using 6-digit code
    // ----------------------------------------------------
    console.log('\n▶ TEST 5: Valid password reset execution via OTP code');
    const validResetRes = await makeRequest(
      'POST',
      '/api/auth/reset-password',
      { 'X-Forwarded-For': '198.51.100.14' },
      { email: testEmail, code: receivedCode, password: updatedPassword }
    );
    assert(
      validResetRes.status === 200,
      'Password reset returns HTTP 200 on valid 6-digit code and new password',
      `Got ${validResetRes.status}`
    );

    // ----------------------------------------------------
    // TEST 6: Old password authentication fails
    // ----------------------------------------------------
    console.log('\n▶ TEST 6: Old password invalidation');
    const oldLoginRes = await makeRequest(
      'POST',
      '/api/auth/login',
      { 'X-Forwarded-For': '198.51.100.15' },
      { email: testEmail, password: initialPassword }
    );
    assert(
      oldLoginRes.status === 401 || oldLoginRes.status === 400,
      'Login with old password fails (HTTP 400/401)',
      `Got ${oldLoginRes.status}`
    );

    // ----------------------------------------------------
    // TEST 7: New password authentication succeeds
    // ----------------------------------------------------
    console.log('\n▶ TEST 7: New password authentication');
    const newLoginRes = await makeRequest(
      'POST',
      '/api/auth/login',
      { 'X-Forwarded-For': '198.51.100.15' },
      { email: testEmail, password: updatedPassword }
    );
    assert(
      newLoginRes.status === 200 && Boolean(newLoginRes.data?.token),
      'Login with new password succeeds and returns JWT token',
      `Got ${newLoginRes.status}`
    );

    // ----------------------------------------------------
    // TEST 8: Single-use token enforcement
    // ----------------------------------------------------
    console.log('\n▶ TEST 8: Single-use token verification');
    const reuseResetRes = await makeRequest(
      'POST',
      '/api/auth/reset-password',
      { 'X-Forwarded-For': '198.51.100.16' },
      { email: testEmail, code: receivedCode, password: 'AnotherPassword789!' }
    );
    assert(
      reuseResetRes.status === 400,
      'Reusing the same verification code is rejected with HTTP 400',
      `Got ${reuseResetRes.status}`
    );

    // Check DB fields were cleared
    const dbUserAfterReset = await User.findOne({ email: testEmail }).select('+passwordResetToken +passwordResetExpires');
    assert(
      dbUserAfterReset.passwordResetToken == null,
      'passwordResetToken is cleared in DB after use'
    );
    assert(
      dbUserAfterReset.passwordResetExpires == null,
      'passwordResetExpires is cleared in DB after use'
    );

    // ----------------------------------------------------
    // TEST 9: Expired token rejection
    // ----------------------------------------------------
    console.log('\n▶ TEST 9: Expired token rejection');
    const expiredCode = '987654';
    const expiredHash = crypto.createHash('sha256').update(expiredCode).digest('hex');

    dbUserAfterReset.passwordResetToken = expiredHash;
    dbUserAfterReset.passwordResetExpires = new Date(Date.now() - 60000); // 1 minute ago
    await dbUserAfterReset.save({ validateBeforeSave: false });

    const expiredResetRes = await makeRequest(
      'POST',
      '/api/auth/reset-password',
      { 'X-Forwarded-For': '198.51.100.17' },
      { email: testEmail, code: expiredCode, password: 'AnotherPassword789!' }
    );
    assert(
      expiredResetRes.status === 400,
      'Expired code is rejected with HTTP 400',
      `Got ${expiredResetRes.status}`
    );

    // ----------------------------------------------------
    // TEST 10: URL Token Parameter Support (/reset-password/:token)
    // ----------------------------------------------------
    console.log('\n▶ TEST 10: Direct URL Token Link Compatibility');
    const linkCode = '554433';
    const linkHash = crypto.createHash('sha256').update(linkCode).digest('hex');
    dbUserAfterReset.passwordResetToken = linkHash;
    dbUserAfterReset.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await dbUserAfterReset.save({ validateBeforeSave: false });

    const tokenLinkRes = await makeRequest(
      'POST',
      `/api/auth/reset-password/${linkCode}`,
      { 'X-Forwarded-For': '198.51.100.18' },
      { password: 'DirectLinkPassword999!' }
    );
    assert(
      tokenLinkRes.status === 200,
      'POST /api/auth/reset-password/:token succeeds for direct link clicks',
      `Got ${tokenLinkRes.status}`
    );

    // ----------------------------------------------------
    // TEST 11: Rate Limiting Enforcement
    // ----------------------------------------------------
    console.log('\n▶ TEST 11: Rate limiting on password reset endpoints');
    let rateLimited = false;
    const attackerIp = '198.51.100.99';
    for (let i = 0; i < 6; i++) {
      const res = await makeRequest(
        'POST',
        '/api/auth/forgot-password',
        { 'X-Forwarded-For': attackerIp },
        { email: `ratelimit_${i}_${timestamp}@lifevault.test` }
      );
      if (res.status === 429) {
        rateLimited = true;
        break;
      }
    }
    assert(
      rateLimited,
      'passwordResetLimiter enforces rate limit and returns HTTP 429 after 5 requests'
    );

  } catch (error) {
    console.error('Unexpected test exception:', error);
    failed++;
  } finally {
    // Clean up
    await User.deleteMany({ email: { $regex: /_user_\d+@lifevault\.test/ } });
    await mongoose.disconnect();

    console.log('\n====================================================');
    console.log(`Password Reset Verification Complete: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    process.exit(failed > 0 ? 1 : 0);
  }
}

runPasswordResetTests();
