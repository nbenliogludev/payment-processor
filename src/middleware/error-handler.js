function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
}

function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    error: {
      message: statusCode === 500 ? 'Internal server error' : error.message,
    },
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
