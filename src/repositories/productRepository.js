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
    const query = `
      UPDATE products
      SET 
        title = COALESCE($1, title),
        current_price = COALESCE($2, current_price),
        original_price = COALESCE($3, original_price),
        discount = COALESCE($4, discount),
        free_shipping = COALESCE($5, free_shipping),
        coupon_applied = COALESCE($6, coupon_applied),
        niche = COALESCE($7, niche),
        status = COALESCE($8, status),
        local_image_path = COALESCE($9, local_image_path), 
        sold_quantity = COALESCE($10, sold_quantity),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10 AND user_id = $11
      RETURNING *;
    `;

    const values = [
      data.title, data.current_price, data.original_price,
      data.discount, data.free_shipping, data.coupon_applied,
      data.niche, data.status, data.local_image_path, data.sold_quantity,
      id, userId
    ];

    const result = await pool.query(query, values);
    return result.rows[0]; // Retorna o produto atualizado ou undefined se não achar
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