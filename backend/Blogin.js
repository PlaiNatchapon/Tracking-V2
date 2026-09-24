const express = require("express");
const router = express.Router();
// ❌ ไม่จำเป็นต้องใช้ bcrypt แล้ว (จะลบออกหรือเก็บไว้ก็ได้)
const crypto = require("crypto");

module.exports = function (pool) {
  router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
      const userQuery = await pool.query(
        "SELECT * FROM users WHERE username = $1",
        [username],
      );
      if (userQuery.rows.length === 0) {
        return res
          .status(401)
          .json({ message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
      }

      const user = userQuery.rows[0];

      // 🟢 แก้ไขตรงนี้: เปลี่ยนมาเทียบรหัสผ่านแบบ Plain Text (ข้อความธรรมดา) โดยตรง
      const isValidPassword = password === user.password;

      if (!isValidPassword) {
        return res
          .status(401)
          .json({ message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
      }

      const newToken = crypto.randomBytes(32).toString("hex");

      await pool.query(
        `
          INSERT INTO user_sessions (user_id, token, updated_at) 
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT (user_id) 
          DO UPDATE SET token = EXCLUDED.token, updated_at = CURRENT_TIMESTAMP;
      `,
        [user.id, newToken],
      );

      // ส่งสัญญาณ Socket ไปดีดเครื่องเก่าออกทันที
      const io = req.app.get("io");
      const userSockets = req.app.get("userSockets");
      const oldSocketId = userSockets.get(user.id);

      if (oldSocketId) {
        io.to(oldSocketId).emit("force_logout", {
          message: "บัญชีนี้ถูกเข้าสู่ระบบจากอุปกรณ์หรือเบราว์เซอร์อื่น",
        });
      }

      res.json({
        message: "เข้าสู่ระบบสำเร็จ",
        token: newToken,
        department: user.department,
        userId: user.id,
        fullname: user.fullname,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
  });

  // API สำหรับตรวจสอบสถานะ Token
  router.post("/verify-token", async (req, res) => {
    const { token, username } = req.body;

    if (!token || !username) {
      return res
        .status(401)
        .json({ valid: false, message: "ไม่มีข้อมูลการเข้าสู่ระบบ" });
    }

    try {
      const result = await pool.query(
        `
            SELECT u.username FROM users u
            JOIN user_sessions us ON u.id = us.user_id
            WHERE u.username = $1 AND us.token = $2
        `,
        [username, token],
      );

      if (result.rows.length === 0) {
        return res.json({
          valid: false,
          message: "บัญชีนี้ถูกเข้าสู่ระบบจากที่อื่น",
        });
      }

      res.json({ valid: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ valid: false });
    }
  });

  // API สำหรับดึงข้อมูลชื่อ-นามสกุล และแผนก จาก user_id
  router.get("/user-profile/:id", async (req, res) => {
    try {
      const userId = req.params.id;

      const query = `
            SELECT fullname, department 
            FROM users 
            WHERE id = $1;
        `;

      const result = await pool.query(query, [userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "ไม่พบข้อมูลผู้ใช้งาน" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error fetching user profile:", err.message);
      res.status(500).send("Server Error");
    }
  });

  return router;
};
