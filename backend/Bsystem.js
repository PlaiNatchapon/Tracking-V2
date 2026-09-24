const express = require('express');

module.exports = function(pool, io) {
    const router = express.Router();

    console.log("🔥 โหลด Bsystem (Admin Routes) สำเร็จ!");

  // 1. ดึงรายการออเดอร์ทั้งหมดพร้อมเช็คสถานะผ่านทุกแผนก (Warehouse -> Checker -> Logistic -> Accounting)
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
                    -- 📌 ปรับเงื่อนไขสถานะให้ตรงกับ Business Logic ใหม่
                    CASE 
                        -- กรณีบัญชียืนยันการชำระเงินแล้ว (หรือสถานะเสร็จสิ้น)
                        WHEN o.status = 'accounting_verified' OR o.status = 'completed' THEN 'งานเสร็จสิ้น'
                        
                        -- กรณีมารับเองที่ร้าน (pickup-self) หรือ Logistic จัดส่งสำเร็จแล้ว -> ต้องรอฝ่ายบัญชีตรวจสอบ
                        WHEN oc.vehicle_selection = 'pickup-self' OR o.vehicle_selection = 'pickup-self' THEN 'รอฝ่ายบัญชีตรวจสอบครับ'
                        WHEN dc.id IS NOT NULL THEN 'รอฝ่ายบัญชีตรวจสอบครับ'
                        
                        -- สถานะขั้นตอนก่อนหน้า
                        WHEN oc.id IS NOT NULL THEN 'ตรวจสอบ/ปล่อยรถแล้ว'
                        WHEN of_fill.id IS NOT NULL THEN 'กำลังแพ็คสินค้า'
                        ELSE 'รอดำเนินการ'
                    END AS "statusText",
                    CASE 
                        WHEN o.status = 'accounting_verified' OR o.status = 'completed' THEN 'badge-success'
                        WHEN oc.vehicle_selection = 'pickup-self' OR o.vehicle_selection = 'pickup-self' THEN 'badge-warning'
                        WHEN dc.id IS NOT NULL THEN 'badge-warning'
                        WHEN oc.id IS NOT NULL THEN 'badge-info'
                        WHEN of_fill.id IS NOT NULL THEN 'badge-warning'
                        ELSE 'badge-secondary'
                    END AS "badgeClass",
                    CASE 
                        WHEN o.status = 'accounting_verified' OR o.status = 'completed' THEN 'check-circle-2'
                        WHEN oc.vehicle_selection = 'pickup-self' OR o.vehicle_selection = 'pickup-self' THEN 'clock'
                        WHEN dc.id IS NOT NULL THEN 'clock'
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
        const { operator, department, vehicle } = req.body;
        try {
            const query = `
                INSERT INTO orders (employee_name, department, vehicle_selection)
                VALUES ($1, $2, $3)
                RETURNING *;
            `;
            const values = [operator || 'ไม่ระบุ', department || 'Warehouse', vehicle || 'ไม่ระบุ'];
            const result = await pool.query(query, values);
            const newOrder = result.rows[0];

            // ส่งสัญญาณแจ้งเตือนไปยังหน้าบ้านทุกเครื่องทันทีแบบ Real-time
            if (io) {
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