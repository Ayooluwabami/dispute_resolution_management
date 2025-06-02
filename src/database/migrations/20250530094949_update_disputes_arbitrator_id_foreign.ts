import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('disputes', (table) => {
    table.dropForeign(['arbitrator_id'], 'disputes_arbitrator_id_foreign');
  });
  await knex.schema.alterTable('disputes', (table) => {
    table.foreign('arbitrator_id').references('id').inTable('api_keys').onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('disputes', (table) => {
    table.dropForeign(['arbitrator_id']);
  });
  await knex.schema.alterTable('disputes', (table) => {
    table.foreign('arbitrator_id', 'disputes_arbitrator_id_foreign').references('id').inTable('users').onDelete('SET NULL');
  });
}