import { config } from './config/env.config';
import { logger } from './utils/logger';
import { db } from './database/connection';

function bootstrapApp() {
  // Initialize database
  db.raw('SELECT 1')
    .then(() => {
      logger.info('Database connection established');
    })
    .catch((err: Error) => {
      logger.error(`Database connection failed: ${err.message}`);
      process.exit(1);
    });

  logger.info('Application bootstrapped');
}

export default bootstrapApp;