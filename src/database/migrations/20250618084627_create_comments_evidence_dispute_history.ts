import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('comments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('dispute_id').notNullable();
    table.text('comment').notNullable();
    table.uuid('created_by').notNullable(); // References api_keys.id
    table.boolean('is_private').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.foreign('dispute_id', 'comments_dispute_id_foreign').references('id').inTable('disputes').onDelete('CASCADE');
    table.foreign('created_by', 'comments_created_by_foreign').references('id').inTable('api_keys').onDelete('CASCADE');
    table.index('dispute_id', 'comments_dispute_id_index');
  });

  await knex.schema.createTable('evidence', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('dispute_id').notNullable();
    table.string('file_path', 255).notNullable();
    table.string('file_name', 255).notNullable();
    table.string('submitted_by_email', 255).notNullable();
    table.string('evidence_type', 50).notNullable();
    table.text('description').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.foreign('dispute_id', 'evidence_dispute_id_foreign').references('id').inTable('disputes').onDelete('CASCADE');
    table.index('dispute_id', 'evidence_dispute_id_index');
  });

  await knex.schema.createTable('dispute_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('dispute_id').notNullable();
    table.string('action', 100).notNullable();
    table.text('details').nullable();
    table.uuid('created_by').notNullable(); // References api_keys.id
    table.timestamp('action_date').notNullable().defaultTo(knex.fn.now());
    table.foreign('dispute_id', 'dispute_history_dispute_id_foreign').references('id').inTable('disputes').onDelete('CASCADE');
    table.foreign('created_by', 'dispute_history_created_by_foreign').references('id').inTable('api_keys').onDelete('CASCADE');
    table.index('dispute_id', 'dispute_history_dispute_id_index');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('dispute_history');
  await knex.schema.dropTable('evidence');
  await knex.schema.dropTable('comments');
}