-- Migration: Add pot system support to events
-- This migration removes the fixed entry_fee and enables variable betting

-- Add pot_enabled column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS pot_enabled BOOLEAN DEFAULT true;

-- Add min_bet and max_bet columns for pot system constraints
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS min_bet INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS max_bet INTEGER DEFAULT 1000;

-- Remove the entry_fee column as it's no longer needed
-- This will be handled by the application logic for backward compatibility
-- ALTER TABLE events DROP COLUMN entry_fee;

-- Create index on pot_enabled for better query performance
CREATE INDEX IF NOT EXISTS idx_events_pot_enabled ON events(pot_enabled);

-- Update existing events to enable pot system
UPDATE events SET pot_enabled = true WHERE pot_enabled IS NULL;

-- Add constraint to ensure min_bet <= max_bet
ALTER TABLE events 
ADD CONSTRAINT chk_min_max_bet CHECK (min_bet <= max_bet);

-- Add constraint to ensure min_bet >= 1
ALTER TABLE events 
ADD CONSTRAINT chk_min_bet_positive CHECK (min_bet >= 1);