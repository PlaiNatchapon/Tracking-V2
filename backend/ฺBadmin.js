const express = require('express');

module.exports = function(pool, io) {
    const router = express.Router();

    // 1. ดึงข้อมูลออเดอร์ทั้งหมด
    router.get('/', async (req, res) => {
        try {
            const query = `
                SELECT 
                    id AS "id",
                    operator_name AS "operator",
                    department AS "department",
                    vehicle_code AS "vehicle",
                    status AS "status",
                    status_text AS "statusText",
                    badge_class AS "badgeClass",
                    icon AS "icon"
                FROM orders
                ORDER BY id DESC;
            `;
            
            const result = await pool.query(query);
            
            res.json({
                success: true,
                data: result.rows
            });

        } catch (err) {
            console.error("Error fetching orders from Badmin.js:", err.message);
            res.status(500).json({ 
                success: false, 
                error: "เกิดข้อผิดพลาดในการดึงข้อมูลออเดอร์" 
            });
        }
    });

    // 2. ดึงข้อมูล Timeline ของออเดอร์เฉพาะเจาะจง
    router.get('/:id/timeline', async (req, res) => {
        const { id } = req.params;
        try {
            const query = `
                SELECT step_title, step_desc, step_time, status_type
                FROM order_timelines
                WHERE order_id = $1
                ORDER BY id ASC;
            `;
            const result = await pool.query(query, [id]);
            
            res.json({
                success: true,
                data: result.rows
            });
        } catch (err) {
            console.error("Error fetching timeline:", err.message);
            res.status(500).json({ 
                success: false, 
                error: "เกิดข้อผิดพลาดในการดึงข้อมูล Timeline" 
            });
        }
    });

    // 3. เพิ่มออเดอร์ใหม่ พร้อมส่ง Socket.io แจ้งเตือน (Real-time)
    router.post('/', async (req, res) => {
        const { operator, department, vehicle, status, statusText, badgeClass, icon } = req.body;
        try {
            const query = `
                INSERT INTO orders (operator_name, department, vehicle_code, status, status_text, badge_class, icon)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *;
            `;
            const values = [operator, department, vehicle, status, statusText, badgeClass, icon];
            const result = await pool.query(query, values);
            const newOrder = result.rows[0];

            // ถ้าระบบมีการตั้งค่า io ไว้ สามารถ broadcast แจ้งเตือนหน้าจออื่นได้ทันที
            if (io) {
                io.emit("newOrderAdmin", newOrder);
            }

            res.status(201).json({
                success: true,
                message: "บันทึกออเดอร์สำเร็จ",
                data: newOrder
            });
        } catch (err) {
            console.error("Error inserting order:", err.message);
            res.status(500).json({ 
                success: false, 
                error: "เกิดข้อผิดพลาดในการบันทึกออเดอร์" 
            });
        }
    });

    return router;
};