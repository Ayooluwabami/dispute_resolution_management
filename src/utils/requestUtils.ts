import { CustomRequest, User } from '../types';
import { HttpError } from './httpError';

export const getUserFromRequest = (req: CustomRequest): User => {
  if (!req.user) {
    throw new HttpError(401, 'User not authenticated');
  }
  
  return req.user;
};