import { apiKeyService } from '../services/apiKeyService.js';
import { config } from '../config/env.config.js';
import { logger } from '../utils/logger.js';
import { db } from '../database/connection.js';

async function createInitialApiKeys() {
  try {
    // Create Admin API Key (no business_id)
    const { name: adminName, email: adminEmail, role: adminRole, ips: adminIps } = config.apiKeys.admin;
    let adminKey = await db('api_keys').where({ email: adminEmail, role: adminRole }).first();
    if (!adminKey) {
      adminKey = await apiKeyService.createApiKey({
        name: adminName,
        email: adminEmail,
        role: adminRole as 'admin' | 'user' | 'arbitrator',
        ips: adminIps,
        business_id: null, 
      });
      logger.info(`Successfully created admin API key for ${adminEmail}`);
      console.log(`Admin API Key:`, { id: adminKey.id, key: adminKey.key, role: adminKey.role });
    } else {
      logger.info(`Admin API key for ${adminEmail} already exists`);
    }

    // Create Business API Key
    const { name: businessName, email: businessEmail, role: businessRole, ips: businessIps, businessId } = config.apiKeys.business;
    let businessKey = await db('api_keys').where({ email: businessEmail, role: businessRole, business_id: businessId }).first();
    if (!businessKey) {
      // Verify business exists
      const business = await db('businesses').where({ id: businessId }).first();
      if (!business) {
        throw new Error(`Business with ID ${businessId} not found`);
      }
      businessKey = await apiKeyService.createApiKey({
        name: businessName,
        email: businessEmail,
        role: businessRole as 'admin' | 'user' | 'arbitrator',
        ips: businessIps,
        business_id: businessId,
      });
      logger.info(`Successfully created business API key for ${businessEmail}`);
      console.log(`Business API Key:`, { id: businessKey.id, key: businessKey.key, role: businessKey.role, business_id: businessKey.business_id });
    } else {
      logger.info(`Business API key for ${businessEmail} already exists`);
    }
  } catch (error: any) {
    logger.error('Failed to create initial API keys', {
      error: error.message,
      stack: error.stack,
    });
    console.error('Error creating initial API keys:', error.message);
    process.exit(1);
  }
}

createInitialApiKeys();