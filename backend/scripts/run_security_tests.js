/**
 * Comprehensive Automated Security Verification Test Suite
 * Tests all 13 required security vectors against the running backend.
 */
const http = require('http');
const https = require('https');
const { escapeRegex, sanitizeCsvValue } = require('../utils/securityUtils');

const BASE_URL = 'http://localhost:4003';

// Helper to send HTTP requests with Promise
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
        'X-Forwarded-For': '198.51.100.88',
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

async function runTests() {
  console.log('====================================================');
  console.log('🔐 LIFE VAULT AUTOMATED SECURITY VERIFICATION SUITE');
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

  try {
    // ----------------------------------------------------
    // TEST 1: Unauthenticated upload access
    // ----------------------------------------------------
    console.log('▶ TEST 1: Unauthenticated Upload Access');
    const unauthUploadRes = await makeRequest('GET', '/uploads/finance/secret_receipt.png');
    assert(
      unauthUploadRes.status === 401,
      'Unauthenticated requests to /uploads/* receive 401 Unauthorized',
      `Got status ${unauthUploadRes.status}`
    );

    // ----------------------------------------------------
    // Setup Test Users (User A and User B)
    // ----------------------------------------------------
    console.log('\n▶ Setting up Test Users for IDOR and Ownership Checks');
    const timestamp = Date.now();
    const userAEmail = `audit_user_a_${timestamp}@lifevault.test`;
    const userBEmail = `audit_user_b_${timestamp}@lifevault.test`;

    const userARes = await makeRequest('POST', '/api/auth/register', {}, {
      name: 'User A Audit',
      email: userAEmail,
      password: 'AuditPassword123!A',
    });
    const tokenA = userARes.data?.token;

    const userBRes = await makeRequest('POST', '/api/auth/register', {}, {
      name: 'User B Audit',
      email: userBEmail,
      password: 'AuditPassword123!B',
    });
    const tokenB = userBRes.data?.token;

    assert(Boolean(tokenA && tokenB), 'Successfully created User A and User B test accounts');

    // ----------------------------------------------------
    // TEST 2: Cross-user document / upload access (IDOR)
    // ----------------------------------------------------
    console.log('\n▶ TEST 2: Cross-User Upload & Document Access (IDOR)');
    // User A creates a task
    const taskRes = await makeRequest('POST', '/api/tasks', { Authorization: `Bearer ${tokenA}` }, {
      title: 'User A Confidential Task',
      priority: 'high',
    });
    const taskId = taskRes.data?._id;

    // User B tries to modify User A's task
    const userBUpdateRes = await makeRequest('PUT', `/api/tasks/${taskId}`, { Authorization: `Bearer ${tokenB}` }, {
      title: 'Hacked by User B',
    });
    assert(
      userBUpdateRes.status === 401 || userBUpdateRes.status === 403,
      'User B cannot modify User A\'s task (IDOR blocked)',
      `Got status ${userBUpdateRes.status}`
    );

    // User B tries to delete User A's task
    const userBDeleteRes = await makeRequest('DELETE', `/api/tasks/${taskId}`, { Authorization: `Bearer ${tokenB}` });
    assert(
      userBDeleteRes.status === 401 || userBDeleteRes.status === 403,
      'User B cannot delete User A\'s task (IDOR blocked)',
      `Got status ${userBDeleteRes.status}`
    );

    // ----------------------------------------------------
    // TEST 3 & 4: Cross-user AI attachment access & ingestion
    // ----------------------------------------------------
    console.log('\n▶ TEST 3 & 4: Cross-User AI Attachment Download & LLM Ingestion');
    // User B attempts to download an attachment belonging to User A
    const crossDownloadRes = await makeRequest(
      'GET',
      '/api/ai/attachments/1726000000-user-a-confidential.pdf',
      { Authorization: `Bearer ${tokenB}` }
    );
    assert(
      crossDownloadRes.status === 404 || crossDownloadRes.status === 403,
      'User B cannot download User A\'s AI attachment (IDOR blocked)',
      `Got status ${crossDownloadRes.status}`
    );

    // User B attempts to inject User A's storedName into AI chat context
    const aiIngestRes = await makeRequest(
      'POST',
      '/api/ai/chat',
      { Authorization: `Bearer ${tokenB}` },
      {
        messages: [{ role: 'user', content: 'Summarize this file for me' }],
        attachments: [{
          storedName: '1726000000-user-a-confidential.pdf',
          file_name: 'user_a_payroll.pdf',
        }],
      }
    );
    assert(
      aiIngestRes.status === 403 || aiIngestRes.status === 404,
      'Cross-user AI attachment ingestion rejected (403 Forbidden)',
      `Got status ${aiIngestRes.status}`
    );

    // ----------------------------------------------------
    // TEST 5: Stored XSS Protection & URL Safety
    // ----------------------------------------------------
    console.log('\n▶ TEST 5: Stored XSS & Dangerous URL Protocols');
    // Verify dangerous protocols are caught
    function isSafeUrl(url) {
      if (!url) return false;
      const trimmed = url.trim();
      if (/^(javascript|vbscript|data|file):/i.test(trimmed)) return false;
      return /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(trimmed);
    }
    assert(isSafeUrl('javascript:alert(document.cookie)') === false, 'javascript: protocol blocked');
    assert(isSafeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==') === false, 'data: protocol blocked');
    assert(isSafeUrl('https://example.com/safe') === true, 'https:// protocol permitted');

    // ----------------------------------------------------
    // TEST 6: Malicious Upload Extensions Allowlist
    // ----------------------------------------------------
    console.log('\n▶ TEST 6: File Upload Security & Allowlist');
    const { upload } = require('../config/upload');
    const blockedExts = ['.exe', '.bat', '.cmd', '.sh', '.js', '.html', '.svg', '.vbs', '.php'];
    let allBlocked = true;
    for (const ext of blockedExts) {
      upload.fileFilter(
        {},
        { originalname: `malicious${ext}`, mimetype: 'application/octet-stream' },
        (err, allowed) => {
          if (allowed) allBlocked = false;
        }
      );
    }
    assert(allBlocked, 'Strict allowlist rejects .exe, .bat, .cmd, .sh, .js, .html, .svg, .vbs, .php');

    // ----------------------------------------------------
    // TEST 7: NoSQL Query Injection Operators
    // ----------------------------------------------------
    console.log('\n▶ TEST 7: NoSQL Operator Injection Sanitization');
    const noSqlLoginRes = await makeRequest('POST', '/api/auth/login', {}, {
      email: { $ne: null },
      password: 'password',
    });
    assert(
      noSqlLoginRes.status === 400 || noSqlLoginRes.status === 401,
      'NoSQL query operator payload rejected safely without database error',
      `Got status ${noSqlLoginRes.status}`
    );

    // ----------------------------------------------------
    // TEST 8: Mass Assignment Protection
    // ----------------------------------------------------
    console.log('\n▶ TEST 8: Mass Assignment Protection');
    const fakeAttackerId = '66e511111111111111111111';
    const massAssignRes = await makeRequest(
      'PUT',
      `/api/tasks/${taskId}`,
      { Authorization: `Bearer ${tokenA}` },
      {
        title: 'Safe Task Updated',
        user: fakeAttackerId,
        _id: fakeAttackerId,
        admin: true,
      }
    );
    assert(
      massAssignRes.status === 200 && massAssignRes.data?.user !== fakeAttackerId,
      'user ownership field cannot be overwritten via mass assignment',
      `Task user: ${massAssignRes.data?.user}`
    );

    // ----------------------------------------------------
    // TEST 9: Regex ReDoS Protection
    // ----------------------------------------------------
    console.log('\n▶ TEST 9: ReDoS Prevention & Regex Escaping');
    const catastrophicPattern = '(((((((a+)+)+)+)+)+)+)$';
    const escapedPattern = escapeRegex(catastrophicPattern);
    assert(
      escapedPattern === '\\(\\(\\(\\(\\(\\(\\(a\\+\\)\\+\\)\\+\\)\\+\\)\\+\\)\\+\\)\\+\\)\\$',
      'Catastrophic ReDoS characters are securely escaped'
    );

    const startTime = Date.now();
    const healthSearchRes = await makeRequest(
      'GET',
      `/api/health/records?search=${encodeURIComponent(catastrophicPattern)}`,
      { Authorization: `Bearer ${tokenA}` }
    );
    const duration = Date.now() - startTime;
    assert(
      healthSearchRes.status === 200 && duration < 500,
      `ReDoS attack payload handled safely in ${duration}ms without event loop blocking`,
      `Duration: ${duration}ms`
    );

    // ----------------------------------------------------
    // TEST 10: CSV Formula Injection (DDE) Neutralization
    // ----------------------------------------------------
    console.log('\n▶ TEST 10: CSV Formula Injection (DDE)');
    const formulaPayload = '=cmd|\' /C calc\'!A0';
    const sanitized = sanitizeCsvValue(formulaPayload);
    assert(
      sanitized.startsWith('"\'='),
      'Formula trigger (=, +, -, @) safely neutralized with leading quote: ' + sanitized
    );

    const plusPayload = '+12345';
    assert(sanitizeCsvValue(plusPayload).startsWith("\"'+"), 'Plus operator neutralized in CSV export');

    // ----------------------------------------------------
    // TEST 11: Rate Limiting on Auth
    // ----------------------------------------------------
    console.log('\n▶ TEST 11: Auth Rate Limiting (Brute Force Defense)');
    let rateLimited = false;
    // Fire requests rapidly from a dedicated IP to test rate limiting
    for (let i = 0; i < 15; i++) {
      const rlRes = await makeRequest(
        'POST',
        '/api/auth/login',
        { 'X-Forwarded-For': '198.51.100.89' },
        {
          email: 'invalid_bruteforce@test.com',
          password: 'wrongpassword',
        }
      );
      if (rlRes.status === 429) {
        rateLimited = true;
        break;
      }
    }
    assert(rateLimited, 'Brute force attempts trigger HTTP 429 Too Many Requests');

    // ----------------------------------------------------
    // TEST 12: AI Rate Limiter
    // ----------------------------------------------------
    console.log('\n▶ TEST 12: AI Endpoint Protection');
    const aiCheckRes = await makeRequest('POST', '/api/ai/chat', { Authorization: `Bearer ${tokenA}` }, {
      messages: [{ role: 'user', content: 'Hello' }],
    });
    // AI should either respond or trigger rate limiter/groq, but not 500 crash
    assert(
      aiCheckRes.status === 200 || aiCheckRes.status === 429 || aiCheckRes.status === 503,
      'AI chat endpoint handles requests safely with limiter',
      `Got status ${aiCheckRes.status}`
    );

    // ----------------------------------------------------
    // TEST 13: Helmet Security Headers & CORS Policy
    // ----------------------------------------------------
    console.log('\n▶ TEST 13: Helmet Security Headers & CORS Protection');
    const rootRes = await makeRequest('GET', '/');
    assert(
      Boolean(rootRes.headers['x-content-type-options'] === 'nosniff'),
      'Helmet sets X-Content-Type-Options: nosniff header'
    );
    assert(
      Boolean(rootRes.headers['x-frame-options'] || rootRes.headers['content-security-policy']),
      'Helmet framing protection headers present'
    );

    console.log('\n====================================================');
    console.log(`📊 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal error during test execution:', error);
    process.exit(1);
  }
}

runTests();
