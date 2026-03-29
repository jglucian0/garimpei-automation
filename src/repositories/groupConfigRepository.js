const pool = require('../infra/db');

class GroupConfigRepository {

  async registerGroup(userId, sessionId, groupId, groupName, role, niche) {
    const query = `
      INSERT INTO group_config (user_id, session_id, group_id, group_name, role, niche)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (session_id, group_id) 
      DO UPDATE SET 
        user_id = EXCLUDED.user_id,
        group_name = EXCLUDED.group_name, 
        role = EXCLUDED.role, 
        niche = EXCLUDED.niche;
    `;
    await pool.query(query, [userId, sessionId, groupId, groupName, role, niche]);
    return true;
  }

  async countDispatchGroupsByUserId(userId) {
    const query = `
      SELECT COUNT(*) as count 
      FROM group_config
      WHERE user_id = $1 AND role = 'dispatch';
    `;
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }

  async getDispatchGroups(sessionId, niche) {
    const query = `
      SELECT group_id FROM group_config 
      WHERE session_id = $1 AND niche = $2 AND role = 'dispatch';
    `;
    const result = await pool.query(query, [sessionId, niche]);
    return result.rows.map(row => row.group_id);
  }

  async isCollectorGroup(sessionId, groupId) {
    const query = `
      SELECT 1 FROM group_config
      WHERE session_id = $1 AND group_id = $2 AND role = 'coletor'
    `;
    const result = await pool.query(query, [sessionId, groupId]);
    return result.rowCount > 0;
  }
}

module.exports = new GroupConfigRepository();