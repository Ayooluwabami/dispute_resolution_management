import { CustomRequest, RestanaResponse } from '../types';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';

export const errorHandler = (err: any, req: any, res: any) => {
  // Log the error
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    method: req.method, 
    url: req.url,    
    body: req.body,
    query: req.query,
  });

  // Handle http errors with specific status codes
  if (err instanceof HttpError) {
    return res.send(
      {
        status: 'error',
        message: err.message,
      },
      err.statusCode
    );
  }

  // Handle database errors
  if (err.code && err.code.startsWith('ER_')) {
    return res.send(
      {
        status: 'error',
        message: 'Database error occurred',
      },
      500
    );
  }

  // Handle 404 errors
  if (err.statusCode === 404) {
    return res.send(
      {
        status: 'error',
        message: 'Resource not found',
      },
      404
    );
  }

  // Handle validation errors from Joi
  if (err.name === 'ValidationError') {
    return res.send(
      {
        status: 'error',
        message: 'Validation error',
        details: err.details,
      },
      400
    );
  }

  // Default error response
  res.send(
    {
      status: 'error',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Internal server error',
    },
    500
  );
};