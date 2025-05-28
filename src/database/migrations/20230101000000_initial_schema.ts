import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create users table
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('email', 100).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 50).notNullable();
    table.string('last_name', 50).notNullable();
    table.string('phone_number', 15).notNullable().unique();
    table.enum('role', ['admin', 'arbitrator', 'user']).notNullable().defaultTo('user');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.boolean('email_verified').notNullable().defaultTo(false);
    table.timestamps(true, true);
  });

  // Create transactions table
  await knex.schema.createTable('transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('session_id', 100).notNullable().unique();
    table.decimal('amount', 20, 2).notNullable();
    table.string('source_account_name', 100).notNullable();
    table.string('source_bank', 100).notNullable();
    table.string('beneficiary_account_name', 100).notNullable();
    table.string('beneficiary_bank', 100).notNullable();
    table.string('userId').nullable(); 
    table.enum('status', ['pending', 'completed', 'failed', 'disputed']).notNullable().defaultTo('pending');
    table.timestamp('transaction_date').notNullable().defaultTo(knex.fn.now());
    table.string('channel_code', 50).nullable();
    table.string('destination_node', 100).nullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('transactions');
  await knex.schema.dropTableIfExists('users');
}