/**
 * Script to generate correct X-Timestamp, X-Nonce and X-Signature headers
 * for testing the /webhook endpoint.
 *
 * Usage:
 *   npx ts-node src/scripts/generate-webhook-headers.ts [invoiceId] [status]
 *
 * Examples:
 *   npx ts-node src/scripts/generate-webhook-headers.ts 6a24ac2db0b638e0ff6c95ec paid
 *   npx ts-node src/scripts/generate-webhook-headers.ts 6a24ac2db0b638e0ff6c95ec failed
 */

import crypto from 'crypto';
import 'dotenv/config';

const secret = process.env.WEBHOOK_SECRET ?? 'change-me';
const invoiceId = process.argv[2] ?? '6a24ac2db0b638e0ff6c95ec';
const status = process.argv[3] ?? 'paid';

// 1. Build the exact JSON body (no extra spaces to keep the signature deterministic)
const body = JSON.stringify({ invoiceId, status });
const rawBody = Buffer.from(body, 'utf8');

// 2. Timestamp — milliseconds (13 digits), must be within WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS
const timestamp = String(Date.now());

// 3. Nonce — UUID v4 (unique per request, stored in Redis to prevent replay)
const nonce = crypto.randomUUID();

// 4. Signature — HMAC-SHA256 over the raw JSON body
const signature = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

console.log('\n=== Webhook request headers & body ===\n');
console.log(`Body:          ${body}`);
console.log(`X-Timestamp:   ${timestamp}`);
console.log(`X-Nonce:       ${nonce}`);
console.log(`X-Signature:   ${signature}`);

console.log('\n=== Ready-to-paste curl command ===\n');
console.log(
  `curl -X POST http://localhost:3000/webhook \\\n` +
    `  -H 'accept: application/json' \\\n` +
    `  -H 'Content-Type: application/json' \\\n` +
    `  -H 'X-Signature: ${signature}' \\\n` +
    `  -H 'X-Timestamp: ${timestamp}' \\\n` +
    `  -H 'X-Nonce: ${nonce}' \\\n` +
    `  -d '${body}'`,
);
console.log();
