import jwt from 'jsonwebtoken';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';
import { UserService } from './userService';
import { comparePasswords } from '../utils/auth';
import { redisService } from './redisService';

export class AuthService {
  private userService = new UserService();
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

  public async login(email: string, password: string) {
    try {
      const user = await this.userService.getUserByEmail(email);
      if (!user) {
        throw new HttpError(401, 'Invalid email or password');
      }

      if (!user.is_active) {
        throw new HttpError(403, 'Account is not activated');
      }

      const isPasswordValid = await comparePasswords(password, user.password_hash);
      if (!isPasswordValid) {
        throw new HttpError(401, 'Invalid email or password');
      }

      const token = this.generateToken(user);
      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
        },
        token,
      };
    } catch (error: any) {
      logger.error(`Error in login: ${error.message}`);
      throw error instanceof HttpError ? error : new HttpError(500, 'Login failed');
    }
  }

  public generateToken(user: any) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: '1d' });
  }

  public async invalidateToken(token: string) {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as { exp: number };
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
      if (expiresIn > 0) {
        await redisService.setBlacklistToken(token, expiresIn);
      }
    } catch (error: any) {
      logger.error(`Error invalidating token: ${error.message}`);
      throw new HttpError(500, 'Failed to invalidate token');
    }
  }

  public async verifyToken(token: string) {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await redisService.get(`blacklist:${token}`);
      if (isBlacklisted) {
        throw new HttpError(401, 'Token is blacklisted');
      }

      // Verify token
      const decoded = jwt.verify(token, this.JWT_SECRET) as {
        id: string;
        email: string;
        role: string;
      };

      // Optionally, verify if user still exists and is active
      const user = await this.userService.getUserById(decoded.id);
      if (!user || !user.is_active) {
        throw new HttpError(401, 'User not found or inactive');
      }

      return decoded;
    } catch (error: any) {
      logger.error(`Error verifying token: ${error.message}`);
      throw error instanceof HttpError ? error : new HttpError(401, 'Invalid or expired token');
    }
  }

  public generateInviteToken(email: string, role: string) {
    const payload = {
      email,
      role,
      type: 'admin_invite',
    };
    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: '7d' });
  }

  public verifyInviteToken(token: string) {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET) as { email: string; role: string; type: string };
      if (payload.type !== 'admin_invite') {
        throw new HttpError(400, 'Invalid invite token');
      }
      return payload;
    } catch (error: any) {
      logger.error(`Error verifying invite token: ${error.message}`);
      throw new HttpError(400, 'Invalid or expired invite token');
    }
  }
}