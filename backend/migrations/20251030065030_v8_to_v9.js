/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // This migration is a no-op because the logic is handled in v9_to_v10
  return Promise.resolve();
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // This migration is a no-op because the logic is handled in v9_to_v10
  return Promise.resolve();
};