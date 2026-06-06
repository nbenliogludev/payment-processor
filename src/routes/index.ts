import { Router } from 'express';

import docsRoutes from './docs.routes';
import healthRoutes from './health.routes';
import invoiceRoutes from './invoice.routes';
import webhookRoutes from './webhook.routes';

const router = Router();

router.use(docsRoutes);
router.use(healthRoutes);
router.use(invoiceRoutes);
router.use(webhookRoutes);

export default router;
