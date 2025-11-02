
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Insert default event types
  await knex('event_types').insert([
    { name: 'prediction', description: 'A standard prediction event.' },
    { name: 'tournament', description: 'A multi-stage tournament event.' }
  ]);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Remove the default event types
  await knex('event_types').whereIn('name', ['prediction', 'tournament']).del();
};
