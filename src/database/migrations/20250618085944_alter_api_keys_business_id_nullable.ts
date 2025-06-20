import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Drop foreign key constraint if it exists
  const [foreignKey] = await knex.raw(`
    SELECT CONSTRAINT_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_NAME = 'api_keys' AND COLUMN_NAME = 'business_id'
    AND CONSTRAINT_NAME != 'PRIMARY'
    AND REFERENCED_TABLE_NAME = 'businesses'
  `);
  if (foreignKey) {
    await knex.schema.alterTable('api_keys', (table) => {
      table.dropForeign(['business_id'], foreignKey.CONSTRAINT_NAME);
    });
  }

  // Make business_id nullable
  await knex.schema.alterTable('api_keys', (table) => {
    table.uuid('business_id').nullable().alter();
  });

  // Re-add foreign key
  await knex.schema.alterTable('api_keys', (table) => {
    table.foreign('business_id', 'api_keys_business_id_foreign').references('id').inTable('businesses').onDelete('CASCADE');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop foreign key
  const [foreignKey] = await knex.raw(`
    SELECT CONSTRAINT_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_NAME = 'api_keys' AND COLUMN_NAME = 'business_id'
    AND CONSTRAINT_NAME != 'PRIMARY'
    AND REFERENCED_TABLE_NAME = 'businesses'
  `);
  if (foreignKey) {
    await knex.schema.alterTable('api_keys', (table) => {
      table.dropForeign(['business_id'], foreignKey.CONSTRAINT_NAME);
    });
  }

  // Make business_id not nullable (revert)
  await knex.schema.alterTable('api_keys', (table) => {
    table.uuid('business_id').notNullable().alter();
  });

  // Re-add foreign key
  await knex.schema.alterTable('api_keys', (table) => {
    table.foreign('business_id', 'api_keys_business_id_foreign').references('id').inTable('businesses').onDelete('CASCADE');
  });
}