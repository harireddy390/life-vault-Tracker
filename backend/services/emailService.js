const https = require('https');

/**
 * LifeVault Email Service
 * Sends transactional email via Brevo HTTPS API (production) or logs to
 * console (development fallback).
 *
 * Why HTTPS API instead of SMTP:
 *   Render Free tier blocks outbound TCP on port 25/465/587, which causes
 *   SMTP connections to time out.  Brevo's REST API runs over HTTPS (port 443)
 *   which is always open on Render.
 *
 * Required environment variables (set in Render dashboard):
 *   BREVO_API_KEY  - Brevo API key (Transactional → API Keys in Brevo dashboard)
 *   MAIL_FROM      - Verified sender, e.g. "LifeVault <noreply@yourdomain.com>"
 *   CLIENT_URL     - Frontend origin(s), comma-separated
 *
 * Optional / legacy (kept for local SMTP testing only, not used in production):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return the first entry of CLIENT_URL (used to build password-reset links).
 */
const getClientUrl = () => {
  if (process.env.CLIENT_URL) {
    return process.env.CLIENT_URL.split(',')[0].trim().replace(/\/$/, '');
  }
  return 'http://localhost:5173';
};

/**
 * Parse a "Name <email@domain.com>" string into { name, email }.
 * Falls back gracefully if the format is just a plain email address.
 */
const parseSender = (mailFrom) => {
  if (!mailFrom) {
    return { name: 'LifeVault', email: 'no-reply@lifevault.app' };
  }
  // Match: Any Name <email@domain.com>
  const match = mailFrom.match(/^(.+?)\s*<([^>]+)>\s*$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  // Plain email with no display name
  return { name: 'LifeVault', email: mailFrom.trim() };
};

/**
 * Tiny wrapper around Node's built-in https.request that returns a Promise
 * resolving to { statusCode, body }.  No external dependencies needed.
 */
const httpsPost = (url, headers, body) =>
  new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const parsed = new URL(url);

    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });

// ---------------------------------------------------------------------------
// Key sanitization and diagnostics (SAFE - NEVER logs full key or secret)
// ---------------------------------------------------------------------------

/**
 * Cleanly extract the Brevo API key from environment, stripping any accidental
 * surrounding quotes (single or double) and leading/trailing whitespace.
 */
const getBrevoApiKey = () => {
  const raw = process.env.BREVO_API_KEY;
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().replace(/^["']|["']$/g, '');
};

/**
 * Return a safe diagnostic summary of BREVO_API_KEY without exposing the key.
 */
const getBrevoKeyDiagnostic = () => {
  const raw = process.env.BREVO_API_KEY;
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return { configured: false, prefix: 'missing', length: 0 };
  }
  const cleaned = getBrevoApiKey();
  let prefix = 'other';
  if (cleaned.startsWith('xkeysib-')) {
    prefix = 'xkeysib- (valid API key prefix)';
  } else if (cleaned.startsWith('xsmtpsib-')) {
    prefix = 'xsmtpsib- (WARNING: This is an SMTP key from the SMTP tab, not an API v3 key!)';
  } else {
    prefix = `${cleaned.substring(0, Math.min(8, cleaned.length))}...`;
  }

  const trimmed = raw.trim();
  const hasQuotes =
    trimmed.startsWith('"') ||
    trimmed.startsWith("'") ||
    trimmed.endsWith('"') ||
    trimmed.endsWith("'");

  return {
    configured: true,
    prefix,
    length: cleaned.length,
    hasQuotes,
    hasWhitespace: raw !== trimmed,
  };
};

// ---------------------------------------------------------------------------
// Startup checks
// ---------------------------------------------------------------------------

const isBrevoConfigured = () => Boolean(getBrevoApiKey());

// Legacy SMTP check — kept so any existing import/test that references
// isSmtpConfigured continues to work without modification.
const isSmtpConfigured = () =>
  Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD
  );

// Startup diagnostic check (SAFE — no secrets logged)
if (process.env.NODE_ENV === 'production') {
  const diag = getBrevoKeyDiagnostic();
  console.log('[EMAIL SERVICE] Brevo configuration status:', JSON.stringify(diag));
  if (!diag.configured) {
    console.error(
      '[EMAIL SERVICE] CRITICAL: BREVO_API_KEY is not set. ' +
      'Password-reset emails cannot be delivered in production. ' +
      'Add BREVO_API_KEY in the Render dashboard and redeploy.'
    );
  } else if (diag.prefix.startsWith('xsmtpsib-')) {
    console.error(
      '[EMAIL SERVICE] CONFIGURATION WARNING: BREVO_API_KEY starts with "xsmtpsib-". ' +
      'This is an SMTP key from Brevo > SMTP & API > SMTP tab. ' +
      'The Brevo HTTPS API requires a v3 API key starting with "xkeysib-" from Brevo > SMTP & API > API Keys tab.'
    );
  }
}

