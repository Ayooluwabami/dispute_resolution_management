import { CustomRequest, RestanaResponse } from '../types';
import { DisputeService } from '../services/disputeService';
import { logger } from '../utils/logger';
import { HttpError } from '../utils/httpError';
import { db } from '../database/connection';

export class DisputeController {
  private disputeService = new DisputeService();

  public createDispute = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const {
        transactionId, reason, initiatorEmail, counterpartyEmail, amount, evidenceType, evidenceDescription,
        sessionId, sourceAccountName, sourceBank, beneficiaryAccountName, beneficiaryBank
      } = req.body;
      const evidenceFile = req.file;
      const user = req.user!;
      const businessId = (await db('api_keys').where('id', user.id).first())?.business_id;

      if (!businessId && user.role !== 'admin') {
        throw new HttpError(400, 'Business ID not found for API key');
      }

      const initiatorProfile = await db('profiles').where({ email: initiatorEmail, business_id: businessId }).first();
      if (!initiatorProfile) {
        throw new HttpError(404, 'Initiator profile not found');
      }

      const counterpartyProfile = await db('profiles').where({ email: counterpartyEmail, business_id: businessId }).first();

      if (evidenceFile && (!evidenceType || !evidenceDescription)) {
        throw new HttpError(400, 'Evidence type and description are required when uploading a file');
      }

      if ((evidenceType || evidenceDescription) && !evidenceFile) {
        throw new HttpError(400, 'Evidence file is required when type or description is provided');
      }

      const disputeData = {
        transaction_id: transactionId,
        business_id: businessId,
        initiator_email: initiatorEmail,
        counterparty_email: counterpartyEmail,
        initiator_profile_id: initiatorProfile.id,
        counterparty_profile_id: counterpartyProfile?.id || null,
        reason,
        amount: amount ? parseFloat(amount) : null,
        apiKeyId: user.id,
        session_id: sessionId,
        source_account_name: sourceAccountName,
        source_bank: sourceBank,
        beneficiary_account_name: beneficiaryAccountName,
        beneficiary_bank: beneficiaryBank,
        evidence: evidenceFile ? {
          type: evidenceType,
          description: evidenceDescription,
          file_path: evidenceFile.path,
          file_name: evidenceFile.originalname,
          submitted_by: user.id,
        } : null,
      };

      const newDispute = await this.disputeService.createDispute(disputeData);

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

  public getAllDisputes = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { page = '1', limit = '20', status, from_date, to_date } = req.query as any;
      const user = req.user!;

      if (user.role !== 'admin') {
        throw new HttpError(403, 'Admin access required');
      }

      const businessId = user.role === 'admin' ? null : (await db('api_keys').where('id', user.id).first())?.business_id;

      const result = await this.disputeService.getAllDisputes({
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
      logger.error(`Error getting disputes: ${error.message}`);
      res.send({
        status: 'error',
        message: error.message || 'Failed to retrieve disputes',
      }, error.statusCode || 500);
    }
  };

  public getUserDisputes = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { email } = req.params;
      const { page = '1', limit = '20', status } = req.query as any;
      const user = req.user!;
      const businessId = user.role === 'admin' ? null : (await db('api_keys').where('id', user.id).first())?.business_id;

      const profileQuery = db('profiles').where({ email });
      if (user.role !== 'admin') {
        profileQuery.andWhere({ business_id: businessId });
      }
      const profile = await profileQuery.first();
      if (!profile) {
        throw new HttpError(404, 'Profile not found');
      }

      const result = await this.disputeService.getUserDisputes(email, {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        businessId,
      });

      res.send({
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      logger.error(`Error getting user disputes: ${error.message}`);
      res.send({
        status: 'error',
        message: error.message || 'Failed to retrieve user disputes',
      }, error.statusCode || 500);
    }
  };

  public getDisputeById = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const businessId = (await db('api_keys').where('id', user.id).first())?.business_id;

