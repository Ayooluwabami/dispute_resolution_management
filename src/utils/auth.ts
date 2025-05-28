import crypto from 'crypto';
import { promisify } from 'util';
import { config } from '../config/env.config';

const pbkdf2Async = promisify(crypto.pbkdf2);

export const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await pbkdf2Async(
    password,
    salt,
    config.auth.saltRounds * 1000,
    64,
    'sha512'
  );
  
  return `${salt}:${derivedKey.toString('hex')}`;
};

export const comparePasswords = async (
  password: string,
  storedHash: string
): Promise<boolean> => {
  const [salt, hash] = storedHash.split(':');
  const derivedKey = await pbkdf2Async(
    password,
    salt,
    config.auth.saltRounds * 1000,
    64,
    'sha512'
  );
  
  return derivedKey.toString('hex') === hash;
};

export const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};