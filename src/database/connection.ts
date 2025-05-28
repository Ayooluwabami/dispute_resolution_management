import knex from 'knex';
import { config } from '../config/env.config';
import { logger } from '../utils/logger';

// Create the database connection
export const db = knex({
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
  debug: config.app.env === 'development',
  log: {
    warn(message) {
      logger.warn(message);
    },
    error(message) {
      logger.error(message);
    },
    deprecate(message) {
      logger.warn(message);
    },
    debug(message) {
      logger.debug(message);
    },
  },
});