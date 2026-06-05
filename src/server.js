const app = require('./app');
const env = require('./config/env');
const { connectMongo, disconnectMongo } = require('./config/database');
const { connectRedis, disconnectRedis } = require('./config/redis');

async function bootstrap() {
  await connectMongo();
  await connectRedis();

  const server = app.listen(env.port, () => {
    console.log(`Payment processor listening on port ${env.port}`);
  });

  async function shutdown(signal) {
    console.log(`${signal} received, shutting down`);

    server.close(async () => {
      await Promise.all([disconnectMongo(), disconnectRedis()]);
      process.exit(0);
    });
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((error) => {
  console.error('Failed to start application', error);
  process.exit(1);
});
