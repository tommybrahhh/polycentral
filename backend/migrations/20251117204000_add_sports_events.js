exports.up = async function(knex) {
  // 1. Add the new event type
  await knex('event_types').insert([
    { name: 'sport_match', description: 'A prediction event for a live sport match.' }
  ]);
  
  // 2. Add a new column to the events table to store the API's match ID
  await knex.schema.table('events', (table) => {
    table.string('external_id').nullable();
  });
};

exports.down = async function(knex) {
  await knex.schema.table('events', (table) => {
    table.dropColumn('external_id');
  });
  
  await knex('event_types').where('name', 'sport_match').del();
};