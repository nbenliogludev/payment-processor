import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

import openApiSpec from '../docs/openapi';

const router = Router();

router.get('/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

export default router;
