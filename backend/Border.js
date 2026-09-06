const express = require("express");

module.exports = function (pool) {
  const router = express.Router();

  // ดึงรายการออเดอร์ทั้งหมด พร้อมรายการสินค้า (items) ข้างใน
  router.get("/", async (req, res) => {
    try {
      const query = `
        SELECT 
          o.id,
          o.employee_id,
          o.employee_name,
          o.department,
          o.quotation_image,
          o.delivery_image,
          o.suggestions,
          o.created_at,
          COALESCE(
            json_agg(
              json_build_object(
                'id', i.id,
                'item_no', i.item_no,
                'product_code', i.product_code,
                'product_name', i.product_name,
                'category', i.category,
                'description', i.description,
                'cost_price', i.cost_price,
                'selling_price', i.selling_price,
                'stock_at_time', i.stock_at_time,
                'quantity_taken', i.quantity_taken
              )
            ) FILTER (WHERE i.id IS NOT NULL), '[]'
          ) AS items
        FROM orders o
        LEFT JOIN order_items i ON o.id = i.order_id
        GROUP BY o.id
        ORDER BY o.created_at DESC;
      `;

      const result = await pool.query(query);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching orders:", err);
      res.status(500).json({ error: "ไม่สามารถดึงข้อมูลออเดอร์ได้" });
    }
  });

  return router;
};
