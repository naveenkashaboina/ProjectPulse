const app = require('./app');
const connectDB = require('./config/db');
const config = require('./config/env');

const startServer = async () => {
  await connectDB();

  const server = app.listen(config.PORT, () => {
    console.log(`\n🚀 ProjectPulse API running on port ${config.PORT}`);
    console.log(`   Environment: ${config.NODE_ENV}`);
    console.log(`   API: http://localhost:${config.PORT}/api`);
    console.log(`   Health: http://localhost:${config.PORT}/api/health\n`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION:', err.message);
    server.close(() => process.exit(1));
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err.message);
    server.close(() => process.exit(1));
  });
};

startServer();
