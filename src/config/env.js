const dotenv = require('dotenv');

// Load environment variables from the .env file once at application boot.
dotenv.config();

const requiredVariables = ['JWT_SECRET'];

requiredVariables.forEach((variable) => {
  if (!process.env[variable]) {
    throw new Error(`Environment variable ${variable} is required but was not provided.`);
  }
});

const config = {
  port: Number.parseInt(process.env.PORT, 10) || 5001,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'clinic',
    connectionLimit: Number.parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  },
};

module.exports = config;
