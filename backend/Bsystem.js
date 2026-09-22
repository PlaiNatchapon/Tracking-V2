const express = require('express');

module.exports = function(pool, io) {
    const router = express.Router();

router.get('/orders', async (req, res) => {
    try {
        const query = `
            SELECT 
                o.id AS "id",
                COALESCE(
                    dc.delivery_person_name, 
                    oc.checker_name, 
                    of_fill.fullname, 
                    o.employee_name, 
                    'ไม่ระบุ'
                ) AS "operator",
                COALESCE(
                    dc.delivery_department, 
                    oc.department, 
                    of_fill.department, 
                    o.department, 
                    'Warehouse'
                ) AS "department",
                COALESCE(
                    oc.vehicle_selection, 
                    o.vehicle_selection, 
                    'ไม่ระบุ'
                ) AS "vehicle",
                CASE 
                    WHEN dc.id IS NOT NULL THEN 'จัดส่งสำเร็จ'
                    WHEN oc.id IS NOT NULL THEN 'ตรวจสอบ/ปล่อยรถแล้ว'
                    WHEN of_fill.id IS NOT NULL THEN 'กำลังแพ็คสินค้า'
                    ELSE 'รอดำเนินการ'
                END AS "statusText",
                CASE 
                    WHEN dc.id IS NOT NULL THEN 'badge-success'
                    WHEN oc.id IS NOT NULL THEN 'badge-info'
                    WHEN of_fill.id IS NOT NULL THEN 'badge-warning'
                    ELSE 'badge-secondary'
                END AS "badgeClass",
                CASE 
                    WHEN dc.id IS NOT NULL THEN 'check-circle-2'
                    WHEN oc.id IS NOT NULL THEN 'truck'
                    WHEN of_fill.id IS NOT NULL THEN 'package'
                    ELSE 'clock'
                END AS "icon"
            FROM orders o
            LEFT JOIN order_fulfillments of_fill ON o.id = of_fill.order_id
            LEFT JOIN order_checks oc ON o.id = oc.order_id
            LEFT JOIN delivery_results dc ON o.id = dc.order_id
            ORDER BY o.id DESC;
        `;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error("Error fetching detailed orders:", err.message);
        res.status(500).json({ success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลสถานะออเดอร์แบบละเอียด" });
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

            // ส่งสัญญาณแจ้งเตือนไปยังหน้าบ้านทุกเครื่องทันทีแบบ Real-time
            if (io) {
                io.emit("newOrderAdmin", newOrder);
                io.emit("orderUpdated", { type: 'INSERT', data: newOrder });
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