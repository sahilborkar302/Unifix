const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/unifix',
  jwtSecret: process.env.JWT_SECRET || 'unifix-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
};

if (env.nodeEnv === 'production' && env.jwtSecret === 'unifix-dev-secret-change-me') {
  console.warn('[UNIFIX] WARNING: set a strong JWT_SECRET in .env for production.');
}

module.exports = env;
