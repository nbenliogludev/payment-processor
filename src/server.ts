import app from './app';
import { connectMongo, disconnectMongo } from './config/database';
import env from './config/env';
import { connectRedis, disconnectRedis } from './config/redis';

async function bootstrap(): Promise<void> {
  await connectMongo();
  await connectRedis();

  const server = app.listen(env.port, env.host, () => {
    console.log(`Payment processor listening on ${env.host}:${env.port}`);
  });

  async function shutdown(signal: NodeJS.Signals): Promise<void> {
    console.log(`${signal} received, shutting down`);

    server.close(async () => {
      await Promise.all([disconnectMongo(), disconnectRedis()]);
      process.exit(0);
    });
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start application', error);
  process.exit(1);
});
