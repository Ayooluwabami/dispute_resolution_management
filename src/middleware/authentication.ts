import { CustomRequest, RestanaResponse, NextFunction } from '../types';
import { AuthService } from '../services/authService';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';
import { redisService } from '../services/redisService';

const authService = new AuthService();

export const authenticate = async (
  req: CustomRequest,
  res: RestanaResponse,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new HttpError(401, 'Authorization header missing');
    }

    // Ensure authHeader is a string
    if (Array.isArray(authHeader)) {
      throw new HttpError(401, 'Invalid authorization header: Array not supported');
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new HttpError(401, 'Invalid authorization format');
    }

    const token = parts[1];

    const isBlacklisted = await redisService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new HttpError(401, 'Token is invalidated');
    }

    const decoded = await authService.verifyToken(token);
    req.user = decoded;

    next();
  } catch (error: any) {
    if (error instanceof HttpError) {
      return res.send({ status: 'error', message: error.message }, error.statusCode);
    }

    logger.error('Authentication error', { error: error.message });
    res.send({ status: 'error', message: 'Authentication failed' }, 401);
  }
};