const express = require('express');

module.exports = function(pool) {
    const router = express.Router();

    // 1. ดึงรายชื่อผู้ใช้งานทั้งหมด
    router.get('/', async (req, res) => {
        try {
            const query = `
                SELECT id, fullname, username, password, department 
                FROM users 
                ORDER BY id ASC;
            `;
            const result = await pool.query(query);
            res.json({ success: true, data: result.rows });
        } catch (err) {
            console.error("Error fetching users:", err.message);
            res.status(500).json({ success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้งาน" });
        }
    });

    // 2. เพิ่มผู้ใช้งานใหม่
    router.post('/', async (req, res) => {
        const { fullname, username, password, department } = req.body;
        try {
            const query = `
                INSERT INTO users (fullname, username, password, department)
                VALUES ($1, $2, $3, $4)
                RETURNING *;
            `;
            const values = [fullname, username, password, department];
            const result = await pool.query(query, values);
            
            res.status(201).json({
                success: true,
                message: "เพิ่มผู้ใช้งานสำเร็จ",
                data: result.rows[0]
            });
        } catch (err) {
            console.error("Error inserting user:", err.message);
            if (err.code === '23505') {
                return res.status(400).json({ success: false, error: "ชื่อผู้ใช้งาน (Username) นี้ถูกใช้งานไปแล้ว" });
            }
            res.status(500).json({ success: false, error: "เกิดข้อผิดพลาดในการบันทึกผู้ใช้งาน" });
        }
    });

    // 3. แก้ไขข้อมูลผู้ใช้งานตาม ID
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { fullname, username, password, department } = req.body;
        try {
            const query = `
                UPDATE users 
                SET fullname = $1, username = $2, password = $3, department = $4
                WHERE id = $5
                RETURNING *;
            `;
            const values = [fullname, username, password, department, id];
            const result = await pool.query(query, values);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, error: "ไม่พบผู้ใช้งานที่ต้องการแก้ไข" });
            }

            res.json({
                success: true,
                message: "อัปเดตข้อมูลผู้ใช้งานสำเร็จ",
                data: result.rows[0]
            });
        } catch (err) {
            console.error("Error updating user:", err.message);
            res.status(500).json({ success: false, error: "เกิดข้อผิดพลาดในการอัปเดตข้อมูลผู้ใช้งาน" });
        }
    });

    // 4. ลบผู้ใช้งานตาม ID
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const query = `DELETE FROM users WHERE id = $1 RETURNING id;`;
            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, error: "ไม่พบผู้ใช้งานที่ต้องการลบ" });
            }

            res.json({
                success: true,
                message: "ลบผู้ใช้งานสำเร็จ",
                deletedId: id
            });
        } catch (err) {
            console.error("Error deleting user:", err.message);
            res.status(500).json({ success: false, error: "เกิดข้อผิดพลาดในการลบผู้ใช้งาน" });
        }
    });

    return router;
};