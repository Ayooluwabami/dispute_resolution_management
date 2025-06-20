import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('api_keys', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('key', 255).notNullable().unique();
    table.string('name', 255).notNullable();
    table.string('email', 255).notNullable();
    table.enum('role', ['admin', 'user', 'arbitrator']).notNullable().defaultTo('user');
    table.uuid('business_id').notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.foreign('business_id', 'api_keys_business_id_foreign').references('id').inTable('businesses').onDelete('CASCADE');
    table.index('business_id', 'api_keys_business_id_index');
  });

  await knex.schema.createTable('whitelisted_ips', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('api_key_id').notNullable();
    table.string('ip_address', 45).notNullable(); // Supports IPv4 and IPv6
    table.string('description', 255).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.foreign('api_key_id', 'whitelisted_ips_api_key_id_foreign').references('id').inTable('api_keys').onDelete('CASCADE');
    table.index('api_key_id', 'whitelisted_ips_api_key_id_index');
    table.unique(['api_key_id', 'ip_address']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('whitelisted_ips');
  await knex.schema.dropTable('api_keys');
}