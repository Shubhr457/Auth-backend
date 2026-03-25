const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Send an email verification link
 */
const sendVerificationEmail = async ({ to, name, token }) => {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"Auth App" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Verify your email address',
    html: `
      <h2>Hi ${name},</h2>
      <p>Please verify your email address by clicking the link below. It expires in <strong>24 hours</strong>.</p>
      <a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:5px;">
        Verify Email
      </a>
      <p>Or copy and paste this URL: ${verifyUrl}</p>
    `,
  });
};

/**
 * Send a password reset link
 */
const sendPasswordResetEmail = async ({ to, name, token }) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"Auth App" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Reset your password',
    html: `
      <h2>Hi ${name},</h2>
      <p>You requested a password reset. Click below — this link expires in <strong>1 hour</strong>.</p>
      <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#ef4444;color:#fff;text-decoration:none;border-radius:5px;">
        Reset Password
      </a>
      <p>If you didn't request this, ignore this email.</p>
      <p>Or copy and paste this URL: ${resetUrl}</p>
    `,
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
