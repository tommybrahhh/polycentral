# Database Migration Plan

## Migration Strategy
1. Rename `tournaments` to `events`
2. Change `participants.tournament_id` → `event_id`
3. Add new cryptocurrency fields to `events`
4. Drop old `events` table

## PostgreSQL Migration Script
```sql
BEGIN;

-- Rename tournaments to events
ALTER TABLE tournaments RENAME TO events;

-- Change participants reference
ALTER TABLE participants RENAME COLUMN tournament_id TO event_id;
ALTER TABLE participants ADD CONSTRAINT fk_event_id FOREIGN KEY (event_id) REFERENCES events(id);

-- Add new fields to events
ALTER TABLE events 
    ADD COLUMN cryptocurrency TEXT DEFAULT 'bitcoin',
    ADD COLUMN initial_price DECIMAL,
    ADD COLUMN final_price DECIMAL,
    ADD COLUMN resolution_status TEXT CHECK (resolution_status IN ('pending', 'resolved')),
    ADD COLUMN prediction_window INTERVAL DEFAULT '24 hours';

-- Drop old events table
DROP TABLE events_old;

COMMIT;
```

## SQLite Migration Script
```sql
BEGIN;

-- Rename tournaments to events
ALTER TABLE tournaments RENAME TO events;

-- Change participants reference
ALTER TABLE participants RENAME COLUMN tournament_id TO event_id;

-- SQLite doesn't support adding multiple columns in one statement
ALTER TABLE events ADD COLUMN cryptocurrency TEXT DEFAULT 'bitcoin';
ALTER TABLE events ADD COLUMN initial_price DECIMAL;
ALTER TABLE events ADD COLUMN final_price DECIMAL;
ALTER TABLE events ADD COLUMN resolution_status TEXT;
ALTER TABLE events ADD COLUMN prediction_window INTERVAL DEFAULT '24 hours';

-- Add check constraint via table recreation
-- (This requires more complex migration that preserves data)

-- Drop old events table
DROP TABLE events_old;

COMMIT;
```

## Migration Notes
1. **Data Preservation**: 
   - All tournament data will be preserved as events
   - Participant relationships will be maintained
   - The old physical events table (`events_old`) is dropped

2. **SQLite Limitations**: 
   - Adding CHECK constraints requires table recreation
   - Consider using application-level validation instead

3. **Backwards Compatibility**:
   - Application code must be updated to use new schema
   - API endpoints should be versioned during transition

4. **Rollback Strategy**:
   - Maintain backup before migration
   - Create versioned migration scripts
   - Test migrations in staging environment first