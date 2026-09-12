const express = require("express");

module.exports = function (pool) {
  const router = express.Router();

  // API สำหรับรับคำสั่งยกเลิกงานและคืนสถานะออเดอร์
  router.post("/cancel-fulfillment", async (req, res) => {
    try {
      const { order_id } = req.body;

      if (!order_id) {
        return res.status(400).json({ success: false, error: "ไม่พบรหัสออเดอร์ที่ต้องการยกเลิก" });
      }

      // 1. อัปเดตฐานข้อมูล PostgreSQL เพื่อปลดล็อกสถานะออเดอร์
      // (ปรับเปลี่ยนชื่อ Column ตามโครงสร้างจริงใน Database ของคุณ เช่น status หรือ employee_id)
      const query = `
        UPDATE orders 
        SET status = 'pending', employee_id = NULL 
        WHERE id = $1
      `;
      await pool.query(query, [order_id]);

      // 2. ดึงค่า io และ userSockets ผ่าน app เพื่อส่ง Real-time Notification (ถ้าต้องการ)
      const io = req.app.get("io");
      const userSockets = req.app.get("userSockets");
      
      if (io && userSockets) {
        // ตัวอย่างการส่ง socket broadcast หรือแจ้งเตือนไปหาผู้เกี่ยวข้อง
        io.emit("order_cancelled", { order_id });
      }

      console.log(`[Backend] ออเดอร์ #${order_id} ถูกยกเลิกและคืนสถานะกลับสู่ระบบแล้ว`);
      res.json({ success: true, message: "คืนงานกลับสู่ระบบเรียบร้อยแล้ว" });
    } catch (err) {
      console.error("[Backend Error - Bfulfill]:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};