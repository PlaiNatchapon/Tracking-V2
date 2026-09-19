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

  // 1. ดึงรายการออเดอร์จากตาราง order_checks ที่ผ่านการตรวจเช็คแล้ว เพื่อรอให้ฝ่ายจัดส่ง (Logistic) กดรับงาน
  router.get("/orders", async (req, res) => {
    try {
      const query = `
        SELECT o.*, oc.checker_name, oc.department as checker_dept, oc.departure_time, oc.work_comment, oc.packing_photos
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

  // 2. บันทึกผลการจัดส่งหน้างานลงตาราง order_checks เพิ่มเติม
  router.post(
    "/submit",
    upload.fields([{ name: "goods_photos", maxCount: 10 }]),
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

        const query = `
          INSERT INTO public.order_checks 
          (order_id, checker_name, department, departure_time, packing_photos, work_comment)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (order_id) 
          DO UPDATE SET 
            checker_name = EXCLUDED.checker_name,
            department = EXCLUDED.department,
            departure_time = EXCLUDED.departure_time,
            packing_photos = EXCLUDED.packing_photos,
            work_comment = EXCLUDED.work_comment
        `;

        const departureTimestamp = departure_time
          ? `${new Date().toISOString().split("T")[0]} ${departure_time}:00`
          : new Date();

        await pool.query(query, [
          order_id,
          checker_name || "ไม่ระบุชื่อ",
          department || "Logistic",
          departureTimestamp,
          photoPaths,
          work_comment || null,
        ]);

        if (io) io.emit("orderUpdated");

        res.json({ success: true, message: "บันทึกสำเร็จ" });
      } catch (err) {
        console.error("Error saving logistic submission:", err);
        res.status(500).json({ success: false, error: err.message });
      }
    },
  );

  return router;
};