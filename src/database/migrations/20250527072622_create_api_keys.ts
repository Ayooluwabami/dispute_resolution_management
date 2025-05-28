import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('api_keys', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('key').notNullable().unique();
    table.string('name').notNullable();
    table.string('email').notNullable();
    table.enum('role', ['admin', 'user']).notNullable().defaultTo('user');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('whitelisted_ips', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('api_key_id').references('id').inTable('api_keys').onDelete('CASCADE');
    table.string('ip_address').notNullable();
    table.string('description').nullable();
    table.timestamps(true, true);
    table.unique(['api_key_id', 'ip_address']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('whitelisted_ips');
  await knex.schema.dropTableIfExists('api_keys');
}