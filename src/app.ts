import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorHandler, notFoundHandler } from './middleware/error-handler';
import routes from './routes';

const app = express();

app.use(helmet());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buffer) => {
      (req as express.Request).rawBody = Buffer.from(buffer);
    },
  }),
);

app.use(routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
