const nodemailer = require('nodemailer');

// Create a reusable transporter object using SMTP
const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  // Hardcoded safe defaults (can be overridden by env vars)
  const user = process.env.SMTP_USER || 'techcfa.resolve360@gmail.com';
  const pass = process.env.SMTP_PASS || 'pxtuqqhvcpnjouir';

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: { user, pass }
  });

  return transporter;
};

const transporter = createTransporter();

/**
 * Send an email with the given subject and HTML body
 * Returns { success: boolean, messageId?: string, error?: string }
 */
const sendEmail = async ({ to, subject, html }) => {
  try {
    if (!transporter) {
      console.warn('Email transporter not configured. Skipping send in development.');
      return { success: true, messageId: 'dev-skip' };
    }

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'CFA App <techcfa.resolve360@gmail.com>',
      to,
      subject,
      html
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail };

