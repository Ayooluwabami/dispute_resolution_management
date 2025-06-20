import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('profiles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('email', 255).notNullable().unique();
    table.uuid('business_id').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.foreign('business_id', 'profiles_business_id_foreign').references('id').inTable('businesses').onDelete('CASCADE');
    table.index('business_id', 'profiles_business_id_index');
    table.index('email', 'profiles_email_index');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('profiles');
}