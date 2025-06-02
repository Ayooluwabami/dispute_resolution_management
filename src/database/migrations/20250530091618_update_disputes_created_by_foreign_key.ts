import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('disputes', (table) => {
    table.dropForeign(['created_by'], 'disputes_created_by_foreign');
  });

  await knex.schema.alterTable('disputes', (table) => {
    table.foreign('created_by').references('id').inTable('api_keys').onDelete('CASCADE');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('disputes', (table) => {
    table.dropForeign(['created_by']);
  });

  await knex.schema.alterTable('disputes', (table) => {
    table.foreign('created_by', 'disputes_created_by_foreign').references('id').inTable('users').onDelete('CASCADE');
  });
}