import type { RequestHandler } from 'express';

import { createInvoice } from '../services/invoice.service';
import type { CreateInvoiceInput } from '../validators/invoice.validator';

export const createInvoiceController: RequestHandler = async (req, res, next) => {
  try {
    const invoice = await createInvoice(req.validatedBody as CreateInvoiceInput);

    res.status(201).json({ data: invoice });
  } catch (error) {
    next(error);
  }
};
