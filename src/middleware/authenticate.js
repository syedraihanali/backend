const jwt = require('jsonwebtoken');
const config = require('../config/env');

// Verifies JWT bearer tokens and attaches the payload to the request context.
function authenticateToken(req, res, next) {
  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access token missing' });
  }

  const token = authorizationHeader.slice(7);

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid access token' });
  }
}

module.exports = authenticateToken;
