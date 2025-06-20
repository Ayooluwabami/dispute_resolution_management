import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Modify evidence table
  await knex.schema.alterTable('evidence', (table) => {
    table.dropColumn('submitted_by_email');
    table.uuid('submitted_by').notNullable().references('id').inTable('api_keys');
  });

  // Modify disputes table
  await knex.schema.alterTable('disputes', (table) => {
    table.string('session_id', 255);
    table.string('source_account_name', 255);
    table.string('source_bank', 255);
    table.string('beneficiary_account_name', 255);
    table.string('beneficiary_bank', 255);
    table.timestamp('date_treated');
    table.enum('action', ['accept', 'reject']);
  });
}

export async function down(knex: Knex): Promise<void> {
  // Revert disputes table
  await knex.schema.alterTable('disputes', (table) => {
    table.dropColumns(
      'session_id',
      'source_account_name',
      'source_bank',
      'beneficiary_account_name',
      'beneficiary_bank',
      'date_treated',
      'action'
    );
  });

  // Revert evidence table
  await knex.schema.alterTable('evidence', (table) => {
    table.dropColumn('submitted_by');
    table.string('submitted_by_email', 255).notNullable();
  });
}