import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('api_keys', (table) => {
    table
      .enum('role', ['admin', 'user', 'arbitrator'], {
        useNative: true,
        enumName: 'api_key_role',
      })
      .notNullable()
      .defaultTo('user')
      .alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('api_keys', (table) => {
    table
      .enum('role', ['admin', 'user'], {
        useNative: true,
        enumName: 'api_key_role',
      })
      .notNullable()
      .defaultTo('user')
      .alter();
  });
}