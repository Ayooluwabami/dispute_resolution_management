import { CustomRequest, RestanaResponse } from '../types';
import { ArbitrationService } from '../services/arbitrationService';
import { logger } from '../utils/logger';
import { HttpError } from '../utils/httpError';
import { db } from '../database/connection';

export class ArbitrationController {
  private arbitrationService = new ArbitrationService();

  public async getArbitrationCases(req: CustomRequest, res: RestanaResponse) {
    try {
      const { page = '1', limit = '20', status, from_date, to_date } = req.query as any;
      const user = req.user!;
      const businessId = user.role === 'admin' ? null : (await db('api_keys').where('id', user.id).first())?.business_id;

      const result = await this.arbitrationService.getArbitrationCases({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        fromDate: from_date,
        toDate: to_date,
        businessId,
      });

      res.send({
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      logger.error('Error getting arbitration cases', { error: error.message, query: req.query });
      res.send({
        status: 'error',
        message: error.message || 'Failed to retrieve arbitration cases',
      }, error.statusCode || 500);
    }
  }

  public async getArbitrationCaseById(req: CustomRequest, res: RestanaResponse) {
    try {
      const { id } = req.params;
      const user = req.user!;
      const businessId = user.role === 'admin' ? null : (await db('api_keys').where('id', user.id).first())?.business_id;

      const dispute = await this.arbitrationService.getArbitrationCaseById(id, businessId);

      if (!dispute) {
        throw new HttpError(404, 'Arbitration case not found');
      }

      if (
        user.role !== 'admin' &&
        dispute.initiator_email !== user.email &&
        dispute.counterparty_email !== user.email &&
        dispute.arbitrator_id !== user.id
      ) {
        throw new HttpError(403, 'Not authorized to view this arbitration case');
      }

      res.send({
        status: 'success',
        data: dispute,
      });
    } catch (error: any) {
      logger.error('Error getting arbitration case by ID', { error: error.message, id: req.params.id });
      res.send({
        status: 'error',
        message: error.message || 'Failed to retrieve arbitration case',
      }, error.statusCode || 500);
    }
  }

  public async assignArbitrator(req: CustomRequest, res: RestanaResponse) {
    try {
      const { id } = req.params;
      const { arbitrator_id } = req.body;
      const user = req.user!;

      if (user.role !== 'admin') {
        throw new HttpError(403, 'Only admins can assign arbitrators');
      }

      const updatedDispute = await this.arbitrationService.assignArbitrator(id, arbitrator_id, user);

      res.send({
        status: 'success',
        data: updatedDispute,
        message: 'Arbitrator assigned successfully',
      });
    } catch (error: any) {
      logger.error('Error assigning arbitrator', { error: error.message, disputeId: req.params.id });
      res.send({
        status: 'error',
        message: error.message || 'Failed to assign arbitrator',
      }, error.statusCode || 500);
    }
  }

  public async getArbitrationStats(req: CustomRequest, res: RestanaResponse) {
    try {
      const { from_date, to_date } = req.query as any;
      const user = req.user!;
      const businessId = user.role === 'admin' ? null : (await db('api_keys').where('id', user.id).first())?.business_id;

      if (user.role !== 'admin' && user.role !== 'user') {
        throw new HttpError(403, 'Admin or business access required');
      }

      const stats = await this.arbitrationService.getArbitrationStats(from_date, to_date, businessId);

      res.send({
        status: 'success',
        data: stats,
      });
    } catch (error: any) {
      logger.error('Error getting arbitration stats', { error: error.message, query: req.query });
      res.send({
        status: 'error',
        message: error.message || 'Failed to retrieve arbitration statistics',
      }, error.statusCode || 500);
    }
  }
}