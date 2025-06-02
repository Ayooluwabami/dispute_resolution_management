import { db } from '../database/connection';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';
import { emailService } from '../services/emailService';
import { redisService } from '../services/redisService';

export class ArbitrationService {
  public async getAllArbitrationCases(params: any) {
    try {
      const { page = '1', limit = '20', status, fromDate, toDate } = params;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      const query = db('disputes')
        .join('transactions', 'disputes.transaction_id', 'transactions.id')
        .leftJoin('api_keys as arbitrator', 'disputes.arbitrator_id', 'arbitrator.id');

      if (status) {
        query.where('disputes.status', status);
      }

      if (fromDate) {
        query.where('disputes.created_at', '>=', fromDate);
      }

      if (toDate) {
        query.where('disputes.created_at', '<=', toDate);
      }

      const [count] = await db('disputes').count('id as total');
      const disputes = await query
        .select(
          'disputes.*',
          'transactions.session_id',
          'transactions.amount',
          'transactions.source_account_name',
          'transactions.source_bank',
          'transactions.beneficiary_account_name',
          'transactions.beneficiary_bank',
          'arbitrator.email as arbitrator_email',
          'arbitrator.role as arbitrator_role'
        )
        .limit(limitNum)
        .offset(offset)
        .orderBy('disputes.created_at', 'desc');

      return {
        data: disputes,
        pagination: {
          total: parseInt(count.total as string),
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(parseInt(count.total as string) / limitNum),
        },
      };
    } catch (error: any) {
      logger.error(`Error getting all arbitration cases: ${error.message}`, { stack: error.stack });
      throw new HttpError(500, 'Database error while fetching arbitration cases');
    }
  }

  public async getArbitratorCases(arbitratorId: string, params: any) {
    try {
      const { page = '1', limit = '20', status, fromDate, toDate } = params;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      const query = db('disputes')
        .join('transactions', 'disputes.transaction_id', 'transactions.id')
        .leftJoin('api_keys as arbitrator', 'disputes.arbitrator_id', 'arbitrator.id')
        .where(function () {
          this.where('disputes.arbitrator_id', arbitratorId)
            .orWhereNull('disputes.arbitrator_id')
            .andWhere('disputes.status', 'open');
        });

      if (status) {
        query.where('disputes.status', status);
      }

      if (fromDate) {
        query.where('disputes.created_at', '>=', fromDate);
      }

      if (toDate) {
        query.where('disputes.created_at', '<=', toDate);
      }

      const countQuery = db('disputes').where(function () {
        this.where('arbitrator_id', arbitratorId)
          .orWhereNull('arbitrator_id')
          .andWhere('status', 'open');
      });

      if (status) {
        countQuery.where('status', status);
      }

      if (fromDate) {
        countQuery.where('created_at', '>=', fromDate);
      }

      if (toDate) {
        countQuery.where('created_at', '<=', toDate);
      }

      const [count] = await countQuery.count('id as total');
      const disputes = await query
        .select(
          'disputes.*',
          'transactions.session_id',
          'transactions.amount',
          'transactions.source_account_name',
          'transactions.source_bank',
          'transactions.beneficiary_account_name',
          'transactions.beneficiary_bank',
          'arbitrator.email as arbitrator_email',
          'arbitrator.role as arbitrator_role'
        )
        .limit(limitNum)
        .offset(offset)
        .orderBy('disputes.created_at', 'desc');

      return {
        data: disputes,
        pagination: {
          total: parseInt(count.total as string),
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(parseInt(count.total as string) / limitNum),
        },
      };
    } catch (error: any) {
      logger.error(`Error getting arbitrator cases: ${error.message}`, { arbitratorId, stack: error.stack });
      throw new HttpError(500, 'Database error while fetching arbitrator cases');
    }
  }

