const pool = require('../infra/db');

class IngestionQueueRepository {
  async enqueue(data) {
    const query = `
      INSERT INTO ingestion_queue (user_id, session_id, chat_id, extracted_url, image_path, raw_text, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING id;
    `;
    const values = [data.userId, data.sessionId, data.chatId, data.extractedUrl, data.imagePath, data.rawText];
    const result = await pool.query(query, values);
    return result.rows[0].id;
  }

  async getNextAndLock() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const selectQuery = `
        SELECT * FROM ingestion_queue 
        WHERE status = 'pending' 
        ORDER BY id ASC 
        LIMIT 1 
        FOR UPDATE SKIP LOCKED;
      `;
      const result = await client.query(selectQuery);

      if (result.rows.length === 0) {
        await client.query('COMMIT');
        return null;
      }

      const item = result.rows[0];

      await client.query(`UPDATE ingestion_queue SET status = 'processing' WHERE id = $1`, [item.id]);

      await client.query('COMMIT');
      return item;

    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error('Falha grave ao orquestrar a fila de ingestão.', { cause: error });
    } finally {
      client.release()
    }
  }

  async updateStatus(id, status) {
    const query = `UPDATE ingestion_queue SET status = $1 WHERE id = $2`;
    await pool.query(query, [status, id]);
  }

  async updateStatus(id, status) {
    const query = `UPDATE ingestion_queue SET status = $1 WHERE id = $2`;
    await pool.query(query, [status, id]);
  }

  async deleteItem(id) {
    const query = `DELETE FROM ingestion_queue WHERE id = $1`;
    await pool.query(query, [id]);
  }
}

module.exports = new IngestionQueueRepository();