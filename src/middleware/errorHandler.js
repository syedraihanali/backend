function errorHandler(err, req, res, next) {
  // Log errors to help troubleshooting without leaking implementation details to clients.
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);

  if (res.headersSent) {
    return next(err);
  }

  const status = err.statusCode || 500;
  const message =
    status >= 500 ? 'Internal server error' : err.message || 'Request could not be processed';

  return res.status(status).json({ error: message });
}

module.exports = errorHandler;
