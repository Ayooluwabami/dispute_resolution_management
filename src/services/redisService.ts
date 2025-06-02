import Redis from 'ioredis';
import { config } from '../config/env.config';
import { logger } from '../utils/logger';
import { HttpError } from '../utils/httpError';

class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      // password: config.redis.password || undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Retrying Redis connection: attempt ${times}`);
        return delay;
      },
    });

    this.client.on('error', (err) => {
      logger.error('Redis Client Error', { error: err.message, stack: err.stack });
    });

    this.client.on('connect', () => {
      logger.info('Connected to Redis');
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
    });
  }

  async setOTP(key: string, value: string, expirySeconds: number = 300): Promise<void> {
    try {
      await this.client.set(key, value, 'EX', expirySeconds);
    } catch (error: any) {
      logger.error(`Error setting key: ${error.message}`, { key });
      throw new HttpError(500, 'Failed to set key');
    }
  }

  async getOTP(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error: any) {
      logger.error(`Error getting key: ${error.message}`, { key });
      throw new HttpError(500, 'Failed to get key');
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error: any) {
      logger.error(`Error deleting key: ${error.message}`, { key });
      throw new HttpError(500, 'Failed to delete key');
    }
  }

  async setBlacklistToken(token: string, expiresIn: number): Promise<void> {
    try {
      await this.client.setex(`blacklist:${token}`, expiresIn, 'true');
    } catch (error: any) {
      logger.error(`Error blacklisting token: ${error.message}`, { token });
      throw new HttpError(500, 'Failed to blacklist token');
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error: any) {
      logger.error(`Error getting key: ${error.message}`, { key });
      throw new HttpError(500, 'Failed to get key from Redis');
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const result = await this.client.get(`blacklist:${token}`);
      return result !== null;
    } catch (error: any) {
      logger.error(`Error checking blacklisted token: ${error.message}`, { token });
      throw new HttpError(500, 'Failed to check token blacklist');
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      logger.info('Disconnected from Redis');
    } catch (error: any) {
      logger.error(`Error disconnecting from Redis: ${error.message}`);
    }
  }
}

export const redisService = new RedisService();