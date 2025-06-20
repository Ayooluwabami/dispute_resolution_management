import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('disputes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('transaction_id', 255).nullable(); // Optional, not unique
    table.string('initiator_email', 255).notNullable();
    table.string('counterparty_email', 255).notNullable();
    table.uuid('initiator_profile_id').notNullable();
    table.uuid('counterparty_profile_id').notNullable();
    table.string('reason', 255).notNullable(); // disputeTitle
    // table.text('description').nullable(); // disputeNote
    table.decimal('amount', 15, 2).nullable();
    table.enum('status', ['open', 'under_review', 'resolved', 'rejected', 'canceled']).notNullable().defaultTo('open');
    table.text('resolution').nullable();
    table.uuid('created_by').notNullable(); // References api_keys.id
    table.uuid('arbitrator_id').nullable(); // References api_keys.id
    table.uuid('business_id').notNullable();
    table.text('resolution_notes').nullable();
    table.timestamp('resolution_date').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.foreign('initiator_profile_id', 'disputes_initiator_profile_id_foreign').references('id').inTable('profiles').onDelete('RESTRICT');
    table.foreign('counterparty_profile_id', 'disputes_counterparty_profile_id_foreign').references('id').inTable('profiles').onDelete('RESTRICT');
    table.foreign('created_by', 'disputes_created_by_foreign').references('id').inTable('api_keys').onDelete('CASCADE');
    table.foreign('arbitrator_id', 'disputes_arbitrator_id_foreign').references('id').inTable('api_keys').onDelete('SET NULL');
    table.foreign('business_id', 'disputes_business_id_foreign').references('id').inTable('businesses').onDelete('CASCADE');
    table.index('business_id', 'disputes_business_id_index');
    table.index('initiator_profile_id', 'disputes_initiator_profile_id_index');
    table.index('counterparty_profile_id', 'disputes_counterparty_profile_id_index');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('disputes');
}