const { garimpeiApiKey } = require('../config/env');

function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const userId = req.headers['x-user-id'];

  if (!apiKey || apiKey !== garimpeiApiKey) {
    return res.status(401).json({ error: 'Access denied. Invalid API key.' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'Access denied. x-user-id header is required.' });
  }

  req.userId = userId;
  next();
}

module.exports = authMiddleware;