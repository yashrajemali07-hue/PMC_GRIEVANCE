// utils/mailUtils.js - Nodemailer helper with dev mode console logging
const nodemailer = require('nodemailer');

/**
 * Sends a 6-digit verification OTP.
 * If MAIL_USERNAME is not set, prints the OTP directly in the console (dev mode).
 */
const sendOtpEmail = async (toEmail, otp) => {
  const mailUsername = process.env.MAIL_USERNAME;
  const mailPassword = process.env.MAIL_PASSWORD;

  // Dev mode: If MAIL_USERNAME is not configured, print to console
  if (!mailUsername) {
    console.log('====================================================');
    console.log(`[DEV MODE] OTP for ${toEmail}: ${otp}`);
    console.log('====================================================');
    return { sent: true, devMode: true };
  }

  // Production / SMTP mode
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_SERVER || 'smtp.gmail.com',
      port: parseInt(process.env.MAIL_PORT, 10) || 587,
      secure: false,
      auth: {
        user: mailUsername,
        pass: mailPassword,
      },
    });

    const mailOptions = {
      from: process.env.MAIL_FROM || `"PMC Grievance Portal" <${mailUsername}>`,
      to: toEmail,
      subject: 'PMC Grievance Portal - Verification OTP',
      text: `Your email verification OTP for the PMC Citizen Grievance Portal is: ${otp}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0d6efd;">Pune Municipal Corporation</h2>
          <p>Dear Citizen,</p>
          <p>Your one-time email verification code is:</p>
          <div style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #198754; text-align: center; padding: 12px; background: #f0fdf4; border-radius: 6px; margin: 16px 0;">
            ${otp}
          </div>
          <p style="font-size: 13px; color: #64748b;">This OTP expires in 10 minutes. If you did not request this, please ignore this email.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Nodemailer] OTP email sent to ${toEmail}: ${info.messageId}`);
    return { sent: true, devMode: false, messageId: info.messageId };
  } catch (error) {
    console.error(`[Nodemailer Error] Failed to send email to ${toEmail}: ${error.message}`);
    // Print fallback OTP in console so the developer/user is never locked out
    console.log(`[DEV MODE FALLBACK] OTP for ${toEmail}: ${otp}`);
    return { sent: false, devMode: true, error: error.message };
  }
};

module.exports = {
  sendOtpEmail,
};
