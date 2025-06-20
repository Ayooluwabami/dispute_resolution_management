import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Insert initial business
  await knex('businesses').insert({
    id: 'd2c0e4e7-4b66-11f0-8ca0-802bf900b38a',
    name: 'Test Business',
    email: 'carcareautoservices0@gmail.com',
    is_active: true,
    created_at: knex.fn.now(),
    updated_at: knex.fn.now(),
  });

  // Insert initial profiles
  await knex('profiles').insert([
    {
      id: knex.raw('(UUID())'),
      email: 'carcareautoservices0@gmail.com',
      business_id: 'd2c0e4e7-4b66-11f0-8ca0-802bf900b38a',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: knex.raw('(UUID())'),
      email: 'counterparty@example.com',
      business_id: 'd2c0e4e7-4b66-11f0-8ca0-802bf900b38a',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex('profiles').whereIn('email', ['carcareautoservices0@gmail.com', 'counterparty@example.com']).delete();
  await knex('businesses').where({ id: 'd2c0e4e7-4b66-11f0-8ca0-802bf900b38a' }).delete();
}