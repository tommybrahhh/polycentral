/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Insert default event types
  await knex.raw(`
    INSERT INTO event_types (name, description)
    VALUES
      ('prediction', 'A standard prediction event.'),
      ('tournament', 'A multi-stage tournament event.')
    ON CONFLICT (name) DO NOTHING;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Remove the default event types
  await knex('event_types').whereIn('name', ['prediction', 'tournament']).del();
};