const pool = require('../infra/db');

class DispatchConfigRepository {

  async upsertConfig(data) {
    const query = `
      INSERT INTO dispatch_config (
        user_id, session_id, niche, interval_minutes, 
        window_1_start, window_1_end, window_2_start, window_2_end, is_paused
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (session_id, niche) 
      DO UPDATE SET 
        interval_minutes = EXCLUDED.interval_minutes,
        window_1_start = EXCLUDED.window_1_start,
        window_1_end = EXCLUDED.window_1_end,
        window_2_start = EXCLUDED.window_2_start,
        window_2_end = EXCLUDED.window_2_end,
        is_paused = EXCLUDED.is_paused,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const values = [
      data.userId, data.sessionId, data.niche, data.intervalMinutes,
      data.window1Start, data.window1End, data.window2Start || null, data.window2End || null,
      data.isPaused || false
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error('Falha ao salvar configuração de disparo.', { cause: error });
    }
  }

  async getConfigsByUserId(userId) {
    const query = `SELECT * FROM dispatch_config WHERE user_id = $1 ORDER BY created_at DESC;`;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async getConfigById(id, userId) {
    const query = `SELECT * FROM dispatch_config WHERE id = $1 AND user_id = $2;`;
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }

  async deleteConfig(id, userId) {
    const query = `DELETE FROM dispatch_config WHERE id = $1 AND user_id = $2 RETURNING id;`;
    const result = await pool.query(query, [id, userId]);
    return result.rowCount > 0;
  }

  async togglePause(id, userId, isPaused) {
    const query = `
      UPDATE dispatch_config 
      SET is_paused = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 AND user_id = $3 
      RETURNING *;
    `;
    const result = await pool.query(query, [isPaused, id, userId]);
    return result.rows[0];
  }

  async deleteConfigsBySessionId(sessionId, userId) {
    const query = `DELETE FROM dispatch_config WHERE session_id = $1 AND user_id = $2;`;
    await pool.query(query, [sessionId, userId]);
  }

  async getActiveConfigs() {
    const query = `SELECT * FROM dispatch_config WHERE is_paused = false;`;
    const result = await pool.query(query);
    return result.rows;
  }

  async updateLastExecution(id) {
    const query = `
      UPDATE dispatch_config 
      SET last_execution = NOW() AT TIME ZONE 'America/Sao_Paulo' 
      WHERE id = $1;
    `;

    await pool.query(query, [id]);
  }
}

module.exports = new DispatchConfigRepository();