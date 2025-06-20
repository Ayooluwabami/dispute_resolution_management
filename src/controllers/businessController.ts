import { CustomRequest, RestanaResponse } from '../types';
import { db } from '../database/connection';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class BusinessController {
  public async createBusiness(req: CustomRequest, res: RestanaResponse) {
    try {
      if (req.user!.role !== 'admin') {
        throw new HttpError(403, 'Admin access required');
      }

      const { name, email } = req.body;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new HttpError(400, 'Invalid email format');
      }

      const existingBusiness = await db('businesses').where({ email }).first();
      if (existingBusiness) {
        throw new HttpError(409, 'Business with this email already exists');
      }

      const businessId = uuidv4();
      await db('businesses').insert({
        id: businessId,
        name,
        email,
        is_active: true,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      const business = await db('businesses').where({ id: businessId }).first();
      res.send({ status: 'success', data: business }, 201);
    } catch (error: any) {
      logger.error('Error creating business', { error: error.message });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to create business');
    }
  }
}

export const businessController = new BusinessController();