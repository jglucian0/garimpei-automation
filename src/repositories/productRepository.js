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

  async getQueueMetrics(userId) {
    const query = `
      SELECT niche, COUNT(*) as pending_count
      FROM products
      WHERE user_id = $1 AND status = 'pending_dispatch'
      GROUP BY niche;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async getDashboardSummary(userId) {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'dispatched' AND updated_at >= CURRENT_DATE) as dispatched_today,
        COUNT(*) FILTER (WHERE status = 'dispatched' AND updated_at >= date_trunc('week', CURRENT_DATE)) as dispatched_week,
        COUNT(*) FILTER (WHERE status = 'pending_dispatch') as total_pending,
        COUNT(*) FILTER (WHERE status = 'failed') as total_failed
      FROM products 
      WHERE user_id = $1;
    `;

    const topNicheQuery = `
      SELECT niche, COUNT(*) as count 
      FROM products 
      WHERE user_id = $1 AND status = 'pending_dispatch' AND niche IS NOT NULL
      GROUP BY niche 
      ORDER BY count DESC 
      LIMIT 1;
    `;

    try {
      const summaryResult = await pool.query(query, [userId]);
      const topNicheResult = await pool.query(topNicheQuery, [userId]);

      const stats = summaryResult.rows[0];
      const topNiche = topNicheResult.rows[0] ? topNicheResult.rows[0].niche : 'Nenhum';

      return {
        dispatchedToday: parseInt(stats.dispatched_today || 0),
        dispatchedWeek: parseInt(stats.dispatched_week || 0),
        totalPending: parseInt(stats.total_pending || 0),
        totalFailed: parseInt(stats.total_failed || 0),
        topPendingNiche: topNiche
      };
    } catch (error) {
      throw new Error('Failed to fetch dashboard summary.', { cause: error });
    }
  }

  async getDailyCollectedCount(userId) {
    const query = `
      SELECT COUNT(*) as count 
      FROM products 
      WHERE user_id = $1 AND created_at >= CURRENT_DATE;
    `;
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }

  async incrementErrorCount(id) {
    const query = `
      UPDATE products 
      SET error_count = error_count + 1,
          status = CASE WHEN error_count + 1 >= 3 THEN 'failed' ELSE status END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING error_count, status;
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

}

module.exports = new ProductRepository();