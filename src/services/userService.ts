import { db } from '../database/connection';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';
import { hashPassword } from '../utils/auth';
import { redisService } from './redisService';

export class UserService {
  public async getUserById(id: string) {
    try {
      const user = await db('users').where({ id }).first();
      return user;
    } catch (error: any) {
      logger.error(`Error getting user by ID: ${error.message}`, { userId: id });
      throw new HttpError(500, 'Database error while fetching user');
    }
  }

  public async getUserByEmail(email: string) {
    try {
      const user = await db('users').where({ email }).first();
      return user;
    } catch (error: any) {
      logger.error(`Error getting user by email: ${error.message}`, { email });
      throw new HttpError(500, 'Database error while fetching user');
    }
  }

  public async findByEmailOrPhone(email: string, phoneNumber: string | null) {
    try {
      const query = db('users').where({ email });
      if (phoneNumber) {
        query.orWhere({ phone_number: phoneNumber });
      }
      const user = await query.first();
      return user;
    } catch (error: any) {
      logger.error(`Error finding user by email or phone: ${error.message}`, { email, phoneNumber });
      throw new HttpError(500, 'Database error while fetching user');
    }
  }

  public async findUserForOTP(email: string) {
    try {
      const user = await db('users').where({ email }).first();
      if (!user) {
        throw new HttpError(404, 'User not found');
      }

      // Check Redis for existing OTPs to infer type
      const regOTP = await redisService.getOTP(`reg_${email}`);
      const resetOTP = await redisService.getOTP(`reset_${email}`);

      let otpType: 'registration' | 'password_reset';
      if (regOTP && !user.is_active) {
        otpType = 'registration';
      } else if (resetOTP) {
        otpType = 'password_reset';
      } else if (!user.is_active) {
        otpType = 'registration';
      } else {
        otpType = 'password_reset';
      }

      return { user, otpType };
    } catch (error: any) {
      logger.error(`Error finding user for OTP: ${error.message}`, { email });
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, 'Database error while fetching user for OTP');
    }
  }

  public async createUser(userData: any) {
    try {
      const hashedPassword = await hashPassword(userData.password);
      const newUser = {
        email: userData.email,
        password_hash: hashedPassword,
        role: userData.role || 'user',
        is_active: userData.is_active !== undefined ? userData.is_active : true,
      };
      const [userId] = await db('users').insert(newUser);
      return await this.getUserById(userId.toString());
    } catch (error: any) {
      logger.error(`Error creating user: ${error.message}`);
      if (error.code === 'ER_DUP_ENTRY') {
        throw new HttpError(409, 'User with this email already exists');
      }
      throw new HttpError(500, 'Database error while creating user');
    }
  }

  public async createUnverifiedUser(userData: any) {
    try {
      const hashedPassword = await hashPassword(userData.password);
      const newUser = {
        first_name: userData.firstName,
        last_name: userData.lastName,
        email: userData.email,
        phone_number: userData.phoneNumber,
        password_hash: hashedPassword,
        role: 'user',
        is_active: false,
      };
      const [userId] = await db('users').insert(newUser);
      return await this.getUserById(userId.toString());
    } catch (error: any) {
      logger.error(`Error creating unverified user: ${error.message}`);
      if (error.code === 'ER_DUP_ENTRY') {
        throw new HttpError(409, 'User with this email or phone number already exists');
      }
      throw new HttpError(500, 'Database error while creating user');
    }
  }

  public async updateUser(id: string, userData: any) {
    try {
      const updateData: any = {};
      if (userData.username) updateData.username = userData.username;
      if (userData.email) updateData.email = userData.email;
      if (userData.first_name) updateData.first_name = userData.first_name;
      if (userData.last_name) updateData.last_name = userData.last_name;
      if (userData.role) updateData.role = userData.role;
      if (userData.is_active !== undefined) updateData.is_active = userData.is_active;
      if (userData.password) {
        updateData.password_hash = await hashPassword(userData.password);
      }

      await db('users').where({ id }).update(updateData);
      return await this.getUserById(id);
    } catch (error: any) {
      logger.error(`Error updating user: ${error.message}`, { userId: id });
      if (error.code === 'ER_DUP_ENTRY') {
        throw new HttpError(409, 'User with this email already exists');
      }
      throw new HttpError(500, 'Database error while updating user');
    }
  }

  public async activateUser(email: string) {
    try {
      await db('users').where({ email }).update({ is_active: true });
      return { success: true };
    } catch (error: any) {
      logger.error(`Error activating user: ${error.message}`, { email });
      throw new HttpError(500, 'Database error while activating user');
    }
  }

  public async deactivateUser(id: string) {
    try {
      await db('users').where({ id }).update({ is_active: false });
      return { success: true };
    } catch (error: any) {
      logger.error(`Error deactivating user: ${error.message}`, { userId: id });
      throw new HttpError(500, 'Database error while deactivating user');
    }
  }

  public async updatePassword(email: string, newPassword: string) {
    try {
      const hashedPassword = await hashPassword(newPassword);
      await db('users').where({ email }).update({ password_hash: hashedPassword });
      return { success: true };
    } catch (error: any) {
      logger.error(`Error updating password: ${error.message}`, { email });
      throw new HttpError(500, 'Database error while updating password');
    }
  }

  public async getUsers(params: any) {
    try {
      const { page = 1, limit = 20, role } = params;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const query = db('users').select(
        'id',
        'email',
        'first_name',
        'last_name',
        'role',
        'is_active',
        'created_at',
        'updated_at'
      );

      if (role) {
        query.where({ role });
      }

      const [count] = await db('users').count('id as total');
      const users = await query.limit(limitNum).offset(offset).orderBy('created_at', 'desc');

      return {
        data: users,
        pagination: {
          total: parseInt(count.total as string),
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(parseInt(count.total as string) / limitNum),
        },
      };
    } catch (error: any) {
      logger.error(`Error getting users: ${error.message}`);
      throw new HttpError(500, 'Database error while fetching users');
    }
  }
}