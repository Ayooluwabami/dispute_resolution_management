import { CustomRequest, RestanaResponse, NextFunction } from '../types';
import { apiKeyService } from '../services/apiKeyService';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';

export const apiKeyAuth = async (req: CustomRequest, res: RestanaResponse, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'];
    let clientIp = req.headers['x-forwarded-for'] || req.ip;

    if (!apiKey) {
      throw new HttpError(401, 'API key is required');
    }

    if (!clientIp) {
      throw new HttpError(400, 'Could not determine client IP');
    }

    // Handle array headers
    clientIp = Array.isArray(clientIp) ? clientIp[0] : clientIp;
    const key = Array.isArray(apiKey) ? apiKey[0] : apiKey;

    const apiKeyData = await apiKeyService.validateApiKey(key, clientIp);

    // Attach API key data to request
    req.user = {
      id: apiKeyData.id,
      email: apiKeyData.email,
      role: apiKeyData.role,
    };

    // Validate client and counterparty emails for dispute creation
    if (req.path.includes('/disputes') && req.method === 'POST') {
      if (!req.body.clientEmail || !req.body.counterpartyEmail) {
        throw new HttpError(400, 'Both clientEmail and counterpartyEmail are required');
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(req.body.clientEmail) || !emailRegex.test(req.body.counterpartyEmail)) {
        throw new HttpError(400, 'Invalid email format');
      }
      req.clientEmail = req.body.clientEmail;
      req.counterpartyEmail = req.body.counterpartyEmail;
    }

    next();
  } catch (error: any) {
    logger.error('API key authentication error', { error: error.message });
    if (error instanceof HttpError) {
      res.send({ status: 'error', message: error.message }, error.statusCode);
      return;
    }
    res.send({ status: 'error', message: 'Authentication failed' }, 401);
  }
};