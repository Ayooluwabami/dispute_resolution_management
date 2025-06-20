import restana from 'restana';
import bodyParser from 'body-parser';
import cors from 'cors';
import { config } from './config/env.config';
import { logger } from './utils/logger';
import apiKeyAuth from './middleware/apiKeyAuth'; 
import transactionRoute from './routes/transactionRoutes';
import disputeRoute from './routes/disputeRoutes';
import arbitrationRoute from './routes/arbitrationRoutes';
import apiKeyRoute from './routes/apiKeyRoutes';
import businessRoutes from './routes/businessRoutes';
import { errorHandler } from './middleware/errorHandler';

class App {
  public appServer: any;

  constructor() {
    this.appServer = restana({
      errorHandler: errorHandler as (err: any, req: any, res: any) => void,
    });
    this.loadConfiguration();
    this.registerModules();
  }

  private loadConfiguration() {
    this.appServer.use(cors({
      origin: config.cors.allowedOrigins,
      methods: config.cors.allowedMethods,
      allowedHeaders: [...config.cors.allowedHeaders, 'x-api-key'],
    }));
    this.appServer.use(bodyParser.json());
  }

  private registerModules() {
    this.appServer.get('/health', (req: any, res: any) => {
      res.send({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Apply API key authentication to all routes except health check
    this.appServer.use(apiKeyAuth);

    transactionRoute(this.appServer, '/v1/transactions');
    disputeRoute(this.appServer, '/v1/disputes');
    arbitrationRoute(this.appServer, '/v1/arbitration');
    businessRoutes(this.appServer, '/v1/bsuiness');
    apiKeyRoute(this.appServer, '/v1/api-keys');

    this.appServer.use((req: any, res: any) => {
      logger.warn('Route not found', { path: req.url, method: req.method });
      res.send({ status: 'error', message: 'Not found' }, 404);
    });
  }

  public async close() {
    await this.appServer.close();
  }

  public start(port: number) {
    return this.appServer.start(port);
  }
}

export default App;