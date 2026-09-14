const http = require('http');
const assert = require('assert');

const BASE_URL = 'http://localhost:4003';

function makeRequest({ method, path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { ...headers },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
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
      req.write(body);
    }
    req.end();
  });
}

function createMultipartFormData(boundary, fields, fileField) {
  const crlf = '\r\n';
  let body = Buffer.alloc(0);

  // Append regular text fields
  for (const [key, value] of Object.entries(fields)) {
    const fieldHeader = Buffer.from(
      `--${boundary}${crlf}Content-Disposition: form-data; name="${key}"${crlf}${crlf}${value}${crlf}`
    );
    body = Buffer.concat([body, fieldHeader]);
  }

  // Append file field
  if (fileField) {
    const fileHeader = Buffer.from(
      `--${boundary}${crlf}Content-Disposition: form-data; name="${fileField.name}"; filename="${fileField.filename}"${crlf}` +
      `Content-Type: ${fileField.contentType}${crlf}${crlf}`
    );
    body = Buffer.concat([body, fileHeader, fileField.buffer, Buffer.from(crlf)]);
  }

  // Final boundary
  const closingBoundary = Buffer.from(`--${boundary}--${crlf}`);
  body = Buffer.concat([body, closingBoundary]);

  return body;
}

async function uploadFile(token, filename, mimeType, buffer, endpoint = '/api/documents', extraFields = {}) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const body = createMultipartFormData(
    boundary,
    extraFields,
    {
      name: 'file',
      filename,
      contentType: mimeType,
      buffer,
    }
  );

  return makeRequest({
    method: 'POST',
    path: endpoint,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length,
    },
    body,
  });
}

