const express = require("express");

module.exports = function (pool) {
  const router = express.Router();

  // API สำหรับดึงข้อมูลออเดอร์ทั้งหมด พร้อมรายการสินค้าในแต่ละบิล
  router.get("/orders", async (req, res) => {
    try {
      // 1. ดึงข้อมูลหัวบิลจากตาราง orders เรียงจากล่าสุดไปเก่าสุด
      const ordersQuery = `
        SELECT id, employee_id, employee_name, department, quotation_image, delivery_image, suggestions, created_at
        FROM orders
        ORDER BY id DESC;
      `;
      const ordersResult = await pool.query(ordersQuery);
      const orders = ordersResult.rows;

      // 2. วนลูปดึงรายการสินค้าจากตาราง order_items ของแต่ละออเดอร์
      const fullOrders = [];
      for (let order of orders) {
        const itemsQuery = `
          SELECT product_code, product_name, category, description, cost_price, selling_price, stock_at_time, quantity_taken
          FROM order_items
          WHERE order_id = $1;
        `;
        const itemsResult = await pool.query(itemsQuery, [order.id]);
        
        // 3. รวมหัวบิลกับรายการสินค้าเข้าด้วยกันเป็นก้อนเดียว
        fullOrders.push({
          ...order,
          items: itemsResult.rows
        });
      }

      // 4. ส่งข้อมูลทั้งหมดกลับไปให้หน้า order.html ในรูปแบบ JSON
      res.json(fullOrders);

    } catch (err) {
      console.error("Error fetching orders:", err.message);
      res.status(500).json({ success: false, message: "Server Error: ไม่สามารถดึงข้อมูลออเดอร์ได้" });
    }
  });

  return router;
};