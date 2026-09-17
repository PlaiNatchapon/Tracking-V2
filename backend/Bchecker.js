const express = require("express");

module.exports = function (pool) {
  const router = express.Router();

  // 1. ดึงรายการออเดอร์ พร้อมเช็คและเคลียร์สถานะล็อคที่หมดอายุ (> 2 นาที)
  router.get("/orders", async (req, res) => {
    try {
      // อัปเดตปลดล็อคอัตโนมัติหาก locked_at ผ่านไปนานกว่า 2 นาที
      await pool.query(`
        UPDATE public.orders 
        SET locked_by = NULL, locked_at = NULL 
        WHERE locked_at < NOW() - INTERVAL '2 minutes' AND locked_by IS NOT NULL
      `);

      const query = `
        SELECT 
          o.*, 
          COALESCE(of_fill.fullname, o.employee_name, 'ยังไม่มีผู้ปฏิบัติงาน') AS fulfiller_name,
          COALESCE(of_fill.department, o.department, 'Warehouse') AS fulfiller_dept,
          of_fill.created_at AS fulfilled_at
        FROM public.orders o
        LEFT JOIN public.order_fulfillments of_fill ON o.id = of_fill.order_id
        WHERE o.payment_slip IS NULL OR o.payment_slip = ''
        ORDER BY o.id DESC
      `;
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching checker orders:", err);
      res.status(500).json({ error: "ไม่สามารถดึงข้อมูลออเดอร์ได้: " + err.message });
    }
  });

  // 2. API สำหรับล็อคออเดอร์เมื่อกดเข้ามาตรวจสอบ
  router.post("/orders/:id/lock", async (req, res) => {
    const orderId = req.params.id;
    const { checkerName } = req.body;

    try {
      // เช็คสถานะปัจจุบันของออเดอร์นี้ก่อน
      const checkQuery = `SELECT locked_by, locked_at FROM public.orders WHERE id = $1`;
      const checkResult = await pool.query(checkQuery, [orderId]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: "ไม่พบออเดอร์นี้ในระบบ" });
      }

      const order = checkResult.rows[0];
      const now = new Date();

      // เช็คว่ามีคนอื่นล็อคอยู่และยังไม่หมดอายุ (ภายใน 2 นาที)
      if (order.locked_by && order.locked_by !== checkerName && order.locked_at) {
        const lockTime = new Date(order.locked_at);
        const diffMinutes = (now - lockTime) / 1000 / 60;
        
        if (diffMinutes < 2) {
          return res.status(400).json({ error: `ออเดอร์นี้กำลังถูกตรวจสอบโดย ${order.locked_by} อยู่ในขณะนี้` });
        }
      }

      // ทำการล็อคออเดอร์ บันทึกชื่อคนล็อคและเวลาปัจจุบัน
      const lockQuery = `
        UPDATE public.orders 
        SET locked_by = $1, locked_at = NOW() 
        WHERE id = $2
        RETURNING *
      `;
      await pool.query(lockQuery, [checkerName, orderId]);

      res.json({ success: true, message: "ล็อคออเดอร์สำเร็จ" });
    } catch (err) {
      console.error("Error locking order:", err);
      res.status(500).json({ error: "ไม่สามารถล็อคออเดอร์ได้: " + err.message });
    }
  });

  // 3. API สำหรับรับสัญญาณ Heartbeat (อัปเดต locked_at เป็นเวลาปัจจุบันเพื่อต่ออายุ)
  router.post("/orders/:id/heartbeat", async (req, res) => {
    const orderId = req.params.id;
    const { checkerName } = req.body;

    try {
      const query = `
        UPDATE public.orders 
        SET locked_at = NOW() 
        WHERE id = $1 AND locked_by = $2
        RETURNING id
      `;
      const result = await pool.query(query, [orderId, checkerName]);

      if (result.rowCount === 0) {
        return res.status(400).json({ error: "หลุดจากการล็อคหรือสิทธิ์หมดอายุแล้ว" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error heartbeat:", err);
      res.status(500).json({ error: "เกิดข้อผิดพลาดในการต่ออายุล็อค" });
    }
  });

  // 4. API สำหรับปลดล็อค (เมื่อกดยกเลิกหรือปิดหน้าต่าง)
  router.post("/orders/:id/unlock", async (req, res) => {
    const orderId = req.params.id;
    const { checkerName } = req.body;

    try {
      await pool.query(`
        UPDATE public.orders 
        SET locked_by = NULL, locked_at = NULL 
        WHERE id = $1 AND (locked_by = $2 OR $2 IS NULL)
      `, [orderId, checkerName]);

      res.json({ success: true, message: "ปลดล็อคสำเร็จ" });
    } catch (err) {
      console.error("Error unlocking order:", err);
      res.status(500).json({ error: "ไม่สามารถปลดล็อคได้: " + err.message });
    }
  });

  return router;
};