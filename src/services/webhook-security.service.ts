import crypto from 'crypto';

import env from '../config/env';
import { getRedisClient } from '../config/redis';
import HttpError from '../errors/http-error';

interface WebhookSecurityInput {
  rawBody?: Buffer;
  signature?: string;
  timestamp?: string;
  nonce?: string;
}

function parseTimestamp(timestampHeader?: string): number {
  if (!timestampHeader) {
    throw new HttpError(401, 'Missing webhook timestamp');
  }

  const parsedTimestamp = Number(timestampHeader);

  if (!Number.isFinite(parsedTimestamp)) {
    throw new HttpError(401, 'Invalid webhook timestamp');
  }

  return parsedTimestamp < 1_000_000_000_000 ? parsedTimestamp * 1000 : parsedTimestamp;
}

function assertTimestampIsFresh(timestampHeader?: string): void {
  const timestamp = parseTimestamp(timestampHeader);
  const toleranceMs = env.webhookTimestampToleranceSeconds * 1000;

  if (Math.abs(Date.now() - timestamp) > toleranceMs) {
    throw new HttpError(401, 'Webhook timestamp is outside the allowed window');
  }
}

function normalizeSignature(signature: string): string {
  return signature.startsWith('sha256=') ? signature.slice('sha256='.length) : signature;
}

export function createWebhookSignature(rawBody: Buffer, secret = env.webhookSecret): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

function assertSignatureIsValid(rawBody?: Buffer, signature?: string): void {
  if (!rawBody || rawBody.length === 0) {
    throw new HttpError(401, 'Missing webhook raw body');
  }

  if (!signature) {
    throw new HttpError(401, 'Missing webhook signature');
  }

  const expectedSignature = Buffer.from(createWebhookSignature(rawBody), 'hex');
  const receivedSignature = Buffer.from(normalizeSignature(signature), 'hex');

  if (
    expectedSignature.length !== receivedSignature.length ||
    !crypto.timingSafeEqual(expectedSignature, receivedSignature)
  ) {
    throw new HttpError(401, 'Invalid webhook signature');
  }
}

async function assertNonceIsUnused(nonce?: string): Promise<void> {
  if (!nonce) {
    throw new HttpError(401, 'Missing webhook nonce');
  }

  const result = await getRedisClient().sendCommand([
    'SET',
    `webhook:nonce:${nonce}`,
    '1',
    'NX',
    'EX',
    String(env.webhookTimestampToleranceSeconds),
  ]);

  if (String(result) !== 'OK') {
    throw new HttpError(409, 'Webhook nonce has already been used');
  }
}

export async function verifyWebhookSecurity({
  rawBody,
  signature,
  timestamp,
  nonce,
}: WebhookSecurityInput): Promise<void> {
  assertSignatureIsValid(rawBody, signature);
  assertTimestampIsFresh(timestamp);
  await assertNonceIsUnused(nonce);
}
