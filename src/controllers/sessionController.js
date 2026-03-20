const fs = require('fs');
const path = require('path');

const WppService = require('../services/wppService');
const manager = require('../services/sessionSingleton');

const wppService = new WppService(manager);

async function startSession(req, res) {
  const { userId, sessionId } = req.body;

  if (!userId || !sessionId) {
    return res.status(400).json({
      error: 'Os campos userId e sessionId são obrigatórios.'
    });
  }

  const canCreate = manager.createSession(userId, sessionId);

  if (!canCreate && !manager.getSession(sessionId)) {
    return res.status(403).json({
      error: 'Limite de instâncias do WhatsApp atingido para este usuário.'
    });
  }

  wppService.initSession(sessionId);

  return res.status(201).json({
    message: `Processo de conexão iniciado para a sessão ${sessionId}. Aguarde o QR Code.`
  });
}

function checkStatus(req, res) {
  const { sessionId } = req.params;
  const session = manager.getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Sessão não encontrada.' });
  }

  return res.json({
    sessionId: session.id,
    userId: session.userId,
    status: session.status,
    qrcode: session.qrcode
  });
}

function listSessions(_req, res) {
  const sessions = manager.getAllSessions();

  const payload = sessions.map((session) => ({
    sessionId: session.id,
    userId: session.userId,
    status: session.status,
    qrcode: session.qrcode || null,
    interfaceReady: Boolean(session.interfaceReady)
  }));

  return res.json(payload);
}

async function deleteSession(req, res) {
  const { sessionId } = req.params;

  try {
    const session = manager.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada.' });
    }

    await wppService.closeSession(sessionId);

    manager.removeSession(sessionId);

    const tokensPath = path.join(process.cwd(), 'tokens', sessionId);
    if (fs.existsSync(tokensPath)) {
      fs.rmSync(tokensPath, { recursive: true, force: true });
      console.log(`[Session] Tokens removidos do disco: ${sessionId}`);
    }

    return res.json({ success: true, message: 'Sessão desconectada e removida com sucesso.' });
  } catch (error) {
    console.error(`[SessionController] Erro ao remover sessão ${sessionId}:`, error.message);
    return res.status(500).json({ error: 'Falha interna ao remover sessão.' });
  }
}

async function getGroups(req, res) {
  const { sessionId } = req.params;

  try {
    const groups = await wppService.getAllGroups(sessionId);
    return res.json(groups);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

module.exports = {
  startSession,
  checkStatus,
  deleteSession,
  getGroups,
  listSessions,
  manager,
  wppService
};