import restana from 'restana';
import { UserController } from '../controllers/userController';
import { validateRequest } from '../middleware/validation';
import { userValidation } from '../validation/userValidation';
import { authenticate } from '../middleware/authentication';
import { checkRole } from '../middleware/authorization';

const userController = new UserController();

export default function userRoute(app: any, prefix: string) {
  app.post(`${prefix}/register`, validateRequest(userValidation.register), userController.register.bind(userController));
  app.post(`${prefix}/verify-otp`, validateRequest(userValidation.verifyOTP), userController.verifyOTP.bind(userController));
  app.post(`${prefix}/login`, validateRequest(userValidation.login), userController.login.bind(userController));
  app.post(`${prefix}/forgot-password`, validateRequest(userValidation.forgotPassword), userController.forgotPassword.bind(userController));
  app.post(`${prefix}/reset-password`, validateRequest(userValidation.resetPassword), userController.resetPassword.bind(userController));
  app.post(`${prefix}/resend-otp`, validateRequest(userValidation.resendOTP), userController.resendOTP.bind(userController));
  app.post(`${prefix}/logout`, authenticate, userController.logout.bind(userController));
  app.post(
    `${prefix}/admin/invite`,
    authenticate,
    checkRole(['admin']),
    validateRequest(userValidation.adminInvite),
    userController.inviteAdmin.bind(userController)
  );
  app.post(`${prefix}/admin/register`, validateRequest(userValidation.adminRegister), userController.registerAdmin.bind(userController));
}