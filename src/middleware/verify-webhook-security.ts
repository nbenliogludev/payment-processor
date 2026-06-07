import type { RequestHandler } from 'express';

import { verifyWebhookSecurity } from '../services/webhook-security.service';

export const verifyWebhookSecurityMiddleware: RequestHandler = async (req, _res, next) => {
  try {
    await verifyWebhookSecurity({
      rawBody: req.rawBody,
      signature: req.header('X-Signature'),
      timestamp: req.header('X-Timestamp'),
      nonce: req.header('X-Nonce'),
    });

    next();
  } catch (error) {
    next(error);
  }
};
