const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');

const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');

const app = express();

app.use(helmet());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buffer) => {
      req.rawBody = buffer;
    },
  }),
);

app.use(routes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
