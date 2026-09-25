/**
 * Verification Script for Vercel SPA Routing & Deep Link Refreshes
 */

const fs = require('fs');
const http = require('http');
const path = require('path');
const assert = require('assert');

async function testVercelRouting() {
  console.log('====================================================');
  console.log('🧪 VERIFYING VERCEL SPA ROUTING & DEEP LINKS');
  console.log('====================================================\n');

  // 1. Verify frontend/vercel.json
  const frontendDir = path.join(__dirname, '..', '..', 'frontend');
  const vercelConfigPath = path.join(frontendDir, 'vercel.json');
  assert(fs.existsSync(vercelConfigPath), 'frontend/vercel.json must exist');

  const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
  assert(Array.isArray(config.rewrites), 'rewrites must be an array');
  assert.strictEqual(config.rewrites[0].source, '/(.*)');
  assert.strictEqual(config.rewrites[0].destination, '/index.html');
  console.log('✅ STEP 3 PASSED: frontend/vercel.json rewrite rule is valid (/(.*) -> /index.html).\n');

  // 2. Verify root vercel.json and public/vercel.json do NOT exist
  const rootVercel = path.join(__dirname, '..', '..', 'vercel.json');
  const publicVercel = path.join(frontendDir, 'public', 'vercel.json');
  assert(!fs.existsSync(rootVercel), 'root vercel.json must be removed');
  assert(!fs.existsSync(publicVercel), 'frontend/public/vercel.json must be removed');
  console.log('✅ Redundant configuration files successfully removed (root & public).\n');

  // 3. Test deep-link simulation server implementing Vercel rewrite logic
  const distDir = path.join(frontendDir, 'dist');
  assert(fs.existsSync(path.join(distDir, 'index.html')), 'dist/index.html must exist');
  const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');

  const server = http.createServer((req, res) => {
    const urlPath = req.url.split('?')[0];
    const staticPath = path.join(distDir, urlPath);

    // Vercel Priority 1: Direct file match on disk
    if (urlPath !== '/' && fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
      const ext = path.extname(staticPath);
      const mime = ext === '.js' ? 'application/javascript' : ext === '.json' ? 'application/json' : ext === '.png' ? 'image/png' : 'text/plain';
      res.writeHead(200, { 'Content-Type': mime });
      res.end(fs.readFileSync(staticPath));
      return;
    }

    // Vercel Priority 2: SPA Rewrite /(.*) -> /index.html
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(indexHtml);
  });

  await new Promise((resolve) => server.listen(5288, resolve));
  console.log('Test HTTP Server running on port 5288.\nTesting representative deep-link routes:');

  const testRoutes = [
    '/command',
    '/dashboard',
    '/vault',
    '/health',
    '/goals',
    '/planner',
    '/notes',
    '/finance',
    '/family',
    '/memories',
    '/life-ai',
    '/settings',
    '/reset-password/sample-token-98765',
  ];

  for (const route of testRoutes) {
    await new Promise((resolve, reject) => {
      http.get('http://localhost:5288' + route, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          assert.strictEqual(res.statusCode, 200, `Expected 200 for ${route}`);
          assert(res.headers['content-type'].includes('text/html'), `Expected text/html for ${route}`);
          assert(body.includes('id="root"'), `Expected root div in ${route}`);
          assert(body.includes('/assets/index-'), `Expected main script tag in ${route}`);
          console.log(`  ✅ Direct Refresh / Deep Link OK (HTTP 200): ${route}`);
          resolve();
        });
      }).on('error', reject);
    });
  }

  // Verify static assets are untouched and directly served
  await new Promise((resolve, reject) => {
    http.get('http://localhost:5288/sw.js', (res) => {
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.headers['content-type'], 'application/javascript');
      console.log('  ✅ Static Asset OK (HTTP 200): /sw.js');
      resolve();
    }).on('error', reject);
  });

  server.close();

  console.log('\n====================================================');
  console.log('🎉 ALL VERCEL SPA ROUTING TESTS PASSED');
  console.log('====================================================');
}

testVercelRouting().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
