import { db } from '../database/connection';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';

export class DisputeService {
  public async getAllDisputes(params: any) {
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
      logger.error(`Error getting all disputes: ${error.message}`);
      throw new HttpError(500, 'Database error while fetching disputes');
    }
  }

  public async getUserDisputes(email: string, params: any) {
    try {
      const { page = '1', limit = '20', status, fromDate, toDate } = params;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      const query = db('disputes')
        .join('transactions', 'disputes.transaction_id', 'transactions.id')
        .leftJoin('api_keys as arbitrator', 'disputes.arbitrator_id', 'arbitrator.id')
        .where(function () {
          this.where('disputes.initiator_email', email).orWhere('disputes.counterparty_email', email);
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

      const [count] = await db('disputes')
        .where(function () {
          this.where('initiator_email', email).orWhere('counterparty_email', email);
        })
        .count('id as total');

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
      logger.error(`Error getting user disputes: ${error.message}`, { email });
      throw new HttpError(500, 'Database error while fetching user disputes');
    }
  }

  public async getDisputeById(id: string) {
    try {
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
        throw new HttpError(404, 'Dispute not found');
      }

      const evidence = await db('dispute_evidence')
        .where('dispute_id', id)
        .select('*')
        .orderBy('created_at', 'desc');

      const comments = await db('dispute_comments')
        .where('dispute_id', id)
        .select('*')
        .orderBy('created_at', 'desc');

      return {
        ...dispute,
        evidence,
        comments,
      };
    } catch (error: any) {
      logger.error(`Error getting dispute by ID: ${error.message}`, { disputeId: id });
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, 'Database error while fetching dispute');
    }
  }

  public async createDispute(disputeData: any) {
    try {
      const result = await db.transaction(async (trx) => {
        const transaction = await trx('transactions').where('id', disputeData.transaction_id).first();

        if (!transaction) {
          throw new HttpError(404, 'Transaction not found');
        }

        const existingDispute = await trx('disputes').where('transaction_id', disputeData.transaction_id).first();

        if (existingDispute) {
          throw new HttpError(409, 'Dispute already exists for this transaction');
        }

        await trx('transactions').where('id', disputeData.transaction_id).update({ status: 'disputed' });

        const [disputeId] = await trx('disputes').insert({
          ...disputeData,
          status: 'opened',
          created_at: db.fn.now(),
        });

        await trx('dispute_history').insert({
          dispute_id: disputeId.toString(),
          actor_email: disputeData.initiator_email,
          action: 'created',
          details: 'Dispute created',
        });

        return disputeId.toString();
      });

      return await this.getDisputeById(result);
    } catch (error: any) {
      logger.error(`Error creating dispute: ${error.message}`);
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, 'Database error while creating dispute');
    }
  }

  public async updateDispute(id: string, disputeData: any, user: any) {
    try {
      const result = await db.transaction(async (trx) => {
        const dispute = await trx('disputes').where('id', id).first();

        if (!dispute) {
          throw new HttpError(404, 'Dispute not found');
        }

        if (user.role === 'user' && dispute.initiator_email !== user.email) {
          throw new HttpError(403, 'Not authorized to update this dispute');
        }

        if (user.role === 'user') {
          delete disputeData.resolution;
          delete disputeData.arbitrator_id;
          delete disputeData.resolution_notes;
        }

        if (dispute.status === 'resolved' || dispute.status === 'rejected' || dispute.status === 'canceled') {
          throw new HttpError(400, 'Cannot update a finalized dispute');
        }

        await trx('disputes').where('id', id).update({
          ...disputeData,
          updated_at: db.fn.now(),
        });

        await trx('dispute_history').insert({
          dispute_id: id,
          actor_email: user.email,
          action: 'updated',
          details: 'Dispute details updated',
        });

        return id;
      });

      return await this.getDisputeById(result);
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

        const [evidenceId] = await trx('dispute_evidence').insert({
          ...evidenceData,
          created_at: db.fn.now(),
        });

        await trx('dispute_history').insert({
          dispute_id: evidenceData.dispute_id,
          actor_email: evidenceData.submitted_by_email,
          action: 'evidence_added',
          details: `Evidence added: ${evidenceData.description}`,
        });

        const evidence = await trx('dispute_evidence')
          .where('id', evidenceId.toString())
          .select('*')
          .first();

        return evidence;
      });

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

        const [commentId] = await trx('dispute_comments').insert({
          ...commentData,
          created_at: db.fn.now(),
        });

        await trx('dispute_history').insert({
          dispute_id: commentData.dispute_id,
          actor_email: commentData.commenter_email,
          action: 'comment_added',
          details: commentData.is_private ? 'Private comment added' : 'Comment added',
        });

        const comment = await trx('dispute_comments')
          .where('id', commentId.toString())
          .select('*')
          .first();

        return comment;
      });

      return result;
    } catch (error: any) {
      logger.error(`Error adding comment: ${error.message}`);
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, 'Database error while adding comment');
    }
  }

  public async getDisputeHistory(id: string) {
    try {
      const dispute = await db('disputes').where('id', id).first();

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

  public async cancelDispute(id: string, user: any) {
    try {
      const result = await db.transaction(async (trx) => {
        const dispute = await trx('disputes').where('id', id).first();

        if (!dispute) {
          throw new HttpError(404, 'Dispute not found');
        }

        if (user.role !== 'admin' && dispute.initiator_email !== user.email) {
          throw new HttpError(403, 'Not authorized to cancel this dispute');
        }

        if (dispute.status === 'resolved' || dispute.status === 'rejected' || dispute.status === 'canceled') {
          throw new HttpError(400, 'Dispute is already finalized');
        }

        await trx('disputes').where('id', id).update({
          status: 'canceled',
          updated_at: db.fn.now(),
        });

        await trx('dispute_history').insert({
          dispute_id: id,
          actor_email: user.email,
          action: 'canceled',
          details: 'Dispute canceled by ' + (user.role === 'admin' ? 'administrator' : 'initiator'),
        });

        await trx('transactions')
          .where('id', dispute.transaction_id)
          .update({
            status: 'completed',
            updated_at: db.fn.now(),
          });

        return id;
      });

      return await this.getDisputeById(result);
    } catch (error: any) {
      logger.error(`Error canceling dispute: ${error.message}`, { disputeId: id });
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, 'Database error while canceling dispute');
    }
  }

  public async getDisputeStats(fromDate?: string, toDate?: string) {
    try {
      const query = db('disputes');

      if (fromDate) {
        query.where('created_at', '>=', fromDate);
      }

      if (toDate) {
        query.where('created_at', '<=', toDate);
      }

      const [totalCount] = await query.clone().count('id as count');
      const statusCounts = await query.clone().select('status').count('id as count').groupBy('status');
      const resolutionCounts = await query.clone().select('resolution').count('id as count').groupBy('resolution');
      const avgResolutionTime = await query
        .clone()
        .whereNotNull('resolution_date')
        .whereNotNull('created_at')
        .select(db.raw('AVG(TIMESTAMPDIFF(HOUR, created_at, resolution_date)) as avg_hours'))
        .first();

      return {
        totalDisputes: parseInt(totalCount.count as string),
        statusBreakdown: {
          opened: parseInt(statusCounts.find((s) => s.status === 'opened')?.count as string) || 0,
          under_review: parseInt(statusCounts.find((s) => s.status === 'under_review')?.count as string) || 0,
          resolved: parseInt(statusCounts.find((s) => s.status === 'resolved')?.count as string) || 0,
          rejected: parseInt(statusCounts.find((s) => s.status === 'rejected')?.count as string) || 0,
          canceled: parseInt(statusCounts.find((s) => s.status === 'canceled')?.count as string) || 0,
        },
        resolutionBreakdown: {
          pending: parseInt(resolutionCounts.find((r) => r.resolution === 'pending')?.count as string) || 0,
          in_favor_of_initiator: parseInt(resolutionCounts.find((r) => r.resolution === 'in_favor_of_initiator')?.count as string) || 0,
          in_favor_of_respondent: parseInt(resolutionCounts.find((r) => r.resolution === 'in_favor_of_respondent')?.count as string) || 0,
          partial: parseInt(resolutionCounts.find((r) => r.resolution === 'partial')?.count as string) || 0,
        },
        averageResolutionTimeHours: parseFloat(avgResolutionTime?.avg_hours as string) || 0,
      };
    } catch (error: any) {
      logger.error(`Error getting dispute stats: ${error.message}`);
      throw new HttpError(500, 'Database error while calculating dispute statistics');
    }
  }
}