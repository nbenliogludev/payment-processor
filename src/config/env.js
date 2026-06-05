require('dotenv').config();

function numberFromEnv(name, fallback) {
  const value = process.env[name];

  if (value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: numberFromEnv('PORT', 3000),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/payment_processor',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  webhookSecret: process.env.WEBHOOK_SECRET || 'change-me',
  webhookTimestampToleranceSeconds: numberFromEnv('WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS', 300),
};
