import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const config = {
  app: {
    name: requireEnv('APP_NAME'),
    port: parseInt(requireEnv('PORT'), 10),
    env: requireEnv('NODE_ENV'),
    url: requireEnv('APP_URL'),
  },

  cors: {
    allowedOrigins: requireEnv('CORS_ALLOWED_ORIGINS').split(','),
    allowedMethods: requireEnv('CORS_ALLOWED_METHODS').split(','),
    allowedHeaders: requireEnv('CORS_ALLOWED_HEADERS').split(','),
  },

  database: {
    host: requireEnv('DB_HOST'),
    port: parseInt(requireEnv('DB_PORT'), 10),
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
    name: requireEnv('DB_NAME'),
    maxConnections: parseInt(requireEnv('DB_MAX_CONNECTIONS'), 10),
    minConnections: parseInt(requireEnv('DB_MIN_CONNECTIONS'), 10),
  },

  auth: {
    jwtSecret: requireEnv('JWT_SECRET'),
    jwtExpiresIn: requireEnv('JWT_EXPIRES_IN'),
    saltRounds: parseInt(requireEnv('SALT_ROUNDS'), 10),
  },

  redis: {
    host: requireEnv('REDIS_HOST'),
    port: parseInt(requireEnv('REDIS_PORT'), 10),
    password: process.env.REDIS_PASSWORD,
  },

  email: {
    idealswiftApiUrl: process.env.IDEALSWIFT_API_URL,
    idealswiftMailToken: process.env.IDEALSWIFT_MAIL_TOKEN,
    mailSender: process.env.MAIL_SENDER,
    mailNoReply: process.env.MAIL_NOREPLY,
  },

  upload: {
    maxFileSize: parseInt(requireEnv('UPLOAD_MAX_FILE_SIZE'), 10),
    allowedTypes: requireEnv('UPLOAD_ALLOWED_TYPES').split(','),
    storageDir: requireEnv('UPLOAD_STORAGE_DIR'),
    maxFiles: parseInt(requireEnv('UPLOAD_MAX_FILES'), 10),
  },

  logging: {
    level: requireEnv('LOG_LEVEL'),
    file: requireEnv('LOG_FILE'),
    maxFiles: parseInt(requireEnv('LOG_MAX_FILES'), 10),
  },

  apiKeys: {
    initialUserName: requireEnv('API_KEY_INITIAL_NAME'),
    initialUserEmail: requireEnv('API_KEY_INITIAL_EMAIL'),
    initialUserRole: requireEnv('API_KEY_INITIAL_ROLE'),
    initialUserIps: requireEnv('API_KEY_INITIAL_IPS').split(',').map(ip => ip.trim()),
  },
};