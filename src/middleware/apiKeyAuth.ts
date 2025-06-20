import { CustomRequest, RestanaResponse, NextFunction } from '../types';
import { apiKeyService } from '../services/apiKeyService';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';
import { config } from '../config/env.config';
import { db } from '../database/connection';

const getClientIp = (req: CustomRequest): string | null => {
  const ipSources = {
    cfConnectingIp: req.headers['cf-connecting-ip'],
    trueClientIp: req.headers['true-client-ip'],
    xForwardedFor: req.headers['x-forwarded-for'],
    remoteAddress: req.connection?.remoteAddress || req.socket?.remoteAddress,
    reqIp: req.ip,
  };
  logger.debug('IP extraction sources', ipSources);

  const headers = ['cf-connecting-ip', 'true-client-ip', 'x-forwarded-for'];
  for (const header of headers) {
    const value: string | string[] | undefined = req.headers[header];
    if (value) {
      const ipChain: string[] = Array.isArray(value)
        ? value[0].split(',').map((ip: string) => ip.trim())
        : value.split(',').map((ip: string) => ip.trim());
      const normalizedIpChain: string[] = ipChain.map((ip: string) => ip.replace(/^::ffff:/, ''));

      const remoteAddr: string = (req.connection?.remoteAddress || req.socket?.remoteAddress || '').replace(/^::ffff:/, '');
      if (normalizedIpChain.length > 0 && config.network.trustedProxies.includes(remoteAddr)) {
        return normalizedIpChain[0];
      }
      return normalizedIpChain[normalizedIpChain.length - 1];
    }
  }

  const remoteAddr: string = (req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip || '').replace(/^::ffff:/, '');
  return remoteAddr || null;
};

export default async function apiKeyAuth(req: CustomRequest, res: RestanaResponse, next: NextFunction): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      logger.warn('API key not provided', { path: req.path, method: req.method });
      throw new HttpError(401, 'API key is required');
    }

    const key: string = Array.isArray(apiKey) ? apiKey[0] : apiKey;
    const clientIp: string | null = getClientIp(req);

    if (!clientIp) {
      logger.error('Could not determine client IP', {
        path: req.path,
        method: req.method,
        headers: req.headers,
      });
      throw new HttpError(400, 'Could not determine client IP');
    }

    logger.debug('Extracted client IP', { clientIp, path: req.path, method: req.method });

    const isDev: boolean = config.app.env === 'development';
    let validateIp: string = clientIp;
    if (isDev) {
      try {
        const apiKeyData = await db('api_keys').where({ key, is_active: true }).first();
        if (apiKeyData) {
          const whitelistedIps = await db('whitelisted_ips')
            .where({ api_key_id: apiKeyData.id })
            .select('ip_address');
          const validIps: string[] = whitelistedIps.map((ip: { ip_address: string }) => ip.ip_address);
          if (validIps.length > 0 && !validIps.includes(clientIp)) {
            validateIp = validIps[0];
            logger.debug('Using whitelisted IP for development', { clientIp, validateIp });
          } else if (validIps.length === 0) {
            validateIp = clientIp;
            logger.debug('Bypassing IP check in development (no whitelisted IPs)', { clientIp });
          }
        } else {
          logger.warn('API key not found in database', { key: key.substring(0, 8) });
          throw new HttpError(401, 'Invalid API key');
        }
      } catch (dbError: any) {
        logger.error('Database error during API key validation', {
          error: dbError.message,
          path: req.path,
          method: req.method,
        });
        throw new HttpError(500, 'Database error during API key validation');
      }
    }

    const apiKeyData = await apiKeyService.validateApiKey(key, validateIp);

    req.user = {
      id: apiKeyData.id,
      email: apiKeyData.email,
      role: apiKeyData.role,
      business_id: apiKeyData.business_id || null,
    };
    req.clientIp = clientIp;

    // Apply email validation only for POST /disputes
    if (req.path === '/api/v1/disputes' && req.method === 'POST') {
      if (!req.body.initiatorEmail || !req.body.counterpartyEmail) {
        throw new HttpError(400, 'Both initiatorEmail and counterpartyEmail are required');
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(req.body.initiatorEmail) || !emailRegex.test(req.body.counterpartyEmail)) {
        throw new HttpError(400, 'Invalid email format');
      }
      req.initiatorEmail = req.body.initiatorEmail;
      req.counterpartyEmail = req.body.counterpartyEmail;
    }

    next();
  } catch (error: any) {
    const clientIp: string | null = getClientIp(req);
    logger.error('API key authentication failed', {
      error: error.message,
      path: req.path,
      method: req.method,
      clientIp,
    });
    const errorData = {
      status: 'error',
      message: error.message,
      clientIp: clientIp || 'unknown',
    };
    if (error instanceof HttpError) {
      res.send(errorData, error.statusCode);
    } else {
      res.send(errorData, 500);
    }
  }
};