const pool = require('../config/database');

// Execute a single query using the shared connection pool.
async function execute(query, params = []) {
  const [rows] = await pool.execute(query, params);
  return rows;
}

// Helper to run a series of statements within a transaction.
async function transaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  execute,
  transaction,
};
