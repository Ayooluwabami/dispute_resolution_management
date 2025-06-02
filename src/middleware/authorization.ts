import { CustomRequest, RestanaResponse } from '../types';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';
import { getUserFromRequest } from '../utils/requestUtils';

export const checkRole = (roles: string[]) => {
  return (req: CustomRequest, res: RestanaResponse, next: Function) => {
    try {
      logger.info('Checking role', { roles, path: req.url });
      const user = getUserFromRequest(req);
      logger.info('User from request', { user });

      if (!roles.includes(user.role)) {
        logger.warn('Role check failed', { userRole: user.role, requiredRoles: roles });
        throw new HttpError(403, 'Not authorized to access this resource');
      }

      next();
    } catch (error: any) {
      logger.error('Authorization error', { error: error.message, path: req.url });
      if (error instanceof HttpError) {
        return res.send({ status: 'error', message: error.message }, error.statusCode);
      }

      res.send({ status: 'error', message: 'Not authorized to access this resource' }, 403);
    }
  };
};