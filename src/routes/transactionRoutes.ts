import { TransactionController } from '../controllers/transactionController';
import { validateRequest } from '../middleware/validation';
import { transactionValidation } from '../validation/transactionValidation';
import { checkRole } from '../middleware/authorization';

const transactionController = new TransactionController();

export default function transactionRoute(app: any, prefix: string) {
  app.get(`${prefix}/`, transactionController.getAllTransactions.bind(transactionController));
  app.post(
    `${prefix}/`,
    validateRequest(transactionValidation.createTransaction),
    transactionController.createTransaction.bind(transactionController)
  );
  app.get(`${prefix}/search`, transactionController.searchTransactions.bind(transactionController));
  app.get(
    `${prefix}/stats`,
    checkRole(['admin', 'arbitrator']),
    transactionController.getTransactionStats.bind(transactionController)
  );
  app.get(`${prefix}/:id`, transactionController.getTransactionById.bind(transactionController));
  app.put(
    `${prefix}/:id`,
    validateRequest(transactionValidation.updateTransaction),
    transactionController.updateTransaction.bind(transactionController)
  );
}