// ---------------------------------------------------------------------------
// Email HTML template (design unchanged from previous version)
// ---------------------------------------------------------------------------
const buildHtmlContent = (userName, rawToken, resetUrl) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - LifeVault</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 560px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 36px 32px; }
    .brand { display: flex; align-items: center; gap: 8px; font-size: 20px; font-weight: 700; color: #f8fafc; margin-bottom: 24px; }
    .brand-accent { color: #f59e0b; }
    h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 16px; }
    p { font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-bottom: 20px; }
    .code-box { margin: 24px 0; background: #0f172a; border: 2px dashed #f59e0b; border-radius: 10px; padding: 18px 24px; text-align: center; }
    .code-number { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #f59e0b; font-family: 'Courier New', monospace; }
    .code-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-top: 6px; }
    .btn-container { margin: 24px 0 16px; text-align: center; }
    .btn { display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #0f172a; font-weight: 700; font-size: 14px; padding: 10px 24px; border-radius: 8px; text-decoration: none; }
    .alt-link { word-break: break-all; font-size: 12px; color: #94a3b8; background-color: #0f172a; padding: 10px; border-radius: 6px; border: 1px solid #334155; }
    .notice { font-size: 13px; color: #94a3b8; border-top: 1px solid #334155; padding-top: 20px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">
      <span>🛡\uFE0F</span>
      <span>Life<span class="brand-accent">Vault</span></span>
    </div>
    <h1>Password Reset Verification</h1>
    <p>Hello ${userName || 'there'},</p>
    <p>We received a request to reset your password for your LifeVault account. Use the 6-digit verification code below to change your password:</p>

    <div class="code-box">
      <div class="code-number">${rawToken}</div>
      <div class="code-label">Verification Code (Expires in 15 mins)</div>
    </div>

    <div class="btn-container">
      <a href="${resetUrl}" class="btn" target="_blank">Reset Password Directly</a>
    </div>

    <p style="font-size: 12px; color: #94a3b8; margin-bottom: 6px;">Or paste this link into your browser:</p>
    <div class="alt-link">${resetUrl}</div>
    <div class="notice">
      <p style="margin-bottom: 0;">If you did not request this password reset, please ignore this email. Your account remains safe and your current password has not changed.</p>
    </div>
  </div>
</body>
</html>`;

// ---------------------------------------------------------------------------
// Main send function
// ---------------------------------------------------------------------------

/**
 * Send a password-reset OTP email.
 *
 * Accepts either positional args (toEmail, rawToken, userName) or a single
 * options object { to, code, name } — matching authRoute.js call signature.
 *
 * @returns {Promise<{ success: boolean, delivered: boolean, message?: string }>}
 */
const sendPasswordResetEmail = async (toOrOptions, rawTokenParam, userNameParam) => {
  // ── Resolve arguments ──────────────────────────────────────────────────────
  let toEmail = toOrOptions;
  let rawToken = rawTokenParam;
  let userName = userNameParam || 'there';

  if (typeof toOrOptions === 'object' && toOrOptions !== null) {
    toEmail = toOrOptions.to || toOrOptions.email;
    rawToken = toOrOptions.code || toOrOptions.token || toOrOptions.rawToken;
    userName = toOrOptions.name || toOrOptions.userName || 'there';
  }

  // ── Build email content ────────────────────────────────────────────────────
  const clientUrl   = getClientUrl();
  const resetUrl    = `${clientUrl}/reset-password?code=${rawToken}&email=${encodeURIComponent(toEmail)}`;
  const subject     = `LifeVault - Your Password Reset Code: ${rawToken}`;
  const htmlContent = buildHtmlContent(userName, rawToken, resetUrl);

  // ── Production path: Brevo HTTPS Transactional Email API ──────────────────
  if (isBrevoConfigured()) {
    const sender = parseSender(process.env.MAIL_FROM);

    const requestBody = {
      sender,
      to: [{ email: toEmail }],
      subject,
      htmlContent,
    };

    try {
      const apiKey = getBrevoApiKey();
      const response = await httpsPost(
        'https://api.brevo.com/v3/smtp/email',
        {
          'Accept': 'application/json',
          'api-key': apiKey,
        },
        requestBody
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        console.log(
          `[EMAIL] Password-reset email dispatched via Brevo API to ${toEmail} ` +
          `(HTTP ${response.statusCode})`
        );
        return { success: true, delivered: true };
      }

      // Non-2xx: log status code and safe error message from Brevo (without secrets)
      let detail = '';
      try {
        const bodyObj = JSON.parse(response.body);
        if (bodyObj && bodyObj.message) {
          detail = `: ${bodyObj.message}`;
        } else if (bodyObj && bodyObj.code) {
          detail = `: ${bodyObj.code}`;
        }
      } catch (_) {
        if (response.body) {
          detail = `: ${response.body.slice(0, 120).trim()}`;
        }
      }

      console.error(
        `[EMAIL ERROR] Brevo API returned HTTP ${response.statusCode}${detail} for ${toEmail}`
      );
      return {
        success: false,
        delivered: false,
        message: 'Email delivery failed. Please try again later.',
      };

    } catch (err) {
      // Network-level error (DNS failure, connection refused, etc.)
      console.error('[EMAIL ERROR] Brevo API request failed:', err.message);
      return {
        success: false,
        delivered: false,
        message: 'Email service temporarily unavailable.',
      };
    }
  }

  // ── Development fallback: BREVO_API_KEY not set locally ───────────────────
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n============================================================');
    console.log(`🔑 [LIFE VAULT DEV] PASSWORD RESET CODE FOR: ${toEmail}`);
    console.log(`👉 VERIFICATION CODE: ${rawToken}`);
    console.log(`🔗 DIRECT RESET LINK: ${resetUrl}`);
    console.log('============================================================\n');

    return {
      success: true,
      delivered: false,
      code: rawToken,
      resetUrl,
      message: 'BREVO_API_KEY not set in local environment. OTP logged to console for testing.',
    };
  }

  // ── Production with no API key: throw so authRoute.js catch block logs it ─
  // The raw OTP token is intentionally excluded from the error message.
  throw new Error(
    'BREVO_API_KEY is not configured. Password-reset email could not be delivered. ' +
    'Add BREVO_API_KEY to the Render environment variables and redeploy.'
  );
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  sendPasswordResetEmail,
  isSmtpConfigured,   // kept for backward-compatibility
  isBrevoConfigured,
  getBrevoApiKey,
  getBrevoKeyDiagnostic,
  getClientUrl,
};


