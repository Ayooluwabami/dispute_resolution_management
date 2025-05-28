import type { Knex } from "knex";
import { config } from '../config/env.config.js';

const baseConfig: Knex.Config = {
  client: 'mysql2',
  connection: {
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.name,
  },
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

const configs: { [key: string]: Knex.Config } = {
  development: {
    ...baseConfig,
    debug: true,
  },
  
  test: {
    ...baseConfig,
    connection: {
      ...baseConfig.connection as any,
      database: `${config.database.name}_test`,
    },
  },
  
  production: {
    ...baseConfig,
    pool: {
      min: 2,
      max: 10,
    },
  },
};

export default configs;