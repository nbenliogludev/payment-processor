import { Router } from 'express';

import { receiveWebhookController } from '../controllers/webhook.controller';
import { validateBody } from '../middleware/validate-request';
import { webhookSchema } from '../validators/webhook.validator';

const router = Router();

router.post('/webhook', validateBody(webhookSchema), receiveWebhookController);

export default router;
