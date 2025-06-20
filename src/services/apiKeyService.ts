import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection.js';
import { HttpError } from '../utils/httpError.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

export class ApiKeyService {
  private generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  public async createApiKey(data: { name: string; email: string; role?: string; ips: string[]; business_id?: string | null }) {
    try {
      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new HttpError(400, 'Invalid email format');
      }

      // Validate IPs
      const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
      if (data.ips.some((ip) => !ipRegex.test(ip))) {
        throw new HttpError(400, 'Invalid IP address format');
      }

      // Validate role
      const validRoles = ['admin', 'user', 'arbitrator'];
      const role = data.role || 'user';
      if (!validRoles.includes(role)) {
        throw new HttpError(400, 'Invalid role');
      }

      // Validate business_id if provided
      if (data.business_id) {
        const business = await db('businesses').where({ id: data.business_id }).first();
        if (!business) {
          throw new HttpError(404, 'Business not found');
        }
      }

      const result = await db.transaction(async (trx) => {
        // Create API key
        const keyData = {
          id: uuidv4(),
          key: this.generateApiKey(),
          name: data.name,
          email: data.email,
          role,
          business_id: data.business_id || null,
          is_active: true,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        };
        await trx('api_keys').insert(keyData);
        // Fetch the inserted API key
        const [apiKey] = await trx('api_keys').where({ id: keyData.id }).select('*');

        // Add whitelisted IPs
        if (data.ips && data.ips.length > 0) {
          const ipRecords = data.ips.map((ip) => ({
            id: uuidv4(),
            api_key_id: apiKey.id,
            ip_address: ip,
            created_at: db.fn.now(),
            updated_at: db.fn.now(),
          }));
          await trx('whitelisted_ips').insert(ipRecords);
        }

        return apiKey;
      });

      return result;
    } catch (error: any) {
      logger.error('Error creating API key', { error: error.message });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to create API key');
    }
  }

  public async validateApiKey(key: string, ipAddress: string) {
    try {
      const apiKey = await db('api_keys')
        .where({ key, is_active: true })
        .select('id', 'email', 'role', 'business_id')
        .first();

      if (!apiKey) {
        throw new HttpError(401, 'Invalid or inactive API key');
      }

      // Check if IP is whitelisted
      const whitelistedIp = await db('whitelisted_ips')
        .where({
          api_key_id: apiKey.id,
          ip_address: ipAddress,
        })
        .first();

      if (!whitelistedIp) {
        throw new HttpError(403, 'IP address not whitelisted');
      }

      return apiKey;
    } catch (error: any) {
      logger.error('Error validating API key', { error: error.message });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to validate API key');
    }
  }

  public async deactivateApiKey(id: string) {
    try {
      const updated = await db('api_keys').where({ id }).update({ is_active: false });
      if (!updated) {
        throw new HttpError(404, 'API key not found');
      }
    } catch (error: any) {
      logger.error('Error deactivating API key', { error: error.message });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to deactivate API key');
    }
  }

  public async getApiKeyById(id: string) {
    try {
      const apiKey = await db('api_keys').where({ id }).first();
      if (!apiKey) {
        throw new HttpError(404, 'API key not found');
      }
      return apiKey;
    } catch (error: any) {
      logger.error('Error fetching API key', { error: error.message });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to fetch API key');
    }
  }

  public async listApiKeys(business_id?: string) {
    try {
      const query = db('api_keys').select('id', 'name', 'email', 'role', 'is_active', 'created_at', 'business_id');
      if (business_id) {
        query.where('business_id', business_id);
      }
      const apiKeys = await query;
      return apiKeys;
    } catch (error: any) {
      logger.error('Error listing API keys', { error: error.message });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to list API keys');
    }
  }

  public async updateWhitelistedIps(apiKeyId: string, ips: string[]) {
    try {
      const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
      if (ips.some((ip) => !ipRegex.test(ip))) {
        throw new HttpError(400, 'Invalid IP address format');
      }

      await db.transaction(async (trx) => {
        // Delete existing IPs
        await trx('whitelisted_ips').where({ api_key_id: apiKeyId }).delete();
        // Insert new IPs
        if (ips.length > 0) {
          const ipRecords = ips.map((ip) => ({
            id: uuidv4(),
            api_key_id: apiKeyId,
            ip_address: ip,
            created_at: db.fn.now(),
            updated_at: db.fn.now(),
          }));
          await trx('whitelisted_ips').insert(ipRecords);
        }
      });
    } catch (error: any) {
      logger.error('Error updating whitelisted IPs', { error: error.message });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to update whitelisted IPs');
    }
  }
}

export const apiKeyService = new ApiKeyService();