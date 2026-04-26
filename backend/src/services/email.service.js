const nodemailer = require('nodemailer');

// Build transporter (supports Gmail App Password or any SMTP)
const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.warn('[Email] SMTP credentials not configured. Set SMTP_USER and SMTP_PASS in .env');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });
};

/**
 * Build a branded ScrimX HTML email template
 */
const buildHtml = ({ subject, tournamentName, groupName, body, footer }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111118;border-radius:16px;border:1px solid #1e2030;overflow:hidden;max-width:600px;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0d9488,#6366f1);padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;">
                    ⚡ ScrimX
                  </div>
                  <div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:2px;letter-spacing:1px;text-transform:uppercase;">
                    ${tournamentName || 'Tournament Notification'}
                  </div>
                </td>
                <td align="right">
                  <div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:6px 12px;display:inline-block;">
                    <span style="color:#00d9ff;font-size:11px;font-weight:700;letter-spacing:1px;">${groupName || ''}</span>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Subject bar -->
        <tr>
          <td style="background:#15151f;border-bottom:1px solid #1e2030;padding:16px 32px;">
            <div style="color:#00d9ff;font-size:16px;font-weight:700;">${subject}</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">
            <div style="color:#c8c8d8;font-size:14px;line-height:1.8;white-space:pre-wrap;">${body}</div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0d0d14;border-top:1px solid #1e2030;padding:20px 32px;">
            <div style="color:#4a4a6a;font-size:11px;line-height:1.6;">
              ${footer || 'This is an automated notification from your tournament organizer via ScrimX.'}
              <br/>Do not reply to this email.
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

/**
 * Send email notification to a list of recipients
 * @param {Object} opts
 * @param {string[]} opts.to - array of email addresses
 * @param {string} opts.subject
 * @param {string} opts.body - plain text body (shown in HTML template)
 * @param {string} [opts.tournamentName]
 * @param {string} [opts.groupName]
 * @param {string} [opts.footer]
 * @param {Array}  [opts.attachments] - multer file objects [{originalname, mimetype, buffer}]
 * @returns {Promise<{sent: number, failed: number, errors: string[]}>}
 */
const sendGroupNotification = async ({ to, subject, body, tournamentName, groupName, footer, attachments = [] }) => {
  const transporter = createTransporter();
  if (!transporter) {
    throw new Error('Email service not configured. Add SMTP_USER and SMTP_PASS to backend .env');
  }

  const html = buildHtml({ subject, tournamentName, groupName, body, footer });
  const fromName = process.env.EMAIL_FROM_NAME || 'ScrimX Tournament';
  const fromAddr = process.env.SMTP_USER || process.env.EMAIL_USER;

  // Build nodemailer attachment objects from multer buffers
  const mailAttachments = attachments
    .filter(f => f && f.buffer)
    .map(f => ({
      filename: f.originalname,
      content: f.buffer,
      contentType: f.mimetype
    }));

  let sent = 0, failed = 0;
  const errors = [];

  // Send in batches of 50 via BCC
  const batchSize = 50;
  for (let i = 0; i < to.length; i += batchSize) {
    const chunk = to.slice(i, i + batchSize);
    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromAddr}>`,
        bcc: chunk.join(','),
        subject,
        text: body,
        html,
        attachments: mailAttachments
      });
      sent += chunk.length;
    } catch (err) {
      failed += chunk.length;
      errors.push(err.message);
    }
  }

  return { sent, failed, errors };
};

module.exports = { sendGroupNotification };
