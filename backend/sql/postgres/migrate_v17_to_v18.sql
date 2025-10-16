-- Migration v17 to v18: Add email change verification system

-- Create table for email change verification tokens
CREATE TABLE email_change_verifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    new_email TEXT NOT NULL,
    verification_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used BOOLEAN DEFAULT FALSE
);

-- Create index for faster token lookups
CREATE INDEX idx_email_change_tokens_token ON email_change_verifications(verification_token);
CREATE INDEX idx_email_change_tokens_user ON email_change_verifications(user_id);
CREATE INDEX idx_email_change_tokens_expires ON email_change_verifications(expires_at);

-- Add email verification status to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT TRUE;