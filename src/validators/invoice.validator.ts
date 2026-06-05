import { z } from 'zod';

export const createInvoiceSchema = z
  .object({
    amount: z.string().trim().regex(/^\d+(\.\d{1,3})?$/, {
      message: 'amount must be a positive decimal string',
    }),
    currency: z.string().trim().regex(/^[A-Za-z]{3}$/, {
      message: 'currency must be a 3-letter ISO currency code',
    }),
    merchantId: z.string().trim().min(1),
  })
  .strict();

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
