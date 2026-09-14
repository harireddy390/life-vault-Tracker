/**
 * Comprehensive Functional Verification Test Suite
 * Validates that all major Life Vault features and routes remain 100% operational.
 */
const http = require('http');

const BASE_URL = 'http://localhost:4003';

function makeRequest(method, path, token = null, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
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

async function runFunctionalTests() {
  console.log('====================================================');
  console.log('🧪 LIFE VAULT FUNCTIONAL REGRESSION TEST SUITE');
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
    const timestamp = Date.now();
    const testEmail = `func_test_${timestamp}@lifevault.test`;
    const testPass = 'FuncTestPass123!';

    // 1. Auth: Signup
    console.log('▶ 1. Authentication (Signup & Login)');
    const regRes = await makeRequest('POST', '/api/auth/register', null, {
      name: 'Functional Tester',
      email: testEmail,
      password: testPass,
    });
    assert(regRes.status === 201 && regRes.data?.token, 'User registration succeeds and returns JWT');
    const token = regRes.data?.token;

    // 2. Auth: Login
    const loginRes = await makeRequest('POST', '/api/auth/login', null, {
      email: testEmail,
      password: testPass,
    });
    assert(loginRes.status === 200 && loginRes.data?.token, 'User login succeeds and returns JWT');

    // 3. Auth: Current user profile
    const meRes = await makeRequest('GET', '/api/auth/me', token);
    assert(meRes.status === 200 && meRes.data?.email === testEmail, 'GET /api/auth/me returns user profile');

    // 4. Tasks Feature
    console.log('\n▶ 2. Tasks Feature');
    const taskCreateRes = await makeRequest('POST', '/api/tasks', token, {
      title: 'Smoke Test Task',
      priority: 'high',
      description: 'Verifying task creation after security fixes',
    });
    assert(taskCreateRes.status === 201 && taskCreateRes.data?._id, 'POST /api/tasks creates task');
    const taskId = taskCreateRes.data?._id;

    const taskGetRes = await makeRequest('GET', '/api/tasks', token);
    assert(taskGetRes.status === 200 && Array.isArray(taskGetRes.data), 'GET /api/tasks lists tasks');

    const taskUpdateRes = await makeRequest('PUT', `/api/tasks/${taskId}`, token, {
      title: 'Smoke Test Task Updated',
      completed: true,
    });
    assert(taskUpdateRes.status === 200 && taskUpdateRes.data?.completed === true, 'PUT /api/tasks/:id updates task safely');

    // 5. Notes Feature
    console.log('\n▶ 3. Notes Feature');
    const noteCreateRes = await makeRequest('POST', '/api/notes', token, {
      title: 'Smoke Test Note',
      content: '# Note Title\n**Important markdown** content',
    });
    assert(noteCreateRes.status === 201 && noteCreateRes.data?._id, 'POST /api/notes creates note');
    const noteId = noteCreateRes.data?._id;

    const noteGetRes = await makeRequest('GET', '/api/notes', token);
    assert(noteGetRes.status === 200 && Array.isArray(noteGetRes.data), 'GET /api/notes lists notes');

    // 6. Habits Feature
    console.log('\n▶ 4. Habits Feature');
    const habitCreateRes = await makeRequest('POST', '/api/habits', token, {
      title: 'Daily Meditation',
      frequency: 'daily',
      startDate: new Date().toISOString().split('T')[0],
    });
    assert(habitCreateRes.status === 201 && habitCreateRes.data?._id, 'POST /api/habits creates habit');

    const habitGetRes = await makeRequest('GET', '/api/habits', token);
    assert(habitGetRes.status === 200 && Array.isArray(habitGetRes.data), 'GET /api/habits lists habits');

    // 7. Finance & Expenses Feature
    console.log('\n▶ 5. Finance & Expenses Feature');
    const expCreateRes = await makeRequest('POST', '/api/expenses', token, {
      title: 'Coffee & Snacks',
      amount: 150,
      category: 'food',
      type: 'expense',
    });
    assert(expCreateRes.status === 201 && expCreateRes.data?._id, 'POST /api/expenses creates expense');

    const txCreateRes = await makeRequest('POST', '/api/finance/transactions', token, {
      title: 'Grocery Supplies',
      amount: 540,
      category: 'Food_Dining',
      type: 'expense',
      payment_method: 'UPI_BankTransfer',
    });
    assert(txCreateRes.status === 201 && txCreateRes.data?._id, 'POST /api/finance/transactions creates transaction');

    const txGetRes = await makeRequest('GET', '/api/finance/transactions', token);
    assert(txGetRes.status === 200 && txGetRes.data?.transactions, 'GET /api/finance/transactions retrieves ledger');

    const summaryRes = await makeRequest('GET', '/api/finance/overview', token);
    assert(summaryRes.status === 200 && summaryRes.data?.netSavings !== undefined, 'GET /api/finance/overview calculates cashflow');

    // 8. Emergency Feature
    console.log('\n▶ 6. Emergency Feature');
    const emergGetRes = await makeRequest('GET', '/api/emergency', token);
    assert(emergGetRes.status === 200, 'GET /api/emergency returns profile');

    const emergPutRes = await makeRequest('PUT', '/api/emergency', token, {
      bloodGroup: 'O+',
      allergies: 'None',
      contacts: [{ name: 'Family Contact', relation: 'Brother', phone: '+91 9999999999' }],
    });
    assert(emergPutRes.status === 200 && emergPutRes.data?.bloodGroup === 'O+', 'PUT /api/emergency updates medical info safely');

    // 9. Health Records Feature
    console.log('\n▶ 7. Health Feature');
    const healthProfRes = await makeRequest('GET', '/api/health/emergency', token);
    assert(healthProfRes.status === 200, 'GET /api/health/emergency returns health profile');

    // 10. Memories Feature
    console.log('\n▶ 8. Memories Feature');
    const memGetRes = await makeRequest('GET', '/api/memories', token);
    assert(memGetRes.status === 200, 'GET /api/memories returns memories list');

    // 11. Family Feature
    console.log('\n▶ 9. Family Feature');
    const famGetRes = await makeRequest('GET', '/api/family/members', token);
    assert(famGetRes.status === 200 && Array.isArray(famGetRes.data), 'GET /api/family/members returns member list');

    // 12. Learning Feature
    console.log('\n▶ 10. Learning Feature');
    const learnGetRes = await makeRequest('GET', '/api/learning/stats', token);
    assert(learnGetRes.status === 200 && learnGetRes.data?.totalNotes !== undefined, 'GET /api/learning/stats returns learning metrics');

    // 13. Subscriptions Feature
    console.log('\n▶ 11. Subscriptions Feature');
    const subCreateRes = await makeRequest('POST', '/api/subscriptions', token, {
      name: 'Cloud Storage',
      amount: 199,
      interval: 'monthly',
      nextDue: new Date(Date.now() + 86400000 * 30).toISOString(),
    });
    assert(subCreateRes.status === 201 && subCreateRes.data?._id, 'POST /api/subscriptions creates subscription');

    const subGetRes = await makeRequest('GET', '/api/subscriptions', token);
    assert(subGetRes.status === 200 && Array.isArray(subGetRes.data), 'GET /api/subscriptions lists subscriptions');

    // 14. Command Center / Dashboard
    console.log('\n▶ 12. Command Center & Daily State');
    const cmdBriefRes = await makeRequest('GET', '/api/command/today', token);
    assert(cmdBriefRes.status === 200 && cmdBriefRes.data?.schedule !== undefined, 'GET /api/command/today returns schedule state');

    // 15. Steps & Timer Sessions
    console.log('\n▶ 13. Steps & Timer Sessions');
    const stepsRes = await makeRequest('GET', '/api/steps', token);
    assert(stepsRes.status === 200 && Array.isArray(stepsRes.data), 'GET /api/steps returns step logs');

    const timerRes = await makeRequest('GET', '/api/timer-sessions', token);
    assert(timerRes.status === 200, 'GET /api/timer-sessions returns session list');

    // 16. Documents & Vault
    console.log('\n▶ 14. Documents & Vault');
    const docsRes = await makeRequest('GET', '/api/documents', token);
    assert(docsRes.status === 200 && Array.isArray(docsRes.data), 'GET /api/documents returns user documents');

    const vaultDocsRes = await makeRequest('GET', '/api/vault/documents', token);
    assert(vaultDocsRes.status === 200 && Array.isArray(vaultDocsRes.data), 'GET /api/vault/documents returns encrypted vault docs');

    console.log('\n====================================================');
    console.log(`📊 FUNCTIONAL SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal functional test error:', err);
    process.exit(1);
  }
}

runFunctionalTests();