  public async getArbitrationCaseById(id: string) {
    try {
      const cacheKey = `arbitration_case:${id}`;
      const cached = await redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const dispute = await db('disputes')
        .join('transactions', 'disputes.transaction_id', 'transactions.id')
        .leftJoin('api_keys as arbitrator', 'disputes.arbitrator_id', 'arbitrator.id')
        .where('disputes.id', id)
        .select(
          'disputes.*',
          'transactions.session_id',
          'transactions.amount',
          'transactions.source_account_name',
          'transactions.source_bank',
          'transactions.beneficiary_account_name',
          'transactions.beneficiary_bank',
          'transactions.status as transaction_status',
          'arbitrator.email as arbitrator_email',
          'arbitrator.role as arbitrator_role'
        )
        .first();

      if (!dispute) {
        throw new HttpError(404, 'Arbitration case not found');
      }

      const evidence = await db('evidence')
        .where('dispute_id', id)
        .select('*')
        .orderBy('created_at', 'desc');

      const comments = await db('comments')
        .where('dispute_id', id)
        .select('*')
        .orderBy('created_at', 'desc');

      const history = await db('dispute_history')
        .where('dispute_id', id)
        .select('*')
        .orderBy('action_date', 'desc');

      const result = {
        ...dispute,
        evidence,
        comments,
        history,
      };

      await redisService.setOTP(cacheKey, JSON.stringify(result), 600); // Cache for 10 minutes
      return result;
    } catch (error: any) {
      logger.error(`Error getting arbitration case by ID: ${error.message}`, { disputeId: id, stack: error.stack });
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, 'Database error while fetching arbitration case');
    }
  }

  public async assignArbitrator(id: string, arbitratorId: string, user: any) {
    try {
      const result = await db.transaction(async (trx) => {
        const dispute = await trx('disputes').where('id', id).first();

        if (!dispute) {
          throw new HttpError(404, 'Dispute not found');
        }

        const arbitrator = await trx('api_keys').where('id', arbitratorId).first();

        if (!arbitrator) {
          throw new HttpError(404, 'Arbitrator not found');
        }

        if (arbitrator.role !== 'arbitrator' && arbitrator.role !== 'admin') {
          throw new HttpError(400, 'Selected user is not an arbitrator');
        }

        if (
          dispute.status === 'resolved' ||
          dispute.status === 'rejected' ||
          dispute.status === 'canceled'
        ) {
          throw new HttpError(400, 'Cannot assign arbitrator to a finalized dispute');
        }

        await trx('disputes').where('id', id).update({
          arbitrator_id: arbitratorId,
          updated_at: db.fn.now(),
        });

        await trx('dispute_history').insert({
          dispute_id: id,
          created_by: user.id,
          action: 'arbitrator_assigned',
          details: `Arbitrator assigned: ${arbitrator.email}`,
          action_date: db.fn.now(),
        });

        // Send email to arbitrator
        await emailService.sendEmail({
          email: arbitrator.email,
          subject: 'New Arbitration Case Assigned',
          message: `You have been assigned to arbitrate dispute ${id}. Please review the case details in the platform.`,
        });

        return id;
      });

      // Invalidate cache
      await redisService.delete(`arbitration_case:${result}`);
      return await this.getArbitrationCaseById(result);
    } catch (error: any) {
      logger.error(`Error assigning arbitrator: ${error.message}`, { disputeId: id, stack: error.stack });
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, 'Database error while assigning arbitrator');
    }
  }

  public async reviewCase(id: string, notes: string, user: any) {
    try {
      const result = await db.transaction(async (trx) => {
        const dispute = await trx('disputes').where('id', id).first();

        if (!dispute) {
          throw new HttpError(404, 'Dispute not found');
        }

        if (user.role !== 'admin' && (dispute.arbitrator_id === null || dispute.arbitrator_id !== user.id)) {
          throw new HttpError(403, 'Not authorized to review this case');
        }

        if (dispute.status !== 'open' && dispute.status !== 'under_review') {
          throw new HttpError(400, 'Dispute cannot be reviewed in its current state');
        }

        await trx('disputes').where('id', id).update({
          status: 'under_review',
          updated_at: db.fn.now(),
        });

        await trx('dispute_history').insert({
          dispute_id: id,
          created_by: user.id,
          action: 'review_started',
          details: notes || 'Case review started',
          action_date: db.fn.now(),
        });

        if (notes && notes.trim()) {
          await trx('comments').insert({
            dispute_id: id,
            created_by: user.id,
            comment: notes,
            is_private: true,
            created_at: db.fn.now(),
          });
        }

        return id;
      });

      // Invalidate cache
      await redisService.delete(`arbitration_case:${result}`);
      return await this.getArbitrationCaseById(result);
    } catch (error: any) {
      logger.error(`Error reviewing case: ${error.message}`, { disputeId: id, stack: error.stack });
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, 'Database error while reviewing case');
    }
  }

  public async resolveCase(id: string, resolution: string, resolutionNotes: string, user: any) {
    try {
      const result = await db.transaction(async (trx) => {
        const dispute = await trx('disputes').where('id', id).first();

        if (!dispute) {
          throw new HttpError(404, 'Dispute not found');
        }

        if (user.role !== 'admin' && (dispute.arbitrator_id === null || dispute.arbitrator_id !== user.id)) {
          throw new HttpError(403, 'Not authorized to resolve this case');
        }

        if (dispute.status === 'resolved' || dispute.status === 'rejected' || dispute.status === 'canceled') {
          throw new HttpError(400, 'Dispute is already finalized');
        }

        const validResolutions = ['in_favor_of_initiator', 'in_favor_of_respondent', 'partial'];
        if (!validResolutions.includes(resolution)) {
          throw new HttpError(400, 'Invalid resolution value');
        }

        await trx('disputes').where('id', id).update({
          status: 'resolved',
          resolution,
          resolution_notes: resolutionNotes,
          resolution_date: db.fn.now(),
          updated_at: db.fn.now(),
        });

        await trx('dispute_history').insert({
          dispute_id: id,
          created_by: user.id,
          action: 'resolved',
          details: `Case resolved: ${resolution.replace(/_/g, ' ')}`,
          action_date: db.fn.now(),
        });

        let transactionStatus = 'completed';
        if (resolution === 'in_favor_of_initiator') {
          transactionStatus = 'failed';
        }

        await trx('transactions').where('id', dispute.transaction_id).update({
          status: transactionStatus,
          updated_at: db.fn.now(),
        });

        await trx('comments').insert({
          dispute_id: id,
          created_by: user.id,
          comment: resolutionNotes || `Case resolved: ${resolution.replace(/_/g, ' ')}`,
          is_private: false,
          created_at: db.fn.now(),
        });

        // Send email notifications
        const arbitrator = await trx('api_keys').where('id', dispute.arbitrator_id).first();
        await Promise.all([
          emailService.sendEmail({
            email: dispute.initiator_email,
            subject: 'Dispute Resolution',
            message: `Dispute ${id} has been resolved: ${resolution.replace(/_/g, ' ')}. Notes: ${resolutionNotes}`,
          }),
          emailService.sendEmail({
            email: dispute.counterparty_email,
            subject: 'Dispute Resolution',
            message: `Dispute ${id} has been resolved: ${resolution.replace(/_/g, ' ')}. Notes: ${resolutionNotes}`,
          }),
          arbitrator &&
            emailService.sendEmail({
              email: arbitrator.email,
              subject: 'Dispute Resolution',
              message: `Dispute ${id} you arbitrated has been resolved: ${resolution.replace(/_/g, ' ')}. Notes: ${resolutionNotes}`,
            }),
        ]);

        return id;
      });

      // Invalidate cache
      await redisService.delete(`arbitration_case:${result}`);
      return await this.getArbitrationCaseById(result);
    } catch (error: any) {
      logger.error(`Error resolving case: ${error.message}`, { disputeId: id, stack: error.stack });
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, 'Database error while resolving case');
    }
  }

  public async getArbitrationStats(fromDate?: string, toDate?: string) {
    try {
      const cacheKey = `arbitration_stats:${fromDate || 'all'}:${toDate || 'all'}`;
      const cached = await redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const query = db('disputes');

      if (fromDate) {
        query.where('created_at', '>=', fromDate);
      }

      if (toDate) {
        query.where('created_at', '<=', toDate);
      }

      const [totalCount] = await query.clone().count('id as count');
      const statusCounts = await query.clone().select('status').count('id as count').groupBy('status');
      const resolutionCounts = await query
        .clone()
        .select('resolution')
        .count('id as count')
        .groupBy('resolution');
      const avgResolutionTime = await query
        .clone()
        .whereNotNull('resolution_date')
        .whereNotNull('created_at')
        .select(db.raw('AVG(TIMESTAMPDIFF(HOUR, created_at, resolution_date)) as avg_hours'))
        .first();

      const arbitratorPerformance = await db('disputes')
        .leftJoin('api_keys as arbitrator', 'disputes.arbitrator_id', 'arbitrator.id')
        .whereNotNull('disputes.arbitrator_id')
        .select('arbitrator.id', 'arbitrator.email')
        .count('disputes.id as total_cases')
        .sum(db.raw('CASE WHEN disputes.status = "resolved" THEN 1 ELSE 0 END as resolved_cases'))
        .avg(
          db.raw('TIMESTAMPDIFF(HOUR, disputes.created_at, disputes.resolution_date) as avg_resolution_time')
        )
        .groupBy('arbitrator.id', 'arbitrator.email')
        .orderBy('total_cases', 'desc');

      const result = {
        totalDisputes: parseInt(totalCount.count as string),
        statusBreakdown: {
          open: parseInt(statusCounts.find((s) => s.status === 'open')?.count as string) || 0,
          under_review:
            parseInt(statusCounts.find((s) => s.status === 'under_review')?.count as string) || 0,
          resolved: parseInt(statusCounts.find((s) => s.status === 'resolved')?.count as string) || 0,
          rejected: parseInt(statusCounts.find((s) => s.status === 'rejected')?.count as string) || 0,
          canceled: parseInt(statusCounts.find((s) => s.status === 'canceled')?.count as string) || 0,
        },
        resolutionBreakdown: {
          pending: parseInt(resolutionCounts.find((r) => !r.resolution)?.count as string) || 0,
          in_favor_of_initiator:
            parseInt(
              resolutionCounts.find((r) => r.resolution === 'in_favor_of_initiator')?.count as string
            ) || 0,
          in_favor_of_respondent:
            parseInt(
              resolutionCounts.find((r) => r.resolution === 'in_favor_of_respondent')?.count as string
            ) || 0,
          partial: parseInt(resolutionCounts.find((r) => r.resolution === 'partial')?.count as string) || 0,
        },
        averageResolutionTimeHours: parseFloat(avgResolutionTime?.avg_hours as string) || 0,
        arbitratorPerformance,
      };

      await redisService.setOTP(cacheKey, JSON.stringify(result), 3600); // Cache for 1 hour
      return result;
    } catch (error: any) {
      logger.error(`Error getting arbitration stats: ${error.message}`, { stack: error.stack });
      throw new HttpError(500, 'Database error while calculating arbitration statistics');
    }
  }

  public async getArbitratorStats(arbitratorId: string, fromDate?: string, toDate?: string) {
    try {
      const cacheKey = `arbitrator_stats:${arbitratorId}:${fromDate || 'all'}:${toDate || 'all'}`;
      const cached = await redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const query = db('disputes').where('arbitrator_id', arbitratorId);

      if (fromDate) {
        query.where('created_at', '>=', fromDate);
      }

      if (toDate) {
        query.where('created_at', '<=', toDate);
      }

      const [totalCount] = await query.clone().count('id as count');
      const statusCounts = await query.clone().select('status').count('id as count').groupBy('status');
      const resolutionCounts = await query
        .clone()
        .select('resolution')
        .count('id as count')
        .groupBy('resolution');
      const avgResolutionTime = await query
        .clone()
        .whereNotNull('resolution_date')
        .whereNotNull('created_at')
        .select(db.raw('AVG(TIMESTAMPDIFF(HOUR, created_at, resolution_date)) as avg_hours'))
        .first();

      const pendingCount = await db('disputes')
        .where('arbitrator_id', arbitratorId)
        .whereNot('status', 'resolved')
        .whereNot('status', 'rejected')
        .whereNot('status', 'canceled')
        .count('id as count')
        .first();

      const result = {
        totalAssignedDisputes: parseInt(totalCount.count as string),
        pendingDisputes: parseInt(pendingCount?.count as string) || 0,
        statusBreakdown: {
          open: parseInt(statusCounts.find((s) => s.status === 'open')?.count as string) || 0,
          under_review:
            parseInt(statusCounts.find((s) => s.status === 'under_review')?.count as string) || 0,
          resolved: parseInt(statusCounts.find((s) => s.status === 'resolved')?.count as string) || 0,
          rejected: parseInt(statusCounts.find((s) => s.status === 'rejected')?.count as string) || 0,
          canceled: parseInt(statusCounts.find((s) => s.status === 'canceled')?.count as string) || 0,
        },
        resolutionBreakdown: {
          pending: parseInt(resolutionCounts.find((r) => !r.resolution)?.count as string) || 0,
          in_favor_of_initiator:
            parseInt(
              resolutionCounts.find((r) => r.resolution === 'in_favor_of_initiator')?.count as string
            ) || 0,
          in_favor_of_respondent:
            parseInt(
              resolutionCounts.find((r) => r.resolution === 'in_favor_of_respondent')?.count as string
            ) || 0,
          partial: parseInt(resolutionCounts.find((r) => r.resolution === 'partial')?.count as string) || 0,
        },
        averageResolutionTimeHours: parseFloat(avgResolutionTime?.avg_hours as string) || 0,
      };

      await redisService.setOTP(cacheKey, JSON.stringify(result), 3600); // Cache for 1 hour
      return result;
    } catch (error: any) {
      logger.error(`Error getting arbitrator stats: ${error.message}`, { arbitratorId, stack: error.stack });
      throw new HttpError(500, 'Database error while calculating arbitrator statistics');
    }
  }
}