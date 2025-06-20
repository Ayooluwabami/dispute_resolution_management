import { db } from '../database/connection';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';
import { emailService } from '../services/emailService';
import { redisService } from '../services/redisService';
import { v4 as uuidv4 } from 'uuid';

export class ArbitrationService {
  public async getArbitrationCases(params: any) {
    try {
      const { page = '1', limit = '20', status, fromDate, toDate, businessId } = params;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      const query = db('disputes')
        .leftJoin('api_keys as arbitrator', 'disputes.arbitrator_id', 'arbitrator.id');

      if (businessId) {
        query.where('disputes.business_id', businessId);
      }

      if (status) {
        query.where('disputes.status', status);
      }

      if (fromDate) {
        query.where('disputes.created_at', '>=', fromDate);
      }

      if (toDate) {
        query.where('disputes.created_at', '<=', toDate);
      }

      const [count] = await db('disputes')
        .where(businessId ? { business_id: businessId } : {})
        .count('id as total');

      const disputes = await query
        .select(
          'disputes.*',
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
      logger.error(`Error getting arbitration cases: ${error.message}`, { stack: error.stack });
      throw new HttpError(500, 'Database error while fetching arbitration cases');
    }
  }

  public async getArbitrationCaseById(id: string, businessId: string | null) {
    try {
      const cacheKey = `arbitration_case:${id}`;
      const cached = await redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const query = db('disputes')
        .leftJoin('api_keys as arbitrator', 'disputes.arbitrator_id', 'arbitrator.id')
        .where('disputes.id', id);

      if (businessId) {
        query.andWhere('disputes.business_id', businessId);
      }

      const dispute = await query
        .select(
          'disputes.*',
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

        if (arbitrator.role !== 'user') {
          throw new HttpError(400, 'Selected user must be a business');
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
          id: uuidv4(),
          dispute_id: id,
          created_by: user.id,
          action: 'arbitrator_assigned',
          details: `Arbitrator assigned: ${arbitrator.email}`,
          action_date: db.fn.now(),
        });

        await emailService.sendEmail({
          email: arbitrator.email,
          subject: 'New Arbitration Case Assigned',
          message: `You have been assigned to arbitrate dispute ${id}. Please review the case details in the platform.`,
        });

        return id;
      });

      await redisService.delete(`arbitration_case:${result}`);
      return await this.getArbitrationCaseById(result, null);
    } catch (error: any) {
      logger.error(`Error assigning arbitrator: ${error.message}`, { disputeId: id, stack: error.stack });
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, 'Database error while assigning arbitrator');
    }
  }

  public async getArbitrationStats(fromDate?: string, toDate?: string, businessId?: string) {
    try {
      const cacheKey = `arbitration_stats:${businessId || 'all'}:${fromDate || 'all'}:${toDate || 'all'}`;
      const cached = await redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const query = db('disputes');

      if (businessId) {
        query.where('business_id', businessId);
      }

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
      };

      await redisService.setOTP(cacheKey, JSON.stringify(result), 3600); // Cache for 1 hour
      return result;
    } catch (error: any) {
      logger.error(`Error getting arbitration stats: ${error.message}`, { stack: error.stack });
      throw new HttpError(500, 'Database error while calculating arbitration statistics');
    }
  }
}