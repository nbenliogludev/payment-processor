import { z } from 'zod';

export const webhookSchema = z
  .object({
    invoiceId: z.string().trim().min(1),
    status: z.enum(['paid', 'failed']),
  })
  .strict();

export type WebhookInput = z.infer<typeof webhookSchema>;
