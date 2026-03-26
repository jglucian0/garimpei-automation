const pool = require('../infra/db');

class ProductRepository {
  async approveAndUpsert(data, userId) {
    const query = `
      INSERT INTO products (
        user_id, marketplace, title, original_link, affiliate_link,
        original_price, current_price, discount, free_shipping,
        sold_quantity, coupon_applied, local_image_path, status, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending_dispatch', CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, original_link) 
      DO UPDATE SET 
        current_price = EXCLUDED.current_price,
        original_price = EXCLUDED.original_price,
        discount = EXCLUDED.discount,
        affiliate_link = EXCLUDED.affiliate_link,
        status = 'pending_dispatch',
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, title, status;
    `;

    const values = [
      userId,
      data.marketplace,
      data.title,
      data.original_link,
      data.affiliate_link,
      data.original_price,
      data.current_price,
      data.discount,
      data.free_shipping,
      data.sold_quantity,
      data.coupon_applied,
      data.local_image_path
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
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