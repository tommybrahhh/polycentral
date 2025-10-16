// Email utility functions for sending verification emails
const crypto = require('crypto');

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

// Simple email sending function (placeholder - integrate with your email service)
async function sendVerificationEmail(email, token) {
  // This is a placeholder implementation
  // In production, integrate with a real email service like:
  // - Nodemailer with SMTP
  // - SendGrid API
  // - AWS SES
  // - Mailgun
  
  const verificationLink = `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
  
  console.log('=== EMAIL VERIFICATION (DEV MODE) ===');
  console.log(`To: ${email}`);
  console.log(`Subject: Verify your email address`);
  console.log(`Verification Link: ${verificationLink}`);
  console.log('=====================================');
  
  // For development, we'll just log the email
  // In production, you would use:
  /*
  const transporter = nodemailer.createTransport({
    // your email service configuration
  });
  
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Verify your email address',
    html: `Click <a href="${verificationLink}">here</a> to verify your email address.`
  });
  */
  
  return true;
}

module.exports = {
  generateVerificationToken,
  getExpirationTime,
  sendVerificationEmail
};