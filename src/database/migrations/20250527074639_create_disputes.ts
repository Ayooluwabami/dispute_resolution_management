import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create disputes table
  await knex.schema.createTable('disputes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('transaction_id').notNullable().references('id').inTable('transactions').onDelete('CASCADE');
    table.string('initiator_email').notNullable();
    table.string('counterparty_email').notNullable();
    table.string('reason', 255).notNullable();
    table.text('description').nullable();
    table.decimal('amount', 14, 2).notNullable();
    table.enum('status', ['pending', 'open', 'resolved', 'rejected', 'cancelled']).notNullable().defaultTo('pending');
    table.text('resolution').nullable();
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('arbitrator_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);
    table.index(['transaction_id', 'created_by', 'arbitrator_id', 'status']);
  });

  // Create evidence table
  await knex.schema.createTable('evidence', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('dispute_id').notNullable().references('id').inTable('disputes').onDelete('CASCADE');
    table.string('file_path').notNullable();
    table.string('file_name').notNullable();
    table.string('submitted_by_email').notNullable();
    table.string('evidence_type', 50).notNullable();
    table.text('description').nullable();
    table.timestamps(true, true);
    table.index('dispute_id');
  });

  // Create comments table
  await knex.schema.createTable('comments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('dispute_id').notNullable().references('id').inTable('disputes').onDelete('CASCADE');
    table.text('comment').notNullable();
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.boolean('is_private').notNullable().defaultTo(false);
    table.timestamps(true, true);
    table.index(['dispute_id', 'created_by']);
  });

  // Create dispute_history table
  await knex.schema.createTable('dispute_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('dispute_id').notNullable().references('id').inTable('disputes').onDelete('CASCADE');
    table.string('action', 100).notNullable();
    table.text('details').nullable();
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('action_date').notNullable().defaultTo(knex.fn.now());
    table.index(['dispute_id', 'created_by', 'action_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dispute_history');
  await knex.schema.dropTableIfExists('comments');
  await knex.schema.dropTableIfExists('evidence');
  await knex.schema.dropTableIfExists('disputes');
}