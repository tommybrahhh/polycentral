// Email utility functions for sending verification emails
const crypto = require('crypto');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Set' : 'Not Set');
const emailFrom = process.env.EMAIL_FROM;

// Generate a secure random token for email verification
function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Calculate expiration time (1 hour from now)
function getExpirationTime() {
  const now = new Date();
  now.setHours(now.getHours() + 1); // Token expires in 1 hour
  return now;
}

// Function to send verification email using Resend
async function sendVerificationEmail(email, token) {
  const verificationLink = `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
  
  try {
    await resend.emails.send({
      from: emailFrom,
      to: email,
      subject: 'Verify your email address',
      html: `<p>Click <a href="${verificationLink}">here</a> to verify your email address. This link expires in 1 hour.</p>`
    });
    console.log(`Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`Failed to send verification email to ${email}:`, error);
    return false;
  }
}

// Function to send password reset email using Resend
async function sendPasswordResetEmail(email, resetLink) {
  try {
    await resend.emails.send({
      from: emailFrom,
      to: email,
      subject: 'Password Reset Request',
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 1 hour.</p>`
    });
    console.log(`Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`Failed to send password reset email to ${email}:`, error);
    return false;
  }
}

module.exports = {
  generateVerificationToken,
  getExpirationTime,
  sendVerificationEmail,
  sendPasswordResetEmail
};