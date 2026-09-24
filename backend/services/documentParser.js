const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const MAX_EXTRACTED_CHARS = 12000;

/**
 * Extracts clean readable text from a file stored on disk or in-memory Buffer.
 * Supports PDF, DOCX, TXT, CSV, JSON, MD.
 * Returns { success, text, summary, charCount, truncated }
 */
async function extractDocumentContent(filePathOrBuffer, originalName, mimeType) {
  const ext = path.extname(originalName).toLowerCase();

  try {
    let rawText = '';
    const isBuffer = Buffer.isBuffer(filePathOrBuffer);

    if (ext === '.pdf' || mimeType === 'application/pdf') {
      const dataBuffer = isBuffer ? filePathOrBuffer : fs.readFileSync(filePathOrBuffer);
      const parsed = await pdfParse(dataBuffer);
      rawText = parsed.text || '';
    } else if (
      ext === '.docx' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = isBuffer
        ? await mammoth.extractRawText({ buffer: filePathOrBuffer })
        : await mammoth.extractRawText({ path: filePathOrBuffer });
      rawText = result.value || '';
    } else if (
      ext === '.txt' ||
      ext === '.csv' ||
      ext === '.json' ||
      ext === '.md' ||
      mimeType.startsWith('text/') ||
      mimeType === 'application/json'
    ) {
      rawText = isBuffer ? filePathOrBuffer.toString('utf-8') : fs.readFileSync(filePathOrBuffer, 'utf-8');
    } else {
      return {
        success: false,
        error: `Unsupported document format (${ext}). Supported: PDF, DOCX, TXT, CSV, JSON, MD.`,
      };
    }

    // Clean whitespace
    const cleanText = rawText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    const totalChars = cleanText.length;

    if (!cleanText) {
      return {
        success: true,
        text: '[Document appears empty or contains scanned images without text]',
        charCount: 0,
        truncated: false,
      };
    }

    let boundedText = cleanText;
    let truncated = false;

    if (totalChars > MAX_EXTRACTED_CHARS) {
      truncated = true;
      const head = cleanText.slice(0, 9000);
      const tail = cleanText.slice(-2500);
      boundedText = `${head}\n\n[... Document truncated for AI context: ${totalChars} total characters. Showing head and tail sections ...]\n\n${tail}`;
    }

    return {
      success: true,
      text: boundedText,
      charCount: totalChars,
      truncated,
    };
  } catch (err) {
    console.error(`[documentParser] Error extracting from ${originalName}:`, err.message);
    return {
      success: false,
      error: `Could not parse document: ${err.message}`,
    };
  }
}

/**
 * Checks if a mime type / extension is an allowed image
 */
function isImageFile(mimeType, originalName) {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(originalName).toLowerCase();
  return allowedMimes.includes(mimeType) || allowedExts.includes(ext);
}

/**
 * Reads an image file into base64 string
 */
function readImageBase64(filePathOrBuffer) {
  if (Buffer.isBuffer(filePathOrBuffer)) {
    return filePathOrBuffer.toString('base64');
  }
  const buffer = fs.readFileSync(filePathOrBuffer);
  return buffer.toString('base64');
}

module.exports = {
  extractDocumentContent,
  isImageFile,
  readImageBase64,
};
