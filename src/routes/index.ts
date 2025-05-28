import restana from 'restana';
import userRoute from './userRoutes';
import transactionRoute from './transactionRoutes';
import disputeRoute from './disputeRoutes';
import arbitrationRoute from './arbitrationRoutes';
import { authenticate } from '../middleware/authentication';

export function setupRoutes(app: any): void {
  // Public routes (no authentication required)
  userRoute(app, '/api/v1/auth');

  // Protected routes (authentication required)
  app.use('/api/v1/transactions', authenticate);
  transactionRoute(app, '/api/v1/transactions');
  app.use('/api/v1/disputes', authenticate);
  disputeRoute(app, '/api/v1/disputes');
  app.use('/api/v1/arbitration', authenticate);
  arbitrationRoute(app, '/api/v1/arbitration');
}