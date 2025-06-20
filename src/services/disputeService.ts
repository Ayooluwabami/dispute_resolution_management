import { db } from '../database/connection';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';
import { emailService } from '../services/emailService';
import { redisService } from '../services/redisService';
import { v4 as uuidv4 } from 'uuid';

export class DisputeService {
  public async createDispute(disputeData: any) {
    try {
      const result = await db.transaction(async (trx) => {
        if (disputeData.transaction_id) {
          const existingDispute = await trx('disputes')
            .where({ transaction_id: disputeData.transaction_id, business_id: disputeData.business_id })
            .first();
          if (existingDispute) {
            throw new HttpError(409, 'Dispute already exists for this transaction ID');
          }
        }

        const disputeId = uuidv4();
        await trx('disputes').insert({
          id: disputeId,
          transaction_id: disputeData.transaction_id || null,
          business_id: disputeData.business_id,
          initiator_email: disputeData.initiator_email,
          counterparty_email: disputeData.counterparty_email,
          initiator_profile_id: disputeData.initiator_profile_id,
          counterparty_profile_id: disputeData.counterparty_profile_id,
          reason: disputeData.reason || null,
          amount: disputeData.amount || null,
          session_id: disputeData.session_id || null,
          source_account_name: disputeData.source_account_name || null,
          source_bank: disputeData.source_bank || null,
          beneficiary_account_name: disputeData.beneficiary_account_name || null,
          beneficiary_bank: disputeData.beneficiary_bank || null,
          status: 'open',
          created_by: disputeData.apiKeyId,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        });

        await trx('dispute_history').insert({
          id: uuidv4(),
          dispute_id: disputeId,
          created_by: disputeData.apiKeyId,
          action: 'created',
          details: 'Dispute created',
          action_date: db.fn.now(),
        });

        if (disputeData.evidence) {
          const evidenceId = uuidv4();
          await trx('evidence').insert({
            id: evidenceId,
            dispute_id: disputeId,
            submitted_by: disputeData.evidence.submitted_by,
            evidence_type: disputeData.evidence.type,
            description: disputeData.evidence.description,
            file_path: disputeData.evidence.file_path,
            file_name: disputeData.evidence.file_name,
            created_at: db.fn.now(),
            updated_at: db.fn.now(),
          });

          await trx('dispute_history').insert({
            id: uuidv4(),
            dispute_id: disputeId,
            created_by: disputeData.apiKeyId,
            action: 'evidence_added',
            details: `Evidence added: ${disputeData.evidence.description}`,
            action_date: db.fn.now(),
          });
        }

        await Promise.all([
          emailService.sendEmail({
            email: disputeData.initiator_email,
            subject: 'Dispute Created',
            message: `You have created a dispute with ID ${disputeId}. Reason: ${disputeData.reason || 'No reason provided'}`,
          }),
          emailService.sendEmail({
            email: disputeData.counterparty_email,
            subject: 'Dispute Notification',
            message: `A dispute with ID ${disputeId} has been raised against you. Reason: ${disputeData.reason || 'No reason provided'}`,
          }),
        ]);

        return disputeId;
      });

      return await this.getDisputeById(result, disputeData.business_id);
    } catch (error: any) {
      logger.error(`Error creating dispute: ${error.message}`, { disputeData });
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, 'Database error while creating dispute');
    }
  }

  public async getAllDisputes(params: any) {
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

      const countQuery = db('disputes');
      if (businessId) {
        countQuery.where('business_id', businessId);
      }
      const [count] = await countQuery.count('id as total');

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
          total: parseInt(String(count.total)),
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(parseInt(String(count.total)) / limitNum),
        },
      };
    } catch (error: any) {
      logger.error(`Error getting all disputes: ${error.message}`);
      throw new HttpError(500, 'Database error while fetching disputes');
    }
  }

  public async getUserDisputes(email: string, params: any) {
    try {
      const { page = '1', limit = '20', status, businessId } = params;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      const query = db('disputes')
        .leftJoin('api_keys as arbitrator', 'disputes.arbitrator_id', 'arbitrator.id');

      if (businessId) {
        query.where('disputes.business_id', businessId);
      }

      query.andWhere(function () {
        this.where('disputes.initiator_email', email).orWhere('disputes.counterparty_email', email);
      });

      if (status) {
        query.where('disputes.status', status);
      }

      const countQuery = db('disputes');
      if (businessId) {
        countQuery.where('business_id', businessId);
      }
      countQuery.andWhere(function () {
        this.where('initiator_email', email).orWhere('counterparty_email', email);
      });
      const [count] = await countQuery.count('id as total');

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
          total: parseInt(String(count.total)),
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(parseInt(String(count.total)) / limitNum),
        },
      };
    } catch (error: any) {
      logger.error(`Error getting user disputes: ${error.message}`, { email });
      throw new HttpError(500, 'Database error while fetching user disputes');
    }
  }

  public async getDisputeById(id: string, businessId: string | null) {
    try {
      const cacheKey = `dispute:${id}`;
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
        throw new HttpError(404, 'Dispute not found');
      }

      const evidence = await db('evidence')
        .where('dispute_id', id)
        .select('*')
        .orderBy('created_at', 'desc');

      const comments = await db('comments')
        .where('dispute_id', id)
        .select('*')
        .orderBy('created_at', 'desc');

      const result = {
        ...dispute,
        evidence,
        comments,
      };

      await redisService.setOTP(cacheKey, JSON.stringify(result), 600); // Cache for 10 minutes
      return result;
    } catch (error: any) {
      logger.error(`Error getting dispute by ID: ${error.message}`, { disputeId: id });
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, 'Database error while fetching dispute');
    }
  }

  public async getDisputesByProfileId(profileId: string, params: any) {
    try {
      const { page = '1', limit = '20', status, businessId } = params;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      const query = db('disputes')
        .leftJoin('api_keys as arbitrator', 'disputes.arbitrator_id', 'arbitrator.id');

      if (businessId) {
        query.where('disputes.business_id', businessId);
      }

      query.andWhere(function () {
        this.where('disputes.initiator_profile_id', profileId)
          .orWhere('disputes.counterparty_profile_id', profileId);
      });

      if (status) {
        query.where('disputes.status', status);
      }

      const countQuery = db('disputes');
      if (businessId) {
        countQuery.where('business_id', businessId);
      }
      countQuery.andWhere(function () {
        this.where('initiator_profile_id', profileId)
          .orWhere('counterparty_profile_id', profileId);
      });
      const [count] = await countQuery.count('id as total');

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
          total: parseInt(String(count.total)),
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(parseInt(String(count.total)) / limitNum),
        },
      };
    } catch (error: any) {
      logger.error(`Error getting disputes by profile ID: ${error.message}`, { profileId });
      throw new HttpError(500, 'Database error while fetching disputes');
    }
  }

  public async updateDispute(id: string, disputeData: any, user: any, businessId: string | null) {
    try {
      const result = await db.transaction(async (trx) => {
        const query = trx('disputes').where('id', id);
        if (businessId) {
          query.andWhere('business_id', businessId);
        }
        const dispute = await query.first();

        if (!dispute) {
          throw new HttpError(404, 'Dispute not found');
        }

        if (user.role === 'user') {
          delete disputeData.resolution;
          delete disputeData.arbitrator_id;
          delete disputeData.resolution_notes;
          delete disputeData.action;
          delete disputeData.date_treated;
        }

        if (dispute.status === 'resolved' || dispute.status === 'rejected' || dispute.status === 'canceled') {
          throw new HttpError(400, 'Cannot update a finalized dispute');
        }

        await trx('disputes').where('id', id).update({
          ...disputeData,
          updated_at: db.fn.now(),
        });

        await trx('dispute_history').insert({
          id: uuidv4(),
          dispute_id: id,
          created_by: user.id,
          action: 'updated',
          details: 'Dispute details updated',
          action_date: db.fn.now(),
        });

        return id;
      });

      await redisService.delete(`dispute:${result}`);
      return await this.getDisputeById(result, businessId);
    } catch (error: any) {
      logger.error(`Error updating dispute: ${error.message}`, { disputeId: id });
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, 'Database error while updating dispute');
    }
  }

  public async addEvidence(evidenceData: any) {
    try {
      const result = await db.transaction(async (trx) => {
        const dispute = await trx('disputes').where('id', evidenceData.dispute_id).first();

        if (!dispute) {
          throw new HttpError(404, 'Dispute not found');
        }

        if (dispute.status === 'resolved' || dispute.status === 'rejected' || dispute.status === 'canceled') {
          throw new HttpError(400, 'Cannot add evidence to a finalized dispute');
        }

        const evidenceId = uuidv4();
        await trx('evidence').insert({
          id: evidenceId,
          dispute_id: evidenceData.dispute_id,
          submitted_by: evidenceData.submitted_by,
          file_path: evidenceData.file_path,
          file_name: evidenceData.file_name,
          evidence_type: evidenceData.evidence_type,
          description: evidenceData.description,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        });

        await trx('dispute_history').insert({
          id: uuidv4(),
          dispute_id: evidenceData.dispute_id,
          created_by: evidenceData.apiKeyId,
          action: 'evidence_added',
          details: `Evidence added: ${evidenceData.description}`,
          action_date: db.fn.now(),
        });

        const evidence = await trx('evidence').where('id', evidenceId).select('*').first();

        return evidence;
      });

      await redisService.delete(`dispute:${evidenceData.dispute_id}`);
      return result;
    } catch (error: any) {
      logger.error(`Error adding evidence: ${error.message}`);
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, 'Database error while adding evidence');
    }
  }

  public async addComment(commentData: any) {
    try {
      const result = await db.transaction(async (trx) => {
        const dispute = await trx('disputes').where('id', commentData.dispute_id).first();

        if (!dispute) {
          throw new HttpError(404, 'Dispute not found');
        }

        const commentId = uuidv4();
        await trx('comments').insert({
          id: commentId,
          dispute_id: commentData.dispute_id,
          comment: commentData.comment,
          created_by: commentData.created_by,
          is_private: commentData.is_private ? 1 : 0,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        });

        await trx('dispute_history').insert({
          id: uuidv4(),
          dispute_id: commentData.dispute_id,
          created_by: commentData.created_by,
          action: 'comment_added',
          details: commentData.is_private ? 'Private comment added' : 'Public comment added',
          action_date: db.fn.now(),
        });

        const comment = await trx('comments').where('id', commentId).select('*').first();

        return comment;
      });

      await redisService.delete(`dispute:${commentData.dispute_id}`);
      return result;
    } catch (error: any) {
      logger.error(`Error adding comment: ${error.message}`);
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, 'Database error while adding comment');
    }
  }

  public async cancelDispute(id: string, user: any, businessId: string | null) {
    try {
      const result = await db.transaction(async (trx) => {
        const query = trx('disputes').where('id', id);
        if (businessId) {
          query.andWhere('business_id', businessId);
        }
        const dispute = await query.first();

        if (!dispute) {
          throw new HttpError(404, 'Dispute not found');
        }

        if (user.role !== 'admin' && dispute.initiator_email !== user.email) {
          throw new HttpError(403, 'Not authorized to cancel this dispute');
        }

        if (dispute.status === 'resolved' || dispute.status === 'rejected' || dispute.status === 'canceled') {
          throw new HttpError(400, 'Dispute already finalized');
        }

        await trx('disputes').where('id', id).update({
          status: 'canceled',
          updated_at: db.fn.now(),
        });

        await trx('dispute_history').insert({
          id: uuidv4(),
          dispute_id: id,
          created_by: user.id,
          action: 'canceled',
          details: 'Dispute canceled by ' + (user.role === 'admin' ? 'administrator' : 'initiator'),
          action_date: db.fn.now(),
        });

        return id;
      });

      await redisService.delete(`dispute:${result}`);
      return await this.getDisputeById(result, businessId);
    } catch (error: any) {
      logger.error(`Error canceling dispute: ${error.message}`, { disputeId: id });
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, 'Database error while canceling dispute');
    }
  }

  public async getDisputeHistory(id: string, businessId: string | null) {
    try {
      const query = db('disputes').where('id', id);
      if (businessId) {
        query.andWhere('business_id', businessId);
      }
      const dispute = await query.first();

      if (!dispute) {
        throw new HttpError(404, 'Dispute not found');
      }

      const history = await db('dispute_history')
        .where('dispute_id', id)
        .select('*')
        .orderBy('action_date', 'desc');

      return history;
    } catch (error: any) {
      logger.error(`Error getting dispute history: ${error.message}`, { disputeId: id });
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, 'Database error while fetching dispute history');
    }
  }

  public async getDisputeStats(fromDate?: string, toDate?: string, businessId?: string) {
    try {
      const cacheKey = `dispute-stats:${businessId || 'all'}:${fromDate || 'all'}:${toDate || 'all'}`;
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

      const [totalDisputes] = await query.clone().count('id as count');
      const statusCounts = await query.clone().select('status').count('id as count').groupBy('status');
      const resolutionCounts = await query.clone().select('resolution').count('id as count').groupBy('resolution');
      const avgResolutionTime = await query
        .clone()
        .where('status', 'resolved')
        .select(db.raw('AVG(TIMESTAMPDIFF(HOUR, created_at, resolution_date)) as avg_hours'))
        .first();

      const result = {
        totalDisputes: parseInt(String(totalDisputes.count)),
        statusBreakdown: {
          open: parseInt(String(statusCounts.find((s: any) => s.status === 'open')?.count || 0)),
          under_review: parseInt(String(statusCounts.find((s: any) => s.status === 'under_review')?.count || 0)),
          resolved: parseInt(String(statusCounts.find((s: any) => s.status === 'resolved')?.count || 0)),
          rejected: parseInt(String(statusCounts.find((s: any) => s.status === 'rejected')?.count || 0)),
          canceled: parseInt(String(statusCounts.find((s: any) => s.status === 'canceled')?.count || 0)),
        },
        resolutionBreakdown: {
          pending: parseInt(String(resolutionCounts.find((r: any) => r.resolution === null)?.count || 0)),
          in_favor_of_initiator: parseInt(String(resolutionCounts.find((r: any) => r.resolution === 'in_favor_of_initiator')?.count || 0)),
          in_favor_of_respondent: parseInt(String(resolutionCounts.find((r: any) => r.resolution === 'in_favor_of_respondent')?.count || 0)),
          partial: parseInt(String(resolutionCounts.find((r: any) => r.resolution === 'partial')?.count || 0)),
        },
        averageResolutionTimeHours: avgResolutionTime?.avg_hours ? parseFloat(String(avgResolutionTime.avg_hours)) : 0,
      };

      await redisService.setOTP(cacheKey, JSON.stringify(result), 3600); // Cache for 1 hour
      return result;
    } catch (error: any) {
      logger.error(`Error getting dispute stats: ${error.message}`);
      throw new HttpError(500, 'Database error while calculating dispute statistics');
    }
  }
}