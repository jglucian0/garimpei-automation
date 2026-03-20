const { garimpeiApiKey } = require('../config/env');

function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const userId = req.headers['x-user-id'];

  if (!apiKey || apiKey !== garimpeiApiKey) {
    return res.status(401).json({ error: 'Acesso negado. Chave de API inválida.' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'Acesso negado. Cabeçalho x-user-id é obrigatório.' });
  }

  req.userId = userId;
  next();
}

module.exports = authMiddleware;