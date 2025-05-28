import { CustomRequest, RestanaResponse } from '../types';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';
import { getUserFromRequest } from '../utils/requestUtils';

export const checkRole = (roles: string[]) => {
  return (req: CustomRequest, res: RestanaResponse, next: Function) => {
    try {
      const user = getUserFromRequest(req);

      if (!roles.includes(user.role)) {
        throw new HttpError(403, 'Not authorized to access this resource');
      }

      next();
    } catch (error: any) {
      if (error instanceof HttpError) {
        return res.send({ status: 'error', message: error.message }, error.statusCode);
      }

      logger.error('Authorization error', { error: error.message });
      res.send({ status: 'error', message: 'Not authorized to access this resource' }, 403);
    }
  };
};