const express = require("express");

module.exports = function (pool) {
  const router = express.Router();

  // ดึงรายการออเดอร์ทั้งหมด พร้อม JOIN ข้อมูลชื่อและแผนกจากตาราง order_fulfillments โดยตรง
  router.get("/orders", async (req, res) => {
    try {
      const query = `
        SELECT 
          o.*, 
          COALESCE(of_fill.fullname, o.employee_name, 'ยังไม่มีผู้ปฏิบัติงาน') AS fulfiller_name,
          COALESCE(of_fill.department, o.department, 'Warehouse') AS fulfiller_dept,
          of_fill.created_at AS fulfilled_at
        FROM public.orders o
        LEFT JOIN public.order_fulfillments of_fill ON o.id = of_fill.order_id
        ORDER BY o.id DESC
      `;
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching checker orders:", err);
      res.status(500).json({ error: "ไม่สามารถดึงข้อมูลออเดอร์ได้: " + err.message });
    }
  });

  return router;
};