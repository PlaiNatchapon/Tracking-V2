const express = require("express");

module.exports = function (pool) {
  const router = express.Router();

  // ดึงรายการออเดอร์ทั้งหมดสำหรับ Checker (ดึงจากตาราง orders ตรงๆ ได้เลย)
  router.get("/orders", async (req, res) => {
    try {
      const query = `
        SELECT * 
        FROM public.orders 
        ORDER BY id DESC
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

  return router;
};
