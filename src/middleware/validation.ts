import { CustomRequest, RestanaResponse, NextFunction } from '../types';
import { Schema } from 'joi';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';

export const validateRequest = (schema: Schema) => {
  return (req: CustomRequest, res: RestanaResponse, next: NextFunction) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const validationError = new HttpError(
          400,
          'Validation error',
          error.details.map((d) => d.message)
        );

        logger.warn('Validation error', {
          error: error.details,
          body: req.body,
        });

        return res.send(
          {
            status: 'error',
            message: 'Validation error',
            errors: error.details.map((d) => d.message),
          },
          400
        );
      }

      req.body = value;
      next();
    } catch (err: any) {
      logger.error('Error in validation middleware', { error: err.message });
      next();
    }
  };
};