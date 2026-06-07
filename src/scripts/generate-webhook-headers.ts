import crypto from 'crypto';
import 'dotenv/config';

const secret = process.env.WEBHOOK_SECRET ?? 'change-me';
const invoiceId = process.argv[2] ?? '6a24ac2db0b638e0ff6c95ec';
const status = process.argv[3] ?? 'paid';

const body = JSON.stringify({ invoiceId, status });
const rawBody = Buffer.from(body, 'utf8');

const timestamp = String(Date.now());

const nonce = crypto.randomUUID();

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
