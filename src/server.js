const { app, config } = require('./app');
const { ensureSchema } = require('./database/schema');

// Bootstraps the application by ensuring the database schema is present
// before binding the HTTP server.
async function bootstrap() {
  await ensureSchema();

  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running at http://localhost:${config.port}`);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', error);
  process.exit(1);
});
