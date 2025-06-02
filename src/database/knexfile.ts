import type { Knex } from 'knex';
import { config } from '../config/env.config.js';

const knexConfig: Knex.Config = {
  client: 'mysql2',
  connection: {},
  pool: {
    min: config.database.minConnections,
    max: config.database.maxConnections,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations',
  },
  seeds: {
    directory: './seeds',
  },
};

if (['production', 'test'].includes(config.app.env)) {
  knexConfig.connection = {
    host: config.database.host,
    user: config.database.user,
    password: config.database.password,
    database: config.app.env === 'test' ? `${config.database.name}_test` : config.database.name,
    charset: 'utf8mb4',
  };
} else {
  knexConfig.connection = {
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.name,
    charset: 'utf8mb4',
  };
  knexConfig.debug = true;
}

export default knexConfig;