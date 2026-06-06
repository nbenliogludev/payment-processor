import type { RequestHandler } from 'express';

import { createInvoice, getInvoiceById } from '../services/invoice.service';
import type { CreateInvoiceInput } from '../validators/invoice.validator';

export const createInvoiceController: RequestHandler = async (req, res, next) => {
  try {
    const invoice = await createInvoice(req.validatedBody as CreateInvoiceInput);

    res.status(201).json({ data: invoice });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceController: RequestHandler = async (req, res, next) => {
  try {
    const invoice = await getInvoiceById(String(req.params.id));

    res.json({ data: invoice });
  } catch (error) {
    next(error);
  }
};
