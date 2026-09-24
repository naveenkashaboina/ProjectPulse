require('dotenv').config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGODB_URI: process.env.NODE_ENV === 'test'
    ? (process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/projectpulse_test')
    : (process.env.MONGODB_URI || 'mongodb://localhost:27017/projectpulse'),
  JWT_SECRET: process.env.JWT_SECRET || 'default_jwt_secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  BCRYPT_SALT_ROUNDS: 12,
};
