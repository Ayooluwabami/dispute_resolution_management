import { CustomRequest, RestanaResponse } from '../types';
import { ArbitrationService } from '../services/arbitrationService';
import { logger } from '../utils/logger';
import { HttpError } from '../utils/httpError';

export class ArbitrationController {
  private arbitrationService = new ArbitrationService();

  public async getArbitrationCases(req: CustomRequest, res: RestanaResponse) {
    try {
      const { page = '1', limit = '20', status, from_date, to_date } = req.query as any;
      const user = req.user!;

      const result = user.role === 'arbitrator'
        ? await this.arbitrationService.getArbitratorCases(user.id, {
            page: parseInt(page),
            limit: parseInt(limit),
            status,
            fromDate: from_date,
            toDate: to_date,
          })
        : await this.arbitrationService.getAllArbitrationCases({
            page: parseInt(page),
            limit: parseInt(limit),
            status,
            fromDate: from_date,
            toDate: to_date,
          });

      res.send({
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      logger.error('Error getting arbitration cases', { error: error.message });
      throw new HttpError(500, 'Failed to retrieve arbitration cases');
    }
  }

  public async getArbitrationCaseById(req: CustomRequest, res: RestanaResponse) {
    try {
      const { id } = req.params;
      const user = req.user!;

      const dispute = await this.arbitrationService.getArbitrationCaseById(id);

      if (!dispute) {
        throw new HttpError(404, 'Arbitration case not found');
      }

      if (
        user.role !== 'admin' &&
        user.role !== 'arbitrator' &&
        dispute.initiator_email !== user.email &&
        dispute.counterparty_email !== user.email
      ) {
        throw new HttpError(403, 'Not authorized to view this arbitration case');
      }

      if (
        user.role === 'arbitrator' &&
        dispute.arbitrator_id !== null &&
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
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to retrieve arbitration case');
    }
  }

  public async assignArbitrator(req: CustomRequest, res: RestanaResponse) {
    try {
      const { id } = req.params;
      const { arbitrator_id } = req.body;
      const user = req.user!;

      if (user.role !== 'admin' && arbitrator_id !== user.id) {
        throw new HttpError(403, 'Not authorized to assign this arbitrator');
      }

      const updatedDispute = await this.arbitrationService.assignArbitrator(id, arbitrator_id, user);

      res.send({
        status: 'success',
        data: updatedDispute,
        message: 'Arbitrator assigned successfully',
      });
    } catch (error: any) {
      logger.error('Error assigning arbitrator', { error: error.message, disputeId: req.params.id });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to assign arbitrator');
    }
  }

  public async reviewCase(req: CustomRequest, res: RestanaResponse) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const user = req.user!;

      const dispute = await this.arbitrationService.getArbitrationCaseById(id);

      if (!dispute) {
        throw new HttpError(404, 'Arbitration case not found');
      }

      if (
        user.role !== 'admin' &&
        (dispute.arbitrator_id === null || dispute.arbitrator_id !== user.id)
      ) {
        throw new HttpError(403, 'Not authorized to review this case');
      }

      const updatedDispute = await this.arbitrationService.reviewCase(id, notes, user);

      res.send({
        status: 'success',
        data: updatedDispute,
        message: 'Case review started successfully',
      });
    } catch (error: any) {
      logger.error('Error reviewing case', { error: error.message, disputeId: req.params.id });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to start case review');
    }
  }

  public async resolveCase(req: CustomRequest, res: RestanaResponse) {
    try {
      const { id } = req.params;
      const { resolution, resolution_notes } = req.body;
      const user = req.user!;

      const dispute = await this.arbitrationService.getArbitrationCaseById(id);

      if (!dispute) {
        throw new HttpError(404, 'Arbitration case not found');
      }

      if (
        user.role !== 'admin' &&
        (dispute.arbitrator_id === null || dispute.arbitrator_id !== user.id)
      ) {
        throw new HttpError(403, 'Not authorized to resolve this case');
      }

      const updatedDispute = await this.arbitrationService.resolveCase(
        id,
        resolution,
        resolution_notes,
        user
      );

      res.send({
        status: 'success',
        data: updatedDispute,
        message: 'Case resolved successfully',
      });
    } catch (error: any) {
      logger.error('Error resolving case', { error: error.message, disputeId: req.params.id });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to resolve case');
    }
  }

  public async getArbitrationStats(req: CustomRequest, res: RestanaResponse) {
    try {
      const { from_date, to_date } = req.query as any;
      const user = req.user!;

      if (user.role !== 'admin' && user.role !== 'arbitrator') {
        throw new HttpError(403, 'Admin or arbitrator access required');
      }

      const stats = user.role === 'arbitrator'
        ? await this.arbitrationService.getArbitratorStats(user.id, from_date, to_date)
        : await this.arbitrationService.getArbitrationStats(from_date, to_date);

      res.send({
        status: 'success',
        data: stats,
      });
    } catch (error: any) {
      logger.error('Error getting arbitration stats', { error: error.message });
      throw new HttpError(500, 'Failed to retrieve arbitration statistics');
    }
  }
}