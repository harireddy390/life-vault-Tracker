const nodemailer = require('nodemailer');

/**
 * LifeVault Email Service
 * Handles transactional email delivery using SMTP (Brevo recommended) with a
 * secure development fallback that logs the OTP code to the server console.
 *
 * Required environment variables (set in Render dashboard for production):
 *   SMTP_HOST     - e.g. smtp-relay.brevo.com
 *   SMTP_PORT     - e.g. 587
 *   SMTP_USER     - your Brevo login email
 *   SMTP_PASSWORD - your Brevo SMTP key (not account password)
 *   MAIL_FROM     - e.g. "LifeVault <noreply@yourdomain.com>"
 */

// Determine client URL for password reset links
const getClientUrl = () => {
  if (process.env.CLIENT_URL) {
    // If comma-separated list of origins, use the first one
    return process.env.CLIENT_URL.split(',')[0].trim().replace(/\/$/, '');
  }
  return 'http://localhost:5173';
};

// Check if production-ready SMTP credentials are provided
const isSmtpConfigured = () => {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD
  );
};

// Warn at module load time if running in production without SMTP configured.
// This makes the misconfiguration immediately visible in Render logs on startup.
if (process.env.NODE_ENV === 'production' && !isSmtpConfigured()) {
  console.error(
    '[EMAIL SERVICE] CRITICAL: SMTP is not configured (SMTP_HOST / SMTP_USER / SMTP_PASSWORD ' +
    'are missing). Password reset emails cannot be delivered. ' +
    'Add these environment variables in the Render dashboard and redeploy.'
  );
}

// Create transport dynamically based on current configuration
const createTransport = () => {
  if (isSmtpConfigured()) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return null;
};

/**
 * Send password reset email
 * @param {string} toEmail - Recipient email address
 * @param {string} rawToken - Raw unhashed password reset token
 * @param {string} [userName] - Recipient name
 * @returns {Promise<{ success: boolean, delivered: boolean, message?: string }>}
 */
const sendPasswordResetEmail = async (toOrOptions, rawTokenParam, userNameParam) => {
  let toEmail = toOrOptions;
  let rawToken = rawTokenParam;
  let userName = userNameParam || 'there';

  if (typeof toOrOptions === 'object' && toOrOptions !== null) {
    toEmail = toOrOptions.to || toOrOptions.email;
    rawToken = toOrOptions.code || toOrOptions.token || toOrOptions.rawToken;
    userName = toOrOptions.name || toOrOptions.userName || 'there';
  }

  const clientUrl = getClientUrl();
  const resetUrl = `${clientUrl}/reset-password?code=${rawToken}&email=${encodeURIComponent(toEmail)}`;
  const fromAddress = process.env.MAIL_FROM || 'LifeVault Security <no-reply@lifevault.app>';

  const subject = `LifeVault - Your Password Reset Code: ${rawToken}`;
  
  const textContent = `Hello ${userName},

We received a request to reset your password for your LifeVault account.

Your 6-digit verification code is:
${rawToken}

You can also use this link to reset your password directly:
${resetUrl}

This code is valid for 15 minutes. If you did not request a password reset, you can safely ignore this email — your account remains secure.

Best regards,
The LifeVault Team`;

  const htmlContent = `<!DOCTYPE html>
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
      <span>🛡️</span>
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

  const transport = createTransport();

  if (transport) {
    try {
      await transport.sendMail({
        from: fromAddress,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });
      return { success: true, delivered: true, code: rawToken, resetUrl };
    } catch (error) {
      console.error('[EMAIL ERROR] Failed to send email via SMTP:', error.message);
      return { success: false, delivered: false, message: error.message, code: rawToken, resetUrl };
    }
  }

  // Development / fallback mode: SMTP credentials are not configured
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
      message: 'SMTP not configured in local environment. Token logged for local testing.',
    };
  }

  // Production with missing SMTP configuration: throw so authRoute.js catch block logs it.
  // The raw token is never included in the error message to avoid accidental leakage.
  throw new Error(
    'SMTP credentials are not configured. Password reset email could not be delivered. ' +
    'Add SMTP_HOST, SMTP_USER, and SMTP_PASSWORD to the Render environment variables.'
  );
};

module.exports = {
  sendPasswordResetEmail,
  isSmtpConfigured,
  getClientUrl,
};
