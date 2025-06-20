import { CustomRequest, RestanaResponse } from '../types';
import { validateRequest } from '../middleware/validation';
import { disputeValidation } from '../validation/disputeValidation';
import { upload } from '../utils/fileUpload';
import { DisputeController } from '../controllers/disputeController';

const disputeController = new DisputeController();

export default function disputeRoutes(app: any, prefix: string) {
  // Get All Disputes (Admin only)
  app.get(`${prefix}/`, disputeController.getAllDisputes.bind(disputeController));

  // Get Dispute Stats (Admin only)
  app.get(`${prefix}/stats`, disputeController.getDisputeStats.bind(disputeController));

  // Get Disputes by User Email
  app.get(`${prefix}/email/:email`, disputeController.getUserDisputes.bind(disputeController));

  // Create Dispute
  app.post(
    `${prefix}/`,
    upload.single('evidenceFile'),
    validateRequest(disputeValidation.createDispute),
    disputeController.createDispute.bind(disputeController)
  );
  
  // Get Dispute by Profile ID
  app.get(`${prefix}/profile/:profileId`, disputeController.getDisputesByProfileId.bind(disputeController));

  // Get Dispute by ID
  app.get(`${prefix}/:id`, disputeController.getDisputeById.bind(disputeController));

  // Update Dispute
  app.put(
    `${prefix}/:id`,
    validateRequest(disputeValidation.updateDispute),
    disputeController.updateDispute.bind(disputeController)
  );

  // Add Evidence
  app.post(
    `${prefix}/:id/evidence`,
    upload.single('evidenceFile'),
    validateRequest(disputeValidation.addEvidence),
    disputeController.addEvidence.bind(disputeController)
  );

  // Add Comment
  app.post(
    `${prefix}/:id/comment`,
    validateRequest(disputeValidation.addComment),
    disputeController.addComment.bind(disputeController)
  );

  // Get Dispute History
  app.get(`${prefix}/:id/history`, disputeController.getDisputeHistory.bind(disputeController));

  // Cancel Dispute
  app.post(
    `${prefix}/:id/cancel`,
    disputeController.cancelDispute.bind(disputeController)
  );
}