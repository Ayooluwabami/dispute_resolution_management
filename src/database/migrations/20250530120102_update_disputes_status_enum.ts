import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // First, update existing status values to match new enum
  await knex('disputes').where('status', 'pending').update({ status: 'open' });
  await knex('disputes').where('status', 'open').update({ status: 'open' }); // Already correct, but ensure consistency
  await knex('disputes').where('status', 'cancelled').update({ status: 'canceled' });

  // Alter the status enum
  await knex.schema.alterTable('disputes', (table) => {
    table.enum('status', ['open', 'under_review', 'resolved', 'rejected', 'canceled']).notNullable().defaultTo('open').alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  // Revert enum to original
  await knex.schema.alterTable('disputes', (table) => {
    table.enum('status', ['pending', 'open', 'resolved', 'rejected', 'cancelled']).notNullable().defaultTo('pending').alter();
  });

  // Revert status updates
  await knex('disputes').where('status', 'open').update({ status: 'open' });
  await knex('disputes').where('status', 'canceled').update({ status: 'cancelled' });
}