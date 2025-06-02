import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('disputes', (table) => {
    table.text('resolution_notes').nullable();
    table.timestamp('resolution_date').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('disputes', (table) => {
    table.dropColumn('resolution_notes');
    table.dropColumn('resolution_date');
  });
}