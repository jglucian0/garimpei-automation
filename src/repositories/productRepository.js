const pool = require('../infra/db');

class ProductRepository {
  async getNextProductForDispatch(userId, niche) {
    const query = `
      SELECT * FROM products 
      WHERE user_id = $1 AND niche = $2 AND status = 'pending_dispatch'
      ORDER BY created_at ASC 
      LIMIT 1 
      FOR UPDATE SKIP LOCKED;
    `;
    const result = await pool.query(query, [userId, niche]);
    return result.rows[0];
  }

  async markAsDispatched(id) {
    const query = `UPDATE products SET status = 'dispatched', updated_at = CURRENT_TIMESTAMP WHERE id = $1`;
    await pool.query(query, [id]);
  }

  async approveAndUpsert(data, userId) {
    const query = `
      INSERT INTO products (
        user_id, marketplace, title, 
        affiliate_link, original_link, original_price, 
        current_price, discount, free_shipping, 
        sold_quantity, coupon_applied, local_image_path, status, niche
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending_dispatch', $13)
      ON CONFLICT (user_id, original_link) 
      DO UPDATE SET 
        current_price = EXCLUDED.current_price,
        original_price = EXCLUDED.original_price,
        discount = EXCLUDED.discount,
        title = EXCLUDED.title,
        free_shipping = EXCLUDED.free_shipping,
        sold_quantity = EXCLUDED.sold_quantity,
        coupon_applied = EXCLUDED.coupon_applied,
        niche = EXCLUDED.niche,
        status = 'pending_dispatch',
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const values = [
      userId,
      data.marketplace,
      data.title,
      data.affiliate_link,
      data.original_link,
      data.original_price,
      data.current_price,
      data.discount,
      data.free_shipping,
      data.sold_quantity,
      data.coupon_applied,
      data.local_image_path,
      data.niche
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error('Failed to approve product and move to main queue.', { cause: error });
    }
  }

  async getProductsByUserId(userId) {
    const query = `
      SELECT * FROM products 
      WHERE user_id = $1 
      ORDER BY updated_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async getProductById(id, userId) {
    const query = `
      SELECT * FROM products 
      WHERE id = $1 AND user_id = $2;
    `;
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }

  async getDispatchedHistory(userId) {
    const query = `
      SELECT * FROM products 
      WHERE user_id = $1 
        AND status = 'dispatched' 
        AND updated_at >= NOW() - INTERVAL '7 days'
      ORDER BY updated_at DESC;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async updateProduct(id, userId, data) {
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    const updatableFields = [
      'title', 'current_price', 'original_price', 'discount',
      'free_shipping', 'coupon_applied', 'niche', 'status',
      'local_image_path', 'sold_quantity'
    ];

    for (const field of updatableFields) {
      if (data[field] !== undefined) {
        setClauses.push(`${field} = $${paramIndex}`);
        values.push(data[field]);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return this.getProductById(id, userId);
    }

    const query = `
      UPDATE products
      SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      RETURNING *;
    `;

    values.push(id, userId);

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async deleteProduct(id, userId) {
    const query = `
      DELETE FROM products 
      WHERE id = $1 AND user_id = $2 
      RETURNING local_image_path;
    `;
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }

}

module.exports = new ProductRepository();