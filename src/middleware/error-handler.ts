import type { ErrorRequestHandler, RequestHandler } from 'express';

interface ErrorResponse {
  error: {
    message: string;
    details?: unknown;
  };
}

type HttpErrorLike = Error & {
  statusCode?: number;
  details?: unknown;
};

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
};

export const errorHandler: ErrorRequestHandler = (error: HttpErrorLike, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const response: ErrorResponse = {
    error: {
      message: statusCode === 500 ? 'Internal server error' : error.message,
    },
  };

  if (error.details && statusCode !== 500) {
    response.error.details = error.details;
  }

  res.status(statusCode).json(response);
};
