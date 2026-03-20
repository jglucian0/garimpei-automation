const fs = require('fs');
const path = require('path');

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

  createSession(userId, sessionId) {
    if (this.sessions.has(sessionId)) return true;

    if (this.isUserLimitReached(userId)) {
      console.warn(`[SessionManager] Usuário ${userId} atingiu o limite de ${this.MAX_SESSIONS_PER_USER} sessões.`);
      return false;
    }

    this.sessions.set(sessionId, this.createSessionState(userId, sessionId));
    return true;
  }

  loadExistingSessions() {
    const tokensPath = this.getTokensPath();
    if (!fs.existsSync(tokensPath)) return;

    const sessionFolders = fs.readdirSync(tokensPath);

    sessionFolders.forEach((sessionId) => {
      this.sessions.set(sessionId, {
        id: sessionId,
        userId: 'unknown_until_loaded',
        ...DEFAULT_SESSION_STATE
      });
    });
  }

  removeSession(sessionId) {
    if (!this.sessions.has(sessionId)) return;
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