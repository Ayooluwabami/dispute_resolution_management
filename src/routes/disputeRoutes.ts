import { CustomRequest, RestanaResponse } from '../types';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';
import { db } from '../database/connection';
import { validateRequest } from '../middleware/validation';
import { disputeValidation } from '../validation/disputeValidation';
import { upload } from '../utils/fileUpload';

export default function disputeRoutes(app: any, prefix: string) {
  // Get All Disputes (Admin only)
  app.get(`${prefix}/`, async (req: CustomRequest, res: RestanaResponse) => {
    try {
      if (req.user!.role !== 'admin') {
        throw new HttpError(403, 'Admin access required');
      }
      const disputes = await db('disputes').select('*');
      res.send({ status: 'success', data: disputes });
    } catch (error: any) {
      logger.error('Error fetching disputes', { error: error.message });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to fetch disputes');
    }
  });

  // Get My Disputes (User or Admin)
  app.get(`${prefix}/my`, async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const disputes = await db('disputes')
        .where({ initiator_email: req.user!.email })
        .orWhere({ counterparty_email: req.user!.email })
        .select('*');
      res.send({ status: 'success', data: disputes });
    } catch (error: any) {
      logger.error('Error fetching my disputes', { error: error.message });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to fetch disputes');
    }
  });

  // Get Dispute by ID
  app.get(`${prefix}/:id`, async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { id } = req.params;
      const dispute = await db('disputes').where({ id }).first();
      if (!dispute) {
        throw new HttpError(404, 'Dispute not found');
      }
      if (
        req.user!.role !== 'admin' &&
        dispute.initiator_email !== req.user!.email &&
        dispute.counterparty_email !== req.user!.email
      ) {
        throw new HttpError(403, 'Access denied');
      }
      res.send({ status: 'success', data: dispute });
    } catch (error: any) {
      logger.error('Error fetching dispute', { error: error.message });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to fetch dispute');
    }
  });

  // Create Dispute
  app.post(
    `${prefix}/`,
    validateRequest(disputeValidation.createDispute),
    async (req: CustomRequest, res: RestanaResponse) => {
      try {
        const { transactionId, reason, description, amount, clientEmail, counterpartyEmail } = req.body;
        const user = req.user!;

        const transaction = await db('transactions').where({ id: transactionId }).first();
        if (!transaction) {
          throw new HttpError(404, 'Transaction not found');
        }

        const [dispute] = await db('disputes')
          .insert({
            transaction_id: transactionId,
            initiator_email: clientEmail,
            counterparty_email: counterpartyEmail,
            reason,
            description,
            amount,
            status: 'pending',
            created_by: user.id,
          })
          .returning('*');

        res.send({ status: 'success', data: dispute }, 201);
      } catch (error: any) {
        logger.error('Error creating dispute', { error: error.message });
        throw error instanceof HttpError ? error : new HttpError(500, 'Failed to create dispute');
      }
    }
  );

  // Update Dispute (Admin only)
  app.put(
    `${prefix}/:id`,
    validateRequest(disputeValidation.updateDispute),
    async (req: CustomRequest, res: RestanaResponse) => {
      try {
        if (req.user!.role !== 'admin') {
          throw new HttpError(403, 'Admin access required');
        }
        const { id } = req.params;
        const { status, resolution } = req.body;

        const updated = await db('disputes').where({ id }).update({ status, resolution });
        if (!updated) {
          throw new HttpError(404, 'Dispute not found');
        }

        const dispute = await db('disputes').where({ id }).first();
        res.send({ status: 'success', data: dispute });
      } catch (error: any) {
        logger.error('Error updating dispute', { error: error.message });
        throw error instanceof HttpError ? error : new HttpError(500, 'Failed to update dispute');
      }
    }
  );

  // Add Evidence
  app.post(
    `${prefix}/:id/evidence`,
    upload.single('file'),
    validateRequest(disputeValidation.addEvidence),
    async (req: CustomRequest, res: RestanaResponse) => {
      try {
        const { id } = req.params;
        const dispute = await db('disputes').where({ id }).first();
        if (!dispute) {
          throw new HttpError(404, 'Dispute not found');
        }
        if (
          req.user!.role !== 'admin' &&
          dispute.initiator_email !== req.user!.email &&
          dispute.counterparty_email !== req.user!.email
        ) {
          throw new HttpError(403, 'Access denied');
        }

        const file = req.file;
        if (!file) {
          throw new HttpError(400, 'File is required');
        }

        const [evidence] = await db('evidence')
          .insert({
            dispute_id: id,
            file_path: file.path,
            file_name: file.originalname,
            uploaded_by: req.user!.id,
          })
          .returning('*');

        res.send({ status: 'success', data: evidence });
      } catch (error: any) {
        logger.error('Error adding evidence', { error: error.message });
        throw error instanceof HttpError ? error : new HttpError(500, 'Failed to add evidence');
      }
    }
  );

  // Add Comment
  app.post(
    `${prefix}/:id/comment`,
    validateRequest(disputeValidation.addComment),
    async (req: CustomRequest, res: RestanaResponse) => {
      try {
        const { id } = req.params;
        const { comment } = req.body;
        const dispute = await db('disputes').where({ id }).first();
        if (!dispute) {
          throw new HttpError(404, 'Dispute not found');
        }
        if (
          req.user!.role !== 'admin' &&
          dispute.initiator_email !== req.user!.email &&
          dispute.counterparty_email !== req.user!.email
        ) {
          throw new HttpError(403, 'Access denied');
        }

        const [commentRecord] = await db('comments')
          .insert({
            dispute_id: id,
            comment,
            created_by: req.user!.id,
          })
          .returning('*');

        res.send({ status: 'success', data: commentRecord });
      } catch (error: any) {
        logger.error('Error adding comment', { error: error.message });
        throw error instanceof HttpError ? error : new HttpError(500, 'Failed to add comment');
      }
    }
  );

  // Get Dispute History
  app.get(`${prefix}/:id/history`, async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { id } = req.params;
      const dispute = await db('disputes').where({ id }).first();
      if (!dispute) {
        throw new HttpError(404, 'Dispute not found');
      }
      if (
        req.user!.role !== 'admin' &&
        dispute.initiator_email !== req.user!.email &&
        dispute.counterparty_email !== req.user!.email
      ) {
        throw new HttpError(403, 'Access denied');
      }

      const history = await db('dispute_history').where({ dispute_id: id }).select('*');
      res.send({ status: 'success', data: history });
    } catch (error: any) {
      logger.error('Error fetching dispute history', { error: error.message });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to fetch dispute history');
    }
  });

  // Cancel Dispute
  app.post(`${prefix}/:id/cancel`, async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { id } = req.params;
      const dispute = await db('disputes').where({ id }).first();
      if (!dispute) {
        throw new HttpError(404, 'Dispute not found');
      }
      if (
        req.user!.role !== 'admin' &&
        dispute.initiator_email !== req.user!.email
      ) {
        throw new HttpError(403, 'Only admin or initiator can cancel');
      }

      await db('disputes').where({ id }).update({ status: 'cancelled' });
      res.send({ status: 'success', message: 'Dispute cancelled' });
    } catch (error: any) {
      logger.error('Error cancelling dispute', { error: error.message });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to cancel dispute');
    }
  });

  // Get Dispute Stats (Admin only)
  app.get(`${prefix}/stats`, async (req: CustomRequest, res: RestanaResponse) => {
    try {
      if (req.user!.role !== 'admin') {
        throw new HttpError(403, 'Admin access required');
      }

      const stats = await db('disputes')
        .select('status')
        .count('id as count')
        .groupBy('status');

      res.send({ status: 'success', data: stats });
    } catch (error: any) {
      logger.error('Error fetching dispute stats', { error: error.message });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to fetch dispute stats');
    }
  });
}