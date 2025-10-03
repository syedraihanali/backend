const mysql = require('mysql2/promise');
const config = require('./env');

// Shared MySQL connection pool used across the application.
const pool = mysql.createPool({
  host: config.database.host,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name,
  waitForConnections: true,
  connectionLimit: config.database.connectionLimit,
  queueLimit: 0,
  enableKeepAlive: true,
});

module.exports = pool;
