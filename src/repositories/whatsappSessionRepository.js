const pool = require('../infra/db');

class WhatsappSessionRepository {
  async saveSession(sessionId, userId) {
    const query = `
      INSERT INTO whatsapp_sessions (session_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (session_id) DO UPDATE SET user_id = EXCLUDED.user_id;
    `;
    await pool.query(query, [sessionId, userId]);
  }

  async getUserIdBySession(sessionId) {
    const query = `SELECT user_id FROM whatsapp_sessions WHERE session_id = $1 LIMIT 1;`;
    const result = await pool.query(query, [sessionId]);
    return result.rows.length ? result.rows[0].user_id : null;
  }

  async deleteSession(sessionId) {
    const query = `DELETE FROM whatsapp_sessions WHERE session_id = $1;`;
    await pool.query(query, [sessionId]);
  }
}

module.exports = new WhatsappSessionRepository();