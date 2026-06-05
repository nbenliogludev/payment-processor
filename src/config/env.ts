import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export interface EnvConfig {
  nodeEnv: string;
  port: number;
  mongoUri: string;
  redisUrl: string;
  webhookSecret: string;
  webhookTimestampToleranceSeconds: number;
}

function numberFromEnv(name: string, fallback: number): number {
  const value = process.env[name];

  if (value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const env: EnvConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: numberFromEnv('PORT', 3000),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/payment_processor',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  webhookSecret: process.env.WEBHOOK_SECRET || 'change-me',
  webhookTimestampToleranceSeconds: numberFromEnv('WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS', 300),
};

export default env;
