import { ArbitrationController } from '../controllers/arbitrationController';
import { validateRequest } from '../middleware/validation';
import { arbitrationValidation } from '../validation/arbitrationValidation';
import { checkRole } from '../middleware/authorization';

const arbitrationController = new ArbitrationController();
const arbitratorRole = checkRole(['admin', 'arbitrator']);

export default function arbitrationRoute(app: any, prefix: string) {
  app.get(`${prefix}/cases`, arbitratorRole, arbitrationController.getArbitrationCases.bind(arbitrationController));
  app.get(`${prefix}/cases/:id`, arbitratorRole, arbitrationController.getArbitrationCaseById.bind(arbitrationController));
  app.post(
    `${prefix}/cases/:id/assign`,
    arbitratorRole,
    arbitrationController.assignArbitrator.bind(arbitrationController)
  );
  app.post(
    `${prefix}/cases/:id/review`,
    arbitratorRole,
    validateRequest(arbitrationValidation.reviewCase),
    arbitrationController.reviewCase.bind(arbitrationController)
  );
  app.post(
    `${prefix}/cases/:id/resolve`,
    arbitratorRole,
    validateRequest(arbitrationValidation.resolveCase),
    arbitrationController.resolveCase.bind(arbitrationController)
  );
  app.get(`${prefix}/stats`, arbitratorRole, arbitrationController.getArbitrationStats.bind(arbitrationController));
}