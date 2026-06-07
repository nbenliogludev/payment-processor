import type { RequestHandler } from 'express';

import { processWebhookStatus } from '../services/webhook.service';
import type { WebhookInput } from '../validators/webhook.validator';

export const receiveWebhookController: RequestHandler = async (req, res, next) => {
  try {
    const invoice = await processWebhookStatus(req.validatedBody as WebhookInput);

    res.json({ data: invoice });
  } catch (error) {
    next(error);
  }
};
