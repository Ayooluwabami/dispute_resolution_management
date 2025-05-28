import { config } from './config/env.config';
import { logger } from './utils/logger';
import App from './app';
import bootstrapApp from './bootstrap';
import { db } from './database/connection';

const application = new App();

bootstrapApp();

application
  .start(config.app.port)
  .then(() => {
    logger.info(`${config.app.name} started on port ${config.app.port}`);
  })
  .catch((err: Error) => {
    logger.error(`Server startup failed: ${err.message}`);
    process.exit(1);
  });

process
  .on('uncaughtException', async (err: Error) => {
    logger.error(`Uncaught exception: ${err.message}`);
    await application.close();
    await db.destroy();
    process.exit(1);
  })
  .on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down');
    await application.close();
    await db.destroy();
    process.exit(0);
  })
  .on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down');
    await application.close();
    await db.destroy();
    process.exit(0);
  });