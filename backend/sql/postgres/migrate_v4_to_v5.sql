-- Add performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participants_event_user
ON participants(event_id, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_wallet
ON users(wallet_address);