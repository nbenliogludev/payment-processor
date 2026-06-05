import { createClient } from 'redis';

import env from './env';

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | undefined;

export async function connectRedis(): Promise<RedisClient> {
  if (!client) {
    client = createClient({ url: env.redisUrl });
  }

  if (!client.isOpen) {
    await client.connect();
  }

  return client;
}

export function getRedisClient(): RedisClient {
  if (!client) {
    client = createClient({ url: env.redisUrl });
  }

  return client;
}

export async function disconnectRedis(): Promise<void> {
  if (client?.isOpen) {
    await client.quit();
  }
}