      const dispute = await this.disputeService.getDisputeById(id, user.role === 'admin' ? null : businessId);

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
      res.send({
        status: 'error',
        message: error.message || 'Failed to retrieve dispute',
      }, error.statusCode || 500);
    }
  };

  public getDisputesByProfileId = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const profileId = req.params?.profileId;
      if (!profileId) {
        throw new HttpError(400, 'profileId parameter is required');
      }

      const { page = '1', limit = '20', status } = req.query as any;
      const user = req.user!;
      const businessId = (await db('api_keys').where('id', user.id).first())?.business_id;

      const profileQuery = db('profiles').where({ id: profileId });
      if (user.role !== 'admin') {
        profileQuery.andWhere({ business_id: businessId });
      }
      const profile = await profileQuery.first();
      if (!profile) {
        throw new HttpError(404, 'Profile not found');
      }

      const result = await this.disputeService.getDisputesByProfileId(profileId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        businessId: user.role === 'admin' ? null : businessId,
      });

      res.send({
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      logger.error(`Error getting disputes by profile ID: ${error.message}`, { profileId: req.params?.profileId });
      if (error instanceof HttpError) {
        res.send({
          status: 'error',
          message: error.message,
        }, error.statusCode);
      } else {
        res.send({
          status: 'error',
          message: 'Failed to retrieve disputes',
        }, 500);
      }
    }
  };

  public updateDispute = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { id } = req.params;
      const { status, resolution, resolution_notes, action, dateTreated } = req.body;
      const user = req.user!;
      const businessId = (await db('api_keys').where('id', user.id).first())?.business_id;

      const existingDispute = await this.disputeService.getDisputeById(id, user.role === 'admin' ? null : businessId);
      if (!existingDispute) {
        throw new HttpError(404, 'Dispute not found');
      }

      if (user.role !== 'admin' && existingDispute.initiator_email !== user.email) {
        throw new HttpError(403, 'Not authorized to update this dispute');
      }

      if (existingDispute.status === 'resolved' && user.role !== 'admin') {
        throw new HttpError(400, 'Cannot update a resolved dispute');
      }

      const disputeData = {
        status,
        resolution,
        resolution_notes,
        action,
        date_treated: dateTreated || (status === 'resolved' || status === 'rejected' ? db.fn.now() : null),
      };

      const updatedDispute = await this.disputeService.updateDispute(id, disputeData, user, user.role === 'admin' ? null : businessId);

      res.send({
        status: 'success',
        data: updatedDispute,
      });
    } catch (error: any) {
      logger.error(`Error updating dispute: ${error.message}`, { id: req.params.id });
      res.send({
        status: 'error',
        message: error.message || 'Failed to update dispute',
      }, error.statusCode || 500);
    }
  };

  public addEvidence = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { id } = req.params;
      const { evidence_type, description } = req.body;
      const file = req.file;
      const user = req.user!;
      const businessId = (await db('api_keys').where('id', user.id).first())?.business_id;

      if (!file) {
        throw new HttpError(400, 'File is required');
      }

      const dispute = await this.disputeService.getDisputeById(id, user.role === 'admin' ? null : businessId);
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

      const evidenceData = {
        dispute_id: id,
        submitted_by: user.id,
        evidence_type,
        description,
        file_path: file.path,
        file_name: file.originalname,
        apiKeyId: user.id,
      };

      const evidence = await this.disputeService.addEvidence(evidenceData);

      res.send({
        status: 'success',
        data: evidence,
      });
    } catch (error: any) {
      logger.error(`Error adding evidence: ${error.message}`, { disputeId: req.params.id });
      res.send({
        status: 'error',
        message: error.message || 'Failed to add evidence',
      }, error.statusCode || 500);
    }
  };

  public addComment = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { id } = req.params;
      const { comment, is_private } = req.body;
      const user = req.user!;
      const businessId = (await db('api_keys').where('id', user.id).first())?.business_id;

      const existingDispute = await this.disputeService.getDisputeById(id, user.role === 'admin' ? null : businessId);
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
        business_id: businessId,
        comment,
        created_by: user.id,
        is_private: is_private || false,
        apiKeyId: user.id,
      };

      const commentRecord = await this.disputeService.addComment(commentData);

      res.send({
        status: 'success',
        data: commentRecord,
      });
    } catch (error: any) {
      logger.error(`Error adding comment: ${error.message}`, { disputeId: req.params.id });
      res.send({
        status: 'error',
        message: error.message || 'Failed to add comment',
      }, error.statusCode || 500);
    }
  };

  public getDisputeHistory = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const businessId = (await db('api_keys').where('id', user.id).first())?.business_id;

      const existingDispute = await this.disputeService.getDisputeById(id, user.role === 'admin' ? null : businessId);
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

      const history = await this.disputeService.getDisputeHistory(id, user.role === 'admin' ? null : businessId);

      res.send({
        status: 'success',
        data: history,
      });
    } catch (error: any) {
      logger.error(`Error getting dispute history: ${error.message}`, { disputeId: req.params.id });
      res.send({
        status: 'error',
        message: error.message || 'Failed to retrieve dispute history',
      }, error.statusCode || 500);
    }
  };

  public cancelDispute = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const businessId = (await db('api_keys').where('id', user.id).first())?.business_id;

      const existingDispute = await this.disputeService.getDisputeById(id, user.role === 'admin' ? null : businessId);
      if (!existingDispute) {
        throw new HttpError(404, 'Dispute not found');
      }

      if (user.role !== 'admin' && existingDispute.initiator_email !== user.email) {
        throw new HttpError(403, 'Not authorized to cancel this dispute');
      }

      if (existingDispute.status === 'resolved' || existingDispute.status === 'rejected') {
        throw new HttpError(400, 'Cannot cancel a dispute that is already resolved or rejected');
      }

      const updatedDispute = await this.disputeService.cancelDispute(id, user, user.role === 'admin' ? null : businessId);

      res.send({
        status: 'success',
        data: updatedDispute,
        message: 'Dispute cancelled successfully',
      });
    } catch (error: any) {
      logger.error(`Error cancelling dispute: ${error.message}`, { disputeId: req.params.id });
      res.send({
        status: 'error',
        message: error.message || 'Failed to cancel dispute',
      }, error.statusCode || 500);
    }
  };

  public getDisputeStats = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { from_date, to_date } = req.query as any;
      const user = req.user!;
      const businessId = user.role === 'admin' ? null : (await db('api_keys').where('id', user.id).first())?.business_id;

      if (user.role !== 'admin') {
        throw new HttpError(403, 'Admin access required');
      }

      const stats = await this.disputeService.getDisputeStats(from_date, to_date, businessId);

      res.send({
        status: 'success',
        data: stats,
      });
    } catch (error: any) {
      logger.error(`Error getting dispute stats: ${error.message}`);
      res.send({
        status: 'error',
        message: error.message || 'Failed to retrieve dispute statistics',
      }, error.statusCode || 500);
    }
  };
}