// utils/mailUtils.js - Professional Nodemailer Email Service for PMC Portal
const nodemailer = require('nodemailer');

let cachedTransporter = null;

/**
 * Creates or retrieves the active Nodemailer transporter.
 * If MAIL_USERNAME and MAIL_PASSWORD are set, connects to real SMTP (e.g. Gmail).
 * Otherwise, falls back to an Ethereal SMTP test inbox with real preview delivery.
 */
const getTransporter = async () => {
  if (cachedTransporter) return cachedTransporter;

  const mailUser = (process.env.MAIL_USERNAME || '').trim();
  const mailPass = (process.env.MAIL_PASSWORD || '').trim();

  // 1. Production / Configured SMTP
  if (mailUser && mailPass) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.MAIL_SERVER || 'smtp.gmail.com',
      port: parseInt(process.env.MAIL_PORT, 10) || 587,
      secure: process.env.MAIL_PORT == 465,
      auth: {
        user: mailUser,
        pass: mailPass,
      },
    });
    return cachedTransporter;
  }

  // 2. Automated Ethereal test inbox fallback
  try {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`[Email Service] Automated test SMTP initialized (${testAccount.user})`);
    return cachedTransporter;
  } catch (err) {
    console.warn(`[Email Service Warning] Test account creation skipped: ${err.message}`);
    return null;
  }
};

/**
 * Dispatches a 6-digit verification OTP email with the official PMC template.
 */
const sendOtpEmail = async (toEmail, otp) => {
  const mailOptions = {
    from: process.env.MAIL_FROM || `"Pune Municipal Corporation" <noreply@punecorporation.org>`,
    to: toEmail,
    subject: 'पुणे महानगरपालिका - Email Verification OTP Code',
    text: `Your Pune Municipal Corporation Citizen Grievance Portal verification OTP is: ${otp}. This code expires in 10 minutes. Do not share this code with anyone.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #084298 0%, #0d6efd 60%, #198754 100%); padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">पुणे महानगरपालिका</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 6px 0 0; font-size: 13px; letter-spacing: 0.5px;">Pune Municipal Corporation Citizen Grievance Redressal Portal</p>
        </div>
        
        <div style="padding: 28px 24px;">
          <p style="font-size: 15px; color: #1e293b; margin: 0 0 16px;">Dear Citizen,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px;">
            Thank you for registering on the PMC Citizen Portal. To verify your email address and activate your citizen account, please enter the one-time verification code below:
          </p>
          
          <div style="background: #f8fafc; border: 2px dashed #0d6efd; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
            <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; font-weight: 600; display: block; margin-bottom: 6px;">Your 6-Digit Verification Code</span>
            <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0d6efd; display: inline-block;">${otp}</span>
          </div>

          <p style="font-size: 12px; color: #64748b; margin: 16px 0 0; text-align: center;">
            ⏱️ This code will expire in <strong>10 minutes</strong>. For security, never share this code with anyone.
          </p>
        </div>

        <div style="background: #f1f5f9; padding: 16px 24px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
          <p style="margin: 0 0 4px;">Pune Municipal Corporation Main Building, Shivajinagar, Pune - 411005</p>
          <p style="margin: 0;">24x7 Citizen Grievance Helpline: <strong>1800-1030-222</strong></p>
        </div>
      </div>
    `,
  };

  try {
    const transporter = await getTransporter();
    if (!transporter) {
      console.log(`[PMC Portal Email] Verification OTP for ${toEmail}: ${otp}`);
      return { sent: true };
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] OTP successfully dispatched to ${toEmail} (MessageId: ${info.messageId})`);

    const testUrl = nodemailer.getTestMessageUrl(info);
    if (testUrl) {
      console.log(`[Email Service Preview URL] View delivered email: ${testUrl}`);
      return { sent: true, previewUrl: testUrl };
    }

    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email Service Error] Failed to send email to ${toEmail}: ${error.message}`);
    console.log(`[PMC Portal Backup] OTP for ${toEmail}: ${otp}`);
    return { sent: false, error: error.message };
  }
};

module.exports = {
  sendOtpEmail,
};
