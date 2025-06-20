import { CustomRequest, RestanaResponse } from '../types';
import { businessController } from '../controllers/businessController';

export default function businessRoutes(app: any, prefix: string) {
  app.post(`${prefix}/`, businessController.createBusiness.bind(businessController));
}