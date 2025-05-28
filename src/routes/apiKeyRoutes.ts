import { CustomRequest, RestanaResponse } from '../types';
import { apiKeyService } from '../services/apiKeyService';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';

export default function apiKeyRoutes(app: any, basePath: string) {
  // Create API Key (Admin only)
  app.post(basePath, async (req: CustomRequest, res: RestanaResponse) => {
    try {
      if (req.user!.role !== 'admin') {
        throw new HttpError(403, 'Admin access required');
      }

      const { name, email, role, ips } = req.body;
      const apiKey = await apiKeyService.createApiKey({
        name,
        email,
        role,
        ips,
      });

      res.send(
        {
          status: 'success',
          data: { id: apiKey.id, key: apiKey.key, email, role, ips },
        },
        201
      );
    } catch (error: any) {
      logger.error('Error creating API key', { error: error.message });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to create API key');
    }
  });

  // List API Keys (Admin only)
  app.get(basePath, async (req: CustomRequest, res: RestanaResponse) => {
    try {
      if (req.user!.role !== 'admin') {
        throw new HttpError(403, 'Admin access required');
      }

      const apiKeys = await apiKeyService.listApiKeys();
      res.send({ status: 'success', data: apiKeys });
    } catch (error: any) {
      logger.error('Error listing API keys', { error: error.message });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to list API keys');
    }
  });

  // Deactivate API Key (Admin only)
  app.post(`${basePath}/:id/deactivate`, async (req: CustomRequest, res: RestanaResponse) => {
    try {
      if (req.user!.role !== 'admin') {
        throw new HttpError(403, 'Admin access required');
      }

      const { id } = req.params;
      await apiKeyService.deactivateApiKey(id);

      res.send({ status: 'success', message: 'API key deactivated' });
    } catch (error: any) {
      logger.error('Error deactivating API key', { error: error.message });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to deactivate API key');
    }
  });

  // Update Whitelisted IPs (Admin only)
  app.put(`${basePath}/:id/ips`, async (req: CustomRequest, res: RestanaResponse) => {
    try {
      if (req.user!.role !== 'admin') {
        throw new HttpError(403, 'Admin access required');
      }

      const { id } = req.params;
      const { ips } = req.body;

      await apiKeyService.updateWhitelistedIps(id, ips);
      res.send({ status: 'success', message: 'Whitelisted IPs updated' });
    } catch (error: any) {
      logger.error('Error updating whitelisted IPs', { error: error.message });
      throw error instanceof HttpError ? error : new HttpError(500, 'Failed to update whitelisted IPs');
    }
  });
}