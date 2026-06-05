import { Router } from 'express';

import docsRoutes from './docs.routes';
import healthRoutes from './health.routes';
import invoiceRoutes from './invoice.routes';

const router = Router();

router.use(docsRoutes);
router.use(healthRoutes);
router.use(invoiceRoutes);

export default router;
