import { Router } from 'express';

import { receiveWebhookController } from '../controllers/webhook.controller';
import { validateBody } from '../middleware/validate-request';
import { verifyWebhookSecurityMiddleware } from '../middleware/verify-webhook-security';
import { webhookSchema } from '../validators/webhook.validator';

const router = Router();

router.post(
  '/webhook',
  verifyWebhookSecurityMiddleware,
  validateBody(webhookSchema),
  receiveWebhookController,
);

export default router;
