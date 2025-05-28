import { apiKeyService } from '../services/apiKeyService.js';
import { config } from '../config/env.config.js';
import { logger } from '../utils/logger.js';

async function createInitialApiKey() {
  try {
    const { initialUserName, initialUserEmail, initialUserRole, initialUserIps } = config.apiKeys;

    const key = await apiKeyService.createApiKey({
      name: initialUserName,
      email: initialUserEmail,
      role: initialUserRole as 'user' | 'admin' | 'arbitrator',
      ips: initialUserIps,
    });

    logger.info(`Successfully created initial API key for ${initialUserEmail}`);
    console.log(
      `${key.role.charAt(0).toUpperCase() + key.role.slice(1)} API Key:`,
      key
    );
  } catch (error: any) {
    logger.error('Failed to create initial API key', {
      error: error.message,
      stack: error.stack,
    });
    console.error('Error creating initial API key:', error.message);
    process.exit(1);
  }
}

createInitialApiKey();