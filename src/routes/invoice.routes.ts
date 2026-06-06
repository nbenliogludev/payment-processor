import { Router } from 'express';

import { createInvoiceController, getInvoiceController } from '../controllers/invoice.controller';
import { validateBody } from '../middleware/validate-request';
import { createInvoiceSchema } from '../validators/invoice.validator';

const router = Router();

router.post('/invoice', validateBody(createInvoiceSchema), createInvoiceController);
router.get('/invoice/:id', getInvoiceController);

export default router;
