const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "..", "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

module.exports = function (pool, io) {
  const router = express.Router();

  // 1. ดึงรายการออเดอร์จากตาราง order_checks (แบบดั้งเดิม + พ่วงสถานะล็อค)
  router.get("/orders", async (req, res) => {
    try {
      const query = `
        SELECT o.*, oc.checker_name, oc.department as checker_dept, 
               oc.departure_time, oc.work_comment, oc.packing_photos,
               oc.logistic_status, oc.locked_by
        FROM public.order_checks oc
        JOIN public.orders o ON oc.order_id = o.id
        ORDER BY o.id DESC
      `;
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching logistic orders:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 1.1 API สำหรับกดรับงาน (ล็อคออเดอร์กันคนกดซ้ำ)
  router.post("/lock/:orderId", async (req, res) => {
    const { orderId } = req.params;
    const { username } = req.body;
    try {
      const query = `
        UPDATE public.order_checks 
        SET logistic_status = 'processing', locked_by = $1
        WHERE order_id = $2 AND (logistic_status IS NULL OR logistic_status = 'pending' OR locked_by = $1)
      `;
      await pool.query(query, [username || "ไม่ระบุชื่อ", orderId]);
      if (io) io.emit("orderUpdated");
      res.json({ success: true });
    } catch (err) {
      console.error("Error locking order:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 1.2 API สำหรับปลดล็อคออเดอร์ (เมื่อกดยกเลิก)
  router.post("/unlock/:orderId", async (req, res) => {
    const { orderId } = req.params;
    try {
      const query = `
        UPDATE public.order_checks 
        SET logistic_status = 'pending', locked_by = NULL
        WHERE order_id = $1
      `;
      await pool.query(query, [orderId]);
      if (io) io.emit("orderUpdated");
      res.json({ success: true });
    } catch (err) {
      console.error("Error unlocking order:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. บันทึกผลการจัดส่งหน้างาน (แบบดั้งเดิม + รองรับ payment_slip และเปลี่ยนสถานะเป็น completed)
  router.post(
    "/submit",
    upload.fields([
      { name: "goods_photos", maxCount: 10 },
      { name: "payment_slip", maxCount: 1 }
    ]),
    async (req, res) => {
      const {
        order_id,
        checker_name,
        department,
        arrival_time,
        departure_time,
        work_comment,
      } = req.body;

      try {
        let photoPaths = [];
        if (req.files && req.files["goods_photos"]) {
          photoPaths = req.files["goods_photos"].map(
            (file) => `/uploads/${file.filename}`,
          );
        }

        let slipPath = null;
        if (req.files && req.files["payment_slip"]) {
          slipPath = `/uploads/${req.files["payment_slip"][0].filename}`;
        }

        const query = `
          UPDATE public.order_checks 
          SET checker_name = $1,
              department = $2,
              departure_time = $3,
              packing_photos = $4,
              work_comment = $5,
              logistic_status = 'completed',
              payment_slip = COALESCE($6, payment_slip)
          WHERE order_id = $7
        `;

        const departureTimestamp = departure_time
          ? `${new Date().toISOString().split("T")[0]} ${departure_time}:00`
          : new Date();

        await pool.query(query, [
          checker_name || "ไม่ระบุชื่อ",
          department || "Logistic",
          departureTimestamp,
          photoPaths,
          work_comment || null,
          slipPath,
          order_id,
        ]);

        if (io) io.emit("orderUpdated");

        res.json({ success: true, message: "บันทึกสำเร็จ" });
      } catch (err) {
        console.error("Error saving logistic submission:", err);
        res.status(500).json({ success: false, error: err.message });
      }
    },
  );


  // API สำหรับรับข้อมูล Auto-save แบบเงียบๆ
router.post("/autosave", async (req, res) => {
  const { order_id, arrival_time, departure_time, work_comment } = req.body;
  try {
    const query = `
      UPDATE public.order_checks 
      SET arrival_time = COALESCE($1, arrival_time),
          departure_time = COALESCE($2, departure_time),
          work_comment = COALESCE($3, work_comment)
      WHERE order_id = $4
    `;
    
    // แปลงเวลาออกให้เป็น Timestamp ถ้ามีค่าส่งมา
    const departureTimestamp = departure_time
      ? `${new Date().toISOString().split("T")[0]} ${departure_time}:00`
      : null;

    await pool.query(query, [arrival_time, departureTimestamp, work_comment, order_id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error autosaving draft:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

  return router;
};