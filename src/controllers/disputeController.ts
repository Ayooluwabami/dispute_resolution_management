import { CustomRequest, RestanaResponse } from '../types';
import { DisputeService } from '../services/disputeService';
import { logger } from '../utils/logger';
import { HttpError } from '../utils/httpError';
import { db } from '../database/connection';

export class DisputeController {
  private disputeService = new DisputeService();

  public getAllDisputes = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { page = '1', limit = '20', status, from_date, to_date } = req.query as any;
      const user = req.user!;

      if (user.role !== 'admin') {
        throw new HttpError(403, 'Admin access required');
      }

      const result = await this.disputeService.getAllDisputes({
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
      logger.error(`Error getting disputes: ${error.message}`);
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to retrieve disputes');
    }
  };

  public getMyDisputes = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { page = '1', limit = '20', status } = req.query as any;
      const user = req.user!;

      const result = await this.disputeService.getUserDisputes(user.email, {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
      });

      res.send({
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      logger.error(`Error getting user disputes: ${error.message}`);
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to retrieve disputes');
    }
  };

  public getDisputeById = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      const dispute = await this.disputeService.getDisputeById(id);

      if (!dispute) {
        throw new HttpError(404, 'Dispute not found');
      }

      if (
        user.role !== 'admin' &&
        dispute.initiator_email !== user.email &&
        dispute.counterparty_email !== user.email
      ) {
        throw new HttpError(403, 'Not authorized to view this dispute');
      }

      res.send({
        status: 'success',
        data: dispute,
      });
    } catch (error: any) {
      logger.error(`Error getting dispute by ID: ${error.message}`, { id: req.params.id });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to retrieve dispute');
    }
  };

  public createDispute = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      logger.info('Starting createDispute', { body: req.body });
      const { transaction_id, dispute_reason, dispute_details, clientEmail, counterpartyEmail, amount } = req.body;
      const user = req.user!;

      if (clientEmail !== user.email) {
        throw new HttpError(403, 'clientEmail must match the API key user email');
      }

      const transaction = await db('transactions').where('id', transaction_id).first();
      if (!transaction) {
        throw new HttpError(404, 'Transaction not found');
      }

      const disputeData = {
        transaction_id,
        initiator_email: clientEmail,
        counterparty_email: counterpartyEmail,
        reason: dispute_reason,
        description: dispute_details,
        amount: amount ? parseFloat(amount) : parseFloat(transaction.amount),
        created_by: user.id,
      };

      const newDispute = await this.disputeService.createDispute(disputeData);

      logger.info('Dispute created successfully', { disputeId: newDispute.id });
      res.send({
        status: 'success',
        data: newDispute,
      }, 201);
    } catch (error: any) {
      logger.error(`Error creating dispute: ${error.message}`, { body: req.body });
      res.send({
        status: 'error',
        message: error.message || 'Failed to create dispute',
      }, error.statusCode || 500);
    }
  };

  public updateDispute = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { id } = req.params;
      const disputeData = req.body;
      const user = req.user!;

      const existingDispute = await this.disputeService.getDisputeById(id);

      if (!existingDispute) {
        throw new HttpError(404, 'Dispute not found');
      }

      if (user.role !== 'admin' && existingDispute.initiator_email !== user.email) {
        throw new HttpError(403, 'Not authorized to update this dispute');
      }

      if (existingDispute.status === 'resolved' && user.role !== 'admin') {
        throw new HttpError(400, 'Cannot update a resolved dispute');
      }

      const updatedDispute = await this.disputeService.updateDispute(id, disputeData, user);

      res.send({
        status: 'success',
        data: updatedDispute,
      });
    } catch (error: any) {
      logger.error(`Error updating dispute: ${error.message}`, { id: req.params.id });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to update dispute');
    }
  };

  public addEvidence = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { id } = req.params;
      const { evidence_type, description } = req.body;
      const file = req.file;
      const user = req.user!;

      if (!file) {
        throw new HttpError(400, 'File is required');
      }

      const dispute = await this.disputeService.getDisputeById(id);
      if (!dispute) {
        throw new HttpError(404, 'Dispute not found');
      }

      if (
        user.role !== 'admin' &&
        dispute.initiator_email !== user.email &&
        dispute.counterparty_email !== user.email
      ) {
        throw new HttpError(403, 'Not authorized to add evidence to this dispute');
      }

      if (dispute.status === 'resolved' || dispute.status === 'rejected' || dispute.status === 'canceled') {
        throw new HttpError(400, 'Cannot add evidence to a finalized dispute');
      }

      const evidenceData = {
        dispute_id: id,
        submitted_by_email: user.email,
        created_by: user.id,
        evidence_type,
        description,
        file_path: file.path,
        file_name: file.originalname,
      };

      const evidence = await this.disputeService.addEvidence(evidenceData);

      res.send({
        status: 'success',
        data: evidence,
      });
    } catch (error: any) {
      logger.error(`Error adding evidence: ${error.message}`, { disputeId: req.params.id });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to add evidence');
    }
  };

  public addComment = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { id } = req.params;
      const { comment, is_private } = req.body;
      const user = req.user!;

      const existingDispute = await this.disputeService.getDisputeById(id);

      if (!existingDispute) {
        throw new HttpError(404, 'Dispute not found');
      }

      const isInvolved =
        existingDispute.initiator_email === user.email ||
        existingDispute.counterparty_email === user.email ||
        user.role === 'admin' ||
        user.role === 'arbitrator';

      if (!isInvolved) {
        throw new HttpError(403, 'Not authorized to comment on this dispute');
      }

      const commentData = {
        dispute_id: id,
        comment,
        created_by: user.id,
        is_private: is_private || false,
      };

      const commentRecord = await this.disputeService.addComment(commentData);

      res.send({
        status: 'success',
        data: commentRecord,
      });
    } catch (error: any) {
      logger.error(`Error adding comment: ${error.message}`, { disputeId: req.params.id });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to add comment');
    }
  };

  public getDisputeHistory = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      const existingDispute = await this.disputeService.getDisputeById(id);

      if (!existingDispute) {
        throw new HttpError(404, 'Dispute not found');
      }

      const isInvolved =
        existingDispute.initiator_email === user.email ||
        existingDispute.counterparty_email === user.email ||
        user.role === 'admin' ||
        user.role === 'arbitrator';

      if (!isInvolved) {
        throw new HttpError(403, 'Not authorized to view this dispute history');
      }

      const history = await this.disputeService.getDisputeHistory(id);

      res.send({
        status: 'success',
        data: history,
      });
    } catch (error: any) {
      logger.error(`Error getting dispute history: ${error.message}`, { disputeId: req.params.id });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to retrieve dispute history');
    }
  };

  public cancelDispute = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      const existingDispute = await this.disputeService.getDisputeById(id);

      if (!existingDispute) {
        throw new HttpError(404, 'Dispute not found');
      }

      if (user.role !== 'admin' && existingDispute.initiator_email !== user.email) {
        throw new HttpError(403, 'Not authorized to cancel this dispute');
      }

      if (existingDispute.status === 'resolved' || existingDispute.status === 'rejected') {
        throw new HttpError(400, 'Cannot cancel a dispute that is already resolved or rejected');
      }

      const updatedDispute = await this.disputeService.cancelDispute(id, user);

      res.send({
        status: 'success',
        data: updatedDispute,
        message: 'Dispute cancelled successfully',
      });
    } catch (error: any) {
      logger.error(`Error cancelling dispute: ${error.message}`, { disputeId: req.params.id });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to cancel dispute');
    }
  };

  public getDisputeStats = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { from_date, to_date } = req.query as any;
      const user = req.user!;

      if (user.role !== 'admin') {
        throw new HttpError(403, 'Admin access required');
      }

      const stats = await this.disputeService.getDisputeStats(from_date, to_date);

      res.send({
        status: 'success',
        data: stats,
      });
    } catch (error: any) {
      logger.error(`Error getting dispute stats: ${error.message}`);
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to retrieve dispute statistics');
    }
  };
}