const assert = require('assert');
const { verifyFileSignature, detectFileSignature, upload, fileFilter } = require('../config/upload');

console.log('Testing upload magic-byte verification...');

// 1. Valid PDF
const validPdf = Buffer.from('%PDF-1.4 header content here');
const pdfRes = verifyFileSignature(validPdf, 'doc.pdf', 'application/pdf');
assert(pdfRes.valid === true, 'Valid PDF passes: ' + JSON.stringify(pdfRes));

// 2. Fake PDF (text file)
const fakePdf = Buffer.from('Just some text in a file');
const fakePdfRes = verifyFileSignature(fakePdf, 'doc.pdf', 'application/pdf');
assert(fakePdfRes.valid === false, 'Fake PDF rejected: ' + JSON.stringify(fakePdfRes));

// 3. Valid PNG
const validPng = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00]);
const pngRes = verifyFileSignature(validPng, 'img.png', 'image/png');
assert(pngRes.valid === true, 'Valid PNG passes: ' + JSON.stringify(pngRes));

// 4. Renamed file (PDF disguised as PNG)
const renamedRes = verifyFileSignature(validPdf, 'img.png', 'image/png');
assert(renamedRes.valid === false, 'Renamed PDF disguised as PNG rejected');

// 5. Valid JPG
const validJpg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
const jpgRes = verifyFileSignature(validJpg, 'pic.jpg', 'image/jpeg');
assert(jpgRes.valid === true, 'Valid JPG passes: ' + JSON.stringify(jpgRes));

// 6. Valid WebP
const validWebp = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20
]);
const webpRes = verifyFileSignature(validWebp, 'pic.webp', 'image/webp');
assert(webpRes.valid === true, 'Valid WebP passes: ' + JSON.stringify(webpRes));

// 7. SVG rejected
const svgBuf = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
assert(verifyFileSignature(svgBuf, 'pic.png', 'image/png').valid === false, 'SVG content rejected even with .png');
assert(verifyFileSignature(svgBuf, 'bad.svg', 'image/svg+xml').valid === false, 'SVG extension rejected');

// 8. HTML rejected
const htmlBuf = Buffer.from('<!DOCTYPE html><html><body>malicious</body></html>');
assert(verifyFileSignature(htmlBuf, 'doc.pdf', 'application/pdf').valid === false, 'HTML disguised as PDF rejected');

// 9. Client MIME mismatch (e.g. declared image/png for doc.pdf)
assert(verifyFileSignature(validPdf, 'doc.pdf', 'image/png').valid === false, 'Declared MIME mismatch rejected');

// 10. Multer fileFilter check
let filterPassed = true;
fileFilter({}, { originalname: 'malicious.svg', mimetype: 'image/svg+xml' }, (err, ok) => {
  if (err || !ok) filterPassed = false;
});
assert(!filterPassed, 'fileFilter rejects .svg');

console.log('✅ ALL 10 SIGNATURE & FILTER UNIT TESTS PASSED!');
