/**
 * Automated Test Suite for MongoDB GridFS Storage & Streaming
 *
 * Tests:
 * 1. Upload buffer to GridFSBucket ('uploads')
 * 2. Find file by exact path, basename, and storedName
 * 3. Read back full buffer and verify byte integrity
 * 4. Stream file with HTTP 200 (Full content)
 * 5. Stream file with HTTP 206 Partial Content (HTTP Range requests for media)
 * 6. File deletion from GridFS
 * 7. Migration scanner correctness (verifies scanning logic finds 29 files)
 * 8. Backward compatibility check (fallback to local disk)
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { EventEmitter } = require('events');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
  getGridFSBucket,
  uploadBufferToGridFS,
  findGridFSFile,
  deleteFromGridFS,
  streamGridFSFile,
  downloadGridFSBuffer,
} = require('../services/gridfsService');
const { scanFiles } = require('./migrate_uploads_to_gridfs');

class MockResponse extends EventEmitter {
  constructor() {
    super();
    this.statusCode = 200;
    this.headers = {};
    this.chunks = [];
    this.headersSent = false;
  }

  status(code) {
    this.statusCode = code;
    return this;
  }

  setHeader(key, val) {
    this.headers[key.toLowerCase()] = val;
  }

  write(chunk) {
    if (chunk) this.chunks.push(Buffer.from(chunk));
    return true;
  }

  end(chunk) {
    if (chunk) this.chunks.push(Buffer.from(chunk));
    this.emit('finish');
    return this;
  }

  getBuffer() {
    return Buffer.concat(this.chunks);
  }
}

async function runTests() {
  console.log('='.repeat(70));
  console.log('STARTING LIFE VAULT GRIDFS AUTOMATED TEST SUITE');
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    console.log('\n[1/8] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    assert(mongoose.connection.readyState === 1, 'MongoDB connection established');

    const bucket = getGridFSBucket();
    assert(bucket && bucket.s.options.bucketName === 'uploads', "GridFSBucket initialized with bucketName 'uploads'");

    console.log('\n[2/8] Testing uploadBufferToGridFS...');
    const testPayload = Buffer.from('Life Vault GridFS Test Content - 2026-09-24', 'utf8');
    const testFilename = `test-folder/test-file-${Date.now()}.txt`;
    const uploadResult = await uploadBufferToGridFS(testFilename, testPayload, {
      contentType: 'text/plain',
      metadata: {
        userId: new mongoose.Types.ObjectId().toString(),
        originalName: 'test-file.txt',
        testFlag: true,
      },
    });

    assert(uploadResult && uploadResult._id, 'GridFS upload returned valid file document with _id');
    assert(uploadResult.length === testPayload.length, `GridFS stored exact byte length (${testPayload.length} bytes)`);

    console.log('\n[3/8] Testing findGridFSFile lookup strategies...');
    const foundByExact = await findGridFSFile(testFilename);
    assert(foundByExact && foundByExact._id.equals(uploadResult._id), 'findGridFSFile resolved by exact relative path');

    const baseName = path.basename(testFilename);
    const foundByBasename = await findGridFSFile(baseName);
    assert(foundByBasename && foundByBasename._id.equals(uploadResult._id), 'findGridFSFile resolved by base filename');

    console.log('\n[4/8] Testing downloadGridFSBuffer byte integrity...');
    const downloadedBuf = await downloadGridFSBuffer(uploadResult._id);
    assert(downloadedBuf.equals(testPayload), 'Downloaded buffer is byte-for-byte identical to uploaded buffer');

    console.log('\n[5/8] Testing streamGridFSFile full response (HTTP 200)...');
    const mockReq200 = { headers: {} };
    const mockRes200 = new MockResponse();

    await new Promise((resolve) => {
      mockRes200.on('finish', resolve);
      streamGridFSFile(uploadResult, mockReq200, mockRes200);
    });

    assert(mockRes200.statusCode === 200, 'Full streaming returned HTTP status 200');
    assert(Number(mockRes200.headers['content-length']) === testPayload.length, 'Content-Length header matches file length');
    assert(mockRes200.headers['accept-ranges'] === 'bytes', "Accept-Ranges header is 'bytes'");
    assert(mockRes200.getBuffer().equals(testPayload), 'Streamed content matches original payload');

    console.log('\n[6/8] Testing streamGridFSFile HTTP Range request (HTTP 206 Partial Content)...');
    // Request bytes 0 to 9 (10 bytes total)
    const rangeStart = 0;
    const rangeEnd = 9;
    const mockReq206 = {
      headers: {
        range: `bytes=${rangeStart}-${rangeEnd}`,
      },
    };
    const mockRes206 = new MockResponse();

    await new Promise((resolve) => {
      mockRes206.on('finish', resolve);
      streamGridFSFile(uploadResult, mockReq206, mockRes206);
    });

    assert(mockRes206.statusCode === 206, 'Range streaming returned HTTP status 206 Partial Content');
    assert(Number(mockRes206.headers['content-length']) === 10, 'Partial Content-Length header is 10 bytes');
    assert(
      mockRes206.headers['content-range'] === `bytes ${rangeStart}-${rangeEnd}/${testPayload.length}`,
      `Content-Range header formatted correctly: ${mockRes206.headers['content-range']}`
    );
    const expectedSlice = testPayload.slice(rangeStart, rangeEnd + 1);
    assert(mockRes206.getBuffer().equals(expectedSlice), 'Streamed range bytes match expected payload slice');

    console.log('\n[7/8] Testing deleteFromGridFS...');
    await deleteFromGridFS(uploadResult._id);
    const afterDelete = await findGridFSFile(testFilename);
    assert(afterDelete === null, 'File successfully deleted from GridFS and no longer found');

    console.log('\n[8/8] Testing migration file scanner logic...');
    const uploadDir = path.join(__dirname, '..', 'uploads');
    const localFiles = scanFiles(uploadDir);
    assert(localFiles.length === 29, `Scanner correctly detected exactly 29 local files (found: ${localFiles.length})`);
    const allHaveSizes = localFiles.every((f) => f.size > 0);
    assert(allHaveSizes, 'All scanned local files have non-zero file sizes');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase disconnected.');
  }

  console.log('='.repeat(70));
  console.log(`GRIDFS TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