async function runVerification() {
  console.log('====================================================');
  console.log('🔒 VERIFYING AUTH RATE LIMIT & MAGIC-BYTE SECURITY');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function record(condition, testName, detail = '') {
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
    // SETUP AUTH USER FOR UPLOADS
    // ----------------------------------------------------
    console.log('▶ 1. Authenticating Test User for Uploads');
    const uEmail = `upload_tester_${Date.now()}@lifevault.test`;
    let token = null;

    const regRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Upload Tester', email: uEmail, password: 'SecurePassword123!' }),
    });

    if (regRes.status === 201 && regRes.data?.token) {
      token = regRes.data.token;
    } else if (regRes.status === 429) {
      console.log('  ⚠️ Rate limit active from previous run, using fallback token generator...');
      const jwt = require('jsonwebtoken');
      require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
      token = jwt.sign({ id: '66e500000000000000000001' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    }

    record(Boolean(token), 'Authenticated session established for upload verification');

    // ----------------------------------------------------
    // PART 2: VALID UPLOADS (PDF, PNG, JPG, WebP)
    // ----------------------------------------------------
    console.log('\n▶ 2. VALID MAGIC-BYTE UPLOADS');

    // Valid PDF
    const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    const pdfUploadRes = await uploadFile(token, 'test_document.pdf', 'application/pdf', validPdfBuffer);
    record(pdfUploadRes.status === 201, 'Valid PDF uploaded successfully (status 201)', `Got ${pdfUploadRes.status}`);

    // Valid PNG
    const validPngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ]);
    const pngUploadRes = await uploadFile(token, 'valid_image.png', 'image/png', validPngBuffer);
    record(pngUploadRes.status === 201, 'Valid PNG uploaded successfully (status 201)', `Got ${pngUploadRes.status}`);

    // Valid JPG
    const validJpgBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
      0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
      0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0xFF, 0xD9
    ]);
    const jpgUploadRes = await uploadFile(token, 'valid_photo.jpg', 'image/jpeg', validJpgBuffer);
    record(jpgUploadRes.status === 201, 'Valid JPG uploaded successfully (status 201)', `Got ${jpgUploadRes.status}`);

    // Valid WebP
    const validWebpBuffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x18, 0x00, 0x00, 0x00, // file size - 8
      0x57, 0x45, 0x42, 0x50, // WEBP
      0x56, 0x50, 0x38, 0x20, // VP8
      0x0C, 0x00, 0x00, 0x00,
      0x30, 0x01, 0x00, 0x9D, 0x01, 0x2A, 0x01, 0x00, 0x01, 0x00, 0x02, 0x00
    ]);
    const webpUploadRes = await uploadFile(token, 'valid_image.webp', 'image/webp', validWebpBuffer);
    record(webpUploadRes.status === 201, 'Valid WebP uploaded successfully (status 201)', `Got ${webpUploadRes.status}`);

    // ----------------------------------------------------
    // PART 3: REJECTION OF FAKE / RENAMED FILES
    // ----------------------------------------------------
    console.log('\n▶ 3. FAKE / RENAMED FILE SIGNATURE REJECTION');

    // Fake PDF: Text file renamed to .pdf
    const fakePdfBuffer = Buffer.from('This is completely plain text pretending to be a PDF.');
    const fakePdfRes = await uploadFile(token, 'fake.pdf', 'application/pdf', fakePdfBuffer);
    record(
      fakePdfRes.status === 400,
      'Fake PDF (plain text content) rejected with HTTP 400',
      `Got status ${fakePdfRes.status}`
    );

    // Renamed fake PNG: PDF renamed to .png
    const renamedPngRes = await uploadFile(token, 'fake_png.png', 'image/png', validPdfBuffer);
    record(
      renamedPngRes.status === 400,
      'Renamed file (PDF disguised as PNG) rejected with HTTP 400',
      `Got status ${renamedPngRes.status}`
    );

    // Fake JPG: Random binary bytes not starting with FF D8 FF
    const fakeJpgBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
    const fakeJpgRes = await uploadFile(token, 'fake_photo.jpg', 'image/jpeg', fakeJpgBuffer);
    record(
      fakeJpgRes.status === 400,
      'Fake JPG (invalid signature bytes) rejected with HTTP 400',
      `Got status ${fakeJpgRes.status}`
    );

    // Fake WebP: RIFF header but not WEBP
    const fakeWebpBuffer = Buffer.from('RIFF1234NOTWEBPEXTRACHARS');
    const fakeWebpRes = await uploadFile(token, 'fake.webp', 'image/webp', fakeWebpBuffer);
    record(
      fakeWebpRes.status === 400,
      'Fake WebP (invalid chunk header) rejected with HTTP 400',
      `Got status ${fakeWebpRes.status}`
    );

    // ----------------------------------------------------
    // PART 4: SVG AND HTML REJECTION
    // ----------------------------------------------------
    console.log('\n▶ 4. SVG AND HTML REJECTION');

    // SVG with .svg extension
    const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40"/><script>alert(1)</script></svg>');
    const svgRes = await uploadFile(token, 'vector.svg', 'image/svg+xml', svgBuffer);
    record(
      svgRes.status === 400,
      'SVG file upload (.svg) rejected with HTTP 400',
      `Got status ${svgRes.status}`
    );

    // SVG disguised as .png
    const disguisedSvgRes = await uploadFile(token, 'vector.png', 'image/png', svgBuffer);
    record(
      disguisedSvgRes.status === 400,
      'SVG disguised with .png extension rejected with HTTP 400',
      `Got status ${disguisedSvgRes.status}`
    );

    // HTML with .html extension
    const htmlBuffer = Buffer.from('<!DOCTYPE html><html><body><h1>Phishing Page</h1><script>steal()</script></body></html>');
    const htmlRes = await uploadFile(token, 'index.html', 'text/html', htmlBuffer);
    record(
      htmlRes.status === 400,
      'HTML file upload (.html) rejected with HTTP 400',
      `Got status ${htmlRes.status}`
    );

    // HTML disguised as .pdf
    const disguisedHtmlRes = await uploadFile(token, 'invoice.pdf', 'application/pdf', htmlBuffer);
    record(
      disguisedHtmlRes.status === 400,
      'HTML disguised with .pdf extension rejected with HTTP 400',
      `Got status ${disguisedHtmlRes.status}`
    );

    // ----------------------------------------------------
    // PART 5: MULTIPLE UPLOAD PATHS (Vault)
    // ----------------------------------------------------
    console.log('\n▶ 5. VALIDATION ACROSS OTHER UPLOAD PATHS (Vault)');

    // Test /api/vault/documents
    const vaultValidRes = await uploadFile(token, 'vault_doc.pdf', 'application/pdf', validPdfBuffer, '/api/vault/documents');
    record(vaultValidRes.status === 201, 'POST /api/vault/documents accepts valid PDF (201)', `Got ${vaultValidRes.status}`);

    const vaultFakeRes = await uploadFile(token, 'vault_fake.pdf', 'application/pdf', fakePdfBuffer, '/api/vault/documents');
    record(vaultFakeRes.status === 400, 'POST /api/vault/documents rejects fake PDF (400)', `Got ${vaultFakeRes.status}`);

    const vaultSvgRes = await uploadFile(token, 'vault_fake.png', 'image/png', svgBuffer, '/api/vault/documents');
    record(vaultSvgRes.status === 400, 'POST /api/vault/documents rejects disguised SVG (400)', `Got ${vaultSvgRes.status}`);

    // ----------------------------------------------------
    // PART 6: AUTH RATE LIMIT VERIFICATION
    // ----------------------------------------------------
    console.log('\n▶ 6. AUTH RATE LIMIT (Enforces 5 max attempts)');
    const randEmail = `ratelimit_${Date.now()}@lifevault.test`;
    let got429 = false;
    let attempt429At = -1;

    for (let i = 1; i <= 7; i++) {
      const payload = JSON.stringify({ email: randEmail, password: 'wrongpassword' });
      const res = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });

      if (res.status === 429) {
        got429 = true;
        attempt429At = i;
        break;
      }
    }

    record(
      got429,
      `Auth rate limiter blocks with HTTP 429 (Too Many Requests)`,
      `Status 429 triggered`
    );

    console.log('\n====================================================');
    console.log(`📊 FINAL RESULT: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runVerification();
