-- Add last_claimed and last_login_date columns to users table for tracking free points claims and user activity
ALTER TABLE users ADD COLUMN last_claimed TEXT;
ALTER TABLE users ADD COLUMN last_login_date TEXT;