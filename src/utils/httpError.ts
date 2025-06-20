export class HttpError extends Error {
  statusCode: number;
  details?: string[];

  constructor(statusCode: number, message: string, details?: string[]) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'HttpError';
    
    Error.captureStackTrace(this, this.constructor);
  }
}