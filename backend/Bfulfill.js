const express = require("express");
const multer = require("multer");
const path = require("path");

// ตั้งค่าที่เก็บไฟล์รูปภาพอัปโหลดชั่วคราวหรือถาวร (เก็บไว้ที่โฟลเดอร์ uploads/)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // ตรวจสอบว่ามีโฟลเดอร์ uploads อยู่ในโปรเจกต์แล้ว หรือให้สร้างไว้
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

module.exports = function (pool) {
  const router = express.Router();

  // API สำหรับรับคำสั่งยกเลิกงานและคืนสถานะออเดอร์ (เมื่อกดปุ่มยกเลิกงาน)
  router.post("/cancel-fulfillment", async (req, res) => {
    try {
      const { order_id } = req.body;

      if (!order_id) {
        return res
          .status(400)
          .json({ success: false, error: "ไม่พบรหัสออเดอร์ที่ต้องการยกเลิก" });
      }

      const query = `
        UPDATE orders 
        SET status = 'pending', employee_id = NULL, locked_at = NULL 
        WHERE id = $1
      `;
      await pool.query(query, [order_id]);

      const io = req.app.get("io");
      const userSockets = req.app.get("userSockets");

      if (io && userSockets) {
        io.emit("order_cancelled", { order_id });
      }

      console.log(
        `[Backend] ออเดอร์ #${order_id} ถูกยกเลิกและคืนสถานะกลับสู่ระบบแล้ว`,
      );
      res.json({ success: true, message: "คืนงานกลับสู่ระบบเรียบร้อยแล้ว" });
    } catch (err) {
      console.error("[Backend Error - cancel-fulfillment]:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 1. รับสัญญาณ Heartbeat จากหน้าเว็บเพื่อต่ออายุการล็อกออเดอร์
  router.post("/heartbeat", async (req, res) => {
    try {
      const { order_id } = req.body;
      if (order_id) {
        await pool.query(
          "UPDATE orders SET locked_at = NOW() WHERE id = $1 AND status = 'processing'",
          [order_id],
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
        result.rows.forEach((row) => {
          console.log(
            `[Heartbeat Auto-Release] ออเดอร์ #${row.id} ถูกคืนกลับระบบเพราะผู้ใช้ปิดหน้าเว็บหนี`,
          );
          const io = req.app.get("io");
          if (io) io.emit("order_released", { order_id: row.id });
        });
      }
    } catch (err) {
      console.error("Heartbeat interval check error:", err);
    }
  }, 30000);

  // API สำหรับบันทึกข้อมูล Fulfillment (รองรับ packing_photos แบบ text[])
 // API สำหรับบันทึกข้อมูล Fulfillment (ปรับปรุงให้บันทึกตาราง order_fulfillments ด้วย)
router.put(
  "/fulfillment/:id",
  upload.fields([
    { name: "packing_photos", maxCount: 10 },
    { name: "payment_slip", maxCount: 1 },
  ]),
  async (req, res) => {
    const orderId = req.params.id;
    const { vehicle_selection, work_comment, status, fullname, department } = req.body;

    // 1. ดึงไฟล์ที่อัปโหลด
    const packingPhotosFiles =
      req.files && req.files["packing_photos"]
        ? req.files["packing_photos"]
        : [];
    const paymentSlipFile =
      req.files && req.files["payment_slip"]
        ? req.files["payment_slip"][0]
        : null;

    // 2. แปลง Path ของไฟล์
    const paymentSlipPath = paymentSlipFile
      ? `/uploads/${paymentSlipFile.filename}`
      : null;

    const packingPhotosPaths =
      packingPhotosFiles.length > 0
        ? packingPhotosFiles.map((file) => `/uploads/${file.filename}`)
        : null;

    // เริ่ม Transaction เพื่อความปลอดภัยของข้อมูลทั้งสองตาราง
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 3. อัปเดตข้อมูลลงตาราง orders เหมือนเดิม
      const updateOrderQuery = `
        UPDATE orders 
        SET 
          vehicle_selection = COALESCE($1, vehicle_selection),
          work_comment = COALESCE($2, work_comment),
          status = COALESCE($3, status),
          payment_slip = COALESCE($4, payment_slip),
          packing_photos = COALESCE($5, packing_photos)
        WHERE id = $6
      `;

      await client.query(updateOrderQuery, [
        vehicle_selection || null,
        work_comment || null,
        status || "completed",
        paymentSlipPath,
        packingPhotosPaths,
        orderId,
      ]);

      // 4. [เพิ่มใหม่] บันทึกหรืออัปเดตชื่อและแผนกลงในตาราง order_fulfillments
      const fulfillmentQuery = `
        INSERT INTO order_fulfillments (order_id, fullname, department, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (order_id) 
        DO UPDATE SET 
          fullname = EXCLUDED.fullname,
          department = EXCLUDED.department,
          created_at = NOW();
      `;

      await client.query(fulfillmentQuery, [
        orderId,
        fullname || null,
        department || null,
      ]);

      await client.query("COMMIT");

      console.log(`[Backend] บันทึกข้อมูลออเดอร์ #${orderId} และตาราง fulfillment สำเร็จ`);
      res.json({ message: "บันทึกข้อมูลการจัดสินค้าสำเร็จ" });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error updating fulfillment & fulfillments table:", err);
      res.status(500).json({
        error: "ไม่สามารถบันทึกข้อมูลการจัดสินค้าได้: " + err.message,
      });
    } finally {
      client.release();
    }
  },
);

  return router;
};
