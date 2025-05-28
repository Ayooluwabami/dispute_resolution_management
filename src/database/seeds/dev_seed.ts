import { Knex } from 'knex';
import { hashPassword } from '../../utils/auth';

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex('dispute_history').del();
  await knex('dispute_comments').del();
  await knex('dispute_evidence').del();
  await knex('disputes').del();
  await knex('transactions').del();
  await knex('users').del();

  // Seed admin user
  const adminPassword = await hashPassword('Admin123!');
  
  const users = [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'admin@example.com',
      password_hash: adminPassword,
      first_name: 'System',
      last_name: 'Administrator',
      phone_number: '+2348012345678',
      role: 'admin',
      is_active: true,
      email_verified: true
    }
  ];
  
  await knex('users').insert(users);
}