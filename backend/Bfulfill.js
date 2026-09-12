const express = require("express");

module.exports = function (pool) {
  const router = express.Router();

  // API สำหรับรับคำสั่งยกเลิกงานและคืนสถานะออเดอร์ (เมื่อกดปุ่มยกเลิกงาน)
  router.post("/cancel-fulfillment", async (req, res) => {
    try {
      const { order_id } = req.body;

      if (!order_id) {
        return res.status(400).json({ success: false, error: "ไม่พบรหัสออเดอร์ที่ต้องการยกเลิก" });
      }

      // อัปเดตฐานข้อมูล PostgreSQL เพื่อปลดล็อกสถานะออเดอร์ และเคลียร์ locked_at เป็น NULL
      const query = `
        UPDATE orders 
        SET status = 'pending', employee_id = NULL, locked_at = NULL 
        WHERE id = $1
      `;
      await pool.query(query, [order_id]);

      // ส่ง Socket แจ้งเตือน Real-time
      const io = req.app.get("io");
      const userSockets = req.app.get("userSockets");
      
      if (io && userSockets) {
        io.emit("order_cancelled", { order_id });
      }

      console.log(`[Backend] ออเดอร์ #${order_id} ถูกยกเลิกและคืนสถานะกลับสู่ระบบแล้ว`);
      res.json({ success: true, message: "คืนงานกลับสู่ระบบเรียบร้อยแล้ว" });
    } catch (err) {
      console.error("[Backend Error - cancel-fulfillment]:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 1. รับสัญญาณ Heartbeat จากหน้าเว็บเพื่อต่ออายุการล็อกออเดอร์ (ห่อด้วย try-catch ป้องกัน Error 500)
  router.post("/heartbeat", async (req, res) => {
    try {
      const { order_id } = req.body;
      if (order_id) {
        await pool.query(
          "UPDATE orders SET locked_at = NOW() WHERE id = $1 AND status = 'processing'", 
          [order_id]
        );
      }
      res.json({ success: true });
    } catch (err) {
      console.error("[Backend Error - heartbeat]:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

 // 2. ฟังก์ชันตรวจสอบอัตโนมัติ (รันทุกๆ 30 วินาที)
  setInterval(async () => {
    console.log("[Heartbeat Check] กำลังตรวจสอบออเดอร์ค้างในระบบ...");
    try {
      const query = `
        UPDATE orders 
        SET status = 'pending', employee_id = NULL, locked_at = NULL 
        WHERE status = 'accepted' 
        AND locked_at < NOW() - INTERVAL '45 seconds'
        RETURNING id;
      `;
      const result = await pool.query(query);
      
      if (result.rowCount > 0) {
        result.rows.forEach(row => {
          console.log(`[Heartbeat Auto-Release] ออเดอร์ #${row.id} ถูกคืนกลับระบบเพราะผู้ใช้ปิดหน้าเว็บหนี`);
          const io = req.app.get("io");
          if (io) io.emit("order_released", { order_id: row.id });
        });
      } else {
        console.log("[Heartbeat Check] ไม่พบออเดอร์ที่หมดเวลาล็อก");
      }
    } catch (err) {
      console.error("Heartbeat interval check error:", err);
    }
  }, 30000);
  return router;
};