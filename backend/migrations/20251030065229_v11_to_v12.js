/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg') {
    await knex.schema.raw(`
      -- Migration v11 to v12: Rename tournament tables to event tables
      BEGIN;

      -- Rename tables
      ALTER TABLE IF EXISTS tournaments RENAME TO events;
      ALTER TABLE IF EXISTS tournament_participants RENAME TO event_participants;
      ALTER TABLE IF EXISTS tournament_entries RENAME TO event_entries;

      -- Rename constraints only if they exist
      DO $$
      BEGIN
          IF EXISTS (
              SELECT 1 FROM information_schema.table_constraints
              WHERE table_name = 'event_participants'
              AND constraint_name = 'fk_tournament_id'
          ) THEN
              ALTER TABLE event_participants RENAME CONSTRAINT fk_tournament_id TO fk_event_id;
          END IF;
      END $$;

      -- Rename indexes
      ALTER INDEX IF EXISTS idx_tournament_entries_user RENAME TO idx_event_entries_user;
      ALTER INDEX IF EXISTS idx_tournament_entries_tournament RENAME TO idx_event_entries_event;

      -- Update schema version
      INSERT INTO schema_versions (version) VALUES (12);

      COMMIT;
    `);
  } else if (client === 'sqlite3') {
    await knex.schema.raw(`
      -- Migration v11 to v12: Create event_outcomes table for SQLite
      CREATE TABLE IF NOT EXISTS event_outcomes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
          result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
          points_awarded INTEGER NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_event_outcomes_participant ON event_outcomes(participant_id);
    `);
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg') {
    await knex.schema.raw(`
      BEGIN;

      -- Revert table renames
      ALTER TABLE IF EXISTS events RENAME TO tournaments;
      ALTER TABLE IF EXISTS event_participants RENAME TO tournament_participants;
      ALTER TABLE IF EXISTS event_entries RENAME TO tournament_entries;

      -- Revert constraint renames
      DO $$
      BEGIN
          IF EXISTS (
              SELECT 1 FROM information_schema.table_constraints
              WHERE table_name = 'tournament_participants'
              AND constraint_name = 'fk_event_id'
          ) THEN
              ALTER TABLE tournament_participants RENAME CONSTRAINT fk_event_id TO fk_tournament_id;
          END IF;
      END $$;

      -- Revert index renames
      ALTER INDEX IF EXISTS idx_event_entries_user RENAME TO idx_tournament_entries_user;
      ALTER INDEX IF EXISTS idx_event_entries_event RENAME TO idx_tournament_entries_tournament;

      -- Update schema version
      DELETE FROM schema_versions WHERE version = 12;

      COMMIT;
    `);
  } else if (client === 'sqlite3') {
    await knex.schema.raw(`
      DROP TABLE IF EXISTS event_outcomes;
    `);
  }
};