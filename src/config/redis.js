const { createClient } = require('redis');

const env = require('./env');

let client;

async function connectRedis() {
  if (!client) {
    client = createClient({ url: env.redisUrl });
  }

  if (!client.isOpen) {
    await client.connect();
  }

  return client;
}

function getRedisClient() {
  if (!client) {
    client = createClient({ url: env.redisUrl });
  }

  return client;
}

async function disconnectRedis() {
  if (client?.isOpen) {
    await client.quit();
  }
}

module.exports = {
  connectRedis,
  disconnectRedis,
  getRedisClient,
};
