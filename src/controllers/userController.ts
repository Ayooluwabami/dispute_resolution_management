import { UserService } from '../services/userService';
import { AuthService } from '../services/authService';
import { emailService } from '../services/emailService';
import { redisService } from '../services/redisService';
import { logger } from '../utils/logger';
import { HttpError } from '../utils/httpError';
import { generateOTP, hashPassword } from '../utils/auth';
import { CustomRequest, RestanaResponse } from '../types';

export class UserController {
  private userService = new UserService();
  private authService = new AuthService();

  public register = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { firstName, lastName, email, phoneNumber, password } = req.body;

      const existingUser = await this.userService.findByEmailOrPhone(email, phoneNumber);
      if (existingUser) {
        throw new HttpError(409, 'Email or phone number already exists');
      }

      const user = await this.userService.createUnverifiedUser({
        firstName,
        lastName,
        email,
        phoneNumber,
        password,
      });

      const otp = generateOTP();
      await redisService.setOTP(`reg_${email}`, otp);

      try {
        const emailResult = await emailService.sendOTP(email, otp);
        console.log('Email API Response:', emailResult);
      } catch (error: any) {
        console.error('Email Error:', error);
        logger.error('Failed to send OTP email', { error: error.message, email });
        throw new HttpError(500, 'Failed to send OTP email');
      }

      res.send({
        status: 'success',
        message: 'Registration initiated. Please verify your email with the OTP sent.',
      });
    } catch (error) {
      logger.error(`Error in user registration: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof HttpError) {
        res.send({ status: 'error', message: error.message }, error.statusCode);
        return;
      }
      res.send({ status: 'error', message: 'Registration failed' }, 500);
    }
  };

  public verifyOTP = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { email, otp } = req.body;

      const storedOTP = await redisService.getOTP(`reg_${email}`);
      if (!storedOTP || storedOTP !== otp) {
        throw new HttpError(400, 'Invalid or expired OTP');
      }

      await this.userService.activateUser(email);
      await redisService.delete(`reg_${email}`);

      const user = await this.userService.getUserByEmail(email);
      const token = this.authService.generateToken(user);

      res.send({
        status: 'success',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
          },
          token,
        },
      });
    } catch (error) {
      logger.error(`Error in OTP verification: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof HttpError) {
        res.send({ status: 'error', message: error.message }, error.statusCode);
        return;
      }
      res.send({ status: 'error', message: 'Verification failed' }, 500);
    }
  };

  public login = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login(email, password);

      res.send({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error(`Error in user login: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof HttpError) {
        res.send({ status: 'error', message: error.message }, error.statusCode);
        return;
      }
      res.send({ status: 'error', message: 'Invalid email or password' }, 401);
    }
  };

  public logout = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        await this.authService.invalidateToken(token);
      }

      res.send({
        status: 'success',
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error(`Error in logout: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.send({ status: 'error', message: 'Logout failed' }, 500);
    }
  };

  public forgotPassword = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { email } = req.body;
      const user = await this.userService.getUserByEmail(email);

      if (!user) {
        throw new HttpError(404, 'User not found');
      }

      const otp = generateOTP();
      await redisService.setOTP(`reset_${email}`, otp);
      await emailService.sendPasswordReset(email, otp);

      res.send({
        status: 'success',
        message: 'Password reset OTP has been sent to your email',
      });
    } catch (error) {
      logger.error(`Error in forgot password: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof HttpError) {
        res.send({ status: 'error', message: error.message }, error.statusCode);
        return;
      }
      res.send({ status: 'error', message: 'Failed to process password reset request' }, 500);
    }
  };

  public resetPassword = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { email, otp, newPassword } = req.body;

      const storedOTP = await redisService.getOTP(`reset_${email}`);
      if (!storedOTP || storedOTP !== otp) {
        throw new HttpError(400, 'Invalid or expired OTP');
      }

      await this.userService.updatePassword(email, newPassword);
      await redisService.delete(`reset_${email}`);

      res.send({
        status: 'success',
        message: 'Password has been reset successfully',
      });
    } catch (error) {
      logger.error(`Error in reset password: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof HttpError) {
        res.send({ status: 'error', message: error.message }, error.statusCode);
        return;
      }
      res.send({ status: 'error', message: 'Failed to reset password' }, 500);
    }
  };

  public inviteAdmin = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { email, role } = req.body;
      const currentUser = req.user;

      if (currentUser.role !== 'admin') {
        throw new HttpError(403, 'Only admins can invite other admins');
      }

      const inviteToken = this.authService.generateInviteToken(email, role);
      const inviteLink = `${process.env.APP_URL}/admin/register?token=${inviteToken}`;

      await emailService.sendAdminInvite(email, inviteLink);

      res.send({
        status: 'success',
        message: 'Admin invitation sent successfully',
      });
    } catch (error) {
      logger.error(`Error in admin invite: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof HttpError) {
        res.send({ status: 'error', message: error.message }, error.statusCode);
        return;
      }
      res.send({ status: 'error', message: 'Failed to send admin invitation' }, 500);
    }
  };

  public registerAdmin = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { email, password, inviteToken } = req.body;

      const payload = this.authService.verifyInviteToken(inviteToken);
      if (payload.email !== email) {
        throw new HttpError(400, 'Invalid invite token');
      }

      const existingUser = await this.userService.findByEmailOrPhone(email, null);
      if (existingUser) {
        throw new HttpError(409, 'Email already exists');
      }

      const hashedPassword = await hashPassword(password);
      const user = await this.userService.createUser({
        email,
        password: hashedPassword,
        role: payload.role || 'admin',
        is_active: true,
      });

      const token = this.authService.generateToken(user);

      res.send({
        status: 'success',
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
          },
          token,
        },
      });
    } catch (error) {
      logger.error(`Error in admin registration: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof HttpError) {
        res.send({ status: 'error', message: error.message }, error.statusCode);
        return;
      }
      res.send({ status: 'error', message: 'Admin registration failed' }, 500);
    }
  };

  public resendOTP = async (req: CustomRequest, res: RestanaResponse) => {
    try {
      const { email } = req.body;

      const { otpType } = await this.userService.findUserForOTP(email);

      const otp = generateOTP();
      const key = otpType === 'registration' ? `reg_${email}` : `reset_${email}`;
      await redisService.setOTP(key, otp, parseInt(process.env.OTP_EXPIRY_SECONDS || '300', 10));

      try {
        const emailResult = otpType === 'registration'
          ? await emailService.sendOTP(email, otp)
          : await emailService.sendPasswordReset(email, otp);
        console.log('Email API Response (resendOTP):', emailResult);
      } catch (error: any) {
        console.error('Email Error (resendOTP):', error);
        logger.error('Failed to send OTP email', { error: error.message, email });
        res.send({ status: 'error', message: 'Failed to send OTP email' }, 500);
        return;
      }

      res.send({
        status: 'success',
        message: `OTP has been resent to ${email} for ${otpType.replace('_', ' ')}`,
      });
    } catch (error) {
      logger.error(`Error in resend OTP: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof HttpError) {
        res.send({ status: 'error', message: error.message }, error.statusCode);
        return;
      }
      res.send({ status: 'error', message: 'Failed to resend OTP' }, 500);
    }
  };
}