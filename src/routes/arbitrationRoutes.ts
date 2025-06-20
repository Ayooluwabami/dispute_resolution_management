import { ArbitrationController } from '../controllers/arbitrationController';
import { validateRequest } from '../middleware/validation';
import { arbitrationValidation } from '../validation/arbitrationValidation';
import { checkRole } from '../middleware/authorization';

const arbitrationController = new ArbitrationController();
const businessRole = checkRole(['admin', 'user']);

export default function arbitrationRoute(app: any, prefix: string) {
  app.get(`${prefix}/cases`, businessRole, arbitrationController.getArbitrationCases.bind(arbitrationController));
  app.get(`${prefix}/cases/:id`, businessRole, arbitrationController.getArbitrationCaseById.bind(arbitrationController));
  app.post(
    `${prefix}/cases/:id/assign`,
    checkRole(['admin']),
    validateRequest(arbitrationValidation.assignArbitrator),
    arbitrationController.assignArbitrator.bind(arbitrationController)
  );
  app.get(`${prefix}/stats`, businessRole, arbitrationController.getArbitrationStats.bind(arbitrationController));
}