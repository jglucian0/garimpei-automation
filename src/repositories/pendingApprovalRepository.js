const pool = require('../infra/db');

class PendingApprovalRepository {
  async savePendingProduct(data) {
    const query = `
      INSERT INTO pending_approvals (
        session_id, source_chat_id, marketplace, title, 
        affiliate_link, original_link, original_price, 
        current_price, discount, free_shipping, 
        sold_quantity, coupon_applied, local_image_path
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id;
    `;

    const values = [
      data.session_id, data.source_chat_id, data.marketplace, data.product,
      data.link, data.linkOriginal, data.original_price,
      data.current_price, data.discount, data.free_shipping,
      data.soldQuantity, data.coupon_applied, data.local_image_path
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0].id;
    } catch (error) {
      throw new Error('Falha ao salvar produto na lista de aprovação.', { cause: error });
    }
  }

  async getPendingByUserId(userId) {
    const query = `
      SELECT pa.* FROM pending_approvals pa
      INNER JOIN whatsapp_sessions ws ON pa.session_id = ws.session_id
      WHERE ws.user_id = $1
      ORDER BY pa.created_at ASC;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async deletePendingItem(id, userId) {
    const query = `
      DELETE FROM pending_approvals pa
      USING whatsapp_sessions ws
      WHERE pa.session_id = ws.session_id
        AND pa.id = $1
        AND ws.user_id = $2
      RETURNING pa.id;
    `;
    const result = await pool.query(query, [id, userId]);
    return result.rowCount > 0;
  }

  async getPendingItemById(id, userId) {
    const query = `
      SELECT pa.* FROM pending_approvals pa
      INNER JOIN whatsapp_sessions ws ON pa.session_id = ws.session_id
      WHERE pa.id = $1 AND ws.user_id = $2;
    `;
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }
}

module.exports = new PendingApprovalRepository();