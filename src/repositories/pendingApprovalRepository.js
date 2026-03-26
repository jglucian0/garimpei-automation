const pool = require('../infra/db');

class PendingApprovalRepository {
  async savePendingProduct(data) {
    const query = `
      INSERT INTO pending_approval (
        user_id, session_id, source_chat_id, marketplace, title, 
        affiliate_link, original_link, original_price, 
        current_price, discount, free_shipping, 
        sold_quantity, coupon_applied, local_image_path, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending_approval')
      ON CONFLICT (session_id, original_link) 
      DO UPDATE SET 
        current_price = EXCLUDED.current_price,
        original_price = EXCLUDED.original_price,
        discount = EXCLUDED.discount,
        title = EXCLUDED.title,
        free_shipping = EXCLUDED.free_shipping,
        sold_quantity = EXCLUDED.sold_quantity,
        coupon_applied = EXCLUDED.coupon_applied
      RETURNING *;
    `;

    const values = [
      data.userId, data.session_id, data.source_chat_id, data.marketplace, data.product,
      data.link, data.linkOriginal, data.original_price,
      data.current_price, data.discount, data.free_shipping,
      data.soldQuantity, data.coupon_applied, data.local_image_path
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error('Failed to save product to approval list.', { cause: error });
    }
  }

  async updatePendingItem(id, userId, data) {
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    const updatableFields = [
      'title', 'current_price', 'original_price', 'discount',
      'free_shipping', 'coupon_applied', 'local_image_path', 'sold_quantity'
    ];

    for (const field of updatableFields) {
      if (data[field] !== undefined) {
        setClauses.push(`${field} = $${paramIndex}`);
        values.push(data[field]);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) return this.getPendingItemById(id, userId);

    const query = `
      UPDATE pending_approval
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      RETURNING *;
    `;

    values.push(id, userId);
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async getPendingByUserId(userId) {
    const query = `
      SELECT * FROM pending_approval
      WHERE user_id = $1 AND status = 'pending_approval'
      ORDER BY created_at DESC;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async deletePendingItem(id, userId) {
    const query = `
      DELETE FROM pending_approval
      WHERE id = $1 AND user_id = $2
      RETURNING id;
    `;
    const result = await pool.query(query, [id, userId]);
    return result.rowCount > 0;
  }

  async getPendingItemById(id, userId) {
    const query = `
      SELECT * FROM pending_approval
      WHERE id = $1 AND user_id = $2;
    `;
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }
}

module.exports = new PendingApprovalRepository();