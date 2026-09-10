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
          o.status, -- เพิ่มฟิลด์สถานะตรงนี้
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

  // เพิ่ม API สำหรับกดรับออเดอร์ (เปลี่ยนสถานะเป็น accepted เพื่อซ่อนจากทุกจอ)
  router.put("/accept/:id", async (req, res) => {
    const orderId = req.params.id;
    try {
      await pool.query("UPDATE orders SET status = 'accepted' WHERE id = $1", [orderId]);
      res.json({ message: "รับออเดอร์สำเร็จ" });
    } catch (err) {
      console.error("Error accepting order:", err);
      res.status(500).json({ error: "ไม่สามารถอัปเดตสถานะออเดอร์ได้" });
    }
  });
  // ยกเลิกออเดอร์: คืนสต็อกสินค้า และลบข้อมูลออเดอร์ออกจากระบบ
  router.delete("/cancel/:id", async (req, res) => {
    const orderId = req.params.id;
    const client = await pool.connect();

    try {
      await client.query("BEGIN"); // เริ่ม Transaction

      // 1. ดึงรายการสินค้าทั้งหมดในออเดอร์นี้ เพื่อเอาจำนวนไปคืนสต็อก
      const itemsResult = await client.query(
        "SELECT product_code, quantity_taken FROM order_items WHERE order_id = $1",
        [orderId],
      );

      // 2. คืนสต็อกสินค้ากลับเข้าตาราง product_inventory
      for (let item of itemsResult.rows) {
        await client.query(
          "UPDATE product_inventory SET stock_remaining = stock_remaining + $1 WHERE product_code = $2",
          [item.quantity_taken, item.product_code],
        );
      }

      // 3. ลบรายการสินค้าในบิลออกจากตาราง order_items (ป้องกันปัญหา Foreign Key)
      await client.query("DELETE FROM order_items WHERE order_id = $1", [
        orderId,
      ]);

      // 4. ลบหัวบิลคำสั่งซื้อออกจากตาราง orders
      const deleteOrderResult = await client.query(
        "DELETE FROM orders WHERE id = $1",
        [orderId],
      );

      if (deleteOrderResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "ไม่พบออเดอร์ที่ต้องการยกเลิก" });
      }

      await client.query("COMMIT"); // ยืนยันการทำงานทั้งหมด
      res.json({ message: "ยกเลิกออเดอร์และคืนสต็อกสำเร็จเรียบร้อยแล้ว" });
    } catch (err) {
      await client.query("ROLLBACK"); // ถ้ามีข้อผิดพลาด ให้ยกเลิกทั้งหมด
      console.error("Error cancelling order:", err);
      res.status(500).json({ error: "ไม่สามารถยกเลิกออเดอร์ได้" });
    } finally {
      client.release();
    }
  });

  return router;
};
