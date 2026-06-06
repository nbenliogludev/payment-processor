import type { RequestHandler } from 'express';

import { verifyWebhookSecurity } from '../services/webhook-security.service';
import { processWebhookStatus } from '../services/webhook.service';
import type { WebhookInput } from '../validators/webhook.validator';

export const receiveWebhookController: RequestHandler = async (req, res, next) => {
  try {
    await verifyWebhookSecurity({
      rawBody: req.rawBody,
      signature: req.header('X-Signature'),
      timestamp: req.header('X-Timestamp'),
      nonce: req.header('X-Nonce'),
    });

    const invoice = await processWebhookStatus(req.validatedBody as WebhookInput);

    res.json({ data: invoice });
  } catch (error) {
    next(error);
  }
};
