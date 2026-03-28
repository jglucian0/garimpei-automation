const fs = require('fs');
const path = require('path');

const WppService = require('../services/wppService');
const manager = require('../services/sessionSingleton');
const dispatchConfigRepository = require('../repositories/dispatchConfigRepository');

const wppService = new WppService(manager);

async function startSession(req, res) {
  const { userId, sessionId } = req.body;

  if (!userId || !sessionId) {
    return res.status(400).json({
      error: 'The userId and sessionId fields are mandatory.'
    });
  }

  const canCreate = await manager.createSession(userId, sessionId);

  if (!canCreate && !manager.getSession(sessionId)) {
    return res.status(403).json({
      error: 'WhatsApp instance limit reached for this user.'
    });
  }

  wppService.initSession(sessionId);

  return res.status(201).json({
    message: `Connection process started for session ${sessionId}. Wait for the QR Code.`
  });
}

function checkStatus(req, res) {
  const { sessionId } = req.params;
  const session = manager.getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  return res.json({
    sessionId: session.id,
    userId: session.userId,
    status: session.status,
    qrcode: session.qrcode
  });
}

function listSessions(_req, res) {
  let sessions = manager.getAllSessions();

  if (!Array.isArray(sessions)) {
    sessions = Object.values(sessions);
  }

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
      return res.status(404).json({ error: 'Session not found.' });
    }

    const userId = req.userId || session.userId;

    await wppService.closeSession(sessionId);

    await manager.removeSession(sessionId);

    const tokensPath = path.join(process.cwd(), 'tokens', sessionId);
    if (fs.existsSync(tokensPath)) {
      fs.rmSync(tokensPath, { recursive: true, force: true });
    }

    try {
      if (userId) {
        await dispatchConfigRepository.deleteConfigsBySessionId(sessionId, userId);
        console.log(`[Session] Cleanup: Session trigger settings ${sessionId} have been removed.`);
      }
    } catch (dbError) {
      console.error(`[Session] Error clearing trigger configs for session ${sessionId}:`, dbError.message);
    }

    return res.json({ success: true, message: 'Session disconnected and removed successfully.' });
  } catch (error) {
    console.error(`[SessionController] Error removing session ${sessionId}:`, error.message);
    return res.status(500).json({ error: 'Internal failure to remove session.' });
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