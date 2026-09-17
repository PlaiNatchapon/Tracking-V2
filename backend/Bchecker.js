const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// กำหนด path โฟลเดอร์สำหรับเก็บไฟล์อัปโหลด
const uploadDir = path.join(__dirname, "public", "uploads");

// ตรวจสอบและสร้างโฟลเดอร์อัตโนมัติทันทีถ้ายังไม่มีอยู่
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("✅ สร้างโฟลเดอร์อัปโหลดอัตโนมัติสำเร็จ:", uploadDir);
}

// ตั้งค่าที่เก็บไฟล์อัปโหลดรูปภาพ
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

module.exports = function (pool, io) {
  // รับ io เข้ามาเผื่อใช้ยิง Socket Realtime ด้วย
  const router = express.Router();

  // 1. ดึงรายการออเดอร์ (กรองเฉพาะที่ยังไม่ถูกตรวจสอบ และตัดออเดอร์ที่มี payment_slip ออกเพราะมีคนรับไปแล้ว)
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
        LEFT JOIN public.order_checks oc ON o.id = oc.order_id
        WHERE oc.order_id IS NULL
          AND (o.payment_slip IS NULL OR o.payment_slip = '')
        ORDER BY o.id DESC
      `;
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching checker orders:", err);
      res
        .status(500)
        .json({ error: "ไม่สามารถดึงข้อมูลออเดอร์ได้: " + err.message });
    }
  });

  // 2. API สำหรับล็อคออเดอร์เมื่อกดเข้ามาตรวจสอบ
  router.post("/orders/:id/lock", async (req, res) => {
    const orderId = req.params.id;
    const { checkerName } = req.body;

    try {
      const checkQuery = `SELECT locked_by, locked_at FROM public.orders WHERE id = $1`;
      const checkResult = await pool.query(checkQuery, [orderId]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: "ไม่พบออเดอร์นี้ในระบบ" });
      }

      const order = checkResult.rows[0];
      const now = new Date();

      if (
        order.locked_by &&
        order.locked_by !== checkerName &&
        order.locked_at
      ) {
        const lockTime = new Date(order.locked_at);
        const diffMinutes = (now - lockTime) / 1000 / 60;

        if (diffMinutes < 2) {
          return res
            .status(400)
            .json({
              error: `ออเดอร์นี้กำลังถูกตรวจสอบโดย ${order.locked_by} อยู่ในขณะนี้`,
            });
        }
      }

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
      res
        .status(500)
        .json({ error: "ไม่สามารถล็อคออเดอร์ได้: " + err.message });
    }
  });

  // 3. API สำหรับรับสัญญาณ Heartbeat
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
        return res
          .status(400)
          .json({ error: "หลุดจากการล็อคหรือสิทธิ์หมดอายุแล้ว" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error heartbeat:", err);
      res.status(500).json({ error: "เกิดข้อผิดพลาดในการต่ออายุล็อค" });
    }
  });

  // 4. API สำหรับปลดล็อค
  router.post("/orders/:id/unlock", async (req, res) => {
    const orderId = req.params.id;
    const { checkerName } = req.body;

    try {
      await pool.query(
        `
        UPDATE public.orders 
        SET locked_by = NULL, locked_at = NULL 
        WHERE id = $1 AND (locked_by = $2 OR $2 IS NULL)
      `,
        [orderId, checkerName],
      );

      res.json({ success: true, message: "ปลดล็อคสำเร็จ" });
    } catch (err) {
      console.error("Error unlocking order:", err);
      res.status(500).json({ error: "ไม่สามารถปลดล็อคได้: " + err.message });
    }
  });

  // 5. API สำหรับบันทึกการตรวจสอบและปล่อยรถ
  router.post(
    "/dispatch",
    upload.fields([
      { name: "goods_photos", maxCount: 10 },
      { name: "dispatch_bill", maxCount: 1 },
    ]),
    async (req, res) => {
      const {
        order_id,
        checker_name,
        department,
        departure_time,
        vehicle_selection,
        work_comment,
      } = req.body;

      try {
        let goodsPhotoPaths = [];
        if (req.files && req.files["goods_photos"]) {
          goodsPhotoPaths = req.files["goods_photos"].map(
            (file) => `/uploads/${file.filename}`,
          );
        }

        let billPhotoPath = null;
        if (req.files && req.files["dispatch_bill"]) {
          billPhotoPath = `/uploads/${req.files["dispatch_bill"][0].filename}`;
        }

        const query = `
        INSERT INTO public.order_checks 
        (order_id, checker_name, department, departure_time, packing_photos, payment_slip, vehicle_selection, work_comment)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (order_id) 
        DO UPDATE SET 
          checker_name = EXCLUDED.checker_name,
          department = EXCLUDED.department,
          departure_time = EXCLUDED.departure_time,
          packing_photos = EXCLUDED.packing_photos,
          payment_slip = EXCLUDED.payment_slip,
          vehicle_selection = EXCLUDED.vehicle_selection,
          work_comment = EXCLUDED.work_comment
      `;

        const departureTimestamp = departure_time
          ? `${new Date().toISOString().split("T")[0]} ${departure_time}:00`
          : new Date();

        await pool.query(query, [
          order_id,
          checker_name || "ไม่ระบุชื่อ",
          department || "Checker",
          departureTimestamp,
          goodsPhotoPaths,
          billPhotoPath,
          vehicle_selection || null,
          work_comment || null,
        ]);

        // เคลียร์สถานะการล็อค
        await pool.query(
          `
        UPDATE public.orders 
        SET locked_by = NULL, locked_at = NULL 
        WHERE id = $1
      `,
          [order_id],
        );

        // ยิงสัญญาณ Socket.io ไปบอกทุกหน้าจอให้รีโหลดข้อมูลอัตโนมัติทันที
        if (io) {
          io.emit("orderUpdated");
        }

        res.json({
          success: true,
          message: "บันทึกข้อมูลการตรวจสอบและปล่อยรถสำเร็จ",
        });
      } catch (err) {
        console.error("Error submitting dispatch:", err);
        res
          .status(500)
          .json({
            success: false,
            error: "ไม่สามารถบันทึกข้อมูลได้: " + err.message,
          });
      }
    },
  );

  return router;
};
