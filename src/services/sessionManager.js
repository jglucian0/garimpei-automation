const fs = require('fs');
const path = require('path');
const whatsappSessionRepository = require('../repositories/whatsappSessionRepository');

const DEFAULT_SESSION_STATE = {
  status: 'starting',
  client: null,
  qrcode: null,
  interfaceReady: false
};

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.MAX_SESSIONS_PER_USER = 2;
  }

  async createSession(userId, sessionId) {
    if (this.sessions.has(sessionId)) return true;

    if (this.isUserLimitReached(userId)) {
      console.warn(`[SessionManager] Usuário ${userId} atingiu o limite de ${this.MAX_SESSIONS_PER_USER} sessões.`);
      return false;
    }

    await whatsappSessionRepository.saveSession(sessionId, userId);

    this.sessions.set(sessionId, this.createSessionState(userId, sessionId));
    return true;
  }

  async loadExistingSessions() {
    const tokensPath = this.getTokensPath();
    if (!fs.existsSync(tokensPath)) return;

    // Pega apenas as pastas (ignora arquivos soltos)
    const sessionFolders = fs.readdirSync(tokensPath).filter(f => fs.lstatSync(path.join(tokensPath, f)).isDirectory());

    for (const sessionId of sessionFolders) {
      // Vai no banco de dados e pergunta de quem é essa sessão
      const dbUserId = await whatsappSessionRepository.getUserIdBySession(sessionId);

      const userId = dbUserId || 'unknown_until_loaded';

      if (!dbUserId) {
        console.warn(`[SessionManager] ATENÇÃO: Sessão ${sessionId} encontrada no disco, mas sem dono no banco de dados!`);
      }

      this.sessions.set(sessionId, {
        id: sessionId,
        userId: userId,
        ...DEFAULT_SESSION_STATE
      });
    }
  }

  async removeSession(sessionId) {
    if (!this.sessions.has(sessionId)) return;

    // Deleta do Banco de Dados
    await whatsappSessionRepository.deleteSession(sessionId);

    this.sessions.delete(sessionId);
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  updateSession(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.sessions.set(sessionId, { ...session, ...data });
  }

  isUserLimitReached(userId) {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        count++;
      }
    }
    return count >= this.MAX_SESSIONS_PER_USER;
  }

  createSessionState(userId, sessionId) {
    return {
      id: sessionId,
      userId: userId,
      ...DEFAULT_SESSION_STATE
    };
  }

  getTokensPath() {
    return path.join(process.cwd(), 'tokens');
  }
}

module.exports = SessionManager